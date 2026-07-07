/**
 * 现金日记账（Cashday）——落库实现
 *
 * 说明：当前数据库仅存在 Bil_Bank_Journal（日记账表）作为日记账行存储。
 * 因此现金日记账与银行日记账共用该表，通过资金账户类型区分（现金账户/银行账户）。
 *
 * - 存储表：Bil_Bank_Journal（主键 id）
 * - 表单 Key（FormKey）：DC8DD8FFB2E2DFFA4F36BEBB20D72846
 * - journal_no：参考其他单据“编码”实现，调用 Codeing/GetCodeString。
 */

import { generateUUID } from '@vben/utils';

import { addMoney, moneyNumber, subMoney } from '#/utils/finance/decimal-money';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';
import {
  fetchFundsAccountList,
  syncFundsAccountsFromSubjects,
  type FundsAccount,
} from '#/api/erp/finance/funds/settings';
import { getCodeString } from '#/api/system/coding';
import { getFinanceAuxiliaryValueOptions } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

export type CashAccount = {
  id: string; // Bil_Funds_Account.rowid
  code: string;
  name: string;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  initialAmount?: number;
};

export type IoType = {
  id: string;
  name: string;
  categoryType?: number;
  matchKeywords?: string;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
};
export type Counterparty = {
  id: string;
  name: string;
  type?: 'customer' | 'supplier' | 'staff';
  originId?: string;
  code?: string;
};

export type CashdayItem = {
  /** Bil_Bank_Journal.id */
  id?: string;
  /** 平台行权限 key（更新/删除时需要） */
  lingma_sys_key?: string;

  date: string;
  currencyName?: string;
  currency?: string;
  summary: string;
  ioType?: string;
  ioTypeName?: string;
  counterparty?: string;
  counterpartyName?: string;
  income: number;
  expense: number;
  balance: number;

  voucherNo?: string;
  voucherMainId?: string;
  linkStatus?: number;
  journalNo?: string;
  projectId?: string;
  projectName?: string;
  deptId?: string;
  deptName?: string;
  settlementMethod?: string;
  billNo?: string;
  remark?: string;
  transactionNo?: string;
  accountRowid?: string;
  capital_account_rowid?: string;
  sortOrder?: number;
  insertSortPinned?: boolean;
  insertPrevKey?: string;
  insertNextKey?: string;
};

const DB_NAME = 'LMBill';

// 日记账表单 key
const JOURNAL_FORM_KEY = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const JOURNAL_TABLE = 'Bil_Bank_Journal';
const JOURNAL_PK = 'id';

// “编码规则/菜单ID”（现金日记账）
const CASHDAY_CODE_RULE_ID = 'F2B16047F42C8A94391DAA1D2D5709A7';

const JOURNAL_SORT_MARK = 'LM_JOURNAL_SORT=';
const JOURNAL_PREV_MARK = 'LM_JOURNAL_PREV=';
const JOURNAL_NEXT_MARK = 'LM_JOURNAL_NEXT=';

function parseJournalSortOrder(text: unknown) {
  const match = String(text || '').match(/LM_JOURNAL_SORT=([0-9.]+)/);
  const num = match ? Number(match[1]) : 0;
  return Number.isFinite(num) ? num : 0;
}

function parseJournalAnchorKey(text: unknown, mark: string) {
  const raw = String(text || '');
  const start = raw.indexOf(mark);
  if (start < 0) return '';
  const rest = raw.slice(start + mark.length);
  return rest.split(';')[0]?.trim() || '';
}

function buildJournalDescriptionWithSortOrder(sortOrder: unknown, prevKey?: unknown, nextKey?: unknown) {
  const parts: string[] = [];
  const prev = String(prevKey || '').trim();
  const next = String(nextKey || '').trim();
  const hasInsertAnchor = !!prev || !!next;
  const num = Number(sortOrder || 0);
  const isManualInsertSort = Number.isFinite(num) && num > 0 && Math.abs(num % 1000) > 0.000001;
  // 所有现金日记账都保存 prev/next；只有手动插入产生的非整千 sortOrder 才写入 LM_JOURNAL_SORT。
  if (hasInsertAnchor && isManualInsertSort) parts.push(JOURNAL_SORT_MARK + num.toFixed(6));
  if (prev) parts.push(JOURNAL_PREV_MARK + prev);
  if (next) parts.push(JOURNAL_NEXT_MARK + next);
  return parts.join(';');
}



