import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const DATA_MODEL_ID = '925044BFD709A2A1937EE885945B01C3';
const TABLE_NAME = 'erp_stock_move_item';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function enrichStockMoveItem(item: any) {
  const count = toNumber(item?.count);
  const productPrice = toNumber(item?.product_price);
  const totalPrice =
    toNumber(item?.total_price) ||
    (count > 0 && productPrice > 0 ? count * productPrice : 0);

  return {
    ...item,
    total_price: totalPrice,
  };
}

/** 查询库存调拨明细 */
export async function queryStockMoveItems(params: { move_id: number | string }) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Filter = and(cond('move_id', 'equal', params.move_id));

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
  const items = resData?.Items || resQuery.data?.Result?.Items || [];
  returnData.list = Array.isArray(items)
    ? items.map((item: any) => enrichStockMoveItem(item))
    : [];
  return returnData;
}

/** 新增库存调拨明细（批量） */
export async function addStockMoveItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新库存调拨明细（批量） */
export async function updateStockMoveItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除库存调拨明细（批量） */
export async function deleteStockMoveItems(ids: Array<number | string> | string) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const deleteList = (Array.isArray(ids) ? ids : String(ids).split(','))
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .map((id) => ({ [PRIMARY_KEY]: id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
