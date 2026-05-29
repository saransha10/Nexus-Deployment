import { useState, useEffect } from 'react';
import { JitsiMeeting as JitsiMeetingSDK } from '@jitsi/react-sdk';
import api from '../services/api';

const JitsiMeeting = ({ eventId }) => {
  const [jitsiInfo, setJitsiInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiInstance, setApiInstance] = useState(null);

  useEffect(() => {
    const fetchJitsiInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/events/${eventId}/jitsi-info`);
        setJitsiInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch Jitsi info:', err);
        setError(
          err.response?.data?.message || 
          err.response?.data?.error || 
          'Failed to load meeting information'
        );
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchJitsiInfo();
    }
  }, [eventId]);

  const handleApiReady = (api) => {
    setApiInstance(api);

    // If user is organizer, set password when they join
    if (jitsiInfo?.isOrganizer && jitsiInfo?.password) {
      api.addEventListener('videoConferenceJoined', () => {
        // Set room password to make organizer the moderator
        api.executeCommand('password', jitsiInfo.password);
      });
    }
  };

  const handleReadyToClose = () => {
    // Clean up when meeting ends
    if (apiInstance) {
      apiInstance.dispose();
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '600px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#666', fontSize: '16px' }}>Loading meeting...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '600px',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#856404" 
            strokeWidth="2" 
            style={{ margin: '0 auto 16px' }}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3 style={{ color: '#856404', marginBottom: '8px' }}>Meeting Not Available</h3>
          <p style={{ color: '#856404', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!jitsiInfo || !jitsiInfo.roomName) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '600px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <p style={{ color: '#666' }}>No meeting information available</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <JitsiMeetingSDK
        domain="meet.jit.si"
        roomName={jitsiInfo.roomName}
        configOverwrite={{
          startWithAudioMuted: !jitsiInfo.isOrganizer,
          prejoinPageEnabled: false,
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
            'security'
          ]
        }}
        userInfo={{
          displayName: localStorage.getItem('userName') || 'Guest'
        }}
        onApiReady={handleApiReady}
        onReadyToClose={handleReadyToClose}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '600px';
          iframeRef.style.width = '100%';
        }}
      />
    </div>
  );
};

export default JitsiMeeting;
