import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { getProduct } from '#/api/erp/product/product';
import { applyReturnCheckProcessedDelta } from '#/api/erp/stock/return-check';
import { getPurchaseReturn, getPurchaseReturnPage } from '#/api/erp/purchase/return';
import { updatePurchaseReturnItems } from '#/api/erp/purchase/return/returnItems';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import {
  STOCK_DB_NAME, STOCK_MODEL_ID, STOCK_PK, STOCK_TABLE_NAME, } from '#/api/erp/stock/stock';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import { getCodeString } from '#/api/system/coding';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import {
  addPurchaseReturnOutItems,
  deletePurchaseReturnOutItems,
  queryPurchaseReturnOutItems,
  updatePurchaseReturnOutItems,
} from './items';

export namespace ErpPurchaseReturnOutApi {
  export interface PurchaseReturnOut {
    id?: string;
    no?: string;
    status?: number;
    return_id?: string;
    return_no?: string;
    supplier_id?: string;
    warehouse_id?: string;
    warehouse_outbound?: string;
    out_time?: string;
    total_count?: number;
    remark?: string;
    createuser?: string;
    items?: PurchaseReturnOutItem[];
  }

  export interface PurchaseReturnOutItem {
    id?: string;
    out_id?: string;
    return_item_id?: string;
    warehouse_id?: string;
    product_id?: string;
    product_unit_id?: string;
    source_count?: number;
    count?: number;
    remark?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_name?: string;
    stock_count?: number;
    out_count?: number;
    source_check_item_id?: string;
    source_check_scope?: string;
  }
}

export const PURCHASE_RETURN_OUT_FORM_KEY = '08518559F17B09E8B52F90B26134ED9B';
const PURCHASE_RETURN_OUT_CODING_ID = 'FE8402EB58D1E13C262125F77636FDF1';
const TABLE_NAME = 'erp_purchase_return_out';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';
const PURCHASE_RETURN_MODEL_ID = '9BF89A303AED38F93A788064E37724FB';

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function nowMysql() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

function buildTempNo(prefix: string) {
  return prefix + Date.now();
}

function getTable() {
  return createFinanceDataTable(
    PURCHASE_RETURN_OUT_FORM_KEY,
    TABLE_NAME,
    DB_NAME,
    PK_FIELD,
  );
}

async function assignPurchaseReturnOutNo(docId: string, table = getTable()) {
  const codeRes = await getCodeString(
    docId,
    PURCHASE_RETURN_OUT_CODING_ID,
    table.getRequestHeader(),
  );
  if (!(codeRes?.Code === 200 && codeRes?.Message)) {
    throw new Error(codeRes?.Message || '获取采购退货出库编号失败');
  }
  const updateTable = getTable();
  const updateParam = updateTable.getSaveParam([], [{ id: docId, no: codeRes.Message }], []);
  await requestClient.post(updateTable.saveUrl, updateParam, {
    headers: updateTable.getRequestHeader(),
  });
  return codeRes.Message;
}

function getReturnTable() {
  return createFinanceDataTable(
    PURCHASE_RETURN_MODEL_ID,
    'erp_purchase_return',
    DB_NAME,
    'id',
  );
}

function calcExecStatus(total: number, executed: number) {
  if (executed <= 0) return 10;
  if (total > 0 && executed >= total) return 30;
  return 20;
}

function getErrorMessage(error: unknown) {
  const err: any = error;
  return err?.response?.data?.Message || err?.response?.data?.message || err?.response?.data?.msg || err?.message || '未知异常';
}

