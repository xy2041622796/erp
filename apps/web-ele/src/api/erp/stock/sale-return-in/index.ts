import type { StockDelta } from '#/api/erp/stock/record/stock-record-helper';

import { generateUUID } from '@vben/utils';

import { getProduct } from '#/api/erp/product/product';
import { applyReturnCheckProcessedDelta } from '#/api/erp/stock/return-check';
import { getSaleReturn, getSaleReturnPage } from '#/api/erp/sale/return';
import { updateSaleReturnItems } from '#/api/erp/sale/return/returnItems';
import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import {
  STOCK_DB_NAME, STOCK_MODEL_ID, STOCK_PK, STOCK_TABLE_NAME, } from '#/api/erp/stock/stock';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import { getCodeString } from '#/api/system/coding';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import {
  addSaleReturnInItems,
  deleteSaleReturnInItems,
  querySaleReturnInItems,
  updateSaleReturnInItems,
} from './items';

export namespace ErpSaleReturnInApi {
  export interface SaleReturnIn {
    id?: string;
    no?: string;
    status?: number;
    return_id?: string;
    return_no?: string;
    customer_id?: string;
    warehouse_id?: string;
    warehouse_inbound?: string;
    in_time?: string;
    total_count?: number;
    remark?: string;
    createuser?: string;
    items?: SaleReturnInItem[];
  }

  export interface SaleReturnInItem {
    id?: string;
    in_id?: string;
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
    in_count?: number;
    source_check_item_id?: string;
    source_check_scope?: string;
  }
}

export const SALE_RETURN_IN_FORM_KEY = '1500750AA1291E614744E19DC6C386F6';
const SALE_RETURN_IN_CODING_ID = '43433FA7002BD167D39334E164D44D2D';
const TABLE_NAME = 'erp_sale_return_in';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';
const SALE_RETURN_MODEL_ID = '900EB04B14073B3FBF036AA1B5AC62E1';

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
    SALE_RETURN_IN_FORM_KEY,
    TABLE_NAME,
    DB_NAME,
    PK_FIELD,
  );
}

