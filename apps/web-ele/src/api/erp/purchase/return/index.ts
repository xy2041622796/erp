import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { getProduct } from '#/api/erp/product/product';
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

import { getPurchaseOrder, updatePurchaseOrder } from '../order';
import {
  getPurchaseOrderItemPage,
  updatePurchaseOrderItem,
} from '../order/orderItem';
import {
  addPurchaseReturnItems,
  queryPurchaseReturnItems,
  updatePurchaseReturnItems,
} from './returnItems';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const TABLE_NAME = 'erp_purchase_return';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'id';
const DATA_MODEL_ID = '9BF89A303AED38F93A788064E37724FB';

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatMySqlDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

export namespace ErpPurchaseReturnApi {
  export interface PurchaseReturn {
    rowid?: string;
    id?: string;
    no?: string;
    supplier_id?: number | string;
    return_time?: Date | string;
    total_count?: number;
    total_price?: number;
    discount_percent?: number;
    discount_price?: number;
    status?: number;
    remark?: string;
    total_tax_price?: number;
    other_price?: number;
    account_id: string;
    order_no?: string;
    order_id?: string;
    total_product_price?: number;
    items?: PurchaseReturnItem[];
  }

  export interface PurchaseReturnItem {
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
    product_name?: string;
    product_bar_code?: string;
    product_unit_name?: string;
    total_product_price?: number;
    stock_count?: number;
  }
}

