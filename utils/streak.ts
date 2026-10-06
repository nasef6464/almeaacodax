import { Activity } from '../types';

export const calculateStreak = (recentActivity: Activity[] | undefined): number => {
    if (!recentActivity || recentActivity.length === 0) return 0;
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const activityDates = Array.from(new Set(
        recentActivity.map(a => {
            const d = new Date(a.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })
    )).sort((a, b) => b - a);

    if (activityDates.length === 0) return 0;
    
    let lastDate = currentDate.getTime();
    if (activityDates[0] > lastDate) lastDate = activityDates[0];
    
    for (const date of activityDates) {
        const diffDays = Math.round((lastDate - date) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
            if (diffDays === 1 || streak === 0) streak++;
            lastDate = date;
        } else {
            break;
        }
    }
    return Math.max(streak, 1);
};
