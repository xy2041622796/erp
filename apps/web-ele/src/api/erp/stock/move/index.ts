import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { getProduct } from '#/api/erp/product/product';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import { createStockTable } from '#/api/erp/stock/stock';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import { getProductSimpleList } from '../../product/product';
import { getWarehouseSimpleList } from '../warehouse';
import {
  addStockMoveItems,
  deleteStockMoveItems,
  queryStockMoveItems,
  updateStockMoveItems,
} from './moveItems';

export namespace ErpStockMoveApi {
  export interface StockMove {
    id?: string;
    no?: string;
    move_time?: Date | string;
    from_warehouse_id?: string;
    to_warehouse_id?: string;
    total_count?: number;
    total_price?: number;
    status?: number;
    remark?: string;
    file_url?: string;
    create_time?: Date | string;
    creator?: string;
    update_time?: Date | string;
    updater?: string;
    tenant_id?: number | string;
    deleted?: number;
    items?: StockMoveItem[];
    rowid?: string;

    outTime?: Date | string;
    totalCount?: number;
    totalPrice?: number;
    fileUrl?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    createTime?: Date | string;
    creatorName?: string;
    productNames?: string;
    displayNo?: string;
    fromWarehouseName?: string;
    toWarehouseName?: string;
    productNamesDisplay?: string;
  }

  export interface StockMoveItem {
    seq?: string;
    id?: string;
    move_id?: string;
    product_id?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_id?: string;
    product_unit_name?: string;
    product_price?: number;
    count?: number;
    total_price?: number;
    remark?: string;
    stock_count?: number;
    rowid?: string;

    productId?: string;
    productName?: string;
    productBarCode?: string;
    productUnitId?: string;
    productUnitName?: string;
    productPrice?: number;
    totalPrice?: number;
    stockCount?: number;
  }
}

const STOCK_MOVE_MODEL_ID = '925044BFD709A2A1937EE885945B01C3';
const STOCK_MOVE_TABLE = 'erp_stock_move';
const STOCK_MOVE_DB = 'LMBill';
const STOCK_MOVE_PK = 'id';
const DEFAULT_STOCK_MOVE_STATUS = 10;

function getStockMoveTable() {
  return createFinanceDataTable(
    STOCK_MOVE_MODEL_ID,
    STOCK_MOVE_TABLE,
    STOCK_MOVE_DB,
    STOCK_MOVE_PK,
  );
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isNil(value: unknown) {
  return value === undefined || value === null || value === '';
}

function buildDisplayNo(order: any) {
  const no = String(order?.no || '').trim();
  if (no) return no;
  const id = String(order?.id || order?.rowid || '').trim();
  return id ? `调拨-${id.slice(-8)}` : '-';
}

function withItemAlias(item: any) {
  return {
    ...item,
    productId: item.product_id,
    productName: item.product_name,
    productBarCode: item.product_bar_code,
    productUnitId: item.product_unit_id,
    productUnitName: item.product_unit_name,
    productPrice: item.product_price,
    totalPrice: item.total_price,
    stockCount: item.stock_count,
  };
}

function withAlias(order: any) {
  const displayNo = buildDisplayNo(order);
  return {
    ...order,
    no: order?.no ?? displayNo,
    outTime: order.move_time,
    totalCount: order.total_count,
    totalPrice: order.total_price,
    fileUrl: order.file_url,
    fromWarehouseId: order.from_warehouse_id,
    toWarehouseId: order.to_warehouse_id,
    createTime: order.create_time,
    creatorName: order.creator_name,
    productNames: order.product_names,
    displayNo,
    fromWarehouseName: order.fromWarehouseName ?? '',
    toWarehouseName: order.toWarehouseName ?? '',
    productNamesDisplay:
      order.productNamesDisplay ?? order.product_names ?? order.productNames ?? '',
    items: Array.isArray(order.items) ? order.items.map(withItemAlias) : order.items,
  };
}

async function enrichMoveList(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const [warehouses, products] = await Promise.all([
    getWarehouseSimpleList().catch(() => []),
    getProductSimpleList().catch(() => []),
  ]);

  const warehouseMap = new Map<string, string>();
  for (const item of Array.isArray(warehouses) ? warehouses : []) {
    const key = String(item?.rowid || item?.id || '').trim();
    if (!key) continue;
    warehouseMap.set(key, String(item?.name || key));
  }

  const productMap = new Map<string, string>();
  for (const item of Array.isArray(products) ? products : []) {
    const key = String(item?.rowid || item?.id || '').trim();
    if (!key) continue;
    productMap.set(
      key,
      String(item?.product_name || item?.name || item?.product_code || key),
    );
  }

  const detailResults = await Promise.all(
    list.map(async (row) => {
      const moveId = String(row?.id || row?.rowid || '').trim();
      if (!moveId) return [];
      try {
        const detailRes = await queryStockMoveItems({ move_id: moveId });
        return Array.isArray(detailRes?.list) ? detailRes.list : [];
      } catch {
        return [];
      }
    }),
  );

  return list.map((row, index) => {
    const details = detailResults[index] || [];
    const productNames = details
      .map((item: any) => {
        const productId = String(item?.product_id || item?.productId || '').trim();
        const directName = String(item?.product_name || item?.productName || '').trim();
        return directName || productMap.get(productId) || productId;
      })
      .filter(Boolean);

    const uniqueProductNames = [...new Set(productNames)];
    const fromWarehouseId = String(row?.from_warehouse_id || row?.fromWarehouseId || '').trim();
    const toWarehouseId = String(row?.to_warehouse_id || row?.toWarehouseId || '').trim();

    return withAlias({
      ...row,
      fromWarehouseName:
        warehouseMap.get(fromWarehouseId) || row?.fromWarehouseName || fromWarehouseId || '-',
      toWarehouseName:
        warehouseMap.get(toWarehouseId) || row?.toWarehouseName || toWarehouseId || '-',
      product_names: uniqueProductNames.join('、'),
      productNamesDisplay: uniqueProductNames.join('、') || '-',
      items: details,
    });
  });
}

function sanitizeStockMoveItemForSave(item: any, moveId?: string) {
  const count = toNumber(item?.count);
  const productPrice = toNumber(item?.product_price ?? item?.productPrice);
  const totalPrice =
    toNumber(item?.total_price ?? item?.totalPrice) ||
    (count > 0 && productPrice > 0 ? count * productPrice : 0);

  return {
    id: item?.id,
    move_id: item?.move_id ?? moveId,
    product_id: item?.product_id ?? item?.productId,
    product_name: item?.product_name ?? item?.productName,
    product_bar_code: item?.product_bar_code ?? item?.productBarCode,
    product_unit_id: item?.product_unit_id ?? item?.productUnitId,
    product_unit_name: item?.product_unit_name ?? item?.productUnitName,
    product_price: productPrice,
    count,
    total_price: totalPrice,
    remark: item?.remark,
    stock_count: item?.stock_count ?? item?.stockCount,
  };
}

function sanitizeStockMoveForSave(
  data: ErpStockMoveApi.StockMove,
  moveId?: string,
  options: { isCreate?: boolean } = {},
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const total_count = items.reduce((sum, item: any) => sum + toNumber(item?.count), 0);
  const total_price = items.reduce(
    (sum, item: any) => sum + toNumber(item?.total_price ?? item?.totalPrice),
    0,
  );

  const result: Record<string, any> = {
    id: moveId ?? data.id,
    no: data.no,
    move_time: data.move_time ?? data.outTime,
    from_warehouse_id: data.from_warehouse_id ?? data.fromWarehouseId,
    to_warehouse_id: data.to_warehouse_id ?? data.toWarehouseId,
    total_count: data.total_count ?? data.totalCount ?? total_count,
    total_price: data.total_price ?? data.totalPrice ?? total_price,
    remark: data.remark,
    file_url: data.file_url ?? data.fileUrl,
    create_time: data.create_time ?? data.createTime,
    creator: data.creator,
    update_time: data.update_time,
    updater: data.updater,
    tenant_id: data.tenant_id,
    deleted: data.deleted,
  };

  if (options.isCreate) {
    result.status = isNil(data.status) ? DEFAULT_STOCK_MOVE_STATUS : data.status;
  } else if (!isNil(data.status)) {
    result.status = data.status;
  }

  return result;
}

async function resolveStockRequiredFields(productId: string, unitNameToId: Map<string, string>) {
  const product = await getProduct(productId).catch(() => null);
  const unitName = String(product?.unit || product?.unit_name || '').trim();

  return {
    category_id: product?.category_id ?? product?.product_category_id ?? product?.product_type,
    product_name: product?.product_name ?? product?.name,
    unit_id: product?.unit_id ?? unitNameToId.get(unitName) ?? product?.unit,
    unit_name: unitName,
  };
}

function getMoveId(data: ErpStockMoveApi.StockMove) {
  return String(data?.id || data?.rowid || generateUUID());
}

/** 查询库存调拨分页 */
export async function getStockMovePage(params: any) {
  const table = getStockMoveTable();
  const filters: any[] = [];

  if (params?.no) {
    filters.push(cond('no', 'contains', params.no));
  }
  if (!isNil(params?.status)) {
    filters.push(cond('status', 'equal', params.status));
  }
  const fromWarehouseId = params?.from_warehouse_id ?? params?.fromWarehouseId;
  if (!isNil(fromWarehouseId)) {
    filters.push(cond('from_warehouse_id', 'equal', fromWarehouseId));
  }
  const toWarehouseId = params?.to_warehouse_id ?? params?.toWarehouseId;
  if (!isNil(toWarehouseId)) {
    filters.push(cond('to_warehouse_id', 'equal', toWarehouseId));
  }
  const moveTime = params?.move_time ?? params?.outTime;
  if (Array.isArray(moveTime) && moveTime.length === 2) {
    filters.push(cond('move_time', 'greaterthanorequal', moveTime[0]));
    filters.push(cond('move_time', 'lessthanorequal', moveTime[1]));
  }

  table.Filter = filters.length > 0 ? and(...filters) : null;

  const queryParam = table.getQueryParam(
    'Table',
    table.Filter,
    null,
    null,
    toNumber(params?.page ?? params?.pageSize) || 10,
    toNumber(params?.pageNo ?? params?.index) || 1,
  );

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery.data);
  const resData = resQuery.data?.Result?.data || {};
  const list = await enrichMoveList(Array.isArray(resData.Items) ? resData.Items : []);

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = list;
  returnData.total = resData.Count || list.length || 0;
  return returnData;
}

