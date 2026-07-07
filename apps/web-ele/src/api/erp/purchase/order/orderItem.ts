import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_purchase_order_items';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
// 暂时使用与主表相同的 formId，如果不同请修改
export const PURCHASE_ORDER_ITEM_FORM_KEY = '9C137C5AC260381DF57C6D1B40C8ABF5';

export interface PurchaseOrderItem {
  id?: number | string;
  order_id?: number | string;
  product_id?: number | string;
  product_unit_id?: number | string;
  product_price?: number;
  count?: number;
  total_price?: number;
  tax_percent?: number;
  tax_price?: number;
  remark?: string;
  in_count?: number;
  return_count?: number;
  creator?: string;
  create_time?: string;
  updater?: string;
  update_time?: string;
  deleted?: boolean;
}

function createPurchaseOrderItemTable(
  formKey = PURCHASE_ORDER_ITEM_FORM_KEY,
) {
  return createFinanceDataTable(formKey, TABLE_NAME, DB_NAME, PRIMARY_KEY);
}

/** 查询采购订单项分页 */
export async function getPurchaseOrderItemPage(
  params: any,
  formKey = PURCHASE_ORDER_ITEM_FORM_KEY,
) {
  const table = createPurchaseOrderItemTable(formKey);
  const conditions = [];
  const orderId = params.order_id ?? params.orderId;

  if (orderId) {
    conditions.push(cond('order_id', 'equal', orderId));
  }
  if (params.product_id) {
    conditions.push(cond('product_id', 'equal', params.product_id));
  }

  if (conditions.length > 0) {
    table.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0,
      index: 1,
    },
  };

  if (params.page && params.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const returnData = new clientData();
  returnData.dataTable = table;
  const dataList = resQuery.data.Result.data;

  if (params.page && params.pageNo) {
    returnData.list = dataList.Items;
    returnData.total = dataList.Count;
  } else if (dataList.Items && dataList.Items.length > 0) {
    returnData.list = dataList.Items;
  } else {
    returnData.list = [];
  }

  return returnData;
}

/** 新增采购订单项 */
export async function createPurchaseOrderItem(
  data: PurchaseOrderItem | PurchaseOrderItem[],
  formKey = PURCHASE_ORDER_ITEM_FORM_KEY,
) {
  const table = createPurchaseOrderItemTable(formKey);
  const items = Array.isArray(data) ? data : [data];

  const saveParam = table.getSaveParam(items, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改采购订单项 */
export async function updatePurchaseOrderItem(
  data: PurchaseOrderItem | PurchaseOrderItem[],
  formKey = PURCHASE_ORDER_ITEM_FORM_KEY,
) {
  const table = createPurchaseOrderItemTable(formKey);
  const updateList = Array.isArray(data) ? data : [data];

  const saveParam = table.getSaveParam([], updateList, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 批量删除采购订单项 */
export async function deletePurchaseOrderItems(
  ids: string | string[],
  formKey = PURCHASE_ORDER_ITEM_FORM_KEY,
) {
  const table = createPurchaseOrderItemTable(formKey);
  let deleteList: any[] = [];
  if (typeof ids === 'string') {
    const idArray = ids.split(',');
    deleteList = idArray.map((id) => ({ [PRIMARY_KEY]: id }));
  } else if (Array.isArray(ids)) {
    deleteList = ids.map((id) => ({ [PRIMARY_KEY]: id }));
  }

  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
