import { generateUUID } from '@vben/utils';
import { addMoney, moneyNumber, toDecimal } from '#/utils/finance/decimal-money';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import {
  createVoucher,
  getVoucher,
  getVoucherPage,
  type ErpVoucherApi,
  updateVoucherMain,
} from '#/api/erp/finance/voucher';
import {
  getPeriodStatusByMonth,
  getPeriodStatusList,
  savePeriodStatus,
  type PeriodStatusRecord,
} from '#/api/erp/finance/period-status';
import {
  getSubjectOpeningList,
  saveSubjectOpeningList,
} from '#/api/erp/finance/settings/initial';
import { calculateSubjectYearBeginning } from '#/utils/finance/subject-opening';

const SUBJECT_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_TABLE = 'Bil_Subject_Info';
const SUBJECT_DB = 'LMBill';
const SUBJECT_PK = 'rowid';

const VOUCHER_MAIN_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_MAIN_TABLE = 'Bil_Voucher_Main';
const VOUCHER_MAIN_DB = 'LMBill';
const VOUCHER_MAIN_PK = 'rowid';

const VOUCHER_DETAIL_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_TABLE = 'Bil_Voucher_Detail';
const VOUCHER_DETAIL_DB = 'LMBill';
const VOUCHER_DETAIL_PK = 'rowid';

const CURRENT_YEAR_PROFIT_CODE = '3103';
const RETAINED_EARNINGS_CODE = '3104006';
const PROFIT_LOSS_SUBJECT_TYPE = '5';
const INCOME_TAX_EXPENSE_CODE = '5801';
const EPSILON = 0.004;
const SUBJECT_OPENING_SYNC_MARKER = '[AUTO_NEXT_YEAR_OPENING_SYNC]';

export interface PeriodCloseParams {
  period: string;
  voucherDate?: string;
  accountSetId?: string;
  companyName?: string;
  operator?: string;
  reviewer?: string;
}

export interface PeriodCloseLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface PeriodCloseSourceVoucher {
  voucherId: string;
  voucherCode: string;
  voucherDate: string;
  businessCode: string;
  businessName: string;
  summary: string;
  contributionAmount: number;
}

export interface PeriodCloseWarningItem {
  category: 'expense' | 'income';
  accountCode: string;
  accountName: string;
  amount: number;
  message: string;
  vouchers: PeriodCloseSourceVoucher[];
}

export interface PeriodClosePreviewResult {
  period: string;
  startDate: string;
  endDate: string;
  voucherDate: string;
  incomeLines: PeriodCloseLine[];
  expenseLines: PeriodCloseLine[];
  totalIncome: number;
  totalExpense: number;
  profitAmount: number;
  warnings: PeriodCloseWarningItem[];
  existingVoucher: null | {
    rowid?: string;
    voucher_code?: string;
    business_code?: string;
    business_name?: string;
    voucher_date?: string;
  };
  existingVoucherReusable: boolean;
  existingVoucherReuseMessage: string;
  yearEndExistingVoucher: null | {
    rowid?: string;
    voucher_code?: string;
    business_code?: string;
    business_name?: string;
    voucher_date?: string;
  };
  yearEndExistingVoucherReusable: boolean;
  yearEndExistingVoucherReuseMessage: string;
  currentYearProfitSubject: {
    code: string;
    name: string;
  };
  retainedEarningsSubject: null | {
    code: string;
    name: string;
  };
  incomeTaxExpenseSubject: null | {
    code: string;
    name: string;
  };
  yearEndTransferRequired: boolean;
  yearEndCurrentYearProfitBalance: number;
  yearEndTransferAmount: number;
}

export interface PeriodReversePreviewResult {
  period: string;
  startDate: string;
  endDate: string;
  canReverse: boolean;
  currentStatusText: string;
  canReverseReason: string;
  originalVoucher: null | {
    rowid: string;
    voucherCode: string;
    voucherDate: string;
    businessCode: string;
    businessName: string;
    isPosted: number;
    isReversed: number;
  };
  reverseVoucher: null | {
    rowid?: string;
    voucher_code?: string;
    voucher_date?: string;
    business_code?: string;
    business_name?: string;
  };
  blockedByPeriods: string[];
  reverseLineCount: number;
}

export interface PeriodDatasetParams {
  accountSetId?: string;
  accountSetIds?: string[];
  companyName?: string;
  startDate: string;
  endDate: string;
}

export interface PeriodCloseDataset {
  subjects: any[];
  voucherMains: any[];
  voucherDetails: any[];
  detailMap: Map<string, any[]>;
  incomeMap: Map<string, string>;
  expenseMap: Map<string, string>;
  currentYearProfitSubject: {
    code: string;
    name: string;
  };
  retainedEarningsSubject: null | {
    code: string;
    name: string;
  };
  datasetParams: PeriodDatasetParams;
}

function round2(value: number) {
  return moneyNumber(value);
}

function formatVoucherDateBoundary(value: any, boundary: 'start' | 'end') {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch?.[1] && dateOnlyMatch?.[2] && dateOnlyMatch?.[3]) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const date = boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
    return date.toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const date = boundary === 'start'
      ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0)
      : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
    return date.toISOString();
  }

  return raw;
}
function toArrayRows<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.list)) return value.list as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.data?.list)) return value.data.list as T[];
  if (Array.isArray(value?.data?.rows)) return value.data.rows as T[];
  if (Array.isArray(value?.data?.items)) return value.data.items as T[];
  return [];
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPeriodRange(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('期间格式错误，应为 YYYY-MM');
  }
  const start = new Date(year, month - 1, 1);
  const next = new Date(year, month, 1);
  const end = new Date(next.getTime() - 24 * 60 * 60 * 1000);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function getPeriodSortValue(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  return Number(yearText) * 100 + Number(monthText);
}

function resolveAccountSetId(accountSetId?: string) {
  return String(accountSetId || '').trim() || getStoredAccountSetId() || '';
}

function buildAccountSetConds(accountSetId?: string) {
  const resolvedId = resolveAccountSetId(accountSetId);
  return resolvedId ? [cond('account_set_id', 'equal', resolvedId)] : [];
}

async function queryTableItems(options: {
  modelId: string;
  tableName: string;
  dbName: string;
  pkName: string;
  filters: any[];
}) {
  const table = new DataTable(
    options.modelId,
    options.tableName,
    options.dbName,
    options.pkName,
  );
  table.Filter = options.filters.length > 0 ? and(...options.filters) : null;

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res as any);
  return toArrayRows(table.items);
}

async function querySubjects(params: {
  subjectType?: string;
  subjectNumbers?: string[];
  accountSetId?: string;
}) {
  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('subject_state', 'equal', 1),
  ];

  if (params.subjectType) {
    filters.push(cond('subject_type', 'equal', params.subjectType));
  }

  const subjectNumbers = [
    ...new Set(
      (params.subjectNumbers || [])
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  ];

  if (subjectNumbers.length === 1) {
    filters.push(cond('subject_number', 'equal', subjectNumbers[0]));
  } else if (subjectNumbers.length > 1) {
    filters.push(or(...subjectNumbers.map((item) => cond('subject_number', 'equal', item))));
  }

  filters.push(...buildAccountSetConds(params.accountSetId));

  const rows = await queryTableItems({
    modelId: SUBJECT_MODEL_ID,
    tableName: SUBJECT_TABLE,
    dbName: SUBJECT_DB,
    pkName: SUBJECT_PK,
    filters,
  });

  return rows;
}

