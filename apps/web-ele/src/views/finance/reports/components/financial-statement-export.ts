import { downloadFileFromBlobPart } from '@vben/utils';

import ExcelJS from 'exceljs';

type StatementMeta = {
  companyName?: string;
  fileName: string;
  periodText: string;
  sheetName: string;
  title: string;
};

export type BalanceSheetExportRow = {
  leftBeginning?: number;
  leftEnding?: number;
  leftLabel?: string;
  leftLineNo?: number | string;
  rightBeginning?: number;
  rightEnding?: number;
  rightLabel?: string;
  rightLineNo?: number | string;
};

export type ProfitStatementExportRow = {
  current?: number;
  label?: string;
  lineNo?: number | string;
  year?: number;
};

export type QuarterlyProfitStatementExportRow = {
  label?: string;
  lineNo?: number | string;
  quarterAmounts?: number[];
  year?: number;
};

function amountOrBlank(value: unknown) {
  const amount = Number(value || 0);
  return Math.abs(amount) < 1e-9 ? null : amount;
}

function safeFileName(value: string) {
  return String(value || '')
    .replaceAll(/[\\/:*?"<>|]/g, '')
    .trim();
}

function getMetaAlignment(columnNumber: number, columnCount: number) {
  if (columnNumber === 1) return 'left';
  if (columnNumber === columnCount) return 'right';
  return 'center';
}

function getBalanceAlignment(rowNumber: number, columnNumber: number) {
  if (rowNumber === 3 || [2, 6].includes(columnNumber)) return 'center';
  if ([3, 4, 7, 8].includes(columnNumber)) return 'right';
  return 'left';
}

function getProfitAlignment(rowNumber: number, columnNumber: number) {
  if (rowNumber === 3 || columnNumber === 2) return 'center';
  if (columnNumber === 1) return 'left';
  return 'right';
}

function setThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: { style: 'thin' },
  };
}

function setMetaRow(
  sheet: ExcelJS.Worksheet,
  columnCount: number,
  meta: StatementMeta,
) {
  const row = sheet.addRow([]);
  row.height = 22;
  row.getCell(1).value = `编制单位：${String(meta.companyName || '').trim()}`;
  row.getCell(Math.max(2, Math.floor(columnCount / 2))).value = meta.periodText;
  row.getCell(columnCount).value = '单位：元';
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    cell.font = { name: '宋体', size: 10 };
    cell.alignment = {
      horizontal: getMetaAlignment(columnNumber, columnCount),
      vertical: 'middle',
    };
  });
}

async function downloadStatement(
  workbook: ExcelJS.Workbook,
  meta: StatementMeta,
) {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFileFromBlobPart({
    fileName: `${safeFileName(meta.fileName)}_${safeFileName(meta.periodText)}.xlsx`,
    source: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  });
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lingma ERP';
  workbook.created = new Date();
  return workbook;
}

export async function exportBalanceSheet(
  meta: StatementMeta,
  rows: BalanceSheetExportRow[],
) {
  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet(meta.sheetName);
  sheet.columns = [
    { width: 28 },
    { width: 8 },
    { width: 16 },
    { width: 16 },
    { width: 28 },
    { width: 8 },
    { width: 16 },
    { width: 16 },
  ];

  const titleRow = sheet.addRow([meta.title]);
  titleRow.height = 36;
  sheet.mergeCells('A1:H1');
  titleRow.font = { bold: true, name: '宋体', size: 20 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  setMetaRow(sheet, 8, meta);
  const headerRow = sheet.addRow([
    '资产',
    '行次',
    '期末余额',
    '年初余额',
    '负债和所有者权益',
    '行次',
    '期末余额',
    '年初余额',
  ]);
  headerRow.height = 26;

  rows.forEach((row) => {
    sheet.addRow([
      row.leftLabel || '',
      row.leftLineNo || '',
      amountOrBlank(row.leftEnding),
      amountOrBlank(row.leftBeginning),
      row.rightLabel || '',
      row.rightLineNo || '',
      amountOrBlank(row.rightEnding),
      amountOrBlank(row.rightBeginning),
    ]);
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      setThinBorder(cell);
      cell.font = {
        bold: rowNumber === 3,
        name: '宋体',
        size: 10,
      };
      cell.alignment = {
        horizontal: getBalanceAlignment(rowNumber, columnNumber),
        vertical: 'middle',
      };
      if (rowNumber > 3 && [3, 4, 7, 8].includes(columnNumber)) {
        cell.numFmt = '#,##0.00;-#,##0.00;';
      }
    });
  });
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  await downloadStatement(workbook, meta);
}

export async function exportProfitStatement(
  meta: StatementMeta & {
    currentLabel: string;
    yearLabel: string;
  },
  rows: ProfitStatementExportRow[],
) {
  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet(meta.sheetName);
  sheet.columns = [{ width: 42 }, { width: 10 }, { width: 20 }, { width: 20 }];

  const titleRow = sheet.addRow([meta.title]);
  titleRow.height = 36;
  sheet.mergeCells('A1:D1');
  titleRow.font = { bold: true, name: '宋体', size: 20 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  setMetaRow(sheet, 4, meta);
  const headerRow = sheet.addRow([
    '项目',
    '行次',
    meta.yearLabel,
    meta.currentLabel,
  ]);
  headerRow.height = 26;

  rows.forEach((row) => {
    sheet.addRow([
      row.label || '',
      row.lineNo || '',
      amountOrBlank(row.year),
      amountOrBlank(row.current),
    ]);
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      setThinBorder(cell);
      cell.font = {
        bold: rowNumber === 3,
        name: '宋体',
        size: 10,
      };
      cell.alignment = {
        horizontal: getProfitAlignment(rowNumber, columnNumber),
        vertical: 'middle',
      };
      if (rowNumber > 3 && columnNumber >= 3) {
        cell.numFmt = '#,##0.00;-#,##0.00;';
      }
    });
  });
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  await downloadStatement(workbook, meta);
}

export async function exportQuarterlyProfitStatement(
  meta: StatementMeta & {
    amountLabels: string[];
  },
  rows: QuarterlyProfitStatementExportRow[],
) {
  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet(meta.sheetName);
  const columnCount = 3 + meta.amountLabels.length;
  sheet.columns = [
    { width: 42 },
    { width: 10 },
    { width: 20 },
    ...meta.amountLabels.map(() => ({ width: 18 })),
  ];

  const titleRow = sheet.addRow([meta.title]);
  titleRow.height = 36;
  sheet.mergeCells(1, 1, 1, columnCount);
  titleRow.font = { bold: true, name: '宋体', size: 20 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  setMetaRow(sheet, columnCount, meta);
  const headerRow = sheet.addRow([
    '项目',
    '行次',
    '本年累计金额',
    ...meta.amountLabels,
  ]);
  headerRow.height = 26;

  rows.forEach((row) => {
    sheet.addRow([
      row.label || '',
      row.lineNo || '',
      amountOrBlank(row.year),
      ...(row.quarterAmounts || []).map((amount) => amountOrBlank(amount)),
    ]);
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      setThinBorder(cell);
      cell.font = {
        bold: rowNumber === 3,
        name: '宋体',
        size: 10,
      };
      cell.alignment = {
        horizontal: getProfitAlignment(rowNumber, columnNumber),
        vertical: 'middle',
      };
      if (rowNumber > 3 && columnNumber >= 3) {
        cell.numFmt = '#,##0.00;-#,##0.00;';
      }
    });
  });
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  await downloadStatement(workbook, meta);
}
