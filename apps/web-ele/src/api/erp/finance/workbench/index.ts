import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import {
  getCachedAuthTenant,
  getTenantMatchValueFromLocation,
} from '#/utils/tenantDomain';

type TableConfig = {
  dbName?: string;
  formKey: string;
  primaryKey: string;
  tableName: string;
};

export type FinanceWorkbenchSummary = {
  contractAmount: number;
  contractCount: number;
  contractConversionRate: number;
  expenseAmount: number;
  expenseCount: number;
  incomeAmount: number;
  incomeCount: number;
  netCashFlow: number;
  paidAmount: number;
  payProgress: number;
  receiveProgress: number;
  receivedAmount: number;
  waitPayAmount: number;
  waitReceiveAmount: number;
};

export type FinanceWorkbenchMonthTrend = {
  contractAmount: number;
  expenseAmount: number;
  incomeAmount: number;
  monthLabel: string;
  netAmount: number;
  paidAmount: number;
  receivedAmount: number;
  waitPayAmount: number;
  waitReceiveAmount: number;
};

export type FinanceWorkbenchCategory = {
  amountPercent: number;
  bizType: string;
  bizTypeName: string;
  categoryName: string;
  doneAmount: number;
  pendingAmount: number;
  rowCount: number;
  totalAmount: number;
};

export type FinanceWorkbenchAlert = {
  affectedCount: number;
  alertLevel: 'danger' | 'info' | 'warning';
  alertTitle: string;
  alertType: string;
  baseAmount: number;
  doneAmount: number;
  pendingAmount: number;
};

export type FinanceWorkbenchData = {
  alerts: FinanceWorkbenchAlert[];
  categories: FinanceWorkbenchCategory[];
  monthTrends: FinanceWorkbenchMonthTrend[];
  summary: FinanceWorkbenchSummary;
};

const WORKBENCH_FORM_KEY = 'A6E55F8AD57242D6D0D5E36AC88B6BD7';

const TABLES = {
  summary: {
    formKey: WORKBENCH_FORM_KEY,
    tableName: 'v_finance_workbench_kpi',
    dbName: 'LMBill',
    primaryKey: 'lingma_sys_ent',
  },
  monthTrend: {
    formKey: WORKBENCH_FORM_KEY,
    tableName: 'v_finance_workbench_month_trend',
    dbName: 'LMBill',
    primaryKey: 'month_label',
  },
  incomeCategory: {
    formKey: WORKBENCH_FORM_KEY,
    tableName: 'v_finance_workbench_income_category',
    dbName: 'LMBill',
    primaryKey: 'category_name',
  },
  expenseCategory: {
    formKey: WORKBENCH_FORM_KEY,
    tableName: 'v_finance_workbench_expense_category',
    dbName: 'LMBill',
    primaryKey: 'category_name',
  },
  alert: {
    formKey: WORKBENCH_FORM_KEY,
    tableName: 'v_finance_workbench_alert',
    dbName: 'LMBill',
    primaryKey: 'alert_type',
  },
} satisfies Record<string, TableConfig>;

