import { useEffect } from 'react';
import { io } from 'socket.io-client';

export const useClassroomRealtime = (sessionId: string, onChange: () => void) => useEffect(() => {
  if (!sessionId) return;
  const socket = io({ withCredentials: true });
  socket.on('connect', () => socket.emit('workspace:join', `classroom:${sessionId}`, (result: { ok: boolean }) => { if (!result.ok) socket.disconnect(); }));
  socket.on('question:published', onChange); socket.on('response:updated', onChange); socket.on('session:ended', onChange);
  return () => { socket.disconnect(); };
}, [sessionId, onChange]);
