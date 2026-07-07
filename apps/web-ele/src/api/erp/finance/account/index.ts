import type { PageParam } from '@vben/request';

import { generateUUID } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

const appId = 'F3C86B148E253A0612263D753F2C5261';
const tableName = 'erp_account';
const dbName = 'LMBill';
const primaryKey = 'rowid';
const ACCOUNT_CODE_RULE_ID = '9E1496C871C607F79ABA5DCD72F8C21D';

export namespace ErpAccountApi {
  /** 结算账户信息 */
  export interface Account {
    rowid?: string;
    id?: number;
    no: string;
    remark: string;
    status: number;
    sort: number;
    default_status: boolean;
    name: string;
  }
}

/** 查询结算账户分页 */
export async function getAccountPage(
  params: ErpAccountApi.Account & PageParam,
) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const conditions: any[] = [];
  const { pageNo, page, ...others } = params;

  if (others.name) {
    conditions.push(cond('name', 'contains', others.name));
  }
  if (others.no) {
    conditions.push(cond('no', 'contains', others.no));
  }

  if (conditions.length > 0) {
    customerTable.Filter = and(...conditions);
  }

  const queryParam = {
    PageParam: {
      index: pageNo || 0,
      page: page || 100,
    },
    Table: [customerTable],
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    { headers: customerTable.getRequestHeader(), responseReturn: 'raw' },
  );

  customerTable.execQueryResult(resQuery);

  const resData = resQuery.data?.Result?.data;
  const returnData = new clientData();
  returnData.dataTable = customerTable;

  if (page && pageNo) {
    returnData.list = resData?.Items || [];
    returnData.total = resData?.Count || 0;
  } else {
    returnData.list = resData?.Items || [];
    returnData.total = resData?.Count || 0;
  }

  return returnData;
}

/** 查询结算账户精简列表 */
export async function getAccountSimpleList() {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const queryParam = {
    PageParam: {
      index: 1,
      page: 0,
    },
    Table: [customerTable],
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    { headers: customerTable.getRequestHeader(), responseReturn: 'raw' },
  );

  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data;

  const returnData = new clientData();
  returnData.dataTable = customerTable;
  returnData.list = resData?.Items || [];
  return returnData.list as any[];
}

/** 查询结算账户详情 */
export async function getAccount(id: number | string) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  customerTable.Filter = and(cond(primaryKey, 'equal', id));

  const queryParam = {
    PageParam: {
      index: 1,
      page: 0,
    },
    Table: [customerTable],
  };

  const resQuery = await requestClient.post(
    customerTable.queryUrl,
    queryParam,
    { headers: customerTable.getRequestHeader(), responseReturn: 'raw' },
  );

  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data?.Result?.data;

  return resData?.Items?.[0] || [];
}

/** 新增结算账户（自动生成账户编码 no） */
export async function createAccount(data: ErpAccountApi.Account) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const rowid = data.rowid || generateUUID();
  const createData = {
    ...data,
    rowid,
    no: data.no || undefined,
  };
  const saveParam = customerTable.getSaveParam([createData], [], []);

  const hasCode = !!String(data.no || '').trim();

  try {
    const createRes = await requestClient.post(customerTable.saveUrl, saveParam, {
      headers: customerTable.getRequestHeader(),
      responseReturn: 'raw',
    });

    if (hasCode) {
      return createRes;
    }

    const codeRes = await getCodeString(
      rowid,
      ACCOUNT_CODE_RULE_ID,
      customerTable.getRequestHeader(),
    );

    if (codeRes?.Code === 200 && codeRes?.Message) {
      const updateParam = customerTable.getSaveParam(
        [],
        [{ rowid, no: codeRes.Message }],
        [],
      );
      await requestClient.post(customerTable.saveUrl, updateParam, {
        headers: customerTable.getRequestHeader(),
        responseReturn: 'raw',
      });
      return createRes;
    }

    const rollbackParam = customerTable.getSaveParam([], [], [{ rowid }]);
    await requestClient.post(customerTable.saveUrl, rollbackParam, {
      headers: customerTable.getRequestHeader(),
      responseReturn: 'raw',
    });
    return Promise.reject(new Error(codeRes?.Message || '获取编码失败'));
  } catch (error) {
    try {
      const rollbackParam = customerTable.getSaveParam([], [], [{ rowid }]);
      await requestClient.post(customerTable.saveUrl, rollbackParam, {
        headers: customerTable.getRequestHeader(),
        responseReturn: 'raw',
      });
    } catch {
      // ignore rollback errors
    }
    throw error;
  }
}

/** 修改结算账户 */
export async function updateAccount(data: ErpAccountApi.Account) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const saveParam = customerTable.getSaveParam([], [data], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 修改结算账户默认状态 */
export async function updateAccountDefaultStatus(
  id: number | string,
  default_status: boolean,
) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const updateData = { [primaryKey]: id, default_status };
  const saveParam = customerTable.getSaveParam([], [updateData], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 删除结算账户 */
export async function deleteAccount(id: number | string) {
  const customerTable = new DataTable(appId, tableName, dbName, primaryKey);
  const deleteList = [{ [primaryKey]: id }];
  const saveParam = customerTable.getSaveParam([], [], deleteList);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 导出结算账户 Excel */
export function exportAccount(params: any) {
  return requestClient.download('/erp/account/export-excel', { params });
}
