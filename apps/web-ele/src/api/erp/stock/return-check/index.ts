import { generateUUID } from '@vben/utils';

import { getPurchaseReturn } from '#/api/erp/purchase/return';
import { getSaleReturn } from '#/api/erp/sale/return';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const RETURN_CHECK_TABLE_NAME = 'erp_return_check';
const RETURN_CHECK_ITEM_TABLE_NAME = 'erp_return_check_item';
const SALE_RETURN_IN_TABLE_NAME = 'erp_sale_return_in';
const SALE_RETURN_IN_ITEM_TABLE_NAME = 'erp_sale_return_in_items';
const PURCHASE_RETURN_OUT_TABLE_NAME = 'erp_purchase_return_out';
const PURCHASE_RETURN_OUT_ITEM_TABLE_NAME = 'erp_purchase_return_out_items';
const DB_NAME = 'LMBill';
const PK_FIELD = 'id';
export const RETURN_CHECK_FORM_KEY = 'D1A3D8B04EA2BD90A83C64AED7DE5A17';
const RETURN_CHECK_CODING_ID = 'B2A2332D49A6B18075EA3C9F684D078A';
const SALE_RETURN_IN_FORM_KEY = 'D1A3D8B04EA2BD90A83C64AED7DE5A17';
const SALE_RETURN_IN_CODING_ID = '43433FA7002BD167D39334E164D44D2D';
const PURCHASE_RETURN_OUT_FORM_KEY = 'D1A3D8B04EA2BD90A83C64AED7DE5A17';
const PURCHASE_RETURN_OUT_CODING_ID = 'FE8402EB58D1E13C262125F77636FDF1';

const SALE_RETURN_IN_QUALIFIED_KEY = 'sale_return_in_qualified';
const SALE_RETURN_IN_UNQUALIFIED_KEY = 'sale_return_in_unqualified';
const PURCHASE_RETURN_OUT_UNQUALIFIED_KEY = 'purchase_return_out_unqualified';

export const RETURN_CHECK_BIZ_TYPE = {
  SALE_RETURN: 10,
  PURCHASE_RETURN: 20,
} as const;

export const RETURN_CHECK_STATUS = {
  PENDING: 10,
  PARTIAL: 20,
  DONE: 30,
} as const;

export const RETURN_CHECK_PROCESS_STATUS = {
  PENDING: 10,
  PARTIAL: 20,
  DONE: 30,
} as const;

export namespace ReturnCheckApi {
  export interface ReturnCheckItem {
    id?: string;
    rowid?: string;
    check_id?: string;
    biz_item_id?: string;
    return_item_id?: string;
    product_id?: string;
    product_name?: string;
    product_bar_code?: string;
    product_unit_id?: string;
    product_unit_name?: string;
    warehouse_id?: string;
    source_count?: number;
    qualified_count?: number;
    unqualified_count?: number;
    check_result?: number;
    unqualified_reason?: string;
    dispose_type?: number;
    target_warehouse_id?: string;
    bad_warehouse_id?: string;
    good_warehouse_id?: string;
    need_process_count?: number;
    qualified_processed_count?: number;
    unqualified_processed_count?: number;
    processed_count?: number;
    process_status?: number;
    remark?: string;
    sort_no?: number;
  }

  export interface ReturnCheck {
    id?: string;
    rowid?: string;
    no?: string;
    biz_type?: number;
    biz_id?: string;
    biz_no?: string;
    source_return_id?: string;
    source_return_no?: string;
    warehouse_id?: string;
    check_status?: number;
    check_time?: string;
    checker_id?: string;
    checker_name?: string;
    remark?: string;
    total_count?: number;
    qualified_count?: number;
    unqualified_count?: number;
    status?: number;
    source_round_no?: number;
    is_latest?: number;
    generated_doc_type?: string;
    generated_doc_id?: string;
    generated_doc_no?: string;
    items?: ReturnCheckItem[];
    process_status?: number;
    process_status_label?: string;
    process_progress?: string;
    process_desc?: string;
    processed_generate_keys?: string;
    expected_generate_keys?: string;
  }
}

interface GenerateCandidateRow {
  check_item_id: string;
  return_item_id?: string;
  product_id?: string;
  product_name?: string;
  product_bar_code?: string;
  product_unit_id?: string;
  product_unit_name?: string;
  warehouse_id: string;
  generate_count: number;
}

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

async function assignReturnCheckNo(checkId: string, table = getCheckTable()) {
  const codeRes = await getCodeString(
    checkId,
    RETURN_CHECK_CODING_ID,
    table.getRequestHeader(),
  );
  if (!(codeRes?.Code === 200 && codeRes?.Message)) {
    throw new Error(codeRes?.Message || '获取退货检测单编号失败');
  }
  const updateTable = getCheckTable();
  const updateParam = updateTable.getSaveParam([], [{ id: checkId, no: codeRes.Message }], []);
  await requestClient.post(updateTable.saveUrl, updateParam, {
    headers: updateTable.getRequestHeader(),
  });
  return codeRes.Message;
}

