import { generateUUID } from '@vben/utils';

import { and, cond } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';

const PERIOD_STATUS_MODEL_ID = '7587CA78903525BBA582048E98660C22';
const PERIOD_STATUS_TABLE = 'fin_period_status';
const PERIOD_STATUS_DB = 'LMBill';
const PERIOD_STATUS_PK = 'id';

export interface PeriodStatusQueryParams {
  accountSetId?: string;
  companyName?: string;
  years?: number[];
}

export interface PeriodStatusRecord {
  id?: string;
  rowid?: string;
  account_set_id?: string;
  company_name?: string;
  fiscal_year: number;
  period_month: number;
  period_code: string;
  carry_forward_status: number;
  close_status: number;
  carry_forward_voucher_id?: string;
  carry_forward_voucher_code?: string;
  carry_forward_at?: string;
  carry_forward_by?: string;
  close_voucher_id?: string;
  close_at?: string;
  close_by?: string;
  last_reverse_at?: string | null;
  last_reverse_by?: string;
  remark?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface SavePeriodStatusParams {
  id?: string;
  rowid?: string;
  account_set_id: string;
  company_name?: string;
  fiscal_year: number;
  period_month: number;
  period_code?: string;
  carry_forward_status?: number;
  close_status?: number;
  carry_forward_voucher_id?: string;
  carry_forward_voucher_code?: string;
  carry_forward_at?: string;
  carry_forward_by?: string;
  close_voucher_id?: string;
  close_at?: string;
  close_by?: string;
  last_reverse_at?: string | null;
  last_reverse_by?: string;
  remark?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface InitPeriodsParams {
  accountSetId: string;
  companyName?: string;
  startDate: string;
  endDate?: string;
  overwriteRange?: boolean;
  remarkPrefix?: string;
}

function resolveAccountSetId(accountSetId?: string) {
  return String(accountSetId || '').trim() || getStoredAccountSetId() || '';
}

function toYearMonth(dateValue: string | number | Date) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('日期无效，无法判断是否已关账');
  }
  return {
    fiscalYear: date.getFullYear(),
    periodMonth: date.getMonth() + 1,
  };
}

function toDateInput(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function formatPeriodCode(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthEndDay(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function normalizeNullableDateTime(value?: null | string) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function addMonths(dateValue: string | number | Date, months: number) {
  const date = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('日期无效，无法顺延期间');
  }
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, monthEnd));
  return date;
}

function buildPeriodRangeByDate(startDate: string, endDate?: string) {
  const startText = toDateInput(startDate);
  if (!startText) throw new Error('启用日期无效，无法生成期间');
  const actualEndText = toDateInput(endDate) || toDateInput(new Date());
  if (!actualEndText) throw new Error('截止日期无效，无法生成期间');

  const [startYearText, startMonthText] = startText.split('-');
  const [endYearText, endMonthText] = actualEndText.split('-');
  const startYear = Number(startYearText);
  const startMonth = Number(startMonthText);
  const endYear = Number(endYearText);
  const endMonth = Number(endMonthText);
  if (!startYear || !startMonth || !endYear || !endMonth) {
    throw new Error('期间范围无效，无法生成期间');
  }
  const result: Array<{ fiscal_year: number; period_month: number; period_code: string; start_date: string; end_date: string }> = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const monthStart = year === startYear ? startMonth : 1;
    const monthEnd = year === endYear ? endMonth : 12;
    for (let month = monthStart; month <= monthEnd; month += 1) {
      result.push({
        fiscal_year: year,
        period_month: month,
        period_code: formatPeriodCode(year, month),
        start_date: `${year}-${String(month).padStart(2, '0')}-01`,
        end_date: `${year}-${String(month).padStart(2, '0')}-${String(getMonthEndDay(year, month)).padStart(2, '0')}`,
      });
    }
  }
  return result;
}

async function queryTableItems(filters: any[]) {
  const table = createFinanceDataTable(
    PERIOD_STATUS_MODEL_ID,
    PERIOD_STATUS_TABLE,
    PERIOD_STATUS_DB,
    PERIOD_STATUS_PK,
  );
  table.Filter = filters.length > 0 ? and(...filters) : null;

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 0, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res as any);
  return (table.items || []) as PeriodStatusRecord[];
}

function createTable() {
  return createFinanceDataTable(
    PERIOD_STATUS_MODEL_ID,
    PERIOD_STATUS_TABLE,
    PERIOD_STATUS_DB,
    PERIOD_STATUS_PK,
  );
}

function normalizePeriodStatus(item: PeriodStatusRecord) {
  const id = String(item?.id || item?.rowid || '').trim();
  const fiscalYear = Number(item?.fiscal_year || 0);
  const periodMonth = Number(item?.period_month || 0);
  const periodCode = item?.period_code || formatPeriodCode(fiscalYear, periodMonth);
  const startDate = toDateInput(item?.start_date) || (fiscalYear && periodMonth ? `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-01` : '');
  const endDate =
    toDateInput(item?.end_date) ||
    (fiscalYear && periodMonth
      ? `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-${String(getMonthEndDay(fiscalYear, periodMonth)).padStart(2, '0')}`
      : '');

  return {
    ...item,
    id,
    rowid: id,
    fiscal_year: fiscalYear,
    period_month: periodMonth,
    carry_forward_status: Number(item?.carry_forward_status || 0),
    close_status: Number(item?.close_status || 0),
    period_code: periodCode,
    start_date: startDate,
    end_date: endDate,
    last_reverse_at: normalizeNullableDateTime(item?.last_reverse_at),
    last_reverse_by: item?.last_reverse_by || '',
  } as PeriodStatusRecord;
}

