import { and, cond, DataTable } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';
import {
  createVoucher,
  getNextVoucherCodeByDate,
  getVoucherDetailsByIds,
  getVoucherPage,
} from '#/api/erp/finance/voucher';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';

export interface PeriodCheckItem {
  key: string;
  label: string;
  amount: number;
  status: 'ready' | 'empty';
  module?: string;
  description: string;
  voucherTemplate: {
    debit: string;
    credit: string;
    debitSubjectCode?: string;
    creditSubjectCode?: string;
  };
  source?: string;
  sourceUrl?: string;
}

export interface PeriodCheckResult {
  period: string;
  startDate: string;
  endDate: string;
  voucherDate: string;
  totalAmount: number;
  readyCount: number;
  emptyCount: number;
  canProceedToNext: boolean;
  hint: string;
  items: PeriodCheckItem[];
}

export interface PeriodCheckParams {
  period: string;
  voucherDate?: string;
  accountSetId?: string;
  companyName?: string;
}

export interface PeriodCheckVoucherRequest extends PeriodCheckParams {
  key: string;
  amount?: number;
}

const SALE_OUT_MODEL_ID = '57728102F41B537F6795ABA7EC258F36';
const SALE_OUT_TABLE = 'erp_sale_out';
const SALE_OUT_DB = 'LMBill';
const SALE_OUT_PK = 'id';

const SALE_OUT_ITEM_MODEL_ID = '57728102F41B537F6795ABA7EC258F36';
const SALE_OUT_ITEM_TABLE = 'erp_sale_out_items';
const SALE_OUT_ITEM_DB = 'LMBill';
const SALE_OUT_ITEM_PK = 'id';

const PRODUCT_MODEL_ID = '808171E1BEEB39628534FFE429195F38';
const PRODUCT_TABLE = 'Bil_Product_Info';
const PRODUCT_DB = 'LMBill';
const PRODUCT_PK = 'rowid';

const VOUCHER_BUSINESS_URL = 'erp/settings/period-close';

const DIMENSION_SET_MODEL_ID = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_DETAIL_MODEL_ID = '07D264520034366B1DA25CEE5358E502';
const DIMENSION_SET_TABLE = 'Bil_Dimension_Set';
const DIMENSION_DETAIL_TABLE = 'Bil_Dimension_Detail';
const DIMENSION_DB = 'LMBill';
const DIMENSION_SET_PK = 'row_id';
const DIMENSION_DETAIL_PK = 'row_id';
const SALARY_KEYWORDS = ['SALARY', 'WAGE', 'PAYROLL', '工资', '薪酬', '薪资'];
const FINANCIAL_AMOUNT_DIM_CODES = ['AMOUNT', 'SUBJECT'];

interface UnclosedDimensionSummary {
  amount: number;
  names: string[];
}

const EMPTY_UNCLOSED_DIMENSION_SUMMARY: UnclosedDimensionSummary = {
  amount: 0,
  names: [],
};

function getPeriodRange(period: string) {
  const [yearText, monthText] = String(period || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error('期间格式错误，应为 YYYY-MM');
  }
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const format = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  return {
    startDate: format(start),
    endDate: format(end),
  };
}

function round2(value: any) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toArrayRows<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.list)) return value.list as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.Items)) return value.Items as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.data?.list)) return value.data.list as T[];
  if (Array.isArray(value?.data?.rows)) return value.data.rows as T[];
  if (Array.isArray(value?.data?.items)) return value.data.items as T[];
  if (Array.isArray(value?.data?.Items)) return value.data.Items as T[];
  if (Array.isArray(value?.data?.Result?.data?.Items)) return value.data.Result.data.Items as T[];
  if (Array.isArray(value?.data?.Result?.Items)) return value.data.Result.Items as T[];
  if (Array.isArray(value?.Result?.data?.Items)) return value.Result.data.Items as T[];
  if (Array.isArray(value?.Result?.Items)) return value.Result.Items as T[];
  return [];
}

function bitToNumber(value: any) {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value ? 1 : 0;
  if (value instanceof Uint8Array) return Number(value[0] || 0) ? 1 : 0;
  if (Array.isArray(value?.data)) return Number(value.data[0] || 0) ? 1 : 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', '\\u0001'].includes(normalized) ? 1 : 0;
}

function pickRowId(item: any) {
  return String(item?.row_id || item?.rowid || item?.id || '').trim();
}

function containsAnyKeyword(value: any, keywords = SALARY_KEYWORDS) {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return false;
  return keywords.some((keyword) => text.includes(String(keyword).toUpperCase()));
}

