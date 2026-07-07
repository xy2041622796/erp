import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { assertPeriodNotClosedByDate } from '../period-status';
import {
  addMoney,
  moneyNumber,
  toDecimal,
} from '#/utils/finance/decimal-money';
import {
  createFinanceDataTable,
  createFinanceDataTableCurrent,
} from '../common/account-set-scope';

/**
 * 凭证（Voucher）
 *
 * 注意：表名/字段已按你提供的 Bil_Voucher_Main / Bil_Voucher_Detail 对齐。
 * 当前仓库仍未找到后端真实 ModelId 的线索，因此 VOUCHER_MAIN_MODEL_ID / VOUCHER_DETAIL_MODEL_ID 仍为占位；
 * 若需要自动生成凭证号，请同时替换 VOUCHER_NO_RULE_ID（编码规则/menuId）。
 */
export namespace ErpVoucherApi {
  export interface VoucherMain {
    rowid?: string;
    row_id?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;

    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    note?: string;
    remark?: string;
    voucher_note?: string;
    lingma_sys_is_delete?: number;

    business_url?: string;
    business_code?: string;
    voucher_type?: string;
    business_name?: string;
    is_posted?: number;
    is_reversed?: number;
    voucher_recycle_state?: number;
    voucher_recycle_time?: Date | string;
    reviewer?: string;
    operator?: string;
    credit_amount?: number;
    debit_amount?: number;
    company_name?: string;
    voucher_date?: Date | string;
    voucher_code?: string;
    account_set_id?: string;
    lingma_sys_ent?: string;
  }

  export interface VoucherDetail {
    rowid?: string;
    row_id?: string;
    createuser?: string;
    createtime?: Date | string;
    updateuser?: string;
    updatetime?: Date | string;

    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;

    voucher_id?: string;
    credit_amount?: number;
    debit_amount?: number;
    account_name?: string;
    account_code?: string;
    abstract_content?: string;
    sort_no?: number;
    voucher_recycle_state?: number;
    voucher_recycle_time?: Date | string;
    account_set_id?: string;
    lingma_sys_ent?: string;
  }

  export interface Voucher {
    main: VoucherMain;
    details: VoucherDetail[];
  }
}

const VOUCHER_MAIN_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_MAIN_TABLE = 'Bil_Voucher_Main';
const VOUCHER_MAIN_DB = 'LMBill';
const VOUCHER_MAIN_PK = 'rowid';

const VOUCHER_DETAIL_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_TABLE = 'Bil_Voucher_Detail';
const VOUCHER_DETAIL_DB = 'LMBill';
const VOUCHER_DETAIL_PK = 'rowid';

const VOUCHER_NO_RULE_ID = '00000000000000000000000000000000';

export interface VoucherCodeChange {
  voucherId: string;
  oldCode?: string;
  newCode: string;
}

const PERIOD_STATUS_MODEL_ID = '7587CA78903525BBA582048E98660C22';
const PERIOD_STATUS_TABLE = 'fin_period_status';
const PERIOD_STATUS_DB = 'LMBill';
const PERIOD_STATUS_PK = 'id';

const JOURNAL_MODEL_ID = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const JOURNAL_TABLE = 'Bil_Bank_Journal';
const JOURNAL_DB = 'LMBill';
const JOURNAL_PK = 'id';

const ASSET_MODEL_ID = 'C9FCC66011786A6ACDEAF1BFD3631E31';
const ASSET_DB = 'LMBill';
const ASSET_PK = 'id';
const ASSET_DEPRECIATION_TABLE = 'Bil_Asset_Depreciation';
const ASSET_CHANGE_TABLE = 'Bil_Asset_Change';

function safeJsonParse(text: any) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const value = String(item ?? '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeRowIdAlias<T extends Record<string, any> | null>(row: T): T {
  if (!row) return row;
  const payload = { ...(row as any) };
  const id = pickNonEmptyText(payload.rowid, payload.row_id);
  if (id) {
    payload.rowid = id;
    payload.row_id = id;
  }
  return payload as T;
}

