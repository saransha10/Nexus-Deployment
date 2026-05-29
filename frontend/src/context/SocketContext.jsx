import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    // Remove /api suffix for socket connection
    const socketUrl = apiUrl.replace(/\/api$/, '');
    
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinEvent = (eventId) => {
    if (socket && connected) {
      socket.emit('join-event', eventId);
      console.log(`Joined event room: ${eventId}`);
    }
  };

  const leaveEvent = (eventId) => {
    if (socket && connected) {
      socket.emit('leave-event', eventId);
      console.log(`Left event room: ${eventId}`);
    }
  };

  const sendChatMessage = (eventId, message) => {
    if (socket && connected) {
      socket.emit('chat-message', { eventId, ...message });
    }
  };

  const votePoll = (eventId, pollData) => {
    if (socket && connected) {
      socket.emit('poll-vote', { eventId, ...pollData });
    }
  };

  const submitQuestion = (eventId, question) => {
    if (socket && connected) {
      socket.emit('question-submit', { eventId, ...question });
    }
  };

  const upvoteQuestion = (eventId, questionId) => {
    if (socket && connected) {
      socket.emit('question-upvote', { eventId, questionId });
    }
  };

  const notifyOrganizerJoined = (eventId, data) => {
    if (socket && connected) {
      socket.emit('organizer-joined', { eventId, ...data });
    }
  };

  const notifyTicketPurchase = (eventId, ticketData) => {
    if (socket && connected) {
      socket.emit('ticket-purchased', { eventId, ...ticketData });
    }
  };

  const value = {
    socket,
    connected,
    joinEvent,
    leaveEvent,
    sendChatMessage,
    votePoll,
    submitQuestion,
    upvoteQuestion,
    notifyOrganizerJoined,
    notifyTicketPurchase,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
