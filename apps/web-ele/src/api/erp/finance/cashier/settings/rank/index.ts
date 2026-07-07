import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';

// 说明：当前职级页使用的真实 formKey 为 EE51818A60B93DBFDD6222A2D2F6606B。
// Bas_Salary_Rank / Bas_Salary_Rank_Employee / Bas_Salary_Rank_Item 三张表统一使用该 formKey。
const RANK_FORM_KEY = 'EE51818A60B93DBFDD6222A2D2F6606B';
const EMPLOYEE_FORM_KEY = 'EE51818A60B93DBFDD6222A2D2F6606B';
const ITEM_FORM_KEY = 'EE51818A60B93DBFDD6222A2D2F6606B';

const SALARY_DB = 'LMBill';
const RANK_TABLE = 'Bas_Salary_Rank';
const EMPLOYEE_TABLE = 'Bas_Salary_Rank_Employee';
const ITEM_TABLE = 'Bas_Salary_Rank_Item';
const PK = 'rowid';

export namespace SalaryRankApi {
  export interface RankRow {
    rowid?: string;
    rank_code?: string;
    rank_name?: string;
    rank_level?: number;
    rank_type?: string;
    is_enabled?: number;
    remark?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }

  export interface EmployeeRow {
    rowid?: string;
    rank_id?: string;
    employee_id?: string;
    employee_no?: string;
    employee_name?: string;
    dept_id?: string;
    dept_name?: string;
    is_current?: number;
    effective_date?: null | string;
    expire_date?: null | string;
    remark?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }

  export interface ItemRow {
    rowid?: string;
    rank_id?: string;
    item_id?: string;
    is_required?: number;
    is_default_selected?: number;
    default_amount?: number;
    sort_no?: number;
    remark?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }

  export interface ItemBatchSaveParams {
    added?: ItemRow[];
    changed?: Array<ItemRow & { rowid: string }>;
    deletedRowIds?: string[];
  }
}

function createRankTable() {
  return createFinanceDataTable(RANK_FORM_KEY, RANK_TABLE, SALARY_DB, PK);
}

function createEmployeeTable() {
  return createFinanceDataTable(EMPLOYEE_FORM_KEY, EMPLOYEE_TABLE, SALARY_DB, PK);
}

function createItemTable() {
  return createFinanceDataTable(ITEM_FORM_KEY, ITEM_TABLE, SALARY_DB, PK);
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function normalizeText(value: any) {
  return String(value ?? '').trim();
}

function normalizeNullableText(value: any) {
  return normalizeText(value);
}

function normalizeBooleanNumber(value: any, defaultValue = 0) {
  if (value === true) return 1;
  if (value === false) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? (num ? 1 : 0) : defaultValue;
}

function normalizeDateText(value: any) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeMoney(value: any) {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error('默认金额必须是有效数字');
  return Number(num.toFixed(2));
}

function normalizeInteger(value: any, fieldLabel: string, minValue = 0) {
  const num = Number(value ?? minValue);
  if (!Number.isInteger(num) || num < minValue) {
    throw new Error(`${fieldLabel}必须是大于等于 ${minValue} 的整数`);
  }
  return num;
}

function validateRequired(fieldLabel: string, value: string) {
  if (!value) throw new Error(`${fieldLabel}不能为空`);
}

function buildRankItemPayload(data: SalaryRankApi.ItemRow, mode: 'create' | 'update') {
  const payload: SalaryRankApi.ItemRow = {
    rowid: mode === 'create' ? normalizeText(data.rowid) || generateUUID() : normalizeText(data.rowid),
    rank_id: normalizeText(data.rank_id),
    item_id: normalizeText(data.item_id),
    is_required: normalizeBooleanNumber(data.is_required, 0),
    is_default_selected: normalizeBooleanNumber(data.is_default_selected, 1),
    default_amount: normalizeMoney(data.default_amount),
    sort_no: normalizeInteger(data.sort_no, '排序号', 0),
    remark: normalizeNullableText(data.remark),
    lingma_sys_is_delete: 0,
  };
  if (mode === 'update') {
    validateRequired('rowid', payload.rowid || '');
  }
  validateRequired('职级ID', payload.rank_id || '');
  validateRequired('工资项ID', payload.item_id || '');
  return payload;
}

async function queryList(table: any, filters: any[], pageNo = 1, page = 9999) {
  table.Filter = and(...filters);
  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: page, index: pageNo },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  table.execQueryResult(res);
  return extractListAndTotal(res);
}