function normalizeRowIdAliasList<T extends Record<string, any>>(rows: T[]) {
  return (rows || []).map((row) => normalizeRowIdAlias(row) as T);
}

function toDbPkPayload<T extends Record<string, any>>(
  row: T,
  pkName: string,
): T {
  const payload = { ...(row || {}) } as any;
  const id = pickNonEmptyText(payload[pkName], payload.row_id, payload.rowid);
  if (id) payload[pkName] = id;
  if (pkName !== 'rowid') delete payload.rowid;
  return payload as T;
}

function assertVoucherDetailsBalanced(details: ErpVoucherApi.VoucherDetail[]) {
  if (!Array.isArray(details) || details.length === 0) {
    throw new Error('凭证至少需要一条明细分录');
  }

  const normalized = details.map((item, index) => {
    const debit = moneyNumber(item?.debit_amount ?? 0);
    const credit = moneyNumber(item?.credit_amount ?? 0);
    const accountCode = pickNonEmptyText(item?.account_code);
    if (!accountCode)
      throw new Error(`第${index + 1}行凭证明细缺少会计科目编码`);
    // 红冲凭证允许借方/贷方金额为负数，保留借贷平衡校验即可。
    // if (toDecimal(debit).lessThan(0) || toDecimal(credit).lessThan(0)) {
    //   throw new Error(`第${index + 1}行凭证明细金额不能为负数`);
    // }
    if (toDecimal(debit).greaterThan(0) && toDecimal(credit).greaterThan(0)) {
      throw new Error(`第${index + 1}行凭证明细不能同时填写借方和贷方金额`);
    }
    if (toDecimal(debit).isZero() && toDecimal(credit).isZero()) {
      throw new Error(`第${index + 1}行凭证明细借贷金额不能同时为 0`);
    }
    return { ...item, debit_amount: debit, credit_amount: credit };
  });

  const totalDebit = moneyNumber(
    addMoney(normalized.map((item) => item.debit_amount)),
  );
  const totalCredit = moneyNumber(
    addMoney(normalized.map((item) => item.credit_amount)),
  );
  // 红冲凭证会出现负数借方合计，不能按“大于 0”限制。
  // if (toDecimal(totalDebit).lessThanOrEqualTo(0)) {
  //   throw new Error('凭证借方合计必须大于 0');
  // }
  if (!toDecimal(totalDebit).equals(toDecimal(totalCredit))) {
    throw new Error(
      `凭证借贷不平：借方合计 ${totalDebit.toFixed(2)}，贷方合计 ${totalCredit.toFixed(2)}`,
    );
  }

  return { normalized, totalDebit, totalCredit };
}

function pickVoucherDetailDbFields(row: Record<string, any>) {
  const payload = row || {};
  const id = pickNonEmptyText(payload.rowid, payload.row_id);
  const result: Record<string, any> = {};
  if (id) result.rowid = id;

  const fieldNames = [
    'createuser',
    'createtime',
    'updateuser',
    'updatetime',
    'wfid',
    'flowstate',
    'ReportID',
    'description',
    'lingma_sys_is_delete',
    'voucher_id',
    'credit_amount',
    'debit_amount',
    'account_name',
    'account_code',
    'abstract_content',
    'account_set_id',
    'lingma_sys_ent',
    'sort_no',
    'voucher_recycle_state',
    'voucher_recycle_time',
  ];

  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(payload, fieldName)) {
      result[fieldName] = payload[fieldName];
    }
  }

  return result;
}

function normalizeVoucherMainPayload<T extends Record<string, any>>(
  main: T,
): T {
  const payload = { ...(main || {}) } as any;
  const hasExplicitNote =
    Object.prototype.hasOwnProperty.call(payload, 'note') ||
    Object.prototype.hasOwnProperty.call(payload, 'remark') ||
    Object.prototype.hasOwnProperty.call(payload, 'voucher_note');

  if (hasExplicitNote) {
    const rawNote =
      payload.note !== undefined
        ? payload.note
        : payload.remark !== undefined
          ? payload.remark
          : payload.voucher_note;
    payload.description = String(rawNote ?? '').trim();
  }

  delete payload.note;
  delete payload.remark;
  delete payload.voucher_note;
  return payload as T;
}

