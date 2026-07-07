import { getSubjectOpeningList, type BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';
import { getAllSubjectList, type BilSubjectApi } from '#/api/erp/finance/settings/project';
import { getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';
import { getVoucherDetailAuxiliariesByVoucherIds } from '#/api/erp/finance/voucher/voucherAux';
import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { moneyNumber } from '#/utils/finance/decimal-money';
import { calculateSubjectYearBeginning } from '#/utils/finance/subject-opening';
import {
  directionForSignedBalance,
  getOpeningSignedBalance,
  signedBalanceBySubjectType,
  signedAmountByBalanceDirection,
} from './balance-sheet-calculation';

export type ReportQuery = {
  month: string; // YYYY-MM
  accountId?: string;
  periodMode?: 'month' | 'quarter';
  showLastYear?: boolean;
  fillEmptyQuarterWithYear?: boolean;
};

export type BalanceSheetRow = {
  rowId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: number;
  subjectTypeLabel: string;
  balanceDirection: string;
  beginningBalanceDirection: string;
  beginningBalance: number;
  currentDebit: number;
  currentCredit: number;
  endingBalance: number;
};

export type BalanceSheetReport = {
  month: string;
  rows: BalanceSheetRow[];
  assetRows: BalanceSheetRow[];
  liabilityRows: BalanceSheetRow[];
  equityRows: BalanceSheetRow[];
  summary: {
    assetBeginningTotal: number;
    assetEndingTotal: number;
    liabilityBeginningTotal: number;
    liabilityEndingTotal: number;
    equityBeginningTotal: number;
    equityEndingTotal: number;
    liabilitiesAndEquityBeginningTotal: number;
    liabilitiesAndEquityEndingTotal: number;
  };
};

export type ProfitStatementRow = {
  rowId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: number;
  subjectTypeLabel: string;
  balanceDirection: string;
  currentAmount: number;
  yearAmount: number;
  bucket: 'income' | 'expense';
};

export type ProfitStatementLine = {
  key: string;
  label: string;
  lineNo: number;
  current: number;
  year: number;
  isTitle?: boolean;
  isStrong?: boolean;
};

export type ProfitStatementReport = {
  month: string;
  periodMode: 'month' | 'quarter';
  rows: ProfitStatementRow[];
  lines: ProfitStatementLine[];
  summary: {
    operatingRevenueCurrent: number;
    operatingRevenueYear: number;
    operatingCostCurrent: number;
    operatingCostYear: number;
    taxesAndSurchargesCurrent: number;
    taxesAndSurchargesYear: number;
    sellingExpenseCurrent: number;
    sellingExpenseYear: number;
    adminExpenseCurrent: number;
    adminExpenseYear: number;
    financeExpenseCurrent: number;
    financeExpenseYear: number;
    investmentIncomeCurrent: number;
    investmentIncomeYear: number;
    nonOperatingIncomeCurrent: number;
    nonOperatingIncomeYear: number;
    nonOperatingExpenseCurrent: number;
    nonOperatingExpenseYear: number;
    incomeTaxExpenseCurrent: number;
    incomeTaxExpenseYear: number;
    operatingProfitCurrent: number;
    operatingProfitYear: number;
    totalProfitCurrent: number;
    totalProfitYear: number;
    netProfitCurrent: number;
    netProfitYear: number;
  };
};

export type CashFlowType = 'operating' | 'investing' | 'financing';

export type CashFlowLineKey =
  | 'operating_sales'
  | 'operating_other_in'
  | 'operating_buy'
  | 'operating_staff'
  | 'operating_tax'
  | 'operating_other_out'
  | 'operating_net'
  | 'investing_disposal'
  | 'investing_recover'
  | 'investing_income'
  | 'investing_disposal_long_asset'
  | 'investing_other_in'
  | 'investing_pay'
  | 'investing_build'
  | 'investing_other_out'
  | 'investing_net'
  | 'financing_borrow'
  | 'financing_investor'
  | 'financing_other_in'
  | 'financing_repay'
  | 'financing_repay_principal'
  | 'financing_repay_interest'
  | 'financing_profit'
  | 'financing_dividend_interest'
  | 'financing_other_out'
  | 'financing_net'
  | 'fx_effect'
  | 'cash_net_increase'
  | 'cash_beginning'
  | 'cash_ending';

export type CashFlowLine = {
  key: CashFlowLineKey;
  label: string;
  lineNo: number | string;
  current: number;
  year: number;
  isSection?: boolean;
  isStrong?: boolean;
  indent?: number;
};

export type CashFlowRow = {
  rowId: string;
  voucherId: string;
  voucherDate: string;
  voucherCode: string;
  businessName: string;
  summary: string;
  cashSubjectCode: string;
  cashSubjectName: string;
  counterSubject: string;
  cashFlowType: CashFlowType;
  lineKey: CashFlowLineKey;
  amount: number;
  periodBucket: 'current' | 'year';
};

export type CashFlowDraftDetail = {
  rowId: string;
  current: number;
  year: number;
};

export type CashFlowDraftVoucherDetail = {
  rowId: string;
  parentRowId: string;
  voucherId: string;
  voucherDate: string;
  voucherCode: string;
  summary: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  amount: number;
  periodBucket: 'current' | 'year';
};

export type CashFlowReport = {
  month: string;
  rows: CashFlowRow[];
  operatingRows: CashFlowRow[];
  investingRows: CashFlowRow[];
  financingRows: CashFlowRow[];
  lines: CashFlowLine[];
  draftDetails?: CashFlowDraftDetail[];
  draftVoucherDetails?: CashFlowDraftVoucherDetail[];
  summary: {
    operatingNet: number;
    investingNet: number;
    financingNet: number;
    netIncrease: number;
  };
};

type SubjectLite = BilSubjectApi.Subject & {
  rowid?: string;
  subject_number?: string;
  subject_name?: string;
  balance_direction?: number | string;
  subject_type?: number | string;
  is_leaf_subject?: number;
};

type VoucherAgg = {
  ytdDebit: number;
  ytdCredit: number;
  monthDebit: number;
  monthCredit: number;
};

type SimpleVoucherAgg = {
  debit: number;
  credit: number;
};

type CashLineStat = Record<CashFlowLineKey, { current: number; year: number }>;
type CashFlowDirection = 'in' | 'out';

const SUBJECT_TYPE_LABEL: Record<number, string> = {
  1: '资产',
  2: '负债',
  3: '权益',
  4: '成本',
  5: '损益',
};

const PROFIT_STATEMENT_INCOME_PREFIXES = ['5001', '5051', '5111', '5301', '6001', '6051', '6111', '6301'];
const PROFIT_STATEMENT_EXPENSE_PREFIXES = ['5401', '5402', '5403', '5601', '5602', '5603', '5711', '5801', '6401', '6402', '6403', '6601', '6602', '6603', '6711', '6801'];

const CASH_LINE_META: Array<Pick<CashFlowLine, 'key' | 'label' | 'lineNo' | 'isSection' | 'isStrong' | 'indent'>> = [
  { key: 'operating_net', label: '一、经营活动产生的现金流量：', lineNo: '', isSection: true },
  { key: 'operating_sales', label: '销售产成品、商品、提供劳务收到的现金', lineNo: 1, indent: 1 },
  { key: 'operating_other_in', label: '收到其他与经营活动有关的现金', lineNo: 2, indent: 1 },
  { key: 'operating_buy', label: '购买原材料、商品、接受劳务支付的现金', lineNo: 3, indent: 1 },
  { key: 'operating_staff', label: '支付的职工薪酬', lineNo: 4, indent: 1 },
  { key: 'operating_tax', label: '支付的税费', lineNo: 5, indent: 1 },
  { key: 'operating_other_out', label: '支付其他与经营活动有关的现金', lineNo: 6, indent: 1 },
  { key: 'operating_net', label: '经营活动产生的现金流量净额', lineNo: 7, isStrong: true },

  { key: 'investing_net', label: '二、投资活动产生的现金流量：', lineNo: '', isSection: true },
  { key: 'investing_recover', label: '收回短期投资、长期债券投资和长期股权投资收到的现金', lineNo: 8, indent: 1 },
  { key: 'investing_income', label: '取得投资收益收到的现金', lineNo: 9, indent: 1 },
  { key: 'investing_disposal_long_asset', label: '处置固定资产、无形资产和其他非流动资产收回的现金净额', lineNo: 10, indent: 1 },
  { key: 'investing_pay', label: '短期投资、长期债券投资和长期股权投资支付的现金', lineNo: 11, indent: 1 },
  { key: 'investing_build', label: '购建固定资产、无形资产和其他非流动资产支付的现金', lineNo: 12, indent: 1 },
  { key: 'investing_net', label: '投资活动产生的现金流量净额', lineNo: 13, isStrong: true },

  { key: 'financing_net', label: '三、筹资活动产生的现金流量：', lineNo: '', isSection: true },
  { key: 'financing_borrow', label: '取得借款收到的现金', lineNo: 14, indent: 1 },
  { key: 'financing_investor', label: '吸收投资者投资收到的现金', lineNo: 15, indent: 1 },
  { key: 'financing_repay_principal', label: '偿还借款本金支付的现金', lineNo: 16, indent: 1 },
  { key: 'financing_repay_interest', label: '偿还借款利息支付的现金', lineNo: 17, indent: 1 },
  { key: 'financing_profit', label: '分配利润支付的现金', lineNo: 18, indent: 1 },
  { key: 'financing_net', label: '筹资活动产生的现金流量净额', lineNo: 19, isStrong: true },

  { key: 'cash_net_increase', label: '四、现金净增加额', lineNo: 20, isStrong: true },
  { key: 'cash_beginning', label: '加：期初现金余额', lineNo: 21, isStrong: true },
  { key: 'cash_ending', label: '五、期末现金余额', lineNo: 22, isStrong: true },
];

const CASH_FLOW_CODE_TO_LINE = new Map<string, { direction: CashFlowDirection; key: CashFlowLineKey }>([
  ['1', { key: 'operating_sales', direction: 'in' }],
  ['2', { key: 'operating_other_in', direction: 'in' }],
  ['3', { key: 'operating_buy', direction: 'out' }],
  ['4', { key: 'operating_staff', direction: 'out' }],
  ['5', { key: 'operating_tax', direction: 'out' }],
  ['6', { key: 'operating_other_out', direction: 'out' }],
  ['7', { key: 'investing_recover', direction: 'in' }],
  ['8', { key: 'investing_income', direction: 'in' }],
  ['9', { key: 'investing_disposal_long_asset', direction: 'in' }],
  ['10', { key: 'investing_pay', direction: 'out' }],
  ['11', { key: 'investing_build', direction: 'out' }],
  ['12', { key: 'financing_borrow', direction: 'in' }],
  ['13', { key: 'financing_investor', direction: 'in' }],
  ['14', { key: 'financing_repay_principal', direction: 'out' }],
  ['15', { key: 'financing_profit', direction: 'out' }],
  ['16', { key: 'financing_repay_interest', direction: 'out' }],
  ['19', { key: 'operating_other_in', direction: 'in' }],
  ['20', { key: 'investing_disposal_long_asset', direction: 'in' }],
  ['21', { key: 'investing_other_in', direction: 'in' }],
  ['22', { key: 'investing_build', direction: 'out' }],
  ['23', { key: 'investing_other_out', direction: 'out' }],
  ['24', { key: 'financing_other_in', direction: 'in' }],
  ['25', { key: 'financing_other_out', direction: 'out' }],
  ['26', { key: 'fx_effect', direction: 'in' }],
]);
function createEmptyCashLineStat(): CashLineStat {
  return {
    operating_sales: { current: 0, year: 0 },
    operating_other_in: { current: 0, year: 0 },
    operating_buy: { current: 0, year: 0 },
    operating_staff: { current: 0, year: 0 },
    operating_tax: { current: 0, year: 0 },
    operating_other_out: { current: 0, year: 0 },
    operating_net: { current: 0, year: 0 },
    investing_disposal: { current: 0, year: 0 },
    investing_recover: { current: 0, year: 0 },
    investing_income: { current: 0, year: 0 },
    investing_disposal_long_asset: { current: 0, year: 0 },
    investing_other_in: { current: 0, year: 0 },
    investing_pay: { current: 0, year: 0 },
    investing_build: { current: 0, year: 0 },
    investing_other_out: { current: 0, year: 0 },
    investing_net: { current: 0, year: 0 },
    financing_borrow: { current: 0, year: 0 },
    financing_investor: { current: 0, year: 0 },
    financing_other_in: { current: 0, year: 0 },
    financing_repay: { current: 0, year: 0 },
    financing_repay_principal: { current: 0, year: 0 },
    financing_repay_interest: { current: 0, year: 0 },
    financing_profit: { current: 0, year: 0 },
    financing_dividend_interest: { current: 0, year: 0 },
    financing_other_out: { current: 0, year: 0 },
    financing_net: { current: 0, year: 0 },
    fx_effect: { current: 0, year: 0 },
    cash_net_increase: { current: 0, year: 0 },
    cash_beginning: { current: 0, year: 0 },
    cash_ending: { current: 0, year: 0 },
  };
}

function dirTextFromNumber(balanceDirection: any) {
  const d = Number(balanceDirection ?? 1);
  return d === 2 ? '贷' : '借';
}

function oppositeDir(d: '借' | '贷') {
  return d === '借' ? '贷' : '借';
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59);
  return { start, end };
}

function yearStartOf(month: string) {
  const [y] = month.split('-').map(Number);
  return new Date(y!, 0, 1, 0, 0, 0);
}

function quarterEndOf(month: string) {
  const [y, m] = month.split('-').map(Number);
  const endMonth = Math.floor(((m || 1) - 1) / 3) * 3 + 3;
  return new Date(y!, endMonth, 0, 23, 59, 59);
}

function quarterEndMonthOf(month: string) {
  const [yearText, monthText] = month.split('-');
  const endMonth = Math.floor(((Number(monthText) || 1) - 1) / 3) * 3 + 3;
  return `${Number(yearText)}-${String(endMonth).padStart(2, '0')}`;
}

function toIsoDateTime(d: Date) {
  return d.toISOString();
}

function formatDate(d: any): string {
  if (!d) return '';
  const t = typeof d === 'string' ? d : (d as Date).toISOString();
  return t.slice(0, 10);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function getYearBeginning(
  opening?: BilSubjectOpeningApi.SubjectOpening,
  direction?: '借' | '贷',
) {
  return calculateSubjectYearBeginning(opening, direction);
}

function signedAmountByDirection(direction: '借' | '贷', debit: number, credit: number) {
  return signedAmountByBalanceDirection(direction, debit, credit);
}

function computeNetProfitByAccessor(
  aggMap: Map<string, VoucherAgg>,
  accessor: (agg: VoucherAgg) => { debit: number; credit: number },
) {
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const [code, agg] of aggMap.entries()) {
    const amounts = accessor(agg);
    if (PROFIT_STATEMENT_INCOME_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      incomeTotal += Number(amounts.credit || 0) - Number(amounts.debit || 0);
      continue;
    }
    if (PROFIT_STATEMENT_EXPENSE_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      expenseTotal += Number(amounts.debit || 0) - Number(amounts.credit || 0);
    }
  }

  return incomeTotal - expenseTotal;
}

function computeYearToDateNetProfit(aggMap: Map<string, VoucherAgg>) {
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const [code, agg] of aggMap.entries()) {
    if (PROFIT_STATEMENT_INCOME_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      incomeTotal += (Number(agg.ytdCredit || 0) - Number(agg.ytdDebit || 0));
      continue;
    }
    if (PROFIT_STATEMENT_EXPENSE_PREFIXES.some((prefix) => code.startsWith(prefix))) {
      expenseTotal += (Number(agg.ytdDebit || 0) - Number(agg.ytdCredit || 0));
    }
  }

  return incomeTotal - expenseTotal;
}

