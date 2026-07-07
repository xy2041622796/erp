import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';

const SALARY_FORM_ID = 'EE51818A60B93DBFDD6222A2D2F6606B';
const SALARY_DB = 'LMBill';
const SALARY_RULE_ASSIGNMENT_TABLE = 'Bil_Salary_Rule_Assignment';
const PK = 'rowid';

export type SalaryRuleType = 'HOUSING_FUND' | 'SOCIAL' | 'TAX';
export type SalaryRuleApplyScope = 'DEPT' | 'EMPLOYEE' | 'GLOBAL' | 'RANK';

export namespace SalaryRuleAssignmentApi {
  export interface Row {
    rowid?: string;
    rule_type?: SalaryRuleType;
    rule_code?: string;
    apply_scope?: SalaryRuleApplyScope;
    employee_id?: string;
    rank_id?: string;
    rank_code?: string;
    dept_id?: string;
    effective_start_period?: string;
    effective_end_period?: string;
    priority?: number;
    is_enabled?: number;
    status?: number;
    description?: string;
    remark?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
  }

  export interface MatchContext {
    deptId?: string;
    employeeId?: string;
    period?: string;
    rankCode?: string;
    rankId?: string;
  }
}

function createAssignmentTable() {
  return createFinanceDataTable(SALARY_FORM_ID, SALARY_RULE_ASSIGNMENT_TABLE, SALARY_DB, PK);
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeInteger(value: unknown, defaultValue = 0) {
  const num = Number(value ?? defaultValue);
  return Number.isFinite(num) ? Math.trunc(num) : defaultValue;
}

function normalizeBooleanNumber(value: unknown, defaultValue = 1) {
  if (value === true) return 1;
  if (value === false) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? (num ? 1 : 0) : defaultValue;
}

function isPeriodMatched(row: SalaryRuleAssignmentApi.Row, period?: string) {
  const current = normalizeText(period);
  if (!current) return true;
  const start = normalizeText(row.effective_start_period);
  const end = normalizeText(row.effective_end_period);
  if (start && current < start) return false;
  if (end && current > end) return false;
  return true;
}

function getScopeRank(scope?: string) {
  if (scope === 'EMPLOYEE') return 1;
  if (scope === 'RANK') return 2;
  if (scope === 'DEPT') return 3;
  return 4;
}

function buildPayload(data: SalaryRuleAssignmentApi.Row, mode: 'create' | 'update') {
  const rowid = mode === 'create' ? normalizeText(data.rowid) || generateUUID() : normalizeText(data.rowid);
  const rule_type = normalizeText(data.rule_type) as SalaryRuleType;
  const rule_code = normalizeText(data.rule_code);
  const apply_scope = (normalizeText(data.apply_scope) || 'GLOBAL') as SalaryRuleApplyScope;

  if (!rowid) throw new Error('rowid 不能为空');
  if (!['SOCIAL', 'HOUSING_FUND', 'TAX'].includes(rule_type)) throw new Error('规则类型不合法');
  if (!rule_code) throw new Error('规则编码不能为空');
  if (!['EMPLOYEE', 'RANK', 'DEPT', 'GLOBAL'].includes(apply_scope)) throw new Error('适用范围不合法');
  if (apply_scope === 'EMPLOYEE' && !normalizeText(data.employee_id)) throw new Error('员工适用规则必须选择员工');
  if (apply_scope === 'RANK' && !normalizeText(data.rank_id) && !normalizeText(data.rank_code)) throw new Error('职级适用规则必须选择职级');
  if (apply_scope === 'DEPT' && !normalizeText(data.dept_id)) throw new Error('部门适用规则必须选择部门');

  return {
    ...data,
    rowid,
    rule_type,
    rule_code,
    apply_scope,
    employee_id: normalizeText(data.employee_id),
    rank_id: normalizeText(data.rank_id),
    rank_code: normalizeText(data.rank_code),
    dept_id: normalizeText(data.dept_id),
    effective_start_period: normalizeText(data.effective_start_period),
    effective_end_period: normalizeText(data.effective_end_period),
    priority: normalizeInteger(data.priority, getScopeRank(apply_scope) * 100),
    is_enabled: normalizeBooleanNumber(data.is_enabled, 1),
    status: normalizeInteger(data.status, 1),
    description: normalizeText(data.description),
    remark: normalizeText(data.remark),
    lingma_sys_is_delete: 0,
  };
}

export async function getSalaryRuleAssignmentPage(params: any = {}) {
  const table = createAssignmentTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.rule_type) filters.push(cond('rule_type', 'equal', params.rule_type));
  if (params.rule_code) filters.push(cond('rule_code', 'equal', params.rule_code));
  if (params.apply_scope) filters.push(cond('apply_scope', 'equal', params.apply_scope));
  if (params.employee_id) filters.push(cond('employee_id', 'equal', params.employee_id));
  if (params.rank_id) filters.push(cond('rank_id', 'equal', params.rank_id));
  if (params.rank_code) filters.push(cond('rank_code', 'equal', params.rank_code));
  if (params.dept_id) filters.push(cond('dept_id', 'equal', params.dept_id));
  if (params.is_enabled !== undefined && params.is_enabled !== null && params.is_enabled !== '') {
    filters.push(cond('is_enabled', 'equal', Number(params.is_enabled)));
  }
  if (params.keyword) {
    filters.push(
      or(
        cond('rule_code', 'contains', params.keyword),
        cond('rank_code', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
      ),
    );
  }

  table.Filter = and(...filters);

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: params.page || 9999, index: params.pageNo || 1 },
    },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );

  table.execQueryResult(res);
  const { items, total } = extractListAndTotal(res);
  const list = [...items].sort((a: any, b: any) => {
    const priorityDiff = Number(a?.priority || 0) - Number(b?.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return getScopeRank(a?.apply_scope) - getScopeRank(b?.apply_scope);
  });

  return { dataTable: table, list, total };
}

