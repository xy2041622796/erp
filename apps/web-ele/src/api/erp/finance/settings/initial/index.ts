import { downloadFileFromBlobPart, generateUUID } from '@vben/utils';

import ExcelJS from 'exceljs';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId, getStoredAccountSetName } from '#/utils/accountSet';
import { createFinanceDataTable } from '../../common/account-set-scope';

// Bil_Subject_Opening
const SUBJECT_OPENING_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_OPENING_TABLE = 'Bil_Subject_Opening';
const SUBJECT_OPENING_DB = 'LMBill';
const SUBJECT_OPENING_PK = 'rowid';

export const SUBJECT_OPENING_TEMPLATE_FIELDS = [
  { key: 'subject_code', title: '科目编码', required: true },
  { key: 'subject_name', title: '科目名称', required: true },
  { key: 'subject_type_label', title: '类别', required: true },
  { key: 'balance_direction_label', title: '余额方向', required: true },
  { key: 'beginning_balance', title: '期初余额', required: false },
  { key: 'debit_balance_sum', title: '借方累计', required: false },
  { key: 'cebit_balance_sum', title: '贷方累计', required: false },
  { key: 'year_beginning_balance', title: '年初余额', required: false },
  { key: 'auxiliary_accounting_label', title: '辅助核算', required: false },
] as const;

export namespace BilSubjectOpeningApi {
  export interface SubjectOpening {
    rowid?: string;
    createuser?: string;
    createtime?: Date | number | string;
    updateuser?: string;
    updatetime?: Date | number | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    year_beginning_balance?: number;
    cebit_balance_sum?: number; // 贷方累计
    debit_balance_sum?: number; // 借方累计
    subject_type?: number | string;
    is_leaf_subject?: number;
    beginning_balance?: number;
    subject_name?: string;
    subject_code?: string;
    parent_subject_number?: string;
    account_id?: string;
    account_set_id?: string;
    balance_direction?: number | string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function createSubjectOpeningTable() {
  return createFinanceDataTable(
    SUBJECT_OPENING_MODEL_ID,
    SUBJECT_OPENING_TABLE,
    SUBJECT_OPENING_DB,
    SUBJECT_OPENING_PK,
  );
}

function resolveAccountSetId(accountSetId?: string) {
  return String(accountSetId || getStoredAccountSetId() || '').trim();
}

export async function getSubjectOpeningList(params: {
  account_id?: string;
  account_set_id?: string;
  keyword?: string;
  lingma_sys_is_delete?: number;
  pageNo?: number;
  page?: number;
  subject_type?: number | string;
}) {
  const table = createSubjectOpeningTable();

  const filterConds: any[] = [];
  const accountId = String(params?.account_id || '').trim();
  const accountSetId = resolveAccountSetId(params?.account_set_id);

  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  } else {
    filterConds.push(cond('lingma_sys_is_delete', 'equal', params.lingma_sys_is_delete));
  }

  if (accountId) {
    filterConds.push(cond('account_id', 'equal', accountId));
  }

  if (accountSetId) {
    filterConds.push(cond('account_set_id', 'equal', accountSetId));
  }

  if (params?.subject_type !== undefined && params?.subject_type !== null) {
    filterConds.push(cond('subject_type', 'equal', params.subject_type));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('subject_code', 'contains', params.keyword),
        cond('subject_name', 'contains', params.keyword),
      ),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  if (!table.Fields || table.Fields.length === 0) {
    table.Fields = [];
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);

