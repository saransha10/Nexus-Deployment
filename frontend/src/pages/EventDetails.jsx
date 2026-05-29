import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  Chip,
  IconButton,
  Avatar
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import EventIcon from '@mui/icons-material/Event';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LanguageIcon from '@mui/icons-material/Language';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';
import PaymentGatewaySelector from '../components/PaymentGatewaySelector';
import LocationDisplay from '../components/LocationDisplay';

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentProductName, setPaymentProductName] = useState('');
  const [selectedTicketType, setSelectedTicketType] = useState(null);

  useEffect(() => {
    fetchEvent();
    fetchTicketTypes();
    checkRegistration();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      const eventData = response.data;
      setEvent(eventData);

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsOrganizer(eventData.organizer_id === user.user_id);
        
        // Admins can view any event - skip redirect check
        if (user.role === 'admin') return;

        // Check if event is past and user doesn't have ticket
        if (!isOrganizer && isEventPastCheck(eventData)) {
          const hasTicket = await checkIfUserHasTicket(id);
          if (!hasTicket) {
            // Redirect to events page if trying to access past event without ticket
            navigate('/events');
            return;
          }
        }
      } else if (isEventPastCheck(eventData)) {
        // Not logged in and event is past - redirect
        navigate('/events');
        return;
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEventPastCheck = (eventData) => {
    return new Date(eventData.end_time) < new Date();
  };

  const checkIfUserHasTicket = async (eventId) => {
    try {
      const response = await api.get('/tickets/my-tickets');
      // Check if user has any tickets for this event with completed or free payment status
      return response.data.some(ticket => 
        ticket.event_id === parseInt(eventId) && 
        ticket.status === 'active' &&
        (ticket.payment_status === 'completed' || ticket.payment_status === 'free')
      );
    } catch (error) {
      return false;
    }
  };

  const fetchTicketTypes = async () => {
    try {
      const response = await api.get(`/ticket-types/event/${id}`);
      const typesWithAvailability = await Promise.all(
        response.data.map(async (type) => {
          try {
            const availCheck = await api.post(`/tickets/check-availability/${id}`, {
              ticket_type_id: type.ticket_type_id
            });
            return {
              ...type,
              remaining: availCheck.data.remaining,
              available: availCheck.data.available
            };
          } catch (error) {
            return {
              ...type,
              remaining: 0,
              available: false
            };
          }
        })
      );

      setTicketTypes(typesWithAvailability);
      
      // Initialize quantities to 0
      const initialQuantities = {};
      typesWithAvailability.forEach(type => {
        initialQuantities[type.ticket_type_id] = 0;
      });
      setTicketQuantities(initialQuantities);
    } catch (error) {
      console.error('Failed to fetch ticket types:', error);
    }
  };

  const checkRegistration = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/tickets/check/${id}`);
      setIsRegistered(response.data.isRegistered);
    } catch (error) {
      console.error('Failed to check registration:', error);
    }
  };

  const updateQuantity = (ticketTypeId, change) => {
    setTicketQuantities(prev => {
      const currentQty = prev[ticketTypeId] || 0;
      const newQty = Math.max(0, currentQty + change);
      const ticketType = ticketTypes.find(t => t.ticket_type_id === ticketTypeId);
      const maxQty = ticketType?.remaining || 0;
      
      return {
        ...prev,
        [ticketTypeId]: Math.min(newQty, maxQty)
      };
    });
  };

  const handleRegister = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to register for this event');
      navigate('/login');
      return;
    }

    // Get first ticket type with quantity > 0
    const selectedType = ticketTypes.find(t => ticketQuantities[t.ticket_type_id] > 0);
    
    if (!selectedType) {
      alert('Please select at least one ticket');
      return;
    }

    const quantity = ticketQuantities[selectedType.ticket_type_id];
    const totalAmount = parseFloat(selectedType.price) * quantity;

    setSelectedTicketType(selectedType.ticket_type_id);
    localStorage.setItem('selected_ticket_type', selectedType.ticket_type_id);
    localStorage.setItem('selected_quantity', quantity); // Store quantity for payment verification

    // For free events, register directly without payment
    if (totalAmount === 0) {
      console.log('Free event - registering without payment');
      await registerTicket(null);
    } else {
      // For paid events, show payment gateway selector
      console.log('Paid event - showing payment options');
      setPaymentAmount(totalAmount);
      setPaymentProductName(`${event.title} - ${selectedType.type_name} (x${quantity})`);
      setShowPaymentSelector(true);
    }
  };

  const registerTicket = async (paymentData) => {
    setRegistering(true);
    try {
      const selectedType = ticketTypes.find(t => t.ticket_type_id === selectedTicketType);
      const quantity = ticketQuantities[selectedTicketType] || 1;
      
      const payload = {
        ticket_type_id: selectedTicketType,
        quantity: quantity, // Add quantity to the payload
        payment_data: paymentData
      };

      const response = await api.post(`/tickets/register/${id}`, payload);
      
      const ticketCount = response.data.quantity || 1;
      alert(`Successfully registered for event with ${ticketCount} ticket${ticketCount > 1 ? 's' : ''}!`);
      
      checkRegistration();
      fetchTicketTypes();
      setTicketQuantities({});
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRegistrationPeriod = () => {
    if (!event.registration_start_time && !event.registration_end_time) {
      return null;
    }
    
    const regStart = event.registration_start_time ? formatDate(event.registration_start_time) : null;
    const regEnd = event.registration_end_time ? formatDate(event.registration_end_time) : null;
    
    if (regStart && regEnd) {
      // If both dates are the same, show single date
      if (regStart === regEnd) {
        return `Registration: ${regStart}`;
      }
      // If different dates, show range
      return `Registration: ${regStart} - ${regEnd}`;
    } else if (regStart) {
      return `Registration starts: ${regStart}`;
    } else if (regEnd) {
      return `Registration ends: ${regEnd}`;
    }
    
    return null;
  };

  const formatEventPeriod = () => {
    const eventStart = formatDate(event.start_time);
    const eventEnd = formatDate(event.end_time);
    
    // If same date, just show the date once
    if (eventStart === eventEnd) {
      return `Event: ${eventStart}`;
    }
    // If different dates, show range
    return `Event: ${eventStart} - ${eventEnd}`;
  };

  const formatTime = (startDate) => {
    const start = new Date(startDate);
    return start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTotalAttending = () => {
    return ticketTypes.reduce((sum, type) => {
      return sum + ((type.quantity_available || 0) - (type.remaining || 0));
    }, 0);
  };

  const isEventPast = () => {
    if (!event) return false;
    return new Date(event.end_time) < new Date();
  };

  const isEventLive = () => {
    if (!event) return false;
    const now = new Date();
    return new Date(event.start_time) <= now && new Date(event.end_time) >= now;
  };

  const getRegistrationStatus = () => {
    if (!event) return 'unknown';
    
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

  const getRegistrationMessage = () => {
    const status = getRegistrationStatus();
    
    switch (status) {
      case 'not_started':
        return {
          title: '⏳ Registration Opens Soon',
          message: `Registration opens on ${formatDate(event.registration_start_time)} at ${new Date(event.registration_start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          color: '#f59e0b',
          bgColor: '#fef3c7'
        };
      case 'closed':
        return {
          title: '🔒 Registration Closed',
          message: event.registration_end_time 
            ? `Registration closed on ${formatDate(event.registration_end_time)} at ${new Date(event.registration_end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : 'Registration is no longer available for this event',
          color: '#ef4444',
          bgColor: '#fef2f2'
        };
      case 'open':
        return null; // No message needed, show normal registration
      default:
        return null;
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
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => navigate('/events')}
              sx={{ color: '#0891b2', textTransform: 'none' }}
            >
              ← Back to Events
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              sx={{ color: '#6b7280', textTransform: 'none' }}
            >
              Dashboard
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Hero Image */}
      <Box sx={{ 
        height: 320,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#e5e7eb'
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))'
        }} />
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          maxWidth: 1600,
          mx: 'auto',
          px: 2,
          pt: 4
        }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={event.type}
              sx={{ 
                bgcolor: event.type === 'online' ? '#0891b2' : '#10b981',
                color: 'white',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            />
            {isEventPast() && (
              <Chip 
                label="Event Ended"
                sx={{ bgcolor: '#ef4444', color: 'white', fontWeight: 600 }}
              />
            )}
            {isEventLive() && (
              <Chip 
                label="🔴 Live Now"
                sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 600 }}
              />
            )}
            {(() => {
              const regStatus = getRegistrationStatus();
              if (regStatus === 'not_started') {
                return (
                  <Chip 
                    label="Registration Opens Soon"
                    sx={{ bgcolor: '#f59e0b', color: 'white', fontWeight: 600 }}
                  />
                );
              } else if (regStatus === 'closed' && !isEventPast()) {
                return (
                  <Chip 
                    label="Registration Closed"
                    sx={{ bgcolor: '#ef4444', color: 'white', fontWeight: 600 }}
                  />
                );
              } else if (regStatus === 'open' && !isEventPast()) {
                return (
                  <Chip 
                    label="Registration Open"
                    sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 600 }}
                  />
                );
              }
              return null;
            })()}
          </Box>
          
          <Typography variant="h3" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
            {event.title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 3, color: 'white', flexWrap: 'wrap' }}>
            {formatRegistrationPeriod() && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HowToRegIcon />
                <Typography>{formatRegistrationPeriod()}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon />
              <Typography>{formatEventPeriod()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon />
              <Typography>{formatTime(event.start_time)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon />
              <Typography>{getTotalAttending()} attending</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
          {/* Left Column */}
          <Box>
            {/* About Section */}
            <Card sx={{ p: 4, mb: 4, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                About This Event
              </Typography>
              <Typography sx={{ color: '#6b7280', lineHeight: 1.8, mb: 3 }}>
                {event.description}
              </Typography>
              
              {event.description && event.description.length > 200 && (
                <>
                  <Typography sx={{ color: '#6b7280', lineHeight: 1.8, mb: 2 }}>
                    What to expect:
                  </Typography>
                  <Box component="ul" sx={{ color: '#6b7280', pl: 3 }}>
                    <li>Expert speakers from leading companies</li>
                    <li>Interactive workshops and hands-on sessions</li>
                    <li>Networking opportunities with industry professionals</li>
                    <li>Exhibition hall with latest products</li>
                  </Box>
                </>
              )}
            </Card>

            {/* Event Details */}
            <Card sx={{ p: 4, boxShadow: 'none', border: '1px solid #e5e7eb', mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Event Details
              </Typography>
              
              {/* Location with Interactive Map */}
              {(event.type === 'offline' || event.type === 'hybrid') && event.location && (
                <Box sx={{ mb: 3 }}>
                  <LocationDisplay
                    locationName={event.location_name || 'Event Venue'}
                    locationAddress={event.location}
                    lat={event.location_lat}
                    lng={event.location_lng}
                    showMap={true}
                    height="300px"
                  />
                </Box>
              )}

              {/* Online Event Info - No streaming link shown here */}
              {(event.type === 'online' || event.type === 'hybrid') && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2, 
                    bgcolor: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <LocationOnIcon sx={{ color: '#10b981' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Online Event</Typography>
                    <Typography sx={{ color: '#6b7280', mb: 1 }}>
                      {isRegistered 
                        ? 'Streaming link will be available when the event goes live. Check your tickets or join from the event live page.'
                        : 'Register for this event to get access to the online streaming link.'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Card>

            {/* Organized By */}
            <Card sx={{ p: 4, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Organized By
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: '#0891b2' }}>
                  {event.organizer_name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                    {event.organizer_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {event.organizer_email}
                    </Typography>
                  </Box>
                  {event.organizer_phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {event.organizer_phone}
                      </Typography>
                    </Box>
                  )}
                  {event.organizer_website && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LanguageIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      <Typography 
                        component="a" 
                        href={event.organizer_website.startsWith('http') ? event.organizer_website : `https://${event.organizer_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          fontSize: '0.875rem', 
                          color: '#0891b2',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {event.organizer_website}
                      </Typography>
                    </Box>
                  )}
                  {(event.organizer_linkedin || event.organizer_twitter) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      {event.organizer_linkedin && (
                        <IconButton
                          component="a"
                          href={event.organizer_linkedin.startsWith('http') ? event.organizer_linkedin : `https://${event.organizer_linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ 
                            color: '#0077b5',
                            '&:hover': { bgcolor: 'rgba(0, 119, 181, 0.1)' }
                          }}
                        >
                          <LinkedInIcon fontSize="small" />
                        </IconButton>
                      )}
                      {event.organizer_twitter && (
                        <IconButton
                          component="a"
                          href={event.organizer_twitter.startsWith('http') ? event.organizer_twitter : `https://twitter.com/${event.organizer_twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ 
                            color: '#1DA1F2',
                            '&:hover': { bgcolor: 'rgba(29, 161, 242, 0.1)' }
                          }}
                        >
                          <TwitterIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>
          </Box>

          {/* Right Column - Tickets */}
          {!isOrganizer && !isEventPast() && (
            <Box>
              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb', position: 'sticky', top: 20 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Select Tickets
                </Typography>

                {/* Registration Status Message */}
                {(() => {
                  const regMessage = getRegistrationMessage();
                  if (regMessage) {
                    return (
                      <Box sx={{ 
                        p: 3, 
                        mb: 3, 
                        borderRadius: 2, 
                        bgcolor: regMessage.bgColor,
                        border: `2px solid ${regMessage.color}`,
                        textAlign: 'center'
                      }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: regMessage.color, mb: 1 }}>
                          {regMessage.title}
                        </Typography>
                        <Typography sx={{ color: regMessage.color, fontSize: '0.875rem' }}>
                          {regMessage.message}
                        </Typography>
                        {getRegistrationStatus() === 'not_started' && (
                          <Button
                            variant="outlined"
                            onClick={() => navigate('/events')}
                            sx={{ 
                              mt: 2,
                              borderColor: regMessage.color,
                              color: regMessage.color,
                              textTransform: 'none',
                              '&:hover': { 
                                borderColor: regMessage.color, 
                                bgcolor: 'rgba(245, 158, 11, 0.1)' 
                              }
                            }}
                          >
                            Browse Other Events
                          </Button>
                        )}
                        {getRegistrationStatus() === 'closed' && (
                          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={() => navigate('/events')}
                              sx={{ 
                                borderColor: regMessage.color,
                                color: regMessage.color,
                                textTransform: 'none',
                                '&:hover': { 
                                  borderColor: regMessage.color, 
                                  bgcolor: 'rgba(239, 68, 68, 0.1)' 
                                }
                              }}
                            >
                              Browse Other Events
                            </Button>
                            {isRegistered && (
                              <Button
                                variant="contained"
                                onClick={() => navigate(`/events/${id}/live`)}
                                sx={{ 
                                  bgcolor: '#10b981',
                                  textTransform: 'none',
                                  '&:hover': { bgcolor: '#059669' }
                                }}
                              >
                                Join Event
                              </Button>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  }
                  return null;
                })()}

                {/* Ticket Selection - Only show if registration is open */}
                {getRegistrationStatus() === 'open' && (
                  <>
                    {ticketTypes.map((type) => (
                    <Box 
                      key={type.ticket_type_id}
                      sx={{ 
                        mb: 3,
                        pb: 3,
                        borderBottom: '1px solid #e5e7eb',
                        '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                            {type.type_name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 1 }}>
                            {type.description || 'Full access to all sessions and materials'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.875rem', color: '#f97316' }}>
                            {type.remaining} of {type.quantity_available || type.remaining} available
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: '#0891b2', fontSize: '1.25rem' }}>
                          {parseFloat(type.price) === 0 ? 'FREE' : `NPR ${parseFloat(type.price).toFixed(0)}`}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                        <IconButton 
                          size="small"
                          onClick={() => updateQuantity(type.ticket_type_id, -1)}
                          disabled={!ticketQuantities[type.ticket_type_id]}
                          sx={{ 
                            border: '1px solid #e5e7eb',
                            '&:disabled': { opacity: 0.5 }
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        
                        <Typography sx={{ minWidth: 30, textAlign: 'center', fontWeight: 600 }}>
                          {ticketQuantities[type.ticket_type_id] || 0}
                        </Typography>
                        
                        <IconButton 
                          size="small"
                          onClick={() => updateQuantity(type.ticket_type_id, 1)}
                          disabled={!type.available || ticketQuantities[type.ticket_type_id] >= type.remaining}
                          sx={{ 
                            border: '1px solid #e5e7eb',
                            '&:disabled': { opacity: 0.5 }
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ShoppingCartIcon />}
                    onClick={handleRegister}
                    disabled={registering || Object.values(ticketQuantities).every(q => q === 0)}
                    sx={{ 
                      mt: 3,
                      mb: 2,
                      py: 1.5,
                      bgcolor: '#0891b2',
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#0e7490' },
                      '&:disabled': { bgcolor: '#d1d5db', color: '#9ca3af' }
                    }}
                  >
                    {registering ? 'Processing...' : 'Register'}
                  </Button>

                  {isRegistered && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/events/${id}/live`)}
                      disabled={event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()}
                      sx={{ 
                        mb: 2,
                        py: 1.5,
                        borderColor: (event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()) ? '#d1d5db' : '#0891b2',
                        color: (event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()) ? '#9ca3af' : '#0891b2',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        '&:hover': { 
                          borderColor: (event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()) ? '#d1d5db' : '#0e7490', 
                          bgcolor: (event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()) ? 'transparent' : '#f0fdfa' 
                        },
                        '&:disabled': {
                          borderColor: '#d1d5db',
                          color: '#9ca3af'
                        }
                      }}
                    >
                      {(event.type === 'online' && (event.meeting_type === 'builtin' || event.meeting_type === 'jitsi') && !canJoinEvent()) ? `🔒 ${getTimeUntilStart()}` : 'Join Live Event'}
                    </Button>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    sx={{ 
                      py: 1.5,
                      borderColor: '#e5e7eb',
                      color: '#6b7280',
                      textTransform: 'none',
                      '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' }
                    }}
                  >
                    Share Event
                  </Button>
                  </>
                )}
              </Card>
            </Box>
          )}

          {/* Past Event Notice for Attendees */}
          {!isOrganizer && isEventPast() && (
            <Box>
              <Card sx={{ p: 4, boxShadow: 'none', border: '2px solid #fbbf24', bgcolor: '#fef3c7' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#92400e', mb: 2 }}>
                    ⏰ This event has ended
                  </Typography>
                  <Typography sx={{ color: '#92400e', mb: 3 }}>
                    This event took place on {formatDate(event.start_time)}. Registration is no longer available.
                  </Typography>
                  {isRegistered && (
                    <Box sx={{ bgcolor: 'white', p: 3, borderRadius: 2, mb: 3 }}>
                      <Typography sx={{ color: '#10b981', fontWeight: 600, mb: 1 }}>
                        ✓ You attended this event
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Check your tickets for event details and memories
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={() => navigate('/events')}
                      sx={{ 
                        bgcolor: '#f59e0b',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#d97706' }
                      }}
                    >
                      Browse Upcoming Events
                    </Button>
                    {isRegistered && (
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/my-tickets')}
                        sx={{ 
                          borderColor: '#f59e0b',
                          color: '#f59e0b',
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': { borderColor: '#d97706', bgcolor: '#fffbeb' }
                        }}
                      >
                        View My Tickets
                      </Button>
                    )}
                  </Box>
                </Box>
              </Card>
            </Box>
          )}

          {/* Organizer Notice */}
          {isOrganizer && (
            <Box>
              <Card sx={{ p: 4, boxShadow: 'none', border: '2px solid #0891b2', bgcolor: '#f0fdfa' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0891b2', mb: 2 }}>
                    📋 You are the organizer
                  </Typography>
                  <Typography sx={{ color: '#6b7280', mb: 3 }}>
                    As the event organizer, you can manage your event and interact with attendees during the live session.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/events/${id}/live`)}
                      sx={{ 
                        bgcolor: '#0891b2',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#0e7490' }
                      }}
                    >
                      Manage Live Event
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/organizer/events/${id}`)}
                      sx={{ 
                        borderColor: '#0891b2',
                        color: '#0891b2',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { borderColor: '#0e7490', bgcolor: '#f0fdfa' }
                      }}
                    >
                      Manage Event
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Box>
          )}
        </Box>
      </Box>

      {showPaymentSelector && (
        <PaymentGatewaySelector
          amount={paymentAmount}
          productName={paymentProductName}
          productId={id}
          ticketTypeId={selectedTicketType}
          onClose={() => setShowPaymentSelector(false)}
        />
      )}
    </Box>
  );
}

export default EventDetails;
