import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Couleur stable par orientation (azimut) pour relier carte ↔ liste */
export const azimuthColor = (degrees) => {
  const d = ((degrees % 360) + 360) % 360;
  if (d >= 337.5 || d < 22.5) return { fill: '#3b82f6', stroke: '#1e40af', name: 'Nord' }; // blue
  if (d >= 22.5 && d < 67.5) return { fill: '#06b6d4', stroke: '#0e7490', name: 'Nord-Est' }; // cyan
  if (d >= 67.5 && d < 112.5) return { fill: '#eab308', stroke: '#a16207', name: 'Est' }; // yellow
  if (d >= 112.5 && d < 157.5) return { fill: '#f97316', stroke: '#c2410c', name: 'Sud-Est' }; // orange
  if (d >= 157.5 && d < 202.5) return { fill: '#22c55e', stroke: '#15803d', name: 'Sud' }; // green
  if (d >= 202.5 && d < 247.5) return { fill: '#84cc16', stroke: '#4d7c0f', name: 'Sud-Ouest' }; // lime
  if (d >= 247.5 && d < 292.5) return { fill: '#a855f7', stroke: '#6b21a8', name: 'Ouest' }; // purple
  return { fill: '#ec4899', stroke: '#9d174d', name: 'Nord-Ouest' }; // pink
};

/**
 * Pastille HTML centrée sur le pan : n°, surface, pente.
 * Google Solar ne donne pas le polygone exact — seulement centre + azimut + surface.
 */
const createSegmentLabelOverlay = (google) => {
  class SegmentLabelOverlay extends google.maps.OverlayView {
    constructor({ position, segId, area, pitch, azimuth, selected, onToggle }) {
      super();
      this.position = position;
      this.segId = segId;
      this.area = area;
      this.pitch = pitch;
      this.azimuth = azimuth;
      this.selected = selected;
      this.onToggle = onToggle;
      this.div = null;
      this.visible = false;
    }

    setVisible(visible) {
      this.visible = visible;
      if (this.div) {
        this.div.style.visibility = visible ? 'visible' : 'hidden';
      }
    }

    onAdd() {
      const colors = azimuthColor(this.azimuth);
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.transform = 'translate(-50%, -50%)';
      div.style.cursor = 'pointer';
      div.style.zIndex = this.selected ? '30' : '20';
      div.style.pointerEvents = 'none';
      div.style.visibility = this.visible ? 'visible' : 'hidden';
      div.style.userSelect = 'none';
      div.title = `Pan #${this.segId} · ${Math.round(this.area)} m² · pente ${Math.round(this.pitch)}° · ${colors.name}`;

      const opacity = this.selected ? '1' : '0.55';
      const border = this.selected ? colors.stroke : '#6b7280';
      const bg = this.selected ? '#ffffff' : '#f3f4f6';

      div.innerHTML = `
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:1px;
          background:${bg};border:2px solid ${border};border-radius:8px;
          padding:3px 6px;box-shadow:0 2px 8px rgba(0,0,0,0.35);
          opacity:${opacity};min-width:44px;line-height:1.15;
          font-family:Inter,system-ui,sans-serif;
        ">
          <span style="
            display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:18px;border-radius:999px;font-size:10px;font-weight:800;
            color:#fff;background:${this.selected ? colors.fill : '#9ca3af'};
          ">${this.segId}</span>
          <span style="font-size:11px;font-weight:700;color:#111827;">${Math.round(this.area)} m²</span>
          <span style="font-size:9px;font-weight:600;color:#4b5563;">${Math.round(this.pitch)}° · ${colors.name}</span>
        </div>
      `;

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof this.onToggle === 'function') this.onToggle(this.segId);
      });

      this.div = div;
      const panes = this.getPanes();
      if (panes) panes.overlayMouseTarget.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.position.lat, this.position.lng)
      );
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
      }
      this.div = null;
    }
  }

  return SegmentLabelOverlay;
};

