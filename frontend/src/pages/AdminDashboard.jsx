import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Grid,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination
} from '@mui/material';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';
import { getProfileImageUrl } from '../utils/profileImage';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const { toast, showError, showSuccess, showWarning, hideToast } = useToast();

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
      alert('Access denied. Admin privileges required.');
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const response = await api.get('/admin/dashboard');
      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading admin dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          {error}
          <Button onClick={() => fetchDashboardData()} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                border: '3px solid white',
                borderTopColor: 'transparent',
                transform: 'rotate(-45deg)'
              }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
                Admin Dashboard
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Platform management and monitoring
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              sx={{ color: '#6b7280' }}
              title="Refresh"
            >
              <RefreshIcon sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                navigate('/login');
              }}
              sx={{
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#ef4444',
                fontWeight: 500,
                '&:hover': { borderColor: '#ef4444', bgcolor: '#fef2f2' }
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Pending Approvals Alert */}
      {dashboardData.pendingApprovals.events > 0 && (
        <Box sx={{ px: 4, pt: 3 }}>
          <Alert severity="warning" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Action Required</Typography>
              <Typography sx={{ fontSize: '0.875rem' }}>
                {dashboardData.pendingApprovals.events} events pending review
              </Typography>
            </Box>
            <Button variant="contained" size="small" onClick={() => setActiveTab(1)}>
              Review Events
            </Button>
          </Alert>
        </Box>
      )}

      {/* Stats Cards */}
      <Box sx={{ px: 4, py: 3 }}>
        <Grid container spacing={3}>
          {[
            { label: 'Total Users',    value: dashboardData.stats.total_users,  sub: `${dashboardData.stats.active_users} active`,   subColor: '#10b981', icon: <PeopleIcon sx={{ color: '#3b82f6' }} />, iconBg: '#dbeafe' },
            { label: 'Total Events',   value: dashboardData.stats.total_events, sub: `${dashboardData.stats.pending_events} pending`, subColor: '#f59e0b', icon: <EventIcon sx={{ color: '#f59e0b' }} />,  iconBg: '#fef3c7' },
            { label: 'Total Revenue',  value: `NPR ${parseFloat(dashboardData.stats.total_revenue).toFixed(0)}`, sub: `${dashboardData.stats.total_tickets} tickets sold`, subColor: '#10b981', icon: <MoneyIcon sx={{ color: '#10b981' }} />, iconBg: '#d1fae5' },
            { label: 'Active Tickets', value: dashboardData.stats.active_tickets, sub: `${dashboardData.stats.total_tickets} total`, subColor: '#6b7280', icon: <AssessmentIcon sx={{ color: '#8b5cf6' }} />, iconBg: '#ede9fe' },
          ].map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb', borderRadius: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
                      {card.value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: card.subColor, fontWeight: 500 }}>
                      {card.sub}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 4, pb: 4 }}>
        <Card sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: '1px solid #e5e7eb' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<AssessmentIcon />} label="Overview" sx={{ textTransform: 'none' }} />
            <Tab icon={<EventIcon />} label="Events" sx={{ textTransform: 'none' }} />
            <Tab icon={<PeopleIcon />} label="User Management" sx={{ textTransform: 'none' }} />
            <Tab icon={<TrendingUpIcon />} label="Analytics" sx={{ textTransform: 'none' }} />
            <Tab icon={<SettingsIcon />} label="Settings" sx={{ textTransform: 'none' }} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && <OverviewTab data={dashboardData} />}
            {activeTab === 1 && <EventApprovalsTab />}
            {activeTab === 2 && <UserManagementTab />}
            {activeTab === 3 && <AnalyticsTab data={dashboardData} />}
            {activeTab === 4 && <SettingsTab />}
          </Box>
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

