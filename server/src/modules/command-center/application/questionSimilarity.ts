const normalize = (value: string) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const trigrams = (value: string) => {
  const compact = normalize(value).replace(/\s+/g, " ");
  const grams = new Set<string>();
  if (compact.length < 3) return grams;
  for (let index = 0; index <= compact.length - 3; index += 1) {
    grams.add(compact.slice(index, index + 3));
  }
  return grams;
};

export const questionSimilarity = (left: string, right: string) => {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) < 24) return 0;

  const ga = trigrams(a);
  const gb = trigrams(b);
  if (!ga.size || !gb.size) return 0;

  let intersection = 0;
  for (const gram of ga) {
    if (gb.has(gram)) intersection += 1;
  }
  const union = ga.size + gb.size - intersection;
  return union ? intersection / union : 0;
};

export const isConservativeNearDuplicate = (
  left: string,
  right: string,
  threshold = 0.92,
) => questionSimilarity(left, right) >= threshold;