async function assignSaleReturnInNo(docId: string, table = getTable()) {
  const codeRes = await getCodeString(
    docId,
    SALE_RETURN_IN_CODING_ID,
    table.getRequestHeader(),
  );
  if (!(codeRes?.Code === 200 && codeRes?.Message)) {
    throw new Error(codeRes?.Message || '获取销售退货入库编号失败');
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
    SALE_RETURN_MODEL_ID,
    'erp_sale_return',
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

export async function getSaleReturnInPage(params: any) {
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
  if (params.customer_id) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('customer_id', 'equal', params.customer_id))
      : cond('customer_id', 'equal', params.customer_id);
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
  if (params.in_time && Array.isArray(params.in_time) && params.in_time.length === 2) {
    table.Filter = table.Filter
      ? and(table.Filter, cond('in_time', 'greaterthanorequal', params.in_time[0]))
      : cond('in_time', 'greaterthanorequal', params.in_time[0]);
    table.Filter = table.Filter
      ? and(table.Filter, cond('in_time', 'lessthanorequal', params.in_time[1]))
      : cond('in_time', 'lessthanorequal', params.in_time[1]);
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

export async function getSaleReturnIn(id: string) {
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
    const itemsRes = await querySaleReturnInItems({ in_id: id });
    resultData.items = itemsRes.list || [];
  }
  return resultData;
}

export async function getSaleReturnInSourcePage(params: any) {
  const fullRes: any = await getSaleReturnPage({
    ...params,
    status: 20,
    pageNo: 1,
    page: Math.max(Number(params?.page || 10) * 20, 200),
  });
  const list = Array.isArray(fullRes?.list) ? fullRes.list : [];
  const filtered = list.filter((item: any) => Number(item?.in_status || 10) !== 30);
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

export async function getSaleReturnInSource(id: string) {
  return await getSaleReturn(id);
}

export async function createSaleReturnIn(data: ErpSaleReturnInApi.SaleReturnIn) {
  const table = getTable();
  const uid = generateUUID();
  const items = (Array.isArray(data.items) ? data.items : []).map((item: any) => ({
    ...item,
    id: item?.id || generateUUID(),
    in_id: uid,
    count: toNumber(item?.count),
    source_count: toNumber(item?.source_count),
    source_check_item_id: item?.source_check_item_id,
    source_check_scope: item?.source_check_scope,
  }));
  const itemIds = items.map((item) => String(item.id || '')).filter(Boolean);
  let res: any;
  let mainSaved = false;
  try {
    if (items.length > 0) await addSaleReturnInItems(items);
    const saveData = {
      ...data,
      id: uid,
      no: data.no || buildTempNo('STH-'),
      status: data.status ?? 10,
      warehouse_inbound: data.warehouse_inbound,
      total_count: toNumber(data.total_count),
      items: undefined,
    } as any;
    delete saveData.items;
    const saveParam = table.getSaveParam([saveData], [], []);
    res = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
    mainSaved = true;
    const finalNo = await assignSaleReturnInNo(uid, table);
    return { ...(res || {}), id: uid, no: finalNo } as any;
  } catch (error) {
    try {
      if (itemIds.length > 0) await deleteSaleReturnInItems(itemIds);
      if (mainSaved) await deleteSaleReturnIn([uid]);
    } catch {}
    throw error;
  }
}

export async function updateSaleReturnIn(data: ErpSaleReturnInApi.SaleReturnIn) {
  const table = getTable();
  const oldDoc: any = data.id ? await getSaleReturnIn(String(data.id)) : null;
  const oldItems = Array.isArray(oldDoc?.items) ? oldDoc.items : [];
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length > 0) {
    await updateSaleReturnInItems(
      items.map((item: any) => ({
        id: item.id,
        in_id: item.in_id,
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

export async function updateSaleReturnInStatus(id: string, status: number) {
  const table = getTable();
  const actionText = Number(status) === 20 ? '审批' : '反审批';
  try {
    const inDoc = await getSaleReturnIn(id);
    if (!inDoc) throw new Error('未找到销售退货入库单');
    const currentStatus = Number(inDoc.status || 0);
    if (Number(status) === 10 && currentStatus !== 20) {
      throw new Error('该入库执行单未审批，无需反审批');
    }
    const itemRows = Array.isArray(inDoc.items) ? inDoc.items : [];
    const returnId = String(inDoc.return_id || '');
    if (!returnId) throw new Error('缺少来源销售退货单');
    const returnDoc: any = await getSaleReturn(returnId);
    if (!returnDoc) throw new Error('未找到来源销售退货单');
    const returnItems = Array.isArray(returnDoc.items) ? returnDoc.items : [];

    const qtyMap = new Map<
      string,
      { product_id: string; qty: number; warehouse_id: string }
    >();
    for (const r of itemRows) {
      const product_id = String(r?.product_id || '');
      const warehouse_id = await normalizeWarehouseIdToRowid(r?.warehouse_id || inDoc.warehouse_id || '');
      const qty = toNumber(r?.count);
      if (!product_id || !warehouse_id) throw new Error('入库明细缺少产品或仓库');
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
    } else {
      for (const p of pairs as any[]) {
        const key = `${p.product_id}@@${p.warehouse_id}`;
        const row = stockMap.get(key);
        if (!row) {
          throw new Error(
            `反审批失败：无库存记录 product=${p.product_id} warehouse=${p.warehouse_id}`,
          );
        }
        const current = toNumber(row.count);
        if (current < p.qty) {
          throw new Error(
            `反审批失败：库存不足 product=${p.product_id} warehouse=${p.warehouse_id}`,
          );
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
    }

    const returnItemChanged: any[] = [];
    for (const execItem of itemRows) {
      const returnItemId = String(execItem?.return_item_id || '');
      if (!returnItemId) continue;
      const target = returnItems.find(
        (item: any) => String(item.id || item.rowid || '') === returnItemId,
      );
      if (!target) continue;
      const currentInCount = toNumber(target.in_count);
      const delta = toNumber(execItem.count);
      const nextInCount =
        Number(status) === 20 ? currentInCount + delta : currentInCount - delta;
      if (nextInCount < 0) {
        throw new Error('反审批失败：来源退货项累计入库数量不能小于 0');
      }
      returnItemChanged.push({ id: target.id || target.rowid, in_count: nextInCount });
    }
    if (returnItemChanged.length > 0) {
      await updateSaleReturnItems(returnItemChanged);
    }

    const latestReturn: any = await getSaleReturn(returnId);
    const latestItems = Array.isArray(latestReturn?.items) ? latestReturn.items : [];
    const totalSourceCount = latestItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.count),
      0,
    );
    const totalInCount = latestItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.in_count),
      0,
    );
    const returnTable = getReturnTable();
    const returnSaveParam = returnTable.getSaveParam(
      [],
      [
        {
          id: returnId,
          in_count: totalInCount,
          in_status: calcExecStatus(totalSourceCount, totalInCount),
        },
      ],
      [],
    );

    const stockRecord = await buildStockRecordAdds(deltas, {
      biz_type: Number(status) === 20 ? 1 : 2,
      biz_no: String(inDoc.no || id),
      description: Number(status) === 20 ? '销售退货入库' : '销售退货入库反审批',
      biz_time: (inDoc as any).in_time,
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
    throw new Error(`销售退货入库${actionText}失败：${getErrorMessage(error)}`);
  }
}

export async function deleteSaleReturnIn(ids: string[]) {
  const table = getTable();
  const docs = await Promise.all((ids || []).map((id) => getSaleReturnIn(String(id))));
  const itemIds = docs.flatMap((doc: any) => (Array.isArray(doc?.items) ? doc.items : []).map((item: any) => String(item.id || '')).filter(Boolean));
  const deltas = docs.flatMap((doc: any) => (Array.isArray(doc?.items) ? doc.items : []).map((item: any) => ({ check_item_id: String(item?.source_check_item_id || ''), scope: String(item?.source_check_scope || ''), delta_count: -toNumber(item?.count) })).filter((item: any) => item.check_item_id && item.scope && item.delta_count !== 0));
  if (itemIds.length > 0) await deleteSaleReturnInItems(itemIds);
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
