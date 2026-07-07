import ExcelJS from 'exceljs';

export interface ImportTemplateColumnOption {
  /** Excel 表头 */
  header: string;
  /** 字段 key，仅用于示例数据映射 */
  key: string;
  /** 列宽 */
  width?: number;
  /** Excel 批注 */
  note?: string;
  /** 下拉选项 */
  dropdown?: string[];
  /** 是否必填，仅用于表头批注提示 */
  required?: boolean;
  /** 单元格格式，例如 yyyy-mm-dd */
  numFmt?: string;
  /** 对齐方式，默认居中；remark 这类长文本可传 left */
  align?: 'center' | 'left' | 'right';
}

export interface ExportImportTemplateOption {
  /** 工作表名 */
  sheetName?: string;
  /** 下载文件名 */
  fileName?: string;
  /** 表头配置 */
  columns: ImportTemplateColumnOption[];
  /** 示例数据 */
  sampleRow?: Record<string, any>;
  /** 生成多少行模板边框 / 校验区域，默认 200 */
  maxRows?: number;
}

const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function createDictionarySheet(
  workbook: ExcelJS.Workbook,
  columns: ImportTemplateColumnOption[],
) {
  const columnsWithDropdown = columns.filter(
    (column) => Array.isArray(column.dropdown) && column.dropdown.length > 0,
  );

  if (columnsWithDropdown.length === 0) {
    return null;
  }

  const dictSheet = workbook.addWorksheet('_dict');
  dictSheet.state = 'veryHidden';

  columnsWithDropdown.forEach((column, columnIndex) => {
    const excelColumn = dictSheet.getColumn(columnIndex + 1);
    const values = column.dropdown || [];
    values.forEach((value, rowIndex) => {
      excelColumn.getCell(rowIndex + 1).value = value;
    });
  });

  return {
    dictSheet,
    columnsWithDropdown,
  };
}

function applyHeaderStyle(sheet: ExcelJS.Worksheet, columns: ImportTemplateColumnOption[]) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;

  headerRow.eachCell((cell, columnNumber) => {
    const column = columns[columnNumber - 1];
    const noteParts: string[] = [];

    if (column?.required) {
      noteParts.push('必填');
    }
    if (column?.note) {
      noteParts.push(column.note);
    }

    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9EAF7' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    if (noteParts.length > 0) {
      cell.note = noteParts.join('；');
    }
  });
}

function applyBodyStyle(
  sheet: ExcelJS.Worksheet,
  columns: ImportTemplateColumnOption[],
  maxRows: number,
) {
  for (let rowIndex = 2; rowIndex <= maxRows; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: column.align || 'center',
      };
      if (column.numFmt) {
        cell.numFmt = column.numFmt;
      }
    });
  }
}

function applyDropdownValidation(
  sheet: ExcelJS.Worksheet,
  columns: ImportTemplateColumnOption[],
  maxRows: number,
) {
  const columnsWithDropdown = columns.filter(
    (column) => Array.isArray(column.dropdown) && column.dropdown.length > 0,
  );

  columnsWithDropdown.forEach((column) => {
    const columnIndex = columns.findIndex((item) => item.key === column.key);
    if (columnIndex < 0) {
      return;
    }

    const dictColumnIndex = columnsWithDropdown.findIndex(
      (item) => item.key === column.key,
    );
    const dictColumnLetter = String.fromCharCode(65 + dictColumnIndex);
    const dropdownCount = column.dropdown?.length || 0;

    for (let rowIndex = 2; rowIndex <= maxRows; rowIndex += 1) {
      sheet.getCell(rowIndex, columnIndex + 1).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`_dict!$${dictColumnLetter}$1:$${dictColumnLetter}$${dropdownCount}`],
        showErrorMessage: true,
        errorTitle: '输入错误',
        error: '请选择下拉项',
      };
    }
  });
}

export async function exportImportTemplate(option: ExportImportTemplateOption) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(option.sheetName || '导入模板');
  const maxRows = option.maxRows || 200;

  createDictionarySheet(workbook, option.columns);

  sheet.columns = option.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 18,
  }));

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  applyHeaderStyle(sheet, option.columns);

  if (option.sampleRow) {
    sheet.addRow(option.sampleRow);
  }

  applyBodyStyle(sheet, option.columns, maxRows);
  applyDropdownValidation(sheet, option.columns, maxRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = option.fileName || '导入模板.xlsx';
  link.click();

  URL.revokeObjectURL(url);
}

export async function exportUserImportTemplateDemo() {
  return exportImportTemplate({
    sheetName: '用户导入模板',
    fileName: '用户导入模板.xlsx',
    maxRows: 200,
    columns: [
      { header: '姓名', key: 'name', width: 20, required: true, note: '请填写真实姓名' },
      { header: '手机号', key: 'phone', width: 18, required: true, note: '建议先设置为文本格式' },
      { header: '性别', key: 'gender', width: 12, dropdown: ['男', '女'] },
      { header: '状态', key: 'status', width: 12, dropdown: ['在职', '离职'] },
      { header: '入职日期', key: 'entryDate', width: 16, numFmt: 'yyyy-mm-dd', note: '格式：yyyy-mm-dd' },
      { header: '备注', key: 'remark', width: 30, align: 'left' },
    ],
    sampleRow: {
      name: '张三',
      phone: '13800000000',
      gender: '男',
      status: '在职',
      entryDate: '2026-04-07',
      remark: '示例数据，可删除',
    },
  });
}
