import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  Tabs,
  Tab,
  IconButton,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ChatIcon from '@mui/icons-material/Chat';
import PollIcon from '@mui/icons-material/Poll';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import api from '../services/api';
import LiveChat from '../components/LiveChat';
import LivePolls from '../components/LivePolls';
import LiveQA from '../components/LiveQA';
import JitsiMeeting from '../components/JitsiMeeting';
import { useSocket } from '../context/SocketContext';

function EventLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const { joinEvent, leaveEvent, connected } = useSocket();

  useEffect(() => {
    fetchEvent();
    checkAccess();
  }, [id]);

  // Join event room when component mounts
  useEffect(() => {
    if (id && hasAccess) {
      joinEvent(id);
      console.log(`Joined event room: ${id}`);
      
      return () => {
        leaveEvent(id);
        console.log(`Left event room: ${id}`);
      };
    }
  }, [id, hasAccess]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsOrganizer(response.data.organizer_id === user.user_id);
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Check if user has ticket or is organizer
      const response = await api.get(`/tickets/check/${id}`);
      setHasAccess(response.data.isRegistered);
    } catch (error) {
      console.error('Access check failed:', error);
      setHasAccess(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const isEventLive = () => {
    if (!event) return false;
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return now >= start && now <= end;
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

  if (!hasAccess && !isOrganizer) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', p: 4 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', p: 4, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Access Denied
          </Typography>
          <Typography sx={{ color: '#6b7280', mb: 3 }}>
            You need a valid ticket to access this live event.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/events/${id}`)}
            sx={{ 
              bgcolor: '#0891b2',
              textTransform: 'none',
              '&:hover': { bgcolor: '#0e7490' }
            }}
          >
            Get Ticket
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {event.title}
              </Typography>
              
              {isEventLive() ? (
                <Chip 
                  icon={<LiveTvIcon />}
                  label="LIVE"
                  color="error"
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Chip 
                  label="Not Live"
                  color="default"
                />
              )}
              
              <Chip 
                label={connected ? '🟢 Connected' : '🔴 Disconnected'}
                size="small"
                sx={{ 
                  bgcolor: connected ? '#dcfce7' : '#fee2e2',
                  color: connected ? '#166534' : '#991b1b',
                  fontWeight: 500
                }}
              />
              
              {isOrganizer && (
                <Chip 
                  label="Organizer"
                  color="primary"
                  size="small"
                />
              )}
            </Box>
            
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
          {/* Left Column - Video/Content */}
          <Box>
            {/* Video Player */}
            <Card sx={{ mb: 3 }}>
              <Box sx={{ 
                bgcolor: '#1a1f2e',
                position: 'relative'
              }}>
                {/* Only show video/meeting for online or hybrid events */}
                {(event.type === 'online' || event.type === 'hybrid') ? (
                  <>
                    {/* Render based on meeting_type */}
                    {event.meeting_type === 'jitsi' || event.meeting_type === 'builtin' ? (
                      // Jitsi Meeting
                      <JitsiMeeting eventId={id} />
                    ) : event.meeting_type === 'external' ? (
                      // External Meeting (Zoom, Google Meet, etc.) - Show info message
                      <Box sx={{ 
                        aspectRatio: '16/9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        p: 4
                      }}>
                        <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
                          <Typography variant="h3" sx={{ mb: 2 }}>
                            📧
                          </Typography>
                          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                            Meeting Link Sent via Email
                          </Typography>
                          <Typography sx={{ opacity: 0.9, mb: 3, lineHeight: 1.6 }}>
                            The organizer is using an external meeting platform (Zoom, Google Meet, etc.). 
                            Please check your email for the meeting link and instructions.
                          </Typography>
                          {event.streaming_url && (
                            <Button
                              variant="contained"
                              href={event.streaming_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                bgcolor: '#0891b2',
                                color: 'white',
                                textTransform: 'none',
                                px: 4,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#0e7490' }
                              }}
                            >
                              Open Meeting Link
                            </Button>
                          )}
                          <Typography sx={{ opacity: 0.7, mt: 3, fontSize: '0.875rem' }}>
                            You can still use the chat, polls, and Q&A features on this page
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      // No Stream Available
                      <Box sx={{ 
                        aspectRatio: '16/9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <LiveTvIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                          <Typography variant="h6">
                            {isEventLive() ? 'Stream will start soon' : 'Event not started'}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </>
                ) : (
                  // Offline Event - Show Location Info
                  <Box sx={{ 
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    p: 4
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ mb: 2 }}>
                        📍
                      </Typography>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        In-Person Event
                      </Typography>
                      <Typography sx={{ opacity: 0.8, mb: 2 }}>
                        This is an offline event. Please attend at the venue.
                      </Typography>
                      {event.location && (
                        <Typography sx={{ 
                          opacity: 0.9, 
                          fontWeight: 500,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          p: 2,
                          borderRadius: 1
                        }}>
                          📌 {event.location}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>

            {/* Event Info */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                About This Event
              </Typography>
              <Typography sx={{ color: '#6b7280', lineHeight: 1.6 }}>
                {event.description}
              </Typography>
            </Card>
          </Box>

          {/* Right Column - Interaction */}
          <Box>
            <Card sx={{ height: 'fit-content' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="fullWidth"
              >
                <Tab 
                  icon={<ChatIcon />} 
                  label="Chat" 
                  sx={{ textTransform: 'none' }}
                />
                <Tab 
                  icon={<PollIcon />} 
                  label="Polls" 
                  sx={{ textTransform: 'none' }}
                />
                <Tab 
                  icon={<QuestionAnswerIcon />} 
                  label="Q&A" 
                  sx={{ textTransform: 'none' }}
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {activeTab === 0 && (
                  <LiveChat eventId={id} isOrganizer={isOrganizer} />
                )}
                {activeTab === 1 && (
                  <LivePolls eventId={id} isOrganizer={isOrganizer} />
                )}
                {activeTab === 2 && (
                  <LiveQA eventId={id} isOrganizer={isOrganizer} />
                )}
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default EventLive;