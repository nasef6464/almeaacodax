import { loadXlsx } from '../../../utils/xlsxLoader';

/**
 * Export/print infrastructure for the SchoolsManager feature.
 *
 * These helpers intentionally keep the existing browser download and print
 * behaviour unchanged while removing non-UI responsibilities from the large
 * manager component.
 */
export const createCsvDownload = (fileName: string, rows: string[][]) => {
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const createXlsxDownload = async (fileName: string, rows: string[][]) => {
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'students');
    XLSX.writeFile(workbook, fileName);
};

export const createWorkbookDownload = async (
    fileName: string,
    sheets: Array<{ name: string; rows: Array<Array<string | number>> }>,
) => {
    const XLSX = await loadXlsx();
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    });
    XLSX.writeFile(workbook, fileName);
};

export const escapeHtml = (value: string | number | null | undefined) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export const renderPrintTable = (headers: string[], rows: Array<Array<string | number>>) => `
    <table>
        <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${
                rows.length
                    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
                    : `<tr><td colspan="${headers.length}">لا توجد بيانات مسجلة حاليا.</td></tr>`
            }
        </tbody>
    </table>
`;

export const openPrintWindow = (title: string, bodyHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;

    printWindow.document.write(`
        <!doctype html>
        <html lang="ar" dir="rtl">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(title)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        background: #f8fafc;
                        color: #111827;
                        font-family: Tahoma, Arial, sans-serif;
                        line-height: 1.8;
                    }
                    main {
                        width: min(1040px, calc(100% - 32px));
                        margin: 24px auto;
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 18px;
                        padding: 28px;
                    }
                    .hero {
                        border-radius: 16px;
                        padding: 22px;
                        background: linear-gradient(135deg, #4f46e5, #0f766e);
                        color: white;
                        margin-bottom: 20px;
                    }
                    .hero p, .hero h1 { margin: 0; }
                    .hero h1 { font-size: 28px; margin-top: 6px; }
                    .muted { color: #64748b; font-size: 13px; }
                    .hero .muted { color: #e0f2fe; }
                    .metrics {
                        display: grid;
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                        gap: 12px;
                        margin: 18px 0;
                    }
                    .metric {
                        border: 1px solid #e5e7eb;
                        border-radius: 14px;
                        padding: 14px;
                        background: #f9fafb;
                    }
                    .metric strong {
                        display: block;
                        font-size: 24px;
                        margin-top: 4px;
                    }
                    h2 {
                        font-size: 18px;
                        margin: 24px 0 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 14px;
                        overflow: hidden;
                        border-radius: 12px;
                    }
                    th, td {
                        border: 1px solid #e5e7eb;
                        padding: 10px 12px;
                        text-align: right;
                        vertical-align: top;
                        font-size: 13px;
                    }
                    th {
                        background: #f3f4f6;
                        font-weight: 800;
                    }
                    .notice {
                        margin-top: 20px;
                        padding: 12px 14px;
                        border-radius: 12px;
                        background: #fff7ed;
                        color: #9a3412;
                        border: 1px solid #fed7aa;
                        font-size: 13px;
                        font-weight: 700;
                    }
                    @media print {
                        body { background: white; }
                        main { width: 100%; margin: 0; border: 0; border-radius: 0; }
                        .no-print { display: none; }
                    }
                    @media (max-width: 760px) {
                        .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    }
                </style>
            </head>
            <body>
                <main>
                    ${bodyHtml}
                    <div class="notice">هذا التقرير للاستخدام التشغيلي الداخلي، ويعكس البيانات المتاحة وقت الطباعة.</div>
                </main>
                <script>
                    window.setTimeout(function () {
                        window.focus();
                        window.print();
                    }, 250);
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
    return true;
};