export async function getPurchaseReturnOutPage(params: any) {
  const table = getTable();
  if (params.no) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('no', 'contains', params.no))
      : cond('no', 'contains', params.no);
  }
  if (params.return_no) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('return_no', 'contains', params.return_no))
      : cond('return_no', 'contains', params.return_no);
  }
  if (params.supplier_id) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('supplier_id', 'equal', params.supplier_id))
      : cond('supplier_id', 'equal', params.supplier_id);
  }
  if (params.warehouse_id) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('warehouse_id', 'equal', params.warehouse_id))
      : cond('warehouse_id', 'equal', params.warehouse_id);
  }
  if (params.status !== undefined && params.status !== null && params.status !== '') {
    table.Filter = table.Filter
      ? and(table.Filter, cond('status', 'equal', params.status))
      : cond('status', 'equal', params.status);
  }
  if (params.out_time && Array.isArray(params.out_time) && params.out_time.length === 2) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('out_time', 'greaterthanorequal', params.out_time[0]))
      : cond('out_time', 'greaterthanorequal', params.out_time[0]);
    table.Filter = table.Filter
      ? and(table.Filter, cond('out_time', 'lessthanorequal', params.out_time[1]))
      : cond('out_time', 'lessthanorequal', params.out_time[1]);
  }
  const queryParam: any = {
    Table: [table],
    PageParam: { page: params.page || 0, index: params.pageNo || 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items || [];
  returnData.total = resData.Count || 0;
  return returnData;
}

export async function getPurchaseReturnOut(id: string) {
  const table = getTable();
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data?.Items?.[0] || null;
  if (resultData) {
    const itemsRes = await queryPurchaseReturnOutItems({ out_id: id });
    resultData.items = itemsRes.list || [];
  }
  return resultData;
}

export async function getPurchaseReturnOutSourcePage(params: any) {
  const fullRes: any = await getPurchaseReturnPage({
    ...params,
    status: 20,
    pageNo: 1,
    page: Math.max(Number(params?.page || 10) * 20, 200),
  });
  const list = Array.isArray(fullRes?.list) ? fullRes.list : [];
  const filtered = list.filter((item: any) => Number(item?.out_status || 10) !== 30);
  const pageNo = Number(params?.pageNo || 1);
  const page = Number(params?.page || 10);
  const start = (pageNo - 1) * page;
  const end = start + page;
  const returnData = new clientData();
  returnData.dataTable = fullRes?.dataTable;
  returnData.list = filtered.slice(start, end);
  returnData.total = filtered.length;
  return returnData;
}

export async function getPurchaseReturnOutSource(id: string) {
  return await getPurchaseReturn(id);
}

export async function createPurchaseReturnOut(data: ErpPurchaseReturnOutApi.PurchaseReturnOut) {
  const table = getTable();
  const uid = generateUUID();
  const items = (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
    ...item,
    id: item?.id || generateUUID(),
    out_id: uid,
    count: toNumber(item?.count),
    source_count: toNumber(item?.source_count),
    source_check_item_id: item?.source_check_item_id,
    source_check_scope: item?.source_check_scope,
  }));
  const itemIds = items.map((item) => String(item.id || '')).filter(Boolean);
  let res: any;
  let mainSaved = false;
  try {
    if (items.length > 0) await addPurchaseReturnOutItems(items);
    const saveData = {
      ...data,
      id: uid,
      no: data.no || buildTempNo('CTH-'),
      status: data.status ?? 10,
      warehouse_outbound: data.warehouse_outbound,
      total_count: toNumber(data.total_count),
      items: undefined,
    } as any;
    delete saveData.items;
    const saveParam = table.getSaveParam([saveData], [], []);
    res = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
    mainSaved = true;
    const finalNo = await assignPurchaseReturnOutNo(uid, table);
    return { ...(res || {}), id: uid, no: finalNo } as any;
  } catch (error) {
    try {
      if (itemIds.length > 0) await deletePurchaseReturnOutItems(itemIds);
      if (mainSaved) await deletePurchaseReturnOut([uid]);
    } catch {}
    throw error;
  }
}

export async function updatePurchaseReturnOut(data: ErpPurchaseReturnOutApi.PurchaseReturnOut) {
  const table = getTable();
  const oldDoc: any = data.id ? await getPurchaseReturnOut(String(data.id)) : null;
  const oldItems = Array.isArray(oldDoc?.items) ? oldDoc.items : [];
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length > 0) {
    await updatePurchaseReturnOutItems(
      items.map((item: any) => ({
        id: item.id,
        out_id: item.out_id,
        return_item_id: item.return_item_id,
        warehouse_id: item.warehouse_id,
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        source_count: toNumber(item.source_count),
        source_check_item_id: item.source_check_item_id,
        source_check_scope: item.source_check_scope,
        count: toNumber(item.count),
        remark: item.remark,
      })),
    );
  }
  const saveData = { ...data, total_count: toNumber(data.total_count) } as any;
  delete saveData.items;
  const saveParam = table.getSaveParam([], [saveData], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  const oldMap = new Map(oldItems.map((item: any) => [String(item.id || ''), item]));
  const deltas = items.map((item: any) => {
    const old = oldMap.get(String(item.id || ''));
    return { check_item_id: String(item.source_check_item_id || ''), scope: String(item.source_check_scope || old?.source_check_scope || ''), delta_count: toNumber(item.count) - toNumber(old?.count) };
  }).filter((item: any) => item.check_item_id && item.scope && item.delta_count !== 0);
  if (deltas.length > 0) await applyReturnCheckProcessedDelta(deltas);
  return res;
}

