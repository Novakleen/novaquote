import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate polygon area using Shoelace formula with spherical projection
 * @param {Array} geometry - Array of coordinate objects with lat/lon properties
 * @returns {number} Area in square meters
 */
export function calculatePolygonArea(geometry) {
  // Input validation
  if (!geometry || !Array.isArray(geometry)) {
    console.error('calculatePolygonArea: Invalid geometry input - not an array', geometry);
    return 0;
  }

  if (geometry.length < 3) {
    console.warn('calculatePolygonArea: Polygon must have at least 3 points, received:', geometry.length);
    return 0;
  }

  // Validate that all points have required lat/lon properties
  const isValidGeometry = geometry.every(point => 
    point && 
    typeof point.lat === 'number' && 
    typeof point.lon === 'number' &&
    !isNaN(point.lat) && 
    !isNaN(point.lon)
  );

  if (!isValidGeometry) {
    console.error('calculatePolygonArea: Invalid coordinate data in geometry', geometry);
    return 0;
  }

  // Earth radius in meters
  const R = 6378137;

  try {
    let area = 0;
    
    // Convert lat/lng to radians for spherical calculation
    const coords = geometry.map(p => ({
      lat: p.lat * Math.PI / 180,
      lon: p.lon * Math.PI / 180
    }));

    // Apply Shoelace formula with spherical projection
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];
      
      area += (p2.lon - p1.lon) * (2 + Math.sin(p1.lat) + Math.sin(p2.lat));
    }
    
    area = Math.abs(area * R * R / 2);

    console.log(`calculatePolygonArea: Calculated area = ${area.toFixed(2)}m² from ${geometry.length} points`);

    // Sanity check: reasonable building sizes (10m² to 100,000m²)
    if (area < 10 || area > 100000) {
      console.warn(`calculatePolygonArea: Calculated area (${area.toFixed(2)}m²) seems unusual`);
    }

    return area;

  } catch (error) {
    console.error('calculatePolygonArea: Error during calculation', error);
    return 0;
  }
}