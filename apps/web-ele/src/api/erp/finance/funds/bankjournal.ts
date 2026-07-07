/**
 * 閾惰鏃ヨ璐︼紙BankJournal锛? *
 * 璇存槑锛? * - 瀛樺偍琛細Bil_Bank_Journal锛堜綘宸插缓琛紝涓婚敭涓?id锛? * - 琛ㄥ崟 Key锛團ormKey锛夛細DC8DD8FFB2E2DFFA4F36BEBB20D72846
 * - 澧炲垹鏀规煡閫氳繃 DataTable(DataOperation) 瀹屾垚锛涘垹闄や负杞垹 lingma_sys_is_delete=1銆? * - 鏃ヨ璐﹀簭鍙?journal_no锛氬弬鑰冨叾浠栧崟鎹€滅紪鐮佲€濆疄鐜帮紝璋冪敤 Codeing/GetCodeString銆? */

import { generateUUID } from '@vben/utils';

import { addMoney, moneyNumber, subMoney } from '#/utils/finance/decimal-money';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { assertPeriodNotClosedByDate } from '#/api/erp/finance/period-status';
import { getCodeString } from '#/api/system/coding';
import {
  fetchFundsAccountList,
  syncFundsAccountsFromSubjects,
  type FundsAccount,
} from '#/api/erp/finance/funds/settings';
import { getFinanceAuxiliaryValueOptions } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

export type BankAccount = {
  id: string; // Bil_Funds_Account.rowid
  code: string; // account_code
  name: string; // account_name
  bankName?: string; // bank_name
  accountNo?: string; // bank_account_no
  subjectId?: string; // subject_id
  subjectCode?: string; // subject_code
  subjectName?: string; // subject_name
  accountKind?: string; // account_kind
  initialAmount?: number; // initial_amount
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

export type BankjournalItem = {
  /** Bil_Bank_Journal.id */
  id?: string;
  /** 骞冲彴琛屾潈闄?key锛堟洿鏂?鍒犻櫎鏃堕渶瑕侊級 */
  lingma_sys_key?: string;

  date: string; // YYYY-MM-DD
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

  voucherNo?: string; // voucher_code
  voucherMainId?: string; // voucher_main_id
  linkStatus?: number; // link_status
  journalNo?: string; // journal_no
  counterpartyAccountNo?: string;
  counterpartyBankName?: string;
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

// 璧勯噾璁剧疆琛紙Bil_Funds_Account锛夌紦瀛橈細鐢ㄤ簬涓嬫媺銆佹湡鍒濅綑棰濄€佺鐩瓑
let __fundsBankCache: FundsAccount[] | null = null;
async function ensureFundsBankCache() {
  if (!__fundsBankCache) {
    const [bankAccounts, otherAccounts] = await Promise.all([
      fetchFundsAccountList({ kind: '银行存款', enableStatus: '' as any }),
      fetchFundsAccountList({ kind: '其他货币资金' as any, enableStatus: '' as any }),
    ]);
    __fundsBankCache = [...bankAccounts, ...otherAccounts] as any;
  }
  return __fundsBankCache;
}


// 浣犳彁渚涚殑琛ㄥ崟 key
const BANK_JOURNAL_FORM_KEY = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const BANK_JOURNAL_TABLE = 'Bil_Bank_Journal';
const BANK_JOURNAL_PK = 'id';

// 鈥滅紪鐮佽鍒?鑿滃崟ID鈥濓紙浣犳彁渚涳級
const BANK_JOURNAL_CODE_RULE_ID = 'CE079CEB806A68BEFB8E5E9F1ED5C5F4';

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
  // 所有日记账都保存 prev/next；只有手动插入产生的非整千 sortOrder 才写入 LM_JOURNAL_SORT。
  if (hasInsertAnchor && isManualInsertSort) parts.push(JOURNAL_SORT_MARK + num.toFixed(6));
  if (prev) parts.push(JOURNAL_PREV_MARK + prev);
  if (next) parts.push(JOURNAL_NEXT_MARK + next);
  return parts.join(';');
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
  // 不设置 Fields：让后端返回完整行，避免编辑时缺少 id 被误判为新增。
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    filter: and(...filters),
    page: 1,
    index: 1,
  });
  const row = ((res.list || []) as any[])[0];
  return String(row?.id || '').trim();
}

