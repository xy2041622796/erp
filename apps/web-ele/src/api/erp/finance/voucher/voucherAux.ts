import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import {
  createFinanceDataTable,
  createFinanceDataTableCurrent,
} from '../common/account-set-scope';

export interface VoucherDetailAuxInput {
  dimCode?: string;
  dim_code?: string;
  label?: string;
  value?: string;
  value_code?: string;
  valueName?: string;
  value_name?: string;
}

export interface VoucherDetailAuxRow {
  rowid?: string;
  createuser?: string;
  createtime?: Date | string;
  updateuser?: string;
  updatetime?: Date | string;
  lingma_sys_is_delete?: number;
  voucher_id?: string;
  voucher_detail_id?: string;
  dim_code?: string;
  dim_name?: string;
  value_code?: string;
  value_name?: string;
  sort_no?: number;
  account_set_id?: string;
}

const VOUCHER_DETAIL_AUX_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_AUX_TABLE = 'Bil_Voucher_Detail_Aux';
const VOUCHER_DETAIL_AUX_DB = 'LMBill';
const VOUCHER_DETAIL_AUX_PK = 'rowid';

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const value = String(item ?? '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeAuxInput(aux: VoucherDetailAuxInput) {
  const dimCode = pickNonEmptyText(aux.dim_code, aux.dimCode);
  const valueCode = pickNonEmptyText(aux.value_code, aux.value);
  return {
    dim_code: dimCode,
    dim_name: pickNonEmptyText(aux.label, dimCode),
    value_code: valueCode,
    value_name: pickNonEmptyText(
      aux.value_name,
      aux.valueName,
      aux.label,
      valueCode,
    ),
  };
}

export async function getVoucherDetailAuxiliaries(voucherId: string) {
  const table = createFinanceDataTable(
    VOUCHER_DETAIL_AUX_MODEL_ID,
    VOUCHER_DETAIL_AUX_TABLE,
    VOUCHER_DETAIL_AUX_DB,
    VOUCHER_DETAIL_AUX_PK,
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
  return (resultData.Items as VoucherDetailAuxRow[]) || [];
}

export async function getVoucherDetailAuxiliariesByVoucherIds(
  voucherIds: string[],
) {
  const ids = Array.from(
    new Set(
      (voucherIds || []).map((id) => String(id || '').trim()).filter(Boolean),
    ),
  );
  if (ids.length === 0) return [] as VoucherDetailAuxRow[];

  const rows: VoucherDetailAuxRow[] = [];
  const chunkSize = 80;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const table = createFinanceDataTable(
      VOUCHER_DETAIL_AUX_MODEL_ID,
      VOUCHER_DETAIL_AUX_TABLE,
      VOUCHER_DETAIL_AUX_DB,
      VOUCHER_DETAIL_AUX_PK,
    );

    table.Filter = and(
      or(...chunk.map((voucherId) => cond('voucher_id', 'equal', voucherId))),
    );
    table.Fields = [];

    const queryParam = {
      Table: [table],
    };

    const resQuery = await requestClient.post(table.queryUrl, queryParam, {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    });

    table.execQueryResult(resQuery);
    const resultData =
      resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
    rows.push(...((resultData.Items as VoucherDetailAuxRow[]) || []));
  }

  return rows;
}

export async function getVoucherDetailAuxiliaryRows(
  params: {
    dimCodes?: string[];
    keyword?: string;
  } = {},
) {
  const table = createFinanceDataTable(
    VOUCHER_DETAIL_AUX_MODEL_ID,
    VOUCHER_DETAIL_AUX_TABLE,
    VOUCHER_DETAIL_AUX_DB,
    VOUCHER_DETAIL_AUX_PK,
  );

  const filterConds: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];
  const dimCodes = (params.dimCodes || [])
    .map((item) =>
      String(item || '')
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);
  if (dimCodes.length > 0) {
    filterConds.push(
      or(...dimCodes.map((code) => cond('dim_code', 'equal', code))),
    );
  }

  const keyword = String(params.keyword || '').trim();
  if (keyword) {
    filterConds.push(
      or(
        cond('value_code', 'contains', keyword),
        cond('value_name', 'contains', keyword),
        cond('account_code', 'contains', keyword),
      ),
    );
  }

  table.Filter = filterConds.length > 1 ? and(...filterConds) : filterConds[0];
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
  return (resultData.Items as VoucherDetailAuxRow[]) || [];
}

export async function saveVoucherDetailAuxiliaries(params: {
  rows?: Array<{
    rowid?: string;
    voucher_detail_id?: string;
    auxiliaries?: VoucherDetailAuxInput[];
    [key: string]: any;
  }>;
  voucherId: string;
}) {
  const voucherId = String(params.voucherId || '').trim();
  if (!voucherId) return;

  const table = createFinanceDataTableCurrent(
    VOUCHER_DETAIL_AUX_MODEL_ID,
    VOUCHER_DETAIL_AUX_TABLE,
    VOUCHER_DETAIL_AUX_DB,
    VOUCHER_DETAIL_AUX_PK,
  );

  const oldRows = await getVoucherDetailAuxiliaries(voucherId);
  const deleted = oldRows.map((item) => ({
    [VOUCHER_DETAIL_AUX_PK]: item.rowid,
    lingma_sys_is_delete: 1,
  }));

  const added: VoucherDetailAuxRow[] = [];
  for (const row of params.rows || []) {
    const detailId = pickNonEmptyText(row.voucher_detail_id, row.rowid);
    if (!detailId) continue;
    const auxiliaries = Array.isArray(row.auxiliaries) ? row.auxiliaries : [];
    auxiliaries.forEach((aux, index) => {
      const normalized = normalizeAuxInput(aux);
      if (!normalized.dim_code || !normalized.value_code) return;
      added.push({
        ...normalized,
        rowid: generateUUID(),
        voucher_id: voucherId,
        voucher_detail_id: detailId,
        account_code: pickNonEmptyText(row.account_code, row.subject_code),
        account_set_id: pickNonEmptyText(row.account_set_id),
        sort_no: index + 1,
        lingma_sys_is_delete: 0,
      });
    });
  }

  if (added.length === 0 && deleted.length === 0) return;
  const saveParam = table.getSaveParam(added as any, [], deleted as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
