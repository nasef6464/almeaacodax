import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../services/api';

type ClassroomSubscriber = {
  onChange: () => void;
  onSessionEnded?: () => void;
};

type ClassroomEventPayload = { sessionId?: string };

const sessionSubscribers = new Map<string, Set<ClassroomSubscriber>>();
const classSubscribers = new Map<string, Set<() => void>>();
let socket: Socket | null = null;

const socketUrl = () => API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL;

const notifySession = (sessionId: string, event: 'change' | 'ended') => {
  sessionSubscribers.get(sessionId)?.forEach((subscriber) => {
    if (event === 'ended') subscriber.onSessionEnded?.();
    subscriber.onChange();
  });
};

const notifyClass = (classId: string) => {
  classSubscribers.get(classId)?.forEach((subscriber) => subscriber());
};

const joinSession = (id: string) => {
  if (!socket?.connected || !sessionSubscribers.has(id)) return;
  socket.emit('workspace:join', `classroom:${id}`, (result: { ok?: boolean }) => {
    if (result?.ok) notifySession(id, 'change');
  });
};

const joinClass = (id: string) => {
  if (!socket?.connected || !classSubscribers.has(id)) return;
  socket.emit('workspace:join', `class:${id}`);
};

const disposeSocketIfUnused = () => {
  if (sessionSubscribers.size || classSubscribers.size || !socket) return;
  socket.disconnect();
  socket = null;
};

const ensureSocket = () => {
  if (socket) return socket;
  socket = io(socketUrl() || undefined, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  socket.on('connect', () => {
    sessionSubscribers.forEach((_, id) => joinSession(id));
    classSubscribers.forEach((_, id) => joinClass(id));
  });
  const onSessionChange = (payload: ClassroomEventPayload = {}) => {
    if (payload.sessionId) notifySession(String(payload.sessionId), 'change');
  };
  socket.on('question:published', onSessionChange);
  socket.on('response:updated', onSessionChange);
  socket.on('competition:updated', onSessionChange);
  socket.on('batch:ended', onSessionChange);
  socket.on('session:ended', (payload: ClassroomEventPayload = {}) => {
    if (payload.sessionId) notifySession(String(payload.sessionId), 'ended');
  });
  socket.on('classroom:started', (payload: { classId?: string } = {}) => {
    if (payload.classId) notifyClass(String(payload.classId));
  });
  socket.on('classroom:ended', (payload: { classId?: string } = {}) => {
    if (payload.classId) notifyClass(String(payload.classId));
  });
  return socket;
};

const subscribeSession = (sessionId: string, subscriber: ClassroomSubscriber) => {
  const listeners = sessionSubscribers.get(sessionId) || new Set<ClassroomSubscriber>();
  listeners.add(subscriber);
  sessionSubscribers.set(sessionId, listeners);
  const activeSocket = ensureSocket();
  if (activeSocket.connected) joinSession(sessionId);
  return () => {
    const current = sessionSubscribers.get(sessionId);
    current?.delete(subscriber);
    if (!current?.size) {
      sessionSubscribers.delete(sessionId);
      activeSocket.emit('workspace:leave', `classroom:${sessionId}`);
      disposeSocketIfUnused();
    }
  };
};

const subscribeClass = (classId: string, subscriber: () => void) => {
  const listeners = classSubscribers.get(classId) || new Set<() => void>();
  listeners.add(subscriber);
  classSubscribers.set(classId, listeners);
  const activeSocket = ensureSocket();
  if (activeSocket.connected) joinClass(classId);
  return () => {
    const current = classSubscribers.get(classId);
    current?.delete(subscriber);
    if (!current?.size) {
      classSubscribers.delete(classId);
      activeSocket.emit('workspace:leave', `class:${classId}`);
      disposeSocketIfUnused();
    }
  };
};

/** All classroom surfaces in a browser share one Socket.IO transport. */
export const useClassroomRealtime = (
  sessionId: string,
  onChange: () => void,
  onSessionEnded?: () => void,
) => {
  const latest = useRef({ onChange, onSessionEnded });
  latest.current = { onChange, onSessionEnded };

  useEffect(() => {
    if (!sessionId) return;
    return subscribeSession(sessionId, {
      onChange: () => latest.current.onChange(),
      onSessionEnded: () => latest.current.onSessionEnded?.(),
    });
  }, [sessionId]);
};

/** Subscribe to the student's authorized class rooms for live-session discovery. */
export const useClassroomDiscoveryRealtime = (classIds: string[], onChange: () => void) => {
  const latest = useRef(onChange);
  latest.current = onChange;
  const normalizedIds = [...new Set(classIds.map(String).filter(Boolean))].sort();
  const key = normalizedIds.join('|');

  useEffect(() => {
    const unsubscribe = normalizedIds.map((classId) => subscribeClass(classId, () => latest.current()));
    return () => unsubscribe.forEach((stop) => stop());
  // A stable key prevents a parent render that recreates groupIds from reconnecting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
};