const EMPTY_SUMMARY: FinanceWorkbenchSummary = {
  contractAmount: 0,
  contractCount: 0,
  contractConversionRate: 0,
  expenseAmount: 0,
  expenseCount: 0,
  incomeAmount: 0,
  incomeCount: 0,
  netCashFlow: 0,
  paidAmount: 0,
  payProgress: 0,
  receiveProgress: 0,
  receivedAmount: 0,
  waitPayAmount: 0,
  waitReceiveAmount: 0,
};

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toStringValue(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function pickTenantValue(source: any): string {
  const keys = [
    'lingma_sys_ent',
    'lingmaSysEnt',
    'entId',
    'entid',
    'enterpriseId',
    'enterprise_id',
    'shortName',
    'short_name',
  ];
  for (const key of keys) {
    const value = toStringValue(source?.[key]);
    if (value) return value;
  }
  return '';
}

function getCurrentLingmaSysEnt() {
  const cachedTenant = getCachedAuthTenant<any>();
  const fromTenant = pickTenantValue(cachedTenant);
  if (fromTenant) return fromTenant;

  if (typeof window !== 'undefined') {
    const userInfoKeys = [
      'vue-next-admin:userInfo',
      'userInfo',
      'userinfo',
      'lm_user_info',
    ];
    for (const key of userInfoKeys) {
      try {
        const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const value = pickTenantValue(parsed) || pickTenantValue(parsed?.userInfo) || pickTenantValue(parsed?.rawUserInfo);
        if (value) return value;
      } catch {
        // 忽略异常存储内容，继续从其他位置解析租户。
      }
    }
  }

  return toStringValue(getTenantMatchValueFromLocation());
}

function buildScopedFilter() {
  const lingmaSysEnt = getCurrentLingmaSysEnt();
  const accountSetId = getStoredAccountSetId();
  const filters: any[] = [];

  if (lingmaSysEnt) {
    filters.push(cond('lingma_sys_ent', 'equal', lingmaSysEnt));
  }

  if (accountSetId) {
    filters.push(cond('account_set_id', 'equal', accountSetId));
  }

  if (filters.length === 0) {
    console.warn('[FinanceWorkbench] 未获取到 lingma_sys_ent/account_set_id，财务概览将按视图可见数据兜底查询。');
    return null;
  }

  if (filters.length === 1) return filters[0];
  return and(...filters);
}

function normalizeRows(payload: any): any[] {
  const resultData = payload?.data?.Result?.data || payload?.data?.Result || payload?.data || payload;
  const rows = resultData?.Items || resultData || [];
  return Array.isArray(rows) ? rows : [];
}

async function queryRows(config: TableConfig, pageSize = 500) {
  const table = createFinanceDataTableCurrent(
    config.formKey,
    config.tableName,
    config.dbName || 'LMBill',
    config.primaryKey,
  );
  const queryParam = table.getQueryParam('Table', buildScopedFilter(), null, null, pageSize, 1);
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return normalizeRows(resQuery);
}

function mapSummary(row: any): FinanceWorkbenchSummary {
  const incomeAmount = toNumber(row?.income_amount);
  const expenseAmount = toNumber(row?.expense_amount);

  return {
    contractAmount: toNumber(row?.contract_amount),
    contractCount: toNumber(row?.contract_count),
    contractConversionRate: toNumber(row?.contract_conversion_rate),
    expenseAmount,
    expenseCount: toNumber(row?.expense_count),
    incomeAmount,
    incomeCount: toNumber(row?.income_count),
    netCashFlow: toNumber(row?.net_cash_flow ?? incomeAmount - expenseAmount),
    paidAmount: toNumber(row?.paid_amount),
    payProgress: toNumber(row?.pay_progress),
    receiveProgress: toNumber(row?.receive_progress),
    receivedAmount: toNumber(row?.received_amount),
    waitPayAmount: toNumber(row?.wait_pay_amount),
    waitReceiveAmount: toNumber(row?.wait_receive_amount),
  };
}

function mapMonthTrend(row: any): FinanceWorkbenchMonthTrend {
  const incomeAmount = toNumber(row?.income_amount);
  const expenseAmount = toNumber(row?.expense_amount);
  return {
    contractAmount: 0,
    expenseAmount,
    incomeAmount,
    monthLabel: toStringValue(row?.month_label) || '未定',
    netAmount: toNumber(row?.net_amount ?? incomeAmount - expenseAmount),
    paidAmount: 0,
    receivedAmount: 0,
    waitPayAmount: 0,
    waitReceiveAmount: 0,
  };
}

function mapIncomeCategory(row: any): FinanceWorkbenchCategory {
  const incomeAmount = toNumber(row?.income_amount);
  const receivedAmount = toNumber(row?.received_amount);
  return {
    amountPercent: toNumber(row?.amount_percent),
    bizType: 'income',
    bizTypeName: '收入结算',
    categoryName: toStringValue(row?.category_name) || '未分类',
    doneAmount: receivedAmount,
    pendingAmount: toNumber(row?.wait_receive_amount ?? Math.max(incomeAmount - receivedAmount, 0)),
    rowCount: toNumber(row?.row_count),
    totalAmount: incomeAmount,
  };
}

function mapExpenseCategory(row: any): FinanceWorkbenchCategory {
  const expenseAmount = toNumber(row?.expense_amount);
  const paidAmount = toNumber(row?.paid_amount);
  return {
    amountPercent: toNumber(row?.amount_percent),
    bizType: 'expense',
    bizTypeName: '支出结算',
    categoryName: toStringValue(row?.category_name) || '未分类',
    doneAmount: paidAmount,
    pendingAmount: toNumber(row?.wait_pay_amount ?? Math.max(expenseAmount - paidAmount, 0)),
    rowCount: toNumber(row?.row_count),
    totalAmount: expenseAmount,
  };
}

function mapAlert(row: any): FinanceWorkbenchAlert {
  const level = toStringValue(row?.alert_level) as FinanceWorkbenchAlert['alertLevel'];
  return {
    affectedCount: toNumber(row?.affected_count),
    alertLevel: ['danger', 'warning', 'info'].includes(level) ? level : 'info',
    alertTitle: toStringValue(row?.alert_title) || '财务预警',
    alertType: toStringValue(row?.alert_type),
    baseAmount: toNumber(row?.base_amount),
    doneAmount: toNumber(row?.done_amount),
    pendingAmount: toNumber(row?.pending_amount),
  };
}

export function financeAmount(value: unknown) {
  return toNumber(value);
}

export function financeSum(rows: any[], field: string) {
  return rows.reduce((total, row) => total + toNumber(row?.[field]), 0);
}

export async function getFinanceWorkbenchData(): Promise<FinanceWorkbenchData> {
  const [summaryRows, monthTrendRows, incomeCategoryRows, expenseCategoryRows, alertRows] = await Promise.all([
    queryRows(TABLES.summary, 1),
    queryRows(TABLES.monthTrend, 12),
    queryRows(TABLES.incomeCategory, 200),
    queryRows(TABLES.expenseCategory, 200),
    queryRows(TABLES.alert, 50),
  ]);

  return {
    alerts: alertRows.map(mapAlert),
    categories: [
      ...incomeCategoryRows.map(mapIncomeCategory),
      ...expenseCategoryRows.map(mapExpenseCategory),
    ],
    monthTrends: monthTrendRows.map(mapMonthTrend),
    summary: summaryRows[0] ? mapSummary(summaryRows[0]) : { ...EMPTY_SUMMARY },
  };
}
