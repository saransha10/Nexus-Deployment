import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  IconButton,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [hasTicketsSold, setHasTicketsSold] = useState(false);
  const { toast, showError, showSuccess, showWarning, hideToast } = useToast();
  
  // Form state
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [eventType, setEventType] = useState('offline');
  const [meetingType, setMeetingType] = useState('builtin');

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const isEventLive = (eventData) => {
    if (!eventData) return false;
    const now = new Date();
    const startTime = new Date(eventData.start_time);
    const endTime = new Date(eventData.end_time);
    return now >= startTime && now <= endTime;
  };

  const isEventPast = (eventData) => {
    if (!eventData) return false;
    return new Date(eventData.end_time) < new Date();
  };

  const fetchEventData = async () => {
    try {
      const [eventRes, ticketTypesRes, attendeesRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/ticket-types/event/${id}`),
        api.get(`/tickets/event/${id}/attendees`)
      ]);

      const eventData = eventRes.data;
      
      // Check if event is live or past
      if (isEventLive(eventData)) {
        showWarning('Cannot edit event while it is live. Please wait until the event ends.');
        navigate(`/organizer/events/${id}`);
        return;
      }

      if (isEventPast(eventData)) {
        showWarning('Cannot edit past events.');
        navigate(`/organizer/events/${id}`);
        return;
      }

      setEvent(eventData);
      setDescription(eventData.description || '');
      setLocation(eventData.location || '');
      setStartTime(eventData.start_time ? new Date(eventData.start_time).toISOString().slice(0, 16) : '');
      setEndTime(eventData.end_time ? new Date(eventData.end_time).toISOString().slice(0, 16) : '');
      setStreamingUrl(eventData.streaming_url || '');
      setEventType(eventData.type || 'offline');
      setMeetingType(eventData.meeting_type || 'builtin');
      
      setTicketTypes(ticketTypesRes.data.map(tt => ({
        ...tt,
        originalQuantity: tt.quantity_available,
        sold: tt.sold || 0
      })));
      
      setHasTicketsSold(attendeesRes.data.length > 0);
    } catch (error) {
      console.error('Failed to fetch event data:', error);
      showError('Failed to load event data');
      navigate('/my-events');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketQuantityChange = (index, newQuantity) => {
    const ticket = ticketTypes[index];
    const minQuantity = ticket.sold || 0;
    
    if (newQuantity < minQuantity) {
      showWarning(`Cannot set quantity below ${minQuantity} (tickets already sold)`);
      return;
    }

    setTicketTypes(prev => prev.map((tt, i) => 
      i === index ? { ...tt, quantity_available: newQuantity } : tt
    ));
  };

  const handleAddTicketType = () => {
    setTicketTypes(prev => [...prev, {
      type_name: '',
      price: 0,
      quantity_available: 0,
      description: '',
      isNew: true
    }]);
  };

  const handleRemoveTicketType = (index) => {
    const ticket = ticketTypes[index];
    
    if (ticket.sold > 0) {
      showWarning('Cannot remove ticket type with sold tickets');
      return;
    }

    if (!ticket.isNew && !confirm('Are you sure you want to remove this ticket type?')) {
      return;
    }

    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validation
    if (!description.trim()) {
      showWarning('Description is required');
      return;
    }

    if (!startTime || !endTime) {
      showWarning('Start and end times are required');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      showWarning('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      // Update event details
      await api.put(`/events/${id}`, {
        description: description.trim(),
        location: location.trim(),
        start_time: startTime,
        end_time: endTime,
        streaming_url: streamingUrl.trim(),
        type: eventType,
        meeting_type: meetingType
      });

      // Update ticket types
      for (const ticket of ticketTypes) {
        if (ticket.isNew) {
          // Create new ticket type
          await api.post(`/ticket-types/event/${id}`, {
            type_name: ticket.type_name,
            price: ticket.price,
            quantity_available: ticket.quantity_available,
            description: ticket.description
          });
        } else if (ticket.quantity_available !== ticket.originalQuantity) {
          // Update quantity only
          await api.put(`/ticket-types/${ticket.ticket_type_id}`, {
            quantity_available: ticket.quantity_available
          });
        }
      }

      showSuccess('Event updated successfully!');
      setTimeout(() => navigate(`/organizer/events/${id}`), 1500);
    } catch (error) {
      console.error('Failed to update event:', error);
      showError(error.response?.data?.error || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Event not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '100%', mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(`/organizer/events/${id}`)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Edit Event
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/organizer/events/${id}`)}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ 
                textTransform: 'none',
                bgcolor: '#0891b2',
                '&:hover': { bgcolor: '#0e7490' }
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {/* Warning Banner */}
        {hasTicketsSold && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
              Tickets have been sold for this event
            </Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>
              Some fields are locked to protect attendees. You cannot change the title or ticket prices. You can still update description, location, and increase ticket quantities.
            </Typography>
          </Alert>
        )}

        {/* Locked Fields Info */}
        <Card sx={{ p: 3, mb: 3, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <LockIcon sx={{ color: '#1e40af', mt: 0.5 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, color: '#1e40af', mb: 1 }}>
                Locked Fields (Cannot be edited)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Event Title" size="small" sx={{ bgcolor: '#dbeafe' }} />
                <Chip label="Date & Time" size="small" sx={{ bgcolor: '#dbeafe' }} />
                <Chip label="Ticket Prices" size="small" sx={{ bgcolor: '#dbeafe' }} />
                {hasTicketsSold && (
                  <>
                    <Chip label="Decrease Ticket Quantity" size="small" sx={{ bgcolor: '#dbeafe' }} />
                    <Chip label="Delete Ticket Types" size="small" sx={{ bgcolor: '#dbeafe' }} />
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Card>

        {/* Event Title (Locked) */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Event Title (Cannot be changed)
          </Typography>
          <TextField
            fullWidth
            value={event.title}
            disabled
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <LockIcon sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              )
            }}
          />
        </Card>

        {/* Event Details */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Event Details
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 3 }}
            required
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={true}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                )
              }}
              helperText="Date and time cannot be changed after event creation"
              required
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={true}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                )
              }}
              helperText="Date and time cannot be changed after event creation"
              required
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Event Type</InputLabel>
            <Select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              label="Event Type"
            >
              <MenuItem value="offline">Offline (In-person)</MenuItem>
              <MenuItem value="online">Online (Virtual)</MenuItem>
              <MenuItem value="hybrid">Hybrid (Both)</MenuItem>
            </Select>
          </FormControl>

          {(eventType === 'offline' || eventType === 'hybrid') && (
            <TextField
              fullWidth
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="Enter venue address"
            />
          )}

          {(eventType === 'online' || eventType === 'hybrid') && (
            <>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Meeting Type</InputLabel>
                <Select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  label="Meeting Type"
                >
                  <MenuItem value="builtin">Built-in (Jitsi)</MenuItem>
                  <MenuItem value="external">External (Zoom, Google Meet, etc.)</MenuItem>
                </Select>
              </FormControl>

              {meetingType === 'external' && (
                <TextField
                  fullWidth
                  label="Meeting URL"
                  value={streamingUrl}
                  onChange={(e) => setStreamingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  sx={{ mb: 3 }}
                />
              )}
            </>
          )}
        </Card>

        {/* Ticket Types */}
        <Card sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Ticket Types
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddTicketType}
              sx={{ textTransform: 'none' }}
            >
              Add Ticket Type
            </Button>
          </Box>

          {ticketTypes.map((ticket, index) => (
            <Card key={index} sx={{ p: 3, mb: 2, bgcolor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {ticket.isNew ? 'New Ticket Type' : ticket.type_name}
                </Typography>
                {(ticket.isNew || ticket.sold === 0) && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveTicketType(index)}
                    sx={{ color: '#ef4444' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              {ticket.isNew ? (
                <>
                  <TextField
                    fullWidth
                    label="Ticket Name"
                    value={ticket.type_name}
                    onChange={(e) => setTicketTypes(prev => prev.map((tt, i) => 
                      i === index ? { ...tt, type_name: e.target.value } : tt
                    ))}
                    sx={{ mb: 2 }}
                    required
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                    <TextField
                      label="Price (NPR)"
                      type="number"
                      value={ticket.price}
                      onChange={(e) => setTicketTypes(prev => prev.map((tt, i) => 
                        i === index ? { ...tt, price: parseFloat(e.target.value) || 0 } : tt
                      ))}
                      required
                    />
                    <TextField
                      label="Quantity"
                      type="number"
                      value={ticket.quantity_available}
                      onChange={(e) => setTicketTypes(prev => prev.map((tt, i) => 
                        i === index ? { ...tt, quantity_available: parseInt(e.target.value) || 0 } : tt
                      ))}
                      required
                    />
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Description (Optional)"
                    value={ticket.description || ''}
                    onChange={(e) => setTicketTypes(prev => prev.map((tt, i) => 
                      i === index ? { ...tt, description: e.target.value } : tt
                    ))}
                  />
                </>
              ) : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                    <TextField
                      label="Price (NPR)"
                      value={`NPR ${ticket.price}`}
                      disabled
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <LockIcon sx={{ color: '#9ca3af' }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      label="Quantity Available"
                      type="number"
                      value={ticket.quantity_available}
                      onChange={(e) => handleTicketQuantityChange(index, parseInt(e.target.value) || 0)}
                      helperText={ticket.sold > 0 ? `${ticket.sold} tickets sold (minimum)` : 'Can only increase'}
                      required
                    />
                  </Box>
                  {ticket.sold > 0 && (
                    <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                      {ticket.sold} tickets sold. You can increase quantity but cannot decrease below {ticket.sold}.
                    </Alert>
                  )}
                </>
              )}
            </Card>
          ))}

          {ticketTypes.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4, color: '#9ca3af' }}>
              <Typography>No ticket types yet. Add one to get started.</Typography>
            </Box>
          )}
        </Card>
      </Box>

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Box>
  );
}

export default EditEvent;
