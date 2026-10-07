import type { QuizResult } from '../../types';
import { getReportSkillKey } from './reportDomain';

export interface RecordedSkillAttemptChange {
    previousMastery: number;
    latestMastery: number;
    delta: number;
}

/**
 * Compare only two different saved attempts of the same canonical
 * skill AND subject/path. Missing taxonomy or invalid timestamps are ignored.
 * This does not replace the canonical SkillProgress mastery percentage.
 */
export const buildRecordedSkillAttemptChanges = (
    results: Pick<QuizResult, 'date' | 'skillsAnalysis'>[],
): Map<string, RecordedSkillAttemptChange> => {
    const attemptSeries = new Map<string, number[]>();
    const ordered = [...results]
        .filter((result) => result.date && Number.isFinite(new Date(result.date).getTime()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const result of ordered) {
        // Collapse repeated references to a skill inside the same attempt.
        const withinAttempt = new Map<string, number[]>();
        for (const item of result.skillsAnalysis || []) {
            if (!item.skillId || !item.pathId || !item.subjectId) continue;
            const mastery = Number(item.mastery);
            if (!Number.isFinite(mastery) || mastery < 0 || mastery > 100) continue;
            const key = getReportSkillKey({
                skill: item.skill,
                skillId: item.skillId,
                pathId: item.pathId,
                subjectId: item.subjectId,
            });
            const observations = withinAttempt.get(key) || [];
            observations.push(mastery);
            withinAttempt.set(key, observations);
        }
        withinAttempt.forEach((observations, key) => {
            const value = Math.round(observations.reduce((sum, point) => sum + point, 0) / observations.length);
            const series = attemptSeries.get(key) || [];
            series.push(value);
            attemptSeries.set(key, series);
        });
    }

    const changes = new Map<string, RecordedSkillAttemptChange>();
    attemptSeries.forEach((series, key) => {
        if (series.length < 2) return;
        const previousMastery = series[series.length - 2];
        const latestMastery = series[series.length - 1];
        changes.set(key, {
            previousMastery,
            latestMastery,
            delta: latestMastery - previousMastery,
        });
    });
    return changes;
};