function getJournalHeaders() {
  // 涓庡叾浠栨ā鍧椾竴鑷达細浣跨敤 DataTable.getRequestHeader() 浣滀负缂栫爜鎺ュ彛鐨?headers
  const table = new DataTable(BANK_JOURNAL_FORM_KEY, BANK_JOURNAL_TABLE, DB_NAME, BANK_JOURNAL_PK);
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
  const payload = table.getSaveParam(
    params.added || [],
    params.changed || [],
    params.deleted || [],
  );
  return await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function getJournalRawById(id: string) {
  const res = await queryTable({
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    filter: and(cond(BANK_JOURNAL_PK, 'equal', id)),
    page: 1,
    index: 1,
  });
  return ((res.list || []) as any[])[0] || null;
}

/** 閾惰璐︽埛涓嬫媺锛氭潵鑷祫閲戣缃紙Bil_Funds_Account锛夛紝account_kind=閾惰瀛樻 */
export async function fetchBankAccounts(params: { showDisabled?: boolean } = {}): Promise<BankAccount[]> {
  const enableStatus = params.showDisabled ? '' as any : 1;
  const [bankAccounts, otherAccounts] = await Promise.all([
    fetchFundsAccountList({ kind: '银行存款', enableStatus }),
    fetchFundsAccountList({ kind: '其他货币资金' as any, enableStatus }),
  ]);
  const list = [...bankAccounts, ...otherAccounts];
  __fundsBankCache = list as any;

  return (list || [])
    .map((x: any) => {
      const id = String(x.id || x.rowid || '').trim();
      const code = String(x.account_code || '').trim();
      const bankName = String(x.bank_name || '').trim();
      const accountNo = String(x.bank_account_no || '').trim();
      const name = String(x.account_name || '').trim() || bankName || '未命名银行账户';
      const subjectId = String(x.subject_id || '').trim();
      const subjectCode = String(x.subject_code || '').trim();
      const subjectName = String(x.subject_name || '').trim();
      const accountKind = String(x.account_kind || '').trim();
      const initialAmount = Number(x.initial_amount || 0) || 0;
      return { id, code, name, bankName, accountNo, subjectId, subjectCode, subjectName, accountKind, initialAmount } as BankAccount;
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

/** 鏌ヨ閾惰鏃ヨ璐︼紙Bil_Bank_Journal锛?*/
export async function fetchBankjournalList(params: {
  accountId: string; // capital_account_rowid
  start: string;
  end: string;
  showAll: boolean;
}): Promise<{ hasPriorJournalRows: boolean; openingBalance: number; items: BankjournalItem[] }> {
  const accountRowid = String(params.accountId || '').trim();
  if (!accountRowid) return { hasPriorJournalRows: false, openingBalance: 0, items: [] };

  // 初始化余额固定来自当前资金账户 initial_amount，不随日期范围叠加前序流水。
  // 页面首行可编辑并保存到 initial_amount，因此展示值必须与账户初始化金额一致。
  let openingBalance = 0;
  try {
    const [bankAccounts, otherAccounts] = await Promise.all([
      fetchFundsAccountList({ kind: '银行存款', enableStatus: '' as any }),
      fetchFundsAccountList({ kind: '其他货币资金' as any, enableStatus: '' as any }),
    ]);
    const freshAccounts = [...bankAccounts, ...otherAccounts];
    __fundsBankCache = freshAccounts as any;
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
      formKey: BANK_JOURNAL_FORM_KEY,
      tableName: BANK_JOURNAL_TABLE,
      pk: BANK_JOURNAL_PK,
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    filter: and(...filters),
    sort: [
      { Name: 'journal_date', AsName: '', OrderType: 'ascending', Order: 1, Group: 0 },
      { Name: 'journal_no', AsName: '', OrderType: 'ascending', Order: 2, Group: 0 },
      { Name: 'createtime', AsName: '', OrderType: 'ascending', Order: 3, Group: 0 },
    ],
    noPageParam: true,
  });

  const list = (res.list || []) as any[];
  let ioTypeNameMap = new Map<string, string>();
  try {
    ioTypeNameMap = new Map((await fetchIoTypes()).map((item) => [String(item.id), item.name]));
  } catch {
    ioTypeNameMap = new Map();
  }

  function resolveIoTypeName(rawId: any, rawName: any) {
    const id = String(rawId || '').trim();
    const name = String(rawName || '').trim();
    const mapped = ioTypeNameMap.get(id);
    if (mapped) return mapped;
    if (name && name !== id) return name;
    if (id === 'in') return '收入';
    if (id === 'out') return '支出';
    return '';
  }

  const items: BankjournalItem[] = list.map((x, normalizedSortSeed) => {
    const parsedSortOrder = parseJournalSortOrder(x?.description);
    const insertPrevKey = parseJournalAnchorKey(x?.description, JOURNAL_PREV_MARK);
    const insertNextKey = parseJournalAnchorKey(x?.description, JOURNAL_NEXT_MARK);
    const insertSortPinned = (!!insertPrevKey || !!insertNextKey) && parsedSortOrder > 0;
    // 所有日记账都可携带 prev/next；只有带有效 LM_JOURNAL_SORT 的插入行才启用 sort 标记。
    const sortOrder = insertSortPinned ? parsedSortOrder : normalizedSortSeed * 1000;
    return {
    id: String(x.id || ''),
    lingma_sys_key: x.lingma_sys_key,
    date: toISODate(x.journal_date),
    currencyName: String(x.currency_name || x.currency || '人民币'),
    currency: String(x.currency || x.currency_code || '人民币'),
    summary: String(x.summary || ''),
    ioType: String(x.io_type || ''),
    ioTypeName: resolveIoTypeName(x.io_type, x.io_type_name),
    counterparty: String(x.counterparty_id || ''),
    counterpartyName: String(x.counterparty_name || ''),
    income: Number(x.income_amount || 0) || 0,
    expense: Number(x.expense_amount || 0) || 0,
    balance: Number(x.balance_amount || 0) || 0,
    voucherMainId: String(x.voucher_main_id || ''),
    voucherNo: String(x.voucher_code || ''),
    linkStatus: Number(x.link_status || 0) || 0,
    journalNo: String(x.journal_no || ''),
    counterpartyAccountNo: String(x.counterparty_account_no || ''),
    counterpartyBankName: String(x.counterparty_bank_name || ''),
        projectId: String(x.project_id || x.project_code || ''),
    projectName: String(x.project_name || x.project || ''),
    deptId: String(x.dept_id || x.department_code || ''),
    deptName: String(x.dept_name || x.department_name || x.department || ''),
    settlementMethod: String(x.settlement_method || ''),
    billNo: String(x.bill_no || ''),
    remark: String(x.remark || ''),
    transactionNo: String(x.transaction_no || x.trade_no || ''),
    sortOrder,
    insertSortPinned,
    insertPrevKey,
    insertNextKey,
  };
  });

  return { hasPriorJournalRows, openingBalance, items };
}

/** 鏂板/鏇存柊涓€琛岋紙钀藉簱 Bil_Bank_Journal锛夛紱鏂板鏃惰嚜鍔ㄧ敓鎴?journal_no锛堢紪鐮侊級 */
export async function saveBankjournalRow(params: {
  accountRowid: string; // capital_account_rowid
  row: BankjournalItem;
  subjectId?: string;
  /** 页面明确发起新增时跳过 journalNo/lingma_sys_key 反查，避免新增误命中旧行走编辑。 */
  forceAdd?: boolean;
}): Promise<{ id: string; journalNo?: string }>
{
  const accountRowid = String(params.accountRowid || '').trim();
  if (!accountRowid) throw new Error('accountRowid is required');

  const row = params.row;
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
    actionText: '新增或修改银行日记账明细',
  });

  const income = Number(row.income || 0) || 0;
  const expense = Number(row.expense || 0) || 0;
  const balance = Number(row.balance || 0) || 0;

  // 鍐椾綑瀛楁锛氬敖閲忎粠璧勯噾璐︽埛琛ラ綈
  // 鍐椾綑瀛楁锛氬敖閲忎粠璧勯噾璁剧疆璐︽埛琛ラ綈
  let subjectId = String(params.subjectId || '').trim();
  let resolvedCounterpartyName = String(row.counterpartyName || '').trim();
  if (!subjectId) {
    try {
      const cache = await ensureFundsBankCache();
      const acc = (cache || []).find((a: any) => String(a.id || a.rowid || '') === accountRowid);
      subjectId = subjectId || String((acc as any)?.subject_id || '').trim();
    } catch {
      // ignore
    }
  }

  if (String(row.counterparty || '').trim() && !resolvedCounterpartyName) {
    try {
      const cp = (await fetchCounterparties()).find((item) => String(item.id) === String(row.counterparty || ''));
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
    io_type_name: String(row.ioTypeName || ''),
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: isAdd ? [payload] : [],
    changed: isAdd ? [] : [payload],
    deleted: [],
  });

  // Generate journal_no after creating a row.
  let generatedJournalNo = String(row.journalNo || '').trim();
  if (isAdd && !String(payload.journal_no || '').trim()) {
    try {
      const codeRes = await getCodeString(id, BANK_JOURNAL_CODE_RULE_ID, getJournalHeaders());
      if ((codeRes as any).Code === 200 && (codeRes as any).Message) {
        generatedJournalNo = String((codeRes as any).Message || '').trim();
        await saveTable({
          formKey: BANK_JOURNAL_FORM_KEY,
          tableName: BANK_JOURNAL_TABLE,
          pk: BANK_JOURNAL_PK,
          added: [],
          changed: [{ id, journal_no: generatedJournalNo }],
          deleted: [],
        });
      } else {
        console.warn('閾惰鏃ヨ璐︽柊澧炴垚鍔燂紝浣嗚嚜鍔ㄧ敓鎴愮紪鐮佸け璐ワ細', (codeRes as any).Message || codeRes);
      }
    } catch (e) {
      console.warn('閾惰鏃ヨ璐︽柊澧炴垚鍔燂紝浣嗚嚜鍔ㄧ敓鎴愮紪鐮佸け璐ワ細', e);
    }
  }
  return { id, journalNo: generatedJournalNo };
}

/** 删除一行：走 DataTable deleted 通道；删除前用当前行 id + 账户 + 编号复核，避免误删其他链路内容。 */
export async function deleteBankjournalRow(row: BankjournalItem) {
  const id = String(row.id || '').trim();
  if (!id) throw new Error('id is required');

  await assertPeriodNotClosedByDate({
    date: getJournalRowDateForPeriodCheck(row.date),
    actionText: '删除银行日记账明细',
  });

  const raw = await getJournalRawById(id);
  if (!raw || String(raw.id || '').trim() !== id) throw new Error('未找到要删除的日记账行，请刷新后重试');
  if (Number(raw.lingma_sys_is_delete || 0) === 1) return;

  const rowAccountId = String(row.accountRowid || '').trim();
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: [],
    changed: [],
    deleted: [payload],
  });
}

