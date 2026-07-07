import { generateUUID } from '@vben/utils';

import { buildStockRecordAdds } from '#/api/erp/stock/record/stock-record-helper';
import { createStockTable } from '#/api/erp/stock/stock';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { normalizeWarehouseIdToRowid } from '#/api/erp/stock/warehouse';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

import {
  addStockCheckItems,
  deleteStockCheckItems,
  queryStockCheckItems,
  updateStockCheckItems,
} from './checkItems';

const ClientData = clientData;

export namespace ErpStockCheckApi {
  export interface StockCheck {
    rowid?: string;
    id?: string;
    no?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    check_time?: Date | string;
    total_count?: number;
    total_price?: number;
    status?: number;
    remark?: string;
    file_url?: string;
    product_names?: string;
    creator_name?: string;
    items?: StockCheckItem[];

    checkTime?: Date | string;
    totalCount?: number;
    totalPrice?: number;
    fileUrl?: string;
    productNames?: string;
    creatorName?: string;
  }

  export interface StockCheckItem {
    seq?: string;
    id?: string;
    check_id?: string;
    warehouse_id?: string;
    warehouse_name?: string;
    product_id?: string;
    product_name?: string;
    product_unit_id?: string;
    product_unit_name?: string;
    product_bar_code?: string;
    count?: number;
    actual_count?: number;
    product_price?: number;
    total_price?: number;
    stock_count?: number;
    remark?: string;
  }
}

const STOCK_CHECK_MODEL_ID = '473DEA3E76D1BC26D879B903CDE36678';
const STOCK_CHECK_TABLE = 'erp_stock_check';
const STOCK_CHECK_DB = 'LMBill';
const STOCK_CHECK_PK = 'rowid';
const DEFAULT_STATUS = 10;
const STATUS_CONFIRMED = 20;
const STOCK_RECORD_BIZ_TYPE_PROFIT = 3;
const STOCK_RECORD_BIZ_TYPE_LOSS = 4;

function getTable() {
  return createFinanceDataTableCurrent(
    STOCK_CHECK_MODEL_ID,
    STOCK_CHECK_TABLE,
    STOCK_CHECK_DB,
    STOCK_CHECK_PK,
  );
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isBlank(value: unknown) {
  return value === undefined || value === null || String(value).trim() === '';
}

function withItemAlias(item: any) {
  return {
    ...item,
    seq: item?.seq || item?.id || generateUUID(),
    count: toNumber(item?.count),
    stock_count: toNumber(item?.stock_count),
    actual_count:
      item?.actual_count === undefined ||
      item?.actual_count === null ||
      item?.actual_count === ''
        ? undefined
        : toNumber(item?.actual_count),
    product_price: toNumber(item?.product_price),
    total_price: toNumber(item?.total_price),
  };
}

function withAlias(row: any) {
  return {
    ...row,
    checkTime: row?.check_time,
    totalCount: toNumber(row?.total_count),
    totalPrice: toNumber(row?.total_price),
    fileUrl: row?.file_url,
    productNames: row?.product_names,
    creatorName: row?.creator_name,
    total_count: toNumber(row?.total_count),
    total_price: toNumber(row?.total_price),
    items: Array.isArray(row?.items)
      ? row.items.map((item: any) => withItemAlias(item))
      : row?.items,
  };
}

function sanitizeItem(item: ErpStockCheckApi.StockCheckItem, checkId: string) {
  const stockCount = toNumber(item?.stock_count);
  const actualCount =
    item?.actual_count === undefined ||
    item?.actual_count === null ||
    item?.actual_count === ''
      ? undefined
      : toNumber(item?.actual_count);
  const diffCount =
    actualCount === undefined
      ? toNumber(item?.count)
      : Number((actualCount - stockCount).toFixed(6));
  const productPrice = toNumber(item?.product_price);

  return {
    id: item?.id || generateUUID(),
    check_id: checkId,
    warehouse_id: item?.warehouse_id,
    product_id: item?.product_id,
    product_name: item?.product_name,
    product_unit_id: item?.product_unit_id,
    product_unit_name: item?.product_unit_name,
    product_bar_code: item?.product_bar_code,
    product_price: productPrice,
    stock_count: stockCount,
    actual_count: actualCount,
    count: diffCount,
    total_price: 0,
    remark: item?.remark,
  };
}

function buildProductNames(items: ErpStockCheckApi.StockCheckItem[] = []) {
  return [
    ...new Set(
      items
        .map((item) => String(item?.product_name || '').trim())
        .filter(Boolean),
    ),
  ].join('、');
}

function sanitizeData(
  data: ErpStockCheckApi.StockCheck,
  options: { forceStatus?: number; id?: string; rowid?: string } = {},
) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const totalCount = items.reduce(
    (sum, item) => sum + toNumber(item?.actual_count),
    0,
  );
  const productNames = buildProductNames(items);

  return {
    rowid: options.rowid ?? data.rowid,
    id: options.id ?? data.id ?? generateUUID(),
    no: data.no,
    warehouse_id: data.warehouse_id,
    check_time: data.check_time ?? data.checkTime,
    total_count: totalCount,
    total_price: 0,
    status: options.forceStatus ?? data.status ?? DEFAULT_STATUS,
    remark: data.remark,
    file_url: data.file_url ?? data.fileUrl,
    product_names: productNames,
    creator_name: data.creator_name ?? data.creatorName,
  };
}