export async function createSalaryRuleAssignment(data: SalaryRuleAssignmentApi.Row) {
  const table = createAssignmentTable();
  const payload = buildPayload(data, 'create');
  const saveParam = table.getSaveParam([payload as any], [], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSalaryRuleAssignment(data: SalaryRuleAssignmentApi.Row & { rowid: string }) {
  const table = createAssignmentTable();
  const payload = buildPayload(data, 'update');
  const saveParam = table.getSaveParam([], [payload as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteSalaryRuleAssignment(rowid: string) {
  const table = createAssignmentTable();
  const saveParam = table.getSaveParam([], [{ rowid: normalizeText(rowid), lingma_sys_is_delete: 1 } as any], []);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function saveSalaryRuleAssignmentBatch(params: {
  added?: SalaryRuleAssignmentApi.Row[];
  changed?: Array<SalaryRuleAssignmentApi.Row & { rowid: string }>;
  deletedRowIds?: string[];
} = {}) {
  const table = createAssignmentTable();
  const added = (params.added || []).map((item) => buildPayload(item, 'create'));
  const changed = (params.changed || []).map((item) => buildPayload(item, 'update'));
  const deleted = (params.deletedRowIds || [])
    .map((rowid) => normalizeText(rowid))
    .filter(Boolean)
    .map((rowid) => ({ rowid, lingma_sys_is_delete: 1 }));

  if (!added.length && !changed.length && !deleted.length) {
    return { success: true, skipped: true };
  }

  const saveParam = table.getSaveParam(added as any[], changed as any[], deleted as any[]);
  return requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export function matchSalaryRuleAssignment(
  assignments: SalaryRuleAssignmentApi.Row[],
  ruleType: SalaryRuleType,
  context: SalaryRuleAssignmentApi.MatchContext = {},
) {
  const employeeId = normalizeText(context.employeeId);
  const rankId = normalizeText(context.rankId);
  const rankCode = normalizeText(context.rankCode);
  const deptId = normalizeText(context.deptId);

  const matched = (assignments || [])
    .filter((row) => Number(row.is_enabled ?? 1) === 1)
    .filter((row) => normalizeText(row.rule_type) === ruleType)
    .filter((row) => isPeriodMatched(row, context.period))
    .filter((row) => {
      const scope = normalizeText(row.apply_scope) || 'GLOBAL';
      if (scope === 'EMPLOYEE') return employeeId && normalizeText(row.employee_id) === employeeId;
      if (scope === 'RANK') {
        return (
          (rankId && normalizeText(row.rank_id) === rankId) ||
          (rankCode && normalizeText(row.rank_code) === rankCode)
        );
      }
      if (scope === 'DEPT') return deptId && normalizeText(row.dept_id) === deptId;
      return scope === 'GLOBAL';
    })
    .sort((a, b) => {
      const priorityDiff = Number(a.priority || 0) - Number(b.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return getScopeRank(a.apply_scope) - getScopeRank(b.apply_scope);
    });

  return matched[0] || null;
}