/** 批量更新日记账：一次提交 changed 数组，避免逐条调用保存接口。 */
export async function saveBankjournalRows(rows: BankjournalItem[]) {
  const rowsToSave = (rows || []).filter((row) => String(row.id || '').trim());
  if (rowsToSave.length === 0) return;

  const uniqueDates = [...new Set(rowsToSave.map((row) => getJournalRowDateForPeriodCheck(row.date)))];
  await Promise.all(uniqueDates.map((date) => assertPeriodNotClosedByDate({ date, actionText: '批量修改银行日记账明细' })));

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
      capital_account_rowid: String((row as any).accountRowid || (row as any).capital_account_rowid || ''),
      counterparty_account_no: String(row.counterpartyAccountNo || ''),
      counterparty_bank_name: String(row.counterpartyBankName || ''),
    };
    if (row.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
    return payload;
  });

  await saveTable({
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}

/** 批量删除日记账：一次提交 deleted 数组，避免逐条调用删除接口。 */
export async function deleteBankjournalRows(rows: BankjournalItem[]) {
  const rowsToDelete = (rows || []).filter((row) => String(row.id || '').trim());
  if (rowsToDelete.length === 0) return;

  const uniqueDates = [...new Set(rowsToDelete.map((row) => getJournalRowDateForPeriodCheck(row.date)))];
  await Promise.all(uniqueDates.map((date) => assertPeriodNotClosedByDate({ date, actionText: '批量删除银行日记账明细' })));

  const deleted = rowsToDelete.map((row) => {
    const payload: any = { id: String(row.id || '').trim() };
    if (row.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
    return payload;
  });

  await saveTable({
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: [],
    changed: [],
    deleted,
  });
}

/** 鎵归噺鍏宠仈鍑瘉锛堝啓搴擄級 */
export async function linkBankjournalVoucher(params: {
  rows: BankjournalItem[];
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}



/** 取消银行日记账与凭证的关联，仅清空日记账上的关联字段，不删除原凭证。 */
export async function unlinkBankjournalVoucher(rows: BankjournalItem[]) {
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
    formKey: BANK_JOURNAL_FORM_KEY,
    tableName: BANK_JOURNAL_TABLE,
    pk: BANK_JOURNAL_PK,
    added: [],
    changed,
    deleted: [],
  });
}