const VOUCHER_DETAIL_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_TABLE = 'Bil_Voucher_Detail';
const VOUCHER_DETAIL_DB = 'LMBill';
const VOUCHER_DETAIL_PK = 'row_id';

async function getVoucherDetailsBatch(voucherIds: string[]) {
  const ids = [...new Set((voucherIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0) return [] as ErpVoucherApi.VoucherDetail[];

  const table = createFinanceDataTable(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  const voucherIdFilter = ids.length === 1
    ? cond('voucher_id', 'equal', ids[0])
    : or(...ids.map((id) => cond('voucher_id', 'equal', id)));

  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    voucherIdFilter,
  );
  table.Fields = [];

  const queryParam = {
    Table: [table],
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return (resultData.Items as ErpVoucherApi.VoucherDetail[]) || [];
}

function groupVoucherDetailsByVoucherId(details: ErpVoucherApi.VoucherDetail[]) {
  const map = new Map<string, ErpVoucherApi.VoucherDetail[]>();
  for (const item of details || []) {
    const voucherId = String((item as any)?.voucher_id || '').trim();
    if (!voucherId) continue;
    const list = map.get(voucherId) || [];
    list.push(item);
    map.set(voucherId, list);
  }
  return map;
}

async function loadVoucherAggMapByRange(start: Date, end: Date) {
  if (start.getTime() > end.getTime()) {
    return new Map<string, SimpleVoucherAgg>();
  }

  const voucherPage = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [toIsoDateTime(start), toIsoDateTime(end)],
  } as any);

  const mains = (voucherPage?.list || []) as ErpVoucherApi.VoucherMain[];
  const detailRows = await getVoucherDetailsBatch(mains.map((m) => String(m.rowid ?? '')));
  const aggMap = new Map<string, SimpleVoucherAgg>();

  for (const d of detailRows as any[]) {
    const code = String(d.account_code ?? '').trim();
    if (!code) continue;
    const debit = Number(d.debit_amount ?? 0) || 0;
    const credit = Number(d.credit_amount ?? 0) || 0;
    const agg = aggMap.get(code) || { debit: 0, credit: 0 };
    agg.debit += debit;
    agg.credit += credit;
    aggMap.set(code, agg);
  }

  return aggMap;
}

async function loadBaseData(params: ReportQuery) {
  const month = String(params.month || '').trim();
  if (!month) {
    return {
      month,
      subjects: [] as SubjectLite[],
      openingMap: new Map<string, BilSubjectOpeningApi.SubjectOpening>(),
      mains: [] as ErpVoucherApi.VoucherMain[],
      detailList: [] as ErpVoucherApi.VoucherDetail[][],
      aggMap: new Map<string, VoucherAgg>(),
      monthStart: new Date(),
      monthEnd: new Date(),
    };
  }

  const { start: monthStart, end: monthEnd } = monthRange(month);
  const yearStart = yearStartOf(month);

  const [subjectRes, openingRes, voucherPage] = await Promise.all([
    getAllSubjectList({
      pageNo: 1,
      page: 0,
      lingma_sys_is_delete: 0,
    } as any),
    getSubjectOpeningList({
      pageNo: 1,
      page: 9999,
      lingma_sys_is_delete: 0,
    } as any),
    getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(monthEnd)],
    } as any),
  ]);

  const subjects = ((subjectRes?.list || []) as SubjectLite[])
    .filter((s) => String(s.subject_number ?? '').trim())
    .sort((a, b) => String(a.subject_number).localeCompare(String(b.subject_number)));

  const openingMap = new Map<string, BilSubjectOpeningApi.SubjectOpening>();
  for (const o of (openingRes?.list || []) as BilSubjectOpeningApi.SubjectOpening[]) {
    const code = String((o as any)?.subject_code ?? '').trim();
    if (code) openingMap.set(code, o);
  }

  const mains = (voucherPage?.list || []) as ErpVoucherApi.VoucherMain[];
  const detailRows = await getVoucherDetailsBatch(mains.map((m) => String(m.rowid ?? '')));
  const detailMap = groupVoucherDetailsByVoucherId(detailRows);
  const detailList = mains.map((m) => detailMap.get(String(m.rowid ?? '')) || []);

  const aggMap = new Map<string, VoucherAgg>();
  mains.forEach((m, idx) => {
    const dateStr = formatDate(pickNonEmptyText(m.voucher_date, m.createtime, m.updatetime));
    const t = dateStr ? new Date(dateStr).getTime() : 0;
    const inMonth = t >= monthStart.getTime() && t <= monthEnd.getTime();
    const details = detailList[idx] || [];
    for (const d of details as any[]) {
      const code = String(d.account_code ?? '').trim();
      if (!code) continue;
      const debit = moneyNumber(d.debit_amount ?? 0);
      const credit = moneyNumber(d.credit_amount ?? 0);
      const agg = aggMap.get(code) || {
        ytdDebit: 0,
        ytdCredit: 0,
        monthDebit: 0,
        monthCredit: 0,
      };
      agg.ytdDebit += debit;
      agg.ytdCredit += credit;
      if (inMonth) {
        agg.monthDebit += debit;
        agg.monthCredit += credit;
      }
      aggMap.set(code, agg);
    }
  });

  return { month, subjects, openingMap, mains, detailList, aggMap, monthStart, monthEnd };
}

