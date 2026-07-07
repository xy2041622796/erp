import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { getSaleOrder, updateSaleOrder } from '#/api/erp/sale/order';
import {
  and,
  clientData as ClientData,
  cond,
  DataTable,
} from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import { querySaleOrderItems, updateSaleOrderItems } from '../order/orderItems';
import {
  addSaleReturnItems,
  querySaleReturnItems,
  updateSaleReturnItems,
} from './returnItems';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_sale_return';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
const DATA_MODEL_ID = '900EB04B14073B3FBF036AA1B5AC62E1';

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export namespace ErpSaleReturnApi {
  export interface SaleReturn {
    id?: string;
    no?: string;
    customer_id?: number;
    account_id?: number;
    return_time?: Date | string;
    order_id?: number;
    order_no?: string;
    total_count?: number;
    total_price?: number;
    refund_price?: number;
    invoiced_amount?: number;
    invoice_qty?: number;
    uninvoice_qty?: number;
    uninvoice_amount?: number;
    invoice_status?: number;
    status?: number;
    remark?: string;
    discount_percent?: number;
    discount_price?: number;
    other_price?: number;
    total_product_price?: number;
    tax_price?: number;
    sale_user_id?: string;
    total_tax_price?: number;
    items?: SaleReturnItem[];
  }

  export interface SaleReturnItem {
    id?: string;
    return_id?: string;
    order_item_id?: string;
    warehouse_id?: string;
    product_id?: string;
    product_unit_id?: string;
    product_price?: number;
    count?: number;
    total_price?: number;
    tax_percent?: number;
    tax_price?: number;
    remark?: string;
    invoice_qty?: number;
    product_name?: string;
    product_bar_code?: string;
    product_unit_name?: string;
    total_product_price?: number;
    stock_count?: number;
  }
}

