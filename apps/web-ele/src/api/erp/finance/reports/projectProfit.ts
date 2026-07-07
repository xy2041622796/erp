import { getVoucherDetailsByIds, getVoucherPage, type ErpVoucherApi } from '#/api/erp/finance/voucher';
import { getFinanceAuxiliaryValueOptions, type FinanceAuxValueOption } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';
import { getVoucherDetailAuxiliariesByVoucherIds, type VoucherDetailAuxRow } from '#/api/erp/finance/voucher/voucherAux';
import { getProjectManageSimpleList, type ErpProjectManageApi } from '#/api/erp/project/manage';

export type ProjectProfitQuery = {
  month: string;
  periodMode?: 'month' | 'quarter';
};

export type ProjectProfitProjectColumn = {
  projectCode?: string;
  projectId: string;
  projectName: string;
};

export type ProjectProfitCell = {
  currentAmount: number;
  yearAmount: number;
};

export type ProjectProfitLineKey =
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

export type ProjectProfitStatementRow = {
  rowId: ProjectProfitLineKey;
  label: string;
  lineNo: number | string;
  isTitle?: boolean;
  isStrong?: boolean;
  isExpandable?: boolean;
  values: Record<string, ProjectProfitCell>;
};

export type ProjectProfitReport = {
  month: string;
  periodMode: 'month' | 'quarter';
  projectColumns: ProjectProfitProjectColumn[];
  rows: ProjectProfitStatementRow[];
};

export const PROJECT_PROFIT_TOTAL_COLUMN_ID = '__total';

type VoucherMainAny = ErpVoucherApi.VoucherMain & Record<string, any>;
type VoucherDetailAny = ErpVoucherApi.VoucherDetail & Record<string, any>;

type ProjectLineBucket = {
  operatingRevenue: ProjectProfitCell;
  operatingCost: ProjectProfitCell;
  taxesAndSurcharges: ProjectProfitCell;
  sellingExpense: ProjectProfitCell;
  adminExpense: ProjectProfitCell;
  financeExpense: ProjectProfitCell;
  investmentIncome: ProjectProfitCell;
  nonOperatingIncome: ProjectProfitCell;
  nonOperatingExpense: ProjectProfitCell;
  incomeTaxExpense: ProjectProfitCell;
};

