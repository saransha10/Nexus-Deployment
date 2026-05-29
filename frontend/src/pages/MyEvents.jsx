import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  Chip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Avatar,
  Menu,
  Divider,
  ListItemIcon,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationBell from '../components/NotificationBell';
import ProfileMenu from '../components/ProfileMenu';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';

function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    
    // Redirect admin users - they shouldn't access this page
    if (parsedUser.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }
    
    // Only organizers can access this page
    if (parsedUser.role !== 'organizer') {
      navigate('/dashboard');
      return;
    }
    
    setUser(parsedUser);
    fetchMyEvents();
  }, [navigate]);

  const fetchMyEvents = async () => {
    try {
      const response = await api.get('/events/organizer/my-events');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
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

  const getEventStatus = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    
    if (endTime < now) return 'past';
    return 'upcoming';
  };

  const getFilteredEvents = () => {
    let filtered = events;

    // Apply filter
    if (filter === 'upcoming') {
      filtered = filtered.filter(e => getEventStatus(e) === 'upcoming');
    } else if (filter === 'past') {
      filtered = filtered.filter(e => getEventStatus(e) === 'past');
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return filtered;
  };

  const getStats = () => {
    const upcoming = events.filter(e => getEventStatus(e) === 'upcoming').length;
    const past = events.filter(e => getEventStatus(e) === 'past').length;
    const pending = events.filter(e => e.approval_status === 'pending').length;
    const rejected = events.filter(e => e.approval_status === 'rejected').length;
    
    return {
      total: events.length,
      upcoming,
      past,
      pending,
      rejected
    };
  };

  const stats = getStats();
  const filteredEvents = getFilteredEvents();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
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
              <Button 
                sx={{ 
                  color: '#0891b2', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f0fdfa' }
                }}
              >
                My Events
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            <NotificationBell />
            <ProfileMenu user={user} />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {/* Pending Approval Alert */}
        {stats.pending > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600 }}>
              {stats.pending} event{stats.pending > 1 ? 's' : ''} pending admin approval
            </Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>
              Your event{stats.pending > 1 ? 's' : ''} will be visible to attendees once approved by an administrator.
            </Typography>
          </Alert>
        )}

        {/* Rejected Events Alert */}
        {stats.rejected > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600 }}>
              {stats.rejected} event{stats.rejected > 1 ? 's' : ''} rejected
            </Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>
              Please review the rejection reason and make necessary changes before resubmitting.
            </Typography>
          </Alert>
        )}

        {/* Page Title */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
            My Events
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            Manage and view all your created events
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
          <Typography sx={{ color: '#6b7280' }}>
            Total Events: <strong style={{ color: '#1f2937' }}>{stats.total}</strong>
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            Upcoming: <strong style={{ color: '#1f2937' }}>{stats.upcoming}</strong>
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            Past: <strong style={{ color: '#1f2937' }}>{stats.past}</strong>
          </Typography>
          {stats.pending > 0 && (
            <Typography sx={{ color: '#f59e0b' }}>
              Pending: <strong style={{ color: '#f59e0b' }}>{stats.pending}</strong>
            </Typography>
          )}
          {stats.rejected > 0 && (
            <Typography sx={{ color: '#ef4444' }}>
              Rejected: <strong style={{ color: '#ef4444' }}>{stats.rejected}</strong>
            </Typography>
          )}
        </Box>

        {/* Filters and Search */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4,
          gap: 2,
          flexWrap: 'wrap'
        }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="All Events"
              onClick={() => setFilter('all')}
              sx={{ 
                bgcolor: filter === 'all' ? '#0891b2' : 'white',
                color: filter === 'all' ? 'white' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { bgcolor: filter === 'all' ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Chip 
              label="Upcoming"
              onClick={() => setFilter('upcoming')}
              sx={{ 
                bgcolor: filter === 'upcoming' ? '#0891b2' : 'white',
                color: filter === 'upcoming' ? 'white' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { bgcolor: filter === 'upcoming' ? '#0e7490' : '#f3f4f6' }
              }}
            />
            <Chip 
              label="Past"
              onClick={() => setFilter('past')}
              sx={{ 
                bgcolor: filter === 'past' ? '#0891b2' : 'white',
                color: filter === 'past' ? 'white' : '#6b7280',
                fontWeight: 500,
                cursor: 'pointer',
                '&:hover': { bgcolor: filter === 'past' ? '#0e7490' : '#f3f4f6' }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{ bgcolor: 'white' }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ 
                bgcolor: 'white',
                minWidth: 250,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#e5e7eb' }
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
          </Box>
        </Box>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography sx={{ color: '#9ca3af', mb: 3, fontSize: '1.125rem' }}>
              {searchQuery ? 'No events found matching your search' : "You haven't created any events yet"}
            </Typography>
            {!searchQuery && (
              <Button 
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-event')}
                sx={{ 
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0e7490' }
                }}
              >
                Create Your First Event
              </Button>
            )}
          </Card>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 3
          }}>
            {filteredEvents.map((event) => (
              <Card 
                key={event.event_id}
                sx={{ 
                  boxShadow: 'none',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                }}
                onClick={() => navigate(`/organizer/events/${event.event_id}`)}
              >
                {/* Event Image */}
                <Box sx={{ 
                  height: 200,
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
                  <Chip 
                    label={event.type}
                    size="small"
                    sx={{ 
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      bgcolor: event.type === 'online' ? '#0891b2' : event.type === 'offline' ? '#10b981' : '#8b5cf6',
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}
                  />
                </Box>

                {/* Event Details */}
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: '#1f2937' }}>
                    {event.title}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarMonthIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(event.start_time)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {event.location || 'Virtual Event'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PeopleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {event.attendee_count || 0} attendee{event.attendee_count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid #e5e7eb' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {/* Approval Status Badge */}
                      {event.approval_status === 'pending' && (
                        <Chip 
                          label="Pending Approval"
                          size="small"
                          sx={{ 
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: 600
                          }}
                        />
                      )}
                      {event.approval_status === 'rejected' && (
                        <Chip 
                          label="Rejected"
                          size="small"
                          sx={{ 
                            bgcolor: '#fee2e2',
                            color: '#991b1b',
                            fontWeight: 600
                          }}
                        />
                      )}
                      {(event.approval_status === 'approved' || !event.approval_status) && (
                        <Chip 
                          label={getEventStatus(event) === 'past' ? 'Past' : 'Live'}
                          size="small"
                          sx={{ 
                            bgcolor: getEventStatus(event) === 'past' ? '#fee2e2' : '#d1fae5',
                            color: getEventStatus(event) === 'past' ? '#ef4444' : '#10b981',
                            fontWeight: 600
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/${event.event_id}/analytics`);
                        }}
                        sx={{ 
                          color: '#10b981',
                          '&:hover': { bgcolor: '#f0fdf4' }
                        }}
                        title="View Analytics"
                      >
                        <BarChartIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/${event.event_id}/live`);
                        }}
                        sx={{ 
                          color: '#0891b2',
                          '&:hover': { bgcolor: '#f0fdfa' }
                        }}
                        title="Manage Live Event"
                      >
                        <LiveTvIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/${event.event_id}`);
                        }}
                        sx={{ 
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#f3f4f6' }
                        }}
                        title="View Event"
                      >
                        <VisibilityIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/organizer/events/${event.event_id}`);
                        }}
                        sx={{ 
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#f3f4f6' }
                        }}
                        title="Edit Event"
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add attendees management functionality
                        }}
                        sx={{ 
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#f3f4f6' }
                        }}
                        title="Manage Attendees"
                      >
                        <PersonIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
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

export default MyEvents;
