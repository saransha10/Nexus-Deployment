import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../services/api';

function OrganizerDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizerEvents();
  }, []);

  const fetchOrganizerEvents = async () => {
    try {
      const response = await api.get('/events/organizer/my-events');
      setEvents(response.data);
      
      // Auto-select first event if available
      if (response.data.length > 0) {
        fetchAttendees(response.data[0].event_id);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async (eventId) => {
    try {
      const response = await api.get(`/tickets/event/${eventId}/attendees`);
      setAttendees(response.data);
      setSelectedEvent(eventId);
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalRevenue = () => {
    return attendees.reduce((sum, a) => sum + parseFloat(a.price || 0), 0);
  };

  const getActiveTickets = () => {
    return attendees.filter(a => a.status === 'active').length;
  };

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
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => navigate('/qr-scanner')}
              sx={{ 
                borderColor: '#e5e7eb',
                color: '#6b7280',
                textTransform: 'none',
                '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' }
              }}
            >
              QR Scanner
            </Button>
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
              Create Event
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

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
            Organizer Dashboard
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            Manage your events and view attendees
          </Typography>
        </Box>

        {events.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography sx={{ color: '#9ca3af', mb: 3, fontSize: '1.125rem' }}>
              You haven't created any events yet
            </Typography>
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
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '350px 1fr' }, gap: 3 }}>
            {/* Left Column - Events List */}
            <Box>
              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Your Events ({events.length})
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {events.map((event) => (
                    <Card
                      key={event.event_id}
                      onClick={() => fetchAttendees(event.event_id)}
                      sx={{ 
                        p: 2,
                        cursor: 'pointer',
                        boxShadow: 'none',
                        border: selectedEvent === event.event_id ? '2px solid #0891b2' : '1px solid #e5e7eb',
                        bgcolor: selectedEvent === event.event_id ? '#f0fdfa' : 'white',
                        '&:hover': { 
                          borderColor: '#0891b2',
                          bgcolor: '#f0fdfa'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>
                          {event.title}
                        </Typography>
                        <Chip 
                          label={event.type}
                          size="small"
                          sx={{ 
                            bgcolor: event.type === 'online' ? '#dbeafe' : event.type === 'offline' ? '#d1fae5' : '#e0e7ff',
                            color: event.type === 'online' ? '#0891b2' : event.type === 'offline' ? '#10b981' : '#6366f1',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'capitalize'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarMonthIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {formatDate(event.start_time)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${event.event_id}`);
                          }}
                          sx={{ 
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            color: '#0891b2',
                            '&:hover': { bgcolor: 'transparent' }
                          }}
                        >
                          View Event
                        </Button>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/analytics/${event.event_id}`);
                          }}
                          sx={{ 
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            '&:hover': { bgcolor: 'transparent' }
                          }}
                        >
                          Analytics
                        </Button>
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Card>
            </Box>

            {/* Right Column - Attendees */}
            <Box>
              {selectedEvent ? (
                <>
                  {/* Stats Cards */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 3,
                    mb: 3
                  }}>
                    <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                            Total Registrations
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                            {attendees.length}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <PeopleIcon sx={{ color: '#0891b2', fontSize: 28 }} />
                        </Box>
                      </Box>
                    </Card>

                    <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                            Total Revenue
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                            NPR {getTotalRevenue().toFixed(0)}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: '#d1fae5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <AttachMoneyIcon sx={{ color: '#10b981', fontSize: 28 }} />
                        </Box>
                      </Box>
                    </Card>

                    <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                            Active Tickets
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                            {getActiveTickets()}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 2, 
                          bgcolor: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ConfirmationNumberIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
                        </Box>
                      </Box>
                    </Card>
                  </Box>

                  {/* Attendees Table */}
                  <Card sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Attendees List
                      </Typography>
                    </Box>

                    {attendees.length === 0 ? (
                      <Box sx={{ p: 6, textAlign: 'center' }}>
                        <Typography sx={{ color: '#9ca3af' }}>
                          No registrations yet for this event
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#f9fafb' }}>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Ticket Type</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Price</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>QR Code</TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Registered</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {attendees.map((attendee) => (
                              <TableRow 
                                key={attendee.ticket_id}
                                sx={{ '&:hover': { bgcolor: '#f9fafb' } }}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#0891b2', fontSize: '0.875rem' }}>
                                      {attendee.name?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                      {attendee.name}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {attendee.email}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={attendee.ticket_type}
                                    size="small"
                                    sx={{ 
                                      bgcolor: '#fef3c7',
                                      color: '#f59e0b',
                                      fontWeight: 600,
                                      fontSize: '0.75rem'
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                                  NPR {parseFloat(attendee.price || 0).toFixed(0)}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={attendee.status}
                                    size="small"
                                    sx={{ 
                                      bgcolor: attendee.status === 'active' ? '#d1fae5' : attendee.status === 'used' ? '#dbeafe' : '#fee2e2',
                                      color: attendee.status === 'active' ? '#10b981' : attendee.status === 'used' ? '#0891b2' : '#ef4444',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      textTransform: 'capitalize'
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#0891b2' }}>
                                  {attendee.qr_code}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {formatDate(attendee.created_at)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Card>
                </>
              ) : (
                <Card sx={{ p: 6, textAlign: 'center', boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                  <Typography sx={{ color: '#9ca3af' }}>
                    Select an event to view attendees
                  </Typography>
                </Card>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default OrganizerDashboard;