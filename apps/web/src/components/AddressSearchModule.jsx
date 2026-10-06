import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import AddressSearch from '@/components/AddressSearch';
import MapDisplay from '@/components/MapDisplay';
import BuildingSelector from '@/components/BuildingSelector';
import RoofAreaCalculator from '@/components/RoofAreaCalculator';
import { calculatePolygonArea } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const AddressSearchModule = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  
  const { toast } = useToast();

  const handleAddressSelect = async (locationData) => {
    setLoading(true);
    setError(null);
    setMapCenter({ lat: locationData.lat, lng: locationData.lng });
    setBuildings([]);
    setSelectedBuildingId(null);

    try {
      // Fetch buildings using Overpass API (mocking the Supabase/PostGIS fetch for this environment)
      const query = `
        [out:json][timeout:25];
        (
          way["building"](around:200,${locationData.lat},${locationData.lng});
          relation["building"](around:200,${locationData.lat},${locationData.lng});
        );
        out geom;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });

      if (!response.ok) throw new Error('Failed to fetch building data');

      const data = await response.json();
      
      const parsedBuildings = data.elements.map((element, index) => {
        let polygon = null;
        let area = 0;

        // Extract geometry
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

        if (polygon && area > 10) {
          return {
            id: element.id || `bldg-${index}`,
            geometry: polygon,
            area: area,
            address: element.tags?.['addr:street'] 
              ? `${element.tags['addr:street']} ${element.tags['addr:housenumber'] || ''}`
              : 'Unknown Address'
          };
        }
        return null;
      }).filter(Boolean).sort((a, b) => b.area - a.area); // Sort largest first

      setBuildings(parsedBuildings);

      if (parsedBuildings.length > 0) {
        setSelectedBuildingId(parsedBuildings[0].id);
        toast({
          title: "Buildings Found",
          description: `Found ${parsedBuildings.length} buildings nearby.`,
        });
      } else {
        toast({
          title: "No Buildings Found",
          description: "Could not identify any building footprints at this location.",
          variant: "destructive"
        });
      }

    } catch (err) {
      console.error(err);
      setError('Failed to load building data. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load building data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuildingSelect = (id) => {
    setSelectedBuildingId(id);
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Roof Estimator</h1>
        <p className="text-gray-600">Search your address to estimate roof surface area automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address Lookup</label>
            <AddressSearch onAddressSelect={handleAddressSelect} onError={setError} />
          </div>

          <RoofAreaCalculator selectedBuilding={selectedBuilding} />

          {/* List of found buildings (simplified view) */}
          {buildings.length > 0 && (
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 max-h-60 overflow-y-auto">
               <h3 className="text-sm font-semibold text-gray-700 mb-3">Nearby Buildings ({buildings.length})</h3>
               <div className="space-y-2">
                 {buildings.slice(0, 5).map(b => (
                   <button
                     key={b.id}
                     onClick={() => handleBuildingSelect(b.id)}
                     className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                       selectedBuildingId === b.id 
                         ? 'bg-blue-100 text-blue-800 font-medium' 
                         : 'hover:bg-gray-100 text-gray-600'
                     }`}
                   >
                     <div className="flex justify-between">
                       <span>{b.address || 'Unnamed Building'}</span>
                       <span>{Math.round(b.area)} m²</span>
                     </div>
                   </button>
                 ))}
                 {buildings.length > 5 && (
                   <p className="text-xs text-center text-gray-400 mt-2">
                     + {buildings.length - 5} more buildings hidden
                   </p>
                 )}
               </div>
             </div>
          )}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-200 h-[600px] relative">
            <MapDisplay 
              coordinates={mapCenter}
              buildings={buildings}
              selectedBuildingId={selectedBuildingId}
              onBuildingSelect={handleBuildingSelect}
            />

            {/* Floating Building Selector Overlay (Reusing existing component) */}
            <BuildingSelector 
              buildings={buildings}
              selectedId={selectedBuildingId}
              onRecalculate={() => mapCenter && handleAddressSelect(mapCenter)}
              isRecalculating={loading}
            />

            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                <p className="text-blue-800 font-medium animate-pulse">Analyzing terrain & buildings...</p>
              </div>
            )}
            
            {error && !loading && (
              <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                <p className="text-red-700 font-medium">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSearchModule;