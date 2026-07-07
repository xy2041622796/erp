import { getVoucherDetailAuxiliariesByVoucherIds } from '#/api/erp/finance/voucher/voucherAux';
import {
  getVoucherDetailsByIds,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';
import { fetchCashFlowReport } from '#/api/erp/finance/reports';
import { moneyNumber } from '#/utils/finance/decimal-money';

export type StandardCashFlowQuery = {
  month: string;
  periodMode?: 'month' | 'quarter';
  showLastYear?: boolean;
};

export type StandardCashFlowLine = {
  key: string;
  label: string;
  lineNo: number | string;
  current: number;
  year: number;
  isSection?: boolean;
  isStrong?: boolean;
  indent?: number;
};

export type StandardCashFlowDetailRow = {
  rowId: string;
  voucherId: string;
  voucherDate: string;
  voucherCode: string;
  summary: string;
  accountCode: string;
  accountName: string;
  cashFlowCode: string;
  cashFlowName: string;
  lineKey: string;
  amount: number;
  currentAmount: number;
  yearAmount: number;
};

export type StandardCashFlowReport = {
  month: string;
  periodMode: 'month' | 'quarter';
  lines: StandardCashFlowLine[];
  details: StandardCashFlowDetailRow[];
  summary: {
    operatingNet: number;
    investingNet: number;
    financingNet: number;
    netIncrease: number;
  };
};

type LineMeta = Pick<StandardCashFlowLine, 'key' | 'label' | 'lineNo' | 'isSection' | 'isStrong' | 'indent'> & {
  cashFlowCodes?: string[];
  direction?: 'in' | 'out' | 'net' | 'none';
};

type CashLineStat = Record<string, { current: number; year: number }>;

const STANDARD_CASH_FLOW_LINES: LineMeta[] = [
  { key: 'operating_section', label: '一、经营活动产生的现金流量：', lineNo: '', isSection: true, direction: 'none' },
  { key: 'operating_sales', label: '销售商品、提供劳务收到的现金', lineNo: 1, indent: 1, cashFlowCodes: ['1'], direction: 'in' },
  { key: 'operating_tax_refund', label: '收到的税费返还', lineNo: 2, indent: 1, cashFlowCodes: ['19'], direction: 'in' },
  { key: 'operating_other_in', label: '收到其他与经营活动有关的现金', lineNo: 3, indent: 1, cashFlowCodes: ['2'], direction: 'in' },
  { key: 'operating_in_subtotal', label: '经营活动现金流入小计', lineNo: 4, isStrong: true, direction: 'net' },
  { key: 'operating_buy', label: '购买商品、接受劳务支付的现金', lineNo: 5, indent: 1, cashFlowCodes: ['3'], direction: 'out' },
  { key: 'operating_staff', label: '支付给职工以及为职工支付的现金', lineNo: 6, indent: 1, cashFlowCodes: ['4'], direction: 'out' },
  { key: 'operating_tax', label: '支付的各项税费', lineNo: 7, indent: 1, cashFlowCodes: ['5'], direction: 'out' },
  { key: 'operating_other_out', label: '支付其他与经营活动有关的现金', lineNo: 8, indent: 1, cashFlowCodes: ['6'], direction: 'out' },
  { key: 'operating_out_subtotal', label: '经营活动现金流出小计', lineNo: 9, isStrong: true, direction: 'net' },
  { key: 'operating_net', label: '经营活动产生的现金流量净额', lineNo: 10, isStrong: true, direction: 'net' },

  { key: 'investing_section', label: '二、投资活动产生的现金流量：', lineNo: '', isSection: true, direction: 'none' },
  { key: 'investing_recover', label: '收回投资收到的现金', lineNo: 11, indent: 1, cashFlowCodes: ['7'], direction: 'in' },
  { key: 'investing_income', label: '取得投资收益收到的现金', lineNo: 12, indent: 1, cashFlowCodes: ['8'], direction: 'in' },
  { key: 'investing_disposal_long_asset', label: '处置固定资产、无形资产和其他长期资产收回的现金净额', lineNo: 13, indent: 1, cashFlowCodes: ['9'], direction: 'in' },
  { key: 'investing_disposal_subsidiary', label: '处置子公司及其他营业单位收到的现金净额', lineNo: 14, indent: 1, cashFlowCodes: ['20'], direction: 'in' },
  { key: 'investing_other_in', label: '收到其他与投资活动有关的现金', lineNo: 15, indent: 1, cashFlowCodes: ['21'], direction: 'in' },
  { key: 'investing_in_subtotal', label: '投资活动现金流入小计', lineNo: 16, isStrong: true, direction: 'net' },
  { key: 'investing_build', label: '购建固定资产、无形资产和其他长期资产支付的现金', lineNo: 17, indent: 1, cashFlowCodes: ['11'], direction: 'out' },
  { key: 'investing_pay', label: '投资支付的现金', lineNo: 18, indent: 1, cashFlowCodes: ['10'], direction: 'out' },
  { key: 'investing_acquire_subsidiary', label: '取得子公司及其他营业单位支付的现金净额', lineNo: 19, indent: 1, cashFlowCodes: ['22'], direction: 'out' },
  { key: 'investing_other_out', label: '支付其他与投资活动有关的现金', lineNo: 20, indent: 1, cashFlowCodes: ['23'], direction: 'out' },
  { key: 'investing_out_subtotal', label: '投资活动现金流出小计', lineNo: 21, isStrong: true, direction: 'net' },
  { key: 'investing_net', label: '投资活动产生的现金流量净额', lineNo: 22, isStrong: true, direction: 'net' },

  { key: 'financing_section', label: '三、筹资活动产生的现金流量：', lineNo: '', isSection: true, direction: 'none' },
  { key: 'financing_investor', label: '吸收投资收到的现金', lineNo: 23, indent: 1, cashFlowCodes: ['13'], direction: 'in' },
  { key: 'financing_borrow', label: '取得借款收到的现金', lineNo: 24, indent: 1, cashFlowCodes: ['12'], direction: 'in' },
  { key: 'financing_other_in', label: '收到其他与筹资活动有关的现金', lineNo: 25, indent: 1, cashFlowCodes: ['24'], direction: 'in' },
  { key: 'financing_in_subtotal', label: '筹资活动现金流入小计', lineNo: 26, isStrong: true, direction: 'net' },
  { key: 'financing_repay_debt', label: '偿还债务支付的现金', lineNo: 27, indent: 1, cashFlowCodes: ['14'], direction: 'out' },
  { key: 'financing_dividend_interest', label: '分配股利、利润或偿付利息支付的现金', lineNo: 28, indent: 1, cashFlowCodes: ['15', '16'], direction: 'out' },
  { key: 'financing_other_out', label: '支付其他与筹资活动有关的现金', lineNo: 29, indent: 1, cashFlowCodes: ['25'], direction: 'out' },
  { key: 'financing_out_subtotal', label: '筹资活动现金流出小计', lineNo: 30, isStrong: true, direction: 'net' },
  { key: 'financing_net', label: '筹资活动产生的现金流量净额', lineNo: 31, isStrong: true, direction: 'net' },

  { key: 'fx_effect', label: '四、汇率变动对现金及现金等价物的影响', lineNo: 32, isStrong: true, cashFlowCodes: ['26'], direction: 'in' },
  { key: 'cash_net_increase', label: '五、现金及现金等价物净增加额', lineNo: 33, isStrong: true, direction: 'net' },
  { key: 'cash_beginning', label: '加：期初现金及现金等价物余额', lineNo: 34, isStrong: true, cashFlowCodes: ['18'], direction: 'in' },
  { key: 'cash_ending', label: '六、期末现金及现金等价物余额', lineNo: 35, isStrong: true, direction: 'net' },
];

const CODE_TO_LINE = new Map<string, LineMeta>();
STANDARD_CASH_FLOW_LINES.forEach((line) => {
  (line.cashFlowCodes || []).forEach((code) => CODE_TO_LINE.set(code, line));
});

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59);
  return { start, end };
}

function quarterStartOf(month: string) {
  const [y, m] = month.split('-').map(Number);
  const qm = Math.floor(((m || 1) - 1) / 3) * 3;
  return new Date(y!, qm, 1, 0, 0, 0);
}

function yearStartOf(month: string) {
  const [y] = month.split('-').map(Number);
  return new Date(y!, 0, 1, 0, 0, 0);
}

function toIsoDateTime(date: Date) {
  return date.toISOString();
}

function formatDate(value: any) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : (value as Date).toISOString();
  return text.slice(0, 10);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim();
    if (value) return value;
  }
  return '';
}

function getVoucherId(row: any) {
  return pickNonEmptyText(row?.rowid, row?.row_id);
}

function getDetailId(row: any) {
  return pickNonEmptyText(row?.rowid, row?.row_id);
}

function isCashFlowAuxRow(row: any) {
  const dimCode = String(row?.dim_code ?? '').trim().toUpperCase();
  const dimName = String(row?.dim_name ?? '').trim();
  const valueCode = String(row?.value_code ?? '').trim();
  const valueName = String(row?.value_name ?? '').trim();
  return dimCode === 'CASH_FLOW'
    || dimCode === 'CASHFLOW'
    || dimCode === 'XJLL'
    || dimCode === '7'
    || dimName.includes('现金流')
    || valueName.includes('现金流')
    || CODE_TO_LINE.has(valueCode);
}

function createEmptyStat(): CashLineStat {
  const stat: CashLineStat = {};
  for (const line of STANDARD_CASH_FLOW_LINES) stat[line.key] = { current: 0, year: 0 };
  return stat;
}

function appendStat(stat: CashLineStat, lineKey: string, bucket: 'current' | 'year', amount: number) {
  if (!stat[lineKey]) stat[lineKey] = { current: 0, year: 0 };
  stat[lineKey][bucket] += amount;
}

async function appendBalanceMethodFallback(
  stat: CashLineStat,
  params: Required<Pick<StandardCashFlowQuery, 'month'>> & Pick<StandardCashFlowQuery, 'periodMode'>,
) {
  const report = await fetchCashFlowReport({
    month: params.month,
    periodMode: params.periodMode,
    showLastYear: false,
  });
  const fallbackMap = new Map((report.lines || []).map((line) => [String(line.key), line]));
  const valueOf = (key: string, bucket: 'current' | 'year') => Number(fallbackMap.get(key)?.[bucket] || 0);
  const setFrom = (targetKey: string, sourceKeys: string[]) => {
    (['current', 'year'] as const).forEach((bucket) => {
      appendStat(
        stat,
        targetKey,
        bucket,
        sourceKeys.reduce((sum, key) => sum + valueOf(key, bucket), 0),
      );
    });
  };

  setFrom('operating_sales', ['operating_sales']);
  setFrom('operating_other_in', ['operating_other_in']);
  setFrom('operating_buy', ['operating_buy']);
  setFrom('operating_staff', ['operating_staff']);
  setFrom('operating_tax', ['operating_tax']);
  setFrom('operating_other_out', ['operating_other_out']);
  setFrom('investing_recover', ['investing_recover']);
  setFrom('investing_income', ['investing_income']);
  setFrom('investing_disposal_long_asset', ['investing_disposal_long_asset']);
  setFrom('investing_other_in', ['investing_other_in']);
  setFrom('investing_build', ['investing_build']);
  setFrom('investing_pay', ['investing_pay']);
  setFrom('investing_other_out', ['investing_other_out']);
  setFrom('financing_investor', ['financing_investor']);
  setFrom('financing_borrow', ['financing_borrow']);
  setFrom('financing_other_in', ['financing_other_in']);
  setFrom('financing_repay_debt', ['financing_repay', 'financing_repay_principal']);
  setFrom('financing_dividend_interest', ['financing_dividend_interest', 'financing_repay_interest', 'financing_profit']);
  setFrom('financing_other_out', ['financing_other_out']);
  setFrom('fx_effect', ['fx_effect']);
  setFrom('cash_beginning', ['cash_beginning']);
}

function finalizeStat(stat: CashLineStat) {
  const val = (key: string, bucket: 'current' | 'year') => Number(stat[key]?.[bucket] || 0);
  const set = (key: string, bucket: 'current' | 'year', value: number) => {
    if (!stat[key]) stat[key] = { current: 0, year: 0 };
    stat[key][bucket] = value;
  };

  (['current', 'year'] as const).forEach((bucket) => {
    const operatingIn = val('operating_sales', bucket) + val('operating_tax_refund', bucket) + val('operating_other_in', bucket);
    const operatingOut = val('operating_buy', bucket) + val('operating_staff', bucket) + val('operating_tax', bucket) + val('operating_other_out', bucket);
    set('operating_in_subtotal', bucket, operatingIn);
    set('operating_out_subtotal', bucket, operatingOut);
    set('operating_net', bucket, operatingIn - operatingOut);

    const investingIn = val('investing_recover', bucket) + val('investing_income', bucket) + val('investing_disposal_long_asset', bucket) + val('investing_disposal_subsidiary', bucket) + val('investing_other_in', bucket);
    const investingOut = val('investing_build', bucket) + val('investing_pay', bucket) + val('investing_acquire_subsidiary', bucket) + val('investing_other_out', bucket);
    set('investing_in_subtotal', bucket, investingIn);
    set('investing_out_subtotal', bucket, investingOut);
    set('investing_net', bucket, investingIn - investingOut);

    const financingIn = val('financing_investor', bucket) + val('financing_borrow', bucket) + val('financing_other_in', bucket);
    const financingOut = val('financing_repay_debt', bucket) + val('financing_dividend_interest', bucket) + val('financing_other_out', bucket);
    set('financing_in_subtotal', bucket, financingIn);
    set('financing_out_subtotal', bucket, financingOut);
    set('financing_net', bucket, financingIn - financingOut);

    const netIncrease = val('operating_net', bucket) + val('investing_net', bucket) + val('financing_net', bucket) + val('fx_effect', bucket);
    set('cash_net_increase', bucket, netIncrease);
    set('cash_ending', bucket, val('cash_beginning', bucket) + netIncrease);
  });
}

function amountForLine(line: LineMeta, detail: ErpVoucherApi.VoucherDetail) {
  const raw = moneyNumber(Number(detail.debit_amount || 0) - Number(detail.credit_amount || 0));
  if (line.direction === 'out') return Math.abs(raw || Number(detail.credit_amount || 0) || Number(detail.debit_amount || 0));
  if (line.direction === 'in') return Math.abs(raw || Number(detail.debit_amount || 0) || Number(detail.credit_amount || 0));
  return raw;
}

