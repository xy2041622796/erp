import { generateUUID } from '@vben/utils';

import { getAllSubjectList, type BilSubjectApi } from '#/api/erp/finance/settings/project';

import { and, clientData, cond, or } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';
import { getClosedPeriodStatusByDate } from '#/api/erp/finance/period-status';

/**
 * 资金设置（现金/银行存款）
 * 数据表：Bil_Funds_Account（独立新表）
 */

export type FundsAccountKind = '现金' | '银行存款' | '其他货币资金';

export type FundsAccount = {
  id?: string;
  rowid?: string;
  // 业务字段
  account_code?: string;
  account_name?: string;
  account_kind?: FundsAccountKind | string;

  bank_name?: string;
  bank_account_no?: string;

  currency_code?: string;
  currency_name?: string;

  subject_id?: string;
  subject_code?: string;
  subject_name?: string;

  enable_status?: number;
  union_bind_status?: number;
  bind_date?: string | Date;
  expire_date?: string | Date;
  pre_open_flag?: number;

  initial_amount?: number | string;
  account_balance?: number | string;

  remark?: string;
  sort_no?: number;

  // 元信息
  lingma_sys_is_delete?: number;
  lingma_sys_ent?: string;
  account_set_id?: string;
  createuser?: string;
  createtime?: string;
  updateuser?: string;
  updatetime?: string;
  lingma_sys_key?: string;
};

const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_Funds_Account';
const PRIMARY_KEY = 'id';
const JOURNAL_TABLE = 'Bil_Bank_Journal';
const JOURNAL_PRIMARY_KEY = 'id';
const FINANCE_FORM_KEY = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const FUND_SUBJECT_ROOTS: Record<FundsAccountKind, string> = {
  现金: '1001',
  银行存款: '1002',
  其他货币资金: '1012',
};

function toISODate(d: any): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  try {
    return (d as Date).toISOString().slice(0, 10);
  } catch {
    return String(d).slice(0, 10);
  }
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function resolveId(data: Partial<FundsAccount>) {
  return String(data.id || data.rowid || '').trim();
}

function getSimpleAccountCodeSeed(value: unknown) {
  const text = String(value || '').trim();
  if (!/^\d+$/.test(text)) return 0;
  return Number(text) || 0;
}

function buildSimpleAccountCode(seq: number) {
  return String(Math.max(1, Number(seq || 0))).padStart(3, '0');
}

function getNextSimpleAccountCode(existing: FundsAccount[], usedCodes: Set<string> = new Set()) {
  let maxSeq = 0;
  for (const item of existing || []) {
    maxSeq = Math.max(maxSeq, getSimpleAccountCodeSeed((item as any).account_code));
  }
  for (const code of usedCodes) {
    maxSeq = Math.max(maxSeq, getSimpleAccountCodeSeed(code));
  }
  let next = buildSimpleAccountCode(maxSeq + 1);
  while (usedCodes.has(next) || (existing || []).some((item: any) => String(item.account_code || '').trim() === next)) {
    maxSeq += 1;
    next = buildSimpleAccountCode(maxSeq + 1);
  }
  usedCodes.add(next);
  return next;
}
function getFundsKindBySubjectNumber(subjectNumber: unknown): FundsAccountKind | '' {
  const code = String(subjectNumber || '').trim();
  if (!code) return '';
  if (code === FUND_SUBJECT_ROOTS.现金 || code.startsWith(FUND_SUBJECT_ROOTS.现金)) return '现金';
  if (code === FUND_SUBJECT_ROOTS.银行存款 || code.startsWith(FUND_SUBJECT_ROOTS.银行存款)) return '银行存款';
  if (code === FUND_SUBJECT_ROOTS.其他货币资金 || code.startsWith(FUND_SUBJECT_ROOTS.其他货币资金)) return '其他货币资金';
  return '';
}

