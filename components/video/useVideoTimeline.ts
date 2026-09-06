import { useMemo, useRef, useState } from 'react';
import { VideoTimelineEngine, VideoTimelineEvent } from './VideoTimelineEngine';

export const useVideoTimeline = (events: VideoTimelineEvent[] = []) => {
  const engineRef = useRef(new VideoTimelineEngine(events));
  const eventsRef = useRef(events);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());

  if (eventsRef.current !== events) {
    eventsRef.current = events;
    engineRef.current.update(events);
  }

  const pendingEvents = useMemo(
    () => (currentTime: number) => engineRef.current.getDueEvents(currentTime, completedIds),
    [completedIds],
  );

  const completeEvent = (id: string) => {
    setCompletedIds((previous) => new Set(previous).add(id));
  };

  return {
    pendingEvents,
    completeEvent,
    completedIds,
  };
};
