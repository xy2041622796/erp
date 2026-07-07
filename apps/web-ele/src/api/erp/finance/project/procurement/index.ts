import { generateUUID } from '@vben/utils';

import { cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import { createFinanceDataTable } from '../../common/account-set-scope';
import { buildKeywordFilter, mergeFilters, queryTable, toClientData } from '../shared';

// TODO: 请替换为 Bil_Payment_Apply 的真实 formkey / modelId。
const PROCUREMENT_MODEL_ID = 'AACAC2A53B70C4CDAD5EAE5B39728D46';
const PROCUREMENT_TABLE = 'Bil_Payment_Apply';
const PROCUREMENT_DB = 'LMBill';
const PROCUREMENT_PK = 'rowid';

export namespace ErpFinanceProjectProcurementApi {
  export interface ProcurementItem {
    rowid?: string;
    project_id?: string;
    project_name?: string;
    item_name?: string;
    quantity?: number | string;
    unit?: string;
    unit_price?: number | string;
    total_price?: number | string;
    supplier?: string;
    reason?: string;
    status?: number | string;
    applicant_name?: string;
    department_name?: string;
    created_at?: string;
    apply_date?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }
}

function createProcurementTable() {
  return createFinanceDataTable(
    PROCUREMENT_MODEL_ID,
    PROCUREMENT_TABLE,
    PROCUREMENT_DB,
    PROCUREMENT_PK,
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

function mapProcurementRow(row: any) {
  const totalPrice = Number(row?.payment_amount ?? 0);
  const quantity = Number(row?.quantity ?? 1);
  const unitPrice = Number(row?.unit_price ?? (quantity > 0 ? totalPrice / quantity : totalPrice));
  const extra = parseJsonText(row?.description);
  const statusValue = row?.status ?? 10;
  const auditRemark = extra?.auditRemark || (Number(statusValue) !== 10 ? row?.remark : '');
  return {
    ...row,
    id: row?.rowid,
    project_name: row?.project_name || row?.project_id,
    item_name: row?.item_name || row?.payment_purpose || row?.description || '',
    quantity,
    unit: row?.unit || '项',
    unit_price: unitPrice,
    total_price: totalPrice,
    supplier: row?.supplier || row?.payee_name || '',
    reason: row?.reason || row?.payment_purpose || extra?.reason || '',
    audit_remark: auditRemark || '',
    applicant_name: row?.applicant_name || row?.createuser || '',
    department_name: row?.department_name || row?.apply_depart || '',
    created_at: row?.created_at || row?.apply_date || row?.createtime,
  };
}

function normalizeSaveStatus(status: unknown) {
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

export async function getProcurementList(params: {
  pageNo?: number;
  page?: number;
  keyword?: string;
  status?: string;
  project_id?: string;
}) {
  const table = createProcurementTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params?.project_id) {
    filters.push(cond('project_id', 'equal', params.project_id));
  }

  const status = String(params?.status || '').trim();
  if (status && status !== 'all') {
    filters.push(cond('status', 'equal', normalizeSaveStatus(status)));
  }

  table.Filter = mergeFilters(filters, buildKeywordFilter(['payment_purpose', 'remark', 'payee_name', 'project_id'], params?.keyword));

  const { items, total } = await queryTable(table, params?.pageNo || 1, params?.page || 0);
  const mappedItems = items.map(mapProcurementRow).sort((a: any, b: any) => getTimeValue(b?.created_at || b?.apply_date) - getTimeValue(a?.created_at || a?.apply_date));
  return toClientData(table, mappedItems, total);
}

export async function createProcurement(data: ErpFinanceProjectProcurementApi.ProcurementItem) {
  const table = createProcurementTable();
  const quantity = Number(data?.quantity ?? 1);
  const unitPrice = Number(data?.unit_price ?? 0);
  const totalPrice = Number(data?.total_price ?? quantity * unitPrice);

  const payload = {
    rowid: String(data?.rowid || generateUUID()),
    project_id: String(data?.project_id || '').trim(),
    project_name: String(data?.project_name || '').trim(),
    payment_purpose: String(data?.reason || data?.item_name || '').trim(),
    payment_amount: totalPrice,
    payee_name: String(data?.supplier || '').trim(),
    applicant_name: String(data?.applicant_name || '').trim(),
    apply_date: data?.apply_date || formatMysqlDateTime(),
    status: normalizeSaveStatus(data?.status),
    remark: String(data?.reason || '').trim(),
    description: JSON.stringify({ reason: String(data?.reason || '').trim(), auditRemark: '' }),
    payment_type: '项目采购',
    lingma_sys_is_delete: Number(data?.lingma_sys_is_delete ?? 0),
    account_set_id:
      String(data?.account_set_id || '').trim() || String(getStoredAccountSetId() || '').trim() || undefined,
    // 以下字段用于前端展示兼容，保存前需要确认 Bil_Payment_Apply 是否已配置这些扩展字段。
    item_name: String(data?.item_name || '').trim(),
    quantity,
    unit: String(data?.unit || '项').trim(),
    unit_price: unitPrice,
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

export async function auditProcurement(id: string, approved: boolean, auditRemark?: string) {
  const table = createProcurementTable();
  const remarkText = String(auditRemark || '').trim();
  const changed = {
    rowid: id,
    status: approved ? 20 : -10,
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
