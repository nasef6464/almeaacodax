import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';

export const useClassroomRealtime = (
  sessionId: string,
  onChange: () => void,
  onSessionEnded?: () => void,
) => useEffect(() => {
  if (!sessionId) return;

  const socketUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
  const socket = io(socketUrl || undefined, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  const joinWorkspace = () => {
    socket.emit('workspace:join', `classroom:${sessionId}`, (result: { ok: boolean }) => {
      if (!result.ok) {
        socket.disconnect();
        return;
      }

      onChange();
    });
  };

  socket.on('connect', joinWorkspace);
  socket.io.on('reconnect', joinWorkspace);
  socket.on('question:published', onChange);
  socket.on('response:updated', onChange);
  socket.on('competition:updated', onChange);
  socket.on('batch:ended', onChange);
  socket.on('session:ended', () => {
    onSessionEnded?.();
    onChange();
  });

  return () => {
    socket.off('connect', joinWorkspace);
    socket.io.off('reconnect', joinWorkspace);
    socket.off('question:published', onChange);
    socket.off('response:updated', onChange);
    socket.off('competition:updated', onChange);
    socket.off('batch:ended', onChange);
    socket.disconnect();
  };
}, [sessionId, onChange, onSessionEnded]);
