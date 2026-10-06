export type XlsxModule = typeof import('@e965/xlsx');

export const loadXlsx = async (): Promise<XlsxModule> => import('@e965/xlsx');

export const MAX_XLSX_IMPORT_BYTES = 5 * 1024 * 1024;

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const sanitizeSpreadsheetValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSpreadsheetValue(item));
  }

  if (value && typeof value === 'object') {
    const safeRecord: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (UNSAFE_KEYS.has(key)) return;
      safeRecord[key] = sanitizeSpreadsheetValue(entryValue);
    });
    return safeRecord;
  }

  return value;
};

export const readWorkbookFromBuffer = async (buffer: ArrayBuffer) => {
  if (buffer.byteLength > MAX_XLSX_IMPORT_BYTES) {
    throw new Error('ملف Excel كبير جدًا. الحد الأقصى 5 ميجابايت.');
  }

  const XLSX = await loadXlsx();
  return XLSX.read(buffer, {
    type: 'array',
    cellFormula: false,
    bookVBA: false,
    dense: true,
  });
};

export const sheetToSafeObjects = <TRow extends Record<string, unknown>>(
  worksheet: unknown,
  defval = '',
) => {
  const rows = (requireSheetUtils() as XlsxModule).utils.sheet_to_json<TRow>(worksheet as any, {
    defval,
    raw: false,
    blankrows: false,
  });

  return sanitizeSpreadsheetValue(rows) as TRow[];
};

export const sheetToSafeRows = (worksheet: unknown, defval = '') => {
  const rows = (requireSheetUtils() as XlsxModule).utils.sheet_to_json(worksheet as any, {
    header: 1,
    defval,
    raw: false,
    blankrows: false,
  });

  return sanitizeSpreadsheetValue(rows) as unknown[][];
};

let cachedXlsx: XlsxModule | null = null;

export const registerXlsxRuntime = (xlsx: XlsxModule) => {
  cachedXlsx = xlsx;
};

const requireSheetUtils = () => {
  if (!cachedXlsx) {
    throw new Error('XLSX runtime is not registered. Call registerXlsxRuntime first.');
  }
  return cachedXlsx;
};