function parseVoucherWordNo(code: string): { word: string; no: number } {
  const s = String(code ?? '').trim();
  const m = s.match(/^(.+?)(\d+)$/);
  if (!m) return { word: s || '记', no: 0 };
  const word = String(m[1] ?? '').trim() || '记';
  const no = Number(m[2]);
  return { word, no: Number.isFinite(no) && no >= 0 ? Math.trunc(no) : 0 };
}

function parseNoFromVoucherCode(code: string, word: string): number | null {
  const w = String(word ?? '').trim();
  const s = String(code ?? '').trim();
  const m = s.match(new RegExp(`^${w}[-]?\\s*(\\d+)$`));
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toMysqlDateTimeString(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num: number) => String(num).padStart(2, '0');
  if (Number.isNaN(date.getTime())) return null;
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      '-',
    ) +
    ' ' +
    [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(
      ':',
    )
  );
}

function getMonthIsoRange(value: Date | string | number) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0).toISOString();
  const end = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  return [start, end] as const;
}

export async function getNextVoucherCodeByDate(
  voucherDate: Date | string | number,
  voucherWord = '记',
) {
  const word = String(voucherWord || '记').trim() || '记';
  const [start, end] = getMonthIsoRange(voucherDate);
  const listRes = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [start, end],
    voucherCodePrefix: word,
  } as any);

  const items = Array.isArray(listRes?.list) ? (listRes.list as any[]) : [];
  let maxNo = 0;
  for (const item of items) {
    const raw = pickNonEmptyText(
      item?.voucher_code,
      item?.ReportID,
      item?.business_code,
    );
    const parsedByWord = parseNoFromVoucherCode(raw, word);
    const parsed =
      parsedByWord ??
      (parseVoucherWordNo(raw).word === word
        ? parseVoucherWordNo(raw).no
        : null);
    if (parsed !== null && parsed > maxNo) {
      maxNo = parsed;
    }
  }
  return `${word}${Math.max(1, maxNo + 1)}`;
}

export async function getVoucherPage(
  params: any & PageParam,
): Promise<clientData> {
  const table = createFinanceDataTable(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );

  const filterConds: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.recycleState === 1) {
    filterConds.push(cond('voucher_recycle_state', 'equal', 1));
  } else {
    filterConds.push(cond('voucher_recycle_state', 'notequal', 1));
  }

  if (
    params.recycleState !== 1 &&
    Array.isArray(params.voucherDateRange) &&
    params.voucherDateRange.length === 2
  ) {
    const [start, end] = params.voucherDateRange;
    if (start)
      filterConds.push(cond('voucher_date', 'greaterthanorequal', start));
    if (end) filterConds.push(cond('voucher_date', 'lessthanorequal', end));
  }

  if (params.voucherCodeExact) {
    filterConds.push(cond('voucher_code', 'equal', params.voucherCodeExact));
  }

  if (params.voucherCodePrefix) {
    filterConds.push(
      cond('voucher_code', 'contains', params.voucherCodePrefix),
    );
  }

  if (params.keyword) {
    filterConds.push(
      or(
        cond('company_name', 'contains', params.keyword),
        cond('business_code', 'contains', params.keyword),
        cond('business_name', 'contains', params.keyword),
        cond('description', 'contains', params.keyword),
        cond('ReportID', 'contains', params.keyword),
        cond('voucher_code', 'contains', params.keyword),
      ),
    );
  }

  table.Filter = filterConds.length > 0 ? and(...filterConds) : null;
  table.Fields = [];
  // const requestedPageSize = Number(params?.pageSize ?? params?.PageSize ?? 20);
  // const requestedPageNo = Number(params?.pageNo ?? params?.PageIndex ?? 1);
  const queryParam: any = {
    Table: [table],
    // PageParam: {
    //   page: 0,
    //   index: 1,
    // },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = normalizeRowIdAliasList(
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [],
  );
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getVoucherMain(rowid: string) {
  const table = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );

  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond(VOUCHER_MAIN_PK, 'equal', rowid),
  );
  table.Fields = [];

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return normalizeRowIdAlias((resultData.Items && resultData.Items[0]) || null);
}

