import { generateUUID } from '@vben/utils';

import { cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import { createFinanceDataTable } from '../../common/account-set-scope';
import { buildKeywordFilter, mergeFilters, queryTable, toClientData } from '../shared';

// TODO: 请替换为 Bil_Expense_Regist 的真实 formkey / modelId。
const TEMP_EXPENSE_MODEL_ID = 'AA927FBBFCF47469E180B65C2EABDE13';
const TEMP_EXPENSE_TABLE = 'Bil_Expense_Regist';
const TEMP_EXPENSE_DB = 'LMBill';
const TEMP_EXPENSE_PK = 'rowid';

export namespace ErpFinanceProjectTempExpenseApi {
  export interface TempExpenseItem {
    rowid?: string;
    project_id?: string;
    project_name?: string;
    expense_type?: string;
    amount?: number | string;
    reason?: string;
    applicant_name?: string;
    department_name?: string;
    status?: number | string;
    attachments?: string | string[];
    created_at?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }
}

function createTempExpenseTable() {
  return createFinanceDataTable(
    TEMP_EXPENSE_MODEL_ID,
    TEMP_EXPENSE_TABLE,
    TEMP_EXPENSE_DB,
    TEMP_EXPENSE_PK,
  );
}


function getTimeValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function parseJsonText(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return {} as any;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {} as any;
  }
}

function mapTempExpenseRow(row: any) {
  const extra = parseJsonText(row?.description);
  const statusValue = row?.status ?? row?.flowstate ?? 10;
  const auditRemark = extra?.auditRemark || (Number(statusValue) !== 10 ? row?.remark : '');
  return {
    ...row,
    id: row?.rowid,
    project_name: row?.project_name || row?.project_id,
    amount: Number(row?.expense_amount ?? 0),
    reason: row?.reason || extra?.reason || (Number(statusValue) === 10 ? row?.remark : '') || '',
    audit_remark: auditRemark || '',
    applicant_name: row?.applicant_name || row?.createuser || row?.user_id || '',
    department_name: row?.department_name || row?.expense_depart || '',
    attachments: row?.attachments || extra?.attachments || '[]',
    created_at: row?.created_at || row?.registration_date || row?.createtime,
    status: statusValue,
  };
}

function normalizeStatus(status: unknown) {
  const text = String(status ?? '').trim();
  if (!text || text === 'pending') return 10;
  if (text === 'approved') return 20;
  if (text === 'rejected') return -10;
  return Number.isNaN(Number(text)) ? 10 : Number(text);
}

function formatMysqlDateTime(value: Date = new Date()) {
  const pad = (num: number) => String(num).padStart(2, '0');
  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join('-') + ' ' + [
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds()),
  ].join(':');
}

export async function getTempExpenseList(params: {
  pageNo?: number;
  page?: number;
  keyword?: string;
  status?: string;
  project_id?: string;
}) {
  const table = createTempExpenseTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params?.project_id) {
    filters.push(cond('project_id', 'equal', params.project_id));
  }

  const status = String(params?.status || '').trim();
  if (status && status !== 'all') {
    filters.push(cond('flowstate', 'equal', normalizeStatus(status)));
  }

  table.Filter = mergeFilters(filters, buildKeywordFilter(['expense_type', 'remark', 'description', 'project_id'], params?.keyword));

  const { items, total } = await queryTable(table, params?.pageNo || 1, params?.page || 0);
  const mappedItems = items.map(mapTempExpenseRow).sort((a: any, b: any) => getTimeValue(b?.created_at || b?.registration_date) - getTimeValue(a?.created_at || a?.registration_date));
  return toClientData(table, mappedItems, total);
}

export async function createTempExpense(data: ErpFinanceProjectTempExpenseApi.TempExpenseItem) {
  const table = createTempExpenseTable();
  const payload = {
    rowid: String(data?.rowid || generateUUID()),
    project_id: String(data?.project_id || '').trim(),
    expense_type: String(data?.expense_type || '').trim(),
    expense_amount: Number(data?.amount ?? 0),
    remark: String(data?.reason || '').trim(),
    registration_date: formatMysqlDateTime(),
    flowstate: normalizeStatus(data?.status),
    lingma_sys_is_delete: Number(data?.lingma_sys_is_delete ?? 0),
    account_set_id:
      String(data?.account_set_id || '').trim() || String(getStoredAccountSetId() || '').trim() || undefined,
    // 附件为源页面字段，当前真实表未见独立附件列，先保留在 description 里，后续如接 file_BarInfo/file_FJ 再拆。
    description: JSON.stringify({
      reason: String(data?.reason || '').trim(),
      attachments: Array.isArray(data?.attachments) ? data.attachments : [],
    }),
  } as any;

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return {
    ...(res as any),
    success: true,
    data: payload,
  };
}

export async function auditTempExpense(id: string, approved: boolean, auditRemark?: string) {
  const table = createTempExpenseTable();
  const remarkText = String(auditRemark || '').trim();
  const changed = {
    rowid: id,
    flowstate: approved ? 20 : -10,
    ...(remarkText ? { remark: remarkText, description: JSON.stringify({ auditRemark: remarkText }) } : {}),
  } as any;
  const saveParam = table.getSaveParam([], [changed], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return {
    ...(res as any),
    success: true,
  };
}
