import { loadXlsx, readWorkbookFromBuffer, registerXlsxRuntime, sheetToSafeRows } from '../../../utils/xlsxLoader';
import type { ImportRow, RelationImportRow } from './contracts';
import { parseImportRows, parseRelationRows } from './importRowParsing';

const readImportMatrix = async (file: File): Promise<unknown[][]> => {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await loadXlsx();
        registerXlsxRuntime(XLSX);
        const buffer = await file.arrayBuffer();
        const workbook = await readWorkbookFromBuffer(buffer);
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return [];

        return sheetToSafeRows(workbook.Sheets[firstSheetName], '');
    }

    const raw = await file.text();
    const content = raw.replace(/\r\n/g, '\n').trim();
    if (!content) return [];

    const lines = content.split('\n').filter(Boolean);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    return lines.map((line) => line.split(delimiter));
};

export const parseImportFile = async (file: File): Promise<ImportRow[]> =>
    parseImportRows(await readImportMatrix(file));

export const parseRelationFile = async (file: File): Promise<RelationImportRow[]> =>
    parseRelationRows(await readImportMatrix(file));
