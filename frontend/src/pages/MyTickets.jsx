import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  Chip,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { getEventImageUrl } from '../utils/eventImage';
import QRCodeDisplay from '../components/QRCodeDisplay';
import ProfileMenu from '../components/ProfileMenu';
import NotificationBell from '../components/NotificationBell';

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets/my-tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticket) => {
    // Check if event has ended
    const now = new Date();
    const eventEnd = new Date(ticket.end_time);
    
    if (now < eventEnd) {
      alert(`Cannot delete ticket before event ends.\n\nEvent: ${ticket.title}\nEvent ends on: ${new Date(ticket.end_time).toLocaleString()}\n\nTickets can only be deleted after the event has finished.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete this ticket?\n\nEvent: ${ticket.title}\nOrder #${ticket.ticket_id}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/tickets/${ticket.ticket_id}`);
      alert('Ticket deleted successfully');
      fetchTickets();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete ticket';
      alert(errorMessage);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const isEventPast = (ticket) => {
    return new Date(ticket.end_time) < new Date();
  };

  const getFilteredTickets = () => {
    // Helper function to check if ticket is valid (paid for)
    const isValidTicket = (t) => t.status === 'active' && (t.payment_status === 'completed' || t.payment_status === 'free');
    
    if (activeTab === 0) return tickets.filter(isValidTicket);
    if (activeTab === 1) return tickets.filter(t => isValidTicket(t) && !isEventPast(t));
    if (activeTab === 2) return tickets.filter(t => t.status === 'used');
    if (activeTab === 3) return tickets.filter(t => isEventPast(t) || t.status === 'cancelled');
    return tickets;
  };

  const getStats = () => {
    // Helper function to check if ticket is valid (paid for)
    const isValidTicket = (t) => t.status === 'active' && (t.payment_status === 'completed' || t.payment_status === 'free');
    
    return {
      total: tickets.filter(isValidTicket).length,
      active: tickets.filter(t => isValidTicket(t) && !isEventPast(t)).length,
      used: tickets.filter(t => t.status === 'used').length,
      expired: tickets.filter(t => isEventPast(t) || t.status === 'cancelled').length
    };
  };

  const handleViewQR = (ticket) => {
    setSelectedTicket(ticket);
    setQrDialogOpen(true);
  };

  const handleDownloadTicket = async (ticket) => {
    setDownloadingTicket(ticket.ticket_id);
    
    try {
      // Create a canvas for the ticket
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (ticket dimensions) - increased height for footer visibility
      canvas.width = 900;
      canvas.height = 850; // Increased from 750 to 850
      
      // Fill background with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#f8fafc');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add main border
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
      
      // Add inner border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
      
      // Add header background with gradient
      const headerGradient = ctx.createLinearGradient(0, 15, 0, 100);
      headerGradient.addColorStop(0, '#0891b2');
      headerGradient.addColorStop(1, '#0e7490');
      ctx.fillStyle = headerGradient;
      ctx.fillRect(15, 15, canvas.width - 30, 85);
      
      // Add decorative elements to header
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.arc(canvas.width - 60, 40, 30, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(60, 70, 20, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EVENT TICKET', canvas.width / 2, 60);
      
      // Add subtitle
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('NEXUS EVENT MANAGEMENT', canvas.width / 2, 80);
      
      // Add event title section
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'center';
      
      // Wrap long event titles
      const maxTitleWidth = 550;
      const words = ticket.title.split(' ');
      let line = '';
      let y = 140;
      const titleLines = [];
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxTitleWidth && n > 0) {
          titleLines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      titleLines.push(line.trim());
      
      // Draw title lines
      titleLines.forEach((titleLine, index) => {
        ctx.fillText(titleLine, canvas.width / 2, y + (index * 32));
      });
      
      y += (titleLines.length * 32) + 10;
      
      // Single column layout for all details on the left
      const leftColumnX = 50;
      let leftY = y + 60;
      
      // All details in left column
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillStyle = '#0891b2';
      
      const allDetails = [
        { label: 'TICKET TYPE', value: ticket.ticket_type },
        { label: 'PRICE', value: `NPR ${parseFloat(ticket.price || 0).toFixed(0)}` },
        { label: 'STATUS', value: ticket.status.toUpperCase() },
        { label: 'PURCHASED', value: formatDate(ticket.created_at) },
        { label: 'EVENT DATE', value: formatDate(ticket.start_time) },
        { label: 'EVENT TIME', value: formatTime(ticket.start_time) },
        { label: 'LOCATION', value: ticket.location || 'Online Event' },
        { label: 'ORGANIZER', value: ticket.organizer_name || 'Event Organizer' }
      ];
      
      allDetails.forEach(detail => {
        ctx.fillStyle = '#0891b2';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText(detail.label, leftColumnX, leftY);
        
        ctx.fillStyle = '#1f2937';
        ctx.font = '16px Arial, sans-serif';
        
        // Handle long text with word wrapping (especially for LOCATION)
        if (detail.value.length > 50) {
          const words = detail.value.split(' ');
          let line = '';
          let textY = leftY + 20;
          const maxWidth = 500;
          let lineCount = 0;
          const maxLines = detail.label === 'LOCATION' ? 4 : 2;
          
          for (let n = 0; n < words.length && lineCount < maxLines; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line.trim(), leftColumnX, textY);
              line = words[n] + ' ';
              textY += 18;
              lineCount++;
            } else {
              line = testLine;
            }
          }
          if (lineCount < maxLines) {
            ctx.fillText(line.trim(), leftColumnX, textY);
          }
          // Add extra spacing for multi-line content
          leftY += 50 + (lineCount * 18);
        } else {
          ctx.fillText(detail.value, leftColumnX, leftY + 20);
          leftY += 50;
        }
      });
      
      // Generate QR code using the qrcode library
      const QRCode = await import('qrcode');
      
      try {
        // Generate QR code as data URL
        const qrDataURL = await QRCode.toDataURL(ticket.qr_code, {
          width: 180,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        // Create image from QR code data URL
        const qrImage = new Image();
        qrImage.onload = () => {
          // Draw QR code - positioned to align with EVENT DATE on left
          const qrSize = 180;
          const qrX = canvas.width - qrSize - 60;
          // Align QR code Y position with the first right column detail (EVENT DATE)
          const qrY = y + 60; // Same starting Y as rightY (EVENT DATE position)
          
          // Add QR code background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
          
          // Add QR code border
          ctx.strokeStyle = '#0891b2';
          ctx.lineWidth = 2;
          ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
          
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
          
          // Add QR code labels with smaller font
          ctx.fillStyle = '#0891b2';
          ctx.font = 'bold 12px Arial, sans-serif'; // Reduced from 14px to 12px
          ctx.textAlign = 'center';
          ctx.fillText('SCAN AT ENTRANCE', qrX + qrSize/2, qrY + qrSize + 22);
          
          ctx.fillStyle = '#6b7280';
          ctx.font = '10px Arial, sans-serif'; // Reduced from 12px to 10px
          ctx.fillText('QR Code: ' + ticket.qr_code.substring(0, 20) + '...', qrX + qrSize/2, qrY + qrSize + 38);
          
          // Add footer section
          const footerY = leftY + 40;
          
          // Footer background
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(25, footerY - 20, canvas.width - 50, 60);
          
          // Footer border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.strokeRect(25, footerY - 20, canvas.width - 50, 60);
          
          // Footer text
          ctx.fillStyle = '#6b7280';
          ctx.font = 'bold 14px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('IMPORTANT INSTRUCTIONS', canvas.width / 2, footerY);
          
          ctx.font = '11px Arial, sans-serif';
          ctx.fillText('• Present this ticket and a valid ID at the event entrance', canvas.width / 2, footerY + 20);
          ctx.fillText('• Keep this ticket safe and do not share with others • Arrive 30 minutes before event time', canvas.width / 2, footerY + 35);
          
          // Add watermark
          ctx.fillStyle = 'rgba(8, 145, 178, 0.1)';
          ctx.font = 'bold 48px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText('NEXUS', 0, 0);
          ctx.restore();
          
          // Download the ticket
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nexus-ticket-${ticket.ticket_id}-${ticket.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDownloadingTicket(null);
          }, 'image/png');
        };
        
        qrImage.onerror = () => {
          console.error('Failed to load QR code image');
          downloadTextTicket(ticket);
          setDownloadingTicket(null);
        };
        
        qrImage.src = qrDataURL;
        
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
        // Add text instead of QR code
        ctx.fillStyle = '#ef4444';
        ctx.font = '14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code: ' + ticket.qr_code, canvas.width - 140, 250);
        
        // Download without QR code
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nexus-ticket-${ticket.ticket_id}-${ticket.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setDownloadingTicket(null);
        }, 'image/png');
      }
      
    } catch (error) {
      console.error('Ticket generation error:', error);
      // Fallback to text-only download
      downloadTextTicket(ticket);
      setDownloadingTicket(null);
    }
  };

  const downloadTextTicket = (ticket) => {
    // Enhanced text-only ticket with comprehensive details
    const ticketData = `
╔══════════════════════════════════════════════════════════════╗
║                        NEXUS EVENT TICKET                   ║
║                     EVENT MANAGEMENT SYSTEM                 ║
╚══════════════════════════════════════════════════════════════╝

EVENT INFORMATION
═════════════════
Event Title: ${ticket.title}
Event Type: ${ticket.type || 'General Event'}
Organizer: ${ticket.organizer_name || 'Event Organizer'}

TICKET DETAILS
══════════════
Order Number: #${ticket.ticket_id?.toString().padStart(10, '0')}
Ticket Type: ${ticket.ticket_type}
Price: NPR ${parseFloat(ticket.price || 0).toFixed(0)}
Status: ${ticket.status.toUpperCase()}
Purchase Date: ${formatDate(ticket.created_at)}

EVENT SCHEDULE
══════════════
Date: ${formatDate(ticket.start_time)}
Start Time: ${formatTime(ticket.start_time)}
End Time: ${formatTime(ticket.end_time)}
Duration: ${ticket.start_time && ticket.end_time ? 
  Math.round((new Date(ticket.end_time) - new Date(ticket.start_time)) / (1000 * 60 * 60)) + ' hours' : 'TBD'}

LOCATION DETAILS
════════════════
Venue: ${ticket.location || 'Online Event'}
${ticket.address ? `Address: ${ticket.address}` : ''}
${ticket.city ? `City: ${ticket.city}` : ''}

QR CODE & SECURITY
══════════════════
QR Code: ${ticket.qr_code}
Security Note: This QR code is unique to your ticket. Do not share it.

IMPORTANT INSTRUCTIONS
══════════════════════
• Present this ticket and a valid photo ID at the event entrance
• Arrive at least 30 minutes before the event start time
• Keep this ticket safe and do not share with others
• Contact support if you have any issues: support@nexus.com
• This ticket is non-transferable and non-refundable

TERMS & CONDITIONS
══════════════════
• Entry is subject to event terms and conditions
• Management reserves the right to refuse entry
• No outside food or beverages allowed (unless specified)
• Photography and recording may be restricted

Generated on: ${new Date().toLocaleString()}
Powered by NEXUS Event Management System

═══════════════════════════════════════════════════════════════
    `;

    const blob = new Blob([ticketData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-ticket-${ticket.ticket_id}-${ticket.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const stats = getStats();
  const filteredTickets = getFilteredTickets();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading tickets...</Typography>
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
                sx={{ 
                  color: '#0891b2', 
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#f0fdfa' }
                }}
              >
                My Tickets
              </Button>
              {user && (user.role === 'organizer' || user.role === 'admin') && (
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
            <NotificationBell />
            <ProfileMenu user={user} />
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
            My Tickets
          </Typography>
          <Typography sx={{ color: '#6b7280' }}>
            View and manage all your event tickets
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 3,
          mb: 4
        }}>
          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  Total Tickets
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.total}
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
                <ConfirmationNumberIcon sx={{ color: '#0891b2', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  Active
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.active}
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
                <CheckCircleIcon sx={{ color: '#10b981', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  Used
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.used}
                </Typography>
              </Box>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleIcon sx={{ color: '#6366f1', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  Past Events
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1f2937' }}>
                  {stats.expired}
                </Typography>
              </Box>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CancelIcon sx={{ color: '#ef4444', fontSize: 28 }} />
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#e5e7eb', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                color: '#6b7280',
                '&.Mui-selected': {
                  color: '#0891b2'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0891b2'
              }
            }}
          >
            <Tab label="All Tickets" />
            <Tab label="Active" />
            <Tab label="Used" />
            <Tab label="Past Events" />
          </Tabs>
        </Box>

        {/* Tickets List */}
        {filteredTickets.length === 0 ? (
          <Card sx={{ p: 6, textAlign: 'center', boxShadow: 'none', border: '1px solid #e5e7eb' }}>
            <Typography sx={{ color: '#9ca3af', mb: 3 }}>
              {activeTab === 1 && 'No active tickets'}
              {activeTab === 2 && 'No used tickets'}
              {activeTab === 3 && 'No past event tickets'}
              {activeTab === 0 && 'No tickets found'}
            </Typography>
            <Button 
              variant="contained"
              onClick={() => navigate('/events')}
              sx={{ 
                bgcolor: '#0891b2',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0e7490' }
              }}
            >
              Browse Events
            </Button>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredTickets.map((ticket) => (
              <Card 
                key={ticket.ticket_id}
                sx={{ 
                  p: 0,
                  boxShadow: 'none',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' }
                }}
              >
                {/* Event Image */}
                <Box sx={{ 
                  width: { xs: '100%', md: 260 },
                  height: { xs: 180, md: 'auto' },
                  minHeight: { md: 200 },
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: '#e5e7eb'
                }}>
                  <img 
                    src={getEventImageUrl(ticket)}
                    alt={ticket.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                </Box>

                {/* Ticket Details */}
                <Box sx={{ flex: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {ticket.title}
                        </Typography>
                        <Chip 
                          label={ticket.status}
                          size="small"
                          sx={{ 
                            bgcolor: ticket.status === 'active' ? '#d1fae5' : ticket.status === 'used' ? '#e0e7ff' : '#fee2e2',
                            color: ticket.status === 'active' ? '#10b981' : ticket.status === 'used' ? '#6366f1' : '#ef4444',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                        {isEventPast(ticket) && ticket.status !== 'cancelled' && (
                          <Chip 
                            label="Past Event"
                            size="small"
                            sx={{ 
                              bgcolor: '#fef3c7',
                              color: '#f59e0b',
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ConfirmationNumberIcon sx={{ fontSize: 18, color: '#0891b2' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Ticket Type:</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {ticket.ticket_type}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonthIcon sx={{ fontSize: 18, color: '#0891b2' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Date:</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {formatDate(ticket.start_time)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeIcon sx={{ fontSize: 18, color: '#0891b2' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Time:</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {formatTime(ticket.start_time)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon sx={{ fontSize: 18, color: '#0891b2' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Location:</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {ticket.location || 'Online Event'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShoppingCartIcon sx={{ fontSize: 18, color: '#0891b2' }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Purchased:</Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#1f2937', fontWeight: 700 }}>
                        NPR {parseFloat(ticket.price || 0).toFixed(0)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      startIcon={<QrCodeIcon />}
                      size="small"
                      onClick={() => handleViewQR(ticket)}
                      disabled={ticket.status === 'cancelled' || isEventPast(ticket)}
                      sx={{ 
                        bgcolor: '#0891b2',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#0e7490' }
                      }}
                    >
                      View QR Code
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={downloadingTicket === ticket.ticket_id ? null : <DownloadIcon />}
                      size="small"
                      onClick={() => handleDownloadTicket(ticket)}
                      disabled={downloadingTicket === ticket.ticket_id}
                      sx={{ 
                        borderColor: '#e5e7eb',
                        color: '#6b7280',
                        textTransform: 'none',
                        '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' }
                      }}
                    >
                      {downloadingTicket === ticket.ticket_id ? 'Generating...' : 'Download'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<InfoIcon />}
                      size="small"
                      onClick={() => navigate(`/events/${ticket.event_id}`)}
                      sx={{ 
                        borderColor: '#e5e7eb',
                        color: '#6b7280',
                        textTransform: 'none',
                        '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' }
                      }}
                    >
                      Event Details
                    </Button>
                    {isEventPast(ticket) && (
                      <Button
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        size="small"
                        onClick={() => handleDeleteTicket(ticket)}
                        sx={{ 
                          borderColor: '#fee2e2',
                          color: '#ef4444',
                          textTransform: 'none',
                          '&:hover': { borderColor: '#fecaca', bgcolor: '#fef2f2' }
                        }}
                        title="Permanently delete this ticket (only available after event ends)"
                      >
                        Delete
                      </Button>
                    )}
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* QR Code Dialog */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 600 }}>
          Your Ticket QR Code
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {selectedTicket && (
            <>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                {selectedTicket.title}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <QRCodeDisplay value={selectedTicket.qr_code} size={250} />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Present this QR code at the event entrance
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={() => setQrDialogOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              borderColor: '#e5e7eb',
              color: '#6b7280',
              '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' }
            }}
          >
            Close
          </Button>
          <Button 
            onClick={() => handleDownloadTicket(selectedTicket)}
            variant="contained"
            disabled={downloadingTicket === selectedTicket?.ticket_id}
            sx={{ 
              textTransform: 'none',
              bgcolor: '#0891b2',
              '&:hover': { bgcolor: '#0e7490' }
            }}
          >
            {downloadingTicket === selectedTicket?.ticket_id ? 'Generating...' : 'Download Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyTickets;
