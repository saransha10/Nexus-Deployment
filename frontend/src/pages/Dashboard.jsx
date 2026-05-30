import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Box, Button, Card, Avatar, IconButton, Menu, MenuItem, Divider, ListItemIcon, Alert } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import EventNoteIcon from '@mui/icons-material/EventNote';
import EmailIcon from '@mui/icons-material/Email';
import NotificationBell from '../components/NotificationBell';
import ProfileMenu from '../components/ProfileMenu';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    upcomingEvents: 12,
    myTickets: 8,
    eventsCreated: 5,
    totalAttendees: 342
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Redirect admin users to admin dashboard
    if (parsedUser.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }
    
    setUser(parsedUser);
    
    // Check if email is verified (only for local auth users)
    if (parsedUser.auth_provider === 'local' && !parsedUser.email_verified) {
      setShowVerificationBanner(true);
    }
    
    fetchUpcomingEvents();
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      
      // Fetch user's tickets
      const ticketsResponse = await api.get('/tickets/my-tickets');
      const userTickets = ticketsResponse.data;
      
      // Fetch all events
      const eventsResponse = await api.get('/events');
      const allEvents = eventsResponse.data;
      
      // Calculate upcoming events (events that haven't ended yet)
      const now = new Date();
      const upcoming = allEvents.filter(event => new Date(event.end_time) > now);
      
      // Calculate stats
      const activeTickets = userTickets.filter(t => t.status === 'active').length;
      
      let eventsCreated = 0;
      let totalAttendees = 0;
      
      // If user is organizer, fetch their events directly (includes pending/unapproved)
      if (userData && userData.role === 'organizer') {
        try {
          const organizerEventsResponse = await api.get('/events/organizer/my-events');
          const organizerEvents = organizerEventsResponse.data;
          eventsCreated = organizerEvents.length;

          // Sum up sold tickets across all their events
          organizerEvents.forEach(event => {
            const sold = parseInt(event.attendee_count) || 0;
            totalAttendees += sold;
          });
        } catch (error) {
          console.error('Failed to fetch organizer events:', error);
        }
      }
      
      setStats({
        upcomingEvents: upcoming.length,
        myTickets: activeTickets,
        eventsCreated: eventsCreated,
        totalAttendees: totalAttendees
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await api.get('/events?limit=3');
      setUpcomingEvents(response.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await api.post('/auth/resend-verification', { email: user.email });
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Failed to resend verification:', error);
      alert('Failed to send verification email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  if (!user) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          {/* Logo */}
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
                sx={{ 
                  color: '#0891b2', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f0fdfa' }
                }}
              >
                Dashboard
              </Button>
              <Button 
                onClick={() => navigate('/events')}
                sx={{ 
                  color: '#6b7280', 
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f9fafb', color: '#0891b2' }
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
              {user.role === 'organizer' && (
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

          {/* Right side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationBell />
            <ProfileMenu user={user} />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {/* Email Verification Banner */}
        {showVerificationBanner && (
          <Alert 
            severity="warning" 
            sx={{ mb: 4 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleResendVerification}
                disabled={resendingEmail}
              >
                {resendingEmail ? 'Sending...' : 'Resend Email'}
              </Button>
            }
            icon={<EmailIcon />}
          >
            Please verify your email address. Check your inbox for the verification link.
          </Alert>
        )}

        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
            Welcome back, {user.name.split(' ')[0]}!
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            Here's what's happening with your events today
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 3,
          mb: 5
        }}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                  {stats.upcomingEvents}
                </Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Upcoming Events
                </Typography>
              </Box>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CalendarMonthIcon sx={{ color: '#10b981', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                  {stats.myTickets}
                </Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  My Tickets
                </Typography>
              </Box>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ConfirmationNumberIcon sx={{ color: '#f97316', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>

          {user.role === 'organizer' && (
            <>
              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                      {stats.eventsCreated}
                    </Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Events Created
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: '#f5f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <EmojiEventsIcon sx={{ color: '#8b5cf6', fontSize: 28 }} />
                  </Box>
                </Box>
              </Card>

              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                      {stats.totalAttendees}
                    </Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      Total Attendees
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: '#fce7f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PeopleIcon sx={{ color: '#ec4899', fontSize: 28 }} />
                  </Box>
                </Box>
              </Card>
            </>
          )}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 3 }}>
            Quick Actions
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 3
          }}>
            <Card 
              sx={{ 
                p: 3, 
                cursor: 'pointer',
                boxShadow: 'none',
                border: '1px solid #e5e7eb',
                '&:hover': { borderColor: '#0891b2', bgcolor: '#f0fdfa' }
              }}
              onClick={() => navigate('/events')}
            >
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <SearchIcon sx={{ color: '#10b981', fontSize: 24 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Browse Events
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Discover amazing events happening around you
              </Typography>
            </Card>

            <Card 
              sx={{ 
                p: 3, 
                cursor: 'pointer',
                boxShadow: 'none',
                border: '1px solid #e5e7eb',
                '&:hover': { borderColor: '#0891b2', bgcolor: '#f0fdfa' }
              }}
              onClick={() => navigate('/my-tickets')}
            >
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2
              }}>
                <ConfirmationNumberIcon sx={{ color: '#f97316', fontSize: 24 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                My Tickets
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                View all your purchased and registered tickets
              </Typography>
            </Card>

            {user.role === 'organizer' && (
              <>
                <Card 
                  sx={{ 
                    p: 3, 
                    cursor: 'pointer',
                    boxShadow: 'none',
                    border: '1px solid #e5e7eb',
                    '&:hover': { borderColor: '#0891b2', bgcolor: '#f0fdfa' }
                  }}
                  onClick={() => navigate('/create-event')}
                >
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: '#f5f3ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2
                  }}>
                    <AddIcon sx={{ color: '#8b5cf6', fontSize: 24 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Create Event
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Start organizing your next amazing event
                  </Typography>
                </Card>

                <Card 
                  sx={{ 
                    p: 3, 
                    cursor: 'pointer',
                    boxShadow: 'none',
                    border: '1px solid #e5e7eb',
                    '&:hover': { borderColor: '#0891b2', bgcolor: '#f0fdfa' }
                  }}
                  onClick={() => navigate('/my-events')}
                >
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 2, 
                    bgcolor: '#fce7f3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2
                  }}>
                    <SettingsIcon sx={{ color: '#ec4899', fontSize: 24 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Manage Events
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    View and manage all your created events
                  </Typography>
                </Card>
              </>
            )}
          </Box>
        </Box>

        {/* Upcoming Events */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Upcoming Events
            </Typography>
            <Button 
              onClick={() => navigate('/events')}
              sx={{ 
                color: '#0891b2', 
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { bgcolor: '#f0fdfa' }
              }}
            >
              View all →
            </Button>
          </Box>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 3
          }}>
            {upcomingEvents.map((event) => (
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
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: '#1f2937' }}>
                    {event.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(event.start_time)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PeopleIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {event.location || 'Online via Zoom'}
                    </Typography>
                  </Box>
                  <Button 
                    fullWidth
                    variant="contained"
                    sx={{ 
                      bgcolor: '#0891b2',
                      textTransform: 'none',
                      '&:hover': { bgcolor: '#0e7490' }
                    }}
                  >
                    View Details
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
