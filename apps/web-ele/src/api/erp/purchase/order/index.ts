import type { PageParam } from '@vben/request';

import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { getStoredAccountSetId } from '#/utils/accountSet';

import {
  createPurchaseOrderItem,
  deletePurchaseOrderItems,
  getPurchaseOrderItemPage,
  updatePurchaseOrderItem,
} from './orderItem';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_purchase_order';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
export const PURCHASE_ORDER_FORM_KEY = '9C137C5AC260381DF57C6D1B40C8ABF5';

const PRODUCT_TABLE_NAME = 'Bil_Product_Info';
const PRODUCT_PRIMARY_KEY = 'row_id';

function createPurchaseOrderTable(formKey = PURCHASE_ORDER_FORM_KEY) {
  return createFinanceDataTable(formKey, TABLE_NAME, DB_NAME, PRIMARY_KEY);
}

function createPurchaseOrderProductTable(formKey = PURCHASE_ORDER_FORM_KEY) {
  return createFinanceDataTable(
    formKey,
    PRODUCT_TABLE_NAME,
    DB_NAME,
    PRODUCT_PRIMARY_KEY,
  );
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizePurchaseProductOption(product: any): ErpPurchaseOrderApi.PurchaseOrderProductOption {
  const rowid = String(product?.rowid ?? product?.row_id ?? product?.ROWID ?? product?.id ?? '').trim();
  return {
    ...product,
    rowid: rowid || product?.rowid,
    row_id: product?.row_id ?? rowid,
    id: product?.id ?? rowid,
    product_name: product?.product_name ?? product?.name ?? product?.ProductName,
  };
}

export async function getPurchaseOrderProductsByIds(
  productIds: string[],
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const ids = Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return [];

  const table = createPurchaseOrderProductTable(formKey);
  const productFilters = ids.map((id) => cond(PRODUCT_PRIMARY_KEY, 'equal', id));
  const accountSetId = getStoredAccountSetId();
  table.Filter = accountSetId
    ? and(or(...productFilters), cond('account_set_id', 'equal', accountSetId))
    : or(...productFilters);

  const queryParam: any = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return Array.isArray(resultData?.Items)
    ? resultData.Items.map((item: any) => normalizePurchaseProductOption(item))
    : [];
}

function sanitizePurchaseOrderItemForSave(item: any, orderId?: string) {
  return {
    id: item?.id,
    order_id: item?.order_id ?? orderId,
    product_id: item?.product_id,
    product_unit_id: item?.product_unit_id || item?.product_unit_name || '',
    product_price: toNumber(item?.product_price),
    total_product_price: toNumber(item?.total_product_price),
    count: toNumber(item?.count),
    total_price: toNumber(item?.total_price),
    tax_percent: toNumber(item?.tax_percent),
    tax_price: toNumber(item?.tax_price),
    warehouse_id: item?.warehouse_id,
    remark: item?.remark,
    in_count: item?.in_count,
    return_count: item?.return_count,
  };
}

export namespace ErpPurchaseOrderApi {
  export interface PurchaseOrder {
    id?: string;
    no?: string;
    supplier_id?: number;
    supplier_name?: string;
    order_time?: Date | string;
    total_count?: number;
    total_price?: number;
    total_product_price?: number;
    discount_percent?: number;
    discount_price?: number;
    deposit_price?: number;
    account_id?: number;
    status?: number;
    remark?: string;
    file_url?: string;
    in_count?: number;
    count?: number;
    return_count?: number;
    in_status?: number;
    return_status?: number;
    product_names?: string;
    creator_name?: string;
    create_time?: Date;
    items?: PurchaseOrderItem[];
    createuser?: string;
  }

  export interface PurchaseOrderItem {
    seq?: string;
    id?: string;
    order_id?: number;
    product_id?: number | string;
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
  }

  export interface PurchaseOrderProductOption {
    rowid?: string;
    row_id?: string;
    id?: string;
    product_code?: string;
    product_name?: string;
    barcode?: string;
    unit?: string;
    product_category_id?: string;
    product_type?: string;
    purchase_price?: number;
    purchase_tax?: string;
    default_warehouse_id?: string;
    defaultWarehouseId?: string;
    is_used_purchase?: number;
    account_set_id?: string;
  }
}

export async function getPurchaseOrderProductSimpleList(
  params: any = {},
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderProductTable(formKey);
  const conditions: any[] = [];

  if (params.product_name || params.name) {
    conditions.push(
      cond('product_name', 'contains', params.product_name || params.name),
    );
  }
  if (params.product_code || params.code) {
    conditions.push(
      cond('product_code', 'contains', params.product_code || params.code),
    );
  }
  if (params.barcode || params.bar_code) {
    conditions.push(cond('barcode', 'contains', params.barcode || params.bar_code));
  }
  if (params.product_category_id) {
    conditions.push(cond('product_category_id', 'equal', params.product_category_id));
  }

  const accountSetId = params.account_set_id || getStoredAccountSetId();
  if (accountSetId) {
    conditions.push(cond('account_set_id', 'equal', accountSetId));
  }


  if (conditions.length > 0) table.Filter = and(...conditions);

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page ?? 0,
      index: params.pageNo ?? 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  return Array.isArray(resultData?.Items)
    ? resultData.Items.map((item: any) => normalizePurchaseProductOption(item))
    : [];
}

export async function getPurchaseOrderPage(
  params: any & PageParam,
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderTable(formKey);
  const conditions = [];

  if (params.no) conditions.push(cond('no', 'contains', params.no));
  if (params.supplier_id)
    conditions.push(cond('supplier_id', 'equal', params.supplier_id));
  if (params.status !== undefined && params.status !== null && params.status !== '')
    conditions.push(cond('status', 'equal', params.status));
  if (params.statusNotEqual !== undefined && params.statusNotEqual !== null && params.statusNotEqual !== '')
    conditions.push(cond('status', 'notequal', params.statusNotEqual));
  if (params.remark) conditions.push(cond('remark', 'contains', params.remark));
  const inStatus = params.inStatus ?? params.in_status;
  if (inStatus !== undefined && inStatus !== null && inStatus !== '')
    conditions.push(cond('in_status', 'equal', inStatus));
  const returnStatus = params.returnStatus ?? params.return_status;
  if (returnStatus !== undefined && returnStatus !== null && returnStatus !== '')
    conditions.push(cond('return_status', 'equal', returnStatus));
  if (params.creator) conditions.push(cond('creator', 'equal', params.creator));
  if (params.product_id)
    conditions.push(cond('product_id', 'equal', params.product_id));
  const orderTime = params.orderTime ?? params.order_time;
  if (Array.isArray(orderTime) && orderTime.length === 2) {
    conditions.push(cond('order_time', 'greaterthanorequal', orderTime[0]));
    conditions.push(cond('order_time', 'lessthanorequal', orderTime[1]));
  }

  if (conditions.length > 0) table.Filter = and(...conditions);

  const queryParam: any = {
    Table: [table],
    PageParam: { page: params.page || 0, index: params.pageNo || 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const returnData = new clientData();
  returnData.dataTable = table;
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count || items.length || 0);

  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getPurchaseOrder(
  id: string,
  formKey = PURCHASE_ORDER_FORM_KEY,
  itemFormKey = formKey,
) {
  const table = createPurchaseOrderTable(formKey);
  table.Filter = and(cond(PRIMARY_KEY, 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data?.Items?.[0] ||
    resQuery.data?.Result.Items?.[0] ||
    resQuery.data.Items?.[0];
  const resQueryItem = await getPurchaseOrderItemPage({ orderId: id }, itemFormKey);
  resultData.items = resQueryItem.list || [];
  return resultData;
}

export async function createPurchaseOrder(
  data: ErpPurchaseOrderApi.PurchaseOrder,
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderTable(formKey);
  const items = data.items || [];
  const uid = generateUUID();
  const newItem = items.map((item) => sanitizePurchaseOrderItemForSave(item, uid));

  if (items.length > 0) await createPurchaseOrderItem(newItem, formKey);

  const newData = { ...data, id: uid, status: data.status ?? 10 };
  const saveParam = table.getSaveParam([newData], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  let orderNo = data.no;
  if (res) {
    try {
      const codeRes = await getCodeString(
        uid,
        '8093C76567A57177BEB33DE878AC457B',
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        orderNo = codeRes.Message;
        const updateTable = createPurchaseOrderTable(formKey);
        const updateData = { id: uid, no: codeRes.Message };
        const updateParam = updateTable.getSaveParam([], [updateData], []);
        await requestClient.post(updateTable.saveUrl, updateParam, {
          headers: updateTable.getRequestHeader(),
        });
      } else {
        await deletePurchaseOrder([uid], formKey);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deletePurchaseOrder([uid], formKey);
      throw error;
    }
  }

  return { ...(res as any), id: uid, no: orderNo } as any;
}

export async function updatePurchaseOrder(
  data: ErpPurchaseOrderApi.PurchaseOrder,
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderTable(formKey);
  const hasItemsField = Object.prototype.hasOwnProperty.call(data, 'items');
  const items = Array.isArray(data.items) ? data.items : [];
  const orderId = String(data.id || '');

  if (hasItemsField && orderId) {
    const existingRes = await getPurchaseOrderItemPage({ orderId }, formKey);
    const existingItems = Array.isArray(existingRes.list) ? existingRes.list : [];
    const normalizedItems = items.map((item) =>
      sanitizePurchaseOrderItemForSave(item, orderId),
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
      await createPurchaseOrderItem(createList, formKey);
    }
    if (updateList.length > 0) {
      await updatePurchaseOrderItem(updateList, formKey);
    }
    if (deleteIds.length > 0) {
      await deletePurchaseOrderItems(deleteIds, formKey);
    }
  }

  delete data.items;
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updatePurchaseOrderStatus(
  id: string | number,
  status: number,
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderTable(formKey);
  const data = { id, status };
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deletePurchaseOrder(
  ids: string[],
  formKey = PURCHASE_ORDER_FORM_KEY,
) {
  const table = createPurchaseOrderTable(formKey);
  const deleteList = ids.map((id) => ({ id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export function exportPurchaseOrder(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: PURCHASE_ORDER_FORM_KEY,
      tableName: TABLE_NAME,
      dbName: DB_NAME,
      primaryKey: PRIMARY_KEY,
      fileName: '采购订单',
      encodingId,
      extraData: params,
    });
  }
  return requestClient.download('/erp/purchase-order/export-excel', { params });
}