async function enrichWarehouseNames(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const warehouses = await getWarehouseSimpleList().catch(() => []);
  const warehouseMap = new Map<string, string>();
  for (const item of Array.isArray(warehouses) ? warehouses : []) {
    const key = String(item?.rowid || '').trim();
    if (!key) continue;
    warehouseMap.set(key, String(item?.name || key));
  }
  return list.map((row) => ({
    ...row,
    warehouse_name:
      row?.warehouse_name ||
      warehouseMap.get(String(row?.warehouse_id || '').trim()) ||
      row?.warehouse_id ||
      '-',
  }));
}

export async function getStockCheckPage(params: any) {
  const dataTable = getTable();

  if (params?.no) {
    dataTable.Filter = and(dataTable.Filter, cond('no', 'contains', params.no));
  }
  if (params?.warehouse_id) {
    dataTable.Filter = and(
      dataTable.Filter,
      cond('warehouse_id', 'equal', params.warehouse_id),
    );
  }
  if (
    params?.status !== undefined &&
    params?.status !== null &&
    params?.status !== ''
  ) {
    dataTable.Filter = and(
      dataTable.Filter,
      cond('status', 'equal', params.status),
    );
  }
  const checkTime = params?.check_time ?? params?.checkTime;
  if (Array.isArray(checkTime) && checkTime.length === 2) {
    dataTable.Filter = and(
      dataTable.Filter,
      cond('check_time', 'greaterthanorequal', checkTime[0]),
      cond('check_time', 'lessthanorequal', checkTime[1]),
    );
  }

  const queryParam: any = {
    Table: [dataTable],
    PageParam: {
      page: params?.page || 0,
      index: params?.pageNo || params?.page || 1,
    },
  };

  const resQuery = await requestClient.post(dataTable.queryUrl, queryParam, {
    headers: dataTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  dataTable.execQueryResult(resQuery);

  const resData = resQuery.data?.Result?.data;
  const returnData = new ClientData();
  returnData.dataTable = dataTable;
  const rows = Array.isArray(resData?.Items) ? resData.Items : [];
  const enrichedRows = await enrichWarehouseNames(rows);
  returnData.list = enrichedRows.map((row) => withAlias(row));
  returnData.total = resData?.Count ?? rows.length;
  return returnData;
}

export async function getStockCheck(idOrRowId: number | string) {
  const dataTable = getTable();
  dataTable.Filter = or(
    cond(STOCK_CHECK_PK, 'equal', idOrRowId),
    cond('id', 'equal', idOrRowId),
  );

  const queryParam = {
    Table: [dataTable],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(dataTable.queryUrl, queryParam, {
    headers: dataTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  dataTable.execQueryResult(resQuery);
  const row = resQuery.data?.Result?.data?.Items?.[0];
  if (!row) return null;

  const itemRes = await queryStockCheckItems({ check_id: String(row.id) });
  const enrichedRows = await enrichWarehouseNames([
    { ...row, items: itemRes.list || [] },
  ]);
  const enrichedRow = enrichedRows[0];
  return withAlias({
    ...enrichedRow,
    items: Array.isArray(itemRes.list)
      ? itemRes.list.map((item: any) => withItemAlias(item))
      : [],
  });
}

export async function createStockCheck(data: ErpStockCheckApi.StockCheck) {
  const dataTable = getTable();
  const id = String(data?.id || generateUUID());
  const rowid = String(data?.rowid || generateUUID());
  const items = Array.isArray(data?.items) ? data.items : [];
  const normalizedItems = items.map((item) => sanitizeItem(item, id));
  const normalized = sanitizeData(
    { ...data, items: normalizedItems },
    { id, rowid, forceStatus: DEFAULT_STATUS },
  );

  const saveParam = dataTable.getSaveParam([normalized], [], []);
  await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });

  if (normalizedItems.length > 0) {
    await addStockCheckItems(normalizedItems);
  }

  return { id, rowid };
}

export async function updateStockCheck(data: ErpStockCheckApi.StockCheck) {
  const dataTable = getTable();
  const current = await getStockCheck(String(data?.id || data?.rowid || ''));
  if (!current?.rowid || !current?.id) {
    throw new Error('未找到要修改的盘点单');
  }

  const nextItems = Array.isArray(data?.items) ? data.items : [];
  const normalizedItems = nextItems.map((item) =>
    sanitizeItem(item, String(current.id)),
  );
  const existingItems = Array.isArray(current.items) ? current.items : [];

  const createList = normalizedItems.filter(
    (item) =>
      !existingItems.some(
        (existing) => String(existing.id) === String(item.id),
      ),
  );
  const updateList = normalizedItems.filter((item) =>
    existingItems.some((existing) => String(existing.id) === String(item.id)),
  );
  const deleteIds = existingItems
    .filter(
      (existing) =>
        !normalizedItems.some(
          (item) => String(item.id) === String(existing.id),
        ),
    )
    .map((item) => String(item.id || '').trim())
    .filter(Boolean);

  if (createList.length > 0) {
    await addStockCheckItems(createList);
  }
  if (updateList.length > 0) {
    await updateStockCheckItems(updateList);
  }
  if (deleteIds.length > 0) {
    await deleteStockCheckItems(deleteIds);
  }

  const normalized = sanitizeData(
    { ...current, ...data, items: normalizedItems },
    {
      id: String(current.id),
      rowid: String(current.rowid),
      forceStatus: current.status,
    },
  );
  const saveParam = dataTable.getSaveParam([], [normalized], []);
  return await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });
}

export async function confirmStockCheck(idOrRowId: number | string) {
  const stockCheck = await getStockCheck(idOrRowId);
  if (!stockCheck?.rowid || !stockCheck?.id) {
    throw new Error('未找到该盘点单');
  }
  if (Number(stockCheck.status) === STATUS_CONFIRMED) {
    throw new Error('该盘点单已确认');
  }
  if (!stockCheck.warehouse_id) {
    throw new Error('盘点单缺少仓库信息，无法确认');
  }

  const items = Array.isArray(stockCheck.items)
    ? stockCheck.items.map((item: any) => withItemAlias(item))
    : [];
  if (items.length === 0) {
    throw new Error('盘点单至少需要一条盘点项才能确认');
  }

  for (const [index, item] of items.entries()) {
    if (isBlank(item.actual_count)) {
      throw new Error(`第 ${index + 1} 行：实际库存不能为空`);
    }
    if (toNumber(item.actual_count) < 0) {
      throw new Error(`第 ${index + 1} 行：实际库存不能小于 0`);
    }
  }

  const warehouseId = await normalizeWarehouseIdToRowid(stockCheck.warehouse_id);
  const stockTable = createStockTable();
  stockTable.Filter = cond('warehouse_id', 'equal', warehouseId);
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
  const stockRows = (stockRes.data?.Result?.data?.Items || []) as any[];
  const stockMap = new Map<string, any>();
  for (const row of stockRows) {
    const key = `${String(row?.warehouse_id || '')}@@${String(row?.product_id || '')}`;
    stockMap.set(key, row);
  }

  const diffItems = items
    .map((item) => {
      const stockCount = toNumber(item.stock_count);
      const actualCount = toNumber(item.actual_count);
      const diffCount = Number((actualCount - stockCount).toFixed(6));
      return {
        ...item,
        stock_count: stockCount,
        actual_count: actualCount,
        count: diffCount,
      };
    })
    .filter((item) => item.count !== 0);

  const stockUpdateList: any[] = [];
  const profitDeltas: any[] = [];
  const lossDeltas: any[] = [];

  for (const item of diffItems) {
    const key = `${warehouseId}@@${String(item.product_id || '')}`;
    const stockRow = stockMap.get(key);
    if (!stockRow?.rowid) {
      throw new Error(
        `库存记录缺失：产品 ${item.product_name || item.product_id}`,
      );
    }
    stockUpdateList.push({
      rowid: stockRow.rowid,
      count: item.actual_count,
    });

    const delta = {
      product_id: item.product_id,
      warehouse_id: warehouseId,
      delta: item.count,
      total_count: item.actual_count,
    };
    if (item.count > 0) {
      profitDeltas.push(delta);
    } else if (item.count < 0) {
      lossDeltas.push(delta);
    }
  }

  const requestList = [...stockTable.getSaveParam([], stockUpdateList, [])];

  if (profitDeltas.length > 0) {
    const profitRecord = await buildStockRecordAdds(profitDeltas, {
      biz_type: STOCK_RECORD_BIZ_TYPE_PROFIT,
      biz_no: String(stockCheck.no || stockCheck.id),
      description: '库存盘点确认-盘盈',
      biz_time: stockCheck.check_time ?? stockCheck.checkTime,
    });
    requestList.push(
      ...profitRecord.table.getSaveParam(profitRecord.adds, [], []),
    );
  }
  if (lossDeltas.length > 0) {
    const lossRecord = await buildStockRecordAdds(lossDeltas, {
      biz_type: STOCK_RECORD_BIZ_TYPE_LOSS,
      biz_no: String(stockCheck.no || stockCheck.id),
      description: '库存盘点确认-盘亏',
      biz_time: stockCheck.check_time ?? stockCheck.checkTime,
    });
    requestList.push(...lossRecord.table.getSaveParam(lossRecord.adds, [], []));
  }

  const normalizedItems = items.map((item: any) =>
    sanitizeItem(item, String(stockCheck.id)),
  );
  if (normalizedItems.length > 0) {
    await updateStockCheckItems(normalizedItems);
  }

  const mainTable = getTable();
  const normalized = sanitizeData(
    { ...stockCheck, items: normalizedItems },
    {
      id: String(stockCheck.id),
      rowid: String(stockCheck.rowid),
      forceStatus: STATUS_CONFIRMED,
    },
  );
  requestList.push(...mainTable.getSaveParam([], [normalized], []));

  return await requestClient.post(mainTable.saveUrl, requestList, {
    headers: mainTable.getRequestHeader(),
  });
}

export async function deleteStockCheck(ids: Array<number | string>) {
  const dataTable = getTable();
  const deleteList: Array<Record<string, any>> = [];

  for (const id of ids) {
    const stockCheck = await getStockCheck(id);
    if (!stockCheck?.rowid || !stockCheck?.id) continue;
    if (Number(stockCheck.status) === STATUS_CONFIRMED) {
      throw new Error(
        `已确认盘点单不允许删除：${stockCheck.no || stockCheck.id}`,
      );
    }
    const itemIds = (Array.isArray(stockCheck.items) ? stockCheck.items : [])
      .map((item) => String(item?.id || '').trim())
      .filter(Boolean);
    if (itemIds.length > 0) {
      await deleteStockCheckItems(itemIds);
    }
    deleteList.push({ [STOCK_CHECK_PK]: stockCheck.rowid });
  }

  if (deleteList.length === 0) return;
  const saveParam = dataTable.getSaveParam([], [], deleteList);
  return await requestClient.post(dataTable.saveUrl, saveParam, {
    headers: dataTable.getRequestHeader(),
  });
}

export function exportStockCheck(params: any) {
  return requestClient.download('/erp/stock-check/export-excel', {
    params,
  });
}
