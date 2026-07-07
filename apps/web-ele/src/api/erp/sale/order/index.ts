import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import {
  addSaleOrderItems,
  deleteSaleOrderItems,
  querySaleOrderItems,
  updateSaleOrderItems,
} from './orderItems';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpSaleOrderApi {
  export interface SaleOrder {
    id?: string;
    no?: string;
    customer_id?: number;
    sale_user_id?: string;
    warehouse_outbound_id?: string;
    order_time?: Date | string;
    total_count?: number;
    total_product_price?: number;
    discount_percent?: number;
    discount_price?: number;
    total_tax_price?: number;
    total_price?: number;
    deposit_price?: number;
    status?: number;
    out_count?: number;
    return_count?: number;
    return_status?: number;
    account_id?: number;
    remark?: string;
    file_url?: string;
    create_time?: Date | string;
    creator?: string;
    update_time?: Date | string;
    updater?: string;
    tenant_id?: number;
    deleted?: number;
    items?: SaleOrderItem[];
    rowid?: string;
  }

  export interface SaleOrderItem {
    seq?: string;
    id?: string;
    order_id?: string;
    product_id?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_id?: number | string;
    product_unit_name?: string;
    product_price?: number;
    total_product_price?: number;
    count?: number;
    total_price?: number;
    tax_percent?: number;
    tax_price?: number;
    total_tax_price?: number;
    warehouse_id?: string;
    remark?: string;
    stock_count?: number;
    out_count?: number;
    return_count?: number;
    rowid?: string;
  }
}

const SALE_ORDER_MODEL_ID = '58AE739462369587E5B51B79D4C57A05';
const SALE_ORDER_TABLE = 'erp_sale_order';
const SALE_ORDER_DB = 'LMBill';
const SALE_ORDER_PK = 'id';

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeSaleOrderItemForSave(item: any, orderId?: string) {
  const count = toNumber(item?.count);
  const taxPercent = toNumber(item?.tax_percent);
  const taxPrice = toNumber(item?.tax_price);
  let totalPrice = toNumber(item?.total_price);
  if (!(totalPrice > 0)) {
    const totalProductPrice = toNumber(item?.total_product_price);
    totalPrice = totalProductPrice + taxPrice;
  }
  return {
    id: item?.id,
    order_id: item?.order_id ?? orderId,
    product_id: item?.product_id,
    product_unit_id: item?.product_unit_id,
    count,
    total_price: totalPrice,
    tax_percent: taxPercent,
    tax_price: taxPrice,
    warehouse_id: item?.warehouse_id,
    remark: item?.remark,
    out_count: item?.out_count,
    return_count: item?.return_count,
  };
}