const RoofVisualizationMap = ({
  lat,
  lng,
  roofData,
  address,
  selectedSegmentIds,
  onToggleSegment,
  className,
}) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const overlaysRef = useRef([]);
  const labelClassRef = useRef(null);

  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  useEffect(() => {
    if (!API_KEY) {
      setMapError('Clé API manquante');
      setIsLoading(false);
      return;
    }

    const initMap = () => {
      try {
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps API failed to load');
        }

        if (!labelClassRef.current) {
          labelClassRef.current = createSegmentLabelOverlay(window.google);
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 20,
          mapTypeId: 'satellite',
          tilt: 0,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMapInstance(map);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setMapError("Erreur d'initialisation de la carte");
        setIsLoading(false);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const scriptId = 'google-maps-api-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        script.onerror = () => {
          setMapError('Impossible de charger Google Maps');
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(interval);
            initMap();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
          if (!window.google) {
            setMapError("Délai d'attente dépassé pour Google Maps");
            setIsLoading(false);
          }
        }, 10000);
      }
    }
  }, [API_KEY]);

  useEffect(() => {
    if (!mapInstance || !window.google) return;

    const newCenter = { lat, lng };
    mapInstance.panTo(newCenter);

    overlaysRef.current.forEach((overlay) => {
      if (overlay.setMap) overlay.setMap(null);
    });
    overlaysRef.current = [];

    const marker = new window.google.maps.Marker({
      position: newCenter,
      map: mapInstance,
      title: address,
      animation: window.google.maps.Animation.DROP,
    });
    overlaysRef.current.push(marker);

    /**
     * Google Solar fournit pour chaque pan :
     *  - center (lat/lng) — position réelle du centre du pan
     *  - azimuthDegrees — orientation de la pente
     *  - pitchDegrees — inclinaison
     *  - stats.areaMeters2 — surface projetée au sol
     *  - boundingBox axis-aligned (enveloppe lâche, pas le contour exact)
     * Il n'y a PAS de polygone exact. On ancre donc un rectangle sur le centre,
     * orienté selon l'azimut, dimensionné par la surface projetée.
     */
    const buildOrientedPath = (segment) => {
      const sw = segment.boundingBox?.sw;
      const ne = segment.boundingBox?.ne;

      const centerLat =
        segment.center?.latitude ??
        (sw && ne ? (sw.latitude + ne.latitude) / 2 : 0);
      const centerLng =
        segment.center?.longitude ??
        (sw && ne ? (sw.longitude + ne.longitude) / 2 : 0);

      const metersPerDegLat = 111320;
      const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

      const pitchRad = ((segment.pitch ?? 0) * Math.PI) / 180;
      let area =
        segment.projectedArea > 0.5
          ? segment.projectedArea
          : segment.realArea > 0.5
            ? segment.realArea * Math.cos(pitchRad)
            : 4;

      let aspect = 1.6;

      if (sw && ne) {
        const aabbHalfN =
          (Math.abs(ne.latitude - sw.latitude) / 2) * metersPerDegLat;
        const aabbHalfE =
          (Math.abs(ne.longitude - sw.longitude) / 2) * metersPerDegLng;

        const theta0 = ((segment.azimuth ?? 0) * Math.PI) / 180;
        const c = Math.abs(Math.cos(theta0));
        const s = Math.abs(Math.sin(theta0));
        const denom = c * c - s * s;

        let rawX;
        let rawY;
        if (Math.abs(denom) > 0.12) {
          rawX = (aabbHalfE * c - aabbHalfN * s) / denom;
          rawY = (aabbHalfN * c - aabbHalfE * s) / denom;
        } else {
          rawX = 1;
          rawY = 1;
        }

        if (rawX > 0.05 && rawY > 0.05) {
          aspect = rawX / rawY;
        }

        const bboxArea = Math.max(1, 4 * aabbHalfE * aabbHalfN);
        area = Math.min(area, bboxArea * 0.7);
      }

      aspect = Math.max(0.35, Math.min(aspect, 3.2));

      let halfY = Math.sqrt(area / (4 * aspect));
      let halfX = aspect * halfY;

      const gap = 0.88;
      halfX = Math.max(halfX * gap, 0.35);
      halfY = Math.max(halfY * gap, 0.35);

      const theta = ((segment.azimuth ?? 0) * Math.PI) / 180;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const localCorners = [
        { x: -halfX, y: -halfY },
        { x: halfX, y: -halfY },
        { x: halfX, y: halfY },
        { x: -halfX, y: halfY },
      ];

      return {
        path: localCorners.map(({ x, y }) => {
          const eastM = x * cosT + y * sinT;
          const northM = -x * sinT + y * cosT;
          return {
            lat: centerLat + northM / metersPerDegLat,
            lng: centerLng + eastM / metersPerDegLng,
          };
        }),
        center: { lat: centerLat, lng: centerLng },
        halfY,
        metersPerDegLat,
        metersPerDegLng,
        cosT,
        sinT,
      };
    };

    if (roofData) {
      let mapBounds = new window.google.maps.LatLngBounds();
      const LabelOverlay = labelClassRef.current;

      if (roofData.segments && roofData.segments.length > 0) {
        const selectionEnabled = typeof onToggleSegment === 'function';

        roofData.segments.forEach((segment, index) => {
          if (!segment.center && !segment.boundingBox) return;

          const segId = segment.id ?? index + 1;
          const isSelected =
            !selectionEnabled ||
            !selectedSegmentIds ||
            selectedSegmentIds.has(segId);

          const built = buildOrientedPath(segment);
          const { path, center } = built;
          path.forEach((p) => mapBounds.extend(p));

          const colors = azimuthColor(segment.azimuth ?? 0);
          const fillColor = isSelected ? colors.fill : '#9ca3af';
          const strokeColor = isSelected ? colors.stroke : '#6b7280';
          const fillOpacity = isSelected ? 0.42 : 0.14;
          const strokeOpacity = isSelected ? 0.95 : 0.65;
          const strokeWeight = isSelected ? 2 : 1.25;

          let labelOverlay = null;

          const segmentPolygon = new window.google.maps.Polygon({
            paths: path,
            strokeColor,
            strokeOpacity,
            strokeWeight,
            fillColor,
            fillOpacity,
            map: mapInstance,
            clickable: true,
            zIndex: isSelected ? 2 : 1,
          });

          segmentPolygon.addListener('mouseover', () => {
            segmentPolygon.setOptions({
              fillOpacity: isSelected ? 0.65 : 0.3,
              strokeWeight: 2.5,
            });
            if (labelOverlay) labelOverlay.setVisible(true);
          });

          segmentPolygon.addListener('mouseout', () => {
            segmentPolygon.setOptions({
              fillOpacity,
              strokeWeight,
            });
            if (labelOverlay) labelOverlay.setVisible(false);
          });

          segmentPolygon.addListener('click', () => {
            if (selectionEnabled) onToggleSegment(segId);
          });

          overlaysRef.current.push(segmentPolygon);

          // Flèche d'orientation de la pente (direction de l'azimut)
          if (isSelected && built.halfY > 0.5) {
            const arrowLen = Math.max(built.halfY * 0.85, 1.2);
            const tip = {
              lat: center.lat + (arrowLen * built.cosT) / built.metersPerDegLat,
              lng: center.lng + (arrowLen * built.sinT) / built.metersPerDegLng,
            };
            const arrowLine = new window.google.maps.Polyline({
              path: [center, tip],
              geodesic: true,
              strokeColor: colors.stroke,
              strokeOpacity: 0.9,
              strokeWeight: 2,
              map: mapInstance,
              zIndex: 5,
              icons: [
                {
                  icon: {
                    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 2.5,
                    strokeColor: colors.stroke,
                    fillColor: colors.fill,
                    fillOpacity: 1,
                  },
                  offset: '100%',
                },
              ],
            });
            overlaysRef.current.push(arrowLine);
          }

          // Pastille n° + surface + pente au centre exact fourni par Solar
          if (LabelOverlay) {
            labelOverlay = new LabelOverlay({
              position: center,
              segId,
              area: segment.realArea || 0,
              pitch: segment.pitch || 0,
              azimuth: segment.azimuth || 0,
              selected: isSelected,
              onToggle: selectionEnabled ? onToggleSegment : undefined,
            });
            labelOverlay.setMap(mapInstance);
            overlaysRef.current.push(labelOverlay);
          }
        });
      } else if (roofData.boundingBox) {
        const { sw, ne } = roofData.boundingBox;
        const boundsToDraw = {
          north: ne.latitude,
          south: sw.latitude,
          east: ne.longitude,
          west: sw.longitude,
        };

        mapBounds.extend({ lat: sw.latitude, lng: sw.longitude });
        mapBounds.extend({ lat: ne.latitude, lng: ne.longitude });

        const roofPolygon = new window.google.maps.Rectangle({
          strokeColor: '#1f2937',
          strokeOpacity: 1,
          strokeWeight: 1,
          fillColor: '#22c55e',
          fillOpacity: 0.4,
          map: mapInstance,
          bounds: boundsToDraw,
          clickable: false,
          zIndex: 1,
        });

        overlaysRef.current.push(roofPolygon);
      }

      if (!mapBounds.isEmpty()) {
        mapInstance.fitBounds(mapBounds);
        window.google.maps.event.addListenerOnce(mapInstance, 'idle', () => {
          if (mapInstance.getZoom() > 21) mapInstance.setZoom(21);
        });
      }
    }
  }, [mapInstance, lat, lng, roofData, address, selectedSegmentIds, onToggleSegment]);

  if (mapError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-gray-500 p-8',
          className
        )}
        style={{ height: '400px' }}
      >
        <AlertCircle className="w-10 h-10 mb-2 text-red-400" />
        <p className="text-center">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-md">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-sm font-medium text-gray-600">Chargement de la carte...</p>
        </div>
      )}

      <div
        ref={mapRef}
        className={cn('w-full bg-gray-200', className)}
        style={{ height: '520px', minHeight: '420px' }}
      />

      <div className="absolute top-4 left-4 z-[1] bg-white/95 backdrop-blur shadow-lg rounded-lg p-3 border border-gray-100 max-w-[240px] pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-xs text-gray-800 uppercase tracking-wider">
            Visualisation toiture
          </span>
        </div>
        {roofData ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded-sm bg-green-500/50 border border-green-800" />
              <span className="text-gray-600 text-xs">
                {roofData.segments && roofData.segments.length > 0
                  ? `${selectedSegmentIds ? selectedSegmentIds.size : roofData.segments.length} / ${roofData.segments.length} segment(s)`
                  : 'Zone globale'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 rounded-sm bg-gray-400/40 border border-gray-500" />
              <span className="text-gray-600 text-xs">Segment désélectionné</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">Surface sélectionnée</p>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(
                  roofData.segments && selectedSegmentIds
                    ? roofData.segments.reduce(
                        (sum, s) =>
                          selectedSegmentIds.has(s.id) ? sum + (s.realArea || 0) : sum,
                        0
                      )
                    : roofData.totalArea
                )}{' '}
                m²
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex gap-1.5 items-start">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] leading-snug text-gray-500">
                Google Solar donne le <strong>centre</strong>, l&apos;azimut et la surface de
                chaque pan — pas le contour exact. Les rectangles sont une estimation orientée ;
                les pastilles indiquent n°, m² et pente au centre réel.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">En attente de données...</p>
        )}
      </div>
    </div>
  );
};

export default RoofVisualizationMap;
