import { generateUUID } from '@vben/utils';

import { and, cond } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';

const CURRENCY_FORM_ID = 'B6BA412BA6690E9318A9ED78BBB5ABB3';
const CURRENCY_TABLE = 'Bil_Currency';
const CURRENCY_DB = 'LMBill';
const CURRENCY_PK = 'id';

export namespace BilCurrencyApi {
  export type Currency = {
    id?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string | null;
    account_set_id?: string | null;
    currency_code?: string;
    currency_name?: string;
    currency_symbol?: string;
    currency_unit?: string;
    exchange_rate?: number | string;
    is_base_currency?: number;
    enable_status?: number;
    sort_no?: number;
    remark?: string;
    lingma_sys_key?: string;
  };
}

export type CurrencyVO = {
  id: string;
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  currencyUnit: string;
  exchangeRate: number;
  isBaseCurrency: boolean;
  enableStatus: number;
  sortNo: number;
  remark: string;
  lingmaSysEnt?: string;
  lingmaSysKey?: string;
  accountSetId?: string;
};

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toVO(row: any): CurrencyVO {
  return {
    id: String(row?.id || row?.rowid || ''),
    currencyCode: String(row?.currency_code || ''),
    currencyName: String(row?.currency_name || ''),
    currencySymbol: String(row?.currency_symbol || ''),
    currencyUnit: String(row?.currency_unit || ''),
    exchangeRate: toNumber(row?.exchange_rate, 1),
    isBaseCurrency: Number(row?.is_base_currency || 0) === 1,
    enableStatus: Number(row?.enable_status ?? 1) === 0 ? 0 : 1,
    sortNo: toNumber(row?.sort_no, 0),
    remark: String(row?.remark || ''),
    lingmaSysEnt: String(row?.lingma_sys_ent || '') || undefined,
    lingmaSysKey: String(row?.lingma_sys_key || '') || undefined,
    accountSetId: String(row?.account_set_id || '') || undefined,
  };
}

function toRow(data: Partial<CurrencyVO>): BilCurrencyApi.Currency {
  const currencyCode = String(data.currencyCode || '').trim().toUpperCase();
  const currencyName = String(data.currencyName || '').trim();
  if (!currencyCode) throw new Error('币别编码不能为空');
  if (!currencyName) throw new Error('币别名称不能为空');

  return {
    id: String(data.id || '').trim() || generateUUID(),
    currency_code: currencyCode,
    currency_name: currencyName,
    currency_symbol: String(data.currencySymbol || '').trim() || null as any,
    currency_unit: String(data.currencyUnit || '').trim() || null as any,
    exchange_rate: toNumber(data.exchangeRate, 1),
    is_base_currency: data.isBaseCurrency ? 1 : 0,
    enable_status: data.enableStatus === 0 ? 0 : 1,
    sort_no: toNumber(data.sortNo, 0),
    remark: String(data.remark || '').trim() || null as any,
    lingma_sys_is_delete: 0,
    ...(data.lingmaSysEnt ? { lingma_sys_ent: data.lingmaSysEnt } : {}),
    ...(data.lingmaSysKey ? { lingma_sys_key: data.lingmaSysKey } : {}),
  };
}

function createCurrencyTable() {
  // 财务基础资料必须按当前账套隔离；createFinanceDataTable 会自动为查询追加 account_set_id 过滤，
  // 并在新增/修改时补齐当前账套 account_set_id。
  return createFinanceDataTable(CURRENCY_FORM_ID, CURRENCY_TABLE, CURRENCY_DB, CURRENCY_PK);
}

async function clearOtherBaseCurrencies(currentId: string, lingmaSysEnt?: string) {
  const table = createCurrencyTable();
  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('is_base_currency', 'equal', 1),
  ];
  if (lingmaSysEnt) filters.push(cond('lingma_sys_ent', 'equal', lingmaSysEnt));
  table.Filter = and(...filters);

  const raw = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 500, index: 1 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(raw);

  const { items } = extractListAndTotal(raw);
  const changed = items
    .filter((item: any) => String(item?.id || item?.rowid || '') !== currentId)
    .map((item: any) => ({
      id: String(item?.id || item?.rowid || ''),
      is_base_currency: 0,
      ...(item?.lingma_sys_key ? { lingma_sys_key: item.lingma_sys_key } : {}),
    }))
    .filter((item: any) => item.id);

  if (changed.length === 0) return;
  await requestClient.post(table.saveUrl, table.getSaveParam([], changed, []), {
    headers: table.getRequestHeader(),
  });
}

