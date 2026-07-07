import { getVoucherDetailsByIds, getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';
import { getFinanceAuxiliaryValueOptions, type FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import { getVoucherDetailAuxiliariesByVoucherIds, type VoucherDetailAuxRow } from '#/api/erp/finance/voucher/voucherAux';

export type DeptProfitQuery = {
  month: string;
  periodMode?: 'month' | 'quarter';
};

export type DeptProfitDeptColumn = {
  deptCode?: string;
  deptId: string;
  deptName: string;
};

export type DeptProfitCell = {
  currentAmount: number;
  yearAmount: number;
};

export type DeptProfitLineKey =
  | 'operatingRevenue'
  | 'operatingCost'
  | 'taxesAndSurcharges'
  | 'sellingExpense'
  | 'adminExpense'
  | 'financeExpense'
  | 'investmentIncome'
  | 'operatingProfit'
  | 'nonOperatingIncome'
  | 'nonOperatingExpense'
  | 'totalProfit'
  | 'incomeTaxExpense'
  | 'netProfit';

export type DeptProfitStatementRow = {
  rowId: DeptProfitLineKey;
  label: string;
  lineNo: number | string;
  isTitle?: boolean;
  isStrong?: boolean;
  isExpandable?: boolean;
  values: Record<string, DeptProfitCell>;
};

export type DeptProfitReport = {
  month: string;
  periodMode: 'month' | 'quarter';
  deptColumns: DeptProfitDeptColumn[];
  rows: DeptProfitStatementRow[];
};

export const DEPT_PROFIT_TOTAL_COLUMN_ID = '__total';

type VoucherMainAny = ErpVoucherApi.VoucherMain & Record<string, any>;
type VoucherDetailAny = ErpVoucherApi.VoucherDetail & Record<string, any>;

type DeptLineBucket = {
  operatingRevenue: DeptProfitCell;
  operatingCost: DeptProfitCell;
  taxesAndSurcharges: DeptProfitCell;
  sellingExpense: DeptProfitCell;
  adminExpense: DeptProfitCell;
  financeExpense: DeptProfitCell;
  investmentIncome: DeptProfitCell;
  nonOperatingIncome: DeptProfitCell;
  nonOperatingExpense: DeptProfitCell;
  incomeTaxExpense: DeptProfitCell;
};

const LINE_META: Array<Pick<DeptProfitStatementRow, 'rowId' | 'label' | 'lineNo' | 'isTitle' | 'isStrong' | 'isExpandable'>> = [
  { rowId: 'operatingRevenue', label: '一、营业收入', lineNo: 1, isTitle: true },
  { rowId: 'operatingCost', label: '减：营业成本', lineNo: 2 },
  { rowId: 'taxesAndSurcharges', label: '税金及附加', lineNo: 3, isExpandable: true },
  { rowId: 'sellingExpense', label: '销售费用', lineNo: 11, isExpandable: true },
  { rowId: 'adminExpense', label: '管理费用', lineNo: 14, isExpandable: true },
  { rowId: 'financeExpense', label: '财务费用', lineNo: 18, isExpandable: true },
  { rowId: 'investmentIncome', label: '加：投资收益（亏损以“－”号填列）', lineNo: 20 },
  { rowId: 'operatingProfit', label: '二、营业利润（亏损以“－”号填列）', lineNo: 21, isStrong: true },
  { rowId: 'nonOperatingIncome', label: '加：营业外收入', lineNo: 22, isExpandable: true },
  { rowId: 'nonOperatingExpense', label: '减：营业外支出', lineNo: 24, isExpandable: true },
  { rowId: 'totalProfit', label: '三、利润总额（亏损总额以“－”号填列）', lineNo: 30, isStrong: true },
  { rowId: 'incomeTaxExpense', label: '减：所得税费用', lineNo: 31 },
  { rowId: 'netProfit', label: '四、净利润（净亏损以“－”号填列）', lineNo: 32, isStrong: true },
];

const SUBJECT_TO_LINE: Array<{ prefixes: string[]; key: keyof DeptLineBucket; direction: 'income' | 'expense' }> = [
  { prefixes: ['5001', '5051', '6001', '6051'], key: 'operatingRevenue', direction: 'income' },
  { prefixes: ['5401', '5402', '6401', '6402'], key: 'operatingCost', direction: 'expense' },
  { prefixes: ['5403', '6403'], key: 'taxesAndSurcharges', direction: 'expense' },
  { prefixes: ['5601', '6601'], key: 'sellingExpense', direction: 'expense' },
  { prefixes: ['5602', '6602'], key: 'adminExpense', direction: 'expense' },
  { prefixes: ['5603', '6603'], key: 'financeExpense', direction: 'expense' },
  { prefixes: ['5111', '6111'], key: 'investmentIncome', direction: 'income' },
  { prefixes: ['5301', '6301'], key: 'nonOperatingIncome', direction: 'income' },
  { prefixes: ['5711', '6711'], key: 'nonOperatingExpense', direction: 'expense' },
  { prefixes: ['5801', '6801'], key: 'incomeTaxExpense', direction: 'expense' },
];

function createCell(): DeptProfitCell {
  return { currentAmount: 0, yearAmount: 0 };
}

function createBucket(): DeptLineBucket {
  return {
    operatingRevenue: createCell(),
    operatingCost: createCell(),
    taxesAndSurcharges: createCell(),
    sellingExpense: createCell(),
    adminExpense: createCell(),
    financeExpense: createCell(),
    investmentIncome: createCell(),
    nonOperatingIncome: createCell(),
    nonOperatingExpense: createCell(),
    incomeTaxExpense: createCell(),
  };
}

function monthRange(month: string) {
  const [year, monthIndex] = String(month || '').split('-').map(Number);
  const y = year || new Date().getFullYear();
  const m = monthIndex || 1;
  return {
    start: new Date(y, m - 1, 1, 0, 0, 0),
    end: new Date(y, m, 0, 23, 59, 59),
  };
}

function quarterStartOf(month: string) {
  const [year, monthIndex] = String(month || '').split('-').map(Number);
  const quarterStartMonth = Math.floor(((monthIndex || 1) - 1) / 3) * 3;
  return new Date(year || new Date().getFullYear(), quarterStartMonth, 1, 0, 0, 0);
}

function yearStartOf(month: string) {
  const [year] = String(month || '').split('-').map(Number);
  return new Date(year || new Date().getFullYear(), 0, 1, 0, 0, 0);
}

function toIsoDateTime(date: Date) {
  return date.toISOString();
}

function formatDate(value: any): string {
  if (!value) return '';
  const text = typeof value === 'string' ? value : value.toISOString?.() || String(value);
  return text.slice(0, 10);
}

function pickNonEmptyText(...values: any[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeDeptId(value: any) {
  return String(value ?? '').trim();
}

function normalizeDimCode(value: any) {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'DEPARTMENT') return 'DEPT';
  if (text === 'AUX002') return 'DEPT';
  return text;
}

function isExcludedVoucher(item: VoucherMainAny) {
  if (Number(item?.lingma_sys_is_delete ?? 0) === 1) return true;
  if (Number(item?.is_reversed ?? 0) === 1) return true;
  const businessCode = String(item?.business_code ?? '').trim();
  const businessName = String(item?.business_name ?? '').trim();
  const description = String(item?.description ?? '').trim().toLowerCase();
  return businessCode.startsWith('PERIOD-CLOSE-')
    || businessCode.startsWith('PERIOD-REVERSE-')
    || businessName.includes('期间结转')
    || description.includes('period-close')
    || description.includes('period-reverse');
}

function pickDeptId(detail: VoucherDetailAny, main: VoucherMainAny) {
  return normalizeDeptId(
    detail.dept_id
      ?? detail.deptId
      ?? detail.department_id
      ?? detail.departmentId
      ?? detail.DepID
      ?? detail.dep_id
      ?? detail.depId
      ?? detail.org_id
      ?? detail.organ_id
      ?? main.dept_id
      ?? main.deptId
      ?? main.department_id
      ?? main.departmentId
      ?? main.DepID
      ?? main.dep_id
      ?? main.depId
      ?? main.org_id
      ?? main.organ_id,
  );
}

function pickDeptName(detail: VoucherDetailAny, main: VoucherMainAny) {
  return pickNonEmptyText(
    detail.dept_name,
    detail.deptName,
    detail.department_name,
    detail.departmentName,
    detail.DepName,
    detail.dep_name,
    detail.organ_name,
    main.dept_name,
    main.deptName,
    main.department_name,
    main.departmentName,
    main.DepName,
    main.dep_name,
    main.organ_name,
  );
}

function flattenFinanceDeptColumns(options: FinanceAuxValueOption[]) {
  const result: DeptProfitDeptColumn[] = [];
  for (const option of options || []) {
    const raw = option.raw || {};
    const deptId = normalizeDeptId(raw.value_code ?? option.value ?? raw.department_code ?? raw.row_id ?? raw.rowid);
    const code = String(raw.department_code ?? raw.value_code ?? option.value ?? '').trim();
    const name = String(raw.department_name ?? raw.value_name ?? '').trim();
    const deptName = name || code || option.label || deptId;
    if (deptId && deptName) result.push({ deptCode: code, deptId, deptName });
  }
  return result;
}

function mergeDeptColumns(...groups: DeptProfitDeptColumn[][]) {
  const map = new Map<string, DeptProfitDeptColumn>();
  for (const group of groups) {
    for (const dept of group || []) {
      if (!dept.deptId) continue;
      if (!map.has(dept.deptId)) map.set(dept.deptId, dept);
    }
  }
  return [...map.values()];
}

function addDeptColumnIfMissing(
  columns: DeptProfitDeptColumn[],
  dept: DeptProfitDeptColumn,
) {
  if (!dept.deptId || columns.some((item) => item.deptId === dept.deptId)) {
    return;
  }
  columns.push(dept);
}

function ensureDeptBucket(options: {
  deptBucketMap: Map<string, DeptLineBucket>;
  deptColumns: DeptProfitDeptColumn[];
  rawDeptId: string;
  rawDeptName: string;
  resolvedDeptId: string;
}) {
  const deptId =
    options.resolvedDeptId || options.rawDeptId || options.rawDeptName;
  if (!deptId) return undefined;

  const deptName = options.rawDeptName || options.rawDeptId || deptId;

  addDeptColumnIfMissing(options.deptColumns, {
    deptCode: options.rawDeptId,
    deptId,
    deptName,
  });
  if (!options.deptBucketMap.has(deptId)) {
    options.deptBucketMap.set(deptId, createBucket());
  }
  return options.deptBucketMap.get(deptId);
}

function createDeptMaps(depts: DeptProfitDeptColumn[]) {
  const idNameMap = new Map<string, string>();
  const nameIdMap = new Map<string, string>();
  for (const item of depts || []) {
    idNameMap.set(item.deptId, item.deptName);
    nameIdMap.set(item.deptName, item.deptId);
    if (item.deptCode) nameIdMap.set(item.deptCode, item.deptId);
  }
  return { idNameMap, nameIdMap };
}

function resolveDeptId(options: {
  rawDeptId: string;
  rawDeptName: string;
  idNameMap: Map<string, string>;
  nameIdMap: Map<string, string>;
}) {
  const { rawDeptId, rawDeptName, idNameMap, nameIdMap } = options;
  if (rawDeptId && idNameMap.has(rawDeptId)) return rawDeptId;
  if (rawDeptName && nameIdMap.has(rawDeptName)) return nameIdMap.get(rawDeptName) || '';
  return '';
}

function matchSubjectLine(code: string) {
  return SUBJECT_TO_LINE.find((item) => item.prefixes.some((prefix) => code.startsWith(prefix)));
}

function getSignedAmount(direction: 'income' | 'expense', detail: VoucherDetailAny) {
  const debit = Number(detail.debit_amount ?? 0) || 0;
  const credit = Number(detail.credit_amount ?? 0) || 0;
  return direction === 'income' ? credit - debit : debit - credit;
}

function buildDeptAuxMap(rows: VoucherDetailAuxRow[]) {
  const map = new Map<string, VoucherDetailAuxRow>();
  for (const row of rows || []) {
    if (normalizeDimCode(row.dim_code) !== 'DEPT') continue;
    const detailId = String(row.voucher_detail_id || '').trim();
    if (detailId && !map.has(detailId)) map.set(detailId, row);
  }
  return map;
}

function addToCell(cell: DeptProfitCell, bucket: 'current' | 'year', amount: number) {
  if (bucket === 'current') cell.currentAmount += amount;
  cell.yearAmount += amount;
}

function pickLineCell(bucket: DeptLineBucket, key: DeptProfitLineKey): DeptProfitCell {
  if (key === 'operatingProfit') {
    return {
      currentAmount: bucket.operatingRevenue.currentAmount
        - bucket.operatingCost.currentAmount
        - bucket.taxesAndSurcharges.currentAmount
        - bucket.sellingExpense.currentAmount
        - bucket.adminExpense.currentAmount
        - bucket.financeExpense.currentAmount
        + bucket.investmentIncome.currentAmount,
      yearAmount: bucket.operatingRevenue.yearAmount
        - bucket.operatingCost.yearAmount
        - bucket.taxesAndSurcharges.yearAmount
        - bucket.sellingExpense.yearAmount
        - bucket.adminExpense.yearAmount
        - bucket.financeExpense.yearAmount
        + bucket.investmentIncome.yearAmount,
    };
  }

  if (key === 'totalProfit') {
    const operatingProfit = pickLineCell(bucket, 'operatingProfit');
    return {
      currentAmount: operatingProfit.currentAmount + bucket.nonOperatingIncome.currentAmount - bucket.nonOperatingExpense.currentAmount,
      yearAmount: operatingProfit.yearAmount + bucket.nonOperatingIncome.yearAmount - bucket.nonOperatingExpense.yearAmount,
    };
  }

  if (key === 'netProfit') {
    const totalProfit = pickLineCell(bucket, 'totalProfit');
    return {
      currentAmount: totalProfit.currentAmount - bucket.incomeTaxExpense.currentAmount,
      yearAmount: totalProfit.yearAmount - bucket.incomeTaxExpense.yearAmount,
    };
  }

  return bucket[key as keyof DeptLineBucket] || createCell();
}

export async function fetchDeptProfitReport(params: DeptProfitQuery): Promise<DeptProfitReport> {
  const month = String(params.month || '').trim();
  const periodMode: 'month' | 'quarter' = params.periodMode === 'quarter' ? 'quarter' : 'month';
  if (!month) {
    return { month, periodMode, deptColumns: [], rows: [] };
  }

  const monthEnd = monthRange(month).end;
  const currentStart = periodMode === 'quarter' ? quarterStartOf(month) : monthRange(month).start;
  const yearStart = yearStartOf(month);

  const [financeAuxOptions, voucherPage] = await Promise.all([
    getFinanceAuxiliaryValueOptions({ dimCodes: ['DEPT'] }),
    getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(monthEnd)],
    } as any),
  ]);

  const deptColumns = mergeDeptColumns(
    flattenFinanceDeptColumns(financeAuxOptions.DEPT || []),
  );
  const { idNameMap, nameIdMap } = createDeptMaps(deptColumns);
  const totalBucket = createBucket();
  const deptBucketMap = new Map<string, DeptLineBucket>();
  for (const dept of deptColumns) deptBucketMap.set(dept.deptId, createBucket());

  const mains = ((voucherPage?.list || []) as VoucherMainAny[]).filter((item) => !isExcludedVoucher(item));
  const voucherIds = mains.map((item) => String(item.rowid ?? '')).filter(Boolean);
  const [details, auxRows] = await Promise.all([
    getVoucherDetailsByIds(voucherIds) as Promise<VoucherDetailAny[]>,
    getVoucherDetailAuxiliariesByVoucherIds(voucherIds),
  ]);
  const deptAuxMap = buildDeptAuxMap(auxRows);
  const mainMap = new Map(mains.map((item) => [String(item.rowid ?? ''), item]));

  for (const detail of details) {
    const main = mainMap.get(String(detail.voucher_id ?? '')) || ({} as VoucherMainAny);
    const code = String(detail.account_code ?? '').trim();
    const line = matchSubjectLine(code);
    if (!line) continue;

    const detailId = pickNonEmptyText(detail.rowid, detail.row_id);
    const deptAux = deptAuxMap.get(detailId);
    const voucherDate = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, detail.createtime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    const inCurrentPeriod = voucherTime >= currentStart.getTime() && voucherTime <= monthEnd.getTime();
    const amount = getSignedAmount(line.direction, detail);
    if (Math.abs(amount) < 1e-9) continue;

    const rawDeptId = pickNonEmptyText(
      deptAux?.value_code,
      pickDeptId(detail, main),
    );
    const rawDeptName = pickNonEmptyText(
      deptAux?.value_name,
      pickDeptName(detail, main),
    );
    const deptId = resolveDeptId({
      rawDeptId,
      rawDeptName,
      idNameMap,
      nameIdMap,
    });

    const bucket = ensureDeptBucket({
      deptBucketMap,
      deptColumns,
      rawDeptId,
      rawDeptName,
      resolvedDeptId: deptId,
    });
    if (!bucket) continue;

    addToCell(bucket[line.key], inCurrentPeriod ? 'current' : 'year', amount);
    addToCell(totalBucket[line.key], inCurrentPeriod ? 'current' : 'year', amount);
  }

  const allRows: DeptProfitStatementRow[] = LINE_META.map((meta) => {
    const values: Record<string, DeptProfitCell> = {
      [DEPT_PROFIT_TOTAL_COLUMN_ID]: pickLineCell(totalBucket, meta.rowId as DeptProfitLineKey),
    };
    for (const dept of deptColumns) {
      const bucket = deptBucketMap.get(dept.deptId) || createBucket();
      values[dept.deptId] = pickLineCell(bucket, meta.rowId as DeptProfitLineKey);
    }
    return { ...meta, values } as DeptProfitStatementRow;
  });

  return {
    month,
    periodMode,
    deptColumns,
    rows: allRows,
  };
}
