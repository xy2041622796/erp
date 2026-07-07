import { generateUUID } from '@vben/utils';

import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// Bil_Voucher_Word
const VOUCHER_WORD_MODEL_ID = '4F635156F967541ACB3B58DEADF01D02';
const VOUCHER_WORD_TABLE = 'Bil_Voucher_Word';
const VOUCHER_WORD_DB = 'LMBill';
const VOUCHER_WORD_PK = 'id';

function createVoucherWordTable() {
  return createFinanceDataTableCurrent(
    VOUCHER_WORD_MODEL_ID,
    VOUCHER_WORD_TABLE,
    VOUCHER_WORD_DB,
    VOUCHER_WORD_PK,
  );
}

export namespace BilVoucherWordApi {
  export type VoucherWord = {
    id?: string;
    lingma_sys_is_delete?: number;
    account_set_id?: string;
    word?: string;
    print_title?: string;
    is_default?: number;
    sort_no?: number;
  };
}

export type VoucherWordVO = {
  id: string;
  word: string;
  printTitle: string;
  isDefault: boolean;
  ordIdx: number;
  accountSetId?: string;
};

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function toVO(row: any): VoucherWordVO {
  return {
    id: String(row?.id ?? ''),
    word: String(row?.word ?? ''),
    printTitle: String(row?.print_title ?? ''),
    isDefault: Number(row?.is_default ?? 0) === 1,
    ordIdx: Number(row?.sort_no ?? 0) || 0,
    accountSetId: String(row?.account_set_id ?? '') || undefined,
  };
}

async function clearOtherDefaults(scope: { account_set_id?: string }, currentId: string) {
  const table = createVoucherWordTable();

  const filters: any[] = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('is_default', 'equal', 1),
  ];
  if (scope?.account_set_id) {
    filters.push(cond('account_set_id', 'equal', scope.account_set_id));
  }
  table.Filter = and(...filters);

  const queryParam = {
    Table: [table],
    PageParam: { page: 500, index: 1 },
  };

  const raw = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(raw);
  const { items } = extractListAndTotal(raw);

  const updates = (items ?? [])
    .filter((r: any) => String(r?.id ?? '') && String(r?.id ?? '') !== currentId)
    .map((r: any) => ({ id: r.id, is_default: 0 }));

  if (updates.length === 0) return;

  const saveParam = table.getSaveParam([], updates, []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function getVoucherWordPage(params: {
  keyword?: string;
  pageNo: number;
  page: number;
  account_set_id?: string;
  lingma_sys_is_delete?: number;
}) {
  const table = createVoucherWordTable();

  const filterConds: any[] = [];

  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.account_set_id) {
    filterConds.push(cond('account_set_id', 'equal', params.account_set_id));
  }

  const keyword = String(params?.keyword ?? '').trim();
  if (keyword) {
    filterConds.push(
      or(
        cond('word', 'contains', keyword),
        cond('print_title', 'contains', keyword),
      ),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);


  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);

  const list = (items ?? []).map(toVO);

  return {
    dataTable: table,
    list,
    total,
  };
}

export async function getVoucherWord(id: string) {
  const rid = String(id ?? '').trim();
  if (!rid) return null;

  const table = createVoucherWordTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond(VOUCHER_WORD_PK, 'equal', rid),
  );

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const raw = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(raw);
  const { items } = extractListAndTotal(raw);
  const row = items?.[0];
  return row ? toVO(row) : null;
}

export async function createVoucherWord(data: {
  word: string;
  printTitle: string;
  isDefault?: boolean;
  ordIdx?: number;
  accountSetId?: string;
}) {
  const table = createVoucherWordTable();

  const word = String(data.word ?? '').trim();
  const printTitle = String(data.printTitle ?? '').trim();
  if (!word) throw new Error('凭证字不能为空');
  if (!printTitle) throw new Error('打印标题不能为空');

  // 轻量唯一性检查（排除软删）
  const exist = await getVoucherWordPage({
    keyword: word,
    pageNo: 1,
    page: 200,
    account_set_id: data.accountSetId,
  });
  const dup = (exist.list ?? []).some((r: any) => String(r?.word ?? '') === word);
  if (dup) throw new Error(`凭证字“${word}”已存在`);

  const payload: BilVoucherWordApi.VoucherWord = {
    id: generateUUID(),
    lingma_sys_is_delete: 0,
    account_set_id: data.accountSetId,
    word,
    print_title: printTitle,
    is_default: data.isDefault ? 1 : 0,
    sort_no: data.ordIdx ?? 0,
  };

  const saveParam = table.getSaveParam([payload as any], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  if (payload.is_default === 1) {
    await clearOtherDefaults(
      { account_set_id: payload.account_set_id },
      String(payload.id),
    );
  }

  return res;
}

export async function updateVoucherWord(data: {
  id: string;
  word: string;
  printTitle: string;
  isDefault?: boolean;
  ordIdx?: number;
  accountSetId?: string;
}) {
  const id = String(data.id ?? '').trim();
  if (!id) throw new Error('缺少 id');

  const word = String(data.word ?? '').trim();
  const printTitle = String(data.printTitle ?? '').trim();
  if (!word) throw new Error('凭证字不能为空');
  if (!printTitle) throw new Error('打印标题不能为空');

  // 唯一性检查（排除自身）
  const exist = await getVoucherWordPage({
    keyword: word,
    pageNo: 1,
    page: 300,
    account_set_id: data.accountSetId,
  });
  const dup = (exist.list ?? []).some(
    (r: any) => String(r?.id ?? '') !== id && String(r?.word ?? '') === word,
  );
  if (dup) throw new Error(`凭证字“${word}”已存在`);

  const table = createVoucherWordTable();

  const payload: BilVoucherWordApi.VoucherWord = {
    id,
    lingma_sys_is_delete: 0,
    account_set_id: data.accountSetId,
    word,
    print_title: printTitle,
    is_default: data.isDefault ? 1 : 0,
    sort_no: data.ordIdx ?? 0,
  };

  const saveParam = table.getSaveParam([], [payload as any], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  if (payload.is_default === 1) {
    await clearOtherDefaults(
      { account_set_id: payload.account_set_id },
      String(payload.id),
    );
  }

  return res;
}

export async function deleteVoucherWord(id: string) {
  const rid = String(id ?? '').trim();
  if (!rid) return;

  const table = createVoucherWordTable();
  const saveParam = table.getSaveParam([], [{ id: rid, lingma_sys_is_delete: 1 }], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