// 资金设置表（Bil_Funds_Account）缓存：用于下拉、期初余额、科目等
let __fundsCashCache: FundsAccount[] | null = null;
async function ensureFundsCashCache() {
  if (!__fundsCashCache) {
    __fundsCashCache = await fetchFundsAccountList({ kind: '现金', enableStatus: '' as any });
  }
  return __fundsCashCache;
}

function toISODate(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return (d as Date).toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
}
function getJournalRowDateForPeriodCheck(value: unknown) {
  const text = String(value || '').trim();
  if (!text) throw new Error('请选择日记账日期');
  return text.slice(0, 10);
}


async function queryTable(params: {
  formKey: string;
  tableName: string;
  pk: string;
  filter: any;
  sort?: any[];
  page?: number;
  index?: number;
  noPageParam?: boolean;
}) {
  const table = new DataTable(params.formKey, params.tableName, DB_NAME, params.pk);
  table.Filter = params.filter || null;
  // 不设置 Fields：让后端返回完整列；排序在前端完成，避免 Fields 限制返回字段。
  // table.Fields = (params.sort || []) as any;

  const queryParam: any = {
    Table: [table],
  };
  if (!params.noPageParam) {
    queryParam.PageParam = {
      page: params.page ?? 9999,
      index: params.index ?? 1,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const out = new clientData();
  out.dataTable = table;
  out.list = items;
  out.total = total;
  return out;
}

async function resolveExistingJournalRowId(params: {
  accountRowid: string;
  journalNo?: string;
  lingmaSysKey?: string;
}) {
  const accountRowid = String(params.accountRowid || '').trim();
  const journalNo = String(params.journalNo || '').trim();
  const lingmaSysKey = String(params.lingmaSysKey || '').trim();
  if (!accountRowid || (!journalNo && !lingmaSysKey)) return '';

  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('capital_account_rowid', 'equal', accountRowid),
  ];
  if (lingmaSysKey) filters.push(cond('lingma_sys_key', 'equal', lingmaSysKey));
  else filters.push(cond('journal_no', 'equal', journalNo));

  const res = await queryTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    filter: and(...filters),
    page: 1,
    index: 1,
  });
  const row = ((res.list || []) as any[])[0];
  return String(row?.id || '').trim();
}

function getJournalHeaders() {
  const table = new DataTable(JOURNAL_FORM_KEY, JOURNAL_TABLE, DB_NAME, JOURNAL_PK);
  return table.getRequestHeader();
}

async function saveTable(params: {
  formKey: string;
  tableName: string;
  pk: string;
  added?: any[];
  changed?: any[];
  deleted?: any[];
}) {
  const table = new DataTable(params.formKey, params.tableName, DB_NAME, params.pk);
  const payload = table.getSaveParam(params.added || [], params.changed || [], params.deleted || []);
  return await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function getJournalRawById(id: string) {
  const res = await queryTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    filter: and(cond(JOURNAL_PK, 'equal', id)),
    page: 1,
    index: 1,
  });
  return ((res.list || []) as any[])[0] || null;
}

/** 现金账户下拉：来自资金设置（Bil_Funds_Account），account_kind=现金 */
export async function fetchCashAccounts(params: { showDisabled?: boolean } = {}): Promise<CashAccount[]> {
  const list = await fetchFundsAccountList({ kind: '现金', enableStatus: params.showDisabled ? '' as any : 1 });
  __fundsCashCache = list as any;

  return (list || [])
    .map((x: any) => {
      const id = String(x.id || x.rowid || '').trim();
      const code = String(x.account_code || '').trim();
      const name = String(x.account_name || '').trim() || '未命名现金账户';
      const subjectId = String(x.subject_id || '').trim();
      const subjectCode = String(x.subject_code || '').trim();
      const subjectName = String(x.subject_name || '').trim();
      const initialAmount = Number(x.initial_amount || 0) || 0;
      return { id: id, code, name, subjectId, subjectCode, subjectName, initialAmount } as CashAccount;
    })
    .filter((x) => x.id);
}