export async function getSalaryRankList(params: { keyword?: string } = {}) {
  const table = createRankTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const keyword = normalizeText(params.keyword);
  if (keyword) {
    filters.push(
      or(
        cond('rank_code', 'contains', keyword),
        cond('rank_name', 'contains', keyword),
        cond('rank_type', 'contains', keyword),
        cond('remark', 'contains', keyword),
      ),
    );
  }
  const { items, total } = await queryList(table, filters);
  const list = [...items].sort((a: any, b: any) => {
    const levelDiff = Number(a?.rank_level || 0) - Number(b?.rank_level || 0);
    if (levelDiff !== 0) return levelDiff;
    return String(a?.rank_code || '').localeCompare(String(b?.rank_code || ''), 'zh-CN');
  });
  return { dataTable: table, list, total };
}

export async function createSalaryRank(data: SalaryRankApi.RankRow) {
  const table = createRankTable();
  const payload: SalaryRankApi.RankRow = {
    rowid: normalizeText(data.rowid) || generateUUID(),
    rank_code: normalizeText(data.rank_code),
    rank_name: normalizeText(data.rank_name),
    rank_level: normalizeInteger(data.rank_level, '职级层级', 0),
    rank_type: normalizeNullableText(data.rank_type),
    is_enabled: normalizeBooleanNumber(data.is_enabled, 1),
    remark: normalizeNullableText(data.remark),
    lingma_sys_is_delete: 0,
  };
  validateRequired('职级编码', payload.rank_code || '');
  validateRequired('职级名称', payload.rank_name || '');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSalaryRank(data: SalaryRankApi.RankRow & { rowid: string }) {
  const table = createRankTable();
  const payload: SalaryRankApi.RankRow = {
    rowid: normalizeText(data.rowid),
    rank_code: normalizeText(data.rank_code),
    rank_name: normalizeText(data.rank_name),
    rank_level: normalizeInteger(data.rank_level, '职级层级', 0),
    rank_type: normalizeNullableText(data.rank_type),
    is_enabled: normalizeBooleanNumber(data.is_enabled, 1),
    remark: normalizeNullableText(data.remark),
    lingma_sys_is_delete: 0,
  };
  validateRequired('rowid', payload.rowid || '');
  validateRequired('职级编码', payload.rank_code || '');
  validateRequired('职级名称', payload.rank_name || '');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteSalaryRank(rowid: string) {
  const table = createRankTable();
  const saveParam = table.getSaveParam([], [{ rowid: normalizeText(rowid), lingma_sys_is_delete: 1 } as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function getSalaryRankEmployeeList(params: { rank_id?: string; keyword?: string } = {}) {
  const table = createEmployeeTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const rankId = normalizeText(params.rank_id);
  if (rankId) filters.push(cond('rank_id', 'equal', rankId));
  const keyword = normalizeText(params.keyword);
  if (keyword) {
    filters.push(
      or(
        cond('employee_id', 'contains', keyword),
        cond('employee_no', 'contains', keyword),
        cond('employee_name', 'contains', keyword),
        cond('dept_name', 'contains', keyword),
        cond('remark', 'contains', keyword),
      ),
    );
  }
  const { items, total } = await queryList(table, filters);
  const list = [...items].sort((a: any, b: any) => {
    return String(a?.employee_no || a?.employee_id || '').localeCompare(String(b?.employee_no || b?.employee_id || ''), 'zh-CN');
  });
  return { dataTable: table, list, total };
}

export async function createSalaryRankEmployee(data: SalaryRankApi.EmployeeRow) {
  const table = createEmployeeTable();
  const payload: SalaryRankApi.EmployeeRow = {
    rowid: normalizeText(data.rowid) || generateUUID(),
    rank_id: normalizeText(data.rank_id),
    employee_id: normalizeText(data.employee_id),
    employee_no: normalizeNullableText(data.employee_no),
    employee_name: normalizeText(data.employee_name),
    dept_id: normalizeNullableText(data.dept_id),
    dept_name: normalizeNullableText(data.dept_name),
    is_current: normalizeBooleanNumber(data.is_current, 1),
    effective_date: normalizeDateText(data.effective_date),
    expire_date: normalizeDateText(data.expire_date),
    remark: normalizeNullableText(data.remark),
    lingma_sys_is_delete: 0,
  };
  validateRequired('职级ID', payload.rank_id || '');
  validateRequired('员工ID', payload.employee_id || '');
  validateRequired('员工姓名', payload.employee_name || '');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSalaryRankEmployee(data: SalaryRankApi.EmployeeRow & { rowid: string }) {
  const table = createEmployeeTable();
  const payload: SalaryRankApi.EmployeeRow = {
    rowid: normalizeText(data.rowid),
    rank_id: normalizeText(data.rank_id),
    employee_id: normalizeText(data.employee_id),
    employee_no: normalizeNullableText(data.employee_no),
    employee_name: normalizeText(data.employee_name),
    dept_id: normalizeNullableText(data.dept_id),
    dept_name: normalizeNullableText(data.dept_name),
    is_current: normalizeBooleanNumber(data.is_current, 1),
    effective_date: normalizeDateText(data.effective_date),
    expire_date: normalizeDateText(data.expire_date),
    remark: normalizeNullableText(data.remark),
    lingma_sys_is_delete: 0,
  };
  validateRequired('rowid', payload.rowid || '');
  validateRequired('职级ID', payload.rank_id || '');
  validateRequired('员工ID', payload.employee_id || '');
  validateRequired('员工姓名', payload.employee_name || '');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteSalaryRankEmployee(rowid: string) {
  const table = createEmployeeTable();
  const saveParam = table.getSaveParam([], [{ rowid: normalizeText(rowid), lingma_sys_is_delete: 1 } as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function getSalaryRankItemList(params: { rank_id?: string; keyword?: string } = {}) {
  const table = createItemTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const rankId = normalizeText(params.rank_id);
  if (rankId) filters.push(cond('rank_id', 'equal', rankId));
  const keyword = normalizeText(params.keyword);
  if (keyword) {
    filters.push(or(cond('item_id', 'contains', keyword), cond('remark', 'contains', keyword)));
  }
  const { items, total } = await queryList(table, filters);
  const list = [...items].sort((a: any, b: any) => Number(a?.sort_no || 0) - Number(b?.sort_no || 0));
  return { dataTable: table, list, total };
}

export async function createSalaryRankItem(data: SalaryRankApi.ItemRow) {
  const table = createItemTable();
  const payload = buildRankItemPayload(data, 'create');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSalaryRankItem(data: SalaryRankApi.ItemRow & { rowid: string }) {
  const table = createItemTable();
  const payload = buildRankItemPayload(data, 'update');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteSalaryRankItem(rowid: string) {
  const table = createItemTable();
  const saveParam = table.getSaveParam([], [{ rowid: normalizeText(rowid), lingma_sys_is_delete: 1 } as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function saveSalaryRankItemBatch(params: SalaryRankApi.ItemBatchSaveParams = {}) {
  const table = createItemTable();
  const added = (params.added || []).map((item) => buildRankItemPayload(item, 'create'));
  const changed = (params.changed || []).map((item) => buildRankItemPayload(item, 'update'));
  const deleted = (params.deletedRowIds || [])
    .map((rowid) => normalizeText(rowid))
    .filter(Boolean)
    .map((rowid) => ({ rowid, lingma_sys_is_delete: 1 }));

  if (!added.length && !changed.length && !deleted.length) {
    return { success: true, skipped: true };
  }

  const saveParam = table.getSaveParam(added as any[], changed as any[], deleted as any[]);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
