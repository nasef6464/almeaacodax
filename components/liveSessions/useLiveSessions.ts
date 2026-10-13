import { useCallback, useEffect, useState, useRef } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { captureAuthActor, isCurrentAuthActor } from '../../utils/authSessionLifetime';
import type { SessionView } from '../../types/liveSessions';
export function useLiveSessions(scope: 'me' | 'manage') {
  const currentUser = useStore(state => state.user);
  const actorId = `${currentUser?.id}:${currentUser?.role}:${captureAuthActor(currentUser).revision}`;
  const sequence=useRef(0);
  const [snapshot,setSnapshot] = useState<{actorId?: string; sessions: SessionView[]}>({sessions:[]});
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const reload = useCallback(async () => {
    const actor = captureAuthActor(useStore.getState().user);
    const readScope = scope==='me' && (!actor.actorId || actor.actorId==='guest') ? 'public' : scope;
    if (!actor.actorId && readScope!=='public') { setSnapshot({sessions:[]}); return; }
    const request=++sequence.current;
    setLoading(true); setError('');
    try { const data = await api.getLiveSessions(readScope); if (request===sequence.current && isCurrentAuthActor(actor,useStore.getState().user)) setSnapshot({actorId,sessions:data.sessions}); }
    catch (error) { if(request===sequence.current && isCurrentAuthActor(actor,useStore.getState().user)) setError(error instanceof Error ? error.message : 'تعذر تحميل الحصص'); }
    finally { if(isCurrentAuthActor(actor,useStore.getState().user)) setLoading(false); }
  },[actorId,scope]);
  useEffect(()=>{setSnapshot({sessions:[]});setError('');setLoading(false);void reload();},[reload]);
  return { sessions: snapshot.actorId === actorId ? snapshot.sessions : [], error, loading, reload };
}