// Overview Tab Component
function OverviewTab({ data }) {
  const userGrowthData = {
    labels: data.userGrowth.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'New Users',
      data: data.userGrowth.map(d => d.new_users),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const revenueData = {
    labels: data.revenueTrends.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Revenue (NPR)',
      data: data.revenueTrends.map(d => parseFloat(d.revenue)),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const userDistribution = {
    labels: ['Organizers', 'Attendees'],
    datasets: [{
      data: [data.stats.total_organizers, data.stats.total_attendees],
      backgroundColor: ['#f59e0b', '#3b82f6'],
    }]
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            Welcome to the Admin Dashboard. Monitor platform activity, approve events, and manage users.
          </Typography>
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          User Growth (Last 30 Days)
        </Typography>
        <Box sx={{ height: 300 }}>
          <Line 
            data={userGrowthData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Revenue Trends (Last 30 Days)
        </Typography>
        <Box sx={{ height: 300 }}>
          <Line 
            data={revenueData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          User Distribution
        </Typography>
        <Box sx={{ height: 300 }}>
          <Doughnut 
            data={userDistribution}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Recent Activity
        </Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {data.recentActivity.map((activity, index) => (
            <Box 
              key={index}
              sx={{ 
                p: 2, 
                mb: 1, 
                bgcolor: '#f8fafc', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Avatar sx={{ bgcolor: getActivityColor(activity.activity_type) }}>
                {getActivityIcon(activity.activity_type)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {getActivityText(activity)}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {new Date(activity.created_at).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          System Health
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#10b981', mb: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>Database</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {data.systemHealth.database}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600 }}>Uptime</Typography>
              <Typography variant="h6" sx={{ color: '#3b82f6' }}>
                {Math.floor(data.systemHealth.uptime / 3600)}h
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600 }}>Memory</Typography>
              <Typography variant="h6" sx={{ color: '#f59e0b' }}>
                {Math.round(data.systemHealth.memoryUsage.heapUsed / 1024 / 1024)}MB
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 600 }}>Valid Tickets</Typography>
              <Typography variant="h6" sx={{ color: '#10b981' }}>
                {data.stats.valid_tickets}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 0.5 }}>
                {data.stats.scanned_tickets} scanned, {data.stats.unused_tickets} unused
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

// Helper functions for activity feed
function getActivityColor(type) {
  switch (type) {
    case 'user_registered': return '#3b82f6';
    case 'event_created': return '#f59e0b';
    case 'ticket_purchased': return '#10b981';
    default: return '#6b7280';
  }
}

function getActivityIcon(type) {
  switch (type) {
    case 'user_registered': return <PeopleIcon />;
    case 'event_created': return <EventIcon />;
    case 'ticket_purchased': return <MoneyIcon />;
    default: return <DashboardIcon />;
  }
}

function getActivityText(activity) {
  switch (activity.activity_type) {
    case 'user_registered':
      return `New user registered: ${activity.entity_name}`;
    case 'event_created':
      return `New event created: ${activity.entity_name} (${activity.secondary_info})`;
    case 'ticket_purchased':
      return `Ticket purchased: ${activity.secondary_info}`;
    default:
      return activity.entity_name;
  }
}


// Event Approvals Tab Component
function EventApprovalsTab() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast, showError, showSuccess, showWarning, hideToast } = useToast();

  useEffect(() => { fetchEvents(); }, [statusFilter, searchQuery, page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, search: searchQuery, page, limit: 20 });
      const response = await api.get(`/admin/events?${params}`);
      setEvents(response.data.events);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId) => {
    setProcessing(true);
    try {
      await api.put(`/admin/events/${eventId}/approve`);
      showSuccess('Event approved successfully!');
      fetchEvents();
    } catch (error) {
      showError('Failed to approve event');
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { showWarning('Please provide a rejection reason'); return; }
    setProcessing(true);
    try {
      await api.put(`/admin/events/${selectedEvent.event_id}/reject`, { reason: rejectionReason });
      showSuccess('Event rejected successfully!');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      showError('Failed to reject event');
    } finally { setProcessing(false); }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
        <TextField
          placeholder="Search events..." value={searchQuery} size="small" sx={{ flex: 1, minWidth: 200 }}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
        <Button startIcon={<RefreshIcon />} onClick={fetchEvents} variant="outlined">Refresh</Button>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textTransform: 'capitalize' }}>
        {statusFilter} Events ({events.length})
      </Typography>

      {events.length === 0 ? (
        <Alert severity="info">No {statusFilter} events found.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Event</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Organizer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tickets / Revenue</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.event_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 56, height: 56, borderRadius: 1, backgroundImage: `url(${getEventImageUrl(event)})`, backgroundSize: 'cover', backgroundPosition: 'center', bgcolor: '#e5e7eb', flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{event.title}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>{event.description?.substring(0, 50)}...</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem' }}>{event.organizer_name}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>{event.organizer_email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.type} size="small" sx={{ bgcolor: event.type === 'online' ? '#dbeafe' : event.type === 'offline' ? '#d1fae5' : '#e9d5ff', color: event.type === 'online' ? '#1e40af' : event.type === 'offline' ? '#065f46' : '#6b21a8', textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem' }}>{new Date(event.start_time).toLocaleDateString()}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.approval_status} size="small" color={event.approval_status === 'approved' ? 'success' : event.approval_status === 'rejected' ? 'error' : 'warning'} sx={{ textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{event.tickets_sold || 0} tickets</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>NPR {parseFloat(event.revenue || 0).toFixed(0)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/admin/events/${event.event_id}`)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {event.approval_status === 'pending' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton size="small" onClick={() => handleApprove(event.event_id)} disabled={processing} sx={{ color: '#10b981' }}>
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" onClick={() => { setSelectedEvent(event); setRejectDialogOpen(true); }} disabled={processing} sx={{ color: '#ef4444' }}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
            </Box>
          )}
        </>
      )}

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Event</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Please provide a reason for rejecting "{selectedEvent?.title}"</Typography>
          <TextField fullWidth multiline rows={4} label="Rejection Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this event cannot be approved..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>Reject Event</Button>
        </DialogActions>
      </Dialog>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={hideToast} />
    </Box>
  );
}

// User Management Tab Component
function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showError, showSuccess, showWarning, hideToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        role: roleFilter !== 'all' ? roleFilter : '',
        status: statusFilter !== 'all' ? statusFilter : '',
        search: searchQuery
      });
      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setUserDetailsOpen(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleSuspendClick = (user) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      showWarning('Please provide a suspension reason');
      return;
    }

    setProcessing(true);
    try {
      await api.put(`/admin/users/${selectedUser.user_id}/suspend`, {
        reason: suspensionReason,
        duration_days: suspensionDays
      });
      showSuccess('User suspended successfully!');
      setSuspendDialogOpen(false);
      setSuspensionReason('');
      setSuspensionDays(7);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      showError('Failed to suspend user');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to reactivate this user?')) return;

    setProcessing(true);
    try {
      await api.put(`/admin/users/${userId}/reactivate`);
      showSuccess('User reactivated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      showError('Failed to reactivate user');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    setProcessing(true);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      showSuccess('User role updated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      showError('Failed to update user role');
    } finally {
      setProcessing(false);
    }
  };

  if (loading && users.length === 0) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          User Management
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchUsers}>
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label="Role">
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="attendee">Attendee</MenuItem>
              <MenuItem value="organizer">Organizer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
              <MenuItem value="banned">Banned</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e5e7eb', mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f9fafb' }}>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={getProfileImageUrl(user)} sx={{ bgcolor: '#0891b2' }}>
                      {user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{user.name}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                      disabled={processing}
                    >
                      <MenuItem value="attendee">Attendee</MenuItem>
                      <MenuItem value="organizer">Organizer</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.account_status || 'active'} 
                    size="small"
                    sx={{ 
                      bgcolor: user.account_status === 'suspended' ? '#fee2e2' : user.account_status === 'banned' ? '#fecaca' : '#d1fae5',
                      color: user.account_status === 'suspended' ? '#991b1b' : user.account_status === 'banned' ? '#7f1d1d' : '#065f46',
                      textTransform: 'capitalize'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: '0.875rem' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewUser(user.user_id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {user.account_status !== 'suspended' && user.account_status !== 'banned' ? (
                      <Tooltip title="Suspend">
                        <IconButton 
                          size="small" 
                          onClick={() => handleSuspendClick(user)}
                          disabled={processing}
                          sx={{ color: '#f59e0b' }}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reactivate">
                        <IconButton 
                          size="small" 
                          onClick={() => handleReactivate(user.user_id)}
                          disabled={processing}
                          sx={{ color: '#10b981' }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Pagination 
          count={totalPages} 
          page={page} 
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onClose={() => setUserDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar src={getProfileImageUrl(selectedUser)} sx={{ width: 64, height: 64, bgcolor: '#0891b2' }}>
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedUser.name}</Typography>
                    <Typography color="text.secondary">{selectedUser.email}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Role</Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{selectedUser.role}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {selectedUser.account_status || 'active'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Events Created</Typography>
                <Typography variant="body1">{selectedUser.events_created || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Tickets Purchased</Typography>
                <Typography variant="body1">{selectedUser.tickets_purchased || 0}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Joined</Typography>
                <Typography variant="body1">
                  {new Date(selectedUser.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suspend User</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Suspend "{selectedUser?.name}" for:
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Duration</InputLabel>
            <Select value={suspensionDays} onChange={(e) => setSuspensionDays(e.target.value)} label="Duration">
              <MenuItem value={1}>1 Day</MenuItem>
              <MenuItem value={3}>3 Days</MenuItem>
              <MenuItem value={7}>7 Days</MenuItem>
              <MenuItem value={14}>14 Days</MenuItem>
              <MenuItem value={30}>30 Days</MenuItem>
              <MenuItem value={365}>1 Year</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Suspension Reason"
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
            placeholder="Explain why this user is being suspended..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleSuspend}
            disabled={processing || !suspensionReason.trim()}
          >
            Suspend User
          </Button>
        </DialogActions>
      </Dialog>

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


// Analytics Tab Component
function AnalyticsTab({ data }) {
  const [dateRange, setDateRange] = useState('30');

  const eventsByTypeData = {
    labels: ['Online', 'Offline', 'Hybrid'],
    datasets: [{
      label: 'Events',
      data: [
        data.stats.total_events * 0.4,
        data.stats.total_events * 0.4,
        data.stats.total_events * 0.2
      ],
      backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
    }]
  };

  const monthlyRevenueData = {
    labels: data.revenueTrends.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Revenue (NPR)',
      data: data.revenueTrends.map(d => parseFloat(d.revenue)),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
    }]
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'pdf') {
      alert('PDF export coming soon!');
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', data.stats.total_users],
      ['Active Users', data.stats.active_users],
      ['Total Events', data.stats.total_events],
      ['Pending Events', data.stats.pending_events],
      ['Total Revenue', data.stats.total_revenue],
      ['Total Tickets', data.stats.total_tickets],
      ['Organizers', data.stats.total_organizers],
      ['Attendees', data.stats.total_attendees]
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Platform Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} label="Date Range">
              <MenuItem value="7">Last 7 Days</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
              <MenuItem value="365">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined"
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Key Performance Indicators
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                    {data.stats.total_users}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Total Users
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#10b981', mt: 0.5 }}>
                    +{Math.round((data.stats.active_users / data.stats.total_users) * 100)}% Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                    {data.stats.total_events}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Total Events
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#f59e0b', mt: 0.5 }}>
                    {data.stats.pending_events} Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                    NPR {parseFloat(data.stats.total_revenue).toFixed(0)}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Total Revenue
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#10b981', mt: 0.5 }}>
                    {data.stats.total_tickets} Tickets Sold
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                    {data.stats.total_organizers}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Organizers
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#8b5cf6', mt: 0.5 }}>
                    {(data.stats.total_events / data.stats.total_organizers).toFixed(1)} Events/Org
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Events by Type
            </Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut 
                data={eventsByTypeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } }
                }}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Revenue Breakdown
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar 
                data={monthlyRevenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Detailed Stats */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Detailed Statistics
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Average Ticket Price</TableCell>
                    <TableCell align="right">
                      NPR {(parseFloat(data.stats.total_revenue) / data.stats.total_tickets).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label="+5.2%" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46' }} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Events per Organizer</TableCell>
                    <TableCell align="right">
                      {(data.stats.total_events / data.stats.total_organizers).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label="+2.1%" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46' }} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Tickets per Event</TableCell>
                    <TableCell align="right">
                      {(data.stats.total_tickets / data.stats.total_events).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label="+8.7%" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46' }} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>User Engagement Rate</TableCell>
                    <TableCell align="right">
                      {((data.stats.active_users / data.stats.total_users) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      <Chip label="+3.4%" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46' }} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Settings Tab Component
function SettingsTab() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast, showError, showSuccess, hideToast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (setting) => {
    setSelectedSetting(setting);
    setNewValue(setting.setting_value);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      await api.put(`/admin/settings/${selectedSetting.setting_key}`, {
        setting_value: newValue
      });
      showSuccess('Setting updated successfully!');
      setEditDialogOpen(false);
      setSelectedSetting(null);
      setNewValue('');
      fetchSettings();
    } catch (error) {
      console.error('Failed to update setting:', error);
      showError('Failed to update setting');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          System Settings
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchSettings}>
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {settings.map((setting) => (
          <Grid item xs={12} md={6} key={setting.setting_key}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                    {setting.setting_key.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 1 }}>
                    {setting.description}
                  </Typography>
                  <Chip 
                    label={setting.setting_value} 
                    size="small"
                    sx={{ 
                      bgcolor: setting.setting_value === 'true' ? '#d1fae5' : '#fee2e2',
                      color: setting.setting_value === 'true' ? '#065f46' : '#991b1b'
                    }}
                  />
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => handleEditClick(setting)}
                  sx={{ color: '#6b7280' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Last updated: {new Date(setting.updated_at).toLocaleString()}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Setting</DialogTitle>
        <DialogContent>
          {selectedSetting && (
            <Box>
              <Typography sx={{ mb: 2, fontWeight: 600 }}>
                {selectedSetting.setting_key.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Typography>
              <Typography sx={{ mb: 2, fontSize: '0.875rem', color: '#6b7280' }}>
                {selectedSetting.description}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Value</InputLabel>
                <Select value={newValue} onChange={(e) => setNewValue(e.target.value)} label="Value">
                  <MenuItem value="true">Enabled (true)</MenuItem>
                  <MenuItem value="false">Disabled (false)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={processing}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

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

export default AdminDashboard;
