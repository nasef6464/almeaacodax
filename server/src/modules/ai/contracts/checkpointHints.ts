/** Fixed procedural coaching: no generated answer, value, option or formula is echoed. */
export function checkpointHints(prompt: string, language: string): [string, string] {
  const ar = language.startsWith('ar');
  if (/آحاد|احاد|units? digits?|last digits?/i.test(prompt)) return ar
    ? ['حدد الأعداد المطلوبة أولًا.', 'انظر إلى آخر رقم في كل عدد.']
    : ['Identify the numbers requested.', 'Look at the last digit of each number.'];
  if (/أسس|الأس|قوة|قوى|power|exponent/i.test(prompt)) return ar
    ? ['فكر في الضرب المتكرر.', 'عد مرات ضرب الأساس في نفسه.']
    : ['Think about repeated multiplication.', 'Count how often the base is multiplied by itself.'];
  if (/قانون|معادلة|علاقة|formula|equation|relationship/i.test(prompt)) return ar
    ? ['حدد الكميات المعطاة والمطلوبة.', 'راجع العلاقة التي تربط هذه الكميات.']
    : ['Identify the given and required quantities.', 'Review the relationship connecting those quantities.'];
  if (/عملية|ضرب|قسمة|جمع|طرح|\b(?:operation|multiply|multiplication|divide|division|add|addition|subtract|subtraction)\b/i.test(prompt)) return ar
    ? ['ارجع إلى المطلوب في السؤال.', 'اختر العملية المناسبة قبل الحساب.']
    : ['Review what the question asks.', 'Choose the appropriate operation before calculating.'];
  return ar ? ['اقرأ سؤال الخطوة مرة أخرى.', 'ابدأ بالمعطيات المرتبطة بهذه الخطوة.']
    : ['Read the step question again.', 'Start with the information relevant to this step.'];
}
