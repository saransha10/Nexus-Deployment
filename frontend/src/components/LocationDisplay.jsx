import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationDisplay = ({ 
  locationName, 
  locationAddress, 
  lat, 
  lng, 
  showMap = true, 
  height = '250px' 
}) => {
  const handleMapClick = () => {
    if (lat && lng) {
      // Open in Google Maps
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
    } else if (locationAddress) {
      // Fallback to address search
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const openDirections = () => {
    if (lat && lng) {
      // Open Google Maps directions
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(directionsUrl, '_blank');
    } else if (locationAddress) {
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationAddress)}`;
      window.open(directionsUrl, '_blank');
    }
  };

  if (!locationName && !locationAddress) {
    return null;
  }

  return (
    <div className="location-display">
      {/* Interactive Map Section */}
      {showMap && lat && lng && (
        <div className="map-section" style={{ height }}>
          <div className="map-overlay">
            <div className="live-view-badge">
              <span className="live-indicator">●</span>
              LIVE VIEW
            </div>
          </div>
          <div className="interactive-map" onClick={handleMapClick} style={{ cursor: 'pointer' }}>
            <MapContainer
              center={[parseFloat(lat), parseFloat(lng)]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[parseFloat(lat), parseFloat(lng)]}>
                <Popup>
                  <div>
                    <strong>{locationName || 'Event Location'}</strong><br />
                    {locationAddress}<br />
                    <small>Click map to open in Google Maps</small>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      {/* Location Info Section */}
      <div className="location-info-section">
        <div className="location-main-info">
          <div className="location-icon-container">
            <div className="location-pin">📍</div>
          </div>
          <div className="location-details">
            <h3 className="location-title">{locationName || 'Event Location'}</h3>
            <p className="location-subtitle">{locationAddress?.split(',').slice(0, 2).join(', ')}</p>
            
            <div className="location-meta">
              <div className="address-full">
                <span className="meta-icon">🏢</span>
                <span>{locationAddress}</span>
              </div>
              {lat && lng && (
                <div className="coordinates">
                  <span className="coord-lat">{parseFloat(lat).toFixed(4)}° N</span>
                  <span className="coord-separator">, </span>
                  <span className="coord-lng">{parseFloat(lng).toFixed(4)}° E</span>
                </div>
              )}
              <div className="arrival-suggestion">
                <span className="meta-icon">⏰</span>
                <span>Arrival suggested 15 mins early</span>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button className="directions-btn" onClick={openDirections}>
            <span className="btn-icon">🧭</span>
            Directions
          </button>
          <button className="view-map-btn" onClick={handleMapClick}>
            <span className="btn-icon">🗺️</span>
            View Map
          </button>
        </div>
      </div>

      <style>{`
        .location-display {
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }

        .map-section {
          position: relative;
          background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%);
        }

        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          pointer-events: none;
        }

        .live-view-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(8px);
        }

        .live-indicator {
          color: #10b981;
          font-size: 0.6rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .interactive-map {
          width: 100%;
          height: 100%;
          cursor: pointer;
          position: relative;
        }

        .interactive-map .leaflet-container {
          border-radius: 0;
          background: #0f766e !important;
        }

        .interactive-map .leaflet-tile-pane {
          filter: hue-rotate(180deg) saturate(0.8) brightness(0.9);
        }

        .interactive-map:hover {
          transform: scale(1.02);
          transition: transform 0.3s ease;
        }

        .location-info-section {
          padding: 24px;
          background: white;
        }

        .location-main-info {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .location-icon-container {
          flex-shrink: 0;
        }

        .location-pin {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: white;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
        }

        .location-details {
          flex: 1;
        }

        .location-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .location-subtitle {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 16px 0;
          font-weight: 500;
        }

        .location-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .address-full {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .meta-icon {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .coordinates {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 0.8rem;
          color: #0f766e;
          font-weight: 600;
          background: #f0fdfa;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
        }

        .coord-lat, .coord-lng {
          color: #0f766e;
        }

        .coord-separator {
          color: #6b7280;
        }

        .arrival-suggestion {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #f59e0b;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .directions-btn, .view-map-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
        }

        .directions-btn {
          background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3);
        }

        .directions-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(15, 118, 110, 0.4);
        }

        .view-map-btn {
          background: white;
          color: #0f766e;
          border: 2px solid #0f766e;
        }

        .view-map-btn:hover {
          background: #f0fdfa;
          transform: translateY(-2px);
        }

        .btn-icon {
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .location-info-section {
            padding: 20px;
          }

          .location-main-info {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }

          .location-pin {
            width: 40px;
            height: 40px;
            font-size: 18px;
            align-self: center;
          }

          .action-buttons {
            flex-direction: column;
          }

          .directions-btn, .view-map-btn {
            padding: 14px 16px;
          }

          .location-meta {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default LocationDisplay;