/** 查询库存调拨详情 */
export async function getStockMove(id: string) {
  const table = getStockMoveTable();
  table.Filter = and(cond(STOCK_MOVE_PK, 'equal', id));

  const queryParam = table.getQueryParam('Table', table.Filter, null, null, 1, 1);
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  } as any);

  table.execQueryResult(resQuery.data);
  const items = resQuery.data?.Result?.data?.Items || [];
  const row = Array.isArray(items) && items.length > 0 ? items[0] : null;
  if (!row) return null;

  const detailRes = await queryStockMoveItems({ move_id: id }).catch(() => null);
  const details = Array.isArray(detailRes?.list) ? detailRes.list : [];
  const enriched = await enrichMoveList([{ ...row, items: details }]);
  return enriched[0] || withAlias({ ...row, items: details });
}

/** 新增库存调拨 */
export async function createStockMove(data: ErpStockMoveApi.StockMove) {
  const stockMoveTable = getStockMoveTable();
  const moveId = getMoveId(data);
  const moveDoc = sanitizeStockMoveForSave(data, moveId, { isCreate: true });
  const items = (Array.isArray(data.items) ? data.items : []).map((item) =>
    sanitizeStockMoveItemForSave(item, moveId),
  );

  const reqList = stockMoveTable.getSaveParam([moveDoc], [], []);
  await requestClient.post(stockMoveTable.saveUrl, reqList, {
    headers: stockMoveTable.getRequestHeader(),
  });

  if (items.length > 0) {
    await addStockMoveItems(items);
  }
}

/** 修改库存调拨 */
export async function updateStockMove(data: ErpStockMoveApi.StockMove) {
  const stockMoveTable = getStockMoveTable();
  const moveId = getMoveId(data);
  const moveDoc = sanitizeStockMoveForSave(data, moveId);
  const nextItems = (Array.isArray(data.items) ? data.items : []).map((item) =>
    sanitizeStockMoveItemForSave(item, moveId),
  );

  const saveParam = stockMoveTable.getSaveParam([], [moveDoc], []);
  await requestClient.post(stockMoveTable.saveUrl, saveParam, {
    headers: stockMoveTable.getRequestHeader(),
  });

  const oldDetailRes = await queryStockMoveItems({ move_id: moveId }).catch(() => null);
  const oldItems = Array.isArray(oldDetailRes?.list) ? oldDetailRes.list : [];
  const oldIds = oldItems.map((item: any) => item?.id).filter(Boolean);
  if (oldIds.length > 0) {
    await deleteStockMoveItems(oldIds);
  }
  if (nextItems.length > 0) {
    await addStockMoveItems(nextItems);
  }
}

