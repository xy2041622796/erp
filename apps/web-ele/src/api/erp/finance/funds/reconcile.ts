/**
 * 资金对账（reconcile）——前端聚合口径
 *
 * 数据来源（数据库表）：
 * - Bil_Funds_Account：资金账户（现金/银行存款），含 initial_amount、subject_code/subject_name、币别等
 * - Bil_Bank_Journal：日记账流水，按 capital_account_rowid + journal_date 汇总 income_amount/expense_amount
 * - Bil_Subject_Opening：科目期初（year_beginning_balance/beginning_balance）
 * - Bil_Voucher_Main / Bil_Voucher_Detail：凭证主表/明细，按 voucher_date 汇总科目借贷发生额
 *
 * 关键口径：
 * - 资金账户期初 = 账户 initial_amount + 查询月份月初之前所有日记账净发生额（收入 - 支出）
 * - 资金账户本期借方/贷方 = 查询月份内 income_amount / expense_amount 汇总
 * - 科目侧继续复用：科目期初 + 当月凭证借贷发生额
 */

import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { fetchFundsAccountList, type FundsAccount, type FundsAccountKind } from '#/api/erp/finance/funds/settings';
import { fetchSubjectBalanceRows } from '#/api/erp/finance/ledger/subject-balance';

export type ReconcileQuery = {
  month: string; // YYYY-MM
  accountId?: string;
  fundsKind?: FundsAccountKind | '全部';
  fundsAccountRowid?: string; // 资金账户 rowid/id
  showZero?: boolean;
};

export type ReconcileAmount = {
  opening: number;
  debit: number;
  credit: number;
  ending: number;
};

export type ReconcileLine = {
  type: 'subject' | 'funds' | 'diff';
  name: string;
  currency?: string;
  amount: ReconcileAmount;
  meta?: Record<string, any>;
};

export type ReconcileGroup = {
  projectName: string;
  subjectCode?: string;
  subjectName?: string;
  currency?: string;
  balanced: boolean;
  lines: ReconcileLine[];
};

export type ReconcileResult = {
  month: string;
  groups: ReconcileGroup[];
  totals: {
    subject: ReconcileAmount;
    funds: ReconcileAmount;
    diff: ReconcileAmount;
  };
};

