import type {StudyPlan} from '../types';
export type QuizKind = 'drill' | 'test' | 'mock';
export type GeneratedTask = {
  id: string;
  title: string;
  type: 'lesson' | 'quiz' | 'resource';
  quizKind?: QuizKind;
  phase: 'foundation' | 'practice' | 'review';
  phaseLabel: string;
  durationMinutes: number;
  durationLabel: string;
  link?: string;
  external?: boolean;
  scheduledDate: string;
  scheduledTime: string;
  scheduledEndTime: string;
  subjectId?: string;
  completed: boolean;
};


export type PlannedTaskTemplate = Omit<GeneratedTask, 'scheduledDate' | 'scheduledTime' | 'scheduledEndTime'>;

export function scheduleStudentPlanTasks(templates: PlannedTaskTemplate[], currentPlan: StudyPlan, eligibleDates: string[], weakSubjectFocus: Array<{subjectId: string}>, getPhaseForDayIndex: (index:number,total:number)=>GeneratedTask['phase'], getPlanPhaseMeta: (phase:GeneratedTask['phase'])=>{label:string}, addMinutesToTime:(time:string,minutes:number)=>string): GeneratedTask[] {
  if (!eligibleDates.length) return [];
    const subjectPriority = new Map(
      weakSubjectFocus.map((item, index) => [item.subjectId, index]),
    );

    const rankedSubjectIds = Array.from(
      new Set<string>(
        currentPlan.subjectIds
          .map(String)
          .sort(
            (a, b) =>
              (subjectPriority.get(a) ?? Number.MAX_SAFE_INTEGER) -
              (subjectPriority.get(b) ?? Number.MAX_SAFE_INTEGER),
          ),
      ),
    );

    const taskPools = new Map<
      string,
      {
        lesson: PlannedTaskTemplate[];
        quiz: PlannedTaskTemplate[];
        resource: PlannedTaskTemplate[];
      }
    >();

    [...templates]
      .sort((a, b) => {
        const priorityA = subjectPriority.get(a.subjectId || '') ?? Number.MAX_SAFE_INTEGER;
        const priorityB = subjectPriority.get(b.subjectId || '') ?? Number.MAX_SAFE_INTEGER;
        return priorityA - priorityB;
      })
      .forEach((task) => {
        const subjectKey = task.subjectId || '__general__';
        if (!taskPools.has(subjectKey)) {
          taskPools.set(subjectKey, { lesson: [], quiz: [], resource: [] });
        }
        taskPools.get(subjectKey)![task.type].push(task);
      });

    const subjectOrder: string[] = [
      ...rankedSubjectIds,
      ...Array.from(taskPools.keys()).filter((key) => key === '__general__' || !rankedSubjectIds.includes(key)),
    ];

    const hasRemainingTasks = () =>
      Array.from(taskPools.values()).some(
        (bucket) => bucket.lesson.length || bucket.quiz.length || bucket.resource.length,
      );

    const takeNextTask = (phase: GeneratedTask['phase']) => {
      const phasePreferences: Record<GeneratedTask['phase'], GeneratedTask['type'][]> = {
        foundation: ['lesson', 'resource', 'quiz'],
        practice: ['quiz', 'lesson', 'resource'],
        review: ['quiz', 'resource', 'lesson'],
      };

      for (const type of phasePreferences[phase]) {
        for (const subjectId of subjectOrder) {
          const bucket = taskPools.get(subjectId);
          if (bucket && bucket[type].length) {
            return bucket[type].shift() || null;
          }
        }
      }

      for (const subjectId of subjectOrder) {
        const bucket = taskPools.get(subjectId);
        if (!bucket) continue;
        for (const type of ['lesson', 'quiz', 'resource'] as const) {
          if (bucket[type].length) {
            return bucket[type].shift() || null;
          }
        }
      }

      return null;
    };

    const scheduledTasks: GeneratedTask[] = [];

    eligibleDates.forEach((date, dayIndex) => {
      const dayPhase = getPhaseForDayIndex(dayIndex, eligibleDates.length);
      let consumedMinutes = 0;
      let safety = 0;

      while (hasRemainingTasks() && safety < 50) {
        const nextTask = takeNextTask(dayPhase);
        if (!nextTask) break;
        safety += 1;

        const effectiveDuration = Math.max(nextTask.durationMinutes, 10);
        if (consumedMinutes > 0 && consumedMinutes + effectiveDuration > currentPlan.dailyMinutes) {
          const subjectKey = nextTask.subjectId || '__general__';
          if (!taskPools.has(subjectKey)) {
            taskPools.set(subjectKey, { lesson: [], quiz: [], resource: [] });
          }
          taskPools.get(subjectKey)![nextTask.type].unshift(nextTask);
          break;
        }

        const phaseMeta = getPlanPhaseMeta(dayPhase);
        scheduledTasks.push({
          ...nextTask,
          phase: dayPhase,
          phaseLabel: phaseMeta.label,
          scheduledDate: date,
          scheduledTime: addMinutesToTime(currentPlan.preferredStartTime || '17:00', consumedMinutes),
          scheduledEndTime: addMinutesToTime(
            currentPlan.preferredStartTime || '17:00',
            consumedMinutes + effectiveDuration,
          ),
        });
        consumedMinutes += effectiveDuration;
      }
    });

    if (hasRemainingTasks()) {
      const lastDate = eligibleDates[eligibleDates.length - 1];
      const lastDayTasks = scheduledTasks.filter((task) => task.scheduledDate === lastDate);
      let consumedMinutes = lastDayTasks.reduce((sum, task) => sum + Math.max(task.durationMinutes, 10), 0);

      while (hasRemainingTasks()) {
        const nextTask = takeNextTask('review');
        if (!nextTask) break;
        const phaseMeta = getPlanPhaseMeta('review');
        scheduledTasks.push({
          ...nextTask,
          phase: 'review',
          phaseLabel: phaseMeta.label,
          scheduledDate: lastDate,
          scheduledTime: addMinutesToTime(currentPlan.preferredStartTime || '17:00', consumedMinutes),
          scheduledEndTime: addMinutesToTime(
            currentPlan.preferredStartTime || '17:00',
            consumedMinutes + Math.max(nextTask.durationMinutes, 10),
          ),
        });
        consumedMinutes += Math.max(nextTask.durationMinutes, 10);
      }
    }

    return scheduledTasks;
}
