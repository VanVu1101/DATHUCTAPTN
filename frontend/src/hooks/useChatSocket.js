import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function useChatSocket({ onMessage, onRead, onTyping }) {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onMessage, onRead, onTyping });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = { onMessage, onRead, onTyping };
  }, [onMessage, onRead, onTyping]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleMessage = (message) => handlersRef.current.onMessage?.(message);
    const handleRead = (payload) => handlersRef.current.onRead?.(payload);
    const handleTyping = (payload) => handlersRef.current.onTyping?.(payload);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:new', handleMessage);
    socket.on('message:read', handleRead);
    socket.on('typing:update', handleTyping);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef, connected };
}
