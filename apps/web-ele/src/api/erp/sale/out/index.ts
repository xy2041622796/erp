import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { getProduct } from '#/api/erp/product/product';
import { getSaleOrder, getSaleOrderPage, updateSaleOrder } from '#/api/erp/sale/order';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import {
  STOCK_DB_NAME,
  STOCK_MODEL_ID,
  STOCK_PK,
  STOCK_TABLE_NAME,
} from '#/api/erp/stock/stock';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import { getCodeString } from '#/api/system/coding';

import { querySaleOrderItems, updateSaleOrderItems } from '../order/orderItems';
import {
  addSaleOutItems,
  querySaleOutItems,
  updateSaleOutItems,
} from './outItems';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpSaleOutApi {
  export interface SaleOut {
    rowid?: string;
    id?: string;
    no?: string;
    status?: number;
    customer_id?: number;
    account_id?: string;
    sale_user_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    warehouse_outbound?: string;
    warehouse_outbound_id?: string;
    out_time?: Date | string;
    order_id?: string;
    order_no?: string;
    total_count?: number;
    total_price?: number;
    receipt_price?: number;
    total_product_price?: number;
    total_tax_price?: number;
    discount_percent?: number;
    discount_price?: number;
    other_price?: number;
    file_url?: string;
    remark?: string;
    creator?: string;
    create_time?: string;
    updater?: string;
    update_time?: string;
    deleted?: number;
    tenant_id?: number;
    items?: SaleOutItem[];
  }

  export interface SaleOutItem {
    id?: string;
    out_id?: string;
    rowid?: string;
    product_id?: string;
    count?: number;
    product_price?: number;
    total_price?: number;
    tax_percent?: number;
    tax_price?: number;
    remark?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    product_unit_id?: string;
    order_item_id?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_name?: string;
    total_product_price?: number;
    stock_count?: number;
    out_count?: number;
    return_count?: number;
    total_count?: number;
  }
}

const SALE_OUT_MODEL_ID = '57728102F41B537F6795ABA7EC258F36';
const SALE_OUT_TABLE = 'erp_sale_out';
const SALE_OUT_DB = 'LMBill';
const SALE_OUT_PK = 'id';

async function querySaleOutDocsByOrderId(orderId: string) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  table.Filter = cond('order_id', 'equal', orderId);
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

