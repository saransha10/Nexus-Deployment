import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  Chip,
  InputAdornment,
  IconButton,
  Avatar,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';
import NotificationBell from '../components/NotificationBell';
import ProfileMenu from '../components/ProfileMenu';

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', search: '', participated: false });
  const [user, setUser] = useState(null);
  const [eventTicketTypes, setEventTicketTypes] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [userTickets, setUserTickets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchEvents();
    fetchUserTickets();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      // If showing participated events, fetch from user's tickets
      if (filter.participated) {
        const token = localStorage.getItem('token');
        if (!token) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const ticketsResponse = await api.get('/tickets/my-tickets');
        const userTickets = ticketsResponse.data;
        
        // Get unique event IDs from tickets
        const eventIds = [...new Set(userTickets.map(t => t.event_id))];
        
        // Fetch event details for each
        const eventPromises = eventIds.map(id => api.get(`/events/${id}`).catch(() => null));
        const eventResponses = await Promise.all(eventPromises);
        const participatedEvents = eventResponses
          .filter(res => res !== null)
          .map(res => res.data)
          .filter(event => isEventPast(event)); // Only show past events in participated
        
        setEvents(participatedEvents);
        participatedEvents.forEach(event => fetchEventTicketTypes(event.event_id));
      } else {
        // Normal flow - fetch upcoming events
        const params = new URLSearchParams();
        if (filter.type) params.append('type', filter.type);
        if (filter.search) params.append('search', filter.search);

        const response = await api.get(`/events?${params}`);
        setEvents(response.data);
        
        response.data.forEach(event => fetchEventTicketTypes(event.event_id));
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/tickets/my-tickets');
      setUserTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch user tickets:', error);
    }
  };

  const hasTicketForEvent = (eventId) => {
    return userTickets.some(ticket => ticket.event_id === eventId);
  };

  const fetchEventTicketTypes = async (eventId) => {
    try {
      const response = await api.get(`/ticket-types/event/${eventId}`);
      setEventTicketTypes(prev => ({
        ...prev,
        [eventId]: response.data
      }));
    } catch (error) {
      console.error('Failed to fetch ticket types:', error);
    }
  };

  const getPriceDisplay = (eventId) => {
    const types = eventTicketTypes[eventId];
    if (!types || types.length === 0) return 'Free';
    
    const prices = types.map(t => parseFloat(t.price)).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    
    if (minPrice === 0 && maxPrice === 0) return 'Free';
    if (minPrice === maxPrice) return `NPR ${minPrice.toFixed(0)}`;
    return `NPR ${minPrice.toFixed(0)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventPast = (event) => {
    return new Date(event.end_time) < new Date();
  };

  const getRegistrationStatus = (event) => {
    const now = new Date();
    const regStart = event.registration_start_time ? new Date(event.registration_start_time) : null;
    const regEnd = event.registration_end_time ? new Date(event.registration_end_time) : null;
    
    // If no registration times set, assume open until event starts
    if (!regStart && !regEnd) {
      return now < new Date(event.start_time) ? 'open' : 'closed';
    }
    
    if (regStart && now < regStart) {
      return 'not_started';
    }
    
    if (regEnd && now > regEnd) {
      return 'closed';
    }
    
    return 'open';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading events...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        px: 2,
        py: 2
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%',
                border: '2px solid white',
                borderTopColor: 'transparent',
                transform: 'rotate(-45deg)'
              }} />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Button 
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  color: '#6b7280', 
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f9fafb', color: '#0891b2' }
                }}
              >
                Dashboard
              </Button>
              <Button 
                sx={{ 
                  color: '#0891b2', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f0fdfa' }
                }}
              >
                Events
              </Button>
              <Button 
                onClick={() => navigate('/my-tickets')}
                sx={{ 
                  color: '#6b7280', 
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f9fafb', color: '#0891b2' }
                }}
              >
                My Tickets
              </Button>
              {user && user.role === 'organizer' && (
                <Button 
                  onClick={() => navigate('/my-events')}
                  sx={{ 
                    color: '#6b7280', 
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f9fafb', color: '#0891b2' }
                  }}
                >
                  My Events
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user && user.role === 'organizer' && (
              <Button 
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-event')}
                sx={{ 
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': { bgcolor: '#0e7490' }
                }}
              >
                Create Event
              </Button>
            )}
            {user && (
              <>
                <NotificationBell />
                <ProfileMenu user={user} />
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Hero Section */}
      <Box sx={{ 
        background: filter.participated 
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #0891b2 0%, #f97316 100%)',
        py: 8,
        px: 2,
        color: 'white'
      }}>
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            {filter.participated ? 'My Participated Events' : 'Discover Amazing Events'}
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.95 }}>
            {filter.participated 
              ? 'View all the events you have attended'
              : 'Find and book tickets for the best events happening around you'}
          </Typography>
          
          {!filter.participated && (
            <TextField
              fullWidth
              placeholder="Search events by name or description..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              sx={{ 
                maxWidth: 500,
                bgcolor: 'white',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { border: 'none' }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9ca3af' }} />
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Box>
      </Box>

      {/* Filters and View Toggle */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', py: 2, px: 4 }}>
        <Box sx={{ maxWidth: '100%', mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="All Events" 
              onClick={() => setFilter({ ...filter, type: '', participated: false })}
              sx={{ 
                bgcolor: filter.type === '' && !filter.participated ? '#0891b2' : 'transparent',
                color: filter.type === '' && !filter.participated ? 'white' : '#6b7280',
                fontWeight: 500,
                '&:hover': { bgcolor: filter.type === '' && !filter.participated ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Chip 
              label="Online" 
              onClick={() => setFilter({ ...filter, type: 'online', participated: false })}
              sx={{ 
                bgcolor: filter.type === 'online' ? '#0891b2' : 'transparent',
                color: filter.type === 'online' ? 'white' : '#6b7280',
                fontWeight: 500,
                '&:hover': { bgcolor: filter.type === 'online' ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Chip 
              label="Offline" 
              onClick={() => setFilter({ ...filter, type: 'offline', participated: false })}
              sx={{ 
                bgcolor: filter.type === 'offline' ? '#0891b2' : 'transparent',
                color: filter.type === 'offline' ? 'white' : '#6b7280',
                fontWeight: 500,
                '&:hover': { bgcolor: filter.type === 'offline' ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Chip 
              label="Hybrid" 
              onClick={() => setFilter({ ...filter, type: 'hybrid', participated: false })}
              sx={{ 
                bgcolor: filter.type === 'hybrid' ? '#0891b2' : 'transparent',
                color: filter.type === 'hybrid' ? 'white' : '#6b7280',
                fontWeight: 500,
                '&:hover': { bgcolor: filter.type === 'hybrid' ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Box sx={{ width: 1, bgcolor: '#e5e7eb', mx: 1 }} />
            <Chip 
              label="My Participated Events" 
              onClick={() => setFilter({ ...filter, type: '', participated: true })}
              sx={{ 
                bgcolor: filter.participated ? '#10b981' : 'transparent',
                color: filter.participated ? 'white' : '#6b7280',
                fontWeight: 500,
                '&:hover': { bgcolor: filter.participated ? '#059669' : '#f3f4f6' }
              }}
            />
          </Box>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Events Grid */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        <Typography sx={{ color: '#6b7280', mb: 3 }}>
          {events.length} events found
        </Typography>

        {events.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: '#9ca3af', mb: 3 }}>
              {filter.participated 
                ? 'You haven\'t participated in any events yet'
                : 'No events found'}
            </Typography>
            {filter.participated && (
              <Button 
                variant="contained"
                onClick={() => setFilter({ ...filter, participated: false })}
                sx={{ 
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0e7490' }
                }}
              >
                Browse Upcoming Events
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
            gap: 3
          }}>
            {events.map((event) => (
              <Card 
                key={event.event_id}
                sx={{ 
                  cursor: 'pointer',
                  boxShadow: 'none',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                }}
                onClick={() => navigate(`/events/${event.event_id}`)}
              >
                <Box sx={{ 
                  height: 200, 
                  bgcolor: '#e5e7eb',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={getEventImageUrl(event)}
                    alt={event.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12,
                    bgcolor: event.type === 'online' ? '#0891b2' : event.type === 'offline' ? '#10b981' : '#8b5cf6',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    {event.type}
                  </Box>
                  
                  {/* Registration Status Badge */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    left: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }}>
                    {(isEventPast(event) || filter.participated) && (
                      <Box sx={{ 
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Event Ended
                      </Box>
                    )}
                    
                    {!isEventPast(event) && (() => {
                      const regStatus = getRegistrationStatus(event);
                      if (regStatus === 'not_started') {
                        return (
                          <Box sx={{ 
                            bgcolor: 'rgba(245, 158, 11, 0.9)',
                            color: 'white',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Opens Soon
                          </Box>
                        );
                      } else if (regStatus === 'closed') {
                        return (
                          <Box sx={{ 
                            bgcolor: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Registration Closed
                          </Box>
                        );
                      } else if (regStatus === 'open') {
                        return (
                          <Box sx={{ 
                            bgcolor: 'rgba(16, 185, 129, 0.9)',
                            color: 'white',
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            Registration Open
                          </Box>
                        );
                      }
                      return null;
                    })()}
                  </Box>
                </Box>
                
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: '#1f2937' }}>
                    {event.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 2, lineHeight: 1.5 }}>
                    {event.description?.substring(0, 100)}...
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(event.start_time)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {event.location || 'Online via Zoom'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PeopleIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {event.organizer_name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontWeight: 700, color: '#1f2937', fontSize: '1.125rem' }}>
                      {getPriceDisplay(event.event_id)}
                    </Typography>
                    <Button 
                      variant="text"
                      sx={{ 
                        color: '#0891b2',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#f0fdfa' }
                      }}
                    >
                      View Details →
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Events;
