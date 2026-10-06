import { useState } from 'react';

export const useGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const geocodeAddress = async (addressString) => {
    setIsLoading(true);
    setError(null);
    
    // Check for Google API Key
    const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.REACT_APP_GOOGLE_API_KEY;

    try {
      if (googleApiKey) {
        // Use Google Geocoding API
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${googleApiKey}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setIsLoading(false);
          return { lat, lng, formattedAddress: data.results[0].formatted_address };
        } else if (data.status === 'ZERO_RESULTS') {
          throw new Error('NOT_FOUND');
        } else {
          throw new Error(data.error_message || 'GOOGLE_API_ERROR');
        }
      } else {
        // Fallback to Nominatim (OpenStreetMap)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`,
          {
             headers: {
                 'User-Agent': 'NovaQuote/1.0'
             }
          }
        );
        
        if (!response.ok) throw new Error('NETWORK_ERROR');
        
        const data = await response.json();

        if (data && data.length > 0) {
          setIsLoading(false);
          return { 
            lat: parseFloat(data[0].lat), 
            lng: parseFloat(data[0].lon),
            formattedAddress: data[0].display_name
          };
        } else {
          throw new Error('NOT_FOUND');
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message);
      console.error("Geocoding error:", err);
      return null;
    }
  };

  return { geocodeAddress, isLoading, error };
};