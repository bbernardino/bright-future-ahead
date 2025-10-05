import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapPicker({ position, setPosition, defaultPosition = { lat: 43.55, lon: -80.25 } }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const map = L.map(el).setView([defaultPosition.lat, defaultPosition.lon], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    if (position) {
      marker = L.marker([position.lat, position.lon]).addTo(map);
      map.setView([position.lat, position.lon], 8);
    }

    function onClick(e) {
      if (marker) map.removeLayer(marker);
      marker = L.marker(e.latlng).addTo(map);
      setPosition({ lat: e.latlng.lat, lon: e.latlng.lng });
    }
    map.on('click', onClick);

    return () => { map.off('click', onClick); map.remove(); };
  }, [ref]);

  return (
    <div ref={ref} style={{ height: 320, width: '100%', maxWidth: 720 }} />
  );
}