function isDuplicatePeriodError(error: any) {
  const message = String(error?.message || error || '');
  return (
    message.includes('DuplicateKeyException') ||
    message.includes('SQLIntegrityConstraintViolationException') ||
    message.includes('Duplicate entry') ||
    message.includes('uk_account_period')
  );
}

function buildPeriodStatusPayload(params: SavePeriodStatusParams, existedId?: string) {
  const fiscalYear = Number(params.fiscal_year || 0);
  const periodMonth = Number(params.period_month || 0);
  const periodCode = params.period_code || formatPeriodCode(fiscalYear, periodMonth);
  const startDate = toDateInput(params.start_date) || `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-01`;
  const endDate =
    toDateInput(params.end_date) ||
    `${fiscalYear}-${String(periodMonth).padStart(2, '0')}-${String(getMonthEndDay(fiscalYear, periodMonth)).padStart(2, '0')}`;

  return {
    id: existedId || params.id || params.rowid || generateUUID(),
    lingma_sys_is_delete: 0,
    account_set_id: params.account_set_id,
    company_name: params.company_name || '',
    fiscal_year: fiscalYear,
    period_month: periodMonth,
    period_code: periodCode,
    carry_forward_status: Number(params.carry_forward_status || 0),
    close_status: Number(params.close_status || 0),
    carry_forward_voucher_id: params.carry_forward_voucher_id || '',
    carry_forward_voucher_code: params.carry_forward_voucher_code || '',
    carry_forward_at: params.carry_forward_at || '',
    carry_forward_by: params.carry_forward_by || '',
    close_voucher_id: params.close_voucher_id || '',
    close_at: params.close_at || '',
    close_by: params.close_by || '',
    last_reverse_at: normalizeNullableDateTime(params.last_reverse_at),
    last_reverse_by: params.last_reverse_by || '',
    remark: params.remark || '',
    start_date: startDate,
    end_date: endDate,
    description: params.description || '',
  };
}