export async function fetchBalanceSheetReport(params: ReportQuery): Promise<BalanceSheetReport> {
  const { month, subjects, openingMap, aggMap } = await loadBaseData(params);
  const yearStart = yearStartOf(month);
  const historyEnd = new Date(yearStart.getTime() - 1000);
  const historyAggMap = await loadVoucherAggMapByRange(new Date(1900, 0, 1, 0, 0, 0), historyEnd);

  const rows = subjects
    .filter((s) => [1, 2, 3].includes(Number(s.subject_type ?? 0)))
    .filter((s) => Number(s.is_leaf_subject ?? 1) === 1)
    .map((s) => {
      const code = String(s.subject_number ?? '').trim();
      const type = Number(s.subject_type ?? 0);
      const dir = dirTextFromNumber(s.balance_direction) as '借' | '贷';
      const opening = openingMap.get(code);
      const establishmentOpeningSigned = getOpeningSignedBalance(opening, dir);
      const historyAgg = historyAggMap.get(code) || { debit: 0, credit: 0 };
      const agg = aggMap.get(code) || { ytdDebit: 0, ytdCredit: 0, monthDebit: 0, monthCredit: 0 };

      // 期初维护页的借/贷方累计属于建账基础余额；凭证明细只叠加一次。
      // 结转损益和结转利润不排除，它们对本年利润/未分配利润的影响必须保留。
      const historicalSigned = signedAmountByDirection(dir, Number(historyAgg.debit || 0), Number(historyAgg.credit || 0));
      const yearBeginningSigned = establishmentOpeningSigned + historicalSigned;
      const yearToDateSigned = signedAmountByDirection(
        dir,
        Number(agg.ytdDebit || 0),
        Number(agg.ytdCredit || 0),
      );
      const endingSigned = yearBeginningSigned + yearToDateSigned;
      const beginningSigned = yearBeginningSigned;
      return {
        rowId: `${code}-${month}`,
        subjectCode: code,
        subjectName: String(s.subject_name ?? ''),
        subjectType: type,
        subjectTypeLabel: SUBJECT_TYPE_LABEL[type] || '',
        beginningBalanceDirection: directionForSignedBalance(
          dir,
          beginningSigned,
        ),
        balanceDirection: directionForSignedBalance(dir, endingSigned),
        beginningBalance: Math.abs(beginningSigned),
        currentDebit: agg.monthDebit,
        currentCredit: agg.monthCredit,
        endingBalance: Math.abs(endingSigned),
      } as BalanceSheetRow;
    })
    .filter((r) => r.beginningBalance || r.currentDebit || r.currentCredit || r.endingBalance);

  // 已结转的损益科目余额为 0，只补仍未结转的损益余额，避免与 3103/3104 重复。
  const yearToDateNetProfit = computeYearToDateNetProfit(aggMap);
  const currentMonthNetProfit = computeNetProfitByAccessor(aggMap, (agg) => ({
    debit: Number(agg.monthDebit || 0),
    credit: Number(agg.monthCredit || 0),
  }));

  if (Math.abs(currentMonthNetProfit) > 1e-9 || Math.abs(yearToDateNetProfit) > 1e-9) {
    rows.push({
      rowId: `31039999-current-profit-${month}`,
      subjectCode: '31039999',
      subjectName: '本年利润（损益折算）',
      subjectType: 3,
      subjectTypeLabel: SUBJECT_TYPE_LABEL[3] || '权益',
      beginningBalanceDirection: '贷',
      balanceDirection: yearToDateNetProfit >= 0 ? '贷' : '借',
      beginningBalance: 0,
      currentDebit: currentMonthNetProfit < 0 ? Math.abs(currentMonthNetProfit) : 0,
      currentCredit: currentMonthNetProfit >= 0 ? Math.abs(currentMonthNetProfit) : 0,
      endingBalance: Math.abs(yearToDateNetProfit),
    });
  }

  const assetRows = rows.filter((r) => r.subjectType === 1);
  const liabilityRows = rows.filter((r) => r.subjectType === 2);
  const equityRows = rows.filter((r) => r.subjectType === 3);
  const sum = (list: BalanceSheetRow[], key: 'beginningBalance' | 'endingBalance') =>
    list.reduce((total, row) => {
      const amount = Number(row[key] || 0);
      const direction =
        key === 'beginningBalance'
          ? row.beginningBalanceDirection
          : row.balanceDirection;
      return (
        total
        + signedBalanceBySubjectType(
          amount,
          direction as '借' | '贷',
          row.subjectType,
        )
      );
    }, 0);

  return {
    month,
    rows,
    assetRows,
    liabilityRows,
    equityRows,
    summary: {
      assetBeginningTotal: sum(assetRows, 'beginningBalance'),
      assetEndingTotal: sum(assetRows, 'endingBalance'),
      liabilityBeginningTotal: sum(liabilityRows, 'beginningBalance'),
      liabilityEndingTotal: sum(liabilityRows, 'endingBalance'),
      equityBeginningTotal: sum(equityRows, 'beginningBalance'),
      equityEndingTotal: sum(equityRows, 'endingBalance'),
      liabilitiesAndEquityBeginningTotal: sum(liabilityRows, 'beginningBalance') + sum(equityRows, 'beginningBalance'),
      liabilitiesAndEquityEndingTotal: sum(liabilityRows, 'endingBalance') + sum(equityRows, 'endingBalance'),
    },
  };
}

function quarterStartOf(month: string) {
  const [y, m] = month.split('-').map(Number);
  const qm = Math.floor(((m || 1) - 1) / 3) * 3;
  return new Date(y!, qm, 1, 0, 0, 0);
}

function isExcludedProfitVoucher(item: ErpVoucherApi.VoucherMain) {
  if (Number((item as any)?.lingma_sys_is_delete ?? 0) === 1) return true;
  if (Number((item as any)?.is_reversed ?? 0) === 1) return true;
  const businessCode = String((item as any)?.business_code ?? '').trim();
  const businessName = String((item as any)?.business_name ?? '').trim();
  const description = String((item as any)?.description ?? '').trim().toLowerCase();
  return businessCode.startsWith('PERIOD-CLOSE-')
    || businessCode.startsWith('PERIOD-REVERSE-')
    || businessName.includes('期间结转')
    || description.includes('period-close')
    || description.includes('period-reverse');
}

function sumProfitRowsByPrefixes(rows: ProfitStatementRow[], prefixes: string[]) {
  return rows
    .filter((row) => prefixes.some((prefix) => row.subjectCode.startsWith(prefix)))
    .reduce((acc, row) => ({
      current: acc.current + Number(row.currentAmount || 0),
      year: acc.year + Number(row.yearAmount || 0),
    }), { current: 0, year: 0 });
}

