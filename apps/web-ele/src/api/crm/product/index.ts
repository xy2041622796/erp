import type { PageParam, PageResult } from '@vben/request';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTableCurrent } from '#/api/erp/finance/common/account-set-scope';

// TODO: 需替换为实际 ModelID
const FORM_ID = '808171E1BEEB39628534FFE429195F38';
const TABLE_NAME = 'Bil_Product_Info';
const DB_NAME = 'LMBill';
const PRIMARY_KEY = 'rowid';

export namespace CrmProductApi {
  /** 产品信息 */
  export interface Product {
    rowid?: string;
    id?: number | string;
    name: string;
    no: string;
    unit: number;
    price: number;
    status: number;
    categoryId: number;
    categoryName?: string;
    description: string;
    ownerUserId: number;
  }
}

/** 查询产品列表 */
export async function getProductPage(params: any & PageParam) {
  const table = createFinanceDataTableCurrent(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const conditions: any[] = [];
  if (params.name) {
    conditions.push(cond('name', 'contains', params.name));
  }
  if (params.no) {
    conditions.push(cond('no', 'contains', params.no));
  }
  // status, categoryId, etc. logic here if needed
  if (conditions.length > 0) {
    table.Filter = and(...conditions);
  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0,
      index: 1,
    },
  };

  if (params.page && params.pageNo) {
    queryParam.PageParam = {
      page: params.page,
      index: params.pageNo,
    };
  }

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);

  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = table;

  if (params.page && params.pageNo) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  } else {
    returnData.list = resData.Items;
    if (resData.Count) returnData.total = resData.Count;
  }
  return returnData as any as PageResult<CrmProductApi.Product>;
}

/** 获得产品精简列表 */
export async function getProductSimpleList() {
  const res = await getProductPage({ page: 0, pageNo: 1 });
  return (res as any).list;
}

/** 查询产品详情 */
export async function getProduct(id: number | string) {
  const table = createFinanceDataTableCurrent(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);

  table.Filter =
    typeof id === 'number'
      ? and(cond('id', 'equal', id))
      : and(cond('rowid', 'equal', id));

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const items = resQuery.data.Result.data.Items;
  if (items && items.length > 0) {
    return items[0] as CrmProductApi.Product;
  }
  return null;
}

/** 新增产品 */
export async function createProduct(data: CrmProductApi.Product) {
  const table = createFinanceDataTableCurrent(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([data], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 修改产品 */
export async function updateProduct(data: CrmProductApi.Product) {
  const table = createFinanceDataTableCurrent(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除产品 */
export async function deleteProduct(ids: number | string | string[]) {
  const table = createFinanceDataTableCurrent(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  let deleteList: any[] = [];
  if (Array.isArray(ids)) {
    deleteList = ids.map((id) => ({ [PRIMARY_KEY]: id }));
  } else if (typeof ids === 'string' || typeof ids === 'number') {
    deleteList = [{ [PRIMARY_KEY]: ids }];
  }
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 导出产品 */
export function exportProduct(params: any) {
  return requestClient.download('/crm/product/export-excel', { params });
}
