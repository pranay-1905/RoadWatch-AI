import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Play, Pause, MapPin } from 'lucide-react';

const waypoints = [
  { lat: 21.1458, lng: 79.0882, speed: 32 },
  { lat: 21.1445, lng: 79.0860, speed: 35 },
  { lat: 21.1430, lng: 79.0840, speed: 28 },
  { lat: 21.1412, lng: 79.0820, speed: 30 },
  { lat: 21.1440, lng: 79.0850, speed: 34 },
  { lat: 21.1480, lng: 79.0900, speed: 38 },
  { lat: 21.1505, lng: 79.0950, speed: 25 },
  { lat: 21.1560, lng: 79.0810, speed: 36 }
];

export default function LiveMap({ data, onSelectPothole, standalone = false }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

  const [isSimRunning, setIsSimRunning] = useState(false);
  const [_simStep, setSimStep] = useState(0);
  const [simProgress, setSimProgress] = useState(12);
  const [currentSpeed, setCurrentSpeed] = useState(32);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current).setView([21.1458, 79.0882], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const mGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = mGroup;

        // Custom Vehicle Icon
        const vehicleIcon = L.divIcon({
          className: 'custom-vehicle-marker',
          html: `<div style="background:#4f46e5; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(79,70,229,0.7); font-size:18px; border:2px solid white;">🚗</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const vMarker = L.marker([21.1458, 79.0882], { icon: vehicleIcon }).addTo(map);
        vMarker.bindTooltip("Inspection Vehicle #01 (Surveying)", { permanent: false });
        vehicleMarkerRef.current = vMarker;

        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Leaflet map initialization error:', err);
      }
    }

    const timer = setTimeout(() => {
      try {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      } catch (err) {
        console.warn('Leaflet invalidateSize error:', err);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Leaflet cleanup error:', err);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Map Markers
  useEffect(() => {
    const mGroup = markersGroupRef.current;
    if (!mGroup) return;

    try {
      mGroup.clearLayers();

      (data || []).forEach(item => {
        if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
        let pinColor = item.status === 'WORK_DONE' ? '#2563eb' : (item.severity === 'HIGH' ? '#dc2626' : (item.severity === 'MEDIUM' ? '#d97706' : '#059669'));

        const icon = L.divIcon({
          className: 'custom-pothole-pin',
          html: `<div style="background:${pinColor}; color:white; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.25); cursor:pointer;">⚠️</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([item.lat, item.lng], { icon });
        if (onSelectPothole) {
          marker.on('click', () => onSelectPothole(item));
        }
        mGroup.addLayer(marker);
      });
    } catch (err) {
      console.warn('Error updating map markers:', err);
    }
  }, [data, onSelectPothole]);

  // Simulation Loop
  useEffect(() => {
    let interval = null;
    if (isSimRunning) {
      interval = setInterval(() => {
        setSimStep(prevStep => {
          const nextStep = (prevStep + 1) % waypoints.length;
          const wp = waypoints[nextStep];

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.setLatLng([wp.lat, wp.lng]);
          }

          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([wp.lat, wp.lng], { animate: true });
          }

          const progressPercent = Math.round(((nextStep + 1) / waypoints.length) * 100);
          setSimProgress(progressPercent);
          setCurrentSpeed(wp.speed);

          return nextStep;
        });
      }, 1500);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isSimRunning]);

  const toggleSimulation = () => {
    setIsSimRunning(!isSimRunning);
  };

  return (
    <div className="card map-card">
      <div className="card-header">
        <div className="card-title">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <span>{standalone ? 'Full-Screen GPS Route Tracking Map' : 'Live Road Inspection GPS Map'}</span>
        </div>
        {!standalone && (
          <div className="map-controls">
            {/* Simulation Button Only */}
            <button
              className={`btn btn-sm ${isSimRunning ? 'btn-warning' : 'btn-primary'}`}
              onClick={toggleSimulation}
            >
              {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isSimRunning ? 'Pause Simulation' : 'Play Route Simulation'}
            </button>
          </div>
        )}
      </div>

      <div ref={mapContainerRef} className="map-container" style={{ height: standalone ? '580px' : '460px' }}></div>

      {!standalone && (
        <div className="simulation-scrubber">
          <button className="play-btn" onClick={toggleSimulation} title={isSimRunning ? "Pause" : "Play"}>
            {isSimRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="scrubber-track">
            <div className="scrubber-progress" style={{ width: `${simProgress}%`, transition: 'width 0.5s ease' }}></div>
          </div>
          <span className="time-readout">
            {isSimRunning ? `🚗 Vehicle #01 Driving | Speed: ${currentSpeed} km/h` : `Route Distance: 4.8 km | Speed: 32 km/h`}
          </span>
        </div>
      )}
    </div>
  );
}
