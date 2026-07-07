import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { exportExcelByConfig } from '#/api/common/import-export';
import { getProduct } from '#/api/erp/product/product';
import {
  getPurchaseOrder,
  getPurchaseOrderPage,
  updatePurchaseOrder,
} from '#/api/erp/purchase/order';
import {
  addStockList,
  createStockTable,
  getWarehouseStockCount,
  updateStockList,
} from '#/api/erp/stock/stock';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import { getCodeString } from '#/api/system/coding';

import {
  getPurchaseOrderItemPage,
  updatePurchaseOrderItem,
} from '../order/orderItem';
import {
  addPurchaseInItems,
  queryPurchaseInItems,
  updatePurchaseInItems,
} from './inItems';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

export namespace ErpPurchaseInApi {
  export interface PurchaseIn {
    id?: string;
    no?: string;
    supplier_id?: number;
    order_id?: number | string;
    order_no?: string;
    in_time?: string;
    total_count?: number;
    total_price?: number;
    status?: number;
    remark?: string;
    out_count?: number;
    return_count?: number;
    discount_percent?: number;
    discount_price?: number;
    payment_price?: number;
    other_price?: number;
    total_product_price?: number;
    tax_price?: number;
    account_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    warehouse_inbound?: string;
    createuser?: string;
    items?: PurchaseInItem[];
  }

  export interface PurchaseInItem {
    id?: string;
    in_id?: string;
    order_item_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    product_id?: string;
    product_unit_id?: string;
    product_price?: number;
    count?: number;
    total_price?: number;
    tax_percent?: number;
    tax_price?: number;
    remark?: string;
    product_name?: string;
    unit_name?: string;
    category_name?: string;
    category_id?: string;
    product_bar_code?: string;
    product_unit_name?: string;
    total_product_price?: number;
    stock_count?: number;
    in_count?: number;
    return_count?: number;
    total_count?: number;
  }
}

export const PURCHASE_IN_FORM_KEY = 'F7D0E8BC3570CBF853F6B1E6AB1085CA';
const CommonTableId = PURCHASE_IN_FORM_KEY;
const CommonTableName = 'erp_purchase_in';
const CommonDbName = 'LMBill';
const CommonKeyField = 'id';

export async function getPurchaseInOrderPage(params: any) {
  const queryParams = {
    ...params,
    statusNotEqual: params?.showCompleted ? undefined : 20,
  };
  const res: any = await getPurchaseOrderPage(
    queryParams,
    PURCHASE_IN_FORM_KEY,
  );
  const list = Array.isArray(res?.list) ? res.list : [];
  res.list = list.map((item: any) => {
    const totalCount = Number(item?.total_count ?? 0);
    const inCount = Number(item?.in_count ?? 0);
    const remainingCount = Math.max(totalCount - inCount, 0);
    const completed = Number(item?.status) === 20;
    return {
      ...item,
      remaining_count: remainingCount,
      generate_status_text: completed
        ? '已全部入库'
        : remainingCount > 0
          ? '可生成'
          : '无剩余数量',
      can_generate_order: !completed && remainingCount > 0,
    };
  });
  return res;
}

export async function getPurchaseInOrder(id: string) {
  return await getPurchaseOrder(id, PURCHASE_IN_FORM_KEY, PURCHASE_IN_FORM_KEY);
}
export async function getPurchaseInOrderItemPage(params: any) {
  return await getPurchaseOrderItemPage(params, PURCHASE_IN_FORM_KEY);
}
export async function updatePurchaseInOrder(data: any) {
  return await updatePurchaseOrder(data, PURCHASE_IN_FORM_KEY);
}
export async function updatePurchaseInOrderItem(data: any) {
  return await updatePurchaseOrderItem(data, PURCHASE_IN_FORM_KEY);
}
export function getPurchaseInWarehouseStockCount(params: any) {
  return getWarehouseStockCount(params, PURCHASE_IN_FORM_KEY);
}
export async function addPurchaseInStockList(list: any[]) {
  return await addStockList(list, PURCHASE_IN_FORM_KEY);
}
export async function updatePurchaseInStockList(list: any[]) {
  return await updateStockList(list, PURCHASE_IN_FORM_KEY);
}