function sumCount(list: any[], field: string) {
  return list.reduce((sum, item) => {
    const value = Number(item?.[field] ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildPendingOutReason(pendingOutNos: string[]) {
  const noText = pendingOutNos.length > 0 ? ` ${pendingOutNos.join('、')}` : '';
  return `该销售订单当前仓库已有待审批出库单${noText}，请先审批或删除后再生成`;
}

export async function getSaleOutOrderPage(params: any) {
  const res: any = await getSaleOrderPage({
    ...params,
    statusNotEqual: params?.showCompleted ? undefined : 20,
  });
  const list = Array.isArray(res?.list) ? res.list : [];
  res.list = list.map((item: any) => {
    const totalCount = Number(item?.total_count ?? 0);
    const outCount = Number(item?.out_count ?? 0);
    const remainingCount = Math.max(totalCount - outCount, 0);
    const completed = Number(item?.status) === 20;
    return {
      ...item,
      remaining_count: remainingCount,
      generate_status_text: completed ? '已全部出库' : remainingCount > 0 ? '可生成' : '无剩余数量',
      can_generate_order: !completed && remainingCount > 0,
    };
  });
  return res;
}

export async function getSaleOutGenerateStatus(orderId?: string | number, warehouseId?: string | number) {
  const order_id = String(orderId || '').trim();
  const warehouse_id = String(warehouseId || '').trim();
  if (!order_id) return { canGenerate: false, reason: '缺少销售订单编号' };
  const order = await getSaleOrder(order_id);
  if (Number((order as any)?.status) === 20) {
    return { canGenerate: false, reason: '该销售订单已全部出库', order_id, warehouse_id, totalCount: 0, approvedOutCount: 0, remainingCount: 0 };
  }
  const orderItems = Array.isArray((order as any)?.items) ? ((order as any).items as any[]) : [];
  const targetItems = warehouse_id ? orderItems.filter((item: any) => String(item?.warehouse_id || '') === warehouse_id) : orderItems;
  const totalCount = sumCount(targetItems, 'count');
  const approvedOutCount = sumCount(targetItems, 'out_count');
  const remainingCount = Math.max(totalCount - approvedOutCount, 0);
  const relatedOutDocs = await querySaleOutDocsByOrderId(order_id);
  const pendingOutDocs = relatedOutDocs.filter((doc: any) => {
    if (Number(doc?.status) !== 10) return false;
    if (!warehouse_id) return true;
    return String(doc?.warehouse_id || '') === warehouse_id;
  });
  const pendingOutNos = pendingOutDocs.map((doc: any) => String(doc?.no || '').trim()).filter(Boolean);
  let reason = '';
  if (pendingOutDocs.length > 0) reason = buildPendingOutReason(pendingOutNos);
  else if (!targetItems.length) reason = warehouse_id ? '该仓库下没有可生成的销售订单明细' : '该销售订单没有可生成的明细';
  else if (remainingCount <= 0) reason = '该销售订单当前仓库已全部出库';
  return {
    canGenerate: pendingOutDocs.length === 0 && Boolean(targetItems.length) && remainingCount > 0,
    reason,
    order_id,
    warehouse_id,
    totalCount,
    approvedOutCount,
    remainingCount,
    pendingOutDocs,
    pendingOutNos,
  };
}

export async function assertSaleOutCanGenerate(orderId?: string | number, warehouseId?: string | number) {
  const status = await getSaleOutGenerateStatus(orderId, warehouseId);
  if (!status.canGenerate) throw new Error(status.reason || '该销售订单当前仓库不可生成销售出库单');
  return status;
}

export async function getSaleOutPage(params: any) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  if (params.no) table.Filter = table.Filter ? and(table.Filter, cond('no', 'contains', params.no)) : cond('no', 'contains', params.no);
  if (params.order_no) table.Filter = table.Filter ? and(table.Filter, cond('order_no', 'contains', params.order_no)) : cond('order_no', 'contains', params.order_no);
  if (params.customer_id) table.Filter = table.Filter ? and(table.Filter, cond('customer_id', 'equal', params.customer_id)) : cond('customer_id', 'equal', params.customer_id);
  if (params.warehouse_id) table.Filter = table.Filter ? and(table.Filter, cond('warehouse_id', 'equal', params.warehouse_id)) : cond('warehouse_id', 'equal', params.warehouse_id);
  if (params.status !== undefined && params.status !== null && params.status !== '') table.Filter = table.Filter ? and(table.Filter, cond('status', 'equal', params.status)) : cond('status', 'equal', params.status);
  if (params.remark) table.Filter = table.Filter ? and(table.Filter, cond('remark', 'contains', params.remark)) : cond('remark', 'contains', params.remark);
  if (params.out_time && Array.isArray(params.out_time) && params.out_time.length === 2) {
    table.Filter = table.Filter ? and(table.Filter, cond('out_time', 'greaterthanorequal', params.out_time[0])) : cond('out_time', 'greaterthanorequal', params.out_time[0]);
    table.Filter = table.Filter ? and(table.Filter, cond('out_time', 'lessthanorequal', params.out_time[1])) : cond('out_time', 'lessthanorequal', params.out_time[1]);
  }
  const queryParam: any = { Table: [table], PageParam: { page: params.page || 0, index: params.pageNo || 1 } };
  if (params.page && params.pageNo) queryParam.PageParam = { page: params.page, index: params.pageNo };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  if (params.page && params.pageNo) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  } else if (resData.Items && resData.Items.length > 0) {
    returnData.list = resData.Items;
  } else {
    returnData.list = [];
  }
  return returnData;
}

export async function getSaleOut(id: string) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data?.Items?.[0] || resQuery.data?.Result?.Items?.[0] || resQuery.data?.Items?.[0];
  if (resultData) {
    const resQueryItem = await querySaleOutItems({ out_id: id });
    resultData.items = resQueryItem.list || [];
  }
  return resultData || null;
}

export async function createSaleOut(data: ErpSaleOutApi.SaleOut) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  const itemData = Array.isArray(data?.items) ? data.items : [];
  const uid = generateUUID();
  const newItems = itemData.map((item: any) => ({ ...item, out_id: uid }));
  if (newItems.length > 0) await addSaleOutItems(newItems);

  const { no, status, customer_id, account_id, sale_user_id, warehouse_id, warehouse_name, warehouse_outbound, warehouse_outbound_id, out_time, order_id, order_no, total_count, total_price, receipt_price, total_product_price, total_tax_price, discount_percent, discount_price, other_price, file_url, remark } = data;
  const pureData = {
    id: uid,
    no,
    status,
    customer_id,
    account_id,
    sale_user_id,
    warehouse_id,
    warehouse_outbound: warehouse_name ?? warehouse_outbound ?? warehouse_outbound_id,
    out_time,
    order_id,
    order_no,
    total_count,
    total_price,
    receipt_price,
    total_product_price,
    total_tax_price,
    discount_percent,
    discount_price,
    other_price,
    file_url,
    remark,
  };
  const saveParam = table.getSaveParam([pureData], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
  let outNo = no;
  if (res) {
    try {
      const codeRes = await getCodeString(uid, '9E5DDC4FFFBD2EB3413FF06E3A58D316', table.getRequestHeader());
      if (codeRes.Code === 200 && codeRes.Message) {
        outNo = codeRes.Message;
        await updateSaleOut({ id: uid, no: codeRes.Message, warehouse_id, warehouse_name });
      } else {
        await deleteSaleOut(uid);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deleteSaleOut(uid);
      throw error;
    }
  }
  return { ...(res as any), id: uid, no: outNo } as any;
}

export async function updateSaleOut(data: ErpSaleOutApi.SaleOut) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  const itemData = Array.isArray(data?.items) ? data.items : [];
  if (itemData.length > 0) {
    const newItems = itemData.map((item: any) => {
      const payload: any = {
        id: item.id,
        out_id: item.out_id,
        rowid: item.rowid,
        product_id: item.product_id,
        count: item.count,
        remark: item.remark,
        warehouse_id: item.warehouse_id,
        product_unit_id: item.product_unit_id,
      };
      ['product_price', 'total_product_price', 'total_price', 'tax_percent', 'tax_price'].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(item, field)) payload[field] = item[field];
      });
      return payload;
    });
    await updateSaleOutItems(newItems);
  }
  const { rowid, id, no, status, customer_id, account_id, sale_user_id, warehouse_id, warehouse_name, warehouse_outbound, warehouse_outbound_id, out_time, order_id, order_no, total_count, total_price, receipt_price, total_product_price, total_tax_price, discount_percent, discount_price, other_price, file_url, remark } = data;
  const pureData = {
    rowid,
    id,
    no,
    status,
    customer_id,
    account_id,
    sale_user_id,
    warehouse_id,
    warehouse_outbound: warehouse_name ?? warehouse_outbound ?? warehouse_outbound_id,
    out_time,
    order_id,
    order_no,
    total_count,
    total_price,
    receipt_price,
    total_product_price,
    total_tax_price,
    discount_percent,
    discount_price,
    other_price,
    file_url,
    remark,
  };
  const saveParam = table.getSaveParam([], [pureData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function updateSaleOutStatus(id: number | string, status: number) {
  const outId = String(id);
  const saleOutTable = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  const out = await getSaleOut(outId);
  if (!out) throw new Error('未找到该出库单');
  const currentStatus = Number((out as any).status);
  if (Number(status) === 10 && currentStatus !== 20) throw new Error('该出库单未审核，无需反审核');
  if (Number(status) === 20 && currentStatus === 20) {
    const saveParam = saleOutTable.getSaveParam([], [{ id: outId, status }], []);
    return await requestClient.post(saleOutTable.saveUrl, saveParam, { headers: saleOutTable.getRequestHeader() });
  }
  if (Number(status) !== 20 && Number(status) !== 10) {
    const saveParam = saleOutTable.getSaveParam([], [{ id: outId, status }], []);
    return await requestClient.post(saleOutTable.saveUrl, saveParam, { headers: saleOutTable.getRequestHeader() });
  }

  const itemRows = Array.isArray((out as any).items) ? (out as any).items : [];
  if (itemRows.length === 0) {
    const saveParam = saleOutTable.getSaveParam([], [{ id: outId, status }], []);
    return await requestClient.post(saleOutTable.saveUrl, saveParam, { headers: saleOutTable.getRequestHeader() });
  }

  type PairKey = string;
  const qtyMap = new Map<PairKey, { product_id: string; qty: number; warehouse_id: string; item?: any }>();
  for (const r of itemRows) {
    const product_id = String((r as any).product_id ?? '');
    const warehouse_id = await normalizeWarehouseIdToRowid((r as any).warehouse_id ?? (out as any)?.warehouse_id ?? '');
    const qty = Number((r as any).count ?? 0);
    if (!product_id || !warehouse_id) throw new Error('出库明细缺少产品或仓库信息');
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const key = `${product_id}@@${warehouse_id}`;
    const old = qtyMap.get(key);
    qtyMap.set(key, old ? { ...old, qty: old.qty + qty } : { product_id, warehouse_id, qty, item: r });
  }
  const pairs = [...qtyMap.values()];
  if (pairs.length === 0) {
    const saveParam = saleOutTable.getSaveParam([], [{ id: outId, status }], []);
    return await requestClient.post(saleOutTable.saveUrl, saveParam, { headers: saleOutTable.getRequestHeader() });
  }

  const stockTable = createFinanceDataTable(STOCK_MODEL_ID, STOCK_TABLE_NAME, STOCK_DB_NAME, STOCK_PK);
  stockTable.Filter = or(...pairs.map((p) => and(cond('product_id', 'equal', p.product_id), cond('warehouse_id', 'equal', p.warehouse_id))));
  const stockQueryParam = { Table: [stockTable], PageParam: { page: 0, index: 1 } };
  const stockRes = await requestClient.post(stockTable.queryUrl, stockQueryParam, { headers: stockTable.getRequestHeader(), responseReturn: 'raw' });
  stockTable.execQueryResult(stockRes);
  const stockItems = (stockRes.data?.Result?.data?.Items || []) as any[];
  const stockMap = new Map<PairKey, any>();
  for (const s of stockItems) {
    const key = `${String(s.product_id ?? '')}@@${String(s.warehouse_id ?? '')}`;
    if (stockMap.has(key)) throw new Error(`库存表存在重复记录：product_id=${s.product_id}, warehouse_id=${s.warehouse_id}`);
    stockMap.set(key, s);
  }

  async function resolveStockRequiredFields(productId: string, item?: any) {
    const p: any = await getProduct(productId).catch(() => null);
    const category_id = String(p?.category_id ?? p?.product_category_id ?? p?.product_type ?? item?.category_id ?? item?.product_category_id ?? 'UNKNOWN').trim() || 'UNKNOWN';
    const unit_name = String(item?.product_unit_name ?? item?.unit_name ?? item?.product_unit_id ?? p?.unit ?? p?.unit_name ?? 'UNKNOWN').trim() || 'UNKNOWN';
    const unit_id = String(item?.product_unit_id ?? unit_name).trim() || unit_name;
    const product_name = String(p?.product_name ?? item?.product_name ?? productId).trim() || productId;
    return { category_id, unit_id, unit_name, product_name };
  }

  const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
  const stockAdded: any[] = [];
  const stockChanged: any[] = [];
  const deltas: StockDelta[] = [];
  const bizNo = String((out as any).no ?? outId);
  if (Number(status) === 20) {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (stockRow) {
        const currentCount = Number(stockRow.count ?? 0);
        const newCount = (Number.isFinite(currentCount) ? currentCount : 0) - p.qty;
        stockChanged.push({ rowid: stockRow.rowid ?? stockRow.row_id, count: newCount, update_time: now });
        deltas.push({ product_id: p.product_id, warehouse_id: p.warehouse_id, delta: -p.qty, total_count: newCount });
      } else {
        const required = await resolveStockRequiredFields(p.product_id, p.item);
        const newCount = -p.qty;
        stockAdded.push({ rowid: generateUUID(), product_id: p.product_id, warehouse_id: p.warehouse_id, count: newCount, category_id: required.category_id, unit_id: required.unit_id, unit_name: required.unit_name, product_name: required.product_name || p.product_id, create_time: now, update_time: now });
        deltas.push({ product_id: p.product_id, warehouse_id: p.warehouse_id, delta: -p.qty, total_count: newCount });
      }
    }
  } else {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (stockRow) {
        const currentCount = Number(stockRow.count ?? 0);
        const newCount = (Number.isFinite(currentCount) ? currentCount : 0) + p.qty;
        stockChanged.push({ rowid: stockRow.rowid, count: newCount, update_time: now });
        deltas.push({ product_id: p.product_id, warehouse_id: p.warehouse_id, delta: p.qty, total_count: newCount });
      } else {
        const required = await resolveStockRequiredFields(p.product_id, p.item);
        stockAdded.push({ rowid: generateUUID(), product_id: p.product_id, warehouse_id: p.warehouse_id, count: p.qty, category_id: required.category_id, unit_id: required.unit_id, unit_name: required.unit_name, product_name: required.product_name || undefined, create_time: now, update_time: now });
        deltas.push({ product_id: p.product_id, warehouse_id: p.warehouse_id, delta: p.qty, total_count: p.qty });
      }
    }
  }

  const stockRecord = await buildStockRecordAdds(deltas, {
    biz_type: Number(status) === 20 ? 2 : 1,
    biz_no: bizNo,
    description: Number(status) === 20 ? '销售出库' : '销售出库反审批',
    biz_time: (out as any).out_time,
  });
  const orderId = (out as any)?.order_id;
  if (orderId) {
    const { list: orderItems } = await querySaleOrderItems({ order_id: String(orderId) });
    const orderItemsList = Array.isArray(orderItems) ? orderItems : [];
    const orderItemChanged: any[] = [];
    for (const outItem of itemRows) {
      const orderItemId = outItem?.order_item_id;
      if (!orderItemId) continue;
      const targetOrderItem = orderItemsList.find((oi: any) => oi.id === orderItemId || oi.rowid === orderItemId);
      if (!targetOrderItem) continue;
      const currentOutCount = Number(targetOrderItem.out_count || 0);
      const delta = Number(outItem?.count || 0);
      if (!Number.isFinite(delta) || delta <= 0) continue;
      const newOutCount = Number(status) === 20 ? currentOutCount + delta : currentOutCount - delta;
      if (Number(status) === 10 && newOutCount < 0) throw new Error('反审核失败：销售订单项(' + orderItemId + ') 当前已出库' + currentOutCount + '，需回退' + delta);
      const pk = targetOrderItem.id ?? targetOrderItem.rowid;
      if (!pk) continue;
      orderItemChanged.push({ id: pk, out_count: newOutCount });
    }
    if (orderItemChanged.length > 0) {
      const merged = new Map<string, any>();
      for (const u of orderItemChanged) merged.set(String(u.id), u);
      await updateSaleOrderItems([...merged.values()]);
    }
    const latestOrder = await getSaleOrder(String(orderId));
    const latestOrderItems = Array.isArray(latestOrder?.items) ? latestOrder.items : [];
    const totalOrderCount = latestOrderItems.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0);
    const totalOutCount = latestOrderItems.reduce((sum: number, item: any) => sum + Number(item.out_count || 0), 0);
    const relatedOutDocs = await querySaleOutDocsByOrderId(String(orderId));
    const normalizedStatuses = relatedOutDocs.map((doc: any) => {
      const docId = String(doc?.id || '');
      if (docId && docId === outId) return Number(status);
      return Number(doc?.status || 0);
    });
    const allRelatedApproved = normalizedStatuses.length > 0 && normalizedStatuses.every((s) => s === 20);
    let orderStatus = 10;
    if (allRelatedApproved && totalOrderCount > 0 && totalOutCount >= totalOrderCount) orderStatus = 20;
    else if (totalOutCount > 0) orderStatus = 30;
    await updateSaleOrder({ id: String(orderId), out_count: totalOutCount, status: orderStatus });
  }
  const reqList = [
    ...stockTable.getSaveParam(stockAdded, stockChanged, []),
    ...stockRecord.table.getSaveParam(stockRecord.adds, [], []),
    ...saleOutTable.getSaveParam([], [{ id: outId, status }], []),
  ];
  return await requestClient.post(saleOutTable.saveUrl, reqList, { headers: saleOutTable.getRequestHeader() });
}

export async function deleteSaleOut(ids: string | string[]) {
  const table = createFinanceDataTable(SALE_OUT_MODEL_ID, SALE_OUT_TABLE, SALE_OUT_DB, SALE_OUT_PK);
  const idArray = Array.isArray(ids) ? ids : ids.split(',');
  const delArr = idArray.map((id) => ({ id }));
  const saveParam = table.getSaveParam([], [], delArr);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export function exportSaleOut(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({ formId: SALE_OUT_MODEL_ID, tableName: SALE_OUT_TABLE, dbName: SALE_OUT_DB, primaryKey: SALE_OUT_PK, fileName: '销售出库', encodingId, extraData: params });
  }
  return requestClient.download('/erp/sale-out/export-excel', { params });
}