function resolveAccountSetId(accountSetId?: string) {
  return String(accountSetId || '').trim() || getStoredAccountSetId() || '';
}

function buildAccountSetConds(accountSetId?: string) {
  const resolvedId = resolveAccountSetId(accountSetId);
  return resolvedId ? [cond('account_set_id', 'equal', resolvedId)] : [];
}

async function fetchTableItems(table: DataTable, pageSize = 9999) {
  const res = await requestClient.post(
    table.queryUrl,
    table.getQueryParam('Table', table.Filter, null, null, pageSize, 1),
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  table.execQueryResult(res as any);
  return toArrayRows(table.items).length ? toArrayRows(table.items) : toArrayRows(res);
}

async function getUnclosedDimensionSets(startDate: string, endDate: string, accountSetId?: string) {
  const table = createFinanceDataTable(
    DIMENSION_SET_MODEL_ID,
    DIMENSION_SET_TABLE,
    DIMENSION_DB,
    DIMENSION_SET_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('biz_date', 'greaterthanorequal', `${startDate} 00:00:00`),
    cond('biz_date', 'lessthanorequal', `${endDate} 23:59:59`),
    ...buildAccountSetConds(accountSetId),
  );

  return (await fetchTableItems(table)).filter((item: any) =>
    bitToNumber(item?.is_voucher_required) === 1 && !String(item?.voucher_no || '').trim(),
  );
}

async function getDimensionDetailsBySetIds(setIds: string[], accountSetId?: string) {
  if (!setIds.length) return [];
  const table = createFinanceDataTable(
    DIMENSION_DETAIL_MODEL_ID,
    DIMENSION_DETAIL_TABLE,
    DIMENSION_DB,
    DIMENSION_DETAIL_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    ...buildAccountSetConds(accountSetId),
  );

  return (await fetchTableItems(table)).filter((item: any) =>
    setIds.includes(String(item?.set_id || '').trim()),
  );
}

function isSalaryDimensionSet(setItem: any, details: any[]) {
  return [
    setItem?.event_code,
    setItem?.biz_category,
    setItem?.description,
    setItem?.ref_id,
    ...details.flatMap((detail) => [detail?.dim_code, detail?.value_code, detail?.description]),
  ].some((value) => containsAnyKeyword(value));
}

function getDimensionSetAmount(details: any[]) {
  const candidates = details
    .filter((detail) => {
      const dimCode = String(detail?.dim_code || '').trim().toUpperCase();
      const dimCategory = String(detail?.dim_category || '').trim().toUpperCase();
      return dimCategory === 'FINANCIAL' && FINANCIAL_AMOUNT_DIM_CODES.includes(dimCode);
    })
    .map((detail) => Math.abs(Number(detail?.amount || 0)))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (candidates.length) return Math.max(...candidates);
  return Math.max(
    0,
    ...details
      .map((detail) => Math.abs(Number(detail?.amount || 0)))
      .filter((amount) => Number.isFinite(amount) && amount > 0),
  );
}

async function getUnclosedSalaryDimensionSummary(startDate: string, endDate: string, period: string, accountSetId?: string): Promise<UnclosedDimensionSummary> {
  try {
    const sets = await getUnclosedDimensionSets(startDate, endDate, accountSetId);
    const setIds = sets.map(pickRowId).filter(Boolean);
    if (!setIds.length) return EMPTY_UNCLOSED_DIMENSION_SUMMARY;
    const details = await getDimensionDetailsBySetIds(setIds, accountSetId);
    const detailMap = new Map<string, any[]>();
    for (const detail of details) {
      const setId = String(detail?.set_id || '').trim();
      if (!setId) continue;
      const detailPeriod = String(detail?.period || '').trim();
      if (detailPeriod && detailPeriod !== period) continue;
      const rows = detailMap.get(setId) || [];
      rows.push(detail);
      detailMap.set(setId, rows);
    }

    const names: string[] = [];
    const amount = sets.reduce((sum: number, setItem: any) => {
      const setId = pickRowId(setItem);
      const childRows = detailMap.get(setId) || [];
      if (!childRows.length || !isSalaryDimensionSet(setItem, childRows)) return sum;
      const itemAmount = getDimensionSetAmount(childRows);
      const name = String(setItem?.description || setItem?.event_code || setItem?.biz_category || setItem?.ref_id || '').trim();
      if (name) names.push(name);
      return sum + itemAmount;
    }, 0);
    return { amount: round2(amount), names: Array.from(new Set(names)).slice(0, 5) };
  } catch (error) {
    return EMPTY_UNCLOSED_DIMENSION_SUMMARY;
  }
}

async function getSalesCostAmount(startDate: string, endDate: string, accountSetId?: string) {
  const start = startDate + ' 00:00:00';
  const end = endDate + ' 23:59:59';
  const monthRange = [start, end];

  try {
    const page = await getVoucherPage({
      accountSetId: resolveAccountSetId(accountSetId),
      pageNo: 1,
      page: 0,
      voucherDateRange: monthRange,
    } as any);
    const voucherMains = toArrayRows<any>(page?.list || page);
    const voucherIds = voucherMains
      .map((item: any) => String(item?.rowid || item?.row_id || '').trim())
      .filter(Boolean);
    if (!voucherIds.length) return 0;

    const details = await getVoucherDetailsByIds(voucherIds);
    const salesDetails = toArrayRows<any>(details).filter((detail: any) => {
      const text = [
        detail?.abstract_content,
        detail?.description,
        detail?.account_name,
        detail?.account_code,
      ]
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .join(' ');
      return text.includes('销售');
    });

    const amount = salesDetails.reduce((sum: number, detail: any) => {
      const debit = Math.abs(Number(detail?.debit_amount || 0));
      const credit = Math.abs(Number(detail?.credit_amount || 0));
      return sum + Math.max(debit, credit);
    }, 0);

    return round2(amount);
  } catch (error) {
    console.error('getSalesCostAmount from voucher details failed', error);
    return 0;
  }
}
function buildStaticItem(
  key: string,
  label: string,
  amount: number,
  module: string,
  description: string,
  debit: string,
  credit: string,
  debitSubjectCode: string,
  creditSubjectCode: string,
  source = '按当前系统业务表汇总或后续模板扩展',
  sourceUrl = '',
): PeriodCheckItem {
  return {
    key,
    label,
    amount: round2(amount),
    status: amount > 0 ? 'ready' : 'empty',
    module,
    description,
    source,
    sourceUrl,
    voucherTemplate: { debit, credit, debitSubjectCode, creditSubjectCode },
  };
}

export async function getPeriodCheckPreview(
  params: PeriodCheckParams,
): Promise<PeriodCheckResult> {
  const period = String(params.period || '').trim();
  if (!period) throw new Error('期间不能为空');

  const { startDate, endDate } = getPeriodRange(period);
  const voucherDate = params.voucherDate || endDate;

  const [salesCostAmount, unclosedSalarySummary] = await Promise.all([
    getSalesCostAmount(startDate, endDate, params.accountSetId),
    getUnclosedSalaryDimensionSummary(startDate, endDate, period, params.accountSetId),
  ]);
  const unclosedSalaryAmount = unclosedSalarySummary.amount;

  const items: PeriodCheckItem[] = [
    buildStaticItem(
      'sales-cost',
      '结转销售成本',
      salesCostAmount,
      '销售出库 / 产品档案',
      '按本期凭证明细中摘要、描述、科目名称或科目编码包含“销售”的明细金额汇总待结转销售成本。',
      '主营业务成本',
      '库存商品',
      '5401',
      '1405',
      'Bil_Voucher_Main / Bil_Voucher_Detail（按凭证明细摘要/描述含“销售”汇总）',
    ),
    buildStaticItem(
      'salary-payable-accrual',
      '计提职工薪酬',
      0,
      '工资模块',
      '按工资核算结果计提职工薪酬，借记费用/成本，贷记应付职工薪酬。当前工资核算新模型需接入 Bil_Salary_Info / Bil_Salary_Detail 后自动汇总。',
      '管理费用/销售费用/制造费用-工资',
      '应付职工薪酬',
      '6602',
      '2211',
    ),
    buildStaticItem(
      'salary-accrual',
      '计提工资（工资模块）',
      unclosedSalaryAmount,
      '工资模块 / 凭证维度表',
      unclosedSalaryAmount > 0
        ? `当前月份存在工资未结转维度结果：${unclosedSalarySummary.names.join('、') || '工资维度未生成凭证'}；金额来自 Bil_Dimension_Set / Bil_Dimension_Detail 中 voucher_no 为空的凭证维度。`
        : '当前月份未检测到工资未结转维度结果，默认展示 0；如工资结算已完成，请先确认工资模块已写入凭证维度表。',
      '费用/成本-工资',
      '应付职工薪酬',
      '6602',
      '2211',
    ),
    buildStaticItem(
      'salary-payment',
      '发放工资（工资模块）',
      0,
      '工资模块 / 资金账户',
      '按工资发放金额生成付款凭证，借记应付职工薪酬，贷记银行存款。',
      '应付职工薪酬',
      '银行存款',
      '2211',
      '1002',
    ),
    buildStaticItem(
      'prepaid-amortization',
      '摊销待摊费用',
      0,
      '待摊费用',
      '按待摊费用台账本期摊销额生成凭证。当前未发现稳定台账表，先保留模板入口。',
      '管理费用 / 销售费用',
      '待摊费用',
      '6602',
      '1801',
    ),
    buildStaticItem(
      'tax-accrual',
      '计提税金',
      0,
      '税务',
      '按本期附加税、印花税等税金测算结果生成计提凭证。',
      '税金及附加',
      '应交税费',
      '6403',
      '2221',
    ),
    buildStaticItem(
      'vat-close',
      '结转未交增值税',
      0,
      '税务',
      '按销项税、进项税、转出等结果结转未交增值税。',
      '应交税费—应交增值税',
      '应交税费—未交增值税',
      '222101',
      '222102',
    ),
    buildStaticItem(
      'income-tax-accrual',
      '计提所得税',
      0,
      '税务 / 利润表',
      '当前未接入所得税测算来源，默认展示 0；后续接入利润表或所得税计提维度后展示真实金额。',
      '所得税费用',
      '应交税费—应交所得税',
      '6801',
      '222106',
    ),
    buildStaticItem(
      'manufacturing-overhead',
      '结转制造费用',
      0,
      '生产模块',
      '按制造费用归集与分配结果生成结转凭证。未接生产成本归集表前仅展示模板入口。',
      '生产成本',
      '制造费用',
      '5001',
      '5101',
    ),
    buildStaticItem(
      'completed-goods-cost',
      '结转完工成本',
      0,
      '生产模块',
      '按完工入库成本，借记库存商品，贷记生产成本。未接完工成本表前仅展示模板入口。',
      '库存商品',
      '生产成本',
      '1405',
      '5001',
    ),
  ];

  const totalAmount = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const emptyCount = items.length - readyCount;

  return {
    period,
    startDate,
    endDate,
    voucherDate,
    totalAmount,
    readyCount,
    emptyCount,
    canProceedToNext: readyCount === 0,
    hint:
      readyCount === 0
        ? '当前未检测到需要生成的期末凭证，可直接进入下一步。'
        : '请检查是否有需要生成的凭证，如无需处理可直接点击下一步。',
    items,
  };
}

async function getSubjectNameMap() {
  try {
    const res = await getAllSubjectList({ subject_state: 1, lingma_sys_is_delete: 0, pageNo: 1, page: 0 } as any);
    const list = Array.isArray(res?.list) ? res.list : [];
    return new Map(list.map((item: any) => [String(item?.subject_number || '').trim(), String(item?.subject_name || '').trim()]));
  } catch {
    return new Map<string, string>();
  }
}

function toMysqlDateTime(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())} ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}:${pad(safeDate.getSeconds())}`;
}

export async function createPeriodCheckVoucher(request: PeriodCheckVoucherRequest) {
  const preview = await getPeriodCheckPreview(request);
  const item = preview.items.find((current) => current.key === request.key);
  if (!item) throw new Error('未找到对应的期末检查项目');
  const amount = round2(request.amount ?? item.amount);
  if (!(amount > 0)) throw new Error('当前项目金额为 0，无需生成凭证');

  const debitSubjectCode = item.voucherTemplate.debitSubjectCode || '';
  const creditSubjectCode = item.voucherTemplate.creditSubjectCode || '';
  if (!debitSubjectCode || !creditSubjectCode) throw new Error('当前项目缺少借贷科目模板，无法生成凭证');

  const voucherDate = toMysqlDateTime(preview.voucherDate);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '记');
  const subjectNameMap = await getSubjectNameMap();
  const accountSetId = resolveAccountSetId(request.accountSetId) || undefined;
  const summary = `${preview.period} ${item.label}`;

  return createVoucher(
    {
      business_url: VOUCHER_BUSINESS_URL,
      business_code: `${request.key}:${preview.period}`,
      business_name: item.label,
      voucher_type: '期末结转凭证',
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: amount,
      credit_amount: amount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: 'system',
      account_set_id: accountSetId,
      company_name: request.companyName,
    },
    [
      {
        abstract_content: summary,
        account_code: debitSubjectCode,
        account_name: subjectNameMap.get(debitSubjectCode) || item.voucherTemplate.debit,
        debit_amount: amount,
        credit_amount: 0,
        sort_no: 1,
        account_set_id: accountSetId,
      },
      {
        abstract_content: summary,
        account_code: creditSubjectCode,
        account_name: subjectNameMap.get(creditSubjectCode) || item.voucherTemplate.credit,
        debit_amount: 0,
        credit_amount: amount,
        sort_no: 2,
        account_set_id: accountSetId,
      },
    ],
  );
}