async function queryVoucherMains(params: {
  startDate: string;
  endDate: string;
  accountSetId?: string;
  companyName?: string;
}) {
  const formattedStart = formatVoucherDateBoundary(params.startDate, 'start');
  const formattedEnd = formatVoucherDateBoundary(params.endDate, 'end');
  const res = await getVoucherPage({
    pageNo: 1,
    page: 0,
    recycleState: 0,
    voucherDateRange: [formattedStart, formattedEnd],
  });

  return toArrayRows(res?.list);
}

async function queryVoucherDetailsByVoucherIds(voucherIds: string[], accountSetId?: string) {
  const normalizedIds = [
    ...new Set(voucherIds.map((item) => String(item || '').trim()).filter(Boolean)),
  ];
  if (normalizedIds.length === 0) return [];

  const rows = await queryTableItems({
    modelId: VOUCHER_DETAIL_MODEL_ID,
    tableName: VOUCHER_DETAIL_TABLE,
    dbName: VOUCHER_DETAIL_DB,
    pkName: VOUCHER_DETAIL_PK,
    filters: [
      cond('lingma_sys_is_delete', 'notequal', 1),
      ...buildAccountSetConds(accountSetId),
    ],
  });

  return toArrayRows(rows).filter((item) =>
    normalizedIds.includes(String(item?.voucher_id || '').trim()),
  );
}

function normalizeDirection(value: any) {
  const text = String(value ?? '').trim();
  if (text === '借' || text.toLowerCase() === 'debit' || text === '1') return 1;
  if (text === '贷' || text.toLowerCase() === 'credit' || text === '2') return 2;
  const num = Number(value);
  if (num === 1 || num === 2) return num;
  return 0;
}

function buildSubjectBuckets(subjects: any[]) {
  const incomeMap = new Map<string, string>();
  const expenseMap = new Map<string, string>();
  let currentYearProfitSubject: null | { code: string; name: string } = null;
  let retainedEarningsSubject: null | { code: string; name: string } = null;
  let incomeTaxExpenseSubject: null | { code: string; name: string } = null;

  for (const item of subjects) {
    const code = String(item?.subject_number || '').trim();
    if (!code) continue;
    const name = String(item?.subject_name || code).trim() || code;
    const direction = normalizeDirection(item?.balance_direction);
    const subjectType = String(item?.subject_type || '').trim();

    if (subjectType === PROFIT_LOSS_SUBJECT_TYPE) {
      if (direction === 2) incomeMap.set(code, name);
      if (direction === 1) expenseMap.set(code, name);
    }

    if (direction === 1 && (code === INCOME_TAX_EXPENSE_CODE || /所得税/.test(name))) {
      expenseMap.set(code, name);
      if (!incomeTaxExpenseSubject || code === INCOME_TAX_EXPENSE_CODE) {
        incomeTaxExpenseSubject = { code, name: name || '所得税费用' };
      }
    }

    if (code === CURRENT_YEAR_PROFIT_CODE) {
      currentYearProfitSubject = { code, name: name || '本年利润' };
    }
    if (code === RETAINED_EARNINGS_CODE) {
      retainedEarningsSubject = { code, name: name || '未分配利润' };
    }
  }

  if (!currentYearProfitSubject) {
    throw new Error('未找到科目 3103（本年利润），无法执行期间结转');
  }

  return {
    incomeMap,
    expenseMap,
    currentYearProfitSubject,
    retainedEarningsSubject,
    incomeTaxExpenseSubject,
  };
}

function buildDetailMap(voucherDetails: any[]) {
  const map = new Map<string, any[]>();
  for (const item of voucherDetails) {
    const voucherId = String(item?.voucher_id || '').trim();
    if (!voucherId) continue;
    const list = map.get(voucherId) || [];
    list.push(item);
    map.set(voucherId, list);
  }
  return map;
}

function buildScopedPeriodBusinessCode(prefix: 'PERIOD-CLOSE' | 'PERIOD-PROFIT' | 'PERIOD-REVERSE', period: string, accountSetId?: string) {
  const normalizedPeriod = String(period || '').trim();
  const normalizedAccountSetId = String(accountSetId || '').trim();
  return normalizedAccountSetId ? `${prefix}-${normalizedAccountSetId}-${normalizedPeriod}` : `${prefix}-${normalizedPeriod}`;
}

function buildLegacyPeriodBusinessCode(prefix: 'PERIOD-CLOSE' | 'PERIOD-PROFIT' | 'PERIOD-REVERSE', period: string) {
  return `${prefix}-${String(period || '').trim()}`;
}

function buildPeriodBusinessCode(period: string, accountSetId?: string) {
  return buildScopedPeriodBusinessCode('PERIOD-CLOSE', period, accountSetId);
}

function buildLegacyPeriodCloseBusinessCode(period: string) {
  return buildLegacyPeriodBusinessCode('PERIOD-CLOSE', period);
}

function buildPeriodProfitBusinessCode(period: string, accountSetId?: string) {
  return buildScopedPeriodBusinessCode('PERIOD-PROFIT', period, accountSetId);
}

function buildLegacyPeriodProfitBusinessCode(period: string) {
  return buildLegacyPeriodBusinessCode('PERIOD-PROFIT', period);
}

function buildPeriodReverseBusinessCode(period: string, accountSetId?: string) {
  return buildScopedPeriodBusinessCode('PERIOD-REVERSE', period, accountSetId);
}

function escapeRegExp(text: string) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseVoucherNoByWord(code: string, word: string) {
  const normalizedWord = String(word || '').trim();
  const normalizedCode = String(code || '').trim();
  if (!normalizedWord || !normalizedCode) return null;
  const matched = normalizedCode.match(new RegExp(`^${escapeRegExp(normalizedWord)}[-]?\\s*(\\d+)$`));
  if (!matched?.[1]) return null;
  const num = Number(matched[1]);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : null;
}