function isEnabledFundSubject(subject: BilSubjectApi.Subject) {
  const kind = getFundsKindBySubjectNumber(subject?.subject_number);
  return (
    !!kind &&
    Number(subject?.lingma_sys_is_delete ?? 0) !== 1 &&
    String(subject?.subject_state ?? '1') !== '0'
  );
}

function buildAccountNameFromSubject(subject: BilSubjectApi.Subject, kind: FundsAccountKind) {
  const name = String(subject?.subject_name || '').trim();
  if (name) return name;
  return kind;
}

async function queryTable(filter: any, page = 9999, index = 1) {
  const table = createFinanceDataTable(FINANCE_FORM_KEY, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  table.Filter = filter || null;

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: page,
      index: index,
    },
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

async function saveTable(added: any[], changed: any[], deleted: any[]) {
  const table = createFinanceDataTable(FINANCE_FORM_KEY, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Type = '数据库表';
  const payload = table.getSaveParam(added, changed, deleted);
  return await requestClient.post(table.saveUrl, payload, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

async function queryJournalTable(filter: any, page = 1, index = 1) {
  const table = createFinanceDataTable(FINANCE_FORM_KEY, JOURNAL_TABLE, DB_NAME, JOURNAL_PRIMARY_KEY);
  table.Type = '数据库表';
  table.Filter = filter || null;

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page,
      index,
    },
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

export async function hasFundsAccountJournalDetails(id: string) {
  const pk = String(id || '').trim();
  if (!pk) return false;

  const res = await queryJournalTable(
    and(
      cond('lingma_sys_is_delete', 'notequal', 1),
      cond('capital_account_rowid', 'equal', pk),
    ),
    1,
    1,
  );

  return Number(res.total || 0) > 0 || ((res.list || []) as any[]).length > 0;
}

export async function assertFundsAccountCanDelete(id: string) {
  const pk = String(id || '').trim();
  if (!pk) throw new Error('id is required');

  const closedPeriod = await getClosedPeriodStatusByDate({ date: new Date() });
  if (closedPeriod) {
    throw new Error('当前期间 ' + closedPeriod.period_code + ' 已结账，不允许删除资金账户');
  }

  if (await hasFundsAccountJournalDetails(pk)) {
    throw new Error('现金/银行日记账已存在该账户明细，不允许删除资金账户');
  }
}

export async function fetchFundsAccountList(params: {
  kind: FundsAccountKind;
  keyword?: string;
  enableStatus?: number | '';
}): Promise<FundsAccount[]> {
  const conditions: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_kind', 'equal', params.kind),
  ];

  const kw = String(params.keyword || '').trim();
  if (kw) {
    conditions.push(
      or(
        cond('account_code', 'contains', kw),
        cond('account_name', 'contains', kw),
        cond('bank_name', 'contains', kw),
        cond('bank_account_no', 'contains', kw),
      ),
    );
  }

  if (params.enableStatus === 0 || params.enableStatus === 1) {
    conditions.push(cond('enable_status', 'equal', params.enableStatus));
  }

  const res = await queryTable(and(...conditions));
  return (res.list as object[] || [])?.map((item: any) => ({
    ...item,
    id: String(item.id || item.rowid || '').trim(),
  })) as FundsAccount[];
}

export async function saveFundsAccount(data: FundsAccount): Promise<{ id: string }> {
  const currentId = resolveId(data);
  const isAdd = !currentId;
  const id = isAdd ? generateUUID() : currentId;
  const accountKind = String(data.account_kind || '').trim();
  const existingForCode = isAdd
    ? await fetchFundsAccountList({ kind: accountKind as FundsAccountKind, enableStatus: '' as any })
    : [];
  const accountCode = String(data.account_code || '').trim() || getNextSimpleAccountCode(existingForCode);

  const row: any = {
    id,
    account_code: accountCode,
    account_name: String(data.account_name || '').trim(),
    account_kind: accountKind,
    bank_name: String(data.bank_name || '').trim() || null,
    bank_account_no: String(data.bank_account_no || '').trim() || null,
    currency_code: String(data.currency_code || 'CNY'),
    currency_name: String(data.currency_name || '人民币'),
    subject_id: String(data.subject_id || '').trim() || null,
    subject_code: String(data.subject_code || '').trim() || null,
    subject_name: String(data.subject_name || '').trim() || null,
    enable_status: data.enable_status === 0 ? 0 : 1,
    union_bind_status: data.union_bind_status === 1 ? 1 : 0,
    bind_date: toISODate(data.bind_date) || null,
    expire_date: toISODate(data.expire_date) || null,
    pre_open_flag: data.pre_open_flag === 1 ? 1 : 0,
    initial_amount: toNumber(data.initial_amount),
    account_balance: toNumber(data.account_balance),
    remark: String(data.remark || '').trim() || null,
    sort_no: Number(data.sort_no || 0) || 0,
    lingma_sys_is_delete: 0,
    ...(typeof data.lingma_sys_key === 'string' && data.lingma_sys_key
      ? { lingma_sys_key: data.lingma_sys_key }
      : {}),
  };

  if (!row.account_name) throw new Error('账户名称不能为空');
  if (!row.account_kind) throw new Error('账户类型不能为空');

  const res = await saveTable(isAdd ? [row] : [], isAdd ? [] : [row], []);
  const body = (res as any)?.data || res;
  const code = Number(body?.Code ?? body?.code ?? 200);
  if (code !== 200 && code !== 0) {
    throw new Error(String(body?.Message || body?.message || '资金账户保存失败'));
  }
  return { id };
}

export async function deleteFundsAccount(id: string, lingmaSysKey?: string) {
  const pk = String(id || '').trim();
  if (!pk) throw new Error('id is required');

  await assertFundsAccountCanDelete(pk);

  const row: any = { id: pk };
  if (typeof lingmaSysKey === 'string' && lingmaSysKey) row.lingma_sys_key = lingmaSysKey;

  await saveTable([], [], [row]);
}

export async function toggleFundsAccountEnable(params: {
  id: string;
  enable: boolean;
  lingmaSysKey?: string;
}) {
  const pk = String(params.id || '').trim();
  if (!pk) throw new Error('id is required');

  const row: any = {
    id: pk,
    enable_status: params.enable ? 1 : 0,
  };
  if (typeof params.lingmaSysKey === 'string' && params.lingmaSysKey) row.lingma_sys_key = params.lingmaSysKey;

  await saveTable([], [row], []);
}

export async function syncFundsAccountsFromSubjects(params?: {
  kinds?: FundsAccountKind[];
}): Promise<{ addedCount: number; changedCount: number; totalCount: number }> {
  const defaultKinds = ['现金', '银行存款', '其他货币资金'] as FundsAccountKind[];
  const targetKinds = Array.from(new Set(params?.kinds?.length ? params.kinds : defaultKinds));
  const subjectRes = await getAllSubjectList({
    pageNo: 1,
    page: 0,
    subject_state: 1,
    lingma_sys_is_delete: 0,
  } as any);
  const subjects = ((subjectRes?.list || []) as BilSubjectApi.Subject[])
    .filter(isEnabledFundSubject)
    .filter((item) => targetKinds.includes(getFundsKindBySubjectNumber(item.subject_number) as FundsAccountKind));

  if (subjects.length === 0) {
    return { addedCount: 0, changedCount: 0, totalCount: 0 };
  }

  const existingGroups = await Promise.all(
    targetKinds.map((kind) => fetchFundsAccountList({ kind, enableStatus: '' as any })),
  );
  const existing = existingGroups.flat();
  const bySubjectId = new Map<string, FundsAccount>();
  const bySubjectCode = new Map<string, FundsAccount>();

  for (const item of existing) {
    const subjectId = String((item as any).subject_id || '').trim();
    const subjectCode = String((item as any).subject_code || '').trim();
    if (subjectId && !bySubjectId.has(subjectId)) bySubjectId.set(subjectId, item);
    if (subjectCode && !bySubjectCode.has(subjectCode)) bySubjectCode.set(subjectCode, item);
  }

  const added: any[] = [];
  const changed: any[] = [];

  for (const subject of subjects) {
    const subjectId = String(subject.rowid || '').trim();
    const subjectCode = String(subject.subject_number || '').trim();
    const subjectName = String(subject.subject_name || '').trim();
    const kind = getFundsKindBySubjectNumber(subjectCode) as FundsAccountKind;
    if (!subjectId || !subjectCode || !kind) continue;

    const existed = bySubjectId.get(subjectId) || bySubjectCode.get(subjectCode);
    if (existed) {
      const id = String(existed.id || existed.rowid || '').trim();
      if (!id) continue;
      const patch: any = {
        id,
        account_kind: kind,
        subject_id: subjectId,
        subject_code: subjectCode,
        subject_name: subjectName,
        enable_status: Number(existed.enable_status ?? 1) === 0 ? 0 : 1,
        lingma_sys_is_delete: 0,
      };
      if ((existed as any).lingma_sys_key) patch.lingma_sys_key = (existed as any).lingma_sys_key;
      if (!String(existed.account_name || '').trim()) patch.account_name = buildAccountNameFromSubject(subject, kind);
      if (!String(existed.account_code || '').trim()) {
        const kindExisting = existing.filter((item) => String(item.account_kind || '').trim() === kind);
        patch.account_code = getNextSimpleAccountCode(kindExisting, new Set(changed.map((item: any) => String(item.account_code || '').trim()).filter(Boolean)));
      }
      if (
        String(existed.account_kind || '').trim() !== kind ||
        String(existed.subject_id || '').trim() !== subjectId ||
        String(existed.subject_code || '').trim() !== subjectCode ||
        String(existed.subject_name || '').trim() !== subjectName ||
        Number(existed.lingma_sys_is_delete ?? 0) === 1 ||
        patch.account_name ||
        patch.account_code
      ) {
        changed.push(patch);
      }
      continue;
    }

    const id = generateUUID();
    const kindExisting = existing.filter((item) => String(item.account_kind || '').trim() === kind);
    const usedCodes = new Set([
      ...added
        .filter((item: any) => String(item.account_kind || '').trim() === kind)
        .map((item: any) => String(item.account_code || '').trim())
        .filter(Boolean),
      ...changed
        .filter((item: any) => String(item.account_kind || '').trim() === kind)
        .map((item: any) => String(item.account_code || '').trim())
        .filter(Boolean),
    ]);
    added.push({
      id,
      account_code: getNextSimpleAccountCode(kindExisting, usedCodes),
      account_name: buildAccountNameFromSubject(subject, kind),
      account_kind: kind,
      bank_name: null,
      bank_account_no: null,
      currency_code: 'CNY',
      currency_name: '人民币',
      subject_id: subjectId,
      subject_code: subjectCode,
      subject_name: subjectName,
      enable_status: 1,
      union_bind_status: 0,
      bind_date: null,
      expire_date: null,
      pre_open_flag: 0,
      initial_amount: 0,
      account_balance: 0,
      remark: kind === '银行存款' ? '由会计科目自动同步，银行名称需手工维护' : '由会计科目自动同步',
      sort_no: 0,
      lingma_sys_is_delete: 0,
      account_set_id: String((subject as any).account_set_id || '').trim() || undefined,
      lingma_sys_ent: String((subject as any).lingma_sys_ent || '').trim() || undefined,
    });
  }

  if (added.length > 0 || changed.length > 0) {
    await saveTable(added, changed, []);
  }

  return { addedCount: added.length, changedCount: changed.length, totalCount: subjects.length };
}