function getIoTypeSortValue(item: any, _fallbackIndex: number) {
  const raw = item?.sort_no ?? item?.sortNo ?? item?.sort_order ?? item?.sortOrder ?? item?.order_no ?? item?.orderNo ?? item?.order_index ?? item?.sequence ?? item?.seq;
  const num = Number(raw);
  // 没有维护排序号的历史/异常数据统一放到末尾，再按创建时间和 ID 做稳定排序，避免不同电脑因接口返回顺序不同导致下拉顺序漂移。
  return Number.isFinite(num) && num > 0 ? num : Number.MAX_SAFE_INTEGER;
}

function isDefaultIoTypeOption(item: any) {
  const code = String(item?.sortCode || item?.code || '').trim().toUpperCase();
  const categoryType = Number(item?.categoryType || 0);
  const numberPart = Number(code.replace(/^(IN|OUT)/, ''));
  if (categoryType === 1 && /^IN\d+$/.test(code)) return numberPart >= 1 && numberPart <= 7;
  if (categoryType === 2 && /^OUT\d+$/.test(code)) return numberPart >= 1 && numberPart <= 12;
  return false;
}

function compareIoTypeOption(a: IoType, b: IoType) {
  const typeDiff = Number(a.categoryType || 0) - Number(b.categoryType || 0);
  if (typeDiff !== 0) return typeDiff;

  const aDefault = isDefaultIoTypeOption(a as any);
  const bDefault = isDefaultIoTypeOption(b as any);
  if (aDefault !== bDefault) return aDefault ? -1 : 1;

  if (aDefault && bDefault) {
    const sortDiff = Number((a as any).sortOrder || Number.MAX_SAFE_INTEGER) - Number((b as any).sortOrder || Number.MAX_SAFE_INTEGER);
    if (sortDiff !== 0) return sortDiff;
  }

  // 自定义类别不再仅按 sort_no 排。历史自定义类别可能缺少 sort_no，新增类别有 sort_no，
  // 若继续混排会导致新增项插到旧自定义项前面；这里统一按创建时间稳定排，自定义新增项自然在最后。
  const createDiff = String((a as any).sortCreateTime || '').localeCompare(String((b as any).sortCreateTime || ''));
  if (createDiff !== 0) return createDiff;

  const sortDiff = Number((a as any).sortOrder || Number.MAX_SAFE_INTEGER) - Number((b as any).sortOrder || Number.MAX_SAFE_INTEGER);
  if (sortDiff !== 0) return sortDiff;

  const codeDiff = String((a as any).sortCode || '').localeCompare(String((b as any).sortCode || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
  if (codeDiff !== 0) return codeDiff;
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
}

export async function fetchIoTypes(): Promise<IoType[]> {
  try {
    const { getInexpCatePage } = await import('#/api/erp/finance/settings/inexpcate');
    const [incomeRes, expenseRes] = await Promise.all([
      getInexpCatePage({ pageNo: 1, page: 9999, category_type: 1, enabled: 1 }),
      getInexpCatePage({ pageNo: 1, page: 9999, category_type: 2, enabled: 1 }),
    ]);

    const categories = [...(incomeRes?.list || []), ...(expenseRes?.list || [])];
    const mapped = categories
      .filter((item: any) => String(item?.id || item?.rowid || '').trim())
      .map((item: any, index: number) => ({
        id: String(item.id || item.rowid || '').trim(),
        name: String(item.name || '').trim(),
        categoryType: Number(item.category_type || 0) || undefined,
        matchKeywords: String(item.description || '').trim(),
        subjectId: String(item.subject_id || '').trim(),
        subjectCode: String(item.subject_code || '').trim(),
        subjectName: String(item.subject_name || '').trim(),
        sortOrder: getIoTypeSortValue(item, index),
        sortCreateTime: String(item.createtime || item.create_time || item.created_at || ''),
        sortCode: String(item.code || item.category_code || ''),
      } as IoType & { sortOrder?: number }))
      .filter((item: IoType) => item.name)
      .sort(compareIoTypeOption);

    if (mapped.length > 0) return mapped;
  } catch (e) {
    console.warn('加载收支类别失败，使用收入/支出兜底选项：', e);
  }

  return [
    { id: 'in', name: '收入', categoryType: 1 },
    { id: 'out', name: '支出', categoryType: 2 },
  ];
}

function buildCounterpartyId(type: 'customer' | 'supplier' | 'staff', rawId: any) {
  const id = String(rawId || '').trim();
  return id ? `${type}:${id}` : '';
}

function uniqueCounterparties(items: Counterparty[]) {
  const map = new Map<string, Counterparty>();
  for (const item of items) {
    if (!item.id || !item.name) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function mapAuxCounterparty(type: 'customer' | 'supplier' | 'staff', item: any): Counterparty | null {
  const raw = item?.raw || item || {};
  const originId = String(raw.row_id || raw.rowid || raw.id || raw.value_code || item?.value || '').trim();
  const code = String(raw.value_code || item?.value || '').trim();
  const name = String(raw.value_name || item?.label || code || '').trim();
  if (!originId || !name) return null;
  return {
    id: buildCounterpartyId(type, originId),
    originId,
    code,
    type,
    name,
  };
}

export async function fetchCounterparties(): Promise<Counterparty[]> {
  try {
    const auxOptions = await getFinanceAuxiliaryValueOptions({
      dimCodes: ['CUSTOMER', 'SUPPLIER', 'STAFF'],
    });

    const customers = (auxOptions.CUSTOMER || [])
      .map((item: any) => mapAuxCounterparty('customer', item))
      .filter(Boolean) as Counterparty[];
    const suppliers = (auxOptions.SUPPLIER || [])
      .map((item: any) => mapAuxCounterparty('supplier', item))
      .filter(Boolean) as Counterparty[];
    const staffs = ((auxOptions.STAFF || auxOptions.EMPLOYEE || []) as any[])
      .map((item: any) => mapAuxCounterparty('staff', item))
      .filter(Boolean) as Counterparty[];

    return uniqueCounterparties([...customers, ...suppliers, ...staffs]);
  } catch (error) {
    console.warn('加载财务辅助核算往来单位失败：', error);
    return [];
  }
}

/** 查询现金日记账：从 Bil_Bank_Journal 读取（按现金账户过滤） */
export async function fetchCashdayList(params: {
  accountId: string;
  start: string;
  end: string;
  showAll: boolean;
}): Promise<{ hasPriorJournalRows: boolean; openingBalance: number; items: CashdayItem[] }> {
  const accountRowid = String(params.accountId || '').trim();
  if (!accountRowid) return { hasPriorJournalRows: false, openingBalance: 0, items: [] };

  // 初始化余额固定来自当前资金账户 initial_amount，不随日期范围叠加前序流水。
  // 页面首行可编辑并保存到 initial_amount，因此展示值必须与账户初始化金额一致。
  let openingBalance = 0;
  try {
    const freshAccounts = await fetchFundsAccountList({ kind: '现金', enableStatus: '' as any });
    __fundsCashCache = freshAccounts as any;
    const acc = (freshAccounts || []).find((a: any) => String(a.id || a.rowid || '') === accountRowid);
    openingBalance = Number((acc as any)?.initial_amount || 0) || 0;
  } catch {
    openingBalance = 0;
  }

  const start = String(params.start || '').trim();
  const end = String(params.end || '').trim();
  let hasPriorJournalRows = false;

  if (!params.showAll && start) {
    const priorRes = await queryTable({
      formKey: JOURNAL_FORM_KEY,
      tableName: JOURNAL_TABLE,
      pk: JOURNAL_PK,
      filter: and(
        cond('lingma_sys_is_delete', 'notequal', 1),
        cond('capital_account_rowid', 'equal', accountRowid),
        cond('journal_date', 'lessthan', start),
      ),
      noPageParam: true,
    });
    const priorList = (priorRes.list || []) as any[];
    hasPriorJournalRows = priorList.length > 0;
    for (const row of priorList) {
      openingBalance = moneyNumber(
        subMoney(
          addMoney([openingBalance, Number(row.income_amount || 0) || 0], 'round', 6),
          Number(row.expense_amount || 0) || 0,
        ),
      );
    }
  }

  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('capital_account_rowid', 'equal', accountRowid),
  ];

  if (!params.showAll) {
    if (start) filters.push(cond('journal_date', 'greaterthanorequal', start));
    if (end) filters.push(cond('journal_date', 'lessthanorequal', end));
  }

  const res = await queryTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    filter: and(...filters),
    noPageParam: true,
  });

  const list = ((res.list || []) as any[]).sort((a, b) => {
    const ad = String(a?.journal_date || '');
    const bd = String(b?.journal_date || '');
    if (ad !== bd) return ad.localeCompare(bd);
    const aj = String(a?.journal_no || '');
    const bj = String(b?.journal_no || '');
    if (aj !== bj) return aj.localeCompare(bj);
    return String(a?.createtime || '').localeCompare(String(b?.createtime || ''));
  });
  let ioTypeNameMap = new Map<string, string>();
  try {
    ioTypeNameMap = new Map((await fetchIoTypes()).map((item) => [String(item.id), item.name]));
  } catch {
    ioTypeNameMap = new Map();
  }

  const items: CashdayItem[] = list.map((x, normalizedSortSeed) => {
    const parsedSortOrder = parseJournalSortOrder(x?.description);
    const insertPrevKey = parseJournalAnchorKey(x?.description, JOURNAL_PREV_MARK);
    const insertNextKey = parseJournalAnchorKey(x?.description, JOURNAL_NEXT_MARK);
    const insertSortPinned = (!!insertPrevKey || !!insertNextKey) && parsedSortOrder > 0;
    // 所有现金日记账都可携带 prev/next；只有带有效 LM_JOURNAL_SORT 的插入行才启用 sort 标记。
    const sortOrder = insertSortPinned ? parsedSortOrder : normalizedSortSeed * 1000;
    return {
    id: String(x.id || ''),
    lingma_sys_key: x.lingma_sys_key,
    date: toISODate(x.journal_date),
    currencyName: String(x.currency_name || x.currency || '人民币'),
    currency: String(x.currency || x.currency_code || '人民币'),
    summary: String(x.summary || ''),
    ioType: String(x.io_type || ''),
    ioTypeName: ioTypeNameMap.get(String(x.io_type || '')) || (String(x.io_type || '') === 'in' ? '收入' : String(x.io_type || '') === 'out' ? '支出' : String(x.io_type || '')),
    counterparty: String(x.counterparty_id || ''),
    counterpartyName: String(x.counterparty_name || ''),
    income: Number(x.income_amount || 0) || 0,
    expense: Number(x.expense_amount || 0) || 0,
    balance: Number(x.balance_amount || 0) || 0,
    voucherMainId: String(x.voucher_main_id || ''),
    voucherNo: String(x.voucher_code || ''),
    linkStatus: Number(x.link_status || 0) || 0,
    journalNo: String(x.journal_no || ''),
        projectId: String(x.project_id || x.project_code || ''),
    projectName: String(x.project_name || x.project || ''),
    deptId: String(x.dept_id || x.department_code || ''),
    deptName: String(x.dept_name || x.department_name || x.department || ''),
    settlementMethod: String(x.settlement_method || ''),
    billNo: String(x.bill_no || ''),
    remark: String(x.remark || ''),
    transactionNo: String(x.transaction_no || x.trade_no || ''),
    accountRowid: String(x.capital_account_rowid || ''),
    capital_account_rowid: String(x.capital_account_rowid || ''),
    sortOrder,
    insertSortPinned,
    insertPrevKey,
    insertNextKey,
  };
  });

  return { hasPriorJournalRows, openingBalance, items };
}

/** 新增/更新现金日记账行（落库）；新增时自动生成 journal_no（编码） */
export async function saveCashdayRow(params: {
  accountRowid?: string;
  row: CashdayItem;
  subjectId?: string;
  /** 页面明确发起新增时跳过 journalNo/lingma_sys_key 反查，避免新增误命中旧行走编辑。 */
  forceAdd?: boolean;
}): Promise<{ id: string; journalNo?: string }> {
  const row = params.row || ({} as CashdayItem);
  const accountRowid = String(
    params.accountRowid || row.accountRowid || row.capital_account_rowid || '',
  ).trim();
  if (!accountRowid) throw new Error('请选择现金账户后再保存');

  const forceAdd = Boolean(params.forceAdd);
  let resolvedId = forceAdd ? '' : String(row.id || '').trim();
  if (!forceAdd && !resolvedId) {
    resolvedId = await resolveExistingJournalRowId({
      accountRowid,
      journalNo: row.journalNo,
      lingmaSysKey: row.lingma_sys_key,
    });
  }
  const isAdd = forceAdd || !resolvedId;
  const id = isAdd ? generateUUID() : resolvedId;

  const dateISO = String(row.date || '').slice(0, 10);
  await assertPeriodNotClosedByDate({
    date: getJournalRowDateForPeriodCheck(dateISO),
    actionText: '新增或修改现金日记账明细',
  });
  const income = Number(row.income || 0) || 0;
  const expense = Number(row.expense || 0) || 0;
  const balance = Number(row.balance || 0) || 0;

  let subjectId = String(params.subjectId || '').trim();
  let accountSetId = '';
  let ent = '';
  let resolvedCounterpartyName = String(row.counterpartyName || '').trim();

  try {
    const cache = await ensureFundsCashCache();
    const acc = (cache || []).find((a: any) => String(a.id || a.rowid || '') === accountRowid);
    subjectId = subjectId || String((acc as any)?.subject_id || '').trim();
    accountSetId = String((acc as any)?.account_set_id || '').trim();
    ent = String((acc as any)?.lingma_sys_ent || '').trim();
  } catch {
    // ignore
  }

  // 选择了往来单位但名称未同步时，保存前再兜底解析一次，避免仅保存 ID 或空名称。
  if (String(row.counterparty || '').trim() && !resolvedCounterpartyName) {
    try {
      const cp = (await fetchCounterparties()).find(
        (item) => String(item.id) === String(row.counterparty || ''),
      );
      resolvedCounterpartyName = cp?.name || '';
    } catch {
      // ignore
    }
  }

  const payload: any = {
    id,
    journal_date: dateISO || null,
    summary: String(row.summary || ''),
    io_type: String(row.ioType || ''),
    counterparty_id: String(row.counterparty || ''),
    counterparty_name: resolvedCounterpartyName,
    project_id: String((row as any).projectId || ''),
    project_name: String(row.projectName || ''),
    dept_id: String((row as any).deptId || ''),
    dept_name: String(row.deptName || ''),

    income_amount: income,
    expense_amount: expense,
    balance_amount: balance,

    capital_account_rowid: accountRowid,
    capital_account_id: null,
    account_set_id: accountSetId || null,
    lingma_sys_ent: ent || undefined,
    subject_id: subjectId || null,
    journal_no: isAdd ? null : (String(row.journalNo || '') || null),

    voucher_main_id: String(row.voucherMainId || '') || null,
    voucher_code: String(row.voucherNo || '') || null,
    link_status: Number(row.linkStatus || 0) || 0,

    lingma_sys_is_delete: 0,
    description: buildJournalDescriptionWithSortOrder((row as any).sortOrder, (row as any).insertPrevKey, (row as any).insertNextKey),
  };

  if (!isAdd && row.lingma_sys_key) {
    payload.lingma_sys_key = row.lingma_sys_key;
  }

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: isAdd ? [payload] : [],
    changed: isAdd ? [] : [payload],
    deleted: [],
  });
  let generatedJournalNo = String(row.journalNo || '').trim();
  if (isAdd && !String(payload.journal_no || '').trim()) {
    try {
      const codeRes = await getCodeString(id, CASHDAY_CODE_RULE_ID, getJournalHeaders());
      if ((codeRes as any).Code === 200 && (codeRes as any).Message) {
        generatedJournalNo = String((codeRes as any).Message || '').trim();
        await saveTable({
          formKey: JOURNAL_FORM_KEY,
          tableName: JOURNAL_TABLE,
          pk: JOURNAL_PK,
          added: [],
          changed: [{ id, journal_no: generatedJournalNo }],
          deleted: [],
        });
      } else {
        console.warn('现金日记账新增成功，但自动生成编码失败：', (codeRes as any).Message || codeRes);
      }
    } catch (e) {
      console.warn('现金日记账新增成功，但自动生成编码失败：', e);
    }
  }
  return { id, journalNo: generatedJournalNo };
}

