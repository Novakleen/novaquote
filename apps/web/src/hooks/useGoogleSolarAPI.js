import { useState } from 'react';

/**
 * Hook to interact with Google Solar API
 * Requires VITE_GOOGLE_API_KEY in .env file
 */
export const useGoogleSolarAPI = () => {
  const [isSolarLoading, setIsSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState(null);

  const calculateRealSurface = (projectedArea, pitchDegrees) => {
    // Avoid division by zero for 90 degree walls (unlikely for roof segments but good to be safe)
    if (pitchDegrees >= 89) return projectedArea;
    // Formula: surface_réelle = surface_projetée / cos(pitchDegrees * π / 180)
    const radians = (pitchDegrees * Math.PI) / 180;
    return projectedArea / Math.cos(radians);
  };

  const getApiKey = () => {
    // Vite uses import.meta.env for environment variables
    // They must start with VITE_ to be exposed to the client
    const viteKey = import.meta.env.VITE_GOOGLE_API_KEY;
    
    // Debugging (Masked)
    if (viteKey) {
      console.log('Google Solar API Key Status: Present', `(Starts with: ${viteKey.substring(0, 4)}...)`);
    } else {
      console.error('Google Solar API Key Status: MISSING');
      console.log('Checked: import.meta.env.VITE_GOOGLE_API_KEY value:', viteKey);
    }

    return viteKey;
  };

  const fetchSolarData = async (lat, lng) => {
    setIsSolarLoading(true);
    setSolarError(null);

    const googleApiKey = getApiKey();

    // Strict validation for API key
    if (!googleApiKey || googleApiKey === 'undefined' || googleApiKey.trim() === '') {
      console.error('Google Solar API Error: Valid API Key not found in environment variables. Make sure VITE_GOOGLE_API_KEY is set in .env.');
      setIsSolarLoading(false);
      setSolarError('API_KEY_MISSING');
      return null;
    }

    try {
      console.log(`Fetching Solar Data for: ${lat}, ${lng}`);
      
      // Endpoint: buildingInsights:findClosest
      const response = await fetch(
        `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${googleApiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Solar API Error Response:', response.status, errorText);

        if (response.status === 404) throw new Error('NOT_COVERED');
        if (response.status === 403) throw new Error('API_KEY_INVALID'); // Quota or Permission issue
        throw new Error('API_ERROR');
      }

      const data = await response.json();

      if (!data.solarPotential) {
        throw new Error('NO_SOLAR_DATA');
      }

      const segments = data.solarPotential.roofSegmentStats || [];
      const wholeRoofStats = data.solarPotential.wholeRoofStats;
      let totalArea = 0;
      let detailedSegments = [];

      if (segments.length > 0) {
        // Calculate based on segments
        detailedSegments = segments.map((segment, index) => {
          const pitch = segment.pitchDegrees || 0;
          const azimuth = segment.azimuthDegrees || 0;
          const projectedArea = segment.stats?.areaMeters2 || 0;
          const boundingBox = segment.boundingBox; // { sw: {lat, lng}, ne: {lat, lng} }
          const center = segment.center; // { latitude, longitude }
          
          const realArea = calculateRealSurface(projectedArea, pitch);
          
          return {
            id: index + 1,
            pitch,
            azimuth,
            projectedArea,
            realArea,
            boundingBox,
            center
          };
        });

        totalArea = detailedSegments.reduce((sum, seg) => sum + seg.realArea, 0);
      } else {
        // Fallback to whole roof stats if segments are missing
        if (wholeRoofStats && wholeRoofStats.areaMeters2) {
           totalArea = wholeRoofStats.areaMeters2;
        }
      }
      
      setIsSolarLoading(false);
      return {
        totalArea,
        segments: detailedSegments,
        boundingBox: wholeRoofStats?.boundingBox, // Overall bounding box
        center: data.center, // Overall center
        quality: data.quality || 'UNKNOWN' // HIGH, MEDIUM, LOW
      };

    } catch (err) {
      console.error("Google Solar API Exception:", err);
      setIsSolarLoading(false);
      setSolarError(err.message);
      return null;
    }
  };

  return { fetchSolarData, isSolarLoading, solarError };
};