export async function fetchProfitStatementReport(params: ReportQuery): Promise<ProfitStatementReport> {
  const month = String(params.month || '').trim();
  const periodMode: 'month' | 'quarter' = params.periodMode === 'quarter' ? 'quarter' : 'month';
  if (!month) {
    return {
      month,
      periodMode,
      rows: [],
      lines: [],
      summary: {
        operatingRevenueCurrent: 0, operatingRevenueYear: 0,
        operatingCostCurrent: 0, operatingCostYear: 0,
        taxesAndSurchargesCurrent: 0, taxesAndSurchargesYear: 0,
        sellingExpenseCurrent: 0, sellingExpenseYear: 0,
        adminExpenseCurrent: 0, adminExpenseYear: 0,
        financeExpenseCurrent: 0, financeExpenseYear: 0,
        investmentIncomeCurrent: 0, investmentIncomeYear: 0,
        nonOperatingIncomeCurrent: 0, nonOperatingIncomeYear: 0,
        nonOperatingExpenseCurrent: 0, nonOperatingExpenseYear: 0,
        incomeTaxExpenseCurrent: 0, incomeTaxExpenseYear: 0,
        operatingProfitCurrent: 0, operatingProfitYear: 0,
        totalProfitCurrent: 0, totalProfitYear: 0,
        netProfitCurrent: 0, netProfitYear: 0,
      },
    };
  }

  const { end: monthEnd } = monthRange(month);
  const periodEnd = periodMode === 'quarter' ? quarterEndOf(month) : monthEnd;
  const yearStart = yearStartOf(month);
  // “本期金额”：月度模式取当月发生额，季度模式取本季度累计发生额。
  // “本年累计金额”：由 yearAmount 在下方按 1 月 1 日至当前期间末逐笔累加。
  const currentStart = periodMode === 'quarter' ? quarterStartOf(month) : monthRange(month).start;

  const voucherPage = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(periodEnd)],
  } as any);

  const mains = ((voucherPage?.list || []) as ErpVoucherApi.VoucherMain[]).filter((item) => !isExcludedProfitVoucher(item));
  const detailRows = await getVoucherDetailsBatch(mains.map((m) => String(m.rowid ?? '')));
  const detailMap = groupVoucherDetailsByVoucherId(detailRows);

  type ProfitAgg = {
    subjectCode: string;
    subjectName: string;
    currentAmount: number;
    yearAmount: number;
    bucket: 'income' | 'expense';
  };

  const matchBucket = (code: string): null | 'income' | 'expense' => {
    if (PROFIT_STATEMENT_INCOME_PREFIXES.some((prefix) => code.startsWith(prefix))) return 'income';
    if (PROFIT_STATEMENT_EXPENSE_PREFIXES.some((prefix) => code.startsWith(prefix))) return 'expense';
    return null;
  };

  const aggMap = new Map<string, ProfitAgg>();

  mains.forEach((main) => {
    const voucherDate = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    const inCurrentPeriod = voucherTime >= currentStart.getTime() && voucherTime <= periodEnd.getTime();
    const details = (detailMap.get(String(main.rowid ?? '')) || []) as any[];

    for (const d of details) {
      const code = String(d.account_code ?? '').trim();
      if (!code) continue;
      const bucket = matchBucket(code);
      if (!bucket) continue;

      const debit = moneyNumber(d.debit_amount ?? 0);
      const credit = moneyNumber(d.credit_amount ?? 0);
      const amount = bucket === 'income' ? (credit - debit) : (debit - credit);
      if (Math.abs(amount) < 1e-9) continue;

      const agg = aggMap.get(code) || {
        subjectCode: code,
        subjectName: String(d.account_name ?? code).trim() || code,
        currentAmount: 0,
        yearAmount: 0,
        bucket,
      };

      agg.yearAmount += amount;
      if (inCurrentPeriod) agg.currentAmount += amount;
      aggMap.set(code, agg);
    }
  });

  let rows = [...aggMap.values()]
    .map((item) => ({
      rowId: `${item.subjectCode}-${month}`,
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      subjectType: item.bucket === 'income' ? 5 : 4,
      subjectTypeLabel: item.bucket === 'income' ? '损益' : '成本',
      balanceDirection: item.bucket === 'income' ? '贷' : '借',
      currentAmount: item.currentAmount,
      yearAmount: item.yearAmount,
      bucket: item.bucket,
    } as ProfitStatementRow))
    .filter((r) => Math.abs(Number(r.currentAmount || 0)) > 1e-9 || Math.abs(Number(r.yearAmount || 0)) > 1e-9)
    .sort((a, b) => String(a.subjectCode).localeCompare(String(b.subjectCode)));

  const hasCurrentAmount = rows.some((row) => Math.abs(Number(row.currentAmount || 0)) > 1e-9);
  const hasYearAmount = rows.some((row) => Math.abs(Number(row.yearAmount || 0)) > 1e-9);
  if (periodMode === 'quarter' && params.fillEmptyQuarterWithYear !== false && !hasCurrentAmount && hasYearAmount) {
    rows = rows.map((row) => ({
      ...row,
      currentAmount: Number(row.yearAmount || 0),
    }));
  }

  const incomeRows = rows.filter((r) => r.bucket === 'income');
  const expenseRows = rows.filter((r) => r.bucket === 'expense');

  const operatingRevenue = sumProfitRowsByPrefixes(incomeRows, ['5001', '5051', '6001', '6051']);
  const operatingCost = sumProfitRowsByPrefixes(expenseRows, ['5401', '5402', '6401', '6402']);
  const taxesAndSurcharges = sumProfitRowsByPrefixes(expenseRows, ['5403', '6403']);
  const sellingExpense = sumProfitRowsByPrefixes(expenseRows, ['5601', '6601']);
  const adminExpense = sumProfitRowsByPrefixes(expenseRows, ['5602', '6602']);
  const financeExpense = sumProfitRowsByPrefixes(expenseRows, ['5603', '6603']);
  const investmentIncome = sumProfitRowsByPrefixes(incomeRows, ['5111', '6111']);
  const nonOperatingIncome = sumProfitRowsByPrefixes(incomeRows, ['5301', '6301']);
  const nonOperatingExpense = sumProfitRowsByPrefixes(expenseRows, ['5711', '6711']);
  const incomeTaxExpense = sumProfitRowsByPrefixes(expenseRows, ['5801', '6801']);

  const operatingProfit = {
    current: operatingRevenue.current - operatingCost.current - taxesAndSurcharges.current - sellingExpense.current - adminExpense.current - financeExpense.current + investmentIncome.current,
    year: operatingRevenue.year - operatingCost.year - taxesAndSurcharges.year - sellingExpense.year - adminExpense.year - financeExpense.year + investmentIncome.year,
  };

  const totalProfit = {
    current: operatingProfit.current + nonOperatingIncome.current - nonOperatingExpense.current,
    year: operatingProfit.year + nonOperatingIncome.year - nonOperatingExpense.year,
  };

  const netProfit = {
    current: totalProfit.current - incomeTaxExpense.current,
    year: totalProfit.year - incomeTaxExpense.year,
  };

  let lines: ProfitStatementLine[] = [
    { key: 'operatingRevenue', label: '一、营业收入', lineNo: 1, isTitle: true, current: operatingRevenue.current, year: operatingRevenue.year },
    { key: 'operatingCost', label: '减：营业成本', lineNo: 2, current: operatingCost.current, year: operatingCost.year },
    { key: 'taxesAndSurcharges', label: '税金及附加', lineNo: 3, current: taxesAndSurcharges.current, year: taxesAndSurcharges.year },
    { key: 'sellingExpense', label: '销售费用', lineNo: 11, current: sellingExpense.current, year: sellingExpense.year },
    { key: 'adminExpense', label: '管理费用', lineNo: 14, current: adminExpense.current, year: adminExpense.year },
    { key: 'financeExpense', label: '财务费用', lineNo: 18, current: financeExpense.current, year: financeExpense.year },
    { key: 'investmentIncome', label: '加：投资收益（亏损以“－”号填列）', lineNo: 20, current: investmentIncome.current, year: investmentIncome.year },
    { key: 'operatingProfit', label: '二、营业利润（亏损以“－”号填列）', lineNo: 21, isStrong: true, current: operatingProfit.current, year: operatingProfit.year },
    { key: 'nonOperatingIncome', label: '加：营业外收入', lineNo: 22, current: nonOperatingIncome.current, year: nonOperatingIncome.year },
    { key: 'nonOperatingExpense', label: '减：营业外支出', lineNo: 24, current: nonOperatingExpense.current, year: nonOperatingExpense.year },
    { key: 'totalProfit', label: '三、利润总额（亏损总额以“－”号填列）', lineNo: 30, isStrong: true, current: totalProfit.current, year: totalProfit.year },
    { key: 'incomeTaxExpense', label: '减：所得税费用', lineNo: 31, current: incomeTaxExpense.current, year: incomeTaxExpense.year },
    { key: 'netProfit', label: '四、净利润（净亏损以“－”号填列）', lineNo: 32, isStrong: true, current: netProfit.current, year: netProfit.year },
  ];

  if (params.showLastYear === true) {
    const [yearText, monthText] = month.split('-');
    const lastYearMonth = `${Number(yearText) - 1}-${monthText}`;
    const lastYearReport = await fetchProfitStatementReport({
      month: lastYearMonth,
      periodMode,
      showLastYear: false,
    });
    const lastYearLineMap = new Map((lastYearReport.lines || []).map((line) => [String(line.key), Number(line.year || 0)]));
    lines = lines.map((line) => ({
      ...line,
      year: Number(lastYearLineMap.get(String(line.key)) || 0),
    }));
  }

  return {
    month,
    periodMode,
    rows,
    lines,
    summary: {
      operatingRevenueCurrent: operatingRevenue.current, operatingRevenueYear: operatingRevenue.year,
      operatingCostCurrent: operatingCost.current, operatingCostYear: operatingCost.year,
      taxesAndSurchargesCurrent: taxesAndSurcharges.current, taxesAndSurchargesYear: taxesAndSurcharges.year,
      sellingExpenseCurrent: sellingExpense.current, sellingExpenseYear: sellingExpense.year,
      adminExpenseCurrent: adminExpense.current, adminExpenseYear: adminExpense.year,
      financeExpenseCurrent: financeExpense.current, financeExpenseYear: financeExpense.year,
      investmentIncomeCurrent: investmentIncome.current, investmentIncomeYear: investmentIncome.year,
      nonOperatingIncomeCurrent: nonOperatingIncome.current, nonOperatingIncomeYear: nonOperatingIncome.year,
      nonOperatingExpenseCurrent: nonOperatingExpense.current, nonOperatingExpenseYear: nonOperatingExpense.year,
      incomeTaxExpenseCurrent: incomeTaxExpense.current, incomeTaxExpenseYear: incomeTaxExpense.year,
      operatingProfitCurrent: operatingProfit.current, operatingProfitYear: operatingProfit.year,
      totalProfitCurrent: totalProfit.current, totalProfitYear: totalProfit.year,
      netProfitCurrent: netProfit.current, netProfitYear: netProfit.year,
    },
  };
}
function isCashSubject(code: string, name: string) {
  const c = String(code || '').trim();
  const n = String(name || '').trim();
  return c.startsWith('1001') || c.startsWith('1002') || c.startsWith('1009') || /现金|银行|存款/.test(n);
}

function appendCashStat(stat: CashLineStat, key: CashFlowLineKey, periodBucket: 'current' | 'year', amount: number) {
  if (!stat[key]) return;
  stat[key][periodBucket] += Math.abs(amount);
}

function setCashStat(stat: CashLineStat, key: CashFlowLineKey, periodBucket: 'current' | 'year', amount: number) {
  if (!stat[key]) return;
  stat[key][periodBucket] = amount;
}

function finalizeCashLines(stat: CashLineStat) {
  stat.operating_net.current = stat.operating_sales.current + stat.operating_other_in.current - stat.operating_buy.current - stat.operating_staff.current - stat.operating_tax.current - stat.operating_other_out.current;
  stat.operating_net.year = stat.operating_sales.year + stat.operating_other_in.year - stat.operating_buy.year - stat.operating_staff.year - stat.operating_tax.year - stat.operating_other_out.year;

  stat.investing_net.current = stat.investing_disposal.current + stat.investing_other_in.current - stat.investing_build.current - stat.investing_other_out.current;
  stat.investing_net.year = stat.investing_disposal.year + stat.investing_other_in.year - stat.investing_build.year - stat.investing_other_out.year;

  stat.financing_net.current = stat.financing_borrow.current + stat.financing_investor.current + stat.financing_other_in.current - stat.financing_repay.current - stat.financing_repay_principal.current - stat.financing_repay_interest.current - stat.financing_profit.current - stat.financing_dividend_interest.current - stat.financing_other_out.current;
  stat.financing_net.year = stat.financing_borrow.year + stat.financing_investor.year + stat.financing_other_in.year - stat.financing_repay.year - stat.financing_repay_principal.year - stat.financing_repay_interest.year - stat.financing_profit.year - stat.financing_dividend_interest.year - stat.financing_other_out.year;

  stat.cash_net_increase.current = stat.operating_net.current + stat.investing_net.current + stat.financing_net.current + stat.fx_effect.current;
  stat.cash_net_increase.year = stat.operating_net.year + stat.investing_net.year + stat.financing_net.year + stat.fx_effect.year;

  stat.cash_ending.current = stat.cash_beginning.current + stat.cash_net_increase.current;
  stat.cash_ending.year = stat.cash_beginning.year + stat.cash_net_increase.year;
}

function getVoucherId(row: any) {
  return pickNonEmptyText(row?.rowid, row?.row_id);
}

function getVoucherDetailId(row: any) {
  return pickNonEmptyText(row?.rowid, row?.row_id);
}

function isCashFlowAuxRow(row: any) {
  const dimCode = String(row?.dim_code ?? '').trim().toUpperCase();
  const dimName = String(row?.dim_name ?? '').trim();
  const valueCode = String(row?.value_code ?? row?.value ?? row?.cash_flow_code ?? row?.cashFlowCode ?? '').trim();
  const valueName = String(row?.value_name ?? '').trim();
  return dimCode === 'CASH_FLOW'
    || dimCode === 'CASHFLOW'
    || dimCode === 'XJLL'
    || dimCode === '7'
    || dimName.includes('现金流')
    || valueName.includes('现金流')
    || CASH_FLOW_CODE_TO_LINE.has(valueCode);
}

