/** Local speech preparation only: never evaluates or changes a board expression. */
export function spokenTeachingText(text: string, language: string): string {
  const ar = language.startsWith('ar');
  const word = (arabic: string, english: string) => ar ? arabic : english;
  const fallback = word('راجع الصيغة المعروضة على السبورة.', 'Refer to the expression shown on the board.');
  const commands: Record<string, string> = {
    times: word('في', 'times'), cdot: word('في', 'times'), div: word('مقسوم على', 'divided by'),
    le: word('أصغر من أو يساوي', 'less than or equal to'), leq: word('أصغر من أو يساوي', 'less than or equal to'),
    ge: word('أكبر من أو يساوي', 'greater than or equal to'), geq: word('أكبر من أو يساوي', 'greater than or equal to'),
    neq: word('لا يساوي', 'not equal to'), approx: word('تقريبًا يساوي', 'approximately equals'),
    pm: word('زائد أو ناقص', 'plus or minus'), to: word('ينتج', 'yields'), rightarrow: word('ينتج', 'yields'),
    leftrightarrow: word('في توازن مع', 'is in equilibrium with'),
    pi: word('باي', 'pi'), theta: word('ثيتا', 'theta'), alpha: word('ألفا', 'alpha'),
    beta: word('بيتا', 'beta'), Delta: word('دلتا', 'delta'), delta: word('دلتا', 'delta'),
    mu: word('ميو', 'mu'), nu: word('نيو', 'nu'), omega: word('أوميغا', 'omega'), infty: word('مالانهاية', 'infinity'),
    sin: word('جيب', 'sine'), cos: word('جيب تمام', 'cosine'), tan: word('ظل', 'tangent'),
    log: word('لوغاريتم', 'log'), ln: word('لوغاريتم طبيعي', 'natural log'),
    left: '', right: '', quad: ' ', qquad: ' ', n: ' ',
  };
  function read(source: string, depth = 0): string | null {
    if (depth > 8) return null;
    let i = 0, result = '';
    const group = (): string | null => {
      while (/\s/.test(source[i] || '') && i < source.length) i++;
      if (source[i] !== '{') return null;
      const start = ++i;
      let level = 1;
      while (i < source.length && level) {
        if (source[i] === '{') level++;
        if (source[i] === '}') level--;
        i++;
      }
      return level ? null : read(source.slice(start, i - 1), depth + 1);
    };
    while (i < source.length) {
      const char = source[i++];
      if (char === '\\') {
        const match = source.slice(i).match(/^[A-Za-z]+/);
        if (!match) {
          const escaped = source[i++];
          if (['(', ')', '[', ']', ',', ';', '!', ' ', '\\'].includes(escaped)) { result += ' '; continue; }
          if (escaped === '%') { result += ` ${word('بالمئة', 'percent')} `; continue; }
          return null;
        }
        const name = match[0]; i += name.length;
        if (['frac', 'dfrac', 'tfrac'].includes(name)) {
          const top = group(), bottom = group();
          if (top === null || bottom === null) return null;
          result += ` ${word('كسر بسطه', 'fraction numerator')} ${top} ${word('ومقامه', 'denominator')} ${bottom} ${word('نهاية الكسر', 'end fraction')} `;
        } else if (name === 'sqrt') {
          while (/\s/.test(source[i] || '') && i < source.length) i++;
          let order = '';
          if (source[i] === '[') {
            const end = source.indexOf(']', i + 1);
            if (end === -1) return null;
            const parsed = read(source.slice(i + 1, end), depth + 1);
            if (parsed === null) return null;
            order = parsed; i = end + 1;
          }
          const body = group(); if (body === null) return null;
          result += ` ${order ? `${word('جذر من الرتبة', 'root of order')} ${order}` : word('الجذر التربيعي', 'square root')} ${word('للعدد', 'of')} ${body} ${word('نهاية الجذر', 'end root')} `;
        } else if (['text', 'textbf', 'mathrm', 'operatorname'].includes(name)) {
          const body = group(); if (body === null) return null;
          result += ` ${body} `;
        } else if (Object.prototype.hasOwnProperty.call(commands, name)) result += ` ${commands[name]} `;
        else return null; // Unknown notation must not be spoken as a different mathematical statement.
      } else if (char === '^' || char === '_') {
        while (/\s/.test(source[i] || '') && i < source.length) i++;
        const exponent = source[i] === '{' ? group() : source[i++] ?? null;
        if (exponent === null) return null;
        result += ` ${char === '^' ? word('أس', 'to the power of') : word('مؤشر سفلي', 'subscript')} ${exponent} ${word('نهاية المؤشر', 'end index')} `;
      } else if (char === '{') {
        i--; const body = group(); if (body === null) return null;
        result += ` ${body} `;
      } else if (char === '}') return null;
      else {
        const symbols: Record<string, string> = {
          '=': word('يساوي', 'equals'), '+': word('زائد', 'plus'), '−': word('ناقص', 'minus'),
          '×': word('في', 'times'), '÷': word('مقسوم على', 'divided by'),
          '<': word('أصغر من', 'less than'), '>': word('أكبر من', 'greater than'),
          '≤': word('أصغر من أو يساوي', 'less than or equal to'), '≥': word('أكبر من أو يساوي', 'greater than or equal to'),
          '→': word('ينتج', 'yields'), '↔': word('في توازن مع', 'is in equilibrium with'), '%': word('بالمئة', 'percent'),
        };
        // Preserve ordinary hyphenated words; verbalize minus before a number or in an expression.
        if (char === '-' && (/\d/.test(source[i] || '') || /[\d)}]\s*$/.test(result))) result += ` ${word('ناقص', 'minus')} `;
        else result += symbols[char] ? ` ${symbols[char]} ` : char === '$' ? '' : char;
      }
    }
    return result;
  }
  const prepared = text.slice(0, 4000).replace(/\\n(?![A-Za-z])/g, ' ').replace(/\\\\/g, ' ');
  return (read(prepared) ?? fallback).replace(/\s+/g, ' ').trim();
}