function parseVoucherDescriptionMeta(description: unknown) {
  const text = String(description || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isPeriodCloseDescriptionType(description: unknown, type: string, period: string) {
  const meta = parseVoucherDescriptionMeta(description);
  return String(meta?.type || '') === type && String(meta?.period || '') === String(period || '');
}

async function getMonthlyNextVoucherCode(params: {
  voucherDate: string;
  accountSetId?: string;
  companyName?: string;
  voucherWord?: string;
}) {
  const voucherWord = String(params.voucherWord || '记').trim() || '记';
  const baseDate = new Date(params.voucherDate);
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error('凭证日期无效，无法生成凭证字号');
  }

  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const mains = await queryVoucherMains({
    startDate: formatDate(start),
    endDate: formatDate(end),
    accountSetId: params.accountSetId,
    companyName: params.companyName,
  });

  let maxNo = 0;
  for (const item of toArrayRows(mains)) {
    if (Number(item?.is_reversed ?? 0) === 1) continue;
    const rawCode = String(item?.voucher_code || item?.business_code || '').trim();
    const currentNo = parseVoucherNoByWord(rawCode, voucherWord);
    if (currentNo !== null && currentNo > maxNo) maxNo = currentNo;
  }

  return {
    voucherWord,
    voucherNo: maxNo + 1,
    voucherCode: `${voucherWord}${maxNo + 1}`,
  };
}

function hasMeaningfulAmount(amount: number) {
  return Math.abs(amount) > EPSILON;
}

function sortLines(lines: PeriodCloseLine[]) {
  return [...lines].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

function buildWarningMessage(category: 'expense' | 'income', line: PeriodCloseLine) {
  const subjectTypeLabel = category === 'income' ? '收入科目' : '费用科目';
  return `${subjectTypeLabel} ${line.accountCode} ${line.accountName} 本期净额为 ${line.amount.toFixed(2)}，系统已允许继续结转，并会按当前净额口径直接生成结转分录。请核对下列相关单据是否为退货、红字冲销或跨期调整。`;
}

function buildWarnings(options: {
  incomeLines: PeriodCloseLine[];
  expenseLines: PeriodCloseLine[];
  contributionMap: Map<string, PeriodCloseSourceVoucher[]>;
}) {
  const warnings: PeriodCloseWarningItem[] = [];

  for (const line of options.incomeLines.filter((item) => item.amount < -EPSILON)) {
    warnings.push({
      category: 'income',
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
      message: buildWarningMessage('income', line),
      vouchers: options.contributionMap.get(`income:${line.accountCode}`) || [],
    });
  }

  for (const line of options.expenseLines.filter((item) => item.amount < -EPSILON)) {
    warnings.push({
      category: 'expense',
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.amount,
      message: buildWarningMessage('expense', line),
      vouchers: options.contributionMap.get(`expense:${line.accountCode}`) || [],
    });
  }

  return warnings;
}

function buildReverseDetails(details: ErpVoucherApi.VoucherDetail[], accountSetId?: string) {
  return details
    .map((item) => {
      const debitAmount = round2(Number(item?.debit_amount || 0));
      const creditAmount = round2(Number(item?.credit_amount || 0));
      if (!hasMeaningfulAmount(debitAmount) && !hasMeaningfulAmount(creditAmount)) {
        return null;
      }
      return {
        rowid: generateUUID(),
        account_code: item.account_code,
        account_name: item.account_name,
        abstract_content: `${String(item.abstract_content || '期间结转')}（反结账冲销）`,
        debit_amount: creditAmount,
        credit_amount: debitAmount,
        account_set_id: accountSetId || item.account_set_id,
      } as ErpVoucherApi.VoucherDetail;
    })
    .filter(Boolean) as ErpVoucherApi.VoucherDetail[];
}

function buildReverseRemark(period: string, carryForwardVoucherCode?: string) {
  return carryForwardVoucherCode
    ? `期间 ${period} 已反结账，结转损益凭证保留：${carryForwardVoucherCode}`
    : `期间 ${period} 已反结账，无需保留结转损益凭证`;
}

function isYearEndPeriod(period: string) {
  return String(period || '').trim().endsWith('-12');
}

function buildCurrentYearProfitEntryFromPreview(preview: PeriodClosePreviewResult) {
  let detailDebitTotal = 0;
  let detailCreditTotal = 0;

  for (const row of preview.incomeLines) {
    const amount = round2(row.amount);
    if (!hasMeaningfulAmount(amount)) continue;
    detailDebitTotal = round2(detailDebitTotal + amount);
  }

  for (const row of preview.expenseLines) {
    const amount = round2(row.amount);
    if (!hasMeaningfulAmount(amount)) continue;
    detailCreditTotal = round2(detailCreditTotal + amount);
  }

  const net = round2(detailDebitTotal - detailCreditTotal);
  return {
    debit: net < 0 ? Math.abs(net) : 0,
    credit: net > 0 ? net : 0,
    balanceChange: round2((net > 0 ? net : 0) - (net < 0 ? Math.abs(net) : 0)),
  };
}

function buildProfitLossCarryForwardEntriesFromPreview(preview: PeriodClosePreviewResult) {
  const detailList = [];

  for (const row of preview.incomeLines) {
    const amount = round2(row.amount);
    if (!hasMeaningfulAmount(amount)) continue;
    detailList.push({
      accountCode: row.accountCode,
      accountName: row.accountName,
      abstractContent: '结转损益',
      debit: amount,
      credit: 0,
    });
  }

  for (const row of preview.expenseLines) {
    const amount = round2(row.amount);
    if (!hasMeaningfulAmount(amount)) continue;
    detailList.push({
      accountCode: row.accountCode,
      accountName: row.accountName,
      abstractContent: '结转损益',
      debit: 0,
      credit: amount,
    });
  }

  const currentYearProfitEntry = buildCurrentYearProfitEntryFromPreview(preview);
  if (hasMeaningfulAmount(currentYearProfitEntry.debit) || hasMeaningfulAmount(currentYearProfitEntry.credit)) {
    detailList.unshift({
      accountCode: preview.currentYearProfitSubject.code,
      accountName: preview.currentYearProfitSubject.name,
      abstractContent: '结转损益',
      debit: currentYearProfitEntry.debit,
      credit: currentYearProfitEntry.credit,
    });
  }

  return detailList;
}

function buildYearEndProfitCarryForwardEntriesFromPreview(preview: PeriodClosePreviewResult) {
  if (!preview.yearEndTransferRequired || !preview.retainedEarningsSubject || !hasMeaningfulAmount(preview.yearEndTransferAmount)) {
    return [];
  }

  if (preview.yearEndCurrentYearProfitBalance > 0) {
    return [
      {
        accountCode: preview.currentYearProfitSubject.code,
        accountName: preview.currentYearProfitSubject.name,
        abstractContent: '结转利润',
        debit: preview.yearEndTransferAmount,
        credit: 0,
      },
      {
        accountCode: preview.retainedEarningsSubject.code,
        accountName: preview.retainedEarningsSubject.name,
        abstractContent: '结转利润',
        debit: 0,
        credit: preview.yearEndTransferAmount,
      },
    ];
  }

  return [
    {
      accountCode: preview.retainedEarningsSubject.code,
      accountName: preview.retainedEarningsSubject.name,
      abstractContent: '结转利润',
      debit: preview.yearEndTransferAmount,
      credit: 0,
    },
    {
      accountCode: preview.currentYearProfitSubject.code,
      accountName: preview.currentYearProfitSubject.name,
      abstractContent: '结转利润',
      debit: 0,
      credit: preview.yearEndTransferAmount,
    },
  ];
}

function normalizeComparableEntries(entries) {
  return (entries || [])
    .map((item) => ({
      accountCode: String(item.accountCode || '').trim(),
      debit: round2(Number(item.debit || 0)),
      credit: round2(Number(item.credit || 0)),
    }))
    .filter((item) => item.accountCode && (hasMeaningfulAmount(item.debit) || hasMeaningfulAmount(item.credit)))
    .sort((a, b) => {
      const codeCompare = a.accountCode.localeCompare(b.accountCode);
      if (codeCompare !== 0) return codeCompare;
      if (a.debit !== b.debit) return a.debit - b.debit;
      return a.credit - b.credit;
    });
}

function normalizeVoucherEntryAmount(debitValue: any, creditValue: any) {
  let debit = moneyNumber(debitValue || 0);
  let credit = moneyNumber(creditValue || 0);

  if (toDecimal(debit).lessThan(0)) {
    credit = moneyNumber(addMoney([credit, Math.abs(debit)]));
    debit = 0;
  }
  if (toDecimal(credit).lessThan(0)) {
    debit = moneyNumber(addMoney([debit, Math.abs(credit)]));
    credit = 0;
  }

  return { debit, credit };
}

function buildVoucherDetailsFromEntries(entries, accountSetId) {
  return (entries || []).map((item) => ({
    rowid: generateUUID(),
    account_code: item.accountCode,
    account_name: item.accountName,
    abstract_content: item.abstractContent,
    debit_amount: round2(Number(item.debit || 0)),
    credit_amount: round2(Number(item.credit || 0)),
    account_set_id: accountSetId || undefined,
  }));
}

async function getCurrentYearProfitBalanceForYearEnd(options: {
  period: string;
  endDate: string;
  accountSetId?: string;
  companyName?: string;
  excludeVoucherId?: string;
}) {
  const [yearText] = String(options.period || '').split('-');
  const fiscalYear = Number(yearText);
  if (!fiscalYear) return 0;

  const startDate = `${yearText}-01-01`;
  const mains = await queryVoucherMains({
    startDate,
    endDate: options.endDate,
    accountSetId: options.accountSetId,
    companyName: options.companyName,
  });

  const voucherIds = toArrayRows(mains)
    .map((item) => String(item?.rowid || '').trim())
    .filter(Boolean);
  const details = await queryVoucherDetailsByVoucherIds(voucherIds, options.accountSetId);
  const detailMap = buildDetailMap(details as any[]);
  const excludeVoucherId = String(options.excludeVoucherId || '').trim();

  let balance = 0;
  for (const main of toArrayRows(mains)) {
    const voucherId = String(main?.rowid || '').trim();
    if (!voucherId) continue;
    if (voucherId === excludeVoucherId) continue;
    if (Number(main?.is_reversed ?? 0) === 1) continue;

    const detailsOfVoucher = detailMap.get(voucherId) || [];
    for (const detail of detailsOfVoucher as any[]) {
      const accountCode = String(detail?.account_code || '').trim();
      if (accountCode !== CURRENT_YEAR_PROFIT_CODE) continue;
      const debit = Number(detail?.debit_amount || 0);
      const credit = Number(detail?.credit_amount || 0);
      balance = round2(balance + credit - debit);
    }
  }

  return balance;
}

function buildExpectedPeriodCloseEntries(preview: PeriodClosePreviewResult) {
  return normalizeComparableEntries([
    ...buildProfitLossCarryForwardEntriesFromPreview(preview),
    ...buildYearEndProfitCarryForwardEntriesFromPreview(preview),
  ]);
}

function parseOpeningSyncDescription(description: unknown) {
  const text = String(description || '');
  const markerIndex = text.indexOf(SUBJECT_OPENING_SYNC_MARKER);
  if (markerIndex < 0) {
    return { baseDescription: text.trim(), meta: null };
  }

  const baseDescription = text.slice(0, markerIndex).trim();
  const metaText = text.slice(markerIndex + SUBJECT_OPENING_SYNC_MARKER.length).trim();
  if (!metaText) {
    return { baseDescription, meta: null };
  }

  try {
    return { baseDescription, meta: JSON.parse(metaText) };
  } catch {
    return { baseDescription: text.trim(), meta: null };
  }
}

function buildOpeningSyncDescription(baseDescription: unknown, meta: Record<string, any>) {
  const base = String(baseDescription || '').trim();
  const suffix = SUBJECT_OPENING_SYNC_MARKER + JSON.stringify(meta || {});
  return base ? `${base}\n${suffix}` : suffix;
}

function directionText(value: unknown) {
  const num = Number(value ?? 1);
  return num === 2 ? '贷' : '借';
}

function signedAmountByDirection(direction: '借' | '贷', debit: number, credit: number) {
  return direction === '借' ? Number(debit || 0) - Number(credit || 0) : Number(credit || 0) - Number(debit || 0);
}

function buildYearRange(period: string) {
  const [yearText] = String(period || '').split('-');
  const year = Number(yearText || 0);
  if (!year) throw new Error('期间格式错误，无法计算年度范围');
  return {
    fiscalYear: year,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    nextFiscalYear: year + 1,
  };
}

async function queryBalanceSheetLeafSubjects(accountSetId?: string) {
  const rows = await queryTableItems({
    modelId: SUBJECT_MODEL_ID,
    tableName: SUBJECT_TABLE,
    dbName: SUBJECT_DB,
    pkName: SUBJECT_PK,
    filters: [
      cond('lingma_sys_is_delete', 'notequal', 1),
      cond('subject_state', 'equal', 1),
      cond('is_leaf_subject', 'equal', 1),
      or(
        cond('subject_type', 'equal', '1'),
        cond('subject_type', 'equal', '2'),
        cond('subject_type', 'equal', '3'),
      ),
      ...buildAccountSetConds(accountSetId),
    ],
  });

  return (rows || [])
    .filter((item: any) => String(item?.subject_number || '').trim())
    .sort((a: any, b: any) => String(a?.subject_number || '').localeCompare(String(b?.subject_number || '')));
}

async function buildNextYearOpeningPayloads(params: { period: string; accountSetId?: string; companyName?: string }) {
  const { fiscalYear, startDate, endDate, nextFiscalYear } = buildYearRange(params.period);
  const accountSetId = resolveAccountSetId(params.accountSetId);
  if (!accountSetId) throw new Error('缺少账套，无法同步下一年度期初');

  const [subjects, openingRes, voucherMains] = await Promise.all([
    queryBalanceSheetLeafSubjects(accountSetId),
    getSubjectOpeningList({ account_set_id: accountSetId, lingma_sys_is_delete: 0, pageNo: 1, page: 9999 }),
    queryVoucherMains({ startDate, endDate, accountSetId, companyName: params.companyName }),
  ]);

  const currentOpeningMap = new Map<string, any>();
  for (const item of toArrayRows(openingRes)) {
    const code = String((item as any)?.subject_code || '').trim();
    if (code) currentOpeningMap.set(code, item);
  }

  const voucherIds = (voucherMains || []).map((item: any) => String(item?.rowid || '').trim()).filter(Boolean);
  const voucherDetails = await queryVoucherDetailsByVoucherIds(voucherIds, accountSetId);
  const aggMap = new Map<string, { debit: number; credit: number }>();
  for (const detail of toArrayRows(voucherDetails)) {
    const code = String((detail as any)?.account_code || '').trim();
    if (!code) continue;
    const current = aggMap.get(code) || { debit: 0, credit: 0 };
    current.debit += Number((detail as any)?.debit_amount || 0) || 0;
    current.credit += Number((detail as any)?.credit_amount || 0) || 0;
    aggMap.set(code, current);
  }

  const nextOpeningRes = await getSubjectOpeningList({ account_set_id: accountSetId, lingma_sys_is_delete: 0, pageNo: 1, page: 9999 });
  const nextOpeningMap = new Map<string, any>();
  for (const item of toArrayRows(nextOpeningRes)) {
    const code = String((item as any)?.subject_code || '').trim();
    if (code) nextOpeningMap.set(code, item);
  }

  const changedList: any[] = [];
  for (const subject of subjects || []) {
    const subjectCode = String((subject as any)?.subject_number || '').trim();
    if (!subjectCode) continue;
    const subjectName = String((subject as any)?.subject_name || '').trim() || subjectCode;
    const subjectType = String((subject as any)?.subject_type || '').trim();
    const balanceDirection = Number((subject as any)?.balance_direction ?? 1) || 1;
    const currentOpening = currentOpeningMap.get(subjectCode);
    const nextOpening = nextOpeningMap.get(subjectCode);
    const currentYearBeginning = calculateSubjectYearBeginning(
      currentOpening,
      balanceDirection,
    );
    const agg = aggMap.get(subjectCode) || { debit: 0, credit: 0 };
    const endingSigned = round2(
      currentYearBeginning
      + signedAmountByDirection(
        directionText(balanceDirection) as '借' | '贷',
        agg.debit,
        agg.credit,
      ),
    );

    const parsed = parseOpeningSyncDescription(nextOpening?.description);
    const previousMeta = parsed.meta && parsed.meta.sourcePeriod === params.period ? parsed.meta : null;
    const baseDescription = previousMeta ? String(previousMeta.prevDescriptionBase || '') : parsed.baseDescription;
    const meta = {
      sourcePeriod: params.period,
      sourceFiscalYear: fiscalYear,
      targetFiscalYear: nextFiscalYear,
      createdFromEmpty: !nextOpening?.rowid,
      prevYearBeginningBalance: previousMeta ? previousMeta.prevYearBeginningBalance : (nextOpening?.year_beginning_balance ?? null),
      prevBeginningBalance: previousMeta ? previousMeta.prevBeginningBalance : (nextOpening?.beginning_balance ?? null),
      prevDebitBalanceSum: previousMeta ? previousMeta.prevDebitBalanceSum : Number(nextOpening?.debit_balance_sum ?? 0),
      prevCebitBalanceSum: previousMeta ? previousMeta.prevCebitBalanceSum : Number(nextOpening?.cebit_balance_sum ?? 0),
      prevDescriptionBase: baseDescription,
    };

    changedList.push({
      rowid: nextOpening?.rowid || generateUUID(),
      account_set_id: accountSetId,
      account_id: String(nextOpening?.account_id || currentOpening?.account_id || accountSetId),
      subject_code: subjectCode,
      subject_name: subjectName,
      subject_type: subjectType,
      is_leaf_subject: Number((subject as any)?.is_leaf_subject ?? 1),
      balance_direction: balanceDirection,
      lingma_sys_is_delete: 0,
      year_beginning_balance: endingSigned,
      beginning_balance: endingSigned,
      debit_balance_sum: 0,
      cebit_balance_sum: 0,
      description: buildOpeningSyncDescription(baseDescription, meta),
    });
  }

  return changedList;
}

async function syncNextYearSubjectOpenings(params: { period: string; accountSetId?: string; companyName?: string }) {
  if (!isYearEndPeriod(params.period)) return { synced: 0 };
  const changedList = await buildNextYearOpeningPayloads(params);
  if (changedList.length === 0) return { synced: 0 };
  await saveSubjectOpeningList(changedList);
  return { synced: changedList.length };
}

async function rollbackNextYearSubjectOpenings(params: { period: string; accountSetId?: string }) {
  if (!isYearEndPeriod(params.period)) return { restored: 0, removed: 0 };
  const accountSetId = resolveAccountSetId(params.accountSetId);
  if (!accountSetId) throw new Error('缺少账套，无法回退下一年度期初');

  const openingRes = await getSubjectOpeningList({ account_set_id: accountSetId, lingma_sys_is_delete: 0, pageNo: 1, page: 9999 });
  const changedList: any[] = [];
  let restored = 0;
  let removed = 0;

  for (const item of toArrayRows(openingRes)) {
    const parsed = parseOpeningSyncDescription((item as any)?.description);
    const meta = parsed.meta;
    if (!meta || meta.sourcePeriod !== params.period) continue;

    if (meta.createdFromEmpty) {
      changedList.push({ rowid: (item as any).rowid, lingma_sys_is_delete: 1, account_set_id: accountSetId });
      removed += 1;
      continue;
    }

    changedList.push({
      rowid: (item as any).rowid,
      account_set_id: accountSetId,
      lingma_sys_is_delete: 0,
      year_beginning_balance: meta.prevYearBeginningBalance ?? 0,
      beginning_balance: meta.prevBeginningBalance ?? 0,
      debit_balance_sum: Number(meta.prevDebitBalanceSum ?? 0),
      cebit_balance_sum: Number(meta.prevCebitBalanceSum ?? 0),
      description: String(meta.prevDescriptionBase || ''),
    });
    restored += 1;
  }

  if (changedList.length > 0) {
    await saveSubjectOpeningList(changedList);
  }
  return { restored, removed };
}

function buildActualPeriodCloseEntries(details: ErpVoucherApi.VoucherDetail[]) {
  return (details || [])
    .map((item) => ({
      accountCode: String(item?.account_code || '').trim(),
      debit: round2(Number(item?.debit_amount || 0)),
      credit: round2(Number(item?.credit_amount || 0)),
    }))
    .filter((item) => item.accountCode && (hasMeaningfulAmount(item.debit) || hasMeaningfulAmount(item.credit)))
    .sort((a, b) => {
      const codeCompare = a.accountCode.localeCompare(b.accountCode);
      if (codeCompare !== 0) return codeCompare;
      if (a.debit !== b.debit) return a.debit - b.debit;
      return a.credit - b.credit;
    });
}

function comparePeriodCloseEntries(expectedEntries, details, changeMessage, successMessage) {
  const expected = normalizeComparableEntries(expectedEntries);
  const actual = buildActualPeriodCloseEntries(details);
  if (expected.length !== actual.length) {
    return {
      reusable: false,
      message: changeMessage,
    };
  }

  for (let index = 0; index < expected.length; index += 1) {
    const e = expected[index];
    const a = actual[index];
    if (!a || e.accountCode !== a.accountCode || Math.abs(e.debit - a.debit) > EPSILON || Math.abs(e.credit - a.credit) > EPSILON) {
      return {
        reusable: false,
        message: changeMessage,
      };
    }
  }

  return {
    reusable: true,
    message: successMessage,
  };
}

function isClosedStatus(status: null | PeriodStatusRecord) {
  return Number(status?.carry_forward_status || 0) === 1 && Number(status?.close_status || 0) === 1;
}

export async function loadPeriodCloseDataset(
  params: PeriodDatasetParams,
): Promise<PeriodCloseDataset> {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const [profitLossSubjects, fixedSubjects, voucherMains] = await Promise.all([
    querySubjects({ subjectType: PROFIT_LOSS_SUBJECT_TYPE, accountSetId: resolvedAccountSetId }),
    querySubjects({
      subjectNumbers: [CURRENT_YEAR_PROFIT_CODE, RETAINED_EARNINGS_CODE, INCOME_TAX_EXPENSE_CODE],
      accountSetId: resolvedAccountSetId,
    }),
    queryVoucherMains({
      startDate: params.startDate,
      endDate: params.endDate,
      accountSetId: resolvedAccountSetId,
      companyName: params.companyName,
    }),
  ]);

  const subjects = [...profitLossSubjects, ...fixedSubjects];
  const voucherIds = toArrayRows(voucherMains)
    .map((item) => String(item?.rowid || '').trim())
    .filter(Boolean);
  const voucherDetails = await queryVoucherDetailsByVoucherIds(voucherIds, resolvedAccountSetId);
  const detailMap = buildDetailMap(toArrayRows(voucherDetails));
  const subjectBuckets = buildSubjectBuckets(subjects);

  return {
    subjects,
    voucherMains: toArrayRows(voucherMains),
    voucherDetails: toArrayRows(voucherDetails),
    detailMap,
    ...subjectBuckets,
    datasetParams: {
      accountSetId: resolvedAccountSetId,
      startDate: params.startDate,
      endDate: params.endDate,
      companyName: params.companyName,
    },
  };
}

export async function getPeriodClosePreviewFromDataset(
  params: PeriodCloseParams,
  dataset: PeriodCloseDataset,
): Promise<PeriodClosePreviewResult> {
  const period = String(params.period || '').trim();
  const { startDate, endDate } = getPeriodRange(period);
  const voucherDate = params.voucherDate || endDate;
  const periodBusinessCode = buildPeriodBusinessCode(period, dataset.datasetParams.accountSetId);
  const legacyPeriodBusinessCode = buildLegacyPeriodCloseBusinessCode(period);
  const periodProfitBusinessCode = buildPeriodProfitBusinessCode(period, dataset.datasetParams.accountSetId);
  const legacyPeriodProfitBusinessCode = buildLegacyPeriodProfitBusinessCode(period);

  const mainsAll = (dataset.voucherMains || []).filter((item: any) => {
    const voucherDateText = String(item?.voucher_date || '').slice(0, 10);
    return voucherDateText >= startDate && voucherDateText <= endDate;
  });

  const existingVoucher =
    (mainsAll as any[]).find((item) => {
      if (Number(item?.is_reversed ?? 0) === 1) return false;
      return (
        String(item?.business_code || '') === periodBusinessCode ||
        String(item?.business_code || '') === legacyPeriodBusinessCode ||
        String(item?.business_name || '').includes('结转损益') ||
        String(item?.business_name || '').includes('期间结转') ||
        isPeriodCloseDescriptionType(item?.description, 'period-close-profit-loss', period)
      );
    }) || null;

  const yearEndExistingVoucher =
    (mainsAll as any[]).find((item) => {
      if (Number(item?.is_reversed ?? 0) === 1) return false;
      return (
        String(item?.business_code || '') === periodProfitBusinessCode ||
        String(item?.business_code || '') === legacyPeriodProfitBusinessCode ||
        String(item?.business_name || '').includes('结转利润') ||
        isPeriodCloseDescriptionType(item?.description, 'period-close-profit-transfer', period)
      );
    }) || null;

  const mains = (mainsAll as any[]).filter((item) => {
    if (Number(item?.is_reversed ?? 0) === 1) return false;
    if (String(item?.business_code || '') === periodBusinessCode) return false;
    if (String(item?.business_code || '') === legacyPeriodBusinessCode) return false;
    if (String(item?.business_code || '') === periodProfitBusinessCode) return false;
    if (String(item?.business_code || '') === legacyPeriodProfitBusinessCode) return false;
    if (String(item?.business_name || '').includes('期间结转')) return false;
    if (String(item?.business_name || '').includes('结转损益')) return false;
    if (String(item?.business_name || '').includes('结转利润')) return false;
    if (isPeriodCloseDescriptionType(item?.description, 'period-close-profit-loss', period)) return false;
    if (isPeriodCloseDescriptionType(item?.description, 'period-close-profit-transfer', period)) return false;
    if (String(item?.business_code || '').startsWith('PERIOD-REVERSE-')) return false;
    return true;
  });

  const incomeAgg = new Map<string, number>();
  const expenseAgg = new Map<string, number>();
  const contributionMap = new Map<string, PeriodCloseSourceVoucher[]>();

  for (const main of mains) {
    const voucherId = String(main?.rowid || '').trim();
    if (!voucherId) continue;
    const details = dataset.detailMap.get(voucherId) || [];
    for (const detail of details as any[]) {
      const accountCode = String(detail?.account_code || '').trim();
      if (!accountCode) continue;
      const debit = Number(detail?.debit_amount || 0);
      const credit = Number(detail?.credit_amount || 0);

      let category: '' | 'expense' | 'income' = '';
      let contributionAmount = 0;

      if (dataset.incomeMap.has(accountCode)) {
        contributionAmount = round2(credit - debit);
        incomeAgg.set(accountCode, round2((incomeAgg.get(accountCode) || 0) + contributionAmount));
        category = 'income';
      }
      if (dataset.expenseMap.has(accountCode)) {
        contributionAmount = round2(debit - credit);
        expenseAgg.set(accountCode, round2((expenseAgg.get(accountCode) || 0) + contributionAmount));
        category = 'expense';
      }

      if (category && hasMeaningfulAmount(contributionAmount)) {
        const key = `${category}:${accountCode}`;
        const list = contributionMap.get(key) || [];
        list.push({
          voucherId,
          voucherCode: String(main?.voucher_code || main?.business_code || voucherId),
          voucherDate: String(main?.voucher_date || ''),
          businessCode: String(main?.business_code || ''),
          businessName: String(main?.business_name || ''),
          summary: String(detail?.abstract_content || detail?.summary || main?.description || ''),
          contributionAmount,
        });
        contributionMap.set(key, list);
      }
    }
  }

  const incomeLines: PeriodCloseLine[] = sortLines(
    [...incomeAgg.entries()]
      .map(([accountCode, amount]) => ({
        accountCode,
        accountName: dataset.incomeMap.get(accountCode) || accountCode,
        amount: round2(amount),
      }))
      .filter((item) => hasMeaningfulAmount(item.amount)),
  );

  const expenseLines: PeriodCloseLine[] = sortLines(
    [...expenseAgg.entries()]
      .map(([accountCode, amount]) => ({
        accountCode,
        accountName: dataset.expenseMap.get(accountCode) || accountCode,
        amount: round2(amount),
      }))
      .filter((item) => hasMeaningfulAmount(item.amount)),
  );

  for (const [key, list] of contributionMap.entries()) {
    contributionMap.set(
      key,
      [...list]
        .sort((a, b) => Math.abs(b.contributionAmount) - Math.abs(a.contributionAmount))
        .slice(0, 20),
    );
  }

  const warnings = buildWarnings({ incomeLines, expenseLines, contributionMap });
  const totalIncome = round2(incomeLines.reduce((sum, item) => sum + Math.max(item.amount, 0), 0));
  const totalExpense = round2(expenseLines.reduce((sum, item) => sum + Math.max(item.amount, 0), 0));
  const incomeLossAdjustment = round2(
    incomeLines.filter((item) => item.amount < -EPSILON).reduce((sum, item) => sum + Math.abs(item.amount), 0),
  );
  const expenseProfitAdjustment = round2(
    expenseLines.filter((item) => item.amount < -EPSILON).reduce((sum, item) => sum + Math.abs(item.amount), 0),
  );
  const profitAmount = round2(totalIncome - totalExpense - incomeLossAdjustment + expenseProfitAdjustment);

  const currentYearProfitEntry = buildCurrentYearProfitEntryFromPreview({
    period,
    startDate,
    endDate,
    voucherDate,
    incomeLines,
    expenseLines,
    totalIncome,
    totalExpense,
    profitAmount,
    warnings,
    existingVoucher,
    existingVoucherReusable: false,
    existingVoucherReuseMessage: '',
    currentYearProfitSubject: dataset.currentYearProfitSubject,
    retainedEarningsSubject: dataset.retainedEarningsSubject,
    incomeTaxExpenseSubject: dataset.incomeTaxExpenseSubject,
    yearEndTransferRequired: false,
    yearEndCurrentYearProfitBalance: 0,
    yearEndTransferAmount: 0,
  });

  const yearEndTransferBaseBalance = isYearEndPeriod(period)
    ? await getCurrentYearProfitBalanceForYearEnd({
        period,
        endDate,
        accountSetId: dataset.datasetParams.accountSetId,
        companyName: dataset.datasetParams.companyName,
        excludeVoucherId: String(existingVoucher?.rowid || ''),
      })
    : 0;
  const yearEndCurrentYearProfitBalance = isYearEndPeriod(period)
    ? round2(yearEndTransferBaseBalance + currentYearProfitEntry.balanceChange)
    : 0;
  const yearEndTransferAmount = round2(Math.abs(yearEndCurrentYearProfitBalance));
  const yearEndTransferRequired = Boolean(
    isYearEndPeriod(period) &&
      dataset.retainedEarningsSubject &&
      hasMeaningfulAmount(yearEndTransferAmount),
  );

  const previewForVoucherCompare = {
    period,
    startDate,
    endDate,
    voucherDate,
    incomeLines,
    expenseLines,
    totalIncome,
    totalExpense,
    profitAmount,
    warnings,
    existingVoucher,
    existingVoucherReusable: false,
    existingVoucherReuseMessage: '',
    yearEndExistingVoucher,
    yearEndExistingVoucherReusable: false,
    yearEndExistingVoucherReuseMessage: '',
    currentYearProfitSubject: dataset.currentYearProfitSubject,
    retainedEarningsSubject: dataset.retainedEarningsSubject,
    incomeTaxExpenseSubject: dataset.incomeTaxExpenseSubject,
    yearEndTransferRequired,
    yearEndCurrentYearProfitBalance,
    yearEndTransferAmount,
  };

  let existingVoucherReusable = false;
  let existingVoucherReuseMessage = '无原结转损益凭证，执行时自动生成。';
  if (existingVoucher?.rowid) {
    const existingVoucherData = await getVoucher(String(existingVoucher.rowid || ''));
    if (existingVoucherData?.main && Number(existingVoucherData.main.is_reversed || 0) !== 1) {
      const compareResult = comparePeriodCloseEntries(
        buildProfitLossCarryForwardEntriesFromPreview(previewForVoucherCompare),
        existingVoucherData.details || [],
        '检测到结转损益凭证已发生变化，请先删除原结转损益凭证，再重新结账。',
        '未检测到结转损益凭证变化，可直接复用。',
      );
      existingVoucherReusable = compareResult.reusable;
      existingVoucherReuseMessage = compareResult.message;
    } else {
      existingVoucherReuseMessage = '原结转损益凭证已失效，请先删除旧凭证后重新结账。';
    }
  }

  let yearEndExistingVoucherReusable = !yearEndTransferRequired;
  let yearEndExistingVoucherReuseMessage = yearEndTransferRequired
    ? '无原结转利润凭证，执行时自动生成。'
    : '当前期间无需生成结转利润凭证。';
  if (yearEndTransferRequired && yearEndExistingVoucher?.rowid) {
    const existingYearEndVoucherData = await getVoucher(String(yearEndExistingVoucher.rowid || ''));
    if (existingYearEndVoucherData?.main && Number(existingYearEndVoucherData.main.is_reversed || 0) !== 1) {
      const compareResult = comparePeriodCloseEntries(
        buildYearEndProfitCarryForwardEntriesFromPreview(previewForVoucherCompare),
        existingYearEndVoucherData.details || [],
        '检测到结转利润凭证已发生变化，请先删除原结转利润凭证，再重新结账。',
        '未检测到结转利润凭证变化，可直接复用。',
      );
      yearEndExistingVoucherReusable = compareResult.reusable;
      yearEndExistingVoucherReuseMessage = compareResult.message;
    } else {
      yearEndExistingVoucherReuseMessage = '原结转利润凭证已失效，请先删除旧凭证后重新结账。';
    }
  }

  return {
    period,
    startDate,
    endDate,
    voucherDate,
    incomeLines,
    expenseLines,
    totalIncome,
    totalExpense,
    profitAmount,
    warnings,
    existingVoucher,
    existingVoucherReusable,
    existingVoucherReuseMessage,
    yearEndExistingVoucher,
    yearEndExistingVoucherReusable,
    yearEndExistingVoucherReuseMessage,
    currentYearProfitSubject: dataset.currentYearProfitSubject,
    retainedEarningsSubject: dataset.retainedEarningsSubject,
    incomeTaxExpenseSubject: dataset.incomeTaxExpenseSubject,
    yearEndTransferRequired,
    yearEndCurrentYearProfitBalance,
    yearEndTransferAmount,
  };
}

export async function getPeriodClosePreview(
  params: PeriodCloseParams,
): Promise<PeriodClosePreviewResult> {
  const { startDate, endDate } = getPeriodRange(params.period);
  const dataset = await loadPeriodCloseDataset({
    accountSetId: params.accountSetId,
    companyName: params.companyName,
    startDate,
    endDate,
  });
  return await getPeriodClosePreviewFromDataset(params, dataset);
}

async function getReverseContext(params: PeriodCloseParams) {
  const period = String(params.period || '').trim();
  if (!period) throw new Error('期间不能为空');
  const { startDate, endDate } = getPeriodRange(period);
  const [yearText, monthText] = period.split('-');
  const fiscalYear = Number(yearText);
  const periodMonth = Number(monthText);
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  if (!resolvedAccountSetId) {
    throw new Error('反结账必须指定账套');
  }

  const status = await getPeriodStatusByMonth({
    accountSetId: resolvedAccountSetId,
    fiscalYear,
    periodMonth,
  });

  const allStatuses = await getPeriodStatusList({
    accountSetId: resolvedAccountSetId,
    companyName: params.companyName || undefined,
  });

  const laterClosedPeriods = allStatuses
    .filter(
      (item) => isClosedStatus(item) && getPeriodSortValue(String(item.period_code || '')) > getPeriodSortValue(period),
    )
    .map((item) => String(item.period_code || ''))
    .sort((a, b) => getPeriodSortValue(a) - getPeriodSortValue(b));

  const originalVoucherId = String(status?.carry_forward_voucher_id || status?.close_voucher_id || '').trim();
  const originalVoucher = originalVoucherId ? await getVoucher(originalVoucherId) : null;
  return {
    period,
    startDate,
    endDate,
    status,
    laterClosedPeriods,
    originalVoucher,
  };
}

export async function getPeriodReversePreview(
  params: PeriodCloseParams,
): Promise<PeriodReversePreviewResult> {
  const context = await getReverseContext(params);
  const status = context.status;
  const originalVoucher = context.originalVoucher?.main
    ? {
        rowid: String(context.originalVoucher.main.rowid || ''),
        voucherCode: String(
          context.originalVoucher.main.voucher_code ||
            context.originalVoucher.main.business_code ||
            context.originalVoucher.main.rowid ||
            '',
        ),
        voucherDate: String(context.originalVoucher.main.voucher_date || ''),
        businessCode: String(context.originalVoucher.main.business_code || ''),
        businessName: String(context.originalVoucher.main.business_name || ''),
        isPosted: Number(context.originalVoucher.main.is_posted || 0),
        isReversed: Number(context.originalVoucher.main.is_reversed || 0),
      }
    : null;

  let canReverse = true;
  let canReverseReason = '当前期间可执行反结账。';

  if (!isClosedStatus(status)) {
    canReverse = false;
    canReverseReason = '当前期间不是“已结转且已结账”状态，不能反结账。';
  } else if (context.laterClosedPeriods.length > 0) {
    canReverse = false;
    canReverseReason = `存在后续已结账期间：${context.laterClosedPeriods.join('、')}，请先从最新期间开始依次反结账。`;
  } else if (!originalVoucher) {
    canReverseReason = '当前期间未找到原结转损益凭证，系统将只恢复期间状态，不会额外处理凭证。';
  } else if (originalVoucher.isReversed === 1) {
    canReverseReason = '原结转损益凭证已被冲销，系统将只恢复期间状态，便于继续调整当期凭证。';
  }

  return {
    period: context.period,
    startDate: context.startDate,
    endDate: context.endDate,
    canReverse,
    currentStatusText: isClosedStatus(status) ? '已结转损益、已结账' : '未完成结账',
    canReverseReason,
    originalVoucher,
    reverseVoucher: null,
    blockedByPeriods: context.laterClosedPeriods,
    reverseLineCount: context.originalVoucher?.details?.length || 0,
  };
}

export async function createPeriodCloseVoucherByPreview(
  preview: PeriodClosePreviewResult,
  params: PeriodCloseParams,
) {
  if (preview.existingVoucher && !preview.existingVoucherReusable) {
    throw new Error(preview.existingVoucherReuseMessage || '检测到结转损益凭证已变化，请先删除原结转损益凭证，再重新结账。');
  }
  if (preview.yearEndExistingVoucher && !preview.yearEndExistingVoucherReusable) {
    throw new Error(preview.yearEndExistingVoucherReuseMessage || '检测到结转利润凭证已变化，请先删除原结转利润凭证，再重新结账。');
  }

  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const profitLossEntries = buildProfitLossCarryForwardEntriesFromPreview(preview);
  const yearEndProfitEntries = buildYearEndProfitCarryForwardEntriesFromPreview(preview);

  if (profitLossEntries.length === 0 && yearEndProfitEntries.length === 0) {
    return {
      preview,
      voucherId: '',
      voucherCode: '',
      carryForwardVoucherId: '',
      carryForwardVoucherCode: '',
      yearEndVoucherId: '',
      yearEndVoucherCode: '',
    };
  }

  let nextVoucherSeed = null;

  async function allocateNextVoucherCode() {
    if (!nextVoucherSeed) {
      nextVoucherSeed = await getMonthlyNextVoucherCode({
        voucherDate: preview.voucherDate,
        accountSetId: resolvedAccountSetId,
        companyName: params.companyName,
        voucherWord: '记',
      });
      return { ...nextVoucherSeed };
    }
    nextVoucherSeed = {
      ...nextVoucherSeed,
      voucherNo: Number(nextVoucherSeed.voucherNo || 0) + 1,
      voucherCode: `${nextVoucherSeed.voucherWord}${Number(nextVoucherSeed.voucherNo || 0) + 1}`,
    };
    return { ...nextVoucherSeed };
  }

  async function createStageVoucher(options) {
    const detailList = buildVoucherDetailsFromEntries(options.entries, resolvedAccountSetId);
    const totalDebitAmount = moneyNumber(addMoney(detailList.map((item) => item.debit_amount)));
    const totalCreditAmount = moneyNumber(addMoney(detailList.map((item) => item.credit_amount)));
    const nextVoucher = await allocateNextVoucherCode();

    const res = await createVoucher(
      {
        rowid: generateUUID(),
        voucher_type: nextVoucher.voucherWord,
        voucher_code: nextVoucher.voucherCode,
        business_name: options.businessName,
        business_code: options.businessCode,
        description: JSON.stringify({
          periodBusinessCode: options.businessCode,
          type: options.descriptionType,
          stage: options.stage,
          period: params.period,
          startDate: preview.startDate,
          endDate: preview.endDate,
          totalIncome: preview.totalIncome,
          totalExpense: preview.totalExpense,
          profitAmount: preview.profitAmount,
          warnings: preview.warnings,
          voucherWord: nextVoucher.voucherWord,
          voucherNo: nextVoucher.voucherNo,
          yearEndTransferRequired: preview.yearEndTransferRequired,
          yearEndCurrentYearProfitBalance: preview.yearEndCurrentYearProfitBalance,
          yearEndTransferAmount: preview.yearEndTransferAmount,
          retainedEarningsSubject: preview.retainedEarningsSubject,
        }),
        voucher_date: preview.voucherDate,
        operator: params.operator,
        reviewer: params.reviewer,
        account_set_id: resolvedAccountSetId || undefined,
        debit_amount: totalDebitAmount,
        credit_amount: totalCreditAmount,
        is_posted: 0,
        is_reversed: 0,
      },
      detailList,
    );

    return {
      voucherId: String((res as any)?.rowid || ''),
      voucherCode: String((res as any)?.voucher_code || nextVoucher.voucherCode || ''),
    };
  }

  let carryForwardVoucherId = String(preview.existingVoucher?.rowid || '');
  let carryForwardVoucherCode = String(preview.existingVoucher?.voucher_code || '');
  if (!carryForwardVoucherId && profitLossEntries.length > 0) {
    const created = await createStageVoucher({
      entries: profitLossEntries,
      businessName: '结转损益',
      businessCode: buildPeriodBusinessCode(params.period, resolvedAccountSetId),
      descriptionType: 'period-close-profit-loss',
      stage: 'profit-loss',
    });
    carryForwardVoucherId = created.voucherId;
    carryForwardVoucherCode = created.voucherCode;
  }

  let openingSyncResult = { synced: 0 };
  let yearEndVoucherId = String(preview.yearEndExistingVoucher?.rowid || '');
  let yearEndVoucherCode = String(preview.yearEndExistingVoucher?.voucher_code || '');
  if (!yearEndVoucherId && yearEndProfitEntries.length > 0) {
    const created = await createStageVoucher({
      entries: yearEndProfitEntries,
      businessName: '结转利润',
      businessCode: buildPeriodProfitBusinessCode(params.period, resolvedAccountSetId),
      descriptionType: 'period-close-profit-transfer',
      stage: 'profit-transfer',
    });
    yearEndVoucherId = created.voucherId;
    yearEndVoucherCode = created.voucherCode;
  }

  if (isYearEndPeriod(params.period)) {
    openingSyncResult = await syncNextYearSubjectOpenings({
      period: params.period,
      accountSetId: resolvedAccountSetId,
      companyName: params.companyName,
    });
  }

  return {
    preview,
    voucherId: yearEndVoucherId || carryForwardVoucherId,
    voucherCode: yearEndVoucherCode || carryForwardVoucherCode,
    carryForwardVoucherId,
    carryForwardVoucherCode,
    yearEndVoucherId,
    yearEndVoucherCode,
    openingSyncResult,
  };
}

export async function createPeriodCloseVoucher(params: PeriodCloseParams) {
  const preview = await getPeriodClosePreview(params);
  return await createPeriodCloseVoucherByPreview(preview, params);
}

export async function reversePeriodClose(params: PeriodCloseParams) {
  const resolvedAccountSetId = resolveAccountSetId(params.accountSetId);
  const preview = await getPeriodReversePreview({
    ...params,
    accountSetId: resolvedAccountSetId,
  });
  if (!preview.canReverse) {
    throw new Error(preview.canReverseReason);
  }

  const originalVoucherId = String(preview.originalVoucher?.rowid || '').trim();
  const originalVoucher = originalVoucherId ? await getVoucher(originalVoucherId) : null;

  const rollbackOpeningResult = await rollbackNextYearSubjectOpenings({
    period: params.period,
    accountSetId: resolvedAccountSetId,
  });

  const [yearText, monthText] = String(params.period || '').split('-');
  const currentStatus = await getPeriodStatusByMonth({
    accountSetId: String(resolvedAccountSetId || ''),
    fiscalYear: Number(yearText || 0),
    periodMonth: Number(monthText || 0),
  });

  const preservedVoucherId = String(
    currentStatus?.carry_forward_voucher_id || originalVoucher?.main?.rowid || '',
  );
  const preservedVoucherCode = String(
    currentStatus?.carry_forward_voucher_code ||
      originalVoucher?.main?.voucher_code ||
      originalVoucher?.main?.business_code ||
      '',
  );

  await savePeriodStatus({
    rowid: currentStatus?.rowid,
    account_set_id: String(resolvedAccountSetId || ''),
    company_name: params.companyName || originalVoucher?.main?.company_name || currentStatus?.company_name || '',
    fiscal_year: Number(yearText || 0),
    period_month: Number(monthText || 0),
    period_code: params.period,
    carry_forward_status: 1,
    close_status: 0,
    carry_forward_voucher_id: preservedVoucherId,
    carry_forward_voucher_code: preservedVoucherCode,
    carry_forward_at: currentStatus?.carry_forward_at,
    carry_forward_by: String(currentStatus?.carry_forward_by || params.operator || ''),
    close_voucher_id: '',
    close_at: undefined,
    close_by: '',
    last_reverse_at: formatDateTime(new Date()),
    last_reverse_by: String(params.operator || ''),
    remark: buildReverseRemark(params.period, preservedVoucherCode),
    start_date: preview.startDate,
    end_date: preview.endDate,
  });

  return {
    period: params.period,
    sourceVoucherId: preservedVoucherId,
    reverseVoucherId: '',
    rollbackOpeningResult,
  };
}