const LINE_META: Array<Pick<ProjectProfitStatementRow, 'rowId' | 'label' | 'lineNo' | 'isTitle' | 'isStrong' | 'isExpandable'>> = [
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

const SUBJECT_TO_LINE: Array<{ prefixes: string[]; key: keyof ProjectLineBucket; direction: 'income' | 'expense' }> = [
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

function createCell(): ProjectProfitCell {
  return { currentAmount: 0, yearAmount: 0 };
}

function createBucket(): ProjectLineBucket {
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

function normalizeProjectId(value: any) {
  return String(value ?? '').trim();
}

function normalizeDimCode(value: any) {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'AUX005') return 'PROJECT';
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

function pickProjectId(detail: VoucherDetailAny, main: VoucherMainAny) {
  return normalizeProjectId(
    detail.project_id
      ?? detail.projectId
      ?? detail.project_rowid
      ?? detail.projectRowid
      ?? detail.project_code
      ?? main.project_id
      ?? main.projectId
      ?? main.project_rowid
      ?? main.projectRowid
      ?? main.project_code,
  );
}

function pickProjectName(detail: VoucherDetailAny, main: VoucherMainAny) {
  return pickNonEmptyText(
    detail.project_name,
    detail.projectName,
    detail.project_code,
    detail.projectCode,
    main.project_name,
    main.projectName,
    main.project_code,
    main.projectCode,
  );
}

function flattenManageProjectColumns(list: ErpProjectManageApi.Project[]) {
  const result: ProjectProfitProjectColumn[] = [];
  for (const item of list || []) {
    const projectId = normalizeProjectId(item.rowid ?? item.project_code);
    const code = String(item.project_code ?? '').trim();
    const name = String(item.project_name ?? '').trim();
    const projectName = name || code || projectId;
    if (projectId && projectName) result.push({ projectCode: code, projectId, projectName });
  }
  return result;
}

function flattenFinanceProjectColumns(options: FinanceAuxValueOption[]) {
  const result: ProjectProfitProjectColumn[] = [];
  for (const option of options || []) {
    const raw = option.raw || {};
    const projectId = normalizeProjectId(raw.value_code ?? option.value ?? raw.project_code ?? raw.row_id ?? raw.rowid);
    const code = String(raw.project_code ?? raw.value_code ?? option.value ?? '').trim();
    const name = String(raw.project_name ?? raw.value_name ?? '').trim();
    const projectName = name || code || option.label || projectId;
    if (projectId && projectName) result.push({ projectCode: code, projectId, projectName });
  }
  return result;
}

function mergeProjectColumns(...groups: ProjectProfitProjectColumn[][]) {
  const map = new Map<string, ProjectProfitProjectColumn>();
  for (const group of groups) {
    for (const project of group || []) {
      if (!project.projectId) continue;
      if (!map.has(project.projectId)) map.set(project.projectId, project);
    }
  }
  return [...map.values()];
}

function createProjectMaps(projects: ProjectProfitProjectColumn[]) {
  const idNameMap = new Map<string, string>();
  const nameIdMap = new Map<string, string>();
  for (const item of projects || []) {
    const projectId = normalizeProjectId(item.projectId);
    const displayName = String(item.projectName || projectId).trim();
    if (!projectId || !displayName) continue;
    idNameMap.set(projectId, displayName);
    nameIdMap.set(displayName, projectId);
    if (item.projectCode) nameIdMap.set(item.projectCode, projectId);
  }
  return { idNameMap, nameIdMap };
}

function resolveProjectId(options: {
  rawProjectId: string;
  rawProjectName: string;
  idNameMap: Map<string, string>;
  nameIdMap: Map<string, string>;
}) {
  const { rawProjectId, rawProjectName, idNameMap, nameIdMap } = options;
  if (rawProjectId && idNameMap.has(rawProjectId)) return rawProjectId;
  if (rawProjectName && nameIdMap.has(rawProjectName)) return nameIdMap.get(rawProjectName) || '';
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

function buildProjectAuxMap(rows: VoucherDetailAuxRow[]) {
  const map = new Map<string, VoucherDetailAuxRow>();
  for (const row of rows || []) {
    if (normalizeDimCode(row.dim_code) !== 'PROJECT') continue;
    const detailId = String(row.voucher_detail_id || '').trim();
    if (detailId && !map.has(detailId)) map.set(detailId, row);
  }
  return map;
}

function addToCell(cell: ProjectProfitCell, bucket: 'current' | 'year', amount: number) {
  if (bucket === 'current') cell.currentAmount += amount;
  cell.yearAmount += amount;
}

function pickLineCell(bucket: ProjectLineBucket, key: ProjectProfitLineKey): ProjectProfitCell {
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

  return bucket[key as keyof ProjectLineBucket] || createCell();
}

function hasAnyAmount(cell: ProjectProfitCell) {
  return Math.abs(Number(cell.currentAmount || 0)) >= 1e-9 || Math.abs(Number(cell.yearAmount || 0)) >= 1e-9;
}

export async function fetchProjectProfitReport(params: ProjectProfitQuery): Promise<ProjectProfitReport> {
  const month = String(params.month || '').trim();
  const periodMode: 'month' | 'quarter' = params.periodMode === 'quarter' ? 'quarter' : 'month';
  if (!month) {
    return { month, periodMode, projectColumns: [], rows: [] };
  }

  const monthEnd = monthRange(month).end;
  const currentStart = periodMode === 'quarter' ? quarterStartOf(month) : monthRange(month).start;
  const yearStart = yearStartOf(month);

  const [financeAuxOptions, projectList, voucherPage] = await Promise.all([
    getFinanceAuxiliaryValueOptions({ dimCodes: ['PROJECT'] }),
    getProjectManageSimpleList(),
    getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [toIsoDateTime(yearStart), toIsoDateTime(monthEnd)],
    } as any),
  ]);

  const projectColumns = mergeProjectColumns(
    flattenFinanceProjectColumns(financeAuxOptions.PROJECT || []),
    flattenManageProjectColumns(projectList || []),
  );
  const { idNameMap, nameIdMap } = createProjectMaps(projectColumns);
  const totalBucket = createBucket();
  const projectBucketMap = new Map<string, ProjectLineBucket>();
  for (const project of projectColumns) projectBucketMap.set(project.projectId, createBucket());

  const mains = ((voucherPage?.list || []) as VoucherMainAny[]).filter((item) => !isExcludedVoucher(item));
  const voucherIds = mains.map((item) => String(item.rowid ?? '')).filter(Boolean);
  const [details, auxRows] = await Promise.all([
    getVoucherDetailsByIds(voucherIds) as Promise<VoucherDetailAny[]>,
    getVoucherDetailAuxiliariesByVoucherIds(voucherIds),
  ]);
  const projectAuxMap = buildProjectAuxMap(auxRows);
  const mainMap = new Map(mains.map((item) => [String(item.rowid ?? ''), item]));

  for (const detail of details) {
    const main = mainMap.get(String(detail.voucher_id ?? '')) || ({} as VoucherMainAny);
    const code = String(detail.account_code ?? '').trim();
    const line = matchSubjectLine(code);
    if (!line) continue;

    const voucherDate = formatDate(pickNonEmptyText(main.voucher_date, main.createtime, detail.createtime));
    const voucherTime = voucherDate ? new Date(voucherDate).getTime() : 0;
    const inCurrentPeriod = voucherTime >= currentStart.getTime() && voucherTime <= monthEnd.getTime();
    const amount = getSignedAmount(line.direction, detail);
    if (Math.abs(amount) < 1e-9) continue;

    const detailId = pickNonEmptyText(detail.rowid, detail.row_id);
    const projectAux = projectAuxMap.get(detailId);
    const projectId = resolveProjectId({
      rawProjectId: pickNonEmptyText(projectAux?.value_code, pickProjectId(detail, main)),
      rawProjectName: pickNonEmptyText(projectAux?.value_name, pickProjectName(detail, main)),
      idNameMap,
      nameIdMap,
    });
    if (!projectId) continue;

    const bucket = projectBucketMap.get(projectId);
    if (!bucket) continue;

    addToCell(bucket[line.key], inCurrentPeriod ? 'current' : 'year', amount);
    addToCell(totalBucket[line.key], inCurrentPeriod ? 'current' : 'year', amount);
  }

  const allRows: ProjectProfitStatementRow[] = LINE_META.map((meta) => {
    const values: Record<string, ProjectProfitCell> = {
      [PROJECT_PROFIT_TOTAL_COLUMN_ID]: pickLineCell(totalBucket, meta.rowId as ProjectProfitLineKey),
    };
    for (const project of projectColumns) {
      const bucket = projectBucketMap.get(project.projectId) || createBucket();
      values[project.projectId] = pickLineCell(bucket, meta.rowId as ProjectProfitLineKey);
    }
    return { ...meta, values } as ProjectProfitStatementRow;
  });
  const visibleProjectColumns = projectColumns.filter((project) =>
    allRows.some((row) => hasAnyAmount(row.values[project.projectId])),
  );
  const visibleProjectIds = new Set(visibleProjectColumns.map((project) => project.projectId));
  const rows: ProjectProfitStatementRow[] = allRows.map((row) => ({
    ...row,
    values: Object.fromEntries(
      Object.entries(row.values).filter(
        ([projectId]) => projectId === PROJECT_PROFIT_TOTAL_COLUMN_ID || visibleProjectIds.has(projectId),
      ),
    ),
  }));

  return {
    month,
    periodMode,
    projectColumns: visibleProjectColumns,
    rows,
  };
}
