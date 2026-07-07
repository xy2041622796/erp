// 类型定义
import type { ErpPurchaseInApi } from '#/api/erp/purchase/in';

import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

// 数据模型ID、表名、数据库名、主键字段
const MODEL_ID = 'F7D0E8BC3570CBF853F6B1E6AB1085CA'; // 需替换为实际ID
const TABLE_NAME = 'erp_purchase_in_items';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';

// 查询方法
export async function queryPurchaseInItems(params: any) {
  const table = createFinanceDataTable(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);

  // 构建查询条件
  let filter = null;
  if (params) {
    const conds = [];
    if (params.in_id) conds.push(cond('in_id', 'equal', params.in_id));
    if (params.product_id)
      conds.push(cond('product_id', 'equal', params.product_id));
    if (params.warehouse_id)
      conds.push(cond('warehouse_id', 'equal', params.warehouse_id));
    // ...可继续添加其他条件
    if (conds.length > 0) filter = and(...conds);
  }
  if (filter) table.Filter = filter;

  // 分页参数
  const isPaged = params && params.page && params.pageNo;
  const queryParam = {
    Table: [table],
    PageParam: isPaged
      ? { page: params.page, index: params.pageNo }
      : { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  if (isPaged) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  } else if (resData.Items.length > 0) {
    returnData.list = resData.Items;
  }
  return returnData;
}

// 新增采购入库项
export async function addPurchaseInItems(
  addList: ErpPurchaseInApi.PurchaseInItem[],
): Promise<any> {
  const table = createFinanceDataTable(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);
  const saveParam = table.getSaveParam(addList, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 编辑采购入库项
export async function updatePurchaseInItems(
  updateList: ErpPurchaseInApi.PurchaseInItem[],
): Promise<any> {
  const table = createFinanceDataTable(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);
  const saveParam = table.getSaveParam([], updateList, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 删除采购入库项
export async function deletePurchaseInItems(
  deleteList: ErpPurchaseInApi.PurchaseInItem[],
): Promise<any> {
  const table = createFinanceDataTable(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}


/**
 * 查询一条采购入库明细权限模板。
 * 新增采购入库时没有 in_id 和明细行，不能从当前明细判断字段权限；
 * 这里显式查询明细项表，读取后端随行返回的 lingma_sys_params 作为金额列权限来源。
 */
export async function getPurchaseInItemPermissionTemplate() {
  const table = createFinanceDataTable(MODEL_ID, TABLE_NAME, DB_NAME, PK_FIELD);
  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return Array.isArray(resData?.Items) ? (resData.Items[0] || null) : null;
}