export async function getVoucherDetails(voucherId: string) {
  const table = createFinanceDataTable(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('voucher_id', 'equal', voucherId),
  );
  table.Fields = [];

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return normalizeRowIdAliasList(
    (resultData.Items as ErpVoucherApi.VoucherDetail[]) || [],
  );
}

export async function getVoucherDetailsByIds(voucherIds: string[]) {
  const ids = Array.from(
    new Set(
      (voucherIds || []).map((id) => String(id || '').trim()).filter(Boolean),
    ),
  );
  if (ids.length === 0) return [] as ErpVoucherApi.VoucherDetail[];

  const rows: ErpVoucherApi.VoucherDetail[] = [];
  const chunkSize = 80;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const table = createFinanceDataTable(
      VOUCHER_DETAIL_MODEL_ID,
      VOUCHER_DETAIL_TABLE,
      VOUCHER_DETAIL_DB,
      VOUCHER_DETAIL_PK,
    );

    table.Filter = cond('voucher_id', 'in', chunk);
    table.Fields = [];

    const queryParam = {
      Table: [table],
      // PageParam: { page: Math.max(1000, chunk.length * 20), index: 1 },
    };

    const resQuery = await requestClient.post(table.queryUrl, queryParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });

    table.execQueryResult(resQuery);
    const resultData =
      resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
    rows.push(
      ...normalizeRowIdAliasList(
        (resultData.Items as ErpVoucherApi.VoucherDetail[]) || [],
      ),
    );
  }

  const groupMap = new Map<
    string,
    Array<ErpVoucherApi.VoucherDetail & { __rawIndex?: number }>
  >();
  rows.forEach((row, rawIndex) => {
    const voucherId = pickNonEmptyText(
      (row as any)?.voucher_id,
      (row as any)?.voucherId,
    );
    if (!voucherId) return;
    const list = groupMap.get(voucherId) ?? [];
    list.push({ ...(row as any), __rawIndex: rawIndex });
    groupMap.set(voucherId, list);
  });

  const sortedGroups = new Map<string, ErpVoucherApi.VoucherDetail[]>();
  for (const [voucherId, list] of groupMap) {
    sortedGroups.set(
      voucherId,
      [...list]
        .sort((a, b) => {
          const sortA = Number((a as any)?.sort_no);
          const sortB = Number((b as any)?.sort_no);
          const hasSortA = Number.isFinite(sortA);
          const hasSortB = Number.isFinite(sortB);
          if (hasSortA && hasSortB && sortA !== sortB) return sortA - sortB;
          if (hasSortA !== hasSortB) return hasSortA ? -1 : 1;
          return (
            Number((a as any).__rawIndex ?? 0) -
            Number((b as any).__rawIndex ?? 0)
          );
        })
        .map((item) => {
          const { __rawIndex, ...detail } = item as any;
          return detail as ErpVoucherApi.VoucherDetail;
        }),
    );
  }

  return ids.flatMap((id) => sortedGroups.get(id) ?? []);
}
export async function getVoucher(
  voucherMainId: string,
): Promise<ErpVoucherApi.Voucher | null> {
  const main = await getVoucherMain(voucherMainId);
  if (!main) return null;
  const details = await getVoucherDetails(voucherMainId);
  return { main, details };
}