function cashFlowAmountOfCashDetail(detail: any, direction: CashFlowDirection) {
  const debit = moneyNumber(detail?.debit_amount ?? 0);
  const credit = moneyNumber(detail?.credit_amount ?? 0);
  const signedCashAmount = moneyNumber(debit - credit);
  if (Math.abs(signedCashAmount) < 1e-9) return 0;
  if (direction === 'in' && signedCashAmount <= 0) return 0;
  if (direction === 'out' && signedCashAmount >= 0) return 0;
  return Math.abs(signedCashAmount);
}


function periodStartOf(month: string, periodMode?: ReportQuery['periodMode']) {
  return periodMode === 'quarter' ? quarterStartOf(month) : monthRange(month).start;
}

function isExcludedCashFlowVoucher(item: ErpVoucherApi.VoucherMain) {
  if (Number((item as any)?.lingma_sys_is_delete ?? 0) === 1) return true;
  if (Number((item as any)?.is_reversed ?? 0) === 1) return true;
  const businessCode = String((item as any)?.business_code ?? '').trim();
  const businessName = String((item as any)?.business_name ?? '').trim();
  const description = String((item as any)?.description ?? '').trim().toLowerCase();
  return businessCode.startsWith('PERIOD-CLOSE-')
    || businessCode.startsWith('PERIOD-REVERSE-')
    || businessName.includes('期间结转')
    || description.includes('period-close')
    || description.includes('period-reverse');
}