  return {
    dataTable: table,
    list: items,
    total,
  };
}

export async function getSubjectOpening(id: string) {
  const table = createSubjectOpeningTable();
  table.Filter = cond(SUBJECT_OPENING_PK, 'equal', id);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function createSubjectOpening(
  data: BilSubjectOpeningApi.SubjectOpening,
) {
  const table = createSubjectOpeningTable();

  const payload: any = {
    ...data,
    rowid: data.rowid || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    account_set_id: data?.account_set_id || resolveAccountSetId(data?.account_set_id),
  };

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateSubjectOpening(
  data: BilSubjectOpeningApi.SubjectOpening,
) {
  if (!data.rowid) throw new Error('缺少 rowid');
  const table = createSubjectOpeningTable();

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    account_set_id: data?.account_set_id || resolveAccountSetId(data?.account_set_id),
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function saveSubjectOpeningList(
  items: BilSubjectOpeningApi.SubjectOpening[],
) {
  const table = createSubjectOpeningTable();

  const changed = (items || []).map((item) => ({
    ...item,
    rowid: item.rowid || generateUUID(),
    lingma_sys_is_delete: item?.lingma_sys_is_delete ?? 0,
    account_set_id: item?.account_set_id || resolveAccountSetId(item?.account_set_id),
  }));

  const saveParam = table.getSaveParam([], changed, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteSubjectOpening(id: string) {
  return await updateSubjectOpening({ rowid: id, lingma_sys_is_delete: 1 });
}



// Bil_Subject_Info，仅用于读取当前账套科目，不在期初导入中新增或修改科目
const SUBJECT_INFO_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_INFO_TABLE = 'Bil_Subject_Info';
const SUBJECT_INFO_DB = 'LMBill';
const SUBJECT_INFO_PK = 'rowid';

const SUBJECT_OPENING_EXCEL_FIELDS = [
  { key: 'subject_code', title: '科目编码', width: 22 },
  { key: 'subject_name', title: '科目名称', width: 32 },
  { key: 'subject_type_label', title: '类别', width: 16 },
  { key: 'balance_direction_label', title: '余额方向', width: 12 },
  { key: 'beginning_balance', title: '期初余额', width: 16 },
  { key: 'debit_balance_sum', title: '借方累计', width: 16 },
  { key: 'cebit_balance_sum', title: '贷方累计', width: 16 },
  { key: 'year_beginning_balance', title: '年初余额', width: 16 },
  { key: 'auxiliary_accounting_label', title: '辅助核算', width: 20 },
] as const;

const SUBJECT_AUXILIARY_OPTIONS = [
  { label: '往来单位', value: 'partner' },
  { label: '项目', value: 'project' },
  { label: '部门', value: 'department' },
  { label: '职员', value: 'staff' },
  { label: '产品', value: 'product' },
];

const AMOUNT_FIELD_TITLES = [
  { key: 'beginning_balance', title: '期初余额' },
  { key: 'debit_balance_sum', title: '借方累计' },
  { key: 'cebit_balance_sum', title: '贷方累计' },
  { key: 'year_beginning_balance', title: '年初余额' },
] as const;

function createSubjectInfoTable() {
  return createFinanceDataTable(
    SUBJECT_INFO_MODEL_ID,
    SUBJECT_INFO_TABLE,
    SUBJECT_INFO_DB,
    SUBJECT_INFO_PK,
  );
}

function normalizeSubjectCode(value: unknown) {
  return String(value ?? '').trim().replace(/^\s+|\s+$/g, '');
}

function normalizeImportText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeCompareAmount(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function parseImportAmount(value: unknown, rowNumber: number, title: string) {
  if (value === undefined || value === null || value === '') return 0;
  const text = String(value).replace(/,/g, '').trim();
  if (!text) return 0;
  const num = Number(text);
  if (!Number.isFinite(num)) {
    throw new Error('第 ' + rowNumber + ' 行' + title + '不是有效数字');
  }
  return num;
}

function getCellText(row: ExcelJS.Row, index: number) {
  const value = row.getCell(index).value as any;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item: any) => item.text || '').join('').trim();
    }
  }
  return String(value).trim();
}

function buildOpeningMap(openings: any[]) {
  const map = new Map<string, any>();
  for (const item of openings || []) {
    const code = normalizeSubjectCode(item?.subject_code || item?.subject_number);
    if (code) map.set(code, item);
  }
  return map;
}

function buildSubjectMap(subjects: any[]) {
  const map = new Map<string, any>();
  for (const item of subjects || []) {
    const code = normalizeSubjectCode(item?.subject_number || item?.subject_code);
    if (code) map.set(code, item);
  }
  return map;
}

function sortBySubjectCode<T extends Record<string, any>>(rows: T[]) {
  return [...rows].sort((a, b) =>
    normalizeSubjectCode(a?.subject_number || a?.subject_code).localeCompare(
      normalizeSubjectCode(b?.subject_number || b?.subject_code),
      'zh-Hans-CN-u-kn-true',
      { numeric: true, sensitivity: 'base' },
    ),
  );
}

function subjectTypeLabel(value: unknown) {
  const map: Record<string, string> = {
    '1': '资产类',
    '2': '负债类',
    '3': '权益类',
    '4': '成本类',
    '5': '损益类',
  };
  return map[String(value ?? '').trim()] || String(value ?? '').trim();
}

function subjectTypeValue(value: unknown) {
  const text = String(value ?? '').trim();
  const map: Record<string, string> = {
    资产类: '1',
    资产: '1',
    负债类: '2',
    负债: '2',
    权益类: '3',
    权益: '3',
    所有者权益类: '3',
    成本类: '4',
    成本: '4',
    损益类: '5',
    损益: '5',
  };
  return map[text] || text;
}

function balanceDirectionText(value: unknown) {
  const text = String(value ?? '').trim();
  if (text === '1' || text === '借' || text === '借方' || text.toLowerCase() === 'debit') return '借';
  if (text === '2' || text === '贷' || text === '贷方' || text.toLowerCase() === 'credit') return '贷';
  return text;
}

function balanceDirectionValue(value: unknown) {
  const text = String(value ?? '').trim();
  if (text === '借' || text === '借方' || text === '1' || text.toLowerCase() === 'debit') return '1';
  if (text === '贷' || text === '贷方' || text === '2' || text.toLowerCase() === 'credit') return '2';
  return text;
}

function splitAuxiliaryItems(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  return String(value ?? '')
    .split(/[,，、;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function auxiliaryAccountingText(value: unknown) {
  return splitAuxiliaryItems(value)
    .map((item) => {
      const matched = SUBJECT_AUXILIARY_OPTIONS.find(
        (option) => String(option.value).toLowerCase() === String(item).toLowerCase(),
      );
      return matched?.label || item;
    })
    .filter(Boolean)
    .join('、');
}

function auxiliaryAccountingValue(value: unknown) {
  return splitAuxiliaryItems(value)
    .map((item) => {
      const text = String(item).trim();
      const matched = SUBJECT_AUXILIARY_OPTIONS.find(
        (option) => option.label === text || String(option.value).toLowerCase() === text.toLowerCase(),
      );
      return matched?.value || text;
    })
    .filter(Boolean)
    .join(',');
}

function sanitizeFileNamePart(value: unknown) {
  const text = String(value ?? '').trim() || '当前账套';
  return text.replace(/[\/:*?"<>|]/g, '_');
}

export function getSubjectOpeningExportFileName() {
  const accountSetName = sanitizeFileNamePart(getStoredAccountSetName());
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return '科目期初_' + accountSetName + '_' + yyyy + mm + dd + '.xlsx';
}

function hasOpeningAmountDiff(current: any, next: Record<string, any>) {
  return AMOUNT_FIELD_TITLES.some((field) => normalizeCompareAmount(current?.[field.key]) !== normalizeCompareAmount(next?.[field.key]));
}

async function getCurrentAccountSubjects(accountSetId: string) {
  const table = createSubjectInfoTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_id', 'equal', accountSetId),
  );
  table.Fields = [];
  const resQuery = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return sortBySubjectCode(items || []);
}

async function getCurrentAccountOpenings(accountSetId: string) {
  const table = createSubjectOpeningTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_set_id', 'equal', accountSetId),
  );
  table.Fields = [];
  const resQuery = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  return items || [];
}

function mergeOpeningExportRows(subjects: any[], openings: any[]) {
  const openingMap = buildOpeningMap(openings);
  return sortBySubjectCode(subjects || []).map((subject) => {
    const code = normalizeSubjectCode(subject?.subject_number || subject?.subject_code);
    const opening = openingMap.get(code) || {};
    return {
      subject_code: code,
      subject_name: subject?.subject_name || '',
      subject_type_label: subjectTypeLabel(subject?.subject_type),
      balance_direction_label: balanceDirectionText(subject?.balance_direction),
      beginning_balance: normalizeCompareAmount(opening?.beginning_balance),
      debit_balance_sum: normalizeCompareAmount(opening?.debit_balance_sum),
      cebit_balance_sum: normalizeCompareAmount(opening?.cebit_balance_sum),
      year_beginning_balance: normalizeCompareAmount(opening?.year_beginning_balance),
      auxiliary_accounting_label: auxiliaryAccountingText(subject?.auxiliary_accounting),
    };
  });
}

function writeOpeningSheet(workbook: ExcelJS.Workbook, rows: any[]) {
  const sheet = workbook.addWorksheet('期初');
  sheet.addRow(SUBJECT_OPENING_EXCEL_FIELDS.map((field) => field.title));
  for (const row of rows) {
    sheet.addRow(SUBJECT_OPENING_EXCEL_FIELDS.map((field) => row[field.key] ?? ''));
  }
  sheet.columns = SUBJECT_OPENING_EXCEL_FIELDS.map((field) => ({ key: field.key, width: field.width }));
  const usedRange = sheet.getRows(1, Math.max(rows.length + 1, 1));
  usedRange?.forEach((row) => {
    row.height = 20;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: row.number === 1 ? 'center' : colNumber >= 5 && colNumber <= 8 ? 'right' : 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (row.number > 1 && colNumber >= 5 && colNumber <= 8) cell.numFmt = '#,##0.00';
    });
  });
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

async function workbookToBlob(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function buildSubjectOpeningWorkbook(accountSetId?: string) {
  const resolvedAccountSetId = resolveAccountSetId(accountSetId);
  if (!resolvedAccountSetId) throw new Error('未选择当前账套，无法导入导出科目期初');
  const [subjects, openings] = await Promise.all([
    getCurrentAccountSubjects(resolvedAccountSetId),
    getCurrentAccountOpenings(resolvedAccountSetId),
  ]);
  const workbook = new ExcelJS.Workbook();
  writeOpeningSheet(workbook, mergeOpeningExportRows(subjects, openings));
  return workbook;
}

export async function exportSubjectOpening(params: Record<string, any> = {}) {
  const workbook = await buildSubjectOpeningWorkbook(params.account_set_id);
  return await workbookToBlob(workbook);
}

export async function downloadSubjectOpeningImportTemplate(params: Record<string, any> = {}) {
  const workbook = await buildSubjectOpeningWorkbook(params.account_set_id);
  downloadFileFromBlobPart({
    fileName: getSubjectOpeningExportFileName(),
    source: await workbookToBlob(workbook),
  });
}

export async function importSubjectOpening(data: { file: File; account_set_id?: string }) {
  const accountSetId = resolveAccountSetId(data.account_set_id);
  if (!accountSetId) throw new Error('未选择当前账套，无法导入科目期初');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await data.file.arrayBuffer());
  const sheet = workbook.getWorksheet('期初') || workbook.worksheets[0];
  if (!sheet) throw new Error('未读取到 Excel 工作表');

  const headerIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const title = String(cell.value ?? '').trim();
    if (title) headerIndex.set(title, colNumber);
  });
  const requiredHeaders = SUBJECT_OPENING_EXCEL_FIELDS.map((field) => field.title);
  const missingHeaders = requiredHeaders.filter((title) => !headerIndex.has(title));
  if (missingHeaders.length > 0) throw new Error('模板缺少列：' + missingHeaders.join('、'));

  const [subjects, openings] = await Promise.all([
    getCurrentAccountSubjects(accountSetId),
    getCurrentAccountOpenings(accountSetId),
  ]);
  const subjectMap = buildSubjectMap(subjects);
  const openingMap = buildOpeningMap(openings);
  const seenCodes = new Set<string>();
  const addedRows: any[] = [];
  const changedRows: any[] = [];
  let skippedCount = 0;
  const errors: string[] = [];

  const readValue = (row: ExcelJS.Row, title: string) => {
    const col = headerIndex.get(title);
    return col ? getCellText(row, col) : '';
  };

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const subjectCode = normalizeSubjectCode(readValue(row, '科目编码'));
    if (!subjectCode) return;
    if (seenCodes.has(subjectCode)) {
      errors.push('第 ' + rowNumber + ' 行科目编码 ' + subjectCode + ' 重复');
      return;
    }
    seenCodes.add(subjectCode);

    const subject = subjectMap.get(subjectCode);
    if (!subject) {
      errors.push('第 ' + rowNumber + ' 行科目编码 ' + subjectCode + ' 不存在于当前账套科目表');
      return;
    }

    let amounts: Record<string, number>;
    try {
      amounts = Object.fromEntries(
        AMOUNT_FIELD_TITLES.map((field) => [field.key, parseImportAmount(readValue(row, field.title), rowNumber, field.title)]),
      );
    } catch (error: any) {
      errors.push(error?.message || '第 ' + rowNumber + ' 行金额格式错误');
      return;
    }

    const hasInputAmount = AMOUNT_FIELD_TITLES.some((field) => amounts[field.key] !== 0);
    if (Number(subject?.is_leaf_subject ?? 0) !== 1) {
      if (hasInputAmount) errors.push('第 ' + rowNumber + ' 行科目编码 ' + subjectCode + ' 不是末级科目，不允许导入金额');
      else skippedCount += 1;
      return;
    }

    const payload: any = {
      rowid: openingMap.get(subjectCode)?.rowid || generateUUID(),
      account_id: accountSetId,
      account_set_id: accountSetId,
      subject_code: normalizeSubjectCode(subject?.subject_number),
      subject_name: subject?.subject_name || '',
      subject_type: subject?.subject_type,
      balance_direction: subject?.balance_direction,
      is_leaf_subject: subject?.is_leaf_subject,
      beginning_balance: amounts.beginning_balance,
      debit_balance_sum: amounts.debit_balance_sum,
      cebit_balance_sum: amounts.cebit_balance_sum,
      year_beginning_balance: amounts.year_beginning_balance,
      lingma_sys_is_delete: 0,
    };

    // 读取并规范化辅助核算列，但只作为模板兼容校验，不写回 Bil_Subject_Info。
    auxiliaryAccountingValue(readValue(row, '辅助核算'));
    subjectTypeValue(readValue(row, '类别'));
    balanceDirectionValue(readValue(row, '余额方向'));
    normalizeImportText(readValue(row, '科目名称'));

    const current = openingMap.get(subjectCode);
    if (!current?.rowid) {
      addedRows.push(payload);
    } else if (hasOpeningAmountDiff(current, payload)) {
      changedRows.push(payload);
    } else {
      skippedCount += 1;
    }
  });

  if (errors.length > 0) throw new Error(errors.slice(0, 8).join('；'));

  if (addedRows.length > 0 || changedRows.length > 0) {
    const table = createSubjectOpeningTable();
    const saveParam = table.getSaveParam(addedRows, changedRows, []);
    await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  return {
    addedCount: addedRows.length,
    changedCount: changedRows.length,
    skippedCount,
  };
}
