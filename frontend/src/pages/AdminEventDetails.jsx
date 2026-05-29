import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Chip, Avatar, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ChatIcon from '@mui/icons-material/Chat';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';

function AdminEventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => { fetchEventDetails(); }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/admin/events/${eventId}/details`);
      setData(res.data);
    } catch (err) {
      setAlertMsg({ type: 'error', message: 'Failed to load event details' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.put(`/admin/events/${eventId}/approve`);
      setAlertMsg({ type: 'success', message: 'Event approved successfully!' });
      fetchEventDetails();
    } catch (err) {
      setAlertMsg({ type: 'error', message: err.response?.data?.error || 'Failed to approve' });
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/events/${eventId}/reject`, { reason: rejectReason });
      setAlertMsg({ type: 'success', message: 'Event rejected.' });
      setRejectDialogOpen(false);
      setRejectReason('');
      fetchEventDetails();
    } catch (err) {
      setAlertMsg({ type: 'error', message: err.response?.data?.error || 'Failed to reject' });
    } finally { setActionLoading(false); }
  };

  const statusChip = (status) => {
    const map = {
      approved: { bg: '#d1fae5', color: '#065f46' },
      pending:  { bg: '#fef3c7', color: '#92400e' },
      rejected: { bg: '#fee2e2', color: '#991b1b' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
    return <Chip label={status} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, textTransform: 'capitalize' }} />;
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}><Typography>Loading...</Typography></Box>;
  if (!data)   return <Box sx={{ p:4 }}><Alert severity="error">Event not found</Alert></Box>;

  const { event, organizerStats, ticketStats, paymentBreakdown, attendees, engagement, recentQuestions, polls } = data;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>

      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/dashboard')} sx={{ textTransform: 'none', color: '#6b7280' }}>
              Back to Dashboard
            </Button>
            <Divider orientation="vertical" flexItem />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{event.title}</Typography>
            {statusChip(event.approval_status)}
          </Box>
          {event.approval_status === 'pending' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleApprove} disabled={actionLoading}
                sx={{ textTransform: 'none', bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>
                Approve Event
              </Button>
              <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}
                sx={{ textTransform: 'none', borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                Reject Event
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {alertMsg && (
        <Box sx={{ px: 4, pt: 2 }}>
          <Alert severity={alertMsg.type} onClose={() => setAlertMsg(null)}>{alertMsg.message}</Alert>
        </Box>
      )}

      {/* Stats Row */}
      <Box sx={{ px: 4, py: 3, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
        {[
          { label: 'Total Tickets', value: ticketStats?.total_tickets || 0, icon: <ConfirmationNumberIcon sx={{ color: '#6366f1' }} />, bg: '#e0e7ff' },
          { label: 'Revenue',       value: `NPR ${parseFloat(ticketStats?.total_revenue || 0).toFixed(0)}`, icon: <AttachMoneyIcon sx={{ color: '#10b981' }} />, bg: '#d1fae5' },
          { label: 'Attendees',     value: attendees?.total || 0, icon: <PeopleIcon sx={{ color: '#0891b2' }} />, bg: '#dbeafe' },
          { label: 'Questions',     value: engagement?.total_questions || 0, icon: <QuestionAnswerIcon sx={{ color: '#f59e0b' }} />, bg: '#fef3c7' },
        ].map((s) => (
          <Card key={s.label} sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>{s.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{s.value}</Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 }, '& .MuiTabs-indicator': { bgcolor: '#0891b2' } }}>
          <Tab label="Event Info" />
          <Tab label="Organizer" />
          <Tab label="Attendees" />
          <Tab label="Payments" />
          <Tab label="Engagement" />
        </Tabs>
      </Box>

      <Box sx={{ px: 4, py: 4 }}>

        {/* Tab 0 — Event Info */}
        {activeTab === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
            <Card sx={{ boxShadow: 'none', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <Box sx={{ height: 280, backgroundImage: `url(${getEventImageUrl(event)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{event.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={event.type} size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af' }} />
                  <Chip label={event.meeting_type} size="small" sx={{ bgcolor: '#f3e8ff', color: '#7c3aed' }} />
                  {statusChip(event.approval_status)}
                </Box>
                <Typography sx={{ color: '#6b7280', mb: 2 }}>{event.description}</Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>START</Typography><Typography sx={{ fontWeight: 600 }}>{new Date(event.start_time).toLocaleString()}</Typography></Box>
                  <Box><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>END</Typography><Typography sx={{ fontWeight: 600 }}>{new Date(event.end_time).toLocaleString()}</Typography></Box>
                  <Box><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>LOCATION</Typography><Typography sx={{ fontWeight: 600 }}>{event.location || 'Virtual'}</Typography></Box>
                  <Box><Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>MAX ATTENDEES</Typography><Typography sx={{ fontWeight: 600 }}>{event.max_attendees || 'Unlimited'}</Typography></Box>
                </Box>
                {event.rejection_reason && (
                  <Alert severity="error" sx={{ mt: 2 }}><strong>Rejection reason:</strong> {event.rejection_reason}</Alert>
                )}
              </Box>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                <Typography sx={{ fontWeight: 700, mb: 2 }}>Ticket Stats</Typography>
                {[
                  ['Total Tickets', ticketStats?.total_tickets],
                  ['Active', ticketStats?.active_tickets],
                  ['Used / Scanned', ticketStats?.used_tickets],
                  ['Cancelled', ticketStats?.cancelled_tickets],
                  ['Paid', ticketStats?.paid_tickets],
                  ['Free', ticketStats?.free_tickets],
                ].map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #f3f4f6' }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{label}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{val || 0}</Typography>
                  </Box>
                ))}
              </Card>
            </Box>
          </Box>
        )}

        {/* Tab 1 — Organizer */}
        {activeTab === 1 && (
          <Card sx={{ p: 4, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: '#0891b2', fontSize: '1.5rem' }}>
                {event.organizer_name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{event.organizer_name}</Typography>
                <Typography sx={{ color: '#6b7280' }}>{event.organizer_email}</Typography>
                {event.organizer_phone && <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>{event.organizer_phone}</Typography>}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {event.organizer_verified && <Chip label="Verified" size="small" sx={{ bgcolor: '#d1fae5', color: '#065f46' }} />}
                  <Chip label={event.organizer_status} size="small" sx={{ bgcolor: event.organizer_status === 'active' ? '#d1fae5' : '#fee2e2', color: event.organizer_status === 'active' ? '#065f46' : '#991b1b' }} />
                </Box>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Typography sx={{ fontWeight: 700, mb: 2 }}>Organizer Performance</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
              {[
                ['Total Events', organizerStats?.total_events],
                ['Approved Events', organizerStats?.approved_events],
                ['Rejected Events', organizerStats?.rejected_events],
                ['Pending Events', organizerStats?.pending_events],
                ['Total Tickets Sold', organizerStats?.total_tickets_sold],
                ['Total Revenue', `NPR ${parseFloat(organizerStats?.total_revenue || 0).toFixed(0)}`],
              ].map(([label, val]) => (
                <Box key={label} sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem' }}>{val ?? 0}</Typography>
                </Box>
              ))}
            </Box>
          </Card>
        )}

        {/* Tab 2 — Attendees */}
        {activeTab === 2 && (
          <Card sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
              <Typography sx={{ fontWeight: 700 }}>Attendees ({attendees?.total || 0} total, showing {attendees?.list?.length || 0})</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f9fafb' }}>
                    {['Name', 'Email', 'Ticket Status', 'Payment', 'Price', 'Scans', 'Purchased'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(attendees?.list || []).map((a) => (
                    <TableRow key={a.ticket_id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: '#0891b2', fontSize: '0.75rem' }}>{a.name?.charAt(0)}</Avatar>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{a.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{a.email}</TableCell>
                      <TableCell><Chip label={a.ticket_status} size="small" sx={{ bgcolor: a.ticket_status === 'active' ? '#d1fae5' : a.ticket_status === 'used' ? '#dbeafe' : '#fee2e2', color: a.ticket_status === 'active' ? '#065f46' : a.ticket_status === 'used' ? '#1e40af' : '#991b1b', fontWeight: 600 }} /></TableCell>
                      <TableCell><Chip label={a.payment_status} size="small" sx={{ bgcolor: a.payment_status === 'completed' ? '#d1fae5' : a.payment_status === 'free' ? '#e0e7ff' : '#fef3c7', color: '#374151' }} /></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>NPR {parseFloat(a.price || 0).toFixed(0)}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{a.scan_count || 0}</TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{new Date(a.purchased_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!attendees?.list?.length) && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#9ca3af' }}>No attendees yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Tab 3 — Payments */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(!paymentBreakdown || paymentBreakdown.length === 0) ? (
              <Alert severity="info">No payment data for this event yet.</Alert>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 3 }}>
                {paymentBreakdown.map((p) => (
                  <Card key={p.gateway} sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={p.gateway?.toUpperCase() || 'UNKNOWN'}
                        size="small"
                        sx={{
                          bgcolor: p.gateway === 'khalti' ? '#e9d5ff' : p.gateway === 'esewa' ? '#d1fae5' : '#dbeafe',
                          color: p.gateway === 'khalti' ? '#6b21a8' : p.gateway === 'esewa' ? '#065f46' : '#1e40af',
                          fontWeight: 700
                        }}
                      />
                    </Box>
                    {[
                      ['Transactions', p.transaction_count],
                      ['Total Amount', `NPR ${parseFloat(p.total_amount || 0).toFixed(0)}`],
                      ['Completed', p.successful || p.free_tickets || 0],
                      ['Failed', p.failed],
                      ['Pending', p.pending],
                    ].map(([label, val]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f9fafb' }}>
                        <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{label}</Typography>
                        <Typography sx={{ fontWeight: 600 }}>{val ?? 0}</Typography>
                      </Box>
                    ))}
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 4 — Engagement */}
        {activeTab === 4 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <QuestionAnswerIcon sx={{ color: '#0891b2' }} />
                <Typography sx={{ fontWeight: 700 }}>Q&A Summary</Typography>
              </Box>
              {[
                ['Total Questions', engagement?.total_questions],
                ['Answered', engagement?.answered_questions],
                ['Unanswered', (engagement?.total_questions || 0) - (engagement?.answered_questions || 0)],
              ].map(([label, val]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #f3f4f6' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{val ?? 0}</Typography>
                </Box>
              ))}
              <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>Recent Questions</Typography>
              {(recentQuestions || []).slice(0, 5).map((q) => (
                <Box key={q.question_id} sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{q.question_text}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>by {q.user_name}</Typography>
                  {q.is_answered && <Typography sx={{ fontSize: '0.75rem', color: '#10b981', mt: 0.5 }}>✓ {q.answer_text}</Typography>}
                </Box>
              ))}
            </Card>

            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ChatIcon sx={{ color: '#0891b2' }} />
                <Typography sx={{ fontWeight: 700 }}>Chat & Polls</Typography>
              </Box>
              {[
                ['Total Messages', engagement?.total_messages],
                ['Unique Chatters', engagement?.unique_chatters],
                ['Total Polls', engagement?.total_polls],
              ].map(([label, val]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #f3f4f6' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{val ?? 0}</Typography>
                </Box>
              ))}
              {(polls || []).length > 0 && (
                <>
                  <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>Polls</Typography>
                  {polls.map((p) => (
                    <Box key={p.poll_id} sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.question}</Typography>
                      <Chip label={p.is_active ? 'Active' : 'Closed'} size="small" sx={{ mt: 0.5, bgcolor: p.is_active ? '#d1fae5' : '#f3f4f6', color: p.is_active ? '#065f46' : '#6b7280' }} />
                    </Box>
                  ))}
                </>
              )}
            </Card>
          </Box>
        )}
      </Box>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Event</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#6b7280', mb: 2 }}>
            Please provide a reason for rejecting <strong>{event.title}</strong>. This will be sent to the organizer.
          </Typography>
          <TextField
            fullWidth multiline rows={4} label="Rejection Reason" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Event description is incomplete, missing required information..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ textTransform: 'none', color: '#6b7280' }}>Cancel</Button>
          <Button variant="contained" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}
            sx={{ textTransform: 'none', bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}>
            {actionLoading ? 'Rejecting...' : 'Reject Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminEventDetails;
