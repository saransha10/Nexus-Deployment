import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Custom hook to listen to Socket.IO events
 * @param {string} eventName - The event name to listen to
 * @param {function} callback - The callback function to execute when event is received
 */
export const useSocketEvent = (eventName, callback) => {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, connected, eventName, callback]);
};

/**
 * Hook to listen to multiple socket events
 * @param {Object} events - Object with event names as keys and callbacks as values
 */
export const useSocketEvents = (events) => {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected) return;

    // Register all event listeners
    Object.entries(events).forEach(([eventName, callback]) => {
      socket.on(eventName, callback);
    });

    // Cleanup all event listeners
    return () => {
      Object.entries(events).forEach(([eventName, callback]) => {
        socket.off(eventName, callback);
      });
    };
  }, [socket, connected, events]);
};
