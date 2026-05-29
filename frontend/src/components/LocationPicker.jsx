import { useState, useRef, useEffect } from 'react';
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

const LocationPicker = ({ onLocationSelect, initialLocation = '', disabled = false }) => {
  const [inputValue, setInputValue] = useState(initialLocation);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    setInputValue(initialLocation);
  }, [initialLocation]);

  const handleMapClick = () => {
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      // Open in Google Maps
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Free geocoding using Nominatim (OpenStreetMap)
  const searchLocations = async (query) => {
    if (query.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Using Nominatim API (free OpenStreetMap geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Nexus Event Management System' // Required by Nominatim
          }
        }
      );
      
      const data = await response.json();
      
      const formattedPredictions = data.map(item => ({
        place_id: item.place_id,
        display_name: item.display_name,
        name: item.name || item.display_name.split(',')[0],
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        importance: item.importance
      }));

      setPredictions(formattedPredictions);
      setShowPredictions(formattedPredictions.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search to avoid too many API calls
    searchTimeout.current = setTimeout(() => {
      if (value.trim()) {
        searchLocations(value);
      } else {
        setPredictions([]);
        setShowPredictions(false);
        // For manual input, create a simple location object
        const manualLocation = {
          name: '',
          address: value,
          lat: null,
          lng: null,
          place_id: null,
          formatted_address: value
        };
        onLocationSelect(value ? manualLocation : null);
      }
    }, 500); // Wait 500ms after user stops typing
  };

  const handlePredictionClick = (prediction) => {
    setInputValue(prediction.display_name);
    setShowPredictions(false);

    const locationData = {
      name: prediction.name,
      address: prediction.display_name,
      lat: prediction.lat,
      lng: prediction.lng,
      place_id: prediction.place_id.toString(),
      formatted_address: prediction.display_name
    };
    
    setSelectedLocation(locationData);
    onLocationSelect(locationData);
  };

  const handleInputBlur = () => {
    // Delay hiding predictions to allow click events
    setTimeout(() => {
      setShowPredictions(false);
    }, 200);
  };

  const clearLocation = () => {
    setInputValue('');
    setSelectedLocation(null);
    setPredictions([]);
    setShowPredictions(false);
    onLocationSelect(null);
  };

  return (
    <div className="location-picker">
      <div className="location-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length > 2 && setShowPredictions(predictions.length > 0)}
          onBlur={handleInputBlur}
          placeholder="Search for a location"
          disabled={disabled}
          className="location-input"
        />
        
        {isLoading && (
          <div className="loading-indicator">
            🔍
          </div>
        )}
        
        {inputValue && !isLoading && (
          <button
            type="button"
            onClick={clearLocation}
            className="clear-location-btn"
            disabled={disabled}
          >
            ✕
          </button>
        )}
      </div>

      {showPredictions && predictions.length > 0 && (
        <div className="predictions-dropdown">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="prediction-item"
              onClick={() => handlePredictionClick(prediction)}
            >
              <div className="prediction-main">
                {prediction.name}
              </div>
              <div className="prediction-secondary">
                {prediction.address}
              </div>
              <div className="prediction-type">
                📍 {prediction.type}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
        <div className="map-preview-container">
          <div className="map-preview" onClick={handleMapClick} style={{ cursor: 'pointer' }}>
            <MapContainer
              center={[selectedLocation.lat, selectedLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                <Popup>
                  <div>
                    <strong>{selectedLocation.name || 'Selected Location'}</strong><br />
                    {selectedLocation.formatted_address}<br />
                    <small>Click map to open in Google Maps</small>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      {selectedLocation && (
        <div className="selected-location-info">
          <div className="location-icon">📍</div>
          <div className="location-details">
            <div className="location-name">{selectedLocation.name}</div>
            <div className="location-address">{selectedLocation.formatted_address}</div>
            {selectedLocation.lat && selectedLocation.lng && (
              <div className="location-coords">
                📍 {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .location-picker {
          position: relative;
          width: 100%;
        }

        .location-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .location-input {
          width: 100%;
          padding: 0.75rem;
          padding-right: 2.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .location-input:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
        }

        .location-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .loading-indicator {
          position: absolute;
          right: 0.5rem;
          font-size: 1rem;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .clear-location-btn {
          position: absolute;
          right: 0.5rem;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }

        .clear-location-btn:hover {
          background-color: #f0f0f0;
          color: #333;
        }

        .location-info {
          margin-top: 0.5rem;
        }

        .predictions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 250px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .prediction-item {
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        }

        .prediction-item:hover {
          background-color: #f8f9fa;
        }

        .prediction-item:last-child {
          border-bottom: none;
        }

        .prediction-main {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .prediction-secondary {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 0.25rem;
          line-height: 1.3;
        }

        .prediction-type {
          font-size: 0.75rem;
          color: #888;
          font-style: italic;
        }

        .selected-location-info {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.75rem;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
        }

        .location-icon {
          font-size: 1.2rem;
          margin-top: 0.1rem;
        }

        .location-details {
          flex: 1;
        }

        .location-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .location-address {
          font-size: 0.85rem;
          color: #666;
          line-height: 1.3;
          margin-bottom: 0.25rem;
        }

        .location-coords {
          font-size: 0.75rem;
          color: #888;
          font-family: monospace;
        }

        .map-preview-container {
          margin-top: 1rem;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #dee2e6;
          position: relative;
        }

        .map-preview {
          position: relative;
          width: 100%;
          height: 250px;
          background: #f8f9fa;
        }

        .map-preview .leaflet-container {
          border-radius: 8px;
        }

        .map-preview:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: box-shadow 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default LocationPicker;