export async function updatePurchaseReturnOutStatus(id: string, status: number) {
  const table = getTable();
  const actionText = Number(status) === 20 ? '审批' : '反审批';
  try {
    const outDoc = await getPurchaseReturnOut(id);
    if (!outDoc) throw new Error('未找到采购退货出库单');
    const currentStatus = Number(outDoc.status || 0);
    if (Number(status) === 10 && currentStatus !== 20) {
      throw new Error('该出库执行单未审批，无需反审批');
    }
    const itemRows = Array.isArray(outDoc.items) ? outDoc.items : [];
    const returnId = String(outDoc.return_id || '');
    if (!returnId) throw new Error('缺少来源采购退货单');
    const returnDoc: any = await getPurchaseReturn(returnId);
    if (!returnDoc) throw new Error('未找到来源采购退货单');
    const returnItems = Array.isArray(returnDoc.items) ? returnDoc.items : [];

    const qtyMap = new Map<
      string,
      { product_id: string; qty: number; warehouse_id: string }
    >();
    for (const r of itemRows) {
      const product_id = String(r?.product_id || '');
      const warehouse_id = await normalizeWarehouseIdToRowid(r?.warehouse_id || outDoc.warehouse_id || '');
      const qty = toNumber(r?.count);
      if (!product_id || !warehouse_id) throw new Error('出库明细缺少产品或仓库');
      if (!(qty > 0)) continue;
      const key = `${product_id}@@${warehouse_id}`;
      const old = qtyMap.get(key);
      qtyMap.set(
        key,
        old ? { ...old, qty: old.qty + qty } : { product_id, warehouse_id, qty, item: r },
      );
    }
    const pairs = [...qtyMap.values()];
    const stockTable = createFinanceDataTable(
      STOCK_MODEL_ID,
      STOCK_TABLE_NAME,
      STOCK_DB_NAME,
      STOCK_PK,
    );
    if (pairs.length > 0) {
      stockTable.Filter = or(
        ...pairs.map((p: any) =>
          and(
            cond('product_id', 'equal', p.product_id),
            cond('warehouse_id', 'equal', p.warehouse_id),
          ),
        ),
      );
    }
    const stockQueryParam = {
      Table: [stockTable],
      PageParam: { page: 0, index: 1 },
    };
    const stockRes = await requestClient.post(stockTable.queryUrl, stockQueryParam, {
      headers: stockTable.getRequestHeader(),
      responseReturn: 'raw',
    });
    stockTable.execQueryResult(stockRes);
    const stockItems = (stockRes.data?.Result?.data?.Items || []) as any[];
    const stockMap = new Map<string, any>();
    for (const s of stockItems) {
      stockMap.set(
        `${String(s.product_id || '')}@@${String(s.warehouse_id || '')}`,
        s,
      );
    }
    async function resolveStockRequiredFields(productId: string, item?: any) {
      const p: any = await getProduct(productId);
      if (!p) throw new Error(`未找到产品信息：${productId}`);
      const category_id = String(p.category_id ?? p.product_category_id ?? p.product_type ?? item?.category_id ?? '').trim();
      const unit_name = String(item?.product_unit_name ?? item?.unit_name ?? item?.product_unit_id ?? p.unit ?? p.unit_name ?? '').trim();
      if (!category_id || !unit_name) {
        throw new Error(`产品缺少分类或单位：${productId}`);
      }
      const unit_id = String(item?.product_unit_id ?? unit_name).trim();
      return {
        category_id,
        unit_id,
        unit_name,
        product_name: String(p.product_name ?? item?.product_name ?? '').trim(),
      };
    }

    const stockAdded: any[] = [];
    const stockChanged: any[] = [];
    const deltas: StockDelta[] = [];
    const now = nowMysql();
    if (Number(status) === 20) {
      for (const p of pairs as any[]) {
        const key = `${p.product_id}@@${p.warehouse_id}`;
        const row = stockMap.get(key);
        if (!row) {
          throw new Error(`库存不足：无库存记录 product=${p.product_id} warehouse=${p.warehouse_id}`);
        }
        const current = toNumber(row.count);
        if (current < p.qty) {
          throw new Error(`库存不足：product=${p.product_id} warehouse=${p.warehouse_id}`);
        }
        const newCount = current - p.qty;
        stockChanged.push({ rowid: row.rowid, count: newCount, update_time: now });
        deltas.push({
          product_id: p.product_id,
          warehouse_id: p.warehouse_id,
          delta: -p.qty,
          total_count: newCount,
        });
      }
    } else {
      for (const p of pairs as any[]) {
        const key = `${p.product_id}@@${p.warehouse_id}`;
        const row = stockMap.get(key);
        if (row) {
          const newCount = toNumber(row.count) + p.qty;
          stockChanged.push({ rowid: row.rowid, count: newCount, update_time: now });
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
            product_name: required.product_name,
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

    const returnItemChanged: any[] = [];
    for (const execItem of itemRows) {
      const returnItemId = String(execItem?.return_item_id || '');
      if (!returnItemId) continue;
      const target = returnItems.find(
        (item: any) => String(item.id || item.rowid || '') === returnItemId,
      );
      if (!target) continue;
      const currentOutCount = toNumber(target.out_count);
      const delta = toNumber(execItem.count);
      const nextOutCount =
        Number(status) === 20 ? currentOutCount + delta : currentOutCount - delta;
      if (nextOutCount < 0) {
        throw new Error('反审批失败：来源退货项累计出库数量不能小于 0');
      }
      returnItemChanged.push({ id: target.id || target.rowid, out_count: nextOutCount });
    }
    if (returnItemChanged.length > 0) {
      await updatePurchaseReturnItems(returnItemChanged);
    }

    const latestReturn: any = await getPurchaseReturn(returnId);
    const latestItems = Array.isArray(latestReturn?.items) ? latestReturn.items : [];
    const totalSourceCount = latestItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.count),
      0,
    );
    const totalOutCount = latestItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.out_count),
      0,
    );
    const returnTable = getReturnTable();
    const returnSaveParam = returnTable.getSaveParam(
      [],
      [
        {
          id: returnId,
          out_count: totalOutCount,
          out_status: calcExecStatus(totalSourceCount, totalOutCount),
        },
      ],
      [],
    );

    const stockRecord = await buildStockRecordAdds(deltas, {
      biz_type: Number(status) === 20 ? 2 : 1,
      biz_no: String(outDoc.no || id),
      description: Number(status) === 20 ? '采购退货出库' : '采购退货出库反审批',
      biz_time: (outDoc as any).out_time,
    });

    const reqList = [
      ...stockTable.getSaveParam(stockAdded, stockChanged, []),
      ...stockRecord.table.getSaveParam(stockRecord.adds, [], []),
      ...table.getSaveParam([], [{ id, status }], []),
      ...returnSaveParam,
    ];
    return await requestClient.post(table.saveUrl, reqList, {
      headers: table.getRequestHeader(),
    });
  } catch (error) {
    throw new Error(`采购退货出库${actionText}失败：${getErrorMessage(error)}`);
  }
}

export async function deletePurchaseReturnOut(ids: string[]) {
  const table = getTable();
  const docs = await Promise.all((ids || []).map((id) => getPurchaseReturnOut(String(id))));
  const itemIds = docs.flatMap((doc: any) => (Array.isArray(doc?.items) ? doc.items : []).map((item: any) => String(item.id || '')).filter(Boolean));
  const deltas = docs.flatMap((doc: any) => (Array.isArray(doc?.items) ? doc.items : []).map((item: any) => ({ check_item_id: String(item?.source_check_item_id || ''), scope: String(item?.source_check_scope || ''), delta_count: -toNumber(item?.count) })).filter((item: any) => item.check_item_id && item.scope && item.delta_count !== 0));
  if (itemIds.length > 0) await deletePurchaseReturnOutItems(itemIds);
  const saveParam = table.getSaveParam(
    [],
    [],
    ids.map((id) => ({ id })),
  );
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  if (deltas.length > 0) await applyReturnCheckProcessedDelta(deltas);
  return res;
}
