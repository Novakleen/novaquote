import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, AlertTriangle, ChevronDown, ChevronUp, MapPin, Loader2, Key, CheckCheck, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useGoogleSolarAPI } from '@/hooks/useGoogleSolarAPI';
import AddressInput from '@/components/AddressInput';
import RoofVisualizationMap, { azimuthColor } from '@/components/RoofVisualizationMap';
import { cn } from '@/lib/utils';

const GoogleSolarCalculator = () => {
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [result, setResult] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [solarError, setSolarError] = useState(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState(new Set());
  const [pvPanelCount, setPvPanelCount] = useState(0);

  const { geocodeAddress, isLoading: isGeoLoading, error: geoError } = useGeocoding();
  const { fetchSolarData, isSolarLoading, solarError: apiSolarError } = useGoogleSolarAPI();
  const { toast } = useToast();

  const handleAddressSelect = (selectedAddress, coords) => {
    setAddress(selectedAddress);
    setCoordinates(coords);
    // When selecting a new address, reset the result but NOT the coordinates immediately if we want to show the map at the new location (optional, but better to wait for calculation)
    // However, if we want the map to update immediately to the pin, we can set Result to null but keep coords
    setResult(null); 
    setDetailsOpen(false);
    setSelectedSegmentIds(new Set());
    setPvPanelCount(0);
  };

  const handleInputChange = (value) => {
    setAddress(value);
    // If user changes text manually, invalidate previous coordinates until they select again or we geocode
    setCoordinates(null);
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setResult(null);
    setDetailsOpen(false);
    setSelectedSegmentIds(new Set());
    setPvPanelCount(0);

    if (!address) {
      toast({
        title: "Adresse manquante",
        description: "Veuillez entrer une adresse.",
        variant: "destructive"
      });
      return;
    }

    // Check for API key status before proceeding
    const apiKeyStatus = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKeyStatus || apiKeyStatus.trim() === '' || apiKeyStatus === 'undefined') {
      toast({
        title: "Configuration Requise",
        description: "La clé API Google (VITE_GOOGLE_API_KEY) est manquante ou invalide. Veuillez vérifier votre fichier .env.",
        variant: "destructive"
      });
      setSolarError('API_KEY_MISSING');
      return;
    } else {
      setSolarError(null);
    }

    let targetCoords = coordinates;

    // 1. If we don't have coordinates from a selection (manual typing), try to geocode first
    if (!targetCoords) {
      const location = await geocodeAddress(address);
      
      if (!location) {
        let errorMsg = "Adresse introuvable.";
        if (geoError === 'NETWORK_ERROR') errorMsg = "Erreur de connexion.";
        
        toast({
          title: "Erreur d'adresse",
          description: errorMsg,
          variant: "destructive"
        });
        return;
      }
      targetCoords = { lat: location.lat, lng: location.lng };
      setCoordinates(targetCoords); // Update state for the map
    }

    // 2. Solar API call
    const solarData = await fetchSolarData(targetCoords.lat, targetCoords.lng);

    if (solarData) {
      setResult({
        ...solarData,
        address: address,
        lat: targetCoords.lat,
        lng: targetCoords.lng
      });
      // Tous les segments sont sélectionnés par défaut
      setSelectedSegmentIds(new Set((solarData.segments || []).map((s) => s.id)));
      setDetailsOpen(true);
      toast({
        title: "Calcul réussi !",
        description: "Données Google Solar récupérées avec succès.",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } else {
      let errorMsg = "Erreur technique, veuillez réessayer.";
      let errorTitle = "Erreur Solar API";

      if (apiSolarError === 'API_KEY_MISSING') {
        errorTitle = "Configuration Requise";
        errorMsg = "La clé API Google (VITE_GOOGLE_API_KEY) est manquante ou invalide. Vérifiez votre fichier .env.";
        setSolarError('API_KEY_MISSING');
      }
      else if (apiSolarError === 'API_KEY_INVALID') {
        errorTitle = "Accès Refusé";
        errorMsg = "Clé API invalide ou quota dépassé. Vérifiez la console Google Cloud.";
        setSolarError('API_KEY_INVALID');
      }
      else if (apiSolarError === 'NOT_COVERED') {
         errorTitle = "Non Couvert";
         errorMsg = "Données non disponibles pour cette adresse. Essayez une autre ou revenez au calcul standard.";
         setSolarError('NOT_COVERED');
      }
      else if (apiSolarError === 'NO_SOLAR_DATA') {
         errorTitle = "Données Insuffisantes";
         errorMsg = "Pas de données solaires détectées pour ce bâtiment.";
         setSolarError('NO_SOLAR_DATA');
      }

      toast({
        title: errorTitle,
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  const handleToggleSegment = (segId) => {
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  };

  const handleSelectAllSegments = () => {
    if (!result || !result.segments) return;
    setSelectedSegmentIds(new Set(result.segments.map((s) => s.id)));
  };

  const handleDeselectAllSegments = () => {
    setSelectedSegmentIds(new Set());
  };

  // Surface totale recalculée à partir des segments sélectionnés uniquement
  const selectedTotalArea = result && result.segments
    ? result.segments.reduce((sum, seg) =>
        selectedSegmentIds.has(seg.id) ? sum + (seg.realArea || 0) : sum, 0)
    : 0;
  const pvDeduction = (pvPanelCount || 0) * 1.6;
  const effectiveTotalArea = Math.max(0, selectedTotalArea - pvDeduction);

  const getAzimuthText = (degrees) => {
    if (degrees >= 337.5 || degrees < 22.5) return "Nord";
    if (degrees >= 22.5 && degrees < 67.5) return "Nord-Est";
    if (degrees >= 67.5 && degrees < 112.5) return "Est";
    if (degrees >= 112.5 && degrees < 157.5) return "Sud-Est";
    if (degrees >= 157.5 && degrees < 202.5) return "Sud";
    if (degrees >= 202.5 && degrees < 247.5) return "Sud-Ouest";
    if (degrees >= 247.5 && degrees < 292.5) return "Ouest";
    if (degrees >= 292.5 && degrees < 337.5) return "Nord-Ouest";
    return `${Math.round(degrees)}°`;
  };

  const isLoading = isGeoLoading || isSolarLoading;

  return (
    <section className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-blue-100 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl text-blue-900">
                Calculateur de Surface Précise (Google Solar)
              </CardTitle>
              <CardDescription className="text-blue-600/80">
                Utilisez la puissance de l'IA Google pour mesurer votre toiture
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleCalculate} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Adresse en Wallonie</Label>
              <AddressInput 
                value={address}
                onChange={handleInputChange}
                onSelect={handleAddressSelect}
              />
              <p className="text-xs text-gray-500">
                Entrez votre adresse complète ou des coordonnées (ex. 50.359120, 5.378172) pour obtenir les données précises de toiture.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg transition-all duration-200 shadow-md hover:shadow-lg"
              disabled={isLoading || solarError === 'API_KEY_MISSING'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 mr-2" />
                  Calculer surface précise du toit
                </>
              )}
            </Button>

            {solarError === 'API_KEY_MISSING' && (
               <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
                 <Key className="w-5 h-5 mt-0.5 shrink-0" />
                 <div className="text-sm">
                   <p className="font-semibold">Configuration Manquante</p>
                   <p className="mt-1">
                     La clé API Google n'est pas configurée. Veuillez ajouter <code className="bg-red-100 px-1 py-0.5 rounded text-xs font-mono">VITE_GOOGLE_API_KEY</code> dans votre fichier <code className="bg-red-100 px-1 py-0.5 rounded text-xs font-mono">.env</code>.
                   </p>
                 </div>
               </div>
            )}
          </form>

          {/* Map Visualization Section */}
          <AnimatePresence>
            {result && result.lat && result.lng && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8 mb-6"
              >
                 <RoofVisualizationMap 
                    lat={result.lat}
                    lng={result.lng}
                    address={result.address}
                    roofData={result}
                    selectedSegmentIds={selectedSegmentIds}
                    onToggleSegment={handleToggleSegment}
                 />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Stats Section */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-2 border rounded-xl overflow-hidden bg-white shadow-sm"
              >
                <div className="bg-green-50 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-green-100">
                   <div>
                     <h3 className="text-lg font-medium text-green-900 mb-1">Résultat Google Solar</h3>
                     <p className="text-sm text-green-700/80">{result.address}</p>
                   </div>
                   <div className="text-center md:text-right">
                     <p className="text-sm text-green-700 font-medium uppercase tracking-wide">Surface Totale Précise</p>
                     <p className="text-4xl font-bold text-green-600">
                        {Math.round(pvPanelCount > 0 ? effectiveTotalArea : selectedTotalArea)} <span className="text-2xl">m²</span>
                     </p>
                     {pvPanelCount > 0 && (
                       <p className="text-xs text-green-700/70 mt-1 line-through">
                         {Math.round(selectedTotalArea)} m² avant déduction
                       </p>
                     )}
                     {result.segments && result.segments.length > 0 && (
                       <p className="text-xs text-green-700/70 mt-1">
                         {selectedSegmentIds.size} / {result.segments.length} segment(s) sélectionné(s)
                       </p>
                     )}
                   </div>
                </div>

                <div className="p-4 bg-white border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Label className="text-sm font-semibold text-gray-700">Panneaux photovoltaïques à déduire</Label>
                    <input
                      type="number"
                      min="0"
                      value={pvPanelCount}
                      onChange={(e) => setPvPanelCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:border-green-500"
                    />
                    <span className="text-xs text-gray-500">1,6 m² par panneau déduit de la surface</span>
                  </div>
                  {pvPanelCount > 0 && (
                    <p className="text-sm text-green-700 mt-2">
                      Surface effective après déduction : <strong>{Math.round(effectiveTotalArea)} m²</strong>
                      <span className="text-gray-500 ml-2">({Math.round(selectedTotalArea)} − {Math.round(pvDeduction)} m²)</span>
                    </p>
                  )}
                </div>

                <div className="p-4 bg-gray-50/50">
                  {result.segments && result.segments.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-xs text-gray-500">
                        Cliquez sur un pan dans la liste ou sur la carte pour le sélectionner / désélectionner.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleSelectAllSegments}
                          className="h-8 text-xs"
                        >
                          <CheckCheck className="w-3.5 h-3.5 mr-1" />
                          Tout sélectionner
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={handleDeselectAllSegments}
                          className="h-8 text-xs"
                        >
                          <Square className="w-3.5 h-3.5 mr-1" />
                          Tout désélectionner
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between text-gray-600 hover:text-gray-900 hover:bg-gray-100 group"
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                       {detailsOpen ? "Masquer les détails" : "Voir les détails par segment"}
                       <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                         result.quality === 'HIGH' ? 'bg-green-100 text-green-700 border-green-200' :
                         result.quality === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                         'bg-gray-100 text-gray-700 border-gray-200'
                       }`}>
                         Qualité: {result.quality}
                       </span>
                    </span>
                    {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {detailsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 overflow-hidden"
                    >
                       {result.segments.length > 0 ? (
                         <div className="grid gap-3">
                           {result.segments.map((seg) => {
                             const isSelected = selectedSegmentIds.has(seg.id);
                             const colors = azimuthColor(seg.azimuth ?? 0);
                             const orientLabel = getAzimuthText(seg.azimuth);
                             return (
                             <div key={seg.id} 
                               className={cn(
                                 'bg-white p-4 rounded-lg border-2 shadow-sm transition-all cursor-pointer',
                                 isSelected ? 'opacity-100' : 'border-gray-200 opacity-55'
                               )}
                               style={isSelected ? { borderColor: colors.fill } : undefined}
                               onClick={() => handleToggleSegment(seg.id)}
                             >
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                  <span
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                                    style={{ backgroundColor: isSelected ? colors.fill : '#9ca3af' }}
                                  >
                                    {seg.id}
                                  </span>
                                  <span className="font-semibold text-gray-800">
                                    Pan de toit {seg.id}
                                  </span>
                                  <span
                                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: isSelected ? `${colors.fill}22` : '#f3f4f6',
                                      color: isSelected ? colors.stroke : '#6b7280',
                                    }}
                                  >
                                    {orientLabel} · {Math.round(seg.azimuth)}°
                                  </span>
                                  <span className={cn(
                                    'ml-auto inline-flex items-center justify-center w-5 h-5 rounded border text-[10px]',
                                    isSelected ? 'text-white' : 'bg-white border-gray-300 text-transparent'
                                  )}
                                    style={isSelected ? { backgroundColor: colors.fill, borderColor: colors.fill } : undefined}
                                  >
                                    ✓
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Surface réelle</p>
                                    <p className="text-xl font-bold text-green-700">
                                      {Math.round(seg.realArea)} <span className="text-sm font-semibold">m²</span>
                                    </p>
                                  </div>
                                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Pente</p>
                                    <p className="text-xl font-bold text-blue-700">
                                      {Math.round(seg.pitch)}<span className="text-sm font-semibold">°</span>
                                    </p>
                                  </div>
                                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
                                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Centre GPS</p>
                                    <p className="text-[11px] font-mono font-semibold text-gray-800 leading-tight mt-0.5">
                                      {seg.center?.latitude != null
                                        ? `${Number(seg.center.latitude).toFixed(5)}, ${Number(seg.center.longitude).toFixed(5)}`
                                        : '—'}
                                    </p>
                                  </div>
                                </div>
                             </div>
                             );
                           })}
                         </div>
                       ) : (
                         <p className="text-sm text-gray-500 italic text-center py-2">
                           Détails des segments non disponibles pour ce bâtiment.
                         </p>
                       )}
                       
                       <div className="mt-4 p-3 bg-blue-50/50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>
                            Google Solar fournit le <strong>centre GPS</strong>, l&apos;azimut et la surface de chaque pan — pas le contour exact du pan.
                            La surface réelle = surface projetée / cos(pente). Sur la carte, la pastille n° correspond au même numéro dans cette liste ; la couleur suit l&apos;orientation.
                          </p>
                       </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </section>
  );
};

export default GoogleSolarCalculator;