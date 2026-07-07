import { clientData } from '#/api/qyapi';

const STORAGE_KEY = 'erp_inventory_cost_adjust_rows';

export namespace ErpInventoryCostAdjustApi {
  export interface CostAdjustRow {
    id?: string;
    no?: string;
    adjust_date?: string;
    product_id?: string;
    product_name?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    before_count?: number;
    before_amount?: number;
    before_unit_cost?: number;
    adjust_amount?: number;
    after_amount?: number;
    after_unit_cost?: number;
    reason?: string;
    remark?: string;
    status?: number;
    create_time?: string;
  }
}

function readRows() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeRows(rows: ErpInventoryCostAdjustApi.CostAdjustRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function getId() {
  return `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
}

function getNo() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `CHTZ-${ymd}-${String(date.getTime()).slice(-5)}`;
}

function matchText(value: unknown, keyword: unknown) {
  if (!keyword) return true;
  return String(value ?? '').includes(String(keyword));
}

export async function getInventoryCostAdjustPage(params: any) {
  const pageNo = Number(params?.pageNo || params?.index || 1);
  const pageSize = Number(params?.page || params?.pageSize || 10);
  const rows = readRows().filter((row: ErpInventoryCostAdjustApi.CostAdjustRow) => {
    if (!matchText(row.no, params?.no)) return false;
    if (!matchText(row.product_name, params?.product_name)) return false;
    if (!matchText(row.warehouse_name, params?.warehouse_name)) return false;
    if (params?.status && Number(row.status) !== Number(params.status)) return false;
    return true;
  });
  const start = (pageNo - 1) * pageSize;
  const returnData = new clientData();
  returnData.list = pageSize === 0 ? rows : rows.slice(start, start + pageSize);
  returnData.total = rows.length;
  return returnData;
}

export async function createInventoryCostAdjust(row: ErpInventoryCostAdjustApi.CostAdjustRow) {
  const rows = readRows();
  const beforeCount = Number(row.before_count || 0);
  const beforeAmount = Number(row.before_amount || 0);
  const adjustAmount = Number(row.adjust_amount || 0);
  const afterAmount = Number((beforeAmount + adjustAmount).toFixed(2));
  const item = {
    ...row,
    id: getId(),
    no: row.no || getNo(),
    status: 10,
    before_unit_cost: beforeCount === 0 ? 0 : Number((beforeAmount / beforeCount).toFixed(6)),
    after_amount: afterAmount,
    after_unit_cost: beforeCount === 0 ? 0 : Number((afterAmount / beforeCount).toFixed(6)),
    create_time: new Date().toLocaleString('zh-CN', { hour12: false }),
  };
  rows.unshift(item);
  writeRows(rows);
  return item;
}

export async function updateInventoryCostAdjust(row: ErpInventoryCostAdjustApi.CostAdjustRow) {
  const rows = readRows();
  const index = rows.findIndex((item: ErpInventoryCostAdjustApi.CostAdjustRow) => item.id === row.id);
  if (index >= 0) rows[index] = { ...rows[index], ...row };
  writeRows(rows);
  return rows[index];
}

export async function updateInventoryCostAdjustStatus(id: string, status: number) {
  const rows = readRows();
  const row = rows.find((item: ErpInventoryCostAdjustApi.CostAdjustRow) => item.id === id);
  if (row) row.status = status;
  writeRows(rows);
  return row;
}

export async function deleteInventoryCostAdjust(id: string) {
  writeRows(readRows().filter((row: ErpInventoryCostAdjustApi.CostAdjustRow) => row.id !== id));
}
