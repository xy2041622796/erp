import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

const ClientData = clientData;
const DATA_MODEL_ID = '473DEA3E76D1BC26D879B903CDE36678';
const TABLE_NAME = 'erp_stock_check_item';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';

function getTable() {
  return createFinanceDataTableCurrent(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function enrichItem(item: any) {
  return {
    ...item,
    stock_count: toNumber(item?.stock_count),
    actual_count:
      item?.actual_count === undefined ||
      item?.actual_count === null ||
      item?.actual_count === ''
        ? undefined
        : toNumber(item?.actual_count),
    count: toNumber(item?.count),
    product_price: toNumber(item?.product_price),
    total_price: toNumber(item?.total_price),
  };
}

export async function queryStockCheckItems(params: { check_id: string }) {
  const table = getTable();
  table.Filter = and(cond('check_id', 'equal', params.check_id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data?.Result?.data;
  const returnData = new ClientData();
  returnData.dataTable = table;
  returnData.list = Array.isArray(resData?.Items)
    ? resData.Items.map((item: any) => enrichItem(item))
    : [];
  return returnData;
}

export async function addStockCheckItems(list: any[]) {
  const table = getTable();
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateStockCheckItems(list: any[]) {
  const table = getTable();
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteStockCheckItems(
  ids: Array<number | string> | string,
) {
  const table = getTable();
  const deleteList = (Array.isArray(ids) ? ids : String(ids).split(','))
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .map((id) => ({ [PRIMARY_KEY]: id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
