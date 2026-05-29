import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LocationPicker from '../components/LocationPicker';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'online',
    registration_start_time: '',
    registration_end_time: '',
    start_time: '',
    end_time: '',
    location: '',
    location_name: '',
    location_address: '',
    location_lat: null,
    location_lng: null,
    location_place_id: '',
    location_formatted_address: '',
    streaming_url: '',
    meeting_type: 'jitsi' // NEW: default to Jitsi
  });
  const [ticketTypes, setTicketTypes] = useState([
    { type_name: 'Regular', price: '0', quantity_available: '', description: '' }
  ]);
  const [eventImage, setEventImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast, showError, showSuccess, hideToast } = useToast();

  // Check user role on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'organizer') {
      alert('Access denied. Only organizers can create events.');
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLocationSelect = (locationData) => {
    if (locationData) {
      setFormData({
        ...formData,
        location: locationData.formatted_address,
        location_name: locationData.name,
        location_address: locationData.address,
        location_lat: locationData.lat,
        location_lng: locationData.lng,
        location_place_id: locationData.place_id,
        location_formatted_address: locationData.formatted_address
      });
    } else {
      setFormData({
        ...formData,
        location: '',
        location_name: '',
        location_address: '',
        location_lat: null,
        location_lng: null,
        location_place_id: '',
        location_formatted_address: ''
      });
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('Image size must be less than 10MB');
        return;
      }
      setEventImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Enhanced date validation
      const regStart = new Date(formData.registration_start_time);
      const regEnd = new Date(formData.registration_end_time);
      const eventStart = new Date(formData.start_time);
      const eventEnd = new Date(formData.end_time);
      const now = new Date();

      // Validation checks
      if (regStart >= regEnd) {
        showError('Registration end time must be after registration start time');
        setLoading(false);
        return;
      }

      if (regEnd > eventStart) {
        showError('Registration must close before or when the event starts');
        setLoading(false);
        return;
      }

      if (eventStart >= eventEnd) {
        showError('Event end time must be after event start time');
        setLoading(false);
        return;
      }

      if (regStart < now) {
        showError('Registration start time cannot be in the past');
        setLoading(false);
        return;
      }

      // Create FormData for multipart upload
      const eventFormData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          // For datetime fields, append as-is (local time string) to avoid UTC conversion
          eventFormData.append(key, formData[key]);
        }
      });
      
      if (eventImage) {
        eventFormData.append('event_image', eventImage);
      }

      // Create event first
      const eventResponse = await api.post('/events', eventFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const eventId = eventResponse.data.event.event_id;

      // Then create ticket types
      await api.post(`/ticket-types/event/${eventId}`, { ticketTypes });

      // Show success message with approval notice
      showSuccess('Event created successfully! Your event is pending admin approval.');
      setTimeout(() => navigate('/my-events'), 2000);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { type_name: '', price: '0', quantity_available: '', description: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const handleTicketTypeChange = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  return (
    <div className="create-event-page">
      <div className="page-header">
        <div className="header-nav">
          <button onClick={() => navigate('/events')} className="back-btn">
            ← Back to Events
          </button>
          <span className="page-title">Create Event</span>
        </div>
      </div>

      <div className="main-content">
        <div className="content-header">
          <h1>Host a New Experience</h1>
          <p>Fill in the details below to create your next shared event. Your audience is waiting for something spectacular.</p>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          {/* Image Upload Section */}
          <div className="upload-section">
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Event preview" className="image-preview" />
                <button 
                  type="button" 
                  onClick={() => {
                    setEventImage(null);
                    setImagePreview(null);
                  }}
                  className="change-image-btn"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  id="event-image-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="event-image-upload" className="upload-area">
                  <div className="upload-icon">📷</div>
                  <div className="upload-title">Upload Event Banner</div>
                  <div className="upload-subtitle">Recommended size: 1920x1080px, Max 10MB<br />PNG, JPG, or WebP supported</div>
                </label>
              </div>
            )}
          </div>

          {/* Basic Info Section */}
          <div className="info-section">
            <div className="section-title">
              <h3>Basic Info</h3>
              <p>Identify your event with a clear title and detailed description.</p>
            </div>

            <div className="form-field">
              <label>Event Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g. Midnight Jazz Under the Stars"
              />
            </div>

            <div className="form-field">
              <label>Category</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                <option value="online">Online Event</option>
                <option value="offline">In-Person Event</option>
                <option value="hybrid">Hybrid Event</option>
              </select>
            </div>

            <div className="form-field">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                placeholder="What makes this event unique? Share the detailed journey with your guests."
              />
            </div>
          </div>

          {/* Registration Section */}
          <div className="info-section">
            <div className="section-title">
              <h3>Registration</h3>
              <p>Set the window for when tickets become available to purchase.</p>
            </div>
            
            <div className="date-row">
              <div className="form-field">
                <label>Registration Opens</label>
                <input
                  type="datetime-local"
                  name="registration_start_time"
                  value={formData.registration_start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Registration Closes</label>
                <input
                  type="datetime-local"
                  name="registration_end_time"
                  value={formData.registration_end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="info-section">
            <div className="section-title">
              <h3>Schedule</h3>
              <p>Set the exact start and end times for your event.</p>
            </div>
            
            <div className="date-row">
              <div className="form-field">
                <label>Event Start</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Event End</label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="info-section">
            <div className="section-title">
              <h3>Location</h3>
              <p>Choose between a physical location or digital experience.</p>
            </div>

            <div className="location-tabs">
              <button 
                type="button" 
                className={`tab-btn ${(formData.type === 'offline' || formData.type === 'hybrid') ? 'active' : ''}`}
                onClick={() => setFormData({...formData, type: 'offline'})}
              >
                Physical
              </button>
              <button 
                type="button" 
                className={`tab-btn ${(formData.type === 'online' || formData.type === 'hybrid') ? 'active' : ''}`}
                onClick={() => setFormData({...formData, type: 'online'})}
              >
                Digital
              </button>
            </div>

            {(formData.type === 'offline' || formData.type === 'hybrid') && (
              <div className="location-content">
                <LocationPicker
                  onLocationSelect={handleLocationSelect}
                  initialLocation={formData.location}
                />
              </div>
            )}

            {(formData.type === 'online' || formData.type === 'hybrid') && (
              <div className="meeting-options">
                <div className="form-field">
                  <label>Video Meeting Option</label>
                  <select
                    name="meeting_type"
                    value={formData.meeting_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="jitsi">Jitsi Meet (Integrated Video Conferencing)</option>
                    <option value="external">External Streaming URL</option>
                  </select>
                  <div className="field-hint">
                    {formData.meeting_type === 'jitsi' && (
                      <span>✨ Recommended: Built-in video conferencing with automatic moderator privileges</span>
                    )}
                    {formData.meeting_type === 'external' && (
                      <span>🔗 Use your own Zoom, Google Meet, or other streaming platform</span>
                    )}
                  </div>
                </div>

                {formData.meeting_type === 'external' && (
                  <div className="form-field">
                    <label>Streaming URL</label>
                    <input
                      type="url"
                      name="streaming_url"
                      value={formData.streaming_url}
                      onChange={handleChange}
                      required={formData.meeting_type === 'external'}
                      placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                    />
                    <div className="field-hint">
                      Enter the full URL where attendees will join your event
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ticketing Section */}
          <div className="info-section">
            <div className="section-title">
              <h3>Ticketing</h3>
              <p>Create multiple tiers to cater to different audience preferences.</p>
            </div>

            <div className="ticket-list">
              {ticketTypes.map((ticketType, index) => (
                <div key={index} className="ticket-card">
                  <div className="ticket-row">
                    <div className="ticket-name">
                      <input
                        type="text"
                        value={ticketType.type_name}
                        onChange={(e) => handleTicketTypeChange(index, 'type_name', e.target.value)}
                        required
                        placeholder="Regular Admission"
                      />
                    </div>
                    <div className="ticket-price">
                      <span className="field-label">PRICE ($)</span>
                      <input
                        type="number"
                        value={ticketType.price}
                        onChange={(e) => handleTicketTypeChange(index, 'price', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        placeholder="50.00"
                      />
                    </div>
                    <div className="ticket-quantity">
                      <span className="field-label">QUANTITY</span>
                      <input
                        type="number"
                        value={ticketType.quantity_available}
                        onChange={(e) => handleTicketTypeChange(index, 'quantity_available', e.target.value)}
                        min="1"
                        placeholder="100"
                      />
                    </div>
                    {ticketTypes.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeTicketType(index)}
                        className="remove-btn"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="ticket-description">
                    <textarea
                      value={ticketType.description}
                      onChange={(e) => handleTicketTypeChange(index, 'description', e.target.value)}
                      rows="2"
                      placeholder="What's included with this ticket type?"
                    />
                  </div>
                </div>
              ))}

              <button type="button" onClick={addTicketType} className="add-tier-btn">
                + Add Another Tier
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button type="submit" className="publish-btn" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />

      <style>{`
        * {
          box-sizing: border-box;
        }

        .create-event-page {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .page-header {
          background: white;
          border-bottom: 1px solid #e9ecef;
          padding: 0.75rem 0;
        }

        .header-nav {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-btn {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: color 0.2s;
        }

        .back-btn:hover {
          color: #0056b3;
        }

        .page-title {
          font-weight: 600;
          color: #212529;
          font-size: 1.1rem;
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .content-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .content-header h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #212529;
          margin: 0 0 0.5rem 0;
        }

        .content-header p {
          color: #6c757d;
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          border: 1px solid #f5c6cb;
          font-size: 0.9rem;
        }

        .event-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .upload-section {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
        }

        .upload-placeholder {
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-placeholder:hover {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .upload-area {
          cursor: pointer;
          display: block;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .upload-title {
          font-size: 1.1rem;
          font-weight: 500;
          color: #495057;
          margin-bottom: 0.5rem;
        }

        .upload-subtitle {
          color: #6c757d;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .image-preview-container {
          position: relative;
        }

        .image-preview {
          width: 100%;
          height: 250px;
          object-fit: cover;
          display: block;
        }

        .change-image-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .info-section {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 2rem;
        }

        .section-title {
          margin-bottom: 1.5rem;
        }

        .section-title h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #212529;
          margin: 0 0 0.25rem 0;
        }

        .section-title p {
          color: #6c757d;
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .form-field {
          margin-bottom: 1.5rem;
        }

        .form-field:last-child {
          margin-bottom: 0;
        }

        .form-field label {
          display: block;
          margin-bottom: 0.5rem;
          color: #495057;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-field input, 
        .form-field select, 
        .form-field textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: inherit;
          transition: border-color 0.15s ease-in-out;
          background: white;
        }

        .form-field input:focus, 
        .form-field select:focus, 
        .form-field textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-field textarea {
          resize: vertical;
          line-height: 1.5;
        }

        .date-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .location-tabs {
          display: flex;
          background: #f8f9fa;
          border-radius: 6px;
          padding: 0.25rem;
          margin-bottom: 1.5rem;
          border: 1px solid #dee2e6;
        }

        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          color: #6c757d;
        }

        .tab-btn.active {
          background: white;
          color: #007bff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .location-content {
          margin-top: 1rem;
        }

        .meeting-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .field-hint {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #6c757d;
          line-height: 1.4;
        }

        .ticket-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ticket-card {
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          padding: 1rem;
        }

        .ticket-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
          margin-bottom: 1rem;
        }

        .ticket-description {
          margin-top: 0.5rem;
        }

        .ticket-description textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 0.9rem;
          resize: vertical;
          font-family: inherit;
        }

        .ticket-description textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .ticket-name {
          display: flex;
          flex-direction: column;
        }

        .ticket-price,
        .ticket-quantity {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .ticket-row input {
          border: 1px solid #ced4da;
          border-radius: 4px;
          padding: 0.5rem;
          font-size: 0.9rem;
        }

        .remove-btn {
          background: #dc3545;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }

        .remove-btn:hover {
          background: #c82333;
        }

        .add-tier-btn {
          background: white;
          color: #007bff;
          border: 2px dashed #007bff;
          padding: 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .add-tier-btn:hover {
          background: #f0f8ff;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem 0;
        }

        .publish-btn {
          background: #17a2b8;
          color: white;
          border: 1px solid #17a2b8;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .publish-btn:hover:not(:disabled) {
          background: #138496;
          border-color: #138496;
        }

        .publish-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .header-nav {
            padding: 0 1rem;
          }

          .main-content {
            padding: 1rem;
          }

          .content-header h1 {
            font-size: 1.75rem;
          }

          .info-section {
            padding: 1.5rem;
          }

          .date-row {
            grid-template-columns: 1fr;
          }

          .ticket-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .upload-placeholder {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CreateEvent;