const DB_NAME = 'LMBill';
const JOURNAL_FORM_KEY = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const JOURNAL_TABLE = 'Bil_Bank_Journal';
const JOURNAL_PK = 'id';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthStartEnd(month: string) {
  const [yStr, mStr] = String(month || '').split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(y, (m || 1) - 1, 1, 0, 0, 0);
  const end = new Date(y, (m || 1), 0, 23, 59, 59);
  const startDate = `${y}-${pad2(m)}-01`;
  const endDate = `${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}`;
  return {
    start,
    end,
    startDate,
    endDate,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addAmount(a: ReconcileAmount, b: ReconcileAmount): ReconcileAmount {
  return {
    opening: a.opening + b.opening,
    debit: a.debit + b.debit,
    credit: a.credit + b.credit,
    ending: a.ending + b.ending,
  };
}

function subAmount(a: ReconcileAmount, b: ReconcileAmount): ReconcileAmount {
  return {
    opening: a.opening - b.opening,
    debit: a.debit - b.debit,
    credit: a.credit - b.credit,
    ending: a.ending - b.ending,
  };
}

function isAllZero(a: ReconcileAmount) {
  return Math.abs(a.opening) < 1e-9 && Math.abs(a.debit) < 1e-9 && Math.abs(a.credit) < 1e-9 && Math.abs(a.ending) < 1e-9;
}

async function queryJournalOnce(params: {
  accountRowids: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  beforeDateExclusive?: string; // YYYY-MM-DD，统计月初前流水时使用
}) {
  const ids = (params.accountRowids || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (ids.length === 0) {
    const out = new clientData();
    out.list = [];
    out.total = 0;
    return out;
  }

  const table = new DataTable(JOURNAL_FORM_KEY, JOURNAL_TABLE, DB_NAME, JOURNAL_PK);

  const accountFilter =
    ids.length === 1
      ? cond('capital_account_rowid', 'equal', ids[0])
      : or(...ids.map((id) => cond('capital_account_rowid', 'equal', id)));

  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    accountFilter,
  ];

  const startDate = String(params.startDate || '').trim();
  const endDate = String(params.endDate || '').trim();
  const beforeDateExclusive = String(params.beforeDateExclusive || '').trim();

  if (startDate) filters.push(cond('journal_date', 'greaterthanorequal', startDate));
  if (endDate) filters.push(cond('journal_date', 'lessthanorequal', endDate));
  if (beforeDateExclusive) filters.push(cond('journal_date', 'lessthan', beforeDateExclusive));

  table.Filter = and(...filters);

  // 不设置 Fields：资金侧聚合需要 income_amount / expense_amount 等完整字段。
  // 若限制字段，平台严格返回时会导致收入/支出为空，资金金额全部变成 0。
  const queryParam: any = {
    Table: [table],
  };

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

async function queryJournal(params: {
  accountRowids: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  beforeDateExclusive?: string; // YYYY-MM-DD，统计月初前流水时使用
}) {
  const ids = Array.from(
    new Set((params.accountRowids || []).map((x) => String(x || '').trim()).filter(Boolean)),
  );
  if (ids.length === 0) {
    const out = new clientData();
    out.list = [];
    out.total = 0;
    return out;
  }

  // “全部”类别会同时包含现金、银行存款、其他货币资金，账户数较多时平台对超长 OR 条件容易返回空结果。
  // 分批查询后在前端合并，保持单类别/单账户原有口径不变。
  const chunkSize = 20;
  if (ids.length <= chunkSize) return queryJournalOnce({ ...params, accountRowids: ids });

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map((accountRowids) => queryJournalOnce({ ...params, accountRowids })),
  );

  const out = new clientData();
  out.list = results.flatMap((item: any) => item?.list || []);
  out.total = out.list.length;
  out.dataTable = results.find((item: any) => item?.dataTable)?.dataTable;
  return out;
}

/**
 * 核心：组合请求并聚合
 */
export async function fetchFundsReconcile(params: ReconcileQuery): Promise<ReconcileResult> {
  const month = String(params.month || '').trim();
  if (!month) throw new Error('month is required');

  const { startDate, endDate } = monthStartEnd(month);

  // 1) 资金账户（Bil_Funds_Account）
  const kind = params.fundsKind || '全部';
  const kinds: FundsAccountKind[] = kind === '全部' ? (['现金', '银行存款', '其他货币资金'] as any) : ([kind] as any);

  const fundsLists = await Promise.all(
    kinds.map((k) => fetchFundsAccountList({ kind: k, enableStatus: '' as any })),
  );
  let funds = ([] as FundsAccount[]).concat(...fundsLists);

  if (params.fundsAccountRowid) {
    const id = String(params.fundsAccountRowid).trim();
    funds = funds.filter((x: any) => String(x.rowid || x.id || '').trim() === id);
  }

  // 资金账户 -> 分组（按绑定科目 subject_code）
  type GroupSeed = {
    subjectCode: string;
    subjectName: string;
    currency: string;
    fundsAccounts: FundsAccount[];
  };
  const seedMap = new Map<string, GroupSeed>();

  for (const a of funds as any[]) {
    const rowid = String(a.rowid || a.id || '').trim();
    if (!rowid) continue;

    const subjectCode = String(a.subject_code || '').trim();
    const subjectName = String(a.subject_name || '').trim();
    const key = subjectCode ? subjectCode : `__unbound__:${rowid}`;

    const currency = String(a.currency_name || a.currency_code || '人民币').trim() || '人民币';

    const exist = seedMap.get(key);
    if (!exist) {
      seedMap.set(key, {
        subjectCode,
        subjectName: subjectName || '未绑定科目',
        currency,
        fundsAccounts: [a],
      });
    } else {
      exist.fundsAccounts.push(a);
      // 币别不一致时以第一个为准
    }
  }

  const allAccountRowids = funds
    .map((x: any) => String(x.rowid || x.id || '').trim())
    .filter(Boolean);

  // 2) 资金流水（Bil_Bank_Journal）
  // 2.1 月初前流水：用于把账户初始金额滚动到“查询月份期初”
  const preJournalRes = await queryJournal({
    accountRowids: allAccountRowids,
    beforeDateExclusive: startDate,
  });

  const fundsOpeningDeltaByAccount = new Map<string, number>();
  for (const r of (preJournalRes.list || []) as any[]) {
    const accId = String(r.capital_account_rowid || '').trim();
    if (!accId) continue;
    const income = num(r.income_amount);
    const expense = num(r.expense_amount);
    const openingDelta = fundsOpeningDeltaByAccount.get(accId) || 0;
    fundsOpeningDeltaByAccount.set(accId, openingDelta + income - expense);
  }

  // 2.2 当月流水：用于统计本期借方/贷方
  const currentJournalRes = await queryJournal({
    accountRowids: allAccountRowids,
    startDate,
    endDate,
  });

  const fundsAggByAccount = new Map<string, { debit: number; credit: number }>();
  for (const r of (currentJournalRes.list || []) as any[]) {
    const accId = String(r.capital_account_rowid || '').trim();
    if (!accId) continue;
    const debit = num(r.income_amount);
    const credit = num(r.expense_amount);
    const agg = fundsAggByAccount.get(accId) || { debit: 0, credit: 0 };
    agg.debit += debit;
    agg.credit += credit;
    fundsAggByAccount.set(accId, agg);
  }

  // 3) 科目侧复用科目余额表口径，确保月初包含本月之前的累计凭证。
  const subjectCodes = Array.from(seedMap.values())
    .map((s) => String(s.subjectCode || '').trim())
    .filter(Boolean);
  const subjectSet = new Set(subjectCodes);

  const subjectBalanceRows = await fetchSubjectBalanceRows({ month });
  const subjectBalanceMap = new Map<
    string,
    { opening: number; debit: number; credit: number; ending: number }
  >();
  for (const row of subjectBalanceRows || []) {
    const code = String(row?.subjectCode || '').trim();
    if (!code || !subjectSet.has(code) || row.isTotal) continue;
    subjectBalanceMap.set(code, {
      opening: num(row.openingDebit) - num(row.openingCredit),
      debit: num(row.currentDebit),
      credit: num(row.currentCredit),
      ending: num(row.endingDebit) - num(row.endingCredit),
    });
  }

  const groups: ReconcileGroup[] = [];

  let totalSubject: ReconcileAmount = { opening: 0, debit: 0, credit: 0, ending: 0 };
  let totalFunds: ReconcileAmount = { opening: 0, debit: 0, credit: 0, ending: 0 };

  for (const seed of Array.from(seedMap.values())) {
    const subjectCode = String(seed.subjectCode || '').trim();

    // funds side：期初 = 账户 initial_amount + 月初前流水净额
    let fundsOpening = 0;
    let fundsDebit = 0;
    let fundsCredit = 0;

    for (const a of seed.fundsAccounts as any[]) {
      const rowid = String(a.rowid || a.id || '').trim();
      const initialAmount = num(a.initial_amount);
      const openingDelta = fundsOpeningDeltaByAccount.get(rowid) || 0;
      fundsOpening += initialAmount + openingDelta;

      const agg = fundsAggByAccount.get(rowid);
      if (agg) {
        fundsDebit += agg.debit;
        fundsCredit += agg.credit;
      }
    }

    const fundsAmount: ReconcileAmount = {
      opening: fundsOpening,
      debit: fundsDebit,
      credit: fundsCredit,
      ending: fundsOpening + fundsDebit - fundsCredit,
    };

    // subject side
    const subjectBalance = subjectCode
      ? subjectBalanceMap.get(subjectCode)
      : undefined;

    const subjectAmount: ReconcileAmount = {
      opening: subjectBalance?.opening || 0,
      debit: subjectBalance?.debit || 0,
      credit: subjectBalance?.credit || 0,
      ending: subjectBalance?.ending || 0,
    };

    const diffAmount = subAmount(subjectAmount, fundsAmount);

    const lines: ReconcileLine[] = [
      {
        type: 'subject',
        name: '会计科目',
        currency: seed.currency,
        amount: subjectAmount,
        meta: { subjectCode, subjectName: seed.subjectName },
      },
      {
        type: 'funds',
        name: `资金账户（${seed.fundsAccounts.length}）`,
        currency: seed.currency,
        amount: fundsAmount,
        meta: {
          accounts: seed.fundsAccounts.map((a: any) => ({
            rowid: String(a.rowid || a.id || ''),
            code: String(a.account_code || ''),
            name: String(a.account_name || ''),
            kind: String(a.account_kind || ''),
          })),
        },
      },
      {
        type: 'diff',
        name: '差异',
        currency: seed.currency,
        amount: diffAmount,
      },
    ];

    const balanced =
      Math.abs(diffAmount.opening) < 0.005 &&
      Math.abs(diffAmount.debit) < 0.005 &&
      Math.abs(diffAmount.credit) < 0.005 &&
      Math.abs(diffAmount.ending) < 0.005;

    const group: ReconcileGroup = {
      projectName: seed.subjectName || '未绑定科目',
      subjectCode: subjectCode || undefined,
      subjectName: seed.subjectName || undefined,
      currency: seed.currency,
      balanced,
      lines,
    };

    if (!params.showZero) {
      const anyNonZero = !isAllZero(subjectAmount) || !isAllZero(fundsAmount) || !isAllZero(diffAmount);
      if (!anyNonZero) continue;
    }

    groups.push(group);

    // totals（只统计有 subject_code 的分组，避免“未绑定科目”拉低可读性）
    if (subjectCode) {
      totalSubject = addAmount(totalSubject, subjectAmount);
      totalFunds = addAmount(totalFunds, fundsAmount);
    }
  }

  // 排序：科目编码升序；无编码的放最后
  groups.sort((a, b) => {
    const ac = String(a.subjectCode || '');
    const bc = String(b.subjectCode || '');
    if (!ac && !bc) return String(a.projectName).localeCompare(String(b.projectName));
    if (!ac) return 1;
    if (!bc) return -1;
    return ac.localeCompare(bc);
  });

  const totals = {
    subject: totalSubject,
    funds: totalFunds,
    diff: subAmount(totalSubject, totalFunds),
  };

  return {
    month,
    groups,
    totals,
  };
}
