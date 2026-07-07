import { generateUUID } from '@vben/utils';

import {
  and,
  buildTable,
  cond,
  extractListAndTotal,
  requestClient,
} from './_shared';

export namespace FinanceBusinessFieldMappingApi {
  export interface Row {
    rowid?: string;
    adapter_id?: string;
    source_field?: string;
    standard_field?: string;
    finance_field?: string;
    adapt_rule?: string;
    default_value?: string;
    is_required?: number;
    validate_rule?: string;
    sort_no?: number;
    remark?: string;
    lingma_sys_is_delete?: number;
  }
}

const TABLE_NAME = 'fbsa_field_mapping';
const PRIMARY_KEY = 'rowid';

export async function getBusinessFieldMappingList(adapterId: string) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('adapter_id', 'equal', adapterId),
  );
  table.Fields = [
    { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'adapter_id', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_field', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'standard_field', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'finance_field', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'adapt_rule', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'default_value', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'is_required', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'validate_rule', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'sort_no', AsName: '', OrderType: 'ascending', Order: 1, Group: 0 },
    { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
  ];

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 500, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res);
  const { list } = extractListAndTotal(res);
  return list;
}

export async function saveBusinessFieldMappings(
  adapterId: string,
  rows: FinanceBusinessFieldMappingApi.Row[],
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  const currentList = await getBusinessFieldMappingList(adapterId);
  table.items = currentList;

  const currentMap = new Map(currentList.map((item: any) => [String(item.rowid), item]));
  const nextIds = new Set<string>();
  const added: any[] = [];
  const changed: any[] = [];
  const deleted: any[] = [];

  for (const item of rows) {
    const rowid = String(item.rowid || generateUUID());
    nextIds.add(rowid);
    const payload = {
      ...item,
      rowid,
      adapter_id: adapterId,
      lingma_sys_is_delete: 0,
    };
    if (currentMap.has(rowid)) {
      changed.push(payload);
    } else {
      added.push(payload);
    }
  }

  for (const item of currentList as any[]) {
    const rowid = String(item.rowid || '');
    if (rowid && !nextIds.has(rowid)) {
      deleted.push({ rowid, lingma_sys_is_delete: 1 });
    }
  }

  return requestClient.post(table.saveUrl, table.getSaveParam(added, changed, deleted), {
    headers: table.getRequestHeader(),
  });
}
