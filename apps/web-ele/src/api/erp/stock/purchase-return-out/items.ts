import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import { PURCHASE_RETURN_OUT_FORM_KEY } from './index';

const TABLE_NAME = 'erp_purchase_return_out_items';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';

function getTable() {
  return createFinanceDataTable(
    PURCHASE_RETURN_OUT_FORM_KEY,
    TABLE_NAME,
    DB_NAME,
    PK_FIELD,
  );
}

export async function queryPurchaseReturnOutItems(params: any) {
  const table = getTable();
  const conds = [] as any[];
  if (params.out_id) conds.push(cond('out_id', 'equal', params.out_id));
  if (params.product_id) conds.push(cond('product_id', 'equal', params.product_id));
  if (conds.length > 0) table.Filter = and(...conds);
  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items || [];
  return returnData;
}

export async function addPurchaseReturnOutItems(list: any[]) {
  const table = getTable();
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updatePurchaseReturnOutItems(list: any[]) {
  const table = getTable();
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deletePurchaseReturnOutItems(ids: string[]) {
  if (!ids.length) return;
  const table = getTable();
  const saveParam = table.getSaveParam(
    [],
    [],
    ids.map((id) => ({ id })),
  );
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
