import ExcelJS from 'exceljs';

export type DimensionProfitExportCell = {
  currentAmount: number;
  yearAmount: number;
};

export type DimensionProfitExportColumn = {
  id: string;
  name: string;
};

export type DimensionProfitExportRow = {
  isStrong?: boolean;
  isTitle?: boolean;
  label: string;
  lineNo: number | string;
  values: Record<string, DimensionProfitExportCell>;
};

export type DimensionProfitExportOptions = {
  companyName?: string;
  currentLabel: string;
  dimensionColumns: DimensionProfitExportColumn[];
  fileNamePrefix: string;
  periodText: string;
  rows: DimensionProfitExportRow[];
  sheetName: string;
  title: string;
  totalColumnId: string;
  yearLabel?: string;
};

function safeFileNamePart(value: string, fallback: string) {
  return (
    String(value || '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '')
      .slice(0, 80) || fallback
  );
}

function formatExportDateText() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function amountOrBlank(value: any) {
  const num = Number(value || 0);
  return Math.abs(num) < 1e-9 ? null : num;
}

function downloadWorkbook(buffer: any, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportDimensionProfitStatement(options: DimensionProfitExportOptions) {
  const yearLabel = options.yearLabel || '本年累计金额';
  const companyName = String(options.companyName || '').trim();
  const dimensions = [
    ...options.dimensionColumns,
    { id: options.totalColumnId, name: '合计' },
  ];
  const columnCount = 2 + dimensions.length * 2;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lingma ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName || options.title);
  sheet.properties.defaultRowHeight = 22;
  sheet.columns = [
    { width: 34 },
    { width: 8 },
    ...dimensions.flatMap(() => [{ width: 15 }, { width: 15 }]),
  ];

  const lastColumnLetter = sheet.getColumn(columnCount).letter;
  const titleRow = sheet.addRow([options.title]);
  titleRow.height = 38;

  const metaRow = sheet.addRow([]);
  metaRow.height = 22;
  metaRow.getCell(1).value = companyName ? `编制单位：${companyName}` : '编制单位：';
  const periodCellIndex = Math.max(3, Math.floor(columnCount / 2));
  metaRow.getCell(periodCellIndex).value = options.periodText;
  metaRow.getCell(columnCount).value = '单位：元';

  const dimensionHeaderRow = sheet.addRow(['项目', '行次']);
  dimensionHeaderRow.height = 24;
  const amountHeaderRow = sheet.addRow(['项目', '行次']);
  amountHeaderRow.height = 24;

  dimensions.forEach((dimension, index) => {
    const startCol = 3 + index * 2;
    dimensionHeaderRow.getCell(startCol).value = dimension.name;
    dimensionHeaderRow.getCell(startCol + 1).value = dimension.name;
    amountHeaderRow.getCell(startCol).value = options.currentLabel;
    amountHeaderRow.getCell(startCol + 1).value = yearLabel;
  });

  options.rows.forEach((row) => {
    const dataRow = sheet.addRow([
      row.label,
      row.lineNo,
      ...dimensions.flatMap((dimension) => {
        const cell = row.values?.[dimension.id] || { currentAmount: 0, yearAmount: 0 };
        return [amountOrBlank(cell.currentAmount), amountOrBlank(cell.yearAmount)];
      }),
    ]);
    dataRow.height = 22;
    if (row.isTitle || row.isStrong) {
      dataRow.font = { bold: true, name: '宋体', size: 10 };
    }
  });

  sheet.mergeCells(`A1:${lastColumnLetter}1`);
  sheet.mergeCells('A3:A4');
  sheet.mergeCells('B3:B4');
  dimensions.forEach((_dimension, index) => {
    const startCol = 3 + index * 2;
    sheet.mergeCells(3, startCol, 3, startCol + 1);
  });

  sheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        top: { style: 'thin' },
      };
      cell.font = {
        ...(cell.font || {}),
        name: '宋体',
        size: rowNumber === 1 ? 20 : 10,
      };
      const columnNumber = Number(cell.col);
      cell.alignment = {
        horizontal: rowNumber <= 4 ? 'center' : columnNumber >= 3 ? 'right' : columnNumber === 2 ? 'center' : 'left',
        vertical: 'middle',
      };
      if (rowNumber >= 5 && columnNumber >= 3) {
        cell.numFmt = '#,##0.00;-#,##0.00;';
      }
    });
  });

  sheet.getRow(1).font = { bold: true, name: '宋体', size: 20 };
  sheet.getRow(2).font = { name: '宋体', size: 10 };
  sheet.getRow(3).font = { bold: true, name: '宋体', size: 10 };
  sheet.getRow(4).font = { bold: true, name: '宋体', size: 10 };
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${safeFileNamePart(options.fileNamePrefix, options.title)}_${safeFileNamePart(options.periodText, '期间')}_${safeFileNamePart(companyName || '当前账套', '当前账套')}_${formatExportDateText()}.xlsx`;
  downloadWorkbook(buffer, fileName);
}