export async function createVoucher(
  main: ErpVoucherApi.VoucherMain,
  details: ErpVoucherApi.VoucherDetail[] = [],
  options?: { codeRuleId?: string; codeMenuId?: string },
) {
  const mainTable = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );
  const detailTable = createFinanceDataTableCurrent(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  const requestedVoucherId = pickNonEmptyText(
    (main as any)?.row_id,
    (main as any)?.rowid,
  );
  const voucherId = requestedVoucherId || generateUUID();
  const detailBalance = assertVoucherDetailsBalanced(details);
  const mainPayload: ErpVoucherApi.VoucherMain = normalizeVoucherMainPayload(
    toDbPkPayload(
      {
        ...main,
        rowid: voucherId,
        debit_amount: detailBalance.totalDebit,
        credit_amount: detailBalance.totalCredit,
        lingma_sys_is_delete: 0,
        voucher_recycle_state: 0,
        voucher_recycle_time: null,
      } as any,
      VOUCHER_MAIN_PK,
    ),
  );

  const saveMainParam = mainTable.getSaveParam([mainPayload as any], [], []);
  const resMain = await requestClient.post(mainTable.saveUrl, saveMainParam, {
    headers: mainTable.getRequestHeader(),
  });

  const codeMenuId =
    options?.codeMenuId ?? options?.codeRuleId ?? VOUCHER_NO_RULE_ID;
  if (
    !main.voucher_code &&
    codeMenuId &&
    codeMenuId !== '00000000000000000000000000000000'
  ) {
    try {
      const codeRes = await getCodeString(
        voucherId,
        codeMenuId,
        mainTable.getRequestHeader(),
      );
      if (codeRes?.Code === 200 && codeRes?.Message) {
        await updateVoucherMain({
          rowid: voucherId,
          voucher_code: codeRes.Message,
        });
      } else {
        await permanentlyDeleteVoucher([voucherId]);
        return Promise.reject(new Error(codeRes?.Message || '获取编码失败'));
      }
    } catch (error) {
      await permanentlyDeleteVoucher([voucherId]);
      throw error;
    }
  }

  if (details.length > 0) {
    const detailAdded = detailBalance.normalized.map((d, index) =>
      pickVoucherDetailDbFields(
        toDbPkPayload(
          {
            ...d,
            rowid: (d as any).row_id || d.rowid || generateUUID(),
            voucher_id: voucherId,
            sort_no: d.sort_no ?? index + 1,
            lingma_sys_is_delete: 0,
            voucher_recycle_state: 0,
            voucher_recycle_time: null,
          } as any,
          VOUCHER_DETAIL_PK,
        ),
      ),
    );

    try {
      const saveDetailParam = detailTable.getSaveParam(
        detailAdded as any,
        [],
        [],
      );
      await requestClient.post(detailTable.saveUrl, saveDetailParam, {
        headers: detailTable.getRequestHeader(),
      });
    } catch (error) {
      await permanentlyDeleteVoucher([voucherId]);
      throw error;
    }
  }

  return {
    ...resMain,
    rowid: voucherId,
    row_id: voucherId,
    voucher_code: mainPayload.voucher_code,
  };
}

async function queryVoucherRelatedRows(options: {
  modelId: string;
  tableName: string;
  dbName: string;
  pkName: string;
  voucherIdField: string;
  voucherId: string;
}) {
  const table = new DataTable(
    options.modelId,
    options.tableName,
    options.dbName,
    options.pkName,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond(options.voucherIdField, 'equal', options.voucherId),
  );
  table.Fields = [];
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 0, index: 1 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res as any);
  const resultData =
    (res as any).data?.Result?.data ||
    (res as any).data?.Result ||
    (res as any).data;
  return resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
}

async function queryVoucherRelatedRowsByCode(options: {
  modelId: string;
  tableName: string;
  dbName: string;
  pkName: string;
  voucherCodeField: string;
  voucherCode: string;
}) {
  const table = new DataTable(
    options.modelId,
    options.tableName,
    options.dbName,
    options.pkName,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond(options.voucherCodeField, 'equal', options.voucherCode),
  );
  table.Fields = [];
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 0, index: 1 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res as any);
  const resultData =
    (res as any).data?.Result?.data ||
    (res as any).data?.Result ||
    (res as any).data;
  return resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
}

