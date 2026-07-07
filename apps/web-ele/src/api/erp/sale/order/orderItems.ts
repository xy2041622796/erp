import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

// 保持与 erp_sale_order 相同的 Model ID，或者如果有独立的 Items Model ID 请替换
const DATA_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const TABLE_NAME = 'erp_sale_order_items';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function enrichSaleOrderItem(item: any) {
  const count = toNumber(item?.count);
  const taxPrice = toNumber(item?.tax_price);
  const totalPrice = toNumber(item?.total_price);
  const totalProductPrice = totalPrice - taxPrice;
  const productPrice = count > 0 ? totalProductPrice / count : 0;

  return {
    ...item,
    total_product_price: totalProductPrice,
    product_price: productPrice,
    total_tax_price: totalPrice,
  };
}

/** 查询销售订单明细 */
export async function querySaleOrderItems(params: { order_id: string }) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);

  // 注意：这里假设关联字段是 order_id
  table.Filter = and(cond('order_id', 'equal', params.order_id));

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
  // 兼容 Result.data.Items 或 Result.Items
  const items = resData?.Items || resQuery.data?.Result?.Items || [];
  returnData.list = Array.isArray(items)
    ? items.map((item: any) => enrichSaleOrderItem(item))
    : [];
  return returnData;
}

/** 新增销售订单明细（批量） */
export async function addSaleOrderItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新销售订单明细（批量） */
export async function updateSaleOrderItems(list: any[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除销售订单明细（批量） */
export async function deleteSaleOrderItems(ids: string | string[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const deleteList = (Array.isArray(ids) ? ids : ids.split(','))
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .map((id) => ({ [PRIMARY_KEY]: id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
