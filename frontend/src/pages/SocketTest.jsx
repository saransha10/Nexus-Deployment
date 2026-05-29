import { useEffect, useState } from 'react';
import { Box, Typography, Card, Chip, Button } from '@mui/material';
import { useSocket } from '../context/SocketContext';

function SocketTest() {
  const { socket, connected, joinEvent, leaveEvent } = useSocket();
  const [events, setEvents] = useState([]);
  const testEventId = 1;

  useEffect(() => {
    if (!socket) return;

    // Listen to all socket events for debugging
    const onConnect = () => {
      console.log('✅ Connected:', socket.id);
      setEvents(prev => [...prev, { type: 'connect', id: socket.id, time: new Date() }]);
    };

    const onDisconnect = () => {
      console.log('❌ Disconnected');
      setEvents(prev => [...prev, { type: 'disconnect', time: new Date() }]);
    };

    const onChatMessage = (data) => {
      console.log('💬 Chat message:', data);
      setEvents(prev => [...prev, { type: 'chat-message', data, time: new Date() }]);
    };

    const onPollUpdate = (data) => {
      console.log('📊 Poll update:', data);
      setEvents(prev => [...prev, { type: 'poll-update', data, time: new Date() }]);
    };

    const onQuestionNew = (data) => {
      console.log('❓ New question:', data);
      setEvents(prev => [...prev, { type: 'question-new', data, time: new Date() }]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat-message', onChatMessage);
    socket.on('poll-update', onPollUpdate);
    socket.on('question-new', onQuestionNew);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat-message', onChatMessage);
      socket.off('poll-update', onPollUpdate);
      socket.off('question-new', onQuestionNew);
    };
  }, [socket]);

  const handleJoinEvent = () => {
    joinEvent(testEventId);
    setEvents(prev => [...prev, { type: 'join-event', eventId: testEventId, time: new Date() }]);
  };

  const handleLeaveEvent = () => {
    leaveEvent(testEventId);
    setEvents(prev => [...prev, { type: 'leave-event', eventId: testEventId, time: new Date() }]);
  };

  const handleClearEvents = () => {
    setEvents([]);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', p: 4 }}>
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Socket.IO Test Page
        </Typography>
        <Typography sx={{ color: '#6b7280', mb: 4 }}>
          Test real-time Socket.IO connection and events
        </Typography>

        {/* Connection Status */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Connection Status
            </Typography>
            <Chip 
              label={connected ? '🟢 Connected' : '🔴 Disconnected'}
              sx={{ 
                bgcolor: connected ? '#dcfce7' : '#fee2e2',
                color: connected ? '#166534' : '#991b1b',
                fontWeight: 600
              }}
            />
          </Box>
          
          {socket && (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Socket ID: {socket.id || 'Not connected'}
            </Typography>
          )}
        </Card>

        {/* Actions */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleJoinEvent}
              disabled={!connected}
              sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
            >
              Join Event {testEventId}
            </Button>
            <Button
              variant="outlined"
              onClick={handleLeaveEvent}
              disabled={!connected}
            >
              Leave Event {testEventId}
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearEvents}
              color="error"
            >
              Clear Events
            </Button>
          </Box>
        </Card>

        {/* Event Log */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Event Log ({events.length})
          </Typography>
          
          {events.length === 0 ? (
            <Typography sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
              No events yet. Try joining an event or sending a message.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflow: 'auto' }}>
              {events.slice().reverse().map((event, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    p: 2, 
                    bgcolor: '#f9fafb', 
                    borderRadius: 1,
                    borderLeft: '4px solid',
                    borderColor: getEventColor(event.type)
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: getEventColor(event.type) }}>
                      {event.type}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      {event.time.toLocaleTimeString()}
                    </Typography>
                  </Box>
                  
                  {event.data && (
                    <Box 
                      component="pre" 
                      sx={{ 
                        fontSize: '0.75rem', 
                        bgcolor: 'white', 
                        p: 1, 
                        borderRadius: 0.5,
                        overflow: 'auto',
                        maxHeight: 200
                      }}
                    >
                      {JSON.stringify(event.data, null, 2)}
                    </Box>
                  )}
                  
                  {event.id && (
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Socket ID: {event.id}
                    </Typography>
                  )}
                  
                  {event.eventId && (
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Event ID: {event.eventId}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Card>

        {/* Instructions */}
        <Card sx={{ p: 3, mt: 3, bgcolor: '#eff6ff' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e40af' }}>
            📝 Testing Instructions
          </Typography>
          <Box component="ol" sx={{ pl: 2, color: '#1e40af' }}>
            <li>Check that connection status shows "🟢 Connected"</li>
            <li>Click "Join Event 1" to join the test event room</li>
            <li>Open another browser tab/window and do the same</li>
            <li>Go to the actual event live page and send a chat message</li>
            <li>Watch this page for real-time events appearing in the log</li>
            <li>Try voting on polls or submitting questions</li>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

function getEventColor(type) {
  const colors = {
    'connect': '#10b981',
    'disconnect': '#ef4444',
    'join-event': '#0891b2',
    'leave-event': '#f59e0b',
    'chat-message': '#8b5cf6',
    'poll-update': '#ec4899',
    'question-new': '#06b6d4',
    'question-update': '#14b8a6',
  };
  return colors[type] || '#6b7280';
}

export default SocketTest;
