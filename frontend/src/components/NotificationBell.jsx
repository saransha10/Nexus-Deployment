import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  Avatar
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../services/api';

function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const open = Boolean(anchorEl);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/notifications');
      setNotifications(response.data.slice(0, 5)); // Show only 5 most recent
      setUnreadCount(response.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.notification_id);
    handleClose();
    
    // Navigate based on notification type
    if (notification.event_id) {
      if (notification.type === 'new_attendee') {
        navigate(`/organizer/events/${notification.event_id}`);
      } else if (notification.type === 'qa_answer' || notification.type === 'new_poll') {
        // Navigate to live event page for Q&A and polls
        navigate(`/events/${notification.event_id}/live`);
      } else {
        navigate(`/events/${notification.event_id}`);
      }
    }
  };

  const getNotificationIcon = (type) => {
    const iconStyle = { width: 40, height: 40, fontSize: 20 };
    
    switch (type) {
      case 'registration':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#10b981' }}>✓</Avatar>;
      case 'reminder':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#f59e0b' }}>⏰</Avatar>;
      case 'new_attendee':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#0891b2' }}>👤</Avatar>;
      case 'qa_answer':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#8b5cf6' }}>💬</Avatar>;
      case 'new_poll':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#ec4899' }}>📊</Avatar>;
      case 'update':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#6366f1' }}>📢</Avatar>;
      case 'cancellation':
        return <Avatar sx={{ ...iconStyle, bgcolor: '#ef4444' }}>❌</Avatar>;
      default:
        return <Avatar sx={{ ...iconStyle, bgcolor: '#9ca3af' }}>🔔</Avatar>;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <>
      <IconButton onClick={handleClick} sx={{ color: '#6b7280' }}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1.5
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAllAsRead}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
            <Typography sx={{ color: '#9ca3af' }}>
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.notification_id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: notification.is_read ? 'transparent' : '#f0fdfa',
                '&:hover': {
                  bgcolor: notification.is_read ? '#f9fafb' : '#e0f2fe'
                },
                borderLeft: notification.is_read ? 'none' : '3px solid #0891b2'
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                {getNotificationIcon(notification.type)}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>
                    {notification.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', mt: 0.5 }}>
                    {formatTime(notification.created_at)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleDelete(notification.notification_id, e)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </MenuItem>
          ))
        )}

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 1.5, display: 'flex', gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => {
              handleClose();
              navigate('/settings');
            }}
            startIcon={<SettingsIcon />}
            sx={{ textTransform: 'none' }}
          >
            Settings
          </Button>
        </Box>
      </Menu>
    </>
  );
}

export default NotificationBell;