export async function getPurchaseReturnPage(params: any) {
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const pageSize = Number(params.page ?? params.size ?? 0);
  const pageNo = Number(params.pageNo ?? params.index ?? 1);

  if (params.no)
    table.Filter = and(table.Filter, cond('no', 'contains', params.no));
  if (params.supplier_id)
    table.Filter = and(
      table.Filter,
      cond('supplier_id', 'equal', params.supplier_id),
    );
  if (
    params.status !== undefined &&
    params.status !== null &&
    params.status !== ''
  )
    table.Filter = and(table.Filter, cond('status', 'equal', params.status));
  if (
    params.refund_status !== undefined &&
    params.refund_status !== null &&
    params.refund_status !== ''
  )
    table.Filter = and(
      table.Filter,
      cond('refund_status', 'equal', params.refund_status),
    );
  if (params.remark)
    table.Filter = and(table.Filter, cond('remark', 'contains', params.remark));
  if (
    params.return_time &&
    Array.isArray(params.return_time) &&
    params.return_time.length === 2
  ) {
    table.Filter = and(
      table.Filter,
      cond('return_time', 'greaterthanorequal', params.return_time[0]),
    );
    table.Filter = and(
      table.Filter,
      cond('return_time', 'lessthanorequal', params.return_time[1]),
    );
  }

  const queryParam: any = {
    Table: [table],
    PageParam: { page: pageSize, index: pageNo },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data || {};
  const items = Array.isArray(resData.Items) ? resData.Items : [];
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = Number(resData.Count ?? items.length ?? 0);
  return returnData;
}

export async function getPurchaseReturn(id: string) {
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  table.Filter = and(cond('id', 'equal', id));
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
  const resQueryItem = await queryPurchaseReturnItems({ return_id: id });
  resultData.items = resQueryItem.list || [];
  return resultData;
}

export async function createPurchaseReturn(
  data: ErpPurchaseReturnApi.PurchaseReturn,
) {
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const itemData = Array.isArray(data?.items) ? data.items : [];
  const uid = generateUUID();
  const now = formatMySqlDateTime(new Date());

  const newItems = itemData.map((item: any) => ({
    ...item,
    id: item?.id ?? generateUUID(),
    return_id: uid,
    deleted: item?.deleted ?? 0,
    product_price: toNumber(item?.product_price),
    count: toNumber(item?.count),
    total_price: toNumber(item?.total_price),
  }));
  if (newItems.length > 0) await addPurchaseReturnItems(newItems);

  const {
    no,
    supplier_id,
    return_time,
    total_count,
    total_price,
    discount_percent,
    discount_price,
    status,
    remark,
    total_tax_price,
    other_price,
    account_id,
    total_product_price,
    order_no,
    order_id,
    file_url,
  } = data as any;
  const supplierIdStr = String(supplier_id ?? '').trim();
  const accountIdStr = String(account_id ?? '').trim();
  const orderIdStr = String(order_id ?? '').trim();
  if (!supplierIdStr) throw new Error('创建采购退货失败：supplier_id 不能为空');
  if (!accountIdStr) throw new Error('创建采购退货失败：account_id 不能为空');

  const pureData: any = {
    id: uid,
    rowid: generateUUID(),
    no,
    status: status ?? 10,
    supplier_id: supplierIdStr,
    account_id: accountIdStr,
    return_time: return_time ?? now,
    order_id: orderIdStr,
    order_no: orderNoNormalize(order_no),
    total_count: toNumber(total_count),
    total_price: toNumber(total_price),
    total_product_price: toNumber(total_product_price),
    total_tax_price: toNumber(total_tax_price),
    discount_percent: toNumber(discount_percent),
    discount_price: toNumber(discount_price),
    other_price: toNumber(other_price),
    file_url,
    remark,
    deleted: 0,
    lingma_sys_is_delete: 0,
    lingma_sys_ent: 'NewApp',
  };

  const saveParam = table.getSaveParam([pureData], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  let returnNo = no;
  if (res) {
    try {
      const codeRes = await getCodeString(
        uid,
        '6E470BC0663C1FF85DEA5C1E2095A4B2',
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        returnNo = codeRes.Message;
        const updateTable = createFinanceDataTable(
          DATA_MODEL_ID,
          TABLE_NAME,
          DB_NAME,
          PRIMARY_KEY,
        );
        const updateData = { id: uid, no: codeRes.Message };
        const updateParam = updateTable.getSaveParam([], [updateData], []);
        await requestClient.post(updateTable.saveUrl, updateParam, {
          headers: updateTable.getRequestHeader(),
        });
      } else {
        await deletePurchaseReturn([uid]);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deletePurchaseReturn([uid]);
      throw error;
    }
  }
  return { ...(res as any), id: uid, no: returnNo } as any;
}

function orderNoNormalize(value: unknown) {
  const text = String(value ?? '').trim();
  return text || undefined;
}

export async function updatePurchaseReturn(
  data: ErpPurchaseReturnApi.PurchaseReturn,
) {
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const itemData = Array.isArray(data?.items) ? data.items : [];
  if (itemData.length > 0) {
    const newItems = itemData.map((item) => {
      const {
        id,
        return_id,
        order_item_id,
        warehouse_id,
        product_id,
        product_unit_id,
        product_price,
        count,
        total_price,
        tax_percent,
        tax_price,
        remark,
      } = item;
      return {
        id,
        return_id,
        order_item_id,
        warehouse_id,
        product_id,
        product_unit_id,
        product_price,
        count,
        total_price,
        tax_percent,
        tax_price,
        remark,
      };
    });
    await updatePurchaseReturnItems(newItems);
  }
  const {
    rowid,
    id,
    no,
    supplier_id,
    return_time,
    total_count,
    total_price,
    discount_percent,
    discount_price,
    status,
    remark,
    total_tax_price,
    other_price,
    account_id,
    total_product_price,
    order_no,
    order_id,
  } = data;
  const pureData = {
    rowid,
    id,
    no,
    supplier_id,
    return_time,
    total_count,
    total_price,
    discount_percent,
    discount_price,
    status,
    remark,
    total_tax_price,
    other_price,
    account_id,
    total_product_price,
    order_no: orderNoNormalize(order_no),
    order_id: String(order_id ?? '').trim(),
  };
  const saveParam = table.getSaveParam([], [pureData], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updatePurchaseReturnStatus(id: string, status: number) {
  const returnId = String(id);
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const doc = await getPurchaseReturn(returnId);
  if (!doc) throw new Error('未找到该采购退货单');
  const currentStatus = Number((doc as any).status);
  if (Number(status) === 10 && currentStatus !== 20)
    throw new Error('该退货单未审核，无需反审核');
  if (Number(status) === 20 && currentStatus === 20) {
    const updateData = { id: returnId, status };
    const saveParam = table.getSaveParam([], [updateData], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }
  if (Number(status) !== 20 && Number(status) !== 10) {
    const updateData = { id: returnId, status };
    const saveParam = table.getSaveParam([], [updateData], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }
  const itemRows = Array.isArray((doc as any).items) ? (doc as any).items : [];
  if (itemRows.length === 0) {
    const updateData = { id: returnId, status };
    const saveParam = table.getSaveParam([], [updateData], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  type PairKey = string;
  const qtyMap = new Map<
    PairKey,
    { product_id: string; qty: number; warehouse_id: string; item?: any }
  >();
  for (const r of itemRows) {
    const product_id = String((r as any).product_id ?? '');
    const warehouse_id = await normalizeWarehouseIdToRowid(
      (r as any).warehouse_id ?? '',
    );
    const qty = Number((r as any).count ?? 0);
    if (!product_id || !warehouse_id)
      throw new Error('退货明细缺少产品或仓库信息');
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const key = `${product_id}@@${warehouse_id}`;
    const old = qtyMap.get(key);
    qtyMap.set(
      key,
      old
        ? { ...old, qty: old.qty + qty }
        : { product_id, warehouse_id, qty, item: r },
    );
  }
  const pairs = [...qtyMap.values()];
  if (pairs.length === 0) {
    const updateData = { id: returnId, status };
    const saveParam = table.getSaveParam([], [updateData], []);
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  const stockTable = createFinanceDataTable(
    STOCK_MODEL_ID,
    STOCK_TABLE_NAME,
    STOCK_DB_NAME,
    STOCK_PK,
  );
  stockTable.Filter = or(
    ...pairs.map((p) =>
      and(
        cond('product_id', 'equal', p.product_id),
        cond('warehouse_id', 'equal', p.warehouse_id),
      ),
    ),
  );
  const stockQueryParam = {
    Table: [stockTable],
    PageParam: { page: 0, index: 1 },
  };
  const stockRes = await requestClient.post(
    stockTable.queryUrl,
    stockQueryParam,
    { headers: stockTable.getRequestHeader(), responseReturn: 'raw' },
  );
  stockTable.execQueryResult(stockRes);
  const stockItems = (stockRes.data?.Result?.data?.Items || []) as any[];
  const stockMap = new Map<PairKey, any>();
  for (const s of stockItems)
    stockMap.set(
      `${String(s.product_id ?? '')}@@${String(s.warehouse_id ?? '')}`,
      s,
    );
  async function resolveStockRequiredFields(productId: string, item?: any) {
    const p: any = await getProduct(productId);
    if (!p) throw new Error(`未找到产品信息：product_id=${productId}`);
    const category_id = String(
      p.category_id ??
        p.product_category_id ??
        p.product_type ??
        item?.category_id ??
        '',
    ).trim();
    if (!category_id)
      throw new Error(`产品缺少分类信息：product_id=${productId}`);
    const unit_name = String(
      item?.product_unit_name ??
        item?.unit_name ??
        item?.product_unit_id ??
        p.unit ??
        p.unit_name ??
        '',
    ).trim();
    if (!unit_name)
      throw new Error(`产品缺少单位名称：product_id=${productId}`);
    const unit_id = String(item?.product_unit_id ?? unit_name).trim();
    const product_name = String(
      p.product_name ?? item?.product_name ?? '',
    ).trim();
    return { category_id, unit_id, unit_name, product_name };
  }

  const now = formatMySqlDateTime(new Date());
  const stockAdded: any[] = [];
  const stockChanged: any[] = [];
  const deltas: StockDelta[] = [];
  const bizNo = String((doc as any).no ?? returnId);

  if (Number(status) === 20) {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (!stockRow)
        throw new Error(
          `库存不足：无库存记录 product=${p.product_id} warehouse=${p.warehouse_id}`,
        );
      const current = Number(stockRow.count ?? 0);
      if (!Number.isFinite(current) || current < p.qty)
        throw new Error(
          `库存不足：product=${p.product_id} warehouse=${p.warehouse_id} 当前=${current} 需退货=${p.qty}`,
        );
      const newCount = current - p.qty;
      stockChanged.push({
        rowid: stockRow.rowid,
        count: newCount,
        update_time: now,
      });
      deltas.push({
        product_id: p.product_id,
        warehouse_id: p.warehouse_id,
        delta: -p.qty,
        total_count: newCount,
      });
    }
  } else {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (stockRow) {
        const current = Number(stockRow.count ?? 0);
        const newCount = (Number.isFinite(current) ? current : 0) + p.qty;
        stockChanged.push({
          rowid: stockRow.rowid,
          count: newCount,
          update_time: now,
        });
        deltas.push({
          product_id: p.product_id,
          warehouse_id: p.warehouse_id,
          delta: p.qty,
          total_count: newCount,
        });
      } else {
        const required = await resolveStockRequiredFields(p.product_id, p.item);
        stockAdded.push({
          rowid: generateUUID(),
          product_id: p.product_id,
          warehouse_id: p.warehouse_id,
          count: p.qty,
          category_id: required.category_id,
          unit_id: required.unit_id,
          unit_name: required.unit_name,
          product_name: required.product_name || undefined,
          create_time: now,
          update_time: now,
        });
        deltas.push({
          product_id: p.product_id,
          warehouse_id: p.warehouse_id,
          delta: p.qty,
          total_count: p.qty,
        });
      }
    }
  }

  const stockRecord = await buildStockRecordAdds(deltas, {
    biz_type: 2,
    biz_no: bizNo,
    description: Number(status) === 20 ? '采购退货' : '采购退货反审批',
    biz_time: (doc as any).return_time,
  });
  const orderId = (doc as any)?.order_id;
  if (orderId) {
    const { list: orderItems } = await getPurchaseOrderItemPage({
      order_id: String(orderId),
    });
    const orderItemsList = Array.isArray(orderItems) ? orderItems : [];
    const orderItemChanged: any[] = [];
    for (const returnItem of itemRows) {
      const orderItemId = (returnItem as any).order_item_id;
      if (!orderItemId) continue;
      const targetOrderItem = orderItemsList.find(
        (oi: any) => oi.id === orderItemId || oi.rowid === orderItemId,
      );
      if (!targetOrderItem) continue;
      const currentReturnCount = Number(targetOrderItem.return_count || 0);
      const delta = Number((returnItem as any).count || 0);
      if (!Number.isFinite(delta) || delta <= 0) continue;
      const newReturnCount =
        Number(status) === 20
          ? currentReturnCount + delta
          : currentReturnCount - delta;
      if (Number(status) === 10 && newReturnCount < 0)
        throw new Error(
          '反审核失败：采购订单项(' +
            orderItemId +
            ') 当前已退货' +
            currentReturnCount +
            '，需回退' +
            delta,
        );
      const pk = targetOrderItem.id ?? targetOrderItem.rowid;
      if (!pk) continue;
      orderItemChanged.push({ id: pk, return_count: newReturnCount });
    }
    if (orderItemChanged.length > 0) {
      const merged = new Map<string, any>();
      for (const u of orderItemChanged) merged.set(String(u.id), u);
      await updatePurchaseOrderItem([...merged.values()]);
    }
    const latestOrder = await getPurchaseOrder(String(orderId));
    const latestOrderItems = Array.isArray(latestOrder && latestOrder.items)
      ? latestOrder.items
      : [];
    const totalOrderCount = latestOrderItems.reduce(
      (sum: number, item: any) => sum + Number(item.count || 0),
      0,
    );
    const totalReturnCount = latestOrderItems.reduce(
      (sum: number, item: any) => sum + Number(item.return_count || 0),
      0,
    );
    let returnStatus = 10;
    if (totalReturnCount > 0 && totalReturnCount < totalOrderCount)
      returnStatus = 20;
    else if (totalOrderCount > 0 && totalReturnCount >= totalOrderCount)
      returnStatus = 30;
    await updatePurchaseOrder({
      id: String(orderId),
      return_count: totalReturnCount,
      return_status: returnStatus,
    });
  }

  const updateData = { id: returnId, status };
  const reqList = [
    ...stockTable.getSaveParam(stockAdded, stockChanged, []),
    ...stockRecord.table.getSaveParam(stockRecord.adds, [], []),
    ...table.getSaveParam([], [updateData], []),
  ];
  return await requestClient.post(table.saveUrl, reqList, {
    headers: table.getRequestHeader(),
  });
}

export async function deletePurchaseReturn(ids: string[]) {
  const table = createFinanceDataTable(
    DATA_MODEL_ID,
    TABLE_NAME,
    DB_NAME,
    PRIMARY_KEY,
  );
  const deleteList = ids.map((id) => ({ id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export function exportPurchaseReturn(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: DATA_MODEL_ID,
      tableName: TABLE_NAME,
      dbName: DB_NAME,
      primaryKey: PRIMARY_KEY,
      fileName: '采购退货',
      encodingId,
      extraData: params,
    });
  }
  return requestClient.download('/erp/purchase-return/export-excel', {
    params,
  });
}