export async function getCurrencyPage(params: {
  keyword?: string;
  enableStatus?: '' | number;
  isBaseCurrency?: '' | number;
  pageNo: number;
  page: number;
}) {
  const table = createCurrencyTable();

  // 币别列表获取请求不携带查询条件，避免进入页面时被条件过滤。
  table.Fields = [
  ];

  const raw = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: params.page || 20, index: params.pageNo || 1 },
    },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(raw);
  const { items, total } = extractListAndTotal(raw);

  return { dataTable: table, list: items.map(toVO), total };
}

export async function saveCurrency(data: Partial<CurrencyVO>) {
  const id = String(data.id || '').trim();
  const isAdd = !id;
  const row = toRow(data);
  const table = createCurrencyTable();
  const raw = await requestClient.post(
    table.saveUrl,
    table.getSaveParam(isAdd ? [row as any] : [], isAdd ? [] : [row as any], []),
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  if (row.is_base_currency === 1) {
    await clearOtherBaseCurrencies(String(row.id), row.lingma_sys_ent || undefined);
  }
  return raw;
}

export async function deleteCurrency(row: Pick<CurrencyVO, 'id' | 'lingmaSysKey'>) {
  const id = String(row.id || '').trim();
  if (!id) throw new Error('缺少 id');
  const table = createCurrencyTable();
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [{ id, lingma_sys_is_delete: 1, ...(row.lingmaSysKey ? { lingma_sys_key: row.lingmaSysKey } : {}) }], []),
    { headers: table.getRequestHeader() },
  );
}

export async function toggleCurrencyEnable(row: Pick<CurrencyVO, 'id' | 'lingmaSysKey'>, enable: boolean) {
  const id = String(row.id || '').trim();
  if (!id) throw new Error('缺少 id');
  const table = createCurrencyTable();
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [{ id, enable_status: enable ? 1 : 0, ...(row.lingmaSysKey ? { lingma_sys_key: row.lingmaSysKey } : {}) }], []),
    { headers: table.getRequestHeader() },
  );
}

export async function getEnabledCurrencyOptions() {
  const res = await getCurrencyPage({
    keyword: '',
    enableStatus: 1,
    isBaseCurrency: '',
    pageNo: 1,
    page: 500,
  });
  const list = res.list.length > 0
    ? res.list
    : [
        { id: 'CNY', currencyCode: 'CNY', currencyName: '人民币', currencySymbol: '¥', currencyUnit: '元', exchangeRate: 1, isBaseCurrency: true, enableStatus: 1, sortNo: 10, remark: '' },
      ];
  return list.map((item) => ({
    label: item.currencyName ? `${item.currencyName}(${item.currencyCode})` : item.currencyCode,
    value: item.currencyCode,
    code: item.currencyCode,
    name: item.currencyName,
    symbol: item.currencySymbol,
    raw: item,
  }));
}

export async function syncDefaultCurrencyForCurrentAccountSet() {
  const res = await getCurrencyPage({
    keyword: '',
    enableStatus: '',
    isBaseCurrency: '',
    pageNo: 1,
    page: 500,
  });
  const existed = res.list.find(
    (item) => String(item.currencyCode || '').trim().toUpperCase() === 'CNY',
  );
  if (existed) return { created: false, row: existed };

  await saveCurrency({
    currencyCode: 'CNY',
    currencyName: '\u4eba\u6c11\u5e01',
    currencySymbol: '\u00a5',
    currencyUnit: '\u5143',
    exchangeRate: 1,
    isBaseCurrency: true,
    enableStatus: 1,
    sortNo: 10,
    remark: '',
  });

  return { created: true, row: null };
}