async function updateVoucherRelatedRows(options: {
  modelId: string;
  tableName: string;
  dbName: string;
  pkName: string;
  rows: any[];
}) {
  if (!options.rows.length) return;
  const table = new DataTable(
    options.modelId,
    options.tableName,
    options.dbName,
    options.pkName,
  );
  const saveParam = table.getSaveParam([], options.rows, []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

function replaceVoucherCodeText(text: any, oldCode: string, newCode: string) {
  const raw = String(text ?? '');
  if (!raw || !oldCode || oldCode === newCode) return raw;
  return raw.split(oldCode).join(newCode);
}

export async function syncVoucherCodeRelatedData(changes: VoucherCodeChange[]) {
  const normalized = (changes || [])
    .map((item) => ({
      voucherId: String(item?.voucherId || '').trim(),
      oldCode: String(item?.oldCode || '').trim(),
      newCode: String(item?.newCode || '').trim(),
    }))
    .filter((item) => item.voucherId && item.newCode);
  if (normalized.length === 0) return;

  for (const item of normalized) {
    const journalRows = await queryVoucherRelatedRows({
      modelId: JOURNAL_MODEL_ID,
      tableName: JOURNAL_TABLE,
      dbName: JOURNAL_DB,
      pkName: JOURNAL_PK,
      voucherIdField: 'voucher_main_id',
      voucherId: item.voucherId,
    });
    await updateVoucherRelatedRows({
      modelId: JOURNAL_MODEL_ID,
      tableName: JOURNAL_TABLE,
      dbName: JOURNAL_DB,
      pkName: JOURNAL_PK,
      rows: journalRows
        .map((row: any) => String(row?.id || '').trim())
        .filter(Boolean)
        .map((id: string) => ({ id, voucher_code: item.newCode })),
    });

    if (item.oldCode && item.oldCode !== item.newCode) {
      for (const tableName of [ASSET_DEPRECIATION_TABLE, ASSET_CHANGE_TABLE]) {
        const assetRows = await queryVoucherRelatedRowsByCode({
          modelId: ASSET_MODEL_ID,
          tableName,
          dbName: ASSET_DB,
          pkName: ASSET_PK,
          voucherCodeField: 'voucher_no',
          voucherCode: item.oldCode,
        });
        await updateVoucherRelatedRows({
          modelId: ASSET_MODEL_ID,
          tableName,
          dbName: ASSET_DB,
          pkName: ASSET_PK,
          rows: assetRows
            .map((row: any) => String(row?.id || row?.rowid || '').trim())
            .filter(Boolean)
            .map((id: string) => ({ id, voucher_no: item.newCode })),
        });
      }
    }

    const periodRows = await queryVoucherRelatedRows({
      modelId: PERIOD_STATUS_MODEL_ID,
      tableName: PERIOD_STATUS_TABLE,
      dbName: PERIOD_STATUS_DB,
      pkName: PERIOD_STATUS_PK,
      voucherIdField: 'carry_forward_voucher_id',
      voucherId: item.voucherId,
    });
    await updateVoucherRelatedRows({
      modelId: PERIOD_STATUS_MODEL_ID,
      tableName: PERIOD_STATUS_TABLE,
      dbName: PERIOD_STATUS_DB,
      pkName: PERIOD_STATUS_PK,
      rows: periodRows
        .map((row: any) => {
          const id = String(row?.id || row?.rowid || '').trim();
          if (!id) return null;
          return {
            id,
            carry_forward_voucher_code: item.newCode,
            remark: replaceVoucherCodeText(
              row?.remark,
              item.oldCode,
              item.newCode,
            ),
            description: replaceVoucherCodeText(
              row?.description,
              item.oldCode,
              item.newCode,
            ),
          };
        })
        .filter(Boolean),
    });
  }
}

export async function updateVoucherMain(data: ErpVoucherApi.VoucherMain) {
  const table = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );
  const payload = normalizeVoucherMainPayload(
    toDbPkPayload(data as any, VOUCHER_MAIN_PK),
  );
  const saveParam = table.getSaveParam([], [payload as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateVoucherMainBatch(
  rows: ErpVoucherApi.VoucherMain[],
) {
  const changedList = (rows || [])
    .map((row) =>
      normalizeVoucherMainPayload(toDbPkPayload(row as any, VOUCHER_MAIN_PK)),
    )
    .filter((row: any) => pickNonEmptyText(row?.[VOUCHER_MAIN_PK]));

  if (changedList.length === 0) return;

  const table = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );
  const saveParam = table.getSaveParam([], changedList as any, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function saveVoucherDetails(params: {
  added?: ErpVoucherApi.VoucherDetail[];
  changed?: ErpVoucherApi.VoucherDetail[];
  deleted?: ErpVoucherApi.VoucherDetail[];
  voucherId?: string;
}) {
  const table = createFinanceDataTableCurrent(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  const added = (params.added || []).map((d) =>
    pickVoucherDetailDbFields(
      toDbPkPayload(
        {
          ...d,
          rowid: (d as any).row_id || d.rowid || generateUUID(),
          voucher_id: d.voucher_id || params.voucherId,
          debit_amount: moneyNumber(d.debit_amount ?? 0),
          credit_amount: moneyNumber(d.credit_amount ?? 0),
          lingma_sys_is_delete: d.lingma_sys_is_delete ?? 0,
        } as any,
        VOUCHER_DETAIL_PK,
      ),
    ),
  );

  const changed = (params.changed || []).map((d) =>
    pickVoucherDetailDbFields(
      toDbPkPayload(
        {
          ...d,
          voucher_id: d.voucher_id || params.voucherId,
          debit_amount:
            d.debit_amount === undefined
              ? d.debit_amount
              : moneyNumber(d.debit_amount),
          credit_amount:
            d.credit_amount === undefined
              ? d.credit_amount
              : moneyNumber(d.credit_amount),
        } as any,
        VOUCHER_DETAIL_PK,
      ),
    ),
  );

  const deleted = (params.deleted || []).map((d) =>
    pickVoucherDetailDbFields(
      toDbPkPayload(
        {
          ...d,
          lingma_sys_is_delete: 1,
        } as any,
        VOUCHER_DETAIL_PK,
      ),
    ),
  );

  const saveParam = table.getSaveParam(
    added as any,
    changed as any,
    deleted as any,
  );
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

async function assertVoucherOperationAllowed(
  ids: string[],
  actionText: string,
) {
  const voucherMains = await Promise.all(ids.map((id) => getVoucherMain(id)));
  for (const voucherMain of voucherMains) {
    if (!voucherMain) {
      throw new Error('凭证不存在或已删除，无法继续操作');
    }
    await assertPeriodNotClosedByDate({
      date:
        voucherMain.voucher_date ||
        voucherMain.createtime ||
        voucherMain.updatetime,
      actionText,
    });
  }
}

async function getVoucherDetailRowIds(voucherMainIds: string[]) {
  const allDetailRowids: string[] = [];
  for (const voucherId of voucherMainIds) {
    const details = await getVoucherDetails(voucherId);
    for (const item of details) {
      const detailId = pickNonEmptyText((item as any)?.row_id, item?.rowid);
      if (detailId) allDetailRowids.push(detailId);
    }
  }
  return allDetailRowids;
}

function getVoucherRestoreCode(main: ErpVoucherApi.VoucherMain) {
  return pickNonEmptyText(main.voucher_code, main.ReportID, main.business_code);
}

async function assertVoucherCodeAvailableForRestore(ids: string[]) {
  const voucherMains = await Promise.all(ids.map((id) => getVoucherMain(id)));
  for (const voucherMain of voucherMains) {
    if (!voucherMain) {
      throw new Error('凭证不存在或已删除，无法继续还原');
    }

    const voucherCode = getVoucherRestoreCode(voucherMain);
    if (!voucherCode) continue;

    const dateValue = pickNonEmptyText(
      voucherMain.voucher_date,
      voucherMain.createtime,
      voucherMain.updatetime,
    );
    const [start, end] = getMonthIsoRange(dateValue || Date.now());
    const res = await getVoucherPage({
      pageNo: 1,
      page: 0,
      voucherDateRange: [start, end],
      voucherCodeExact: voucherCode,
      recycleState: 0,
    } as any);
    const currentId = pickNonEmptyText(
      voucherMain.rowid,
      (voucherMain as any).row_id,
    );
    const duplicated = ((res?.list || []) as any[]).find((item) => {
      const id = pickNonEmptyText(item?.rowid, item?.row_id);
      const code = pickNonEmptyText(
        item?.voucher_code,
        item?.ReportID,
        item?.business_code,
      );
      return id && id !== currentId && code === voucherCode;
    });

    if (duplicated) {
      throw new Error(
        `凭证字号“${voucherCode}”已存在，不能直接还原。请先调整正常凭证或回收站凭证的凭证字号。`,
      );
    }
  }
}

async function updateVoucherRecycleState(
  voucherMainIds: string[],
  recycleState: 0 | 1,
) {
  const mainTable = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );
  const detailTable = createFinanceDataTableCurrent(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  const ids = (voucherMainIds || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const recycleTime =
    recycleState === 1 ? toMysqlDateTimeString(new Date()) : null;
  const changedMainList = ids.map((id) => ({
    [VOUCHER_MAIN_PK]: id,
    voucher_recycle_state: recycleState,
    voucher_recycle_time: recycleTime,
  }));

  const saveMainParam = mainTable.getSaveParam([], changedMainList as any, []);
  await requestClient.post(mainTable.saveUrl, saveMainParam, {
    headers: mainTable.getRequestHeader(),
  });

  const allDetailRowids = await getVoucherDetailRowIds(ids);
  if (allDetailRowids.length > 0) {
    const changedDetailList = allDetailRowids.map((rowid) => ({
      [VOUCHER_DETAIL_PK]: rowid,
      voucher_recycle_state: recycleState,
      voucher_recycle_time: recycleTime,
    }));
    const saveDetailParam = detailTable.getSaveParam(
      [],
      changedDetailList as any,
      [],
    );
    await requestClient.post(detailTable.saveUrl, saveDetailParam, {
      headers: detailTable.getRequestHeader(),
    });
  }
}

export async function deleteVoucher(voucherMainIds: string[]) {
  const ids = (voucherMainIds || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  await assertVoucherOperationAllowed(ids, '删除凭证到回收站，请先反结账');
  await updateVoucherRecycleState(ids, 1);
}

export async function restoreVoucher(voucherMainIds: string[]) {
  const ids = (voucherMainIds || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  await assertVoucherOperationAllowed(ids, '还原回收站凭证，请先反结账');
  await assertVoucherCodeAvailableForRestore(ids);
  await updateVoucherRecycleState(ids, 0);
}

export async function permanentlyDeleteVoucher(voucherMainIds: string[]) {
  const mainTable = createFinanceDataTableCurrent(
    VOUCHER_MAIN_MODEL_ID,
    VOUCHER_MAIN_TABLE,
    VOUCHER_MAIN_DB,
    VOUCHER_MAIN_PK,
  );
  const detailTable = createFinanceDataTableCurrent(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );

  const ids = (voucherMainIds || [])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const deleteMainList = ids.map((id) => ({
    [VOUCHER_MAIN_PK]: id,
    lingma_sys_is_delete: 1,
  }));
  const saveMainParam = mainTable.getSaveParam([], [], deleteMainList as any);
  await requestClient.post(mainTable.saveUrl, saveMainParam, {
    headers: mainTable.getRequestHeader(),
  });

  const allDetailRowids = await getVoucherDetailRowIds(ids);
  if (allDetailRowids.length > 0) {
    const deleteDetailList = allDetailRowids.map((rowid) => ({
      [VOUCHER_DETAIL_PK]: rowid,
      lingma_sys_is_delete: 1,
    }));
    const saveDetailParam = detailTable.getSaveParam(
      [],
      [],
      deleteDetailList as any,
    );
    await requestClient.post(detailTable.saveUrl, saveDetailParam, {
      headers: detailTable.getRequestHeader(),
    });
  }
}
export function parseVoucherEntries(description: any): any[] {
  const parsed = safeJsonParse(description);
  const items = Array.isArray(parsed?.entries) ? parsed.entries : [];
  return items;
}

export function buildVoucherDescription(payload: any): string {
  return JSON.stringify(payload || {});
}

export * from './voucherAux';
