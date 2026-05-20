const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type Sm2Card = {
  easeFactor: number;
  interval: number;
  repetitions: number;
};

export type Sm2Result = {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
};

export const normalizeQuality = (value: number): 0 | 1 | 2 | 3 | 4 | 5 => {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return 0;
  return Math.min(5, Math.max(0, rounded)) as 0 | 1 | 2 | 3 | 4 | 5;
};

export const addDays = (date: Date, days: number) => {
  const safeDays = Number.isFinite(days) ? Math.max(0, Math.round(days)) : 0;
  return new Date(date.getTime() + safeDays * MS_PER_DAY);
};

export const sm2 = (card: Sm2Card, qualityInput: number): Sm2Result => {
  const quality = normalizeQuality(qualityInput);
  let easeFactor = Number(card?.easeFactor ?? 2.5);
  let interval = Number(card?.interval ?? 1);
  let repetitions = Number(card?.repetitions ?? 0);

  if (!Number.isFinite(easeFactor) || easeFactor <= 0) easeFactor = 2.5;
  if (!Number.isFinite(interval) || interval < 0) interval = 1;
  if (!Number.isFinite(repetitions) || repetitions < 0) repetitions = 0;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
    }
    easeFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    easeFactor = Math.max(1.3, easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  return {
    easeFactor: Number(easeFactor.toFixed(3)),
    interval,
    repetitions,
    nextReviewDate: addDays(new Date(), interval),
  };
};