async function submitPeriodStatus(payload: Record<string, any>, isUpdate: boolean) {
  const table = createTable();
  const saveParam = isUpdate ? table.getSaveParam([], [payload], []) : table.getSaveParam([payload], [], []);

  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function getPeriodStatusList(params: PeriodStatusQueryParams = {}): Promise<PeriodStatusRecord[]> {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  if (resolvedAccountSetId) {
    filters.push(cond('account_set_id', 'equal', resolvedAccountSetId));
  }
  if (params.companyName) {
    filters.push(cond('company_name', 'equal', params.companyName));
  }
  if (params.years && params.years.length > 0) {
    filters.push(cond('fiscal_year', 'in', params.years));
  }

  const rows = await queryTableItems(filters);
  return rows.map((item) => normalizePeriodStatus(item));
}

export async function getPeriodStatusByMonth(params: {
  accountSetId: string;
  fiscalYear: number;
  periodMonth: number;
}) {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const rows = await queryTableItems([
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_set_id', 'equal', resolvedAccountSetId),
    cond('fiscal_year', 'equal', params.fiscalYear),
    cond('period_month', 'equal', params.periodMonth),
  ]);
  const item = rows[0];
  return item ? normalizePeriodStatus(item) : null;
}

export async function getClosedPeriodStatusByDate(params: {
  accountSetId?: string;
  date: string | number | Date;
}) {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const { fiscalYear, periodMonth } = toYearMonth(params.date);
  const row = await getPeriodStatusByMonth({
    accountSetId: resolvedAccountSetId,
    fiscalYear,
    periodMonth,
  });
  if (!row) return null;
  return Number(row.close_status || 0) === 1 ? row : null;
}

export async function getCarriedForwardPeriodStatusByDate(params: {
  accountSetId?: string;
  date: string | number | Date;
}) {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const { fiscalYear, periodMonth } = toYearMonth(params.date);
  const row = await getPeriodStatusByMonth({
    accountSetId: resolvedAccountSetId,
    fiscalYear,
    periodMonth,
  });
  if (!row) return null;
  return Number(row.carry_forward_status || 0) === 1 ? row : null;
}

export async function assertPeriodNotCarriedForwardByDate(params: {
  accountSetId?: string;
  date: string | number | Date;
  actionText?: string;
}) {
  const carriedRow = await getCarriedForwardPeriodStatusByDate(params);
  if (!carriedRow) return null;
  const actionText = String(params.actionText || '操作').trim() || '操作';
  throw new Error(`期间 ${carriedRow.period_code} 已结转，不能${actionText}`);
}

export async function assertPeriodNotClosedByDate(params: {
  accountSetId?: string;
  date: string | number | Date;
  actionText?: string;
}) {
  const closedRow = await getClosedPeriodStatusByDate(params);
  if (!closedRow) return null;
  const actionText = String(params.actionText || '操作').trim() || '操作';
  throw new Error(`期间 ${closedRow.period_code} 已关账，不能${actionText}`);
}

export async function resolveVoucherDateByPeriodStatus(params: {
  accountSetId?: string;
  date: string | number | Date;
  maxForwardMonths?: number;
}) {
  const maxForwardMonths = Math.max(1, Number(params.maxForwardMonths || 24));
  let currentDate = params.date instanceof Date ? new Date(params.date.getTime()) : new Date(params.date);
  if (Number.isNaN(currentDate.getTime())) {
    throw new Error('日期无效，无法判断结转关账期间');
  }

  for (let i = 0; i < maxForwardMonths; i += 1) {
    const row = await getPeriodStatusByMonth({
      accountSetId: resolveAccountSetId(params.accountSetId),
      fiscalYear: currentDate.getFullYear(),
      periodMonth: currentDate.getMonth() + 1,
    });

    const isCarryForwarded = Number(row?.carry_forward_status || 0) === 1;
    const isClosed = Number(row?.close_status || 0) === 1;
    if (!(isCarryForwarded && isClosed)) {
      return {
        voucherDate: currentDate,
        period: row,
        shifted: i > 0,
      };
    }

    currentDate = addMonths(currentDate, 1);
  }

  throw new Error('后续期间均已结转并关账，无法自动确定可用凭证月份');
}

export async function savePeriodStatus(params: SavePeriodStatusParams) {
  const existed = params.id || params.rowid
    ? { id: params.id || params.rowid }
    : await getPeriodStatusByMonth({
        accountSetId: params.account_set_id,
        fiscalYear: params.fiscal_year,
        periodMonth: params.period_month,
      });

  const payload = buildPeriodStatusPayload(params, existed?.id);
  const isUpdate = Boolean(existed?.id);

  try {
    await submitPeriodStatus(payload, isUpdate);
    return normalizePeriodStatus(payload as PeriodStatusRecord);
  } catch (error: any) {
    if (!isUpdate && isDuplicatePeriodError(error)) {
      const duplicated = await getPeriodStatusByMonth({
        accountSetId: params.account_set_id,
        fiscalYear: params.fiscal_year,
        periodMonth: params.period_month,
      });
      if (duplicated?.id) {
        const retryPayload = buildPeriodStatusPayload(params, duplicated.id);
        await submitPeriodStatus(retryPayload, true);
        return normalizePeriodStatus(retryPayload as PeriodStatusRecord);
      }
    }
    throw error;
  }
}

export async function initMissingPeriods(params: InitPeriodsParams) {
  const accountSetId = resolveAccountSetId(params.accountSetId);
  if (!accountSetId) throw new Error('缺少账套，无法初始化期间');
  const generated = buildPeriodRangeByDate(params.startDate, params.endDate);
  const existedRows = await getPeriodStatusList({ accountSetId, years: [...new Set(generated.map((item) => item.fiscal_year))] });
  const existedMap = new Map(existedRows.map((item) => [`${item.account_set_id}_${item.period_code}`, item]));

  let createdCount = 0;
  let updatedCount = 0;
  for (const item of generated) {
    const key = `${accountSetId}_${item.period_code}`;
    const existed = existedMap.get(key);
    if (!existed) {
      await savePeriodStatus({
        account_set_id: accountSetId,
        company_name: params.companyName || '',
        fiscal_year: item.fiscal_year,
        period_month: item.period_month,
        period_code: item.period_code,
        carry_forward_status: 0,
        close_status: 0,
        remark: `${params.remarkPrefix || '期间设置初始化'} ${item.period_code}`,
        start_date: item.start_date,
        end_date: item.end_date,
      });
      createdCount += 1;
      continue;
    }
    if (params.overwriteRange && (item.start_date !== existed.start_date || item.end_date !== existed.end_date)) {
      await savePeriodStatus({
        id: existed.id,
        account_set_id: accountSetId,
        company_name: existed.company_name || params.companyName || '',
        fiscal_year: item.fiscal_year,
        period_month: item.period_month,
        period_code: item.period_code,
        carry_forward_status: existed.carry_forward_status,
        close_status: existed.close_status,
        carry_forward_voucher_id: existed.carry_forward_voucher_id,
        carry_forward_voucher_code: existed.carry_forward_voucher_code,
        carry_forward_at: existed.carry_forward_at,
        carry_forward_by: existed.carry_forward_by,
        close_voucher_id: existed.close_voucher_id,
        close_at: existed.close_at,
        close_by: existed.close_by,
        last_reverse_at: existed.last_reverse_at,
        last_reverse_by: existed.last_reverse_by,
        remark: existed.remark || `${params.remarkPrefix || '期间范围修复'} ${item.period_code}`,
        start_date: item.start_date,
        end_date: item.end_date,
        description: existed.description,
      });
      updatedCount += 1;
    }
  }
  return { createdCount, updatedCount, totalCount: generated.length };
}
