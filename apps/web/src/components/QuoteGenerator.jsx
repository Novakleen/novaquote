import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Calculator, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import AddressInput from '@/components/AddressInput';
import MapDisplay from '@/components/MapDisplay';
import QuoteResult from '@/components/QuoteResult';
import BuildingSelector from '@/components/BuildingSelector';
import { calculatePolygonArea } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useGoogleSolarAPI } from '@/hooks/useGoogleSolarAPI';

const QuoteGenerator = () => {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  
  // Quote State
  const [surfaceArea, setSurfaceArea] = useState(0);
  const [quote, setQuote] = useState(null);
  
  // Loading States
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFetchingSurface, setIsFetchingSurface] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Buildings State
  const [nearbyBuildings, setNearbyBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  
  const [searchKey, setSearchKey] = useState(0);
  const { toast } = useToast();

  // Google Solar integration — provides real roof pitch per segment
  // so we can apply the correct coefficient (1/cos(pitch)) instead of a fixed 1.25x.
  const { fetchSolarData } = useGoogleSolarAPI();
  const [solarInfo, setSolarInfo] = useState(null); // { avgPitch, coefficient, segments, quality }
  const [isFetchingSolar, setIsFetchingSolar] = useState(false);
  const [pvPanelCount, setPvPanelCount] = useState(0);

  const isMounted = useRef(true);
  const abortControllerRef = useRef(null);
  // Keep latest solar coefficient outside async closures so Overpass completion
  // always applies the real pitch factor when Solar already resolved.
  const solarInfoRef = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Compute an area-weighted average pitch from Google Solar roof segments,
  // then derive the real-surface coefficient = 1 / cos(pitch).
  const computeSolarCoefficient = (segments) => {
    if (!segments || segments.length === 0) return null;
    let totalProjected = 0;
    let weightedPitch = 0;
    segments.forEach((s) => {
      const proj = s.projectedArea || 0;
      const pitch = s.pitch || 0;
      totalProjected += proj;
      weightedPitch += proj * pitch;
    });
    const avgPitch = totalProjected > 0
      ? weightedPitch / totalProjected
      : segments.reduce((sum, s) => sum + (s.pitch || 0), 0) / segments.length;
    const radians = (avgPitch * Math.PI) / 180;
    const coefficient = 1 / Math.cos(radians);
    return { avgPitch, coefficient };
  };

  // Roof area = ground footprint x coefficient.
  // Uses the Solar-derived coefficient when available, otherwise the standard 1.25x fallback.
  // Always read from the ref so async Overpass handlers never apply a stale 1.25x
  // after Solar has already resolved for the same search.
  const getRoofCoefficient = () => {
    const info = solarInfoRef.current;
    return info && info.coefficient ? info.coefficient : 1.25;
  };

  const getRoofArea = (building) => {
    if (!building) return 0;
    return Math.round(building.area * getRoofCoefficient());
  };

  // Fetch Google Solar roof segments for the given coordinates and store the
  // derived average pitch + coefficient. Recomputes the selected building's roof
  // area once the real pitch is known.
  const applySolarInfo = (info) => {
    solarInfoRef.current = info;
    setSolarInfo(info);
  };

  const fetchSolarForCoords = async (lat, lng) => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') {
      applySolarInfo(null);
      return;
    }
    setIsFetchingSolar(true);
    try {
      const solarData = await fetchSolarData(lat, lng);
      if (!isMounted.current) return;
      if (solarData && solarData.segments && solarData.segments.length > 0) {
        const { avgPitch, coefficient } = computeSolarCoefficient(solarData.segments);
        applySolarInfo({
          avgPitch,
          coefficient,
          segments: solarData.segments,
          quality: solarData.quality,
        });
      } else {
        applySolarInfo(null);
      }
    } catch (err) {
      if (isMounted.current) applySolarInfo(null);
    } finally {
      if (isMounted.current) setIsFetchingSolar(false);
    }
  };

  // When Solar data OR the selected building changes, recompute roof area
  // with the latest coefficient (covers both race orders: Solar first or buildings first).
  useEffect(() => {
    solarInfoRef.current = solarInfo;
    if (selectedBuildingId && nearbyBuildings.length > 0) {
      const selected = nearbyBuildings.find((b) => b.id === selectedBuildingId);
      if (selected) {
        setSurfaceArea(getRoofArea(selected));
        setQuote(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solarInfo, selectedBuildingId, nearbyBuildings]);

  const handleNewSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setAddress('');
    setCoordinates(null);
    setSurfaceArea(0);
    setQuote(null);
    setIsCalculating(false);
    setIsFetchingSurface(false);
    setIsFetchingSolar(false);
    setIsLocating(false);
    setProgress(0);
    setRetryAttempt(0);
    setNearbyBuildings([]);
    setSelectedBuildingId(null);
    setPvPanelCount(0);
    applySolarInfo(null);
    setSearchKey(prev => prev + 1);

    toast({
      title: t('quote_generator.new_search'),
      description: t('quote_generator.toast.missing_surface_desc') 
    });
  };

  const fetchNearbyBuildings = async (lat, lng, currentRetry = 0) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (currentRetry === 0) {
      setNearbyBuildings([]);
      setSelectedBuildingId(null);
      setIsFetchingSurface(true);
      setSurfaceArea(0);
      setQuote(null);
      setProgress(0);
    }
    setRetryAttempt(currentRetry);

    const progressInterval = setInterval(() => {
      if (!isMounted.current) return;
      setProgress((prev) => {
        if (prev >= 90) return 90;
        const increment = currentRetry > 0 ? 2 : Math.floor(Math.random() * 10) + 5;
        return prev + increment;
      });
    }, 400);

    // Using Overpass API to fetch buildings
    // This serves as the data source for our "Nearby Buildings" feature
    // In a production environment with a populated DB, this would call the Edge Function
    const query = `
      [out:json][timeout:25];
      (
        way["building"](around:50,${lat},${lng});
        relation["building"](around:50,${lat},${lng});
      );
      out geom;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('Overpass API error');

      const data = await response.json();

      clearInterval(progressInterval);
      
      if (!isMounted.current) return;
      setProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isMounted.current) return;

      if (data.elements && data.elements.length > 0) {
        // Process all elements into building objects
        const buildings = data.elements.map((element, index) => {
          let polygon = null;
          let area = 0;

          if (element.type === 'way' && element.geometry) {
            polygon = element.geometry;
            area = calculatePolygonArea(element.geometry);
          } else if (element.type === 'relation' && element.members) {
            const outer = element.members.find(m => m.role === 'outer');
            if (outer && outer.geometry) {
              polygon = outer.geometry;
              area = calculatePolygonArea(outer.geometry);
            }
          }

          if (polygon && area > 10) { // Filter out tiny sheds
             return {
                id: element.id || `temp-${index}`,
                geometry: polygon,
                area: area,
                address: element.tags?.['addr:street'] ? `${element.tags['addr:street']} ${element.tags['addr:housenumber'] || ''}` : ''
             };
          }
          return null;
        }).filter(Boolean);

        // Sort by area (largest first usually main house)
        buildings.sort((a, b) => b.area - a.area);

        setNearbyBuildings(buildings);

        if (buildings.length > 0) {
          // Auto-select the first (largest/closest) one initially.
          // getRoofArea reads solarInfoRef so if Solar already finished we apply
          // the real coefficient immediately (no stale 1.25x flash).
          handleBuildingSelect(buildings[0].id, buildings);

          const initialRoof = getRoofArea(buildings[0]);
          toast({
            title: t('quote_generator.toast.surface_calculated'),
            description: t('quote_generator.toast.surface_desc', { area: initialRoof, roofArea: initialRoof }),
          });
        } else {
           throw new Error('No valid buildings found');
        }

      } else {
        setNearbyBuildings([]);
        toast({
          title: t('quote_generator.toast.building_not_found'),
          description: t('quote_generator.toast.building_not_found_desc'),
          variant: "destructive"
        });
      }
      
      setIsFetchingSurface(false);
      setRetryAttempt(0);

    } catch (error) {
      clearInterval(progressInterval);
      if (error.name === 'AbortError') return;
      if (!isMounted.current) return;

      console.error(`Surface calculation error (Attempt ${currentRetry + 1}):`, error);
      
      const MAX_RETRIES = 2;
      if (currentRetry < MAX_RETRIES) {
        setTimeout(() => {
          if (isMounted.current) {
            fetchNearbyBuildings(lat, lng, currentRetry + 1);
          }
        }, 2000);
      } else {
        setNearbyBuildings([]);
        setIsFetchingSurface(false);
        setRetryAttempt(0);
         toast({
          title: t('quote_generator.toast.error_calc'),
          description: t('quote_generator.toast.error_calc_desc'),
          variant: "destructive"
        });
      }
    }
  };

  const handleBuildingSelect = (id, buildingsList = nearbyBuildings) => {
    const selected = buildingsList.find(b => b.id === id);
    if (selected) {
       setSelectedBuildingId(id);
       // Roof area = footprint x coefficient (Solar pitch when available, else 1.25x)
       setSurfaceArea(getRoofArea(selected));
       setPvPanelCount(0);
       setQuote(null); // Reset quote when surface changes
    }
  };

  const handleAddressSelect = (selectedAddress, coords) => {
    setSurfaceArea(0);
    setQuote(null);
    setNearbyBuildings([]);
    setPvPanelCount(0);
    applySolarInfo(null);
    setAddress(selectedAddress);
    setCoordinates(coords);
    // Kick off Solar first so it often resolves before Overpass and the first
    // auto-selected surface already uses the pitch coefficient.
    fetchSolarForCoords(coords.lat, coords.lng);
    fetchNearbyBuildings(coords.lat, coords.lng);
  };

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: t('quote_generator.geo_error.title'),
        description: t('quote_generator.geo_error.not_supported'),
        variant: "destructive"
      });
      return;
    }

    setSurfaceArea(0);
    setQuote(null);
    setNearbyBuildings([]);

    setIsLocating(true);
    toast({
      title: t('quote_generator.geo_error.searching'),
      description: t('quote_generator.geo_error.locating_desc')
    });

    const getPosition = (options) => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    try {
      let position;
      try {
        position = await getPosition({ enableHighAccuracy: true, timeout: 5000 });
      } catch (err) {
        position = await getPosition({ enableHighAccuracy: false, timeout: 10000 });
      }

      if (!isMounted.current) return;
        
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setCoordinates(coords);
      applySolarInfo(null);
      setAddress(t('quote_generator.locating'));
      setIsLocating(false);

      fetchSolarForCoords(coords.lat, coords.lng);
      fetchNearbyBuildings(coords.lat, coords.lng);

      toast({
        title: t('quote_generator.geo_error.found'),
        description: t('quote_generator.geo_error.found_desc')
      });

    } catch (error) {
      if (!isMounted.current) return;
      setIsLocating(false);
      toast({
        title: t('quote_generator.geo_error.unavailable'),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calculateQuote = async () => {
    if (surfaceArea <= 0) {
      toast({
        title: t('quote_generator.toast.missing_surface'),
        description: t('quote_generator.toast.missing_surface_desc'),
        variant: "destructive"
      });
      return;
    }

    const pvDeduction = (pvPanelCount || 0) * 1.6;
    const effectiveSurface = Math.max(0, surfaceArea - pvDeduction);

    if (effectiveSurface <= 0) {
      toast({
        title: t('quote_generator.toast.missing_surface'),
        description: t('quote_generator.pv_exceeds'),
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      if (!isMounted.current) return;

      const trancheSize = 20;
      const numTranches = Math.ceil(effectiveSurface / trancheSize);
      
      const pricePerTrancheCleaning = 142.40;
      const pricePerTrancheEnzyme = 37.60;
      
      const pressureWashingPrice = numTranches * pricePerTrancheCleaning;
      const enzymePrice = numTranches * pricePerTrancheEnzyme;
      
      const subTotal = pressureWashingPrice + enzymePrice;
      const discount = 0;
      const discountedTotal = subTotal - discount;
      
      const tvaRate = 0.06;
      const tvaAmount = discountedTotal * tvaRate;
      const finalTotal = discountedTotal + tvaAmount;

      setQuote({
        surfaceArea: effectiveSurface,
        grossSurfaceArea: surfaceArea,
        pvPanelCount: pvPanelCount || 0,
        pvDeduction: pvDeduction,
        numTranches: numTranches,
        pressureWashing: {
          pricePerTranche: pricePerTrancheCleaning,
          total: pressureWashingPrice
        },
        enzyme: {
          pricePerTranche: pricePerTrancheEnzyme,
          total: enzymePrice
        },
        subtotal: subTotal,
        discount: discount,
        tvaAmount: tvaAmount,
        total: finalTotal,
        address: address || 'Adresse non spécifiée',
      });

      setIsCalculating(false);

      toast({
        title: t('quote_generator.toast.quote_generated'),
        description: t('quote_generator.toast.quote_success')
      });
    }, 800);
  };

  return (
    <section className='container mx-auto px-4 py-12'>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className='max-w-5xl mx-auto'
      >
        <div className='bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden'>
          <div className='flex justify-between items-center mb-2'>
            <h2 className='text-3xl font-bold text-gray-800'>
              {t('hero.title')}
            </h2>
            {(address || coordinates || quote) && (
              <Button
                onClick={handleNewSearch}
                variant="outline"
                className='transition-all hover:bg-blue-50 hover:border-blue-400'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                {t('quote_generator.new_search')}
              </Button>
            )}
          </div>
          <p className='text-gray-600 text-center mb-8'>
            {t('hero.subtitle')}
          </p>

          <div className='grid md:grid-cols-2 gap-8 mb-8'>
            <div className='space-y-6'>
              <div>
                <Label className='block text-sm font-semibold text-gray-700 mb-2'>
                  {t('quote_generator.address_label')}
                </Label>
                <AddressInput 
                  key={searchKey}
                  value={address}
                  onChange={setAddress}
                  onSelect={handleAddressSelect}
                />
                <p className='text-xs text-gray-500 mt-1'>
                  {t('quote_generator.coord_hint', 'Astuce : vous pouvez aussi saisir des coordonnées, ex. 50.359120, 5.378172')}
                </p>
                <Button
                  onClick={handleGeolocation}
                  variant="outline"
                  disabled={isLocating}
                  className='w-full mt-3 transition-all hover:bg-blue-50 hover:border-blue-400'
                >
                  {isLocating ? (
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  ) : (
                    <Navigation className='w-4 h-4 mr-2' />
                  )}
                  {isLocating ? t('quote_generator.locating') : t('quote_generator.use_location')}
                </Button>
              </div>

              <div className='bg-blue-50 rounded-lg p-4 border border-blue-100'>
                <Label className='block text-sm font-semibold text-blue-800 mb-2'>
                  {t('quote_generator.surface_label')}
                </Label>
                {isFetchingSurface ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-blue-600 mb-1">
                      <span className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {retryAttempt > 0 
                          ? t('quote_generator.surface_retry', { attempt: retryAttempt })
                          : t('quote_generator.surface_calculating')}
                      </span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-blue-200" />
                  </div>
                ) : surfaceArea > 0 ? (
                  <div>
                    <span className='text-3xl font-bold text-blue-700'>{surfaceArea}</span>
                    <span className='text-xl text-blue-600 ml-1'>m²</span>
                    <p className='text-xs text-blue-500 mt-1'>
                      {solarInfo
                        ? t('quote_generator.surface_solar_desc', {
                            pitch: Math.round(solarInfo.avgPitch),
                            coeff: solarInfo.coefficient.toFixed(2),
                          })
                        : t('quote_generator.surface_auto_desc')}
                    </p>
                    {isFetchingSolar && (
                      <p className='text-xs text-yellow-600 mt-1 flex items-center'>
                        <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                        {t('quote_generator.solar_analyzing')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-blue-400 italic">
                    {t('quote_generator.select_address_prompt')}
                  </p>
                )}
              </div>

              {surfaceArea > 0 && !isFetchingSurface && (
                <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  <Label className='block text-sm font-semibold text-gray-700 mb-2'>
                    {t('quote_generator.pv_label')}
                  </Label>
                  <div className='flex items-center gap-3'>
                    <input
                      type='number'
                      min='0'
                      value={pvPanelCount}
                      onChange={(e) => { setPvPanelCount(Math.max(0, parseInt(e.target.value) || 0)); setQuote(null); }}
                      className='w-24 px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:border-blue-500'
                    />
                    <span className='text-xs text-gray-500'>{t('quote_generator.pv_hint')}</span>
                  </div>
                  {pvPanelCount > 0 && (
                    <p className='text-xs text-gray-600 mt-2'>
                      {t('quote_generator.pv_effective', { surface: Math.max(0, Math.round(surfaceArea - pvPanelCount * 1.6)) })}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={calculateQuote}
                disabled={isCalculating || surfaceArea <= 0 || isFetchingSurface || isLocating}
                className='w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isCalculating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Calculator className='w-5 h-5 mr-2' />
                )}
                {isCalculating ? t('quote_generator.calculating_btn') : t('quote_generator.generate_btn')}
              </Button>
            </div>

            <div className='h-full min-h-[500px] relative rounded-lg overflow-hidden'>
              <Label className='block text-sm font-semibold text-gray-700 mb-2'>
                {t('quote_generator.map_label')}
              </Label>
              <div className="relative h-[500px]">
                <MapDisplay 
                  key={searchKey}
                  coordinates={coordinates}
                  buildings={nearbyBuildings}
                  selectedBuildingId={selectedBuildingId}
                  onBuildingSelect={handleBuildingSelect}
                />
                
                {/* Floating Building Selector Overlay (Simplified) */}
                <BuildingSelector 
                  buildings={nearbyBuildings}
                  selectedId={selectedBuildingId}
                  onRecalculate={() => coordinates && fetchNearbyBuildings(coordinates.lat, coordinates.lng)}
                  isRecalculating={isFetchingSurface}
                />
              </div>
            </div>
          </div>

          {quote && (
            <QuoteResult 
              key={searchKey}
              quote={quote} 
              coordinates={coordinates} 
            />
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default QuoteGenerator;