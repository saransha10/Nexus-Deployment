import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Avatar,
  IconButton,
  Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { getProfileImageUrl } from '../utils/profileImage';

function LiveChat({ eventId, isOrganizer = false }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const { connected } = useSocket();

  useEffect(() => {
    fetchMessages();
  }, [eventId]);

  // Listen for real-time chat messages
  useSocketEvent('chat-message', (message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.message_id === message.message_id)) {
        return prev;
      }
      return [...prev, message];
    });
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/chat/event/${eventId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post(`/chat/event/${eventId}`, {
        content: newMessage.trim()
      });
      
      // Don't add to state here - let Socket.IO handle it
      // This prevents duplicates since the server will emit the event
      setNewMessage('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;

    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete message');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'organizer': return '#0891b2';
      default: return '#6b7280';
    }
  };

  return (
    <Paper sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Live Chat
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              {messages.length} messages
            </Typography>
          </Box>
          <Chip 
            label={connected ? '🟢 Live' : '🔴 Offline'}
            size="small"
            sx={{ 
              bgcolor: connected ? '#dcfce7' : '#fee2e2',
              color: connected ? '#166534' : '#991b1b',
              fontWeight: 500
            }}
          />
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af'
          }}>
            <Typography>No messages yet. Start the conversation!</Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box 
              key={message.message_id}
              sx={{ 
                display: 'flex', 
                gap: 1,
                p: 1,
                borderRadius: 1,
                '&:hover': { bgcolor: '#f9fafb' }
              }}
            >
              <Avatar 
                src={getProfileImageUrl(message)}
                sx={{ width: 32, height: 32 }}
              >
                {message.sender_name?.charAt(0).toUpperCase()}
              </Avatar>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ fontWeight: 600, color: getRoleColor(message.role) }}
                  >
                    {message.sender_name}
                  </Typography>
                  
                  {message.role !== 'attendee' && (
                    <Chip 
                      label={message.role}
                      size="small"
                      sx={{ 
                        height: 16,
                        fontSize: '0.7rem',
                        bgcolor: getRoleColor(message.role),
                        color: 'white'
                      }}
                    />
                  )}
                  
                  <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                    {formatTime(message.created_at)}
                  </Typography>
                  
                  {(isOrganizer || message.user_id === currentUser.user_id) && (
                    <IconButton 
                      size="small"
                      onClick={() => handleDeleteMessage(message.message_id)}
                      sx={{ ml: 'auto', opacity: 0.7 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.content}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box 
        component="form" 
        onSubmit={handleSendMessage}
        sx={{ 
          p: 2, 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 1
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          inputProps={{ maxLength: 1000 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!newMessage.trim() || sending}
          sx={{ 
            minWidth: 'auto',
            px: 2,
            bgcolor: '#0891b2',
            '&:hover': { bgcolor: '#0e7490' }
          }}
        >
          <SendIcon />
        </Button>
      </Box>
    </Paper>
  );
}

export default LiveChat;