function formatDateValue(value?: string) {
  if (!value) return nowMysql();
  const ts = Number(value);
  const date = Number.isNaN(ts) ? new Date(value) : new Date(ts);
  return date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

function calcQualifiedNeedProcessCount(bizType: number, row: any) {
  return Number(bizType) === RETURN_CHECK_BIZ_TYPE.SALE_RETURN ? toNumber(row?.qualified_count) : 0;
}

function calcUnqualifiedNeedProcessCount(bizType: number, row: any) {
  if (Number(bizType) === RETURN_CHECK_BIZ_TYPE.SALE_RETURN) {
    return Number(row?.dispose_type) === 40 ? toNumber(row?.unqualified_count) : 0;
  }
  return Number(row?.dispose_type) === 20 ? toNumber(row?.unqualified_count) : 0;
}

function calcItemNeedProcessCount(bizType: number, row: any) {
  return calcQualifiedNeedProcessCount(bizType, row) + calcUnqualifiedNeedProcessCount(bizType, row);
}

function calcItemQualifiedProcessedCount(bizType: number, row: any) {
  const need = calcQualifiedNeedProcessCount(bizType, row);
  return Math.max(0, Math.min(need, toNumber(row?.qualified_processed_count)));
}

function calcItemUnqualifiedProcessedCount(bizType: number, row: any) {
  const need = calcUnqualifiedNeedProcessCount(bizType, row);
  return Math.max(0, Math.min(need, toNumber(row?.unqualified_processed_count)));
}

function calcItemProcessedCount(bizType: number, row: any) {
  const sum = calcItemQualifiedProcessedCount(bizType, row) + calcItemUnqualifiedProcessedCount(bizType, row);
  const need = calcItemNeedProcessCount(bizType, row);
  return Math.max(0, Math.min(need, sum));
}

function calcItemProcessStatusByCount(needProcessCount: number, processedCount: number) {
  if (needProcessCount <= 0) return RETURN_CHECK_PROCESS_STATUS.DONE;
  if (processedCount <= 0) return RETURN_CHECK_PROCESS_STATUS.PENDING;
  if (processedCount < needProcessCount) return RETURN_CHECK_PROCESS_STATUS.PARTIAL;
  return RETURN_CHECK_PROCESS_STATUS.DONE;
}

function enrichProcessItem(bizType: number, row: any) {
  const need_process_count = calcItemNeedProcessCount(bizType, row);
  const qualified_processed_count = calcItemQualifiedProcessedCount(bizType, row);
  const unqualified_processed_count = calcItemUnqualifiedProcessedCount(bizType, row);
  const processed_count = calcItemProcessedCount(bizType, { ...row, qualified_processed_count, unqualified_processed_count });
  const process_status = calcItemProcessStatusByCount(need_process_count, processed_count);
  return { ...row, need_process_count, qualified_processed_count, unqualified_processed_count, processed_count, process_status };
}

function getCheckTable() {
  return createFinanceDataTable(RETURN_CHECK_FORM_KEY, RETURN_CHECK_TABLE_NAME, DB_NAME, PK_FIELD);
}

function getCheckItemTable() {
  return createFinanceDataTable(RETURN_CHECK_FORM_KEY, RETURN_CHECK_ITEM_TABLE_NAME, DB_NAME, PK_FIELD);
}

function getSaleReturnInTable() {
  return createFinanceDataTable(SALE_RETURN_IN_FORM_KEY, SALE_RETURN_IN_TABLE_NAME, DB_NAME, 'id');
}

function getPurchaseReturnOutTable() {
  return createFinanceDataTable(PURCHASE_RETURN_OUT_FORM_KEY, PURCHASE_RETURN_OUT_TABLE_NAME, DB_NAME, 'id');
}

function getSaleReturnInItemTable() {
  return createFinanceDataTable(SALE_RETURN_IN_FORM_KEY, SALE_RETURN_IN_ITEM_TABLE_NAME, DB_NAME, 'id');
}

function getPurchaseReturnOutItemTable() {
  return createFinanceDataTable(PURCHASE_RETURN_OUT_FORM_KEY, PURCHASE_RETURN_OUT_ITEM_TABLE_NAME, DB_NAME, 'id');
}

async function assignSaleReturnInNoByCheck(docId: string, table = getSaleReturnInTable()) {
  const codeRes = await getCodeString(docId, SALE_RETURN_IN_CODING_ID, table.getRequestHeader());
  if (!(codeRes?.Code === 200 && codeRes?.Message)) {
    throw new Error(codeRes?.Message || '获取销售退货入库编号失败');
  }
  const updateTable = getSaleReturnInTable();
  const updateParam = updateTable.getSaveParam([], [{ id: docId, no: codeRes.Message }], []);
  await requestClient.post(updateTable.saveUrl, updateParam, { headers: updateTable.getRequestHeader() });
  return codeRes.Message;
}

async function assignPurchaseReturnOutNoByCheck(docId: string, table = getPurchaseReturnOutTable()) {
  const codeRes = await getCodeString(docId, PURCHASE_RETURN_OUT_CODING_ID, table.getRequestHeader());
  if (!(codeRes?.Code === 200 && codeRes?.Message)) {
    throw new Error(codeRes?.Message || '获取采购退货出库编号失败');
  }
  const updateTable = getPurchaseReturnOutTable();
  const updateParam = updateTable.getSaveParam([], [{ id: docId, no: codeRes.Message }], []);
  await requestClient.post(updateTable.saveUrl, updateParam, { headers: updateTable.getRequestHeader() });
  return codeRes.Message;
}

async function querySaleReturnInItemsByCheck(params: any) {
  const table = getSaleReturnInItemTable();
  const conds: any[] = [];
  if (params?.in_id) conds.push(cond('in_id', 'equal', params.in_id));
  if (params?.product_id) conds.push(cond('product_id', 'equal', params.product_id));
  if (conds.length > 0) table.Filter = and(...conds);
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

async function addSaleReturnInItemsByCheck(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  const table = getSaleReturnInItemTable();
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function updateSaleReturnInItemsByCheck(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  const table = getSaleReturnInItemTable();
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function deleteSaleReturnInItemsByCheck(ids: string[]) {
  if (!ids.length) return;
  const table = getSaleReturnInItemTable();
  const saveParam = table.getSaveParam([], [], ids.map((id) => ({ id })));
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function queryPurchaseReturnOutItemsByCheck(params: any) {
  const table = getPurchaseReturnOutItemTable();
  const conds: any[] = [];
  if (params?.out_id) conds.push(cond('out_id', 'equal', params.out_id));
  if (params?.product_id) conds.push(cond('product_id', 'equal', params.product_id));
  if (conds.length > 0) table.Filter = and(...conds);
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

async function addPurchaseReturnOutItemsByCheck(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  const table = getPurchaseReturnOutItemTable();
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function updatePurchaseReturnOutItemsByCheck(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return;
  const table = getPurchaseReturnOutItemTable();
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function deletePurchaseReturnOutItemsByCheck(ids: string[]) {
  if (!ids.length) return;
  const table = getPurchaseReturnOutItemTable();
  const saveParam = table.getSaveParam([], [], ids.map((id) => ({ id })));
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function getSaleReturnInByCheck(id: string) {
  const table = getSaleReturnInTable();
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data?.Items?.[0] || null;
  if (resultData) resultData.items = await querySaleReturnInItemsByCheck({ in_id: id });
  return resultData;
}

export async function createSaleReturnInByCheck(data: any) {
  const table = getSaleReturnInTable();
  const uid = generateUUID();
  const items = (Array.isArray(data.items) ? data.items : []).map((item) => ({
    id: item?.id || generateUUID(),
    in_id: uid,
    return_item_id: item?.return_item_id,
    warehouse_id: item?.warehouse_id,
    product_id: item?.product_id,
    product_name: item?.product_name,
    product_bar_code: item?.product_bar_code,
    product_unit_id: item?.product_unit_id,
    product_unit_name: item?.product_unit_name,
    source_check_item_id: item?.source_check_item_id,
    source_check_scope: item?.source_check_scope,
    source_count: toNumber(item?.source_count),
    count: toNumber(item?.count),
    remark: item?.remark,
  }));
  const itemIds = items.map((item) => String(item.id || '')).filter(Boolean);
  let mainSaved = false;
  try {
    if (items.length > 0) await addSaleReturnInItemsByCheck(items);
    const saveData = {
      ...data,
      id: uid,
      no: data.no || buildTempNo('STH-'),
      status: data.status ?? 10,
      warehouse_inbound: data.warehouse_inbound,
      total_count: toNumber(data.total_count),
      items: undefined,
    };
    delete saveData.items;
    const saveParam = table.getSaveParam([saveData], [], []);
    await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
    mainSaved = true;
    const finalNo = await assignSaleReturnInNoByCheck(uid, table);
    return { id: uid, no: finalNo };
  } catch (error) {
    try {
      if (itemIds.length > 0) await deleteSaleReturnInItemsByCheck(itemIds);
      if (mainSaved) await requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ id: uid }]), { headers: table.getRequestHeader() });
    } catch {}
    throw error;
  }
}

export async function updateSaleReturnInByCheck(data: any) {
  const table = getSaleReturnInTable();
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length > 0) {
    await updateSaleReturnInItemsByCheck(items.map((item) => ({
      id: item.id,
      in_id: item.in_id,
      return_item_id: item.return_item_id,
      warehouse_id: item.warehouse_id,
      product_id: item.product_id,
      product_unit_id: item.product_unit_id,
      source_check_item_id: item.source_check_item_id,
      source_check_scope: item.source_check_scope,
      source_count: toNumber(item.source_count),
      count: toNumber(item.count),
      remark: item.remark,
    })));
  }
  const saveData = { ...data, total_count: toNumber(data.total_count) };
  delete saveData.items;
  const saveParam = table.getSaveParam([], [saveData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

export async function getPurchaseReturnOutByCheck(id: string) {
  const table = getPurchaseReturnOutTable();
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data?.Items?.[0] || null;
  if (resultData) resultData.items = await queryPurchaseReturnOutItemsByCheck({ out_id: id });
  return resultData;
}

export async function createPurchaseReturnOutByCheck(data: any) {
  const table = getPurchaseReturnOutTable();
  const uid = generateUUID();
  const items = (Array.isArray(data.items) ? data.items : []).map((item) => ({
    id: item?.id || generateUUID(),
    out_id: uid,
    return_item_id: item?.return_item_id,
    warehouse_id: item?.warehouse_id,
    product_id: item?.product_id,
    product_name: item?.product_name,
    product_bar_code: item?.product_bar_code,
    product_unit_id: item?.product_unit_id,
    product_unit_name: item?.product_unit_name,
    source_check_item_id: item?.source_check_item_id,
    source_check_scope: item?.source_check_scope,
    source_count: toNumber(item?.source_count),
    count: toNumber(item?.count),
    remark: item?.remark,
  }));
  const itemIds = items.map((item) => String(item.id || '')).filter(Boolean);
  let mainSaved = false;
  try {
    if (items.length > 0) await addPurchaseReturnOutItemsByCheck(items);
    const saveData = {
      ...data,
      id: uid,
      no: data.no || buildTempNo('CTH-'),
      status: data.status ?? 10,
      warehouse_outbound: data.warehouse_outbound,
      total_count: toNumber(data.total_count),
      items: undefined,
    };
    delete saveData.items;
    const saveParam = table.getSaveParam([saveData], [], []);
    await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
    mainSaved = true;
    const finalNo = await assignPurchaseReturnOutNoByCheck(uid, table);
    return { id: uid, no: finalNo };
  } catch (error) {
    try {
      if (itemIds.length > 0) await deletePurchaseReturnOutItemsByCheck(itemIds);
      if (mainSaved) await requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ id: uid }]), { headers: table.getRequestHeader() });
    } catch {}
    throw error;
  }
}

export async function updatePurchaseReturnOutByCheck(data: any) {
  const table = getPurchaseReturnOutTable();
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length > 0) {
    await updatePurchaseReturnOutItemsByCheck(items.map((item) => ({
      id: item.id,
      out_id: item.out_id,
      return_item_id: item.return_item_id,
      warehouse_id: item.warehouse_id,
      product_id: item.product_id,
      product_unit_id: item.product_unit_id,
      source_check_item_id: item.source_check_item_id,
      source_check_scope: item.source_check_scope,
      source_count: toNumber(item.source_count),
      count: toNumber(item.count),
      remark: item.remark,
    })));
  }
  const saveData = { ...data, total_count: toNumber(data.total_count) };
  delete saveData.items;
  const saveParam = table.getSaveParam([], [saveData], []);
  return await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

function getQualifiedWarehouseId(row: any) {
  return String(row?.good_warehouse_id || row?.target_warehouse_id || row?.warehouse_id || '');
}

function getUnqualifiedWarehouseId(row: any) {
  return String(row?.bad_warehouse_id || row?.target_warehouse_id || row?.warehouse_id || '');
}

async function queryItems(checkId: string) {
  const table = getCheckItemTable();
  table.Filter = and(cond('check_id', 'equal', checkId));
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

async function queryChecksBySourceReturn(bizType: number, sourceReturnId: string) {
  const table = getCheckTable();
  table.Filter = and(cond('biz_type', 'equal', bizType), cond('source_return_id', 'equal', sourceReturnId));
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  return (resQuery.data?.Result?.data?.Items || []) as any[];
}

function buildProcessMeta(checkDoc: any) {
  const bizType = Number(checkDoc?.biz_type || 0);
  const rows = (Array.isArray(checkDoc?.items) ? checkDoc.items : []).map((item: any) => enrichProcessItem(bizType, item));
  if (Number(checkDoc?.check_status) !== RETURN_CHECK_STATUS.DONE) {
    return { items: rows, process_status: RETURN_CHECK_PROCESS_STATUS.PENDING, process_status_label: '未处理', process_progress: '', process_desc: '', processed_generate_keys: '', expected_generate_keys: '' };
  }
  const totalNeed = rows.reduce((sum: number, item: any) => sum + toNumber(item.need_process_count), 0);
  const totalProcessed = rows.reduce((sum: number, item: any) => sum + toNumber(item.processed_count), 0);
  if (totalNeed <= 0) {
    return { items: rows, process_status: RETURN_CHECK_PROCESS_STATUS.DONE, process_status_label: '已完成', process_progress: '', process_desc: '', processed_generate_keys: '', expected_generate_keys: '' };
  }
  const process_status = totalProcessed <= 0 ? RETURN_CHECK_PROCESS_STATUS.PENDING : totalProcessed < totalNeed ? RETURN_CHECK_PROCESS_STATUS.PARTIAL : RETURN_CHECK_PROCESS_STATUS.DONE;
  return { items: rows, process_status, process_status_label: process_status === RETURN_CHECK_PROCESS_STATUS.DONE ? '已完成' : process_status === RETURN_CHECK_PROCESS_STATUS.PARTIAL ? '部分处理' : '未处理', process_progress: '', process_desc: '', processed_generate_keys: '', expected_generate_keys: '' };
}

async function enrichReturnCheckProcessRows(list: any[]) {
  const rows = Array.isArray(list) ? list : [];
  return rows.map((row) => {
    const meta = buildProcessMeta(row);
    return { ...row, ...meta, items: meta.items };
  });
}

async function buildPersistProcessMeta(checkDoc: any) {
  return buildProcessMeta(checkDoc);
}

async function enrichReturnCheckProcessRow(row: any) {
  if (!row) return row;
  const meta = buildProcessMeta(row);
  return { ...row, ...meta, items: meta.items };
}

function buildGenerateCandidates(checkDoc: any, scope: 'qualified' | 'unqualified') {
  const bizType = Number(checkDoc?.biz_type || 0);
  const items = (Array.isArray(checkDoc?.items) ? checkDoc.items : []).map((item: any) => enrichProcessItem(bizType, item));
  let rows: GenerateCandidateRow[] = [];
  if (bizType === RETURN_CHECK_BIZ_TYPE.SALE_RETURN) {
    rows = items
      .map((item: any) => {
        const remaining = scope === 'qualified'
          ? Math.max(0, toNumber(item.qualified_count) - toNumber(item.qualified_processed_count))
          : Number(item.dispose_type) === 40
            ? Math.max(0, toNumber(item.unqualified_count) - toNumber(item.unqualified_processed_count))
            : 0;
        const warehouseId = scope === 'qualified' ? getQualifiedWarehouseId(item) : getUnqualifiedWarehouseId(item);
        return {
          check_item_id: String(item?.id || item?.rowid || ''),
          return_item_id: String(item?.return_item_id || item?.biz_item_id || ''),
          product_id: item?.product_id,
          product_name: item?.product_name,
          product_bar_code: item?.product_bar_code,
          product_unit_id: item?.product_unit_id,
          product_unit_name: item?.product_unit_name,
          warehouse_id: warehouseId,
          generate_count: remaining,
        };
      })
      .filter((item) => item.check_item_id && item.warehouse_id && item.generate_count > 0);
  } else {
    rows = items
      .map((item: any) => ({
        check_item_id: String(item?.id || item?.rowid || ''),
        return_item_id: String(item?.return_item_id || item?.biz_item_id || ''),
        product_id: item?.product_id,
        product_name: item?.product_name,
        product_bar_code: item?.product_bar_code,
        product_unit_id: item?.product_unit_id,
        product_unit_name: item?.product_unit_name,
        warehouse_id: getUnqualifiedWarehouseId(item),
        generate_count: scope === 'qualified' ? 0 : (Number(item?.dispose_type) === 20 ? Math.max(0, toNumber(item?.unqualified_count) - toNumber(item?.unqualified_processed_count)) : 0),
      }))
      .filter((item) => item.check_item_id && item.warehouse_id && item.generate_count > 0);
  }
  const warehouseMap = new Map<string, { warehouseId: string; count: number }>();
  rows.forEach((item) => {
    const old = warehouseMap.get(item.warehouse_id);
    warehouseMap.set(item.warehouse_id, { warehouseId: item.warehouse_id, count: (old?.count || 0) + 1 });
  });
  return { items: rows, warehouseIds: [...warehouseMap.values()] };
}

async function deleteReturnChecks(checkIds: string[]) {
  const ids = checkIds.map((item) => String(item || '').trim()).filter(Boolean);
  if (ids.length === 0) return;
  const table = getCheckTable();
  const saveParam = table.getSaveParam([], [], ids.map((id) => ({ id })));
  await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function deleteReturnCheckItems(itemIds: string[]) {
  const ids = itemIds.map((item) => String(item || '').trim()).filter(Boolean);
  if (ids.length === 0) return;
  const table = getCheckItemTable();
  const saveParam = table.getSaveParam([], [], ids.map((id) => ({ id })));
  await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function clearOldDraftChecks(bizType: number, sourceReturnId: string) {
  const checkTable = getCheckTable();
  const itemTable = getCheckItemTable();
  const oldChecks = await queryChecksBySourceReturn(bizType, sourceReturnId);
  const staleChecks: any[] = [];
  for (const item of oldChecks) {
    const checkId = String(item?.id || '');
    if (!checkId) continue;
    const rows = await queryItems(checkId);
    const hasProcessed = rows.some((row: any) => toNumber(row?.processed_count) > 0 || toNumber(row?.qualified_processed_count) > 0 || toNumber(row?.unqualified_processed_count) > 0);
    if (!hasProcessed) staleChecks.push(item);
  }
  if (staleChecks.length === 0) return;
  const checkIds = staleChecks.map((item) => String(item?.id || '')).filter(Boolean);
  if (checkIds.length === 0) return;
  const itemDeleteList: Array<{ id: string }> = [];
  for (const checkId of checkIds) {
    const items = await queryItems(checkId);
    items.forEach((item) => {
      const id = String(item?.id || '');
      if (id) itemDeleteList.push({ id });
    });
  }
  const reqList = [
    ...itemTable.getSaveParam([], [], itemDeleteList),
    ...checkTable.getSaveParam([], [], checkIds.map((id) => ({ id }))),
  ];
  await requestClient.post(checkTable.saveUrl, reqList, { headers: checkTable.getRequestHeader() });
}

export async function getReturnCheckById(_formKey: string, id: string) {
  const table = getCheckTable();
  table.Filter = and(cond('id', 'equal', id));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const row = resQuery.data?.Result?.data?.Items?.[0] || null;
  if (row?.id) row.items = await queryItems(String(row.id));
  return await enrichReturnCheckProcessRow(row);
}

export async function getReturnCheckByBiz(_formKey: string, bizType: number, bizId: string) {
  const table = getCheckTable();
  table.Filter = and(cond('biz_type', 'equal', bizType), cond('biz_id', 'equal', bizId), cond('is_latest', 'equal', 1));
  const queryParam = { Table: [table], PageParam: { page: 1, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const row = resQuery.data?.Result?.data?.Items?.[0] || null;
  if (row?.id) row.items = await queryItems(String(row.id));
  return await enrichReturnCheckProcessRow(row);
}

export async function getReturnCheckPage(params: any) {
  const bizType = Number(params?.biz_type || RETURN_CHECK_BIZ_TYPE.SALE_RETURN);
  const table = getCheckTable();
  table.Filter = and(cond('biz_type', 'equal', bizType));
  if (params?.no) table.Filter = and(table.Filter, cond('no', 'contains', params.no));
  if (params?.biz_no) table.Filter = and(table.Filter, cond('biz_no', 'contains', params.biz_no));
  if (params?.check_status !== undefined && params?.check_status !== null && params?.check_status !== '') table.Filter = and(table.Filter, cond('check_status', 'equal', params.check_status));
  if (params?.warehouse_id) table.Filter = and(table.Filter, cond('warehouse_id', 'equal', params.warehouse_id));
  if (params?.checker_id) table.Filter = and(table.Filter, cond('checker_id', 'equal', params.checker_id));
  const isLatest = params?.is_latest !== undefined && params?.is_latest !== null && params?.is_latest !== '' ? Number(params.is_latest) : 1;
  table.Filter = and(table.Filter, cond('is_latest', 'equal', isLatest));
  const queryParam = { Table: [table], PageParam: { page: params.page || 20, index: params.pageNo || 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const list = (resData.Items || []) as any[];
  for (const row of list) row.items = await queryItems(String(row.id || ''));
  const finalList = await enrichReturnCheckProcessRows(list);
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = finalList;
  returnData.total = resData.Count || 0;
  return returnData;
}

export async function getReturnCheckGenerateOptions(bizType: number, checkId: string, scope: 'qualified' | 'unqualified') {
  const checkDoc: any = await getReturnCheckById(RETURN_CHECK_FORM_KEY, checkId);
  if (!checkDoc) throw new Error('未找到检测单');
  const { items, warehouseIds } = buildGenerateCandidates(checkDoc, scope);
  return {
    checkId,
    bizType: Number(bizType),
    scope,
    items,
    warehouseOptions: warehouseIds,
    defaultWarehouseId: warehouseIds[0]?.warehouseId || '',
  };
}

function calcCheckStatus(items: ReturnCheckApi.ReturnCheckItem[]) {
  const rows = Array.isArray(items) ? items : [];
  if (rows.length === 0) return RETURN_CHECK_STATUS.PENDING;
  let detectedCount = 0;
  for (const row of rows) {
    const sourceCount = toNumber(row.source_count);
    const qualifiedCount = toNumber(row.qualified_count);
    const unqualifiedCount = toNumber(row.unqualified_count);
    if (sourceCount > 0 && qualifiedCount + unqualifiedCount === sourceCount) detectedCount += 1;
  }
  if (detectedCount <= 0) return RETURN_CHECK_STATUS.PENDING;
  if (detectedCount < rows.length) return RETURN_CHECK_STATUS.PARTIAL;
  return RETURN_CHECK_STATUS.DONE;
}

function calcCheckResult(sourceCount: number, qualifiedCount: number, unqualifiedCount: number) {
  if (qualifiedCount <= 0 && unqualifiedCount <= 0) return 10;
  if (qualifiedCount >= sourceCount && unqualifiedCount <= 0) return 20;
  if (unqualifiedCount >= sourceCount && qualifiedCount <= 0) return 30;
  return 40;
}

async function getNextRoundNo(bizType: number, sourceReturnId: string) {
  const rows = await queryChecksBySourceReturn(bizType, sourceReturnId);
  const maxRound = rows.reduce((max, item) => Math.max(max, toNumber(item.source_round_no)), 0);
  return maxRound + 1;
}

async function markNotLatest(bizType: number, sourceReturnId: string) {
  const table = getCheckTable();
  table.Filter = and(cond('biz_type', 'equal', bizType), cond('source_return_id', 'equal', sourceReturnId), cond('is_latest', 'equal', 1));
  const queryParam = { Table: [table], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(resQuery);
  const rows = (resQuery.data?.Result?.data?.Items || []) as any[];
  if (rows.length === 0) return;
  const updateRows = rows.map((item) => ({ id: item.id, is_latest: 0 }));
  const saveParam = table.getSaveParam([], updateRows, []);
  await requestClient.post(table.saveUrl, saveParam, { headers: table.getRequestHeader() });
}

async function createDraftChecksFromReturnDoc(bizType: number, sourceReturnId: string, sourceReturnNo: string, items: any[]) {
  const validItems = (Array.isArray(items) ? items : []).filter((item) => String(item?.warehouse_id || '') && Number(item?.count || 0) > 0);
  if (validItems.length === 0) return [];
  const roundNo = await getNextRoundNo(bizType, sourceReturnId);
  await clearOldDraftChecks(bizType, sourceReturnId);
  await markNotLatest(bizType, sourceReturnId);
  const groupMap = new Map<string, any[]>();
  validItems.forEach((item) => {
    const key = String(item.warehouse_id);
    const list = groupMap.get(key) || [];
    list.push(item);
    groupMap.set(key, list);
  });
  const checkTable = getCheckTable();
  const itemTable = getCheckItemTable();
  const now = nowMysql();
  const addHeaders: any[] = [];
  const addItems: any[] = [];
  for (const [warehouseId, rows] of groupMap.entries()) {
    const checkId = generateUUID();
    const totalCount = rows.reduce((sum, row) => sum + toNumber(row.count), 0);
    addHeaders.push({
      id: checkId,
      rowid: generateUUID(),
      biz_type: bizType,
      biz_id: sourceReturnId,
      biz_no: sourceReturnNo,
      source_return_id: sourceReturnId,
      source_return_no: sourceReturnNo,
      warehouse_id: warehouseId,
      check_status: RETURN_CHECK_STATUS.PENDING,
      status: RETURN_CHECK_STATUS.PENDING,
      total_count: totalCount,
      qualified_count: 0,
      unqualified_count: 0,
      source_round_no: roundNo,
      is_latest: 1,
      createtime: now,
      updatetime: now,
      lingma_sys_is_delete: 0,
    });
    rows.forEach((row: any, index: number) => {
      addItems.push({ id: generateUUID(), rowid: generateUUID(), check_id: checkId, biz_item_id: row.id || row.rowid, return_item_id: row.id || row.rowid, product_id: row.product_id, product_name: row.product_name, product_bar_code: row.product_bar_code, product_unit_id: row.product_unit_id, product_unit_name: row.product_unit_name, warehouse_id: warehouseId, source_count: toNumber(row.count), qualified_count: 0, unqualified_count: 0, check_result: 10, sort_no: index + 1, createtime: now, updatetime: now, lingma_sys_is_delete: 0 });
    });
  }
  const checkIds = addHeaders.map((item) => String(item.id || '')).filter(Boolean);
  const itemIds = addItems.map((item) => String(item.id || '')).filter(Boolean);
  try {
    for (const header of addHeaders) {
      const currentCheckId = String(header.id || '');
      const headerSaveParam = checkTable.getSaveParam([header], [], []);
      await requestClient.post(checkTable.saveUrl, headerSaveParam, {
        headers: checkTable.getRequestHeader(),
      });
      const code = await assignReturnCheckNo(currentCheckId, checkTable);
      header.no = code;
    }
    if (addItems.length > 0) {
      const itemSaveParam = itemTable.getSaveParam(addItems, [], []);
      await requestClient.post(itemTable.saveUrl, itemSaveParam, {
        headers: itemTable.getRequestHeader(),
      });
    }
    return addHeaders;
  } catch (error) {
    try {
      await deleteReturnCheckItems(itemIds);
      await deleteReturnChecks(checkIds);
    } catch {}
    throw error;
  }
}

export async function createSaleReturnCheckDrafts(returnDoc: any) {
  const sourceReturnId = String(returnDoc?.id || '');
  if (!sourceReturnId) return [];
  return await createDraftChecksFromReturnDoc(RETURN_CHECK_BIZ_TYPE.SALE_RETURN, sourceReturnId, String(returnDoc?.no || ''), returnDoc?.items || []);
}

export async function createPurchaseReturnCheckDrafts(returnDoc: any) {
  const sourceReturnId = String(returnDoc?.id || '');
  if (!sourceReturnId) return [];
  return await createDraftChecksFromReturnDoc(RETURN_CHECK_BIZ_TYPE.PURCHASE_RETURN, sourceReturnId, String(returnDoc?.no || ''), returnDoc?.items || []);
}

export async function saveReturnCheck(_formKey: string, payload: ReturnCheckApi.ReturnCheck) {
  const current = payload.id ? await getReturnCheckById(RETURN_CHECK_FORM_KEY, String(payload.id)) : null;
  const checkTable = getCheckTable();
  const itemTable = getCheckItemTable();
  const checkId = String(current?.id || payload.id || generateUUID());
  const now = nowMysql();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const checkStatus = calcCheckStatus(items);
  const totalCount = items.reduce((sum, item) => sum + toNumber(item.source_count), 0);
  const qualifiedCount = items.reduce((sum, item) => sum + toNumber(item.qualified_count), 0);
  const unqualifiedCount = items.reduce((sum, item) => sum + toNumber(item.unqualified_count), 0);
  const existingItemMap = new Map<string, any>();
  (current?.items || []).forEach((item: any) => {
    const key = String(item.biz_item_id || item.return_item_id || item.id || '');
    if (key) existingItemMap.set(key, item);
  });
  const addItems: any[] = [];
  const updateItems: any[] = [];
  items.forEach((item, index) => {
    const sourceCount = toNumber(item.source_count);
    const qualified = toNumber(item.qualified_count);
    const unqualified = toNumber(item.unqualified_count);
    const key = String(item.biz_item_id || item.return_item_id || item.id || `${index}`);
    const old = existingItemMap.get(key);
    const rowBase = {
      id: old?.id || item.id || generateUUID(),
      rowid: old?.rowid || item.rowid || generateUUID(),
      check_id: checkId,
      biz_item_id: item.biz_item_id,
      return_item_id: item.return_item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_bar_code: item.product_bar_code,
      product_unit_id: item.product_unit_id,
      product_unit_name: item.product_unit_name,
      warehouse_id: item.warehouse_id,
      source_count: sourceCount,
      qualified_count: qualified,
      unqualified_count: unqualified,
      check_result: item.check_result || calcCheckResult(sourceCount, qualified, unqualified),
      unqualified_reason: item.unqualified_reason,
      dispose_type: item.dispose_type,
      target_warehouse_id: item.target_warehouse_id,
      bad_warehouse_id: item.bad_warehouse_id,
      good_warehouse_id: item.good_warehouse_id,
      qualified_processed_count: item.qualified_processed_count ?? old?.qualified_processed_count ?? 0,
      unqualified_processed_count: item.unqualified_processed_count ?? old?.unqualified_processed_count ?? 0,
      processed_count: item.processed_count ?? old?.processed_count ?? 0,
      remark: item.remark,
      sort_no: item.sort_no ?? index + 1,
      updatetime: now,
    };
    const rowProcess = enrichProcessItem(Number(payload.biz_type || current?.biz_type || 0), rowBase);
    const row = { ...rowBase, need_process_count: rowProcess.need_process_count, processed_count: rowProcess.processed_count, process_status: rowProcess.process_status };
    if (old?.id) updateItems.push(row);
    else addItems.push({ ...row, createtime: now, updatetime: now, lingma_sys_is_delete: 0 });
  });
  const baseHeader = {
    id: checkId,
    rowid: current?.rowid || payload.rowid || generateUUID(),
    no: current?.no || payload.no,
    biz_type: payload.biz_type,
    biz_id: payload.biz_id,
    biz_no: payload.biz_no,
    source_return_id: payload.source_return_id,
    source_return_no: payload.source_return_no,
    warehouse_id: payload.warehouse_id,
    check_status: checkStatus,
    status: checkStatus,
    check_time: payload.check_time ? formatDateValue(payload.check_time) : undefined,
    checker_id: payload.checker_id,
    checker_name: payload.checker_name,
    remark: payload.remark,
    total_count: totalCount,
    qualified_count: qualifiedCount,
    unqualified_count: unqualifiedCount,
    source_round_no: payload.source_round_no ?? current?.source_round_no ?? 1,
    is_latest: payload.is_latest ?? current?.is_latest ?? 1,
    generated_doc_type: current?.generated_doc_type,
    generated_doc_id: current?.generated_doc_id,
    generated_doc_no: current?.generated_doc_no,
    updatetime: now,
  };
  const processMeta = await buildPersistProcessMeta({ ...current, ...baseHeader, items: [...addItems, ...updateItems] });
  const header = {
    ...baseHeader,
    process_status: processMeta.process_status,
    process_status_label: processMeta.process_status_label,
    process_progress: processMeta.process_progress,
    process_desc: processMeta.process_desc,
  };
  const reqList = [...itemTable.getSaveParam(addItems, updateItems, []), ...(current?.id ? checkTable.getSaveParam([], [header], []) : checkTable.getSaveParam([{ ...header, createtime: now, updatetime: now, lingma_sys_is_delete: 0 }], [], []))];
  await requestClient.post(checkTable.saveUrl, reqList, { headers: checkTable.getRequestHeader() });
  let finalNo = header.no;
  if (!current?.id) {
    try {
      finalNo = await assignReturnCheckNo(checkId, checkTable);
    } catch (error) {
      try {
        await deleteReturnCheckItems(addItems.map((item) => String(item.id || '')).filter(Boolean));
        await deleteReturnChecks([checkId]);
      } catch {}
      throw error;
    }
  }
  return { id: checkId, no: finalNo, check_status: checkStatus };
}

function createSaleReturnInItemsByCheck(checkDoc: any, returnDoc: any, scope: 'qualified' | 'unqualified', filterFn: (item: any) => boolean, countGetter: (item: any) => number, options?: { warehouseId?: string; checkItemIds?: string[] }) {
  const checkItems = Array.isArray(checkDoc.items) ? checkDoc.items : [];
  const returnItems = Array.isArray(returnDoc?.items) ? returnDoc.items : [];
  const selectedIds = new Set((options?.checkItemIds || []).map((item) => String(item)));
  const selectedWarehouseId = String(options?.warehouseId || '');
  return checkItems.filter((item: any) => {
    if (!filterFn(item)) return false;
    const targetWarehouseId = countGetter(item) === toNumber(item?.qualified_count) ? getQualifiedWarehouseId(item) : getUnqualifiedWarehouseId(item);
    if (selectedWarehouseId && targetWarehouseId !== selectedWarehouseId) return false;
    if (selectedIds.size > 0 && !selectedIds.has(String(item?.id || item?.rowid || ''))) return false;
    return true;
  }).map((item: any) => {
    const source = returnItems.find((it: any) => String(it.id || it.rowid || '') === String(item.return_item_id || item.biz_item_id || '')) || {};
    const targetWarehouseId = countGetter(item) === toNumber(item?.qualified_count) ? getQualifiedWarehouseId(item) : getUnqualifiedWarehouseId(item);
    return { ...source, id: undefined, count: countGetter(item), warehouse_id: targetWarehouseId, order_item_id: source.order_item_id, return_item_id: item.return_item_id || item.biz_item_id, product_id: item.product_id, product_name: item.product_name, product_bar_code: item.product_bar_code, product_unit_id: item.product_unit_id, product_unit_name: item.product_unit_name, remark: item.remark, source_check_item_id: item.id || item.rowid, source_check_scope: scope };
  }).filter((item: any) => toNumber(item.count) > 0);
}

function createPurchaseReturnOutItemsByCheck(checkDoc: any, returnDoc: any, scope: 'qualified' | 'unqualified', filterFn: (item: any) => boolean, countGetter: (item: any) => number, options?: { warehouseId?: string; checkItemIds?: string[] }) {
  const checkItems = Array.isArray(checkDoc.items) ? checkDoc.items : [];
  const returnItems = Array.isArray(returnDoc?.items) ? returnDoc.items : [];
  const selectedIds = new Set((options?.checkItemIds || []).map((item) => String(item)));
  const selectedWarehouseId = String(options?.warehouseId || '');
  return checkItems.filter((item: any) => {
    if (!filterFn(item)) return false;
    const targetWarehouseId = getUnqualifiedWarehouseId(item);
    if (selectedWarehouseId && targetWarehouseId !== selectedWarehouseId) return false;
    if (selectedIds.size > 0 && !selectedIds.has(String(item?.id || item?.rowid || ''))) return false;
    return true;
  }).map((item: any) => {
    const source = returnItems.find((it: any) => String(it.id || it.rowid || '') === String(item.return_item_id || item.biz_item_id || '')) || {};
    return { ...source, id: undefined, count: countGetter(item), warehouse_id: getUnqualifiedWarehouseId(item), order_item_id: source.order_item_id, return_item_id: item.return_item_id || item.biz_item_id, product_id: item.product_id, product_name: item.product_name, product_bar_code: item.product_bar_code, product_unit_id: item.product_unit_id, product_unit_name: item.product_unit_name, remark: item.remark, source_check_item_id: item.id || item.rowid, source_check_scope: scope };
  }).filter((item: any) => toNumber(item.count) > 0);
}

export async function buildSaleReturnInPreloadByCheck(checkId: string, scope: 'qualified' | 'unqualified' = 'qualified', options?: { warehouseId?: string; checkItemIds?: string[] }) {
  const checkDoc: any = await getReturnCheckById(RETURN_CHECK_FORM_KEY, checkId);
  if (!checkDoc) throw new Error('未找到检测单');
  const returnDoc: any = await getSaleReturn(String(checkDoc.source_return_id || checkDoc.biz_id || ''));
  const items = createSaleReturnInItemsByCheck(checkDoc, returnDoc, scope, (item) => {
    const qualified = toNumber(item.qualified_count) > 0;
    const unqualifiedInbound = Number(item.dispose_type) === 40 && toNumber(item.unqualified_count) > 0;
    return scope === 'qualified' ? qualified : unqualifiedInbound;
  }, (item) => scope === 'qualified' ? toNumber(item.qualified_count) : toNumber(item.unqualified_count), options);
  return { checkDoc, preloadReturn: { returnDoc, warehouseId: options?.warehouseId || items[0]?.warehouse_id || checkDoc.warehouse_id, warehouseName: undefined, items } };
}

export async function buildPurchaseReturnOutPreloadByCheck(checkId: string, scope: 'qualified' | 'unqualified' = 'unqualified', options?: { warehouseId?: string; checkItemIds?: string[] }) {
  const checkDoc: any = await getReturnCheckById(RETURN_CHECK_FORM_KEY, checkId);
  if (!checkDoc) throw new Error('未找到检测单');
  const returnDoc: any = await getPurchaseReturn(String(checkDoc.source_return_id || checkDoc.biz_id || ''));
  const items = createPurchaseReturnOutItemsByCheck(checkDoc, returnDoc, scope, (item) => scope === 'qualified' ? false : Number(item.dispose_type) === 20 && toNumber(item.unqualified_count) > 0, (item) => toNumber(item.unqualified_count), options);
  return { checkDoc, preloadReturn: { returnDoc, warehouseId: options?.warehouseId || items[0]?.warehouse_id || checkDoc.warehouse_id, warehouseName: undefined, items } };
}

export async function applyReturnCheckProcessedDelta(rows: Array<{ check_item_id: string; delta_count: number; scope?: string }>) {
  const itemTable = getCheckItemTable();
  const table = getCheckTable();
  const updateMap = new Map<string, { delta: number; scope: string }>();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row?.check_item_id || '').trim();
    if (!key) return;
    const old = updateMap.get(key);
    updateMap.set(key, {
      delta: (old?.delta || 0) + toNumber(row?.delta_count),
      scope: String(row?.scope || old?.scope || ''),
    });
  });
  const ids = [...updateMap.keys()];
  if (ids.length === 0) return null;
  itemTable.Filter = or(...ids.map((id) => cond('id', 'equal', id)));
  const queryParam = { Table: [itemTable], PageParam: { page: 0, index: 1 } };
  const resQuery = await requestClient.post(itemTable.queryUrl, queryParam, { headers: itemTable.getRequestHeader(), responseReturn: 'raw' });
  itemTable.execQueryResult(resQuery);
  const currentItems = (resQuery.data?.Result?.data?.Items || []) as any[];
  const changedItems: any[] = [];
  const affectedCheckIds = new Set<string>();
  const checkIds = [...new Set(currentItems.map((item: any) => String(item?.check_id || '')).filter(Boolean))];
  const checkMap = new Map<string, any>();
  for (const checkId of checkIds) {
    const checkDoc = await getReturnCheckById(RETURN_CHECK_FORM_KEY, checkId);
    if (checkDoc) checkMap.set(checkId, checkDoc);
  }
  currentItems.forEach((item: any) => {
    const payload = updateMap.get(String(item?.id || '').trim());
    if (!payload || !payload.delta) return;
    const checkId = String(item?.check_id || '');
    const bizType = Number(checkMap.get(checkId)?.biz_type || 0);
    let qualifiedProcessed = toNumber(item?.qualified_processed_count);
    let unqualifiedProcessed = toNumber(item?.unqualified_processed_count);
    const scope = String(payload.scope || '');
    if (scope === 'sale_return_in_qualified') qualifiedProcessed += payload.delta;
    else unqualifiedProcessed += payload.delta;
    const next = enrichProcessItem(bizType || 0, { ...item, qualified_processed_count: qualifiedProcessed, unqualified_processed_count: unqualifiedProcessed });
    changedItems.push({ id: next.id, qualified_processed_count: next.qualified_processed_count, unqualified_processed_count: next.unqualified_processed_count, processed_count: next.processed_count, need_process_count: next.need_process_count, process_status: next.process_status });
    if (next.check_id) affectedCheckIds.add(String(next.check_id));
  });
  if (changedItems.length > 0) {
    const saveParam = itemTable.getSaveParam([], changedItems, []);
    await requestClient.post(itemTable.saveUrl, saveParam, { headers: itemTable.getRequestHeader() });
  }
  for (const checkId of affectedCheckIds) {
    const current = await getReturnCheckById(RETURN_CHECK_FORM_KEY, checkId);
    if (!current) continue;
    const meta = buildProcessMeta(current);
    const headerSave = table.getSaveParam([], [{ id: checkId, process_status: meta.process_status, process_status_label: meta.process_status_label, process_progress: '', process_desc: '', updatetime: nowMysql() }], []);
    await requestClient.post(table.saveUrl, headerSave, { headers: table.getRequestHeader() });
  }
  return affectedCheckIds.size > 0 ? [...affectedCheckIds] : null;
}

export async function markReturnCheckProcessed(generateKey: string, rows: Array<{ check_item_id: string; processed_count: number }>) {
  return await applyReturnCheckProcessedDelta((Array.isArray(rows) ? rows : []).map((row) => ({ check_item_id: row.check_item_id, delta_count: row.processed_count, scope: generateKey })));
}