async function fetchReportCore(params: Required<Pick<StandardCashFlowQuery, 'month'>> & Pick<StandardCashFlowQuery, 'periodMode'>) {
  const month = String(params.month || '').trim();
  const periodMode: 'month' | 'quarter' = params.periodMode === 'quarter' ? 'quarter' : 'month';
  if (!month) {
    return {
      month,
      periodMode,
      lines: STANDARD_CASH_FLOW_LINES.map((line) => ({ ...line, current: 0, year: 0 })),
      details: [],
      summary: { operatingNet: 0, investingNet: 0, financingNet: 0, netIncrease: 0 },
    } as StandardCashFlowReport;
  }

  const { end: monthEnd, start: monthStart } = monthRange(month);
  const yearStart = yearStartOf(month);
  const currentStart = periodMode === 'quarter' ? quarterStartOf(month) : monthStart;

  const voucherPage = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(monthEnd)],
  } as any);
  const mains = ((voucherPage?.list || []) as ErpVoucherApi.VoucherMain[])
    .filter((item: any) => Number(item?.lingma_sys_is_delete ?? 0) !== 1)
    .filter((item: any) => Number(item?.is_reversed ?? 0) !== 1);

  const voucherIds = mains.map(getVoucherId).filter(Boolean);
  const detailRows = await getVoucherDetailsByIds(voucherIds);
  const detailById = new Map<string, ErpVoucherApi.VoucherDetail>();
  for (const detail of detailRows) {
    const id = getDetailId(detail);
    if (id) detailById.set(id, detail);
  }

  const mainById = new Map<string, ErpVoucherApi.VoucherMain>();
  for (const main of mains) {
    const id = getVoucherId(main);
    if (id) mainById.set(id, main);
  }

  const auxRows = await getVoucherDetailAuxiliariesByVoucherIds(voucherIds);
  const stat = createEmptyStat();
  const details: StandardCashFlowDetailRow[] = [];
  let matchedCashFlowAmountCount = 0;

  for (const aux of auxRows as any[]) {
    if (!isCashFlowAuxRow(aux)) continue;
    const cashFlowCode = pickNonEmptyText(aux?.value_code, aux?.value, aux?.cash_flow_code, aux?.cashFlowCode);
    const line = CODE_TO_LINE.get(cashFlowCode);
    if (!line) continue;

    const detailId = pickNonEmptyText(aux?.voucher_detail_id, aux?.detail_id, aux?.detailId, aux?.row_id, aux?.rowid);
    const detail = detailById.get(detailId);
    if (!detail) continue;

    const voucherId = pickNonEmptyText(aux?.voucher_id, aux?.voucherId, detail?.voucher_id);
    const main = mainById.get(voucherId);
    if (!main) continue;

    const voucherDate = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, main.updatetime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    const inCurrent = voucherTime >= currentStart.getTime() && voucherTime <= monthEnd.getTime();
    const amount = amountForLine(line, detail);
    if (Math.abs(amount) < 1e-9) continue;

    appendStat(stat, line.key, 'year', amount);
    if (inCurrent) appendStat(stat, line.key, 'current', amount);
    matchedCashFlowAmountCount += 1;

    details.push({
      rowId: `${voucherId}-${detailId}-${cashFlowCode}`,
      voucherId,
      voucherDate,
      voucherCode: pickNonEmptyText(main.voucher_code, main.ReportID, main.business_code),
      summary: pickNonEmptyText(detail.abstract_content, main.description, main.business_name),
      accountCode: pickNonEmptyText(detail.account_code, aux.account_code),
      accountName: pickNonEmptyText(detail.account_name),
      cashFlowCode,
      cashFlowName: pickNonEmptyText(aux.value_name, line.label),
      lineKey: line.key,
      amount,
      currentAmount: inCurrent ? amount : 0,
      yearAmount: amount,
    });
  }

  if (matchedCashFlowAmountCount === 0) {
    await appendBalanceMethodFallback(stat, { month, periodMode });
  }

  finalizeStat(stat);
  const lines = STANDARD_CASH_FLOW_LINES.map((line) => ({
    ...line,
    current: moneyNumber(stat[line.key]?.current || 0),
    year: moneyNumber(stat[line.key]?.year || 0),
  }));
  const lineMap = new Map(lines.map((line) => [line.key, Number(line.current || 0)]));

  return {
    month,
    periodMode,
    lines,
    details: details.sort((a, b) => `${a.voucherDate}-${a.voucherCode}`.localeCompare(`${b.voucherDate}-${b.voucherCode}`)),
    summary: {
      operatingNet: Number(lineMap.get('operating_net') || 0),
      investingNet: Number(lineMap.get('investing_net') || 0),
      financingNet: Number(lineMap.get('financing_net') || 0),
      netIncrease: Number(lineMap.get('cash_net_increase') || 0),
    },
  } as StandardCashFlowReport;
}

export async function fetchStandardCashFlowReport(params: StandardCashFlowQuery): Promise<StandardCashFlowReport> {
  const month = String(params.month || '').trim();
  const periodMode: 'month' | 'quarter' = params.periodMode === 'quarter' ? 'quarter' : 'month';
  let report = await fetchReportCore({ month, periodMode });

  if (params.showLastYear === true && month) {
    const [yearText, monthText] = month.split('-');
    const lastYearMonth = `${Number(yearText) - 1}-${monthText}`;
    const lastYearReport = await fetchReportCore({ month: lastYearMonth, periodMode });
    const lastYearMap = new Map((lastYearReport.lines || []).map((line) => [line.key, Number(line.year || 0)]));
    report = {
      ...report,
      lines: report.lines.map((line) => ({
        ...line,
        year: Number(lastYearMap.get(line.key) || 0),
      })),
    };
  }

  return report;
}