/** 删除一行：走 DataTable deleted 通道；删除前用当前行 id + 账户 + 编号复核，避免误删其他链路内容。 */
export async function deleteCashdayRow(row: CashdayItem) {
  const id = String(row.id || '').trim();
  if (!id) throw new Error('id is required');

  await assertPeriodNotClosedByDate({
    date: getJournalRowDateForPeriodCheck(row.date),
    actionText: '删除现金日记账明细',
  });

  const raw = await getJournalRawById(id);
  if (!raw || String(raw.id || '').trim() !== id) throw new Error('未找到要删除的日记账行，请刷新后重试');
  if (Number(raw.lingma_sys_is_delete || 0) === 1) return;

  const rowAccountId = String(row.accountRowid || row.capital_account_rowid || '').trim();
  const rawAccountId = String(raw.capital_account_rowid || '').trim();
  if (rowAccountId && rawAccountId && rowAccountId !== rawAccountId) {
    throw new Error('删除行账户不一致，已阻止删除，请刷新后重试');
  }

  const rowJournalNo = String(row.journalNo || '').trim();
  const rawJournalNo = String(raw.journal_no || '').trim();
  if (rowJournalNo && rawJournalNo && rowJournalNo !== rawJournalNo) {
    throw new Error('删除行单据编号不一致，已阻止删除，请刷新后重试');
  }

  const payload: any = { id };
  const sysKey = String(row.lingma_sys_key || raw.lingma_sys_key || '').trim();
  if (sysKey) payload.lingma_sys_key = sysKey;

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: [],
    changed: [],
    deleted: [payload],
  });
}