export async function updateSaleReturnInvoiceSummary(id: string, payload: { invoice_qty?: number; invoice_status?: number; invoiced_amount?: number; uninvoice_amount?: number; uninvoice_qty?: number; }) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const updateData = { id, ...payload };
  const saveParam = table.getSaveParam([], [updateData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function getSaleReturnPage(params: any) {
  const pageNo = params.pageNo || params.index || 1;
  const pageSize = params.page || params.size || 10;
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const filterConds: any[] = [];
  if (params.no) filterConds.push(cond('no', 'contains', params.no));
  if (params.customer_id) filterConds.push(cond('customer_id', 'equal', params.customer_id));
  if (params.status !== undefined && params.status !== null && params.status !== '') filterConds.push(cond('status', 'equal', params.status));
  if (params.remark) filterConds.push(cond('remark', 'contains', params.remark));
  if (params.return_time && Array.isArray(params.return_time) && params.return_time.length === 2) {
    filterConds.push(cond('return_time', 'greaterthanorequal', params.return_time[0]));
    filterConds.push(cond('return_time', 'lessthanorequal', params.return_time[1]));
  }
  if (filterConds.length > 0) table.Filter = and(...filterConds);
  const queryParam: any = { Table: [table], PageParam: { page: pageSize, index: pageNo } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new ClientData();
  returnData.dataTable = table;
  returnData.list = resData.Items || [];
  returnData.total = resData.Count || 0;
  return returnData;
}

export async function getSaleReturn(id: string) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data?.Items?.[0] || resQuery.data?.Result.Items?.[0] || resQuery.data.Items?.[0];
  const resQueryItem = await querySaleReturnItems({ return_id: id });
  resultData.items = resQueryItem.list || [];
  return resultData;
}

export async function createSaleReturn(data: ErpSaleReturnApi.SaleReturn) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const itemData = Array.isArray(data?.items) ? data.items : [];
  const uid = generateUUID();
  const newItems = itemData.map((item: any) => ({
    ...item,
    id: item?.id ?? generateUUID(),
    return_id: uid,
    deleted: item?.deleted ?? 0,
    tenant_id: item?.tenant_id ?? 0,
    product_price: toNumber(item?.product_price),
    count: toNumber(item?.count),
    total_price: toNumber(item?.total_price),
  }));
  if (newItems.length > 0) await addSaleReturnItems(newItems);

  const { no, customer_id, return_time, total_count, order_no, total_price, discount_percent, discount_price, status, remark, total_tax_price, other_price, account_id, order_id, total_product_price, sale_user_id } = data;
  const pureData: any = { id: uid, no, customer_id, return_time, total_count, order_no, total_price, discount_percent, discount_price, status, remark, total_tax_price, other_price, account_id, order_id, total_product_price, sale_user_id };
  const saveParam = table.getSaveParam([pureData], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
  let returnNo = no;
  if (res) {
    try {
      const codeRes = await getCodeString(uid, 'DA797D4CED21483D9DFB92BFA9FE144B', table.getRequestHeader());
      if (codeRes.Code === 200 && codeRes.Message) {
        returnNo = codeRes.Message;
        await updateSaleReturn({ id: uid, no: codeRes.Message });
      } else {
        await deleteSaleReturn([uid]);
        throw new Error(codeRes.Message || '获取编码失败');
      }
    } catch (error) {
      await deleteSaleReturn([uid]);
      throw error;
    }
  }
  return { ...(res as any), id: uid, no: returnNo } as any;
}

export async function updateSaleReturn(data: ErpSaleReturnApi.SaleReturn) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const itemData = Array.isArray(data?.items) ? data.items : [];
  if (itemData.length > 0) {
    const newItems = itemData.map((item) => {
      const { id, return_id, order_item_id, warehouse_id, product_id, product_unit_id, product_price, count, total_price, tax_percent, tax_price, remark } = item;
      return { id, return_id, order_item_id, warehouse_id, product_id, product_unit_id, product_price, count, total_price, tax_percent, tax_price, remark };
    });
    await updateSaleReturnItems(newItems);
  }
  const { id, no, customer_id, return_time, total_count, total_price, discount_percent, discount_price, status, remark, total_tax_price, other_price, account_id, order_id, order_no, total_product_price, sale_user_id, refund_price } = data;
  const pureData = { id, no, customer_id, return_time, total_count, total_price, discount_percent, discount_price, status, remark, total_tax_price, other_price, account_id, order_id, order_no, total_product_price, sale_user_id, refund_price };
  const saveParam = table.getSaveParam([], [pureData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSaleReturnStatus(id: string, { status, invoice_status }: { invoice_status: number; status: number }) {
  const returnId = String(id);
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const doc = await getSaleReturn(returnId);
  if (!doc) throw new Error('未找到该销售退货单');
  const currentStatus = Number((doc as any).status);
  if (Number(status) === 10 && currentStatus !== 20) throw new Error('该退货单未审核，无需反审核');

  const itemRows = Array.isArray((doc as any).items) ? (doc as any).items : [];
  const orderId = (doc as any)?.order_id;
  if (orderId && itemRows.length > 0) {
    const { list: orderItems } = await querySaleOrderItems({ order_id: String(orderId) });
    const orderItemsList = Array.isArray(orderItems) ? orderItems : [];
    const orderItemChanged: any[] = [];
    for (const returnItem of itemRows) {
      const orderItemId = returnItem?.order_item_id;
      if (!orderItemId) continue;
      const targetOrderItem = orderItemsList.find((oi: any) => oi.id === orderItemId || oi.rowid === orderItemId);
      if (!targetOrderItem) continue;
      const currentReturnCount = toNumber(targetOrderItem.return_count);
      const delta = toNumber(returnItem?.count);
      if (!(delta > 0)) continue;
      const newReturnCount = Number(status) === 20 ? currentReturnCount + delta : currentReturnCount - delta;
      if (Number(status) === 10 && newReturnCount < 0) throw new Error('反审核失败：销售订单项(' + orderItemId + ') 当前已退货' + currentReturnCount + '，需回退' + delta);
      const pk = targetOrderItem.id ?? targetOrderItem.rowid;
      if (!pk) continue;
      orderItemChanged.push({ id: pk, return_count: newReturnCount });
    }
    if (orderItemChanged.length > 0) {
      const merged = new Map<string, any>();
      for (const u of orderItemChanged) merged.set(String(u.id), u);
      await updateSaleOrderItems([...merged.values()]);
    }
    const latestOrder = await getSaleOrder(String(orderId));
    const latestOrderItems = Array.isArray((latestOrder && latestOrder.items)) ? latestOrder.items : [];
    const totalReturnCount = latestOrderItems.reduce((sum: number, item: any) => sum + Number(item.return_count || 0), 0);
    await updateSaleOrder({ id: String(orderId), return_count: totalReturnCount });
  }

  const updateData = { id: returnId, status, invoice_status };
  const saveParam = table.getSaveParam([], [updateData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function deleteSaleReturn(ids: string[]) {
  const table = createFinanceDataTable(DATA_MODEL_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const deleteList = ids.map((id) => ({ id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export function exportSaleReturn(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({ formId: DATA_MODEL_ID, tableName: TABLE_NAME, dbName: DB_NAME, primaryKey: PRIMARY_KEY, fileName: '销售退货', encodingId, extraData: params });
  }
  return requestClient.download('/erp/sale-return/export-excel', { params });
}
