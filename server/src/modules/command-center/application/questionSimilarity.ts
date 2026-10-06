const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const ARABIC_FORMS = /[إأآٱ]/g;
const NON_WORD = /[^\p{L}\p{N}%+\-*/=<>.]+/gu;

export const normalizeQuestionForSimilarity = (value: string) =>
  String(value || "")
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_FORMS, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(NON_WORD, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const tokensFor = (value: string) =>
  normalizeQuestionForSimilarity(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 || /^\d+$/.test(token));

const charTrigrams = (value: string) => {
  const normalized = normalizeQuestionForSimilarity(value).replace(/\s+/g, " ");
  const grams = new Set<string>();
  if (normalized.length < 3) {
    if (normalized) grams.add(normalized);
    return grams;
  }
  for (let index = 0; index <= normalized.length - 3; index += 1) {
    grams.add(normalized.slice(index, index + 3));
  }
  return grams;
};

const overlapRatio = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const item of small) if (large.has(item)) intersection += 1;
  return intersection / Math.min(left.size, right.size);
};

const jaccard = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
};

const dice = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return (2 * intersection) / (left.size + right.size);
};

export type QuestionSimilarityScore = {
  score: number;
  tokenJaccard: number;
  tokenContainment: number;
  trigramDice: number;
};

export const scoreQuestionSimilarity = (
  leftText: string,
  rightText: string,
): QuestionSimilarityScore => {
  const leftTokens = new Set(tokensFor(leftText));
  const rightTokens = new Set(tokensFor(rightText));
  const tokenJaccard = jaccard(leftTokens, rightTokens);
  const tokenContainment = overlapRatio(leftTokens, rightTokens);
  const trigramDice = dice(charTrigrams(leftText), charTrigrams(rightText));

  // Character structure protects equations/numbers while token metrics catch
  // Arabic wording changes. This is intentionally deterministic and cheap;
  // it is a candidate gate, not a claim of vector/LLM semantic equivalence.
  const score = Math.max(
    trigramDice * 0.58 + tokenJaccard * 0.42,
    tokenContainment * 0.55 + trigramDice * 0.45,
  );

  return {
    score: Number(score.toFixed(4)),
    tokenJaccard: Number(tokenJaccard.toFixed(4)),
    tokenContainment: Number(tokenContainment.toFixed(4)),
    trigramDice: Number(trigramDice.toFixed(4)),
  };
};

export const buildQuestionTokenIndex = <T extends { text?: unknown }>(items: T[]) => {
  const index = new Map<string, Set<number>>();
  items.forEach((item, itemIndex) => {
    for (const token of new Set(tokensFor(String(item.text || "")))) {
      const bucket = index.get(token) || new Set<number>();
      bucket.add(itemIndex);
      index.set(token, bucket);
    }
  });
  return index;
};

export const candidateIndexesForQuestion = (
  text: string,
  tokenIndex: Map<string, Set<number>>,
  maxCandidates = 120,
) => {
  const counts = new Map<number, number>();
  for (const token of new Set(tokensFor(text))) {
    for (const index of tokenIndex.get(token) || []) {
      counts.set(index, (counts.get(index) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCandidates)
    .map(([index]) => index);
};
