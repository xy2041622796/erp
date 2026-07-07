import type { PageParam } from '@vben/request';

import { generateUUID } from '@vben/utils';

import {
  and,
  buildTable,
  cond,
  extractListAndTotal,
  requestClient,
} from './_shared';

export namespace FinanceBusinessAdapterApi {
  export interface Row {
    rowid?: string;
    adapter_code?: string;
    adapter_name?: string;
    source_system_id?: string;
    source_biz_code?: string;
    standard_object_code?: string;
    finance_object_code?: string;
    account_set_id?: string;
    status?: string;
    version_no?: string;
    rule_json?: string;
    sample_payload?: string;
    remark?: string;
    lingma_sys_is_delete?: number;
  }
}

const TABLE_NAME = 'fbsa_adapter';
const PRIMARY_KEY = 'rowid';

export async function getBusinessAdapterPage(
  params: PageParam & {
    keyword?: string;
    source_system_id?: string;
    status?: string;
    account_set_id?: string;
  },
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.keyword) {
    conditions.push(cond('adapter_name', 'contains', params.keyword));
  }
  if (params.source_system_id) {
    conditions.push(cond('source_system_id', 'equal', params.source_system_id));
  }
  if (params.status) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (params.account_set_id) {
    conditions.push(cond('account_set_id', 'equal', params.account_set_id));
  }

  table.Filter = and(...conditions);
  table.Fields = [
    { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'adapter_code', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'adapter_name', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_system_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_biz_code', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'standard_object_code', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'finance_object_code', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'account_set_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'status', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'version_no', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
  ];

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: {
        page: params.page || 20,
        index: params.pageNo || 1,
      },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res);
  return extractListAndTotal(res);
}

export async function createBusinessAdapter(data: FinanceBusinessAdapterApi.Row) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  const payload = {
    ...data,
    rowid: data.rowid || generateUUID(),
    lingma_sys_is_delete: 0,
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([payload], [], []), {
    headers: table.getRequestHeader(),
  });
}

export async function updateBusinessAdapter(
  data: FinanceBusinessAdapterApi.Row & { rowid: string },
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  return requestClient.post(table.saveUrl, table.getSaveParam([], [data], []), {
    headers: table.getRequestHeader(),
  });
}

export async function deleteBusinessAdapter(rowid: string) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [], [{ rowid, lingma_sys_is_delete: 1 }]),
    { headers: table.getRequestHeader() },
  );
}