export async function getPurchaseInPage(params: any) {
  const dataTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  const conditions = [];
  const pageSize = Number(params.page ?? params.size ?? 0);
  const pageNo = Number(params.pageNo ?? params.index ?? 1);

  if (params.no) conditions.push(cond('no', 'contains', params.no));
  if (params.order_id)
    conditions.push(cond('order_id', 'equal', params.order_id));
  if (params.order_no)
    conditions.push(cond('order_no', 'contains', params.order_no));
  if (params.supplier_id)
    conditions.push(cond('supplier_id', 'equal', params.supplier_id));
  if (params.warehouse_id)
    conditions.push(cond('warehouse_id', 'equal', params.warehouse_id));
  if (
    params.status !== undefined &&
    params.status !== null &&
    params.status !== ''
  ) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (params.createuser)
    conditions.push(cond('createuser', 'equal', params.createuser));
  if (Array.isArray(params.in_time) && params.in_time.length === 2) {
    conditions.push(cond('in_time', 'greaterthanorequal', params.in_time[0]));
    conditions.push(cond('in_time', 'lessthanorequal', params.in_time[1]));
  }

  if (conditions.length > 0) dataTable.Filter = and(...conditions);

  const queryParam: any = {
    Table: [dataTable],
    PageParam: { page: pageSize, index: pageNo },
  };
  const resQuery = await requestClient.post(dataTable.queryUrl, queryParam, {
    headers: dataTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  dataTable.execQueryResult(resQuery);
  const resData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data || {};
  const items = Array.isArray(resData.Items) ? resData.Items : [];
  const returnData = new clientData();
  returnData.dataTable = dataTable;
  returnData.list = items;
  returnData.total = Number(resData.Count ?? items.length ?? 0);
  return returnData;
}

function sumCount(list: any[], field: string) {
  return list.reduce((sum, item) => {
    const value = Number(item?.[field] ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildPendingInReason(pendingInNos: string[]) {
  const noText = pendingInNos.length > 0 ? ` ${pendingInNos.join('、')}` : '';
  return `该采购订单当前仓库已有待审批采购入库单${noText}，请先审批或删除后再生成`;
}

export async function getPurchaseInGenerateStatus(
  orderId?: string | number,
  warehouseId?: string | number,
) {
  const order_id = String(orderId || '').trim();
  const warehouse_id = String(warehouseId || '').trim();
  if (!order_id) return { canGenerate: false, reason: '缺少采购订单编号' };

  const order = await getPurchaseInOrder(order_id);
  const orderItems = Array.isArray((order as any)?.items)
    ? ((order as any).items as any[])
    : [];
  const targetItems = warehouse_id
    ? orderItems.filter(
        (item: any) => String(item?.warehouse_id || '') === warehouse_id,
      )
    : orderItems;

  const totalCount = sumCount(targetItems, 'count');
  const approvedInCount = sumCount(targetItems, 'in_count');
  const remainingCount = Math.max(totalCount - approvedInCount, 0);
  const related = await getPurchaseInPage({
    order_id,
    warehouse_id,
    page: 0,
    pageNo: 1,
  });
  const relatedList = Array.isArray(related?.list) ? related.list : [];
  const pendingList = relatedList.filter(
    (item: any) => Number(item?.status) === 10,
  );
  const approvedList = relatedList.filter(
    (item: any) => Number(item?.status) === 20,
  );
  const hasPending = pendingList.length > 0;
  const pendingInNos = pendingList
    .map((item: any) => String(item?.no || '').trim())
    .filter(Boolean);
  const isCompleted = totalCount > 0 && remainingCount <= 0;
  let reason = '';
  if (hasPending) reason = buildPendingInReason(pendingInNos);
  else if (!targetItems.length)
    reason = warehouse_id
      ? '该仓库下没有可生成的采购订单明细'
      : '该采购订单没有可生成的明细';
  else if (isCompleted) reason = '该采购订单当前仓库已全部入库';
  return {
    canGenerate: Boolean(targetItems.length) && !hasPending && !isCompleted,
    reason,
    order_id,
    warehouse_id,
    totalCount,
    approvedInCount,
    remainingCount,
    pendingCount: pendingList.length,
    approvedCount: approvedList.length,
    pendingList,
    approvedList,
    pendingInNos,
  };
}

export async function assertPurchaseInCanGenerate(
  orderId?: string | number,
  warehouseId?: string | number,
) {
  const status = await getPurchaseInGenerateStatus(orderId, warehouseId);
  if (!status.canGenerate) {
    throw new Error(status.reason || '该采购订单当前仓库不可生成采购入库单');
  }
  return status;
}

export async function getPurchaseIn(id: string) {
  const dataTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  dataTable.Filter = and(cond(CommonKeyField, 'equal', id));
  const queryParam = { Table: [dataTable], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(dataTable.queryUrl, queryParam, {
    headers: dataTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  dataTable.execQueryResult(resQuery);
  const resultData =
    resQuery.data?.Result?.data?.Items?.[0] ||
    resQuery.data?.Result.Items?.[0] ||
    resQuery.data.Items?.[0];
  const resQueryItem = await queryPurchaseInItems({ in_id: id });
  resultData.items = resQueryItem.list || [];
  return resultData;
}

export async function createPurchaseIn(data: ErpPurchaseInApi.PurchaseIn) {
  const dataTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  const itemData = Array.isArray(data?.items) ? data.items : [];
  if (data?.order_id && data?.warehouse_id) {
    await assertPurchaseInCanGenerate(data.order_id, data.warehouse_id);
  }
  const uid = generateUUID();
  const newItem = itemData.map((item: any) => ({
    ...item,
    id: item.id || generateUUID(),
    in_id: uid,
  }));

  if (itemData.length > 0) await addPurchaseInItems(newItem);

  const newData = {
    ...data,
    id: uid,
    status: data?.status ?? 10,
    warehouse_inbound: data?.warehouse_name ?? data?.warehouse_inbound,
  };
  delete data.items;
  const saveParam = dataTable.getSaveParam([newData], [], []);
  const res = await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });

  let inNo = data.no;
  if (res) {
    try {
      const codeRes = await getCodeString(
        uid,
        '591CF84D1D38DF17254C32D08455098C',
        dataTable.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        inNo = codeRes.Message;
        const updateData = {
          id: uid,
          no: codeRes.Message,
          warehouse_id: data.warehouse_id,
          warehouse_inbound: data.warehouse_name ?? data.warehouse_inbound,
        };
        const updateParam = dataTable.getSaveParam([], [updateData], []);
        await requestClient.post(dataTable.saveUrl, updateParam, {
          headers: dataTable.getRequestHeader(),
        });
      } else {
        await deletePurchaseIn([uid]);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deletePurchaseIn([uid]);
      throw error;
    }
  }

  return { ...(res as any), id: uid, no: inNo } as any;
}

export async function updatePurchaseIn(data: ErpPurchaseInApi.PurchaseIn) {
  const dataTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  const itemData = Array.isArray(data?.items) ? data.items : [];
  if (itemData.length > 0) {
    const newItem = itemData.map((item: any) => {
      const payload: any = {
        id: item.id,
        in_id: item.in_id,
        order_item_id: item.order_item_id,
        warehouse_id: item.warehouse_id,
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        count: item.count,
        remark: item.remark,
      };
      [
        'product_price',
        'total_product_price',
        'total_price',
        'tax_percent',
        'tax_price',
        'product_unit_name',
      ].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(item, field))
          payload[field] = item[field];
      });
      return payload;
    });
    await updatePurchaseInItems(newItem);
  }
  delete data.items;
  const {
    id,
    no,
    supplier_id,
    order_id,
    order_no,
    in_time,
    total_count,
    total_price,
    status,
    remark,
    out_count,
    return_count,
    discount_percent,
    discount_price,
    payment_price,
    other_price,
    total_product_price,
    tax_price,
    account_id,
    warehouse_id,
    warehouse_name,
    warehouse_inbound,
  } = data;
  const pureData = {
    id,
    no,
    supplier_id,
    order_id,
    order_no,
    in_time,
    total_count,
    total_price,
    status,
    remark,
    out_count,
    return_count,
    discount_percent,
    discount_price,
    payment_price,
    other_price,
    total_product_price,
    tax_price,
    account_id,
    warehouse_id,
    warehouse_inbound: warehouse_name ?? warehouse_inbound,
  };
  const saveParam = dataTable.getSaveParam([], [pureData], []);
  return await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });
}

export async function updatePurchaseInStatus(
  id: number | string,
  status: number,
) {
  const inId = String(id);
  const purchaseInTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  const inDoc = await getPurchaseIn(inId);
  if (!inDoc) throw new Error('未找到该入库单');
  const currentStatus = Number((inDoc as any).status);
  if (Number(status) === 10 && currentStatus !== 20)
    throw new Error('该入库单未审核，无需反审核');
  if (Number(status) === 20 && currentStatus === 20) {
    const saveParam = purchaseInTable.getSaveParam(
      [],
      [{ id: inId, status }],
      [],
    );
    return await requestClient.post(purchaseInTable.saveUrl, saveParam, {
      headers: purchaseInTable.getRequestHeader(),
    });
  }
  if (Number(status) !== 20 && Number(status) !== 10) {
    const saveParam = purchaseInTable.getSaveParam(
      [],
      [{ id: inId, status }],
      [],
    );
    return await requestClient.post(purchaseInTable.saveUrl, saveParam, {
      headers: purchaseInTable.getRequestHeader(),
    });
  }

  const itemRows = Array.isArray((inDoc as any).items)
    ? ((inDoc as any).items as any[])
    : [];
  if (itemRows.length === 0) {
    const saveParam = purchaseInTable.getSaveParam(
      [],
      [{ id: inId, status }],
      [],
    );
    return await requestClient.post(purchaseInTable.saveUrl, saveParam, {
      headers: purchaseInTable.getRequestHeader(),
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
      (r as any).warehouse_id ??
        (inDoc as any)?.warehouse_id ??
        (inDoc as any)?.warehouse_inbound ??
        '',
    );
    const qty = Number((r as any).count ?? 0);
    if (!product_id || !warehouse_id)
      throw new Error('入库明细缺少产品或仓库信息');
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
    const saveParam = purchaseInTable.getSaveParam(
      [],
      [{ id: inId, status }],
      [],
    );
    return await requestClient.post(purchaseInTable.saveUrl, saveParam, {
      headers: purchaseInTable.getRequestHeader(),
    });
  }

  const stockTable = createStockTable(PURCHASE_IN_FORM_KEY);
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
    {
      headers: stockTable.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  stockTable.execQueryResult(stockRes);

  const stockItems = (stockRes.data?.Result?.data?.Items || []) as any[];
  const stockMap = new Map<PairKey, any>();
  for (const s of stockItems) {
    const product_id = String(s.product_id ?? '');
    const warehouse_id = String(s.warehouse_id ?? '');
    const key = `${product_id}@@${warehouse_id}`;
    if (stockMap.has(key))
      throw new Error(
        `库存表存在重复记录：product_id=${product_id}, warehouse_id=${warehouse_id}`,
      );
    stockMap.set(key, s);
  }

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
      throw new Error(
        `产品缺少分类信息(category_id/product_type)：product_id=${productId}`,
      );
    const unit_name = String(
      item?.product_unit_name ??
        item?.unit_name ??
        item?.product_unit_id ??
        p.unit ??
        p.unit_name ??
        '',
    ).trim();
    if (!unit_name)
      throw new Error(
        `产品缺少单位名称(unit/product_unit_id)：product_id=${productId}`,
      );
    const unit_id = String(item?.product_unit_id ?? unit_name).trim();
    const product_name = String(
      p.product_name ?? item?.product_name ?? '',
    ).trim();
    return { category_id, unit_id, unit_name, product_name };
  }

  const now = new Date()
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '')
    .slice(0, 19);
  const stockAdded: any[] = [];
  const stockChanged: any[] = [];
  const deltas: StockDelta[] = [];
  const bizNo = String((inDoc as any).no ?? inId);

  if (Number(status) === 20) {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (stockRow) {
        const currentCount = Number(stockRow.count ?? 0);
        const newCount =
          (Number.isFinite(currentCount) ? currentCount : 0) + p.qty;
        stockChanged.push({
          rowid: stockRow.rowid,
          lingma_sys_key: stockRow.lingma_sys_key,
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
  } else {
    for (const p of pairs) {
      const key = `${p.product_id}@@${p.warehouse_id}`;
      const stockRow = stockMap.get(key);
      if (!stockRow)
        throw new Error(
          `反审核失败：产品${p.product_id} 仓库${p.warehouse_id} 无库存记录`,
        );
      const currentCount = Number(stockRow.count ?? 0);
      const baseCount = Number.isFinite(currentCount) ? currentCount : 0;
      const newCount = baseCount - p.qty;
      stockChanged.push({
        rowid: stockRow.rowid,
        lingma_sys_key: stockRow.lingma_sys_key,
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
  }

  const stockRecord = await buildStockRecordAdds(
    deltas,
    {
      biz_type: Number(status) === 20 ? 1 : 2,
      biz_no: bizNo,
      description: Number(status) === 20 ? '采购入库' : '采购入库反审批',
      biz_time: (inDoc as any).in_time,
    },
    PURCHASE_IN_FORM_KEY,
  );

  const orderId = (inDoc as any)?.order_id;
  const orderItemChanged: any[] = [];
  if (orderId) {
    try {
      const { list: orderItems } = await getPurchaseInOrderItemPage({
        order_id: orderId,
      });
      const orderItemsList = Array.isArray(orderItems) ? orderItems : [];
      for (const inItem of itemRows) {
        const orderItemId = (inItem as any).order_item_id;
        if (!orderItemId) continue;
        const targetOrderItem = orderItemsList.find(
          (oi: any) => oi.rowid === orderItemId || oi.id === orderItemId,
        );
        if (!targetOrderItem) continue;
        const currentInCount = Number(targetOrderItem.in_count || 0);
        const delta = Number((inItem as any).count || 0);
        if (!Number.isFinite(delta) || delta <= 0) continue;
        const newInCount =
          Number(status) === 20
            ? currentInCount + delta
            : currentInCount - delta;
        const pk = targetOrderItem.id ?? targetOrderItem.rowid;
        if (!pk) continue;
        orderItemChanged.push({ id: pk, in_count: newInCount });
      }
      if (orderItemChanged.length > 0) {
        const merged = new Map<string, any>();
        for (const u of orderItemChanged) merged.set(String(u.id), u);
        await updatePurchaseInOrderItem([...merged.values()]);
      }
      const latestOrder = await getPurchaseInOrder(String(orderId));
      const latestOrderItems = Array.isArray((latestOrder as any)?.items)
        ? ((latestOrder as any).items as any[])
        : [];
      const totalOrderCount = latestOrderItems.reduce(
        (sum: number, item: any) => sum + Number(item.count || 0),
        0,
      );
      const totalInCount = latestOrderItems.reduce(
        (sum: number, item: any) => sum + Number(item.in_count || 0),
        0,
      );
      let inStatus = 0;
      if (totalInCount > 0 && totalInCount < totalOrderCount) inStatus = 1;
      else if (totalOrderCount > 0 && totalInCount >= totalOrderCount)
        inStatus = 2;
      await updatePurchaseInOrder({
        id: String(orderId),
        in_count: totalInCount,
        in_status: inStatus,
      } as any);
    } catch (error) {
      console.error('同步更新采购订单入库数量失败', error);
      throw error;
    }
  }

  const stockSaveParam = stockTable.getSaveParam(stockAdded, stockChanged, []);
  if (stockSaveParam.length > 0) {
    await requestClient.post(stockTable.saveUrl, stockSaveParam, {
      headers: stockTable.getRequestHeader(),
    });
  }
  const stockRecordSaveParam = stockRecord.table.getSaveParam(
    stockRecord.adds,
    [],
    [],
  );
  if (stockRecordSaveParam.length > 0) {
    await requestClient.post(stockRecord.table.saveUrl, stockRecordSaveParam, {
      headers: stockRecord.table.getRequestHeader(),
    });
  }
  const purchaseInSaveParam = purchaseInTable.getSaveParam(
    [],
    [{ id: inId, status }],
    [],
  );
  return await requestClient.post(
    purchaseInTable.saveUrl,
    purchaseInSaveParam,
    { headers: purchaseInTable.getRequestHeader() },
  );
}

export async function deletePurchaseIn(ids: number[] | string[]) {
  const dataTable = createFinanceDataTable(
    CommonTableId,
    CommonTableName,
    CommonDbName,
    CommonKeyField,
  );
  const deleteList = ids.map((id) => ({ [CommonKeyField]: id }));
  const saveParam = dataTable.getSaveParam([], [], deleteList);
  return await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });
}

export function exportPurchaseIn(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: CommonTableId,
      tableName: CommonTableName,
      dbName: CommonDbName,
      primaryKey: CommonKeyField,
      fileName: '采购入库',
      encodingId,
      extraData: params,
    });
  }
  return requestClient.download('/erp/purchase-in/export-excel', { params });
}