function buildSimpleAggMapFromVoucherDetails(options: {
  mains: ErpVoucherApi.VoucherMain[];
  detailList: ErpVoucherApi.VoucherDetail[][];
  start: Date;
  end: Date;
  excludeVoucher?: (item: ErpVoucherApi.VoucherMain) => boolean;
}) {
  const { mains, detailList, start, end, excludeVoucher } = options;
  const aggMap = new Map<string, SimpleVoucherAgg>();
  if (start.getTime() > end.getTime()) return aggMap;

  (mains || []).forEach((main, idx) => {
    if (excludeVoucher?.(main)) return;
    const voucherDate = formatDate(pickNonEmptyText((main as any).voucher_date, (main as any).createtime, (main as any).updatetime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    if (voucherTime < start.getTime() || voucherTime > end.getTime()) return;

    const details = (detailList[idx] || []) as any[];
    for (const detail of details) {
      const code = String(detail.account_code ?? '').trim();
      if (!code) continue;
      const debit = moneyNumber(detail.debit_amount ?? 0);
      const credit = moneyNumber(detail.credit_amount ?? 0);
      const agg = aggMap.get(code) || { debit: 0, credit: 0 };
      agg.debit += debit;
      agg.credit += credit;
      aggMap.set(code, agg);
    }
  });

  return aggMap;
}

function toSimpleAggFromVoucherAgg(
  aggMap: Map<string, VoucherAgg>,
  accessor: (agg: VoucherAgg) => { debit: number; credit: number },
) {
  const map = new Map<string, SimpleVoucherAgg>();
  for (const [code, agg] of aggMap.entries()) {
    const amounts = accessor(agg);
    map.set(code, {
      debit: Number(amounts.debit || 0) || 0,
      credit: Number(amounts.credit || 0) || 0,
    });
  }
  return map;
}

function isSubjectMatched(code: string, prefixes: string[]) {
  return prefixes.some((prefix) => code.startsWith(prefix));
}

function sumAggByPrefixes(map: Map<string, SimpleVoucherAgg>, prefixes: string[]) {
  let debit = 0;
  let credit = 0;
  for (const [code, agg] of map.entries()) {
    if (!isSubjectMatched(code, prefixes)) continue;
    debit += Number(agg.debit || 0) || 0;
    credit += Number(agg.credit || 0) || 0;
  }
  return { debit, credit };
}

function sumAggByPrefixesOrSubjectName(options: {
  map: Map<string, SimpleVoucherAgg>;
  prefixes?: string[];
  subjectMap: Map<string, SubjectLite>;
  namePattern?: RegExp;
}) {
  const { map, prefixes = [], subjectMap, namePattern } = options;
  let debit = 0;
  let credit = 0;
  for (const [code, agg] of map.entries()) {
    const subjectName = String(subjectMap.get(code)?.subject_name ?? '').trim();
    const matchedByCode = prefixes.length > 0 && isSubjectMatched(code, prefixes);
    const matchedByName = !!namePattern && namePattern.test(subjectName);
    if (!matchedByCode && !matchedByName) continue;
    debit += Number(agg.debit || 0) || 0;
    credit += Number(agg.credit || 0) || 0;
  }
  return { debit, credit };
}

function sumAggDebitBySubjectName(options: {
  map: Map<string, SimpleVoucherAgg>;
  subjectMap: Map<string, SubjectLite>;
  namePattern: RegExp;
}) {
  const { map, subjectMap, namePattern } = options;
  let debit = 0;
  for (const [code, agg] of map.entries()) {
    const subjectName = String(subjectMap.get(code)?.subject_name ?? '').trim();
    if (!namePattern.test(subjectName)) continue;
    debit += Number(agg.debit || 0) || 0;
  }
  return debit;
}

function getAggNet(map: Map<string, SimpleVoucherAgg>, prefixes: string[], direction: '借' | '贷') {
  const agg = sumAggByPrefixes(map, prefixes);
  return direction === '借' ? agg.debit - agg.credit : agg.credit - agg.debit;
}

function positiveAmount(v: number) {
  return Math.max(Number(v || 0) || 0, 0);
}

function createSubjectIndex(
  subjects: SubjectLite[],
  openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>,
  ...aggMaps: Array<Map<string, SimpleVoucherAgg>>
) {
  const codeSet = new Set<string>();
  const subjectMap = new Map<string, SubjectLite>();
  for (const s of subjects || []) {
    const code = String(s.subject_number ?? '').trim();
    if (!code) continue;
    codeSet.add(code);
    subjectMap.set(code, s);
  }
  for (const code of openingMap.keys()) codeSet.add(String(code || '').trim());
  for (const map of aggMaps) {
    for (const code of map.keys()) codeSet.add(String(code || '').trim());
  }
  return { codes: [...codeSet].filter(Boolean), subjectMap };
}

function getSubjectDirection(
  code: string,
  subjectMap: Map<string, SubjectLite>,
  openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>,
): '借' | '贷' {
  const subject = subjectMap.get(code);
  if (subject?.balance_direction !== undefined && subject?.balance_direction !== null) {
    return dirTextFromNumber(subject.balance_direction) as '借' | '贷';
  }
  const opening = openingMap.get(code);
  if (opening?.balance_direction !== undefined && opening?.balance_direction !== null) {
    return dirTextFromNumber(opening.balance_direction) as '借' | '贷';
  }
  const first = Number(code.slice(0, 1));
  return first === 2 || first === 3 ? '贷' : '借';
}

function sumSignedBalanceByPrefixes(options: {
  prefixes: string[];
  codes: string[];
  subjectMap: Map<string, SubjectLite>;
  openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>;
  movementMap: Map<string, SimpleVoucherAgg>;
}) {
  const { prefixes, codes, subjectMap, openingMap, movementMap } = options;
  let total = 0;
  for (const code of codes) {
    if (!isSubjectMatched(code, prefixes)) continue;
    const opening = openingMap.get(code);
    const dir = getSubjectDirection(code, subjectMap, openingMap);
    const openingAmount = getYearBeginning(opening, dir);
    const movement = movementMap.get(code) || { debit: 0, credit: 0 };
    total += openingAmount + signedAmountByDirection(dir, Number(movement.debit || 0), Number(movement.credit || 0));
  }
  return total;
}

function sumCashBeginningByPrefixes(options: {
  cashPrefixes: string[];
  codes: string[];
  subjectMap: Map<string, SubjectLite>;
  openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>;
  movementMap: Map<string, SimpleVoucherAgg>;
}) {
  const { cashPrefixes, codes, subjectMap, openingMap, movementMap } = options;
  return sumSignedBalanceByPrefixes({
    prefixes: cashPrefixes,
    codes,
    subjectMap,
    openingMap,
    movementMap,
  });
}

const CASH_FLOW_DRAFT_DETAIL_KEYS = [
  'op-sales-revenue',
  'op-sales-other-revenue',
  'op-sales-output-tax',
  'op-sales-note-begin',
  'op-sales-note-end',
  'op-sales-ar-begin',
  'op-sales-ar-end',
  'op-sales-advance-end',
  'op-sales-advance-begin',
  'op-sales-other',
  'op-other-in-or-begin',
  'op-other-in-or-end',
  'op-other-in-nonop',
  'op-other-in-other',
  'op-buy-cost',
  'op-buy-other-cost',
  'op-buy-input-tax',
  'op-buy-material-purchase-end',
  'op-buy-material-purchase-begin',
  'op-buy-transit-end',
  'op-buy-transit-begin',
  'op-buy-raw-end',
  'op-buy-raw-begin',
  'op-buy-material-cost-diff-end',
  'op-buy-material-cost-diff-begin',
  'op-buy-stock-end',
  'op-buy-stock-begin',
  'op-buy-product-price-diff-begin',
  'op-buy-product-price-diff-end',
  'op-buy-consigned-processing-end',
  'op-buy-consigned-processing-begin',
  'op-buy-turnover-material-end',
  'op-buy-turnover-material-begin',
  'op-buy-biological-assets-end',
  'op-buy-biological-assets-begin',
  'op-buy-production-end',
  'op-buy-production-begin',
  'op-buy-manufacturing-end',
  'op-buy-manufacturing-begin',
  'op-buy-construction-end',
  'op-buy-construction-begin',
  'op-buy-machinery-end',
  'op-buy-machinery-begin',
  'op-buy-note-payable-begin',
  'op-buy-note-payable-end',
  'op-buy-ap-begin',
  'op-buy-ap-end',
  'op-buy-prepay-end',
  'op-buy-prepay-begin',
  'op-buy-other',
  'op-staff-payroll',
  'op-staff-other',
  'op-tax-paid',
  'op-tax-consumption',
  'op-tax-business',
  'op-tax-resource',
  'op-tax-income',
  'op-tax-land-vat',
  'op-tax-urban-maintenance',
  'op-tax-property',
  'op-tax-land-use',
  'op-tax-vehicle-vessel',
  'op-tax-personal',
  'op-tax-education-surcharge',
  'op-tax-local-education-surcharge',
  'op-tax-mineral-compensation',
  'op-tax-pollution',
  'op-tax-stamp',
  'op-tax-vat',
  'op-tax-other',
  'op-other-out-balance',
  'op-other-out-other',
  'invest-recover-short',
  'invest-recover-equity',
  'invest-recover-bond',
  'invest-recover-other',
  'invest-income-income',
  'invest-income-interest-begin',
  'invest-income-interest-end',
  'invest-income-dividend-begin',
  'invest-income-dividend-end',
  'invest-income-other',
  'invest-disposal-long-asset',
  'invest-disposal-other',
  'invest-pay-short',
  'invest-pay-equity',
  'invest-pay-bond',
  'invest-pay-other',
  'invest-build-fixed-asset',
  'invest-build-construction-end',
  'invest-build-construction-begin',
  'invest-build-material-end',
  'invest-build-material-begin',
  'invest-build-intangible',
  'invest-build-long-prepaid',
  'invest-build-other',
  'fin-borrow-short',
  'fin-borrow-long',
  'fin-borrow-other',
  'fin-investor-capital',
  'fin-investor-other',
  'fin-repay-short',
  'fin-repay-long',
  'fin-repay-other',
  'fin-interest-payable',
  'fin-interest-other',
  'fin-profit-payable',
  'fin-profit-other',
  'cash-begin-cash',
  'cash-begin-bank',
  'cash-begin-other-money',
  'cash-begin-other',
] as const;

function buildCashFlowDraftDetails(balanceMethodStat: {
  currentDetail?: Record<string, number>;
  yearDetail?: Record<string, number>;
}): CashFlowDraftDetail[] {
  return CASH_FLOW_DRAFT_DETAIL_KEYS.map((rowId) => ({
    rowId,
    current: moneyNumber(Number(balanceMethodStat.currentDetail?.[rowId] || 0)),
    year: moneyNumber(Number(balanceMethodStat.yearDetail?.[rowId] || 0)),
  }));
}

function buildCashFlowByBalanceMethod(options: {
  subjects: SubjectLite[];
  openingMap: Map<string, BilSubjectOpeningApi.SubjectOpening>;
  ytdAggMap: Map<string, SimpleVoucherAgg>;
  currentAggMap: Map<string, SimpleVoucherAgg>;
  priorCurrentAggMap: Map<string, SimpleVoucherAgg>;
}) {
  const { subjects, openingMap, ytdAggMap, currentAggMap, priorCurrentAggMap } = options;
  const emptyAgg = new Map<string, SimpleVoucherAgg>();
  const { codes, subjectMap } = createSubjectIndex(subjects, openingMap, ytdAggMap, currentAggMap, priorCurrentAggMap);

  const cashPrefixes = ['1001', '1002', '1009'];
  const revenuePrefixes = ['5001', '5051', '6001', '6051'];
  const costPrefixes = ['5401', '5402', '6401', '6402'];
  const taxPayablePrefixes = ['2221', '2171'];
  const receivableNotePrefixes = ['1121'];
  const receivablePrefixes = ['1122'];
  const prepaymentPrefixes = ['1123'];
  const advanceReceiptPrefixes = ['2203'];
  const payableNotePrefixes = ['2201'];
  const payablePrefixes = ['2202'];
  const payrollPrefixes = ['2211', '2151'];
  const otherReceivablePrefixes = ['1221', '1133'];
  const materialPrefixes = ['1401', '1402', '1403', '1404', '1405', '1406', '1407', '1408', '1409', '1410', '4001', '4101', '4401', '4403'];
  const investmentPrefixes = ['1101', '1102', '1103', '1501', '1511'];
  const investmentIncomePrefixes = ['5111', '6111'];
  const interestReceivablePrefixes = ['1132', '1124'];
  const dividendReceivablePrefixes = ['1131', '1125'];
  const longAssetPrefixes = ['1601', '1602', '1604', '1605', '1701', '1801'];
  const buildAssetBalancePrefixes = ['1604', '1605'];
  const borrowingPrefixes = ['2001', '2501'];
  const capitalPrefixes = ['3001', '4001', '4002'];
  const interestPayablePrefixes = ['2231', '2171'];
  const dividendPayablePrefixes = ['2232', '2161'];

  const balanceAt = (prefixes: string[], movementMap: Map<string, SimpleVoucherAgg>) => sumSignedBalanceByPrefixes({
    prefixes,
    codes,
    subjectMap,
    openingMap,
    movementMap,
  });
  const cashBeginningAt = (movementMap: Map<string, SimpleVoucherAgg>) => sumCashBeginningByPrefixes({
    cashPrefixes,
    codes,
    subjectMap,
    openingMap,
    movementMap,
  });

  const calcPeriod = (
    aggMap: Map<string, SimpleVoucherAgg>,
    beforeAggMap: Map<string, SimpleVoucherAgg>,
    endAggMap: Map<string, SimpleVoucherAgg>,
  ) => {
    const begin = (prefixes: string[]) => balanceAt(prefixes, beforeAggMap);
    const end = (prefixes: string[]) => balanceAt(prefixes, endAggMap);
    const inc = (prefixes: string[]) => end(prefixes) - begin(prefixes);
    const dec = (prefixes: string[]) => begin(prefixes) - end(prefixes);

    const revenue = getAggNet(aggMap, revenuePrefixes, '贷');
    const cost = getAggNet(aggMap, costPrefixes, '借');
    const investmentIncome = getAggNet(aggMap, investmentIncomePrefixes, '贷');
    const nonOperatingIncome = getAggNet(aggMap, ['5301', '6301'], '贷');
    const salesVatByName = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: [],
      subjectMap,
      namePattern: /销项税额/,
    });
    const salesVatCredit = salesVatByName.credit || sumAggByPrefixes(aggMap, taxPayablePrefixes).credit;
    const inputVatDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: [],
      subjectMap,
      namePattern: /进项税额/,
    }).debit;
    const taxDetail = {
      paid: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /已交税金/ }),
      consumption: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /应交消费税/ }),
      business: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /应交营业税/ }),
      resource: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /应交资源税/ }),
      income: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /应交所得税|企业所得税/ }),
      landVat: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /应交土地增值税|土地增值税/ }),
      urbanMaintenance: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /城市维护建设税|城建税/ }),
      property: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /房产税/ }),
      landUse: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /城镇土地使用税|土地使用税/ }),
      vehicleVessel: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /车船使用税|车船税/ }),
      personal: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /个人所得税/ }),
      educationSurcharge: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /教育费附加/ }),
      localEducationSurcharge: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /地方教育费附加/ }),
      mineralCompensation: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /矿产资源补偿费/ }),
      pollution: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /排污费|环境保护税/ }),
      stamp: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /印花税/ }),
      vat: sumAggDebitBySubjectName({ map: aggMap, subjectMap, namePattern: /未交增值税|应交增值税/ }),
    };
    const explicitTaxDebit = Object.values(taxDetail).reduce((sum, value) => sum + Number(value || 0), 0);
    const taxPaidDebit = explicitTaxDebit || sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: taxPayablePrefixes,
      subjectMap,
      namePattern: /已交税金|应交消费税|应交营业税|应交资源税|应交所得税|应交土地增值税|应交城市维护建设税|应交房产税|应交城镇土地使用税|应交车船使用税|应交个人所得税|教育费附加|地方教育费附加|矿产资源补偿费|排污费|环境保护税|印花税|未交增值税|应交增值税/,
    }).debit;
    const fixedAssetDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: ['1601'],
      subjectMap,
      namePattern: /固定资产/,
    }).debit;
    const intangibleDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: ['1701'],
      subjectMap,
      namePattern: /无形资产/,
    }).debit;
    const longPrepaidDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: ['1801'],
      subjectMap,
      namePattern: /长期待摊费用/,
    }).debit;
    const paidInCapitalCredit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: capitalPrefixes,
      subjectMap,
      namePattern: /实收资本|股本|资本公积/,
    }).credit;
    const interestPayableDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: interestPayablePrefixes,
      subjectMap,
      namePattern: /应付利息/,
    }).debit;
    const profitPayableDebit = sumAggByPrefixesOrSubjectName({
      map: aggMap,
      prefixes: dividendPayablePrefixes,
      subjectMap,
      namePattern: /应付利润|应付股利/,
    }).debit;

    const detail: Record<string, number> = {
      'op-sales-revenue': revenue,
      'op-sales-output-tax': salesVatCredit,
      'op-sales-note-begin': begin(receivableNotePrefixes),
      'op-sales-note-end': end(receivableNotePrefixes),
      'op-sales-ar-begin': begin(receivablePrefixes),
      'op-sales-ar-end': end(receivablePrefixes),
      'op-sales-advance-end': end(advanceReceiptPrefixes),
      'op-sales-advance-begin': begin(advanceReceiptPrefixes),
      'op-other-in-or-begin': begin(otherReceivablePrefixes),
      'op-other-in-or-end': end(otherReceivablePrefixes),
      'op-other-in-nonop': nonOperatingIncome,
      'op-buy-cost': cost,
      'op-buy-input-tax': inputVatDebit,
      'op-buy-material-purchase-end': end(['1401']),
      'op-buy-material-purchase-begin': begin(['1401']),
      'op-buy-transit-end': end(['1402']),
      'op-buy-transit-begin': begin(['1402']),
      'op-buy-raw-end': end(['1403']),
      'op-buy-raw-begin': begin(['1403']),
      'op-buy-material-cost-diff-end': end(['1404']),
      'op-buy-material-cost-diff-begin': begin(['1404']),
      'op-buy-stock-end': end(['1405']),
      'op-buy-stock-begin': begin(['1405']),
      'op-buy-product-price-diff-begin': begin(['1407']),
      'op-buy-product-price-diff-end': end(['1407']),
      'op-buy-consigned-processing-end': end(['1408']),
      'op-buy-consigned-processing-begin': begin(['1408']),
      'op-buy-turnover-material-end': end(['1411']),
      'op-buy-turnover-material-begin': begin(['1411']),
      'op-buy-biological-assets-end': end(['1421']),
      'op-buy-biological-assets-begin': begin(['1421']),
      'op-buy-production-end': end(['4001']),
      'op-buy-production-begin': begin(['4001']),
      'op-buy-manufacturing-end': end(['4101']),
      'op-buy-manufacturing-begin': begin(['4101']),
      'op-buy-construction-end': end(['4401']),
      'op-buy-construction-begin': begin(['4401']),
      'op-buy-machinery-end': end(['4403']),
      'op-buy-machinery-begin': begin(['4403']),
      'op-buy-note-payable-begin': begin(payableNotePrefixes),
      'op-buy-note-payable-end': end(payableNotePrefixes),
      'op-buy-ap-begin': begin(payablePrefixes),
      'op-buy-ap-end': end(payablePrefixes),
      'op-buy-prepay-end': end(prepaymentPrefixes),
      'op-buy-prepay-begin': begin(prepaymentPrefixes),
      'op-staff-payroll': sumAggByPrefixes(aggMap, payrollPrefixes).debit,
      'op-tax-paid': taxDetail.paid,
      'op-tax-consumption': taxDetail.consumption,
      'op-tax-business': taxDetail.business,
      'op-tax-resource': taxDetail.resource,
      'op-tax-income': taxDetail.income,
      'op-tax-land-vat': taxDetail.landVat,
      'op-tax-urban-maintenance': taxDetail.urbanMaintenance,
      'op-tax-property': taxDetail.property,
      'op-tax-land-use': taxDetail.landUse,
      'op-tax-vehicle-vessel': taxDetail.vehicleVessel,
      'op-tax-personal': taxDetail.personal,
      'op-tax-education-surcharge': taxDetail.educationSurcharge,
      'op-tax-local-education-surcharge': taxDetail.localEducationSurcharge,
      'op-tax-mineral-compensation': taxDetail.mineralCompensation,
      'op-tax-pollution': taxDetail.pollution,
      'op-tax-stamp': taxDetail.stamp,
      'op-tax-vat': taxDetail.vat,
      'op-other-out-balance': 0,
      'invest-recover-short': sumAggByPrefixes(aggMap, ['1101', '1102', '1103']).credit,
      'invest-recover-equity': sumAggByPrefixes(aggMap, ['1501']).credit,
      'invest-recover-bond': sumAggByPrefixes(aggMap, ['1511']).credit,
      'invest-income-income': investmentIncome,
      'invest-income-interest-begin': begin(interestReceivablePrefixes),
      'invest-income-interest-end': end(interestReceivablePrefixes),
      'invest-income-dividend-begin': begin(dividendReceivablePrefixes),
      'invest-income-dividend-end': end(dividendReceivablePrefixes),
      'invest-disposal-long-asset': sumAggByPrefixes(aggMap, longAssetPrefixes).credit,
      'invest-pay-short': sumAggByPrefixes(aggMap, ['1101', '1102', '1103']).debit,
      'invest-pay-equity': sumAggByPrefixes(aggMap, ['1501']).debit,
      'invest-pay-bond': sumAggByPrefixes(aggMap, ['1511']).debit,
      'invest-build-fixed-asset': fixedAssetDebit,
      'invest-build-construction-end': end(['1604']),
      'invest-build-construction-begin': begin(['1604']),
      'invest-build-material-end': end(['1605']),
      'invest-build-material-begin': begin(['1605']),
      'invest-build-intangible': intangibleDebit,
      'invest-build-long-prepaid': longPrepaidDebit,
      'fin-borrow-short': sumAggByPrefixes(aggMap, ['2001']).credit,
      'fin-borrow-long': sumAggByPrefixes(aggMap, ['2501']).credit,
      'fin-investor-capital': paidInCapitalCredit,
      'fin-repay-short': sumAggByPrefixes(aggMap, ['2001']).debit,
      'fin-repay-long': sumAggByPrefixes(aggMap, ['2501']).debit,
      'fin-interest-payable': interestPayableDebit,
      'fin-profit-payable': profitPayableDebit,
      'cash-begin-cash': positiveAmount(cashBeginningAt(beforeAggMap)),
      'cash-begin-bank': 0,
      'cash-begin-other-money': 0,
      'op-sales-other-revenue': 0,
      'op-sales-other': 0,
      'op-other-in-other': 0,
      'op-buy-other-cost': 0,
      'op-buy-other': 0,
      'op-staff-other': 0,
      'op-tax-other': 0,
      'op-other-out-other': 0,
      'invest-recover-other': 0,
      'invest-income-other': 0,
      'invest-disposal-other': 0,
      'invest-pay-other': 0,
      'invest-build-other': 0,
      'fin-borrow-other': 0,
      'fin-investor-other': 0,
      'fin-repay-other': 0,
      'fin-interest-other': 0,
      'fin-profit-other': 0,
      'cash-begin-other': 0,
    };

    const line: Record<CashFlowLineKey, number> = {
      operating_sales: positiveAmount(
        revenue
        + salesVatCredit
        + dec(receivableNotePrefixes)
        + dec(receivablePrefixes)
        + inc(advanceReceiptPrefixes),
      ),
      operating_other_in: positiveAmount(dec(otherReceivablePrefixes) + nonOperatingIncome),
      operating_buy: positiveAmount(
        cost
        + inputVatDebit
        + inc(materialPrefixes)
        + dec(payableNotePrefixes)
        + dec(payablePrefixes)
        + inc(prepaymentPrefixes),
      ),
      operating_staff: positiveAmount(sumAggByPrefixes(aggMap, payrollPrefixes).debit),
      operating_tax: positiveAmount(taxPaidDebit),
      operating_other_out: 0,
      operating_net: 0,
      investing_disposal: 0,
      investing_recover: positiveAmount(sumAggByPrefixes(aggMap, investmentPrefixes).credit),
      investing_income: positiveAmount(investmentIncome + dec(interestReceivablePrefixes) + dec(dividendReceivablePrefixes)),
      investing_disposal_long_asset: positiveAmount(sumAggByPrefixes(aggMap, longAssetPrefixes).credit),
      investing_other_in: 0,
      investing_pay: positiveAmount(sumAggByPrefixes(aggMap, investmentPrefixes).debit),
      investing_build: positiveAmount(
        fixedAssetDebit
        + inc(buildAssetBalancePrefixes)
        + intangibleDebit
        + longPrepaidDebit,
      ),
      investing_other_out: 0,
      investing_net: 0,
      financing_borrow: positiveAmount(sumAggByPrefixes(aggMap, borrowingPrefixes).credit),
      financing_investor: positiveAmount(paidInCapitalCredit),
      financing_other_in: 0,
      financing_repay: 0,
      financing_repay_principal: positiveAmount(sumAggByPrefixes(aggMap, borrowingPrefixes).debit),
      financing_repay_interest: positiveAmount(interestPayableDebit),
      financing_profit: positiveAmount(profitPayableDebit),
      financing_dividend_interest: 0,
      financing_other_out: 0,
      financing_net: 0,
      fx_effect: 0,
      cash_net_increase: 0,
      cash_beginning: positiveAmount(cashBeginningAt(beforeAggMap)),
      cash_ending: 0,
    };

    line.operating_net = line.operating_sales + line.operating_other_in - line.operating_buy - line.operating_staff - line.operating_tax - line.operating_other_out;
    line.investing_net = line.investing_recover + line.investing_income + line.investing_disposal_long_asset - line.investing_pay - line.investing_build;
    line.financing_net = line.financing_borrow + line.financing_investor - line.financing_repay_principal - line.financing_repay_interest - line.financing_profit;
    line.cash_net_increase = line.operating_net + line.investing_net + line.financing_net + line.fx_effect;
    line.cash_ending = line.cash_beginning + line.cash_net_increase;

    // 兜底：现金净增加额应与现金类科目余额变动一致；倒推项目因科目口径不全产生差额时，归入经营活动其他收/支。
    const actualCashNetIncrease = cashBeginningAt(endAggMap) - cashBeginningAt(beforeAggMap);
    const diff = actualCashNetIncrease - line.cash_net_increase;
    if (Math.abs(diff) > 0.005) {
      if (diff > 0) line.operating_other_in += diff;
      else {
        line.operating_other_out += Math.abs(diff);
        detail['op-other-out-balance'] = Math.abs(diff);
      }
      line.operating_net += diff;
      line.cash_net_increase += diff;
      line.cash_ending = line.cash_beginning + line.cash_net_increase;
    }

    return { line, detail };
  };

  const currentResult = calcPeriod(currentAggMap, priorCurrentAggMap, ytdAggMap);
  const yearResult = calcPeriod(ytdAggMap, emptyAgg, ytdAggMap);

  return {
    current: currentResult.line,
    year: yearResult.line,
    currentDetail: currentResult.detail,
    yearDetail: yearResult.detail,
  };
}