/** 更新库存调拨状态，并同步库存和库存明细 */
export async function updateStockMoveStatus(moveId: string, nextStatus: number) {
  const moveDoc = await getStockMove(moveId);
  if (!moveDoc) throw new Error('库存调拨单不存在');

  const fromWarehouseId = await normalizeWarehouseIdToRowid(moveDoc.from_warehouse_id ?? moveDoc.fromWarehouseId ?? '');
  const toWarehouseId = await normalizeWarehouseIdToRowid(moveDoc.to_warehouse_id ?? moveDoc.toWarehouseId ?? '');
  if (!fromWarehouseId) throw new Error('库存调拨失败：调出仓库为空');
  if (!toWarehouseId) throw new Error('库存调拨失败：调入仓库为空');
  if (fromWarehouseId === toWarehouseId) throw new Error('库存调拨失败：调出仓库和调入仓库不能相同');

  const details = Array.isArray(moveDoc.items) ? moveDoc.items : [];
  const productPairs = details
    .map((item: any) => ({
      product_id: String(item?.product_id ?? item?.productId ?? '').trim(),
      qty: toNumber(item?.count),
    }))
    .filter((item: any) => item.product_id && item.qty > 0);

  if (productPairs.length === 0) throw new Error('库存调拨失败：调拨明细为空');

  const stockTable = createStockTable();
  const stockMoveTable = getStockMoveTable();
  const productWarehouseFilters = productPairs.flatMap((p: any) => [
    and(cond('product_id', 'equal', p.product_id), cond('warehouse_id', 'equal', fromWarehouseId)),
    and(cond('product_id', 'equal', p.product_id), cond('warehouse_id', 'equal', toWarehouseId)),
  ]);

  stockTable.Filter = productWarehouseFilters.length > 1 ? or(...productWarehouseFilters) : productWarehouseFilters[0];
  const stockQueryParam = stockTable.getQueryParam('Table', stockTable.Filter, null, null, 0, 1);
  const stockRes = await requestClient.post(stockTable.queryUrl, stockQueryParam, {
    headers: stockTable.getRequestHeader(),
    responseReturn: 'raw',
  } as any);
  stockTable.execQueryResult(stockRes.data);

  const stockRows = stockRes.data?.Result?.data?.Items || [];
  const stockMap = new Map<string, any>();
  for (const row of Array.isArray(stockRows) ? stockRows : []) {
    const key = `${row?.product_id}@@${row?.warehouse_id}`;
    stockMap.set(key, row);
  }

  const unitNameToId = new Map<string, string>();
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
  const stockAdded: any[] = [];
  const stockChanged: any[] = [];
  const outDeltas: StockDelta[] = [];
  const inDeltas: StockDelta[] = [];

  if (nextStatus === 20) {
    for (const p of productPairs) {
      const outKey = `${p.product_id}@@${fromWarehouseId}`;
      const inKey = `${p.product_id}@@${toWarehouseId}`;
      const fromStockRow = stockMap.get(outKey);
      const toStockRow = stockMap.get(inKey);
      const fromCurrent = Number(fromStockRow?.count ?? 0);
      if (!fromStockRow) {
        throw new Error(`库存不足：产品${p.product_id} 调出仓${fromWarehouseId} 无库存记录`);
      }
      if (!Number.isFinite(fromCurrent) || fromCurrent < p.qty) {
        throw new Error(`库存不足：产品${p.product_id} 调出仓${fromWarehouseId} 当前${fromCurrent}，需调拨${p.qty}`);
      }
      const fromNew = fromCurrent - p.qty;
      stockChanged.push({ rowid: fromStockRow.rowid, count: fromNew, update_time: now });
      outDeltas.push({ product_id: p.product_id, warehouse_id: fromWarehouseId, delta: -p.qty, total_count: fromNew });

      if (toStockRow) {
        const toCurrent = Number(toStockRow.count ?? 0);
        const toNew = (Number.isFinite(toCurrent) ? toCurrent : 0) + p.qty;
        stockChanged.push({ rowid: toStockRow.rowid, count: toNew, update_time: now });
        inDeltas.push({ product_id: p.product_id, warehouse_id: toWarehouseId, delta: p.qty, total_count: toNew });
      } else {
        const required = await resolveStockRequiredFields(p.product_id, unitNameToId);
        stockAdded.push({
          rowid: generateUUID(),
          product_id: p.product_id,
          warehouse_id: toWarehouseId,
          count: p.qty,
          category_id: required.category_id,
          unit_id: required.unit_id,
          unit_name: required.unit_name,
          product_name: required.product_name || undefined,
          create_time: now,
          update_time: now,
        });
        inDeltas.push({ product_id: p.product_id, warehouse_id: toWarehouseId, delta: p.qty, total_count: p.qty });
      }
    }
  } else {
    for (const p of productPairs) {
      const outKey = `${p.product_id}@@${fromWarehouseId}`;
      const inKey = `${p.product_id}@@${toWarehouseId}`;
      const fromStockRow = stockMap.get(outKey);
      const toStockRow = stockMap.get(inKey);
      const toCurrent = Number(toStockRow?.count ?? 0);
      if (!toStockRow) {
        throw new Error(`撤销完成失败：产品${p.product_id} 调入仓${toWarehouseId} 无库存记录`);
      }
      if (!Number.isFinite(toCurrent) || toCurrent < p.qty) {
        throw new Error(`撤销完成失败：产品${p.product_id} 调入仓${toWarehouseId} 当前${toCurrent}，需回退${p.qty}`);
      }
      const toNew = toCurrent - p.qty;
      stockChanged.push({ rowid: toStockRow.rowid, count: toNew, update_time: now });
      outDeltas.push({ product_id: p.product_id, warehouse_id: toWarehouseId, delta: -p.qty, total_count: toNew });

      if (fromStockRow) {
        const fromCurrent = Number(fromStockRow.count ?? 0);
        const fromNew = (Number.isFinite(fromCurrent) ? fromCurrent : 0) + p.qty;
        stockChanged.push({ rowid: fromStockRow.rowid, count: fromNew, update_time: now });
        inDeltas.push({ product_id: p.product_id, warehouse_id: fromWarehouseId, delta: p.qty, total_count: fromNew });
      } else {
        const required = await resolveStockRequiredFields(p.product_id, unitNameToId);
        stockAdded.push({
          rowid: generateUUID(),
          product_id: p.product_id,
          warehouse_id: fromWarehouseId,
          count: p.qty,
          category_id: required.category_id,
          unit_id: required.unit_id,
          unit_name: required.unit_name,
          product_name: required.product_name || undefined,
          create_time: now,
          update_time: now,
        });
        inDeltas.push({ product_id: p.product_id, warehouse_id: fromWarehouseId, delta: p.qty, total_count: p.qty });
      }
    }
  }

  const bizNo = String((moveDoc as any).no ?? moveId);
  const outRecord = await buildStockRecordAdds(outDeltas, {
    biz_type: 2,
    biz_no: bizNo,
    description: nextStatus === 20 ? '库存调拨-调出' : '库存调拨撤销-调出回退',
    biz_time: (moveDoc as any).move_time ?? (moveDoc as any).outTime,
  });
  const inRecord = await buildStockRecordAdds(inDeltas, {
    biz_type: 1,
    biz_no: bizNo,
    description: nextStatus === 20 ? '库存调拨-调入' : '库存调拨撤销-调入回退',
    biz_time: (moveDoc as any).move_time ?? (moveDoc as any).outTime,
  });

  const reqList = [
    ...stockTable.getSaveParam(stockAdded, stockChanged, []),
    ...outRecord.table.getSaveParam(outRecord.adds, [], []),
    ...inRecord.table.getSaveParam(inRecord.adds, [], []),
    ...stockMoveTable.getSaveParam([], [{ id: moveId, status: nextStatus }], []),
  ];
  return await requestClient.post(stockMoveTable.saveUrl, reqList, {
    headers: stockMoveTable.getRequestHeader(),
  });
}

export async function deleteStockMove(ids: string | string[]) {
  const stockMoveTable = getStockMoveTable();
  let delArr: any[] = [];
  if (Array.isArray(ids)) delArr = ids.map((id) => ({ [STOCK_MOVE_PK]: id }));
  else if (typeof ids === 'string') {
    delArr = ids.split(',').map((id) => ({ [STOCK_MOVE_PK]: id }));
  }
  const saveParam = stockMoveTable.getSaveParam([], [], delArr);
  return await requestClient.post(stockMoveTable.saveUrl, saveParam, {
    headers: stockMoveTable.getRequestHeader(),
  });
}

export function exportStockMove(params: any) {
  return requestClient.download('/erp/stock-move/export-excel', { params });
}