/** 批量更新日记账：一次提交 changed 数组，避免逐条调用保存接口。 */
export async function saveCashdayRows(rows: CashdayItem[]) {
  const rowsToSave = (rows || []).filter((row) => String(row.id || '').trim());
  if (rowsToSave.length === 0) return;

  const uniqueDates = [...new Set(rowsToSave.map((row) => getJournalRowDateForPeriodCheck(row.date)))];
  await Promise.all(uniqueDates.map((date) => assertPeriodNotClosedByDate({ date, actionText: '批量修改现金日记账明细' })));

  const changed = rowsToSave.map((row) => {
    const payload: any = {
      id: String(row.id || '').trim(),
      journal_date: String(row.date || '').slice(0, 10) || null,
      summary: String(row.summary || ''),
      io_type: String(row.ioType || ''),
      io_type_name: String(row.ioTypeName || ''),
      counterparty_id: String(row.counterparty || ''),
      counterparty_name: String(row.counterpartyName || ''),
      project_id: String((row as any).projectId || ''),
      project_name: String(row.projectName || ''),
      dept_id: String((row as any).deptId || ''),
      dept_name: String(row.deptName || ''),
      income_amount: Number(row.income || 0) || 0,
      expense_amount: Number(row.expense || 0) || 0,
      balance_amount: Number(row.balance || 0) || 0,
      journal_no: String(row.journalNo || '') || null,
      voucher_main_id: String(row.voucherMainId || '') || null,
      voucher_code: String(row.voucherNo || '') || null,
      link_status: Number(row.linkStatus || 0) || 0,
      settlement_method: String(row.settlementMethod || ''),
      bill_no: String(row.billNo || ''),
      remark: String(row.remark || ''),
      transaction_no: String(row.transactionNo || ''),
      description: buildJournalDescriptionWithSortOrder((row as any).sortOrder, (row as any).insertPrevKey, (row as any).insertNextKey),
      capital_account_rowid: String(row.accountRowid || row.capital_account_rowid || ''),
    };
    if (row.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
    return payload;
  });

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}

/** 批量删除日记账：一次提交 deleted 数组，避免逐条调用删除接口。 */
export async function deleteCashdayRows(rows: CashdayItem[]) {
  const rowsToDelete = (rows || []).filter((row) => String(row.id || '').trim());
  if (rowsToDelete.length === 0) return;

  const uniqueDates = [...new Set(rowsToDelete.map((row) => getJournalRowDateForPeriodCheck(row.date)))];
  await Promise.all(uniqueDates.map((date) => assertPeriodNotClosedByDate({ date, actionText: '批量删除现金日记账明细' })));

  const deleted = rowsToDelete.map((row) => {
    const payload: any = { id: String(row.id || '').trim() };
    if (row.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
    return payload;
  });

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: [],
    changed: [],
    deleted,
  });
}

/** 批量关联凭证（写库） */
export async function linkCashdayVoucher(params: {
  rows: CashdayItem[];
  voucherMainId: string;
  voucherCode: string;
}) {
  const voucherMainId = String(params.voucherMainId || '').trim();
  const voucherCode = String(params.voucherCode || '').trim();
  if (!voucherMainId || !voucherCode) throw new Error('voucherMainId/voucherCode is required');

  const changed = (params.rows || [])
    .filter((r) => String(r.id || '').trim())
    .map((r) => {
      const obj: any = {
        id: String(r.id),
        voucher_main_id: voucherMainId,
        voucher_code: voucherCode,
        link_status: 1,
        description: buildJournalDescriptionWithSortOrder((r as any).sortOrder, (r as any).insertPrevKey, (r as any).insertNextKey),
      };
      if (r.lingma_sys_key) obj.lingma_sys_key = r.lingma_sys_key;
      return obj;
    });

  if (changed.length === 0) return;

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}

/** 取消现金日记账与凭证的关联，仅清空日记账上的关联字段，不删除原凭证。 */
export async function unlinkCashdayVoucher(rows: CashdayItem[]) {
  const changed = (rows || [])
    .filter((r) => String(r.id || '').trim())
    .map((r) => {
      const obj: any = {
        id: String(r.id),
        voucher_main_id: null,
        voucher_code: null,
        link_status: 0,
        description: buildJournalDescriptionWithSortOrder((r as any).sortOrder, (r as any).insertPrevKey, (r as any).insertNextKey),
      };
      if (r.lingma_sys_key) obj.lingma_sys_key = r.lingma_sys_key;
      return obj;
    });

  if (changed.length === 0) return;

  await saveTable({
    formKey: JOURNAL_FORM_KEY,
    tableName: JOURNAL_TABLE,
    pk: JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}

/** 按 ID 读取现金日记账行，用于制证调整页。 */
export async function fetchCashdayRowsByIds(params: {
  accountId: string;
  ids: string[];
}): Promise<CashdayItem[]> {
  const idSet = new Set((params.ids || []).map((id) => String(id || '').trim()).filter(Boolean));
  if (idSet.size === 0) return [];

  const res = await fetchCashdayList({
    accountId: String(params.accountId || '').trim(),
    start: '',
    end: '',
    showAll: true,
  });

  return (res.items || []).filter((item) => idSet.has(String(item.id || '').trim()));
}