function classifyCashFlowDraftDetailRow(code: string, name: string): string {
  const subjectCode = String(code || '').trim();
  const subjectName = String(name || '').trim();
  if (/已交税金/.test(subjectName)) return 'op-tax-paid';
  if (/应交消费税/.test(subjectName)) return 'op-tax-consumption';
  if (/应交营业税/.test(subjectName)) return 'op-tax-business';
  if (/应交资源税/.test(subjectName)) return 'op-tax-resource';
  if (/应交所得税|企业所得税/.test(subjectName)) return 'op-tax-income';
  if (/应交土地增值税|土地增值税/.test(subjectName)) return 'op-tax-land-vat';
  if (/城市维护建设税|城建税/.test(subjectName)) return 'op-tax-urban-maintenance';
  if (/房产税/.test(subjectName)) return 'op-tax-property';
  if (/城镇土地使用税|土地使用税/.test(subjectName)) return 'op-tax-land-use';
  if (/车船使用税|车船税/.test(subjectName)) return 'op-tax-vehicle-vessel';
  if (/个人所得税/.test(subjectName)) return 'op-tax-personal';
  if (/地方教育费附加/.test(subjectName)) return 'op-tax-local-education-surcharge';
  if (/教育费附加/.test(subjectName)) return 'op-tax-education-surcharge';
  if (/矿产资源补偿费/.test(subjectName)) return 'op-tax-mineral-compensation';
  if (/排污费|环境保护税/.test(subjectName)) return 'op-tax-pollution';
  if (/印花税/.test(subjectName)) return 'op-tax-stamp';
  if (/未交增值税|应交增值税/.test(subjectName)) return 'op-tax-vat';
  if (subjectCode.startsWith('2221') || subjectCode.startsWith('2171')) return 'op-tax-other';
  if (['5001', '5051', '6001', '6051'].some((prefix) => subjectCode.startsWith(prefix))) return 'op-sales-revenue';
  if (/销项税额/.test(subjectName)) return 'op-sales-output-tax';
  if (['5401', '5402', '6401', '6402'].some((prefix) => subjectCode.startsWith(prefix))) return 'op-buy-cost';
  if (/进项税额/.test(subjectName)) return 'op-buy-input-tax';
  if (subjectCode.startsWith('2211') || subjectCode.startsWith('2151')) return 'op-staff-payroll';
  if (subjectCode.startsWith('5301') || subjectCode.startsWith('6301')) return 'op-other-in-nonop';
  if (subjectCode.startsWith('5111') || subjectCode.startsWith('6111')) return 'invest-income-income';
  if (subjectCode.startsWith('1601')) return 'invest-build-fixed-asset';
  if (subjectCode.startsWith('1701')) return 'invest-build-intangible';
  if (subjectCode.startsWith('1801')) return 'invest-build-long-prepaid';
  if (subjectCode.startsWith('2001')) return 'fin-borrow-short';
  if (subjectCode.startsWith('2501')) return 'fin-borrow-long';
  if (subjectCode.startsWith('3001') || subjectCode.startsWith('4001') || subjectCode.startsWith('4002')) return 'fin-investor-capital';
  if (/应付利息/.test(subjectName)) return 'fin-interest-payable';
  if (/应付利润|应付股利/.test(subjectName)) return 'fin-profit-payable';
  return '';
}

