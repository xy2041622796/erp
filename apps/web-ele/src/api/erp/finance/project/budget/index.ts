import { useUserStore } from '@vben/stores';
import { generateUUID } from '@vben/utils';

import { cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import { createFinanceDataTable } from '../../common/account-set-scope';
import { buildKeywordFilter, mergeFilters, queryTable, toClientData } from '../shared';

// TODO: 请替换为 project_budgets 的真实 formkey / modelId。
const PROJECT_BUDGET_MODEL_ID = 'AA01F4F2121A187C796C0B6B04E5596C';
const PROJECT_BUDGET_TABLE = 'project_budgets';
const PROJECT_BUDGET_DB = 'LMBill';
const PROJECT_BUDGET_PK = 'id';

export namespace ErpFinanceProjectBudgetApi {
  export interface BudgetItem {
    id?: string;
    budget_code?: string;
    project_id?: string;
    project_name?: string;
    category?: string;
    budget_amount?: number | string;
    used_amount?: number | string;
    remaining_amount?: number | string;
    usage_rate?: number | string;
    manager_id?: string;
    manager_name?: string;
    year?: number | string;
    month?: number | string;
    status?: string;
    remark?: string;
    creator_id?: string;
    created_at?: string;
    updated_at?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    flowstate?: number | string;
    description?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
    account_set_id?: string;
  }
}

function createBudgetTable() {
  return createFinanceDataTable(
    PROJECT_BUDGET_MODEL_ID,
    PROJECT_BUDGET_TABLE,
    PROJECT_BUDGET_DB,
    PROJECT_BUDGET_PK,
  );
}


function getTimeValue(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return 0;
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function getCurrentUserInfo() {
  const userStore = useUserStore();
  const userInfo: any = userStore.userInfo || {};
  const raw: any = userInfo.userInfo || userInfo.raw || {};
  return {
    userId: normalizeText(userInfo.id || userInfo.ID || userInfo.ROWID || raw.id || raw.ID || raw.ROWID),
    userName: normalizeText(userInfo.nickname || userInfo.UserName || userInfo.username || userInfo.LoginName || raw.UserName || raw.userName || raw.username || raw.LoginName),
  };
}

function formatMysqlDateTime(value: Date = new Date()) {
  const pad = (num: number) => String(num).padStart(2, '0');
  return [value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())].join('-') + ' ' + [pad(value.getHours()), pad(value.getMinutes()), pad(value.getSeconds())].join(':');
}

function normalizeBudgetPayload(data: ErpFinanceProjectBudgetApi.BudgetItem) {
  const budgetAmount = Number(data?.budget_amount ?? 0);
  const usedAmount = Number(data?.used_amount ?? 0);
  const remainingAmount = Number(data?.remaining_amount ?? budgetAmount - usedAmount);
  const usageRate =
    budgetAmount > 0
      ? Number(data?.usage_rate ?? ((usedAmount / budgetAmount) * 100).toFixed(2))
      : 0;
  const currentUser = getCurrentUserInfo();
  const creatorId = normalizeText(data?.creator_id) || currentUser.userId || currentUser.userName || generateUUID();
  const creatorName = normalizeText((data as any)?.createuser) || currentUser.userName || creatorId;

  return {
    ...data,
    id: String(data?.id || generateUUID()),
    project_id: String(data?.project_id || '').trim(),
    project_name: String(data?.project_name || '').trim(),
    category: String(data?.category || '').trim(),
    budget_amount: budgetAmount,
    used_amount: usedAmount,
    remaining_amount: remainingAmount,
    usage_rate: usageRate,
    manager_id: normalizeText(data?.manager_id) || undefined,
    manager_name: normalizeText(data?.manager_name) || undefined,
    year: Number(data?.year || new Date().getFullYear()),
    status: String(data?.status || 'active').trim() || 'active',
    flowstate: Number(data?.flowstate ?? 10),
    creator_id: creatorId,
    createuser: creatorName,
    createtime: (data as any)?.createtime || formatMysqlDateTime(),
    lingma_sys_is_delete: Number(data?.lingma_sys_is_delete ?? 0),
    account_set_id:
      String(data?.account_set_id || '').trim() || String(getStoredAccountSetId() || '').trim() || undefined,
  };
}

export async function getBudgetList(params: {
  pageNo?: number;
  page?: number;
  keyword?: string;
  status?: string;
  year?: number | string;
  project_id?: string;
  category?: string;
}) {
  const table = createBudgetTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  const status = String(params?.status || '').trim();
  if (status && status !== 'all') {
    if (status === 'normal') {
      filters.push(cond('usage_rate', 'less', 80));
    } else if (status === 'warning') {
      filters.push(cond('usage_rate', 'greaterorequal', 80));
      filters.push(cond('usage_rate', 'less', 100));
    } else if (status === 'over') {
      filters.push(cond('usage_rate', 'greaterorequal', 100));
    } else {
      filters.push(cond('status', 'equal', status));
    }
  }

  if (params?.year !== undefined && params?.year !== null && params?.year !== '') {
    filters.push(cond('year', 'equal', Number(params.year)));
  }
  if (params?.project_id) {
    filters.push(cond('project_id', 'equal', params.project_id));
  }
  if (params?.category) {
    filters.push(cond('category', 'equal', params.category));
  }

  table.Filter = mergeFilters(filters, buildKeywordFilter(['project_name', 'category', 'manager_name'], params?.keyword));

  const { items, total } = await queryTable(table, params?.pageNo || 1, params?.page || 0);
  const sortedItems = [...items].sort((a: any, b: any) => getTimeValue(b?.created_at) - getTimeValue(a?.created_at));
  return toClientData(table, sortedItems, total);
}

export async function getBudget(id: string) {
  const table = createBudgetTable();
  table.Filter = mergeFilters([cond('lingma_sys_is_delete', 'equal', 0), cond(PROJECT_BUDGET_PK, 'equal', id)]);
  const { items } = await queryTable(table, 1, 1);
  return (items[0] as ErpFinanceProjectBudgetApi.BudgetItem) || null;
}

export async function createBudget(data: ErpFinanceProjectBudgetApi.BudgetItem) {
  const table = createBudgetTable();
  const payload = normalizeBudgetPayload(data);
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

export async function auditBudget(id: string, approved: boolean, remark?: string) {
  const table = createBudgetTable();
  const currentUser = getCurrentUserInfo();
  const now = formatMysqlDateTime();
  const payload: any = {
    id,
    flowstate: approved ? 20 : -10,
    status: approved ? 'active' : 'frozen',
    updated_at: now,
    updatetime: now,
    updateuser: currentUser.userName || currentUser.userId || undefined,
  };
  const auditRemark = normalizeText(remark);
  if (auditRemark) payload.description = auditRemark;
  const saveParam = table.getSaveParam([], [payload], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return { success: true, data: payload };
}

export async function getBudgetStats(params?: { year?: number | string; project_id?: string }) {
  const listResult = await getBudgetList({
    pageNo: 1,
    page: 0,
    year: params?.year,
    project_id: params?.project_id,
  });

  const list = Array.isArray(listResult.list) ? listResult.list : [];
  const totalBudget = list.reduce((sum, item: any) => sum + Number(item?.budget_amount || 0), 0);
  const totalUsed = list.reduce((sum, item: any) => sum + Number(item?.used_amount || 0), 0);
  const normal = list.filter((item: any) => Number(item?.usage_rate || 0) < 80).length;
  const warning = list.filter((item: any) => {
    const rate = Number(item?.usage_rate || 0);
    return rate >= 80 && rate < 100;
  }).length;
  const over = list.filter((item: any) => Number(item?.usage_rate || 0) >= 100).length;

  return {
    total: list.length,
    totalBudget,
    totalUsed,
    normal,
    warning,
    over,
  };
}
