import { exportExcelByConfig } from '#/api/common/import-export';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';
import {
  getWarehouseIdentityKeys,
  getWarehouseSimpleList,
  normalizeWarehouseIdToRowid,
} from '#/api/erp/stock/warehouse';
import { and, clientData, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export namespace ErpStockRecordApi {
  export interface StockRecord {
    rowid: string;
    product_id: number | string;
    warehouse_id: number | string;
    count: number;
    total_count: number;
    biz_type: number;
    biz_id: number;
    biz_item_id: number;
    biz_no: string;
    biz_time?: string;
    create_time: string;
    creator?: string;
    updater?: string;
    update_time?: string;
    tenant_id?: number;
    description?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    lingma_sys_is_delete?: number;
    lingma_sys_ent?: string;
    account_set_id?: string;
  }
}

export const STOCK_RECORD_MODEL_ID = '9849F16EED753375A002331D8B98C9A9';
export const STOCK_RECORD_TABLE_NAME = 'erp_stock_record';
export const STOCK_RECORD_DB_NAME = 'LMBill';
export const STOCK_RECORD_PK = 'rowid';

export function createStockRecordTable(formKey = STOCK_RECORD_MODEL_ID) {
  return createFinanceDataTableCurrent(
    formKey,
    STOCK_RECORD_TABLE_NAME,
    STOCK_RECORD_DB_NAME,
    STOCK_RECORD_PK,
  );
}

export const STOCK_RECORD_TABLE = createStockRecordTable();

function getWarehouseKeys(item: any) {
  return [item?.id, item?.rowid, item?.warehouse_id]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
}

function getPositiveNumber(value: unknown, defaultValue: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : defaultValue;
}

async function enrichWarehouseNames(list: any[]) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const warehouses = await getWarehouseSimpleList().catch(() => []);
  const warehouseNameMap = new Map<string, string>();

  for (const warehouse of Array.isArray(warehouses) ? warehouses : []) {
    const name = String(
      warehouse?.name || warehouse?.warehouse_name || '',
    ).trim();
    if (!name) continue;
    for (const key of getWarehouseKeys(warehouse)) {
      warehouseNameMap.set(key, name);
    }
  }

  return list.map((row) => {
    const rowWarehouseId = String(row?.warehouse_id ?? '').trim();
    const warehouseName =
      String(row?.warehouse_name || row?.warehouseName || '').trim() ||
      warehouseNameMap.get(rowWarehouseId) ||
      '';

    return {
      ...row,
      warehouse_name: warehouseName || '未匹配仓库名称',
    };
  });
}

/** 查询产品库存明细分页 */
export async function getStockRecordPage(
  params: any,
  formKey = STOCK_RECORD_MODEL_ID,
) {
  const table = createStockRecordTable(formKey);
  const conditions: any[] = [];
  if (params.product_id) {
    conditions.push(cond('product_id', 'equal', params.product_id));
  }
  if (params.warehouse_id) {
    const warehouseKeys = await getWarehouseIdentityKeys(params.warehouse_id);
    conditions.push(
      warehouseKeys.length > 1
        ? or(...warehouseKeys.map((key) => cond('warehouse_id', 'equal', key)))
        : cond('warehouse_id', 'equal', params.warehouse_id),
    );
  }
  if (params.biz_type) {
    conditions.push(cond('biz_type', 'equal', params.biz_type));
  }
  if (params.biz_no) {
    conditions.push(cond('biz_no', 'contains', params.biz_no));
  }
  const bizTime = params.biz_time ?? params.create_time;
  if (bizTime && bizTime.length === 2) {
    conditions.push(
      cond('biz_time', 'greaterthanorequal', bizTime[0]),
      cond('biz_time', 'lessthanorequal', bizTime[1]),
    );
  }

  table.Filter = conditions.length > 0 ? and(...conditions) : null;

  const index = getPositiveNumber(
    params.index ?? params.pageNo ?? params.page,
    1,
  );
  const size = getPositiveNumber(params.size ?? params.page, 20);

  const queryParam = {
    Table: [table],
    PageParam: {
      page: size,
      index,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  // eslint-disable-next-line new-cap
  const returnData = new clientData();
  returnData.dataTable = table;

  const rows = Array.isArray(resData?.Items) ? resData.Items : [];
  returnData.list = await enrichWarehouseNames(rows);
  returnData.total = resData?.Count ?? rows.length;
  return returnData;
}

/** 按业务类型 + 业务单号查询库存流水 */
export async function getStockRecordListByBizNo(
  bizType: number,
  bizNo: string,
  formKey = STOCK_RECORD_MODEL_ID,
) {
  const table = createStockRecordTable(formKey);
  table.Filter = and(
    cond('biz_type', 'equal', bizType),
    cond('biz_no', 'equal', bizNo),
  );

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  return Array.isArray(resData?.Items) ? resData.Items : [];
}

/** 导出产品库存明细 Excel */
export function exportStockRecord(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: STOCK_RECORD_MODEL_ID,
      tableName: STOCK_RECORD_TABLE_NAME,
      dbName: STOCK_RECORD_DB_NAME,
      primaryKey: STOCK_RECORD_PK,
      fileName: '产品库存明细',
      encodingId,
      extraData: params,
    });
  }

  return requestClient.download('/erp/stock-record/export-excel', { params });
}

/** 批量新增库存流水 */
export async function addStockRecordList(
  list: Partial<ErpStockRecordApi.StockRecord>[],
  formKey = STOCK_RECORD_MODEL_ID,
) {
  const table = createStockRecordTable(formKey);
  const normalizedList = await Promise.all(
    (Array.isArray(list) ? list : []).map(async (row: any) => ({
      ...row,
      warehouse_id: row?.warehouse_id
        ? await normalizeWarehouseIdToRowid(row.warehouse_id)
        : row?.warehouse_id,
    })),
  );
  const saveParam = table.getSaveParam(normalizedList, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 按 rowid 批量删除库存流水 */
export async function deleteStockRecordList(
  rowids: string[] | { rowid: string }[],
  formKey = STOCK_RECORD_MODEL_ID,
) {
  const table = createStockRecordTable(formKey);
  const delArr =
    Array.isArray(rowids) && typeof rowids[0] === 'string'
      ? rowids.map((id) => ({ rowid: id }))
      : rowids;
  const saveParam = table.getSaveParam([], [], delArr);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