function buildCashFlowDraftVoucherDetails(options: {
  mains: ErpVoucherApi.VoucherMain[];
  detailList: ErpVoucherApi.VoucherDetail[][];
  start: Date;
  end: Date;
}): CashFlowDraftVoucherDetail[] {
  const result: CashFlowDraftVoucherDetail[] = [];
  const endTime = options.end.getTime();
  const startTime = options.start.getTime();
  (options.mains || []).forEach((main, idx) => {
    if (isExcludedCashFlowVoucher(main)) return;
    const voucherDate = formatDate(pickNonEmptyText((main as any).voucher_date, (main as any).createtime, (main as any).updatetime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    if (voucherTime > endTime) return;
    const periodBucket: 'current' | 'year' = voucherTime >= startTime && voucherTime <= endTime ? 'current' : 'year';
    const voucherId = getVoucherId(main);
    const voucherCode = pickNonEmptyText((main as any).voucher_code, (main as any).ReportID, (main as any).business_code);
    for (const detail of ((options.detailList[idx] || []) as any[])) {
      const accountCode = pickNonEmptyText(detail.account_code);
      const accountName = pickNonEmptyText(detail.account_name);
      const parentRowId = classifyCashFlowDraftDetailRow(accountCode, accountName);
      if (!parentRowId) continue;
      const debit = moneyNumber(detail.debit_amount ?? 0);
      const credit = moneyNumber(detail.credit_amount ?? 0);
      const isTaxRow = parentRowId.startsWith('op-tax-');
      const amount = isTaxRow ? debit : Math.abs(debit || credit);
      if (Math.abs(amount) < 1e-9) continue;
      result.push({
        rowId: 'draft-voucher-' + voucherId + '-' + getVoucherDetailId(detail) + '-' + parentRowId,
        parentRowId,
        voucherId,
        voucherDate,
        voucherCode,
        summary: pickNonEmptyText(detail.abstract_content, (main as any).description, (main as any).business_name),
        accountCode,
        accountName,
        debit,
        credit,
        amount,
        periodBucket,
      });
    }
  });
  return result.sort((a, b) => (a.voucherDate + '-' + a.voucherCode + '-' + a.accountCode).localeCompare(b.voucherDate + '-' + b.voucherCode + '-' + b.accountCode));
}

export async function fetchCashFlowReport(params: ReportQuery): Promise<CashFlowReport> {
  const month = String(params.month || '').trim();
  if (!month) {
    return {
      month,
      rows: [],
      operatingRows: [],
      investingRows: [],
      financingRows: [],
      lines: CASH_LINE_META.map((item) => ({ ...item, current: 0, year: 0 })),
      draftDetails: [],
      draftVoucherDetails: [],
      summary: { operatingNet: 0, investingNet: 0, financingNet: 0, netIncrease: 0 },
    };
  }

  const periodMode: ReportQuery['periodMode'] = params.periodMode === 'quarter' ? 'quarter' : 'month';
  const reportMonth = periodMode === 'quarter' ? quarterEndMonthOf(month) : month;
  const { subjects, openingMap, aggMap, monthEnd, mains, detailList } = await loadBaseData({ ...params, month: reportMonth });
  const yearStart = yearStartOf(reportMonth);
  const currentStart = periodStartOf(month, periodMode);
  const priorCurrentEnd = new Date(currentStart.getTime() - 1000);
  const ytdAggMap = buildSimpleAggMapFromVoucherDetails({
    mains,
    detailList,
    start: yearStart,
    end: monthEnd,
    excludeVoucher: isExcludedCashFlowVoucher,
  });
  const currentAggMap = buildSimpleAggMapFromVoucherDetails({
    mains,
    detailList,
    start: currentStart,
    end: monthEnd,
    excludeVoucher: isExcludedCashFlowVoucher,
  });
  const priorCurrentAggMap = currentStart.getTime() <= yearStart.getTime()
    ? new Map<string, SimpleVoucherAgg>()
    : buildSimpleAggMapFromVoucherDetails({
      mains,
      detailList,
      start: yearStart,
      end: priorCurrentEnd,
      excludeVoucher: isExcludedCashFlowVoucher,
    });

  const balanceMethodStat = buildCashFlowByBalanceMethod({
    subjects,
    openingMap,
    ytdAggMap,
    currentAggMap,
    priorCurrentAggMap,
  });

  const stat = createEmptyCashLineStat();
  const rows: CashFlowRow[] = [];
  const mainById = new Map<string, ErpVoucherApi.VoucherMain>();
  const detailById = new Map<string, ErpVoucherApi.VoucherDetail>();
  for (const main of mains || []) {
    const id = getVoucherId(main);
    if (id) mainById.set(id, main);
  }
  for (const details of detailList || []) {
    for (const detail of details || []) {
      const id = getVoucherDetailId(detail);
      if (id) detailById.set(id, detail);
    }
  }

  let matchedCashFlowAmountCount = 0;
  const auxRows = await getVoucherDetailAuxiliariesByVoucherIds([...mainById.keys()]);
  for (const aux of auxRows as any[]) {
    if (!isCashFlowAuxRow(aux)) continue;
    const cashFlowCode = pickNonEmptyText(aux?.value_code, aux?.value, aux?.cash_flow_code, aux?.cashFlowCode);
    const lineConfig = CASH_FLOW_CODE_TO_LINE.get(cashFlowCode);
    if (!lineConfig) continue;

    const detailId = pickNonEmptyText(aux?.voucher_detail_id, aux?.detail_id, aux?.detailId, aux?.row_id, aux?.rowid);
    const detail = detailById.get(detailId);
    if (!detail) continue;

    const accountCode = pickNonEmptyText((detail as any)?.account_code, (aux as any)?.account_code);
    const accountName = pickNonEmptyText((detail as any)?.account_name);
    if (!isCashSubject(accountCode, accountName)) continue;

    const voucherId = pickNonEmptyText(aux?.voucher_id, aux?.voucherId, (detail as any)?.voucher_id);
    const main = mainById.get(voucherId);
    if (!main) continue;

    const amount = cashFlowAmountOfCashDetail(detail, lineConfig.direction);
    if (Math.abs(amount) < 1e-9) continue;

    const voucherDate = formatDate(pickNonEmptyText((main as any).voucher_date, (main as any).createtime, (main as any).updatetime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    const inCurrent = voucherTime >= currentStart.getTime() && voucherTime <= monthEnd.getTime();
    const row: CashFlowRow = {
      rowId: `${voucherId}-${detailId}-${cashFlowCode}`,
      voucherId,
      voucherDate,
      voucherCode: pickNonEmptyText((main as any).voucher_code, (main as any).ReportID, (main as any).business_code),
      businessName: pickNonEmptyText((main as any).business_name, (main as any).voucher_type),
      summary: pickNonEmptyText((detail as any).abstract_content, (main as any).description, (main as any).business_name),
      cashSubjectCode: accountCode,
      cashSubjectName: accountName,
      counterSubject: '',
      cashFlowType: lineConfig.key.startsWith('investing_') ? 'investing' : lineConfig.key.startsWith('financing_') ? 'financing' : 'operating',
      lineKey: lineConfig.key,
      amount,
      periodBucket: inCurrent ? 'current' : 'year',
    };
    rows.push(row);
    appendCashStat(stat, lineConfig.key, 'year', amount);
    if (inCurrent) appendCashStat(stat, lineConfig.key, 'current', amount);
    matchedCashFlowAmountCount += 1;
  }

  if (matchedCashFlowAmountCount > 0) {
    setCashStat(stat, 'cash_beginning', 'current', balanceMethodStat.current.cash_beginning);
    setCashStat(stat, 'cash_beginning', 'year', balanceMethodStat.year.cash_beginning);
    finalizeCashLines(stat);
  }

  const sourceStat = matchedCashFlowAmountCount > 0 ? {
    current: Object.fromEntries(
      Object.entries(stat).map(([key, value]) => [key, moneyNumber(value.current || 0)]),
    ) as Record<CashFlowLineKey, number>,
    year: Object.fromEntries(
      Object.entries(stat).map(([key, value]) => [key, moneyNumber(value.year || 0)]),
    ) as Record<CashFlowLineKey, number>,
  } : balanceMethodStat;

  let lines = CASH_LINE_META.map((item) => ({
    ...item,
    current: sourceStat.current[item.key],
    year: sourceStat.year[item.key],
  }));

  if (params.showLastYear === true) {
    const [yearText, monthText] = month.split('-');
    const lastYearReport = await fetchCashFlowReport({
      month: String(Number(yearText) - 1) + '-' + monthText,
      periodMode,
      showLastYear: false,
    });
    const lastYearLineMap = new Map((lastYearReport.lines || []).map((line) => [String(line.key), Number(line.year || 0)]));
    lines = lines.map((line) => ({
      ...line,
      year: Number(lastYearLineMap.get(String(line.key)) || 0),
    }));
  }

  const currentLineMap = new Map(lines.map((line) => [line.key, Number(line.current || 0)]));
  const draftDetails = buildCashFlowDraftDetails(balanceMethodStat);
  const draftVoucherDetails = buildCashFlowDraftVoucherDetails({
    mains,
    detailList,
    start: currentStart,
    end: monthEnd,
  });

  return {
    month,
    rows,
    operatingRows: rows.filter((row) => row.cashFlowType === 'operating'),
    investingRows: rows.filter((row) => row.cashFlowType === 'investing'),
    financingRows: rows.filter((row) => row.cashFlowType === 'financing'),
    lines,
    draftDetails,
    draftVoucherDetails,
    summary: {
      operatingNet: Number(currentLineMap.get('operating_net') || 0),
      investingNet: Number(currentLineMap.get('investing_net') || 0),
      financingNet: Number(currentLineMap.get('financing_net') || 0),
      netIncrease: Number(currentLineMap.get('cash_net_increase') || 0),
    },
  };
}
