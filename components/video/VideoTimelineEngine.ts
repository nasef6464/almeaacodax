export type VideoTimelineEventType = 'question' | 'note' | 'resource';

export type VideoQuestionFailureAction = 'continue' | 'retry' | 'rewatch';

export interface VideoTimelineEvent {
  id: string;
  timestamp: number;
  type: VideoTimelineEventType;
  questionId?: string;
  mustPass?: boolean;
  actionOnFail?: VideoQuestionFailureAction;
  rewatchTimestamp?: number;
}

export class VideoTimelineEngine {
  private events: VideoTimelineEvent[];

  constructor(events: VideoTimelineEvent[] = []) {
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
  }

  update(events: VideoTimelineEvent[]) {
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
  }

  getDueEvents(currentTime: number, completedIds: Set<string>) {
    return this.events.filter(
      (event) => event.timestamp <= currentTime && !completedIds.has(event.id),
    );
  }

  getNextEvent(currentTime: number, completedIds: Set<string>) {
    return this.getDueEvents(currentTime, completedIds)[0] ?? null;
  }
}
