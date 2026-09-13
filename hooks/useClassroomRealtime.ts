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
  const socket = io(socketUrl || undefined, { withCredentials: true });
  socket.on('connect', () => socket.emit('workspace:join', `classroom:${sessionId}`, (result: { ok: boolean }) => {
    if (!result.ok) socket.disconnect();
  }));
  socket.on('question:published', onChange);
  socket.on('response:updated', onChange);
  socket.on('session:ended', () => {
    onSessionEnded?.();
    onChange();
  });
  return () => { socket.disconnect(); };
}, [sessionId, onChange, onSessionEnded]);
