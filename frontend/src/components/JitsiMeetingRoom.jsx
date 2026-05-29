import { useEffect, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import api from '../services/api';

function JitsiMeetingRoom({ eventId, eventTitle, onJoin, onLeave }) {
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateMeetingToken();
  }, [eventId]);

  const generateMeetingToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/event-access/${eventId}/generate-token`);
      setMeetingInfo(response.data);
    } catch (error) {
      console.error('Failed to generate meeting token:', error);
      
      // Handle specific error for organizer not joined
      if (error.response?.status === 403 && error.response?.data?.error?.includes('Organizer has not joined')) {
        setError('⏳ Waiting for organizer to start the meeting. Please check back in a moment.');
      } else {
        setError(error.response?.data?.error || 'Failed to join meeting. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApiReady = (externalApi) => {
    console.log('Jitsi API ready');

    // Log when user joins
    externalApi.addEventListener('videoConferenceJoined', async () => {
      console.log('User joined conference');
      if (onJoin) onJoin();

      // Log access
      try {
        await api.post(`/event-access/${eventId}/log-access`, {
          accessType: 'join'
        });
      } catch (error) {
        console.error('Failed to log join:', error);
      }
    });

    // Log when user leaves
    externalApi.addEventListener('videoConferenceLeft', async () => {
      console.log('User left conference');
      if (onLeave) onLeave();

      // Log access
      try {
        await api.post(`/event-access/${eventId}/log-access`, {
          accessType: 'leave'
        });
      } catch (error) {
        console.error('Failed to log leave:', error);
      }
    });

    // Disable invite functions to prevent link sharing
    externalApi.executeCommand('toggleShareScreen', false);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: 400,
        bgcolor: '#1a1f2e',
        borderRadius: 2
      }}>
        <CircularProgress sx={{ color: '#0891b2', mb: 2 }} />
        <Typography sx={{ color: 'white' }}>
          Preparing meeting room...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
        {error.includes('Organizer has not joined') && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ color: '#6b7280', mb: 2 }}>
              The organizer needs to join first to start the meeting. This ensures they have full moderator control.
            </Typography>
            <Button 
              variant="contained" 
              onClick={generateMeetingToken}
              sx={{ 
                bgcolor: '#0891b2',
                '&:hover': { bgcolor: '#0e7490' }
              }}
            >
              Retry
            </Button>
          </Box>
        )}
        {!error.includes('Organizer has not joined') && (
          <Typography sx={{ color: '#6b7280', mb: 2 }}>
            Please make sure you have a valid ticket for this event.
          </Typography>
        )}
      </Box>
    );
  }

  if (!meetingInfo) {
    return null;
  }

  return (
    <Box>
      {/* Organizer Badge */}
      {meetingInfo.is_organizer && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>
            🎯 You are joining as the Organizer (Moderator)
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', mt: 0.5 }}>
            You're joining first and will automatically become the meeting moderator with full control: 
            mute/unmute participants, kick users, enable lobby, and manage security settings.
          </Typography>
        </Alert>
      )}

      <Box sx={{ 
        width: '100%', 
        height: '600px',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#1a1f2e'
      }}>
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={meetingInfo.room_name}
        configOverwrite={{
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
          enableLobbyChat: false,
          enableWelcomePage: false,
          enableClosePage: false,
          hideConferenceSubject: false,
          subject: eventTitle,
          disableDeepLinking: true,
          disableProfile: true,
          hideDisplayName: false,
          requireDisplayName: true,
          enableNoisyMicDetection: true,
          enableNoAudioDetection: true,
          enableNoiseCancellation: true,
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'chat',
            'raisehand',
            'videoquality',
            'filmstrip',
            'settings',
            'tileview',
            'videobackgroundblur',
            'help'
          ]
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DISABLE_PRESENCE_STATUS: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false
        }}
        userInfo={{
          displayName: meetingInfo.display_name,
          email: meetingInfo.email
        }}
        onApiReady={handleApiReady}
        getIFrameRef={(iframeRef) => { 
          if (iframeRef) {
            iframeRef.style.height = '600px';
            iframeRef.style.width = '100%';
          }
        }}
      />
      </Box>
    </Box>
  );
}

export default JitsiMeetingRoom;