export async function getSaleOrderPage(params: any) {
  const pageNo = params.pageNo || params.index || 1;
  const pageSize = params.page || params.size || 10;
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  if (params.no)
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(saleOrderTable.Filter, cond('no', 'contains', params.no))
      : cond('no', 'contains', params.no);
  if (params.customer_id)
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(
          saleOrderTable.Filter,
          cond('customer_id', 'equal', params.customer_id),
        )
      : cond('customer_id', 'equal', params.customer_id);
  if (params.status !== undefined && params.status !== null && params.status !== '')
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(saleOrderTable.Filter, cond('status', 'equal', params.status))
      : cond('status', 'equal', params.status);
  if (params.statusNotEqual !== undefined && params.statusNotEqual !== null && params.statusNotEqual !== '')
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(saleOrderTable.Filter, cond('status', 'notequal', params.statusNotEqual))
      : cond('status', 'notequal', params.statusNotEqual);
  if (
    params.order_time &&
    Array.isArray(params.order_time) &&
    params.order_time.length === 2
  ) {
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(
          saleOrderTable.Filter,
          cond('order_time', 'greaterthanorequal', params.order_time[0]),
        )
      : cond('order_time', 'greaterthanorequal', params.order_time[0]);
    saleOrderTable.Filter = saleOrderTable.Filter
      ? and(
          saleOrderTable.Filter,
          cond('order_time', 'lessthanorequal', params.order_time[1]),
        )
      : cond('order_time', 'lessthanorequal', params.order_time[1]);
  }
  const queryParam: any = {
    Table: [saleOrderTable],
    PageParam: { page: pageSize, index: pageNo },
  };
  const resQuery = await requestClient.post(saleOrderTable.queryUrl, queryParam, {
    headers: saleOrderTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  saleOrderTable.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);
  const orderData = new clientData();
  orderData.dataTable = saleOrderTable;
  orderData.list = items;
  orderData.total = total;
  return orderData;
}

export async function getSaleOrder(id: string) {
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  saleOrderTable.Filter = cond(SALE_ORDER_PK, 'equal', id);
  const queryParam = { Table: [saleOrderTable], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(saleOrderTable.queryUrl, queryParam, {
    headers: saleOrderTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  saleOrderTable.execQueryResult(resQuery.data);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const order = (resultData.Items && resultData.Items[0]) || null;
  if (order) {
    const queryId = order.id || order.rowid;
    const resItems = await querySaleOrderItems({ order_id: queryId });
    order.items = resItems.list || [];
  }
  return order;
}

export async function createSaleOrder(data: ErpSaleOrderApi.SaleOrder) {
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  const itemData = Array.isArray(data?.items) ? data.items : [];
  const uid = generateUUID();
  const newItems = itemData.map((item: any) => sanitizeSaleOrderItemForSave(item, uid));
  if (newItems.length > 0) await addSaleOrderItems(newItems);
  const { items: _items, ...rest } = data;
  const pureData = { ...rest, id: uid };
  const saveParam = saleOrderTable.getSaveParam([pureData], [], []);
  const res = await requestClient.post(saleOrderTable.saveUrl, saveParam, {
    headers: saleOrderTable.getRequestHeader(),
  });
  let orderNo = data.no;
  if (res) {
    try {
      const codeRes = await getCodeString(
        uid,
        '2E39D77166AB289221DD9EF19696C6A6',
        saleOrderTable.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        orderNo = codeRes.Message;
        await updateSaleOrder({ id: uid, no: codeRes.Message });
      } else {
        await deleteSaleOrder(uid);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deleteSaleOrder(uid);
      throw error;
    }
  }
  return { ...(res as any), id: uid, no: orderNo } as any;
}

export async function updateSaleOrder(data: ErpSaleOrderApi.SaleOrder) {
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  const hasItemsField = Object.prototype.hasOwnProperty.call(data, 'items');
  const itemData = Array.isArray(data?.items) ? data.items : [];
  const orderId = String(data?.id || data?.rowid || '');

  if (hasItemsField && orderId) {
    const existingRes = await querySaleOrderItems({ order_id: orderId });
    const existingItems = Array.isArray(existingRes.list) ? existingRes.list : [];
    const normalizedItems = itemData.map((item) =>
      sanitizeSaleOrderItemForSave(item, orderId),
    );
    const createList = normalizedItems
      .filter((item) => !item.id)
      .map((item) => ({ ...item, id: undefined, order_id: orderId }));
    const updateList = normalizedItems.filter((item) => !!item.id);

    const existingIdSet = new Set(
      existingItems.map((item: any) => String(item?.id || '')).filter(Boolean),
    );
    const currentIdSet = new Set(
      updateList.map((item) => String(item.id || '')).filter(Boolean),
    );
    const deleteIds = [...existingIdSet].filter((id) => !currentIdSet.has(id));

    if (createList.length > 0) {
      await addSaleOrderItems(createList);
    }
    if (updateList.length > 0) {
      await updateSaleOrderItems(updateList);
    }
    if (deleteIds.length > 0) {
      await deleteSaleOrderItems(deleteIds);
    }
  }

  const {
    items: _items,
    id,
    no,
    customer_id,
    sale_user_id,
    warehouse_outbound_id,
    order_time,
    total_count,
    total_product_price,
    discount_percent,
    discount_price,
    total_tax_price,
    total_price,
    deposit_price,
    status,
    out_count,
    return_count,
    return_status,
    account_id,
    remark,
    file_url,
    create_time,
    creator,
    update_time,
    updater,
    tenant_id,
    deleted,
    rowid,
  } = data;
  const pureData = {
    id,
    no,
    customer_id,
    sale_user_id,
    warehouse_outbound_id,
    order_time,
    total_count,
    total_product_price,
    discount_percent,
    discount_price,
    total_tax_price,
    total_price,
    deposit_price,
    status,
    out_count,
    return_count,
    return_status,
    account_id,
    remark,
    file_url,
    create_time,
    creator,
    update_time,
    updater,
    tenant_id,
    deleted,
    rowid,
  };
  const saveParam = saleOrderTable.getSaveParam([], [pureData], []);
  return await requestClient.post(saleOrderTable.saveUrl, saveParam, {
    headers: saleOrderTable.getRequestHeader(),
  });
}

export async function updateSaleOrderStatus(id: string, status: number) {
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  const saveParam = saleOrderTable.getSaveParam(
    [],
    [{ [SALE_ORDER_PK]: id, status }],
    [],
  );
  return await requestClient.post(saleOrderTable.saveUrl, saveParam, {
    headers: saleOrderTable.getRequestHeader(),
  });
}

export async function deleteSaleOrder(ids: string | string[]) {
  const saleOrderTable = createFinanceDataTable(
    SALE_ORDER_MODEL_ID,
    SALE_ORDER_TABLE,
    SALE_ORDER_DB,
    SALE_ORDER_PK,
  );
  let delArr: any[] = [];
  if (Array.isArray(ids)) delArr = ids.map((id) => ({ [SALE_ORDER_PK]: id }));
  else if (typeof ids === 'string')
    delArr = ids.split(',').map((id) => ({ [SALE_ORDER_PK]: id }));
  const saveParam = saleOrderTable.getSaveParam([], [], delArr);
  return await requestClient.post(saleOrderTable.saveUrl, saveParam, {
    headers: saleOrderTable.getRequestHeader(),
  });
}

export function exportSaleOrder(params: any, encodingId?: string) {
  return exportExcelByConfig({
    formId: SALE_ORDER_MODEL_ID,
    tableName: SALE_ORDER_TABLE,
    dbName: SALE_ORDER_DB,
    primaryKey: SALE_ORDER_PK,
    fileName: '销售订单',
    encodingId: encodingId ?? '',
    extraData: params,
  });
}
