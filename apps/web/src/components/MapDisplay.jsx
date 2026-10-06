import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from '@/hooks/useTranslation';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapDisplay = ({ coordinates, buildings = [], selectedBuildingId, onBuildingSelect }) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const buildingsLayerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const defaultCoords = [50.8503, 4.3517]; // Brussels default
      
      mapInstanceRef.current = L.map(mapContainerRef.current).setView(defaultCoords, 8);
      
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      buildingsLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
        buildingsLayerRef.current = null;
      }
    };
  }, []);

  // Update Center & Marker
  useEffect(() => {
    if (coordinates && mapInstanceRef.current && layerGroupRef.current) {
      const { lat, lng } = coordinates;
      
      layerGroupRef.current.clearLayers();
      
      mapInstanceRef.current.setView([lat, lng], 19);
      
      L.marker([lat, lng]).addTo(layerGroupRef.current);
      
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [coordinates]);

  // Update Buildings Polygons
  useEffect(() => {
    if (mapInstanceRef.current && buildingsLayerRef.current) {
      buildingsLayerRef.current.clearLayers();

      if (buildings && buildings.length > 0) {
        buildings.forEach(building => {
          const isSelected = selectedBuildingId === building.id;
          
          // Styles
          const selectedStyle = {
            color: '#22c55e', // Green-500
            weight: 3,
            fillColor: '#4ade80', // Green-400
            fillOpacity: 0.6,
            dashArray: null
          };
          
          const defaultStyle = {
            color: '#60a5fa', // Blue-400
            weight: 2,
            fillColor: '#93c5fd', // Blue-300
            fillOpacity: 0.3,
            dashArray: '5, 5'
          };

          const hoverStyle = {
            color: '#3b82f6', // Blue-500
            weight: 3,
            fillColor: '#60a5fa', // Blue-400
            fillOpacity: 0.5,
            dashArray: null
          };

          try {
            // Leaflet polygon expects [lat, lng]
            const latLngs = building.geometry.map(point => [point.lat, point.lon || point.lng]);
            
            const polygon = L.polygon(latLngs, isSelected ? selectedStyle : defaultStyle);
            
            // Add interactivity
            polygon.on('click', (e) => {
              L.DomEvent.stopPropagation(e); // Prevent map click
              if (onBuildingSelect) {
                onBuildingSelect(building.id);
              }
            });

            // Hover effects
            polygon.on('mouseover', function (e) {
              if (selectedBuildingId !== building.id) {
                this.setStyle(hoverStyle);
                // Change cursor to pointer
                if(mapInstanceRef.current) {
                   mapInstanceRef.current.getContainer().style.cursor = 'pointer';
                }
              }
            });

            polygon.on('mouseout', function (e) {
              if (selectedBuildingId !== building.id) {
                this.setStyle(defaultStyle);
                if(mapInstanceRef.current) {
                   mapInstanceRef.current.getContainer().style.cursor = '';
                }
              }
            });

            polygon.addTo(buildingsLayerRef.current);
            
            if (isSelected) {
               polygon.bringToFront();
            }

          } catch (error) {
            console.error('Error drawing building polygon:', error);
          }
        });
      }
    }
  }, [buildings, selectedBuildingId, onBuildingSelect]);

  return (
    <div className='relative group'>
      <div 
        ref={mapContainerRef} 
        className='w-full h-[500px] rounded-lg border-2 border-gray-300 overflow-hidden shadow-md z-0'
      />
      {!coordinates && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 rounded-lg z-10 pointer-events-none'>
          <div className='text-center'>
            <MapPin className='w-12 h-12 text-gray-400 mx-auto mb-2' />
            <p className='text-gray-600 font-medium'>{t('map.placeholder_desc')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;