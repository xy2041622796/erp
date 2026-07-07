import QB, { and, clientData, cond, DataTable, qyOperatorEnum, userinfoTokenKey } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

export const modelID = 'F0BA18993242D85B7EF85D41BC65E030';
export const tableName = 'Base_UserInfo';
export const dbName = 'QYVirtualPlat';
export const pkField = 'ID';
const userCodeRule = '39F61E990F279588467140E4C2176091';

export namespace SystemUserApi {
  /** 用户信息 - Base_UserInfo */
  export interface User {
    ROWID?: string;
    UserName?: string;
    LoginName?: string;
    LoginPass?: string;
    Sex?: string | number;
    IDCard?: string;
    CreateTime?: string;
    State?: number;
    IsWork?: number;
    ID?: string;
    DepID?: string;
    DepName?: string;
    rank_id?: string;
    rank_code?: string;
    rank_name?: string;
    wfid?: string;
    flowstate?: number;
    Flag?: string;
    EntId?: string;
    entInfoUserPhone?: string;
    Age?: number;
    mailbox?: string;
    Address?: string;
    Height?: string;
    Birthday?: string | null;
    NativePlace?: string;
    Nation?: string;
    MaritalStatus?: string;
    PermanentTenancy?: string;
    Path?: string;
    memo?: string;
    createuser?: string;
    updateuser?: string;
    updatetime?: string;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    WechatId?: string;
    WeChatOpenId?: string;
    lingma_sys_ent?: string;
    id?: string;
    username?: string;
  }
}

/** 查询用户管理列表 */
export async function getUserPage(params: any) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const filters = [];

  const name = params.username || params.UserName;
  if (name) filters.push(cond('UserName', qyOperatorEnum.contains, name));

  const loginName = params.nickname || params.LoginName;
  if (loginName) filters.push(cond('LoginName', qyOperatorEnum.contains, loginName));

  const status = params.status === undefined ? params.State : params.status;
  if (status !== undefined) filters.push(cond('State', qyOperatorEnum.equal, status));

  const mobile = params.mobile || params.entInfoUserPhone;
  if (mobile) filters.push(cond('entInfoUserPhone', qyOperatorEnum.contains, mobile));

  if (params.deptId) filters.push(cond('DepID', qyOperatorEnum.equal, params.deptId));
  if (!params.deptId && params.deptName) filters.push(cond('DepName', qyOperatorEnum.contains, params.deptName));

  if (filters.length > 0) customerTable.Filter = and(...filters);

  const queryParam: any = {
    Table: [customerTable],
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

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = customerTable;

  if (params.page && params.pageNo) {
    returnData.list = resData?.Items || [];
    returnData.total = resData?.Count || 0;
  } else if (resData?.Items?.length > 0) {
    returnData.list = resData.Items;
    returnData.total = resData.Count || resData.Items.length;
  } else {
    returnData.list = [];
    returnData.total = 0;
  }

  return returnData;
}

/** 查询用户详情 */
export async function getUser(id: string) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  customerTable.Filter = and(cond(pkField, qyOperatorEnum.equal, id));

  const queryParam = {
    Table: [customerTable],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = customerTable;

  if (resData.Items && resData.Items.length > 0) returnData.list = resData.Items[0];
  return returnData;
}

/** 按 ROWID 查询用户详情（兼容业务字段存 ROWID 的场景） */
export async function getUserByRowid(rowid: string) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  customerTable.Filter = and(cond('ROWID', qyOperatorEnum.equal, rowid));

  const queryParam = {
    Table: [customerTable],
    PageParam: {
      page: 1,
      index: 1,
    },
  };

  const resQuery = await requestClient.post(customerTable.queryUrl, queryParam, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  customerTable.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  const returnData = new clientData();
  returnData.dataTable = customerTable;

  if (resData.Items && resData.Items.length > 0) returnData.list = resData.Items[0];
  return returnData;
}

function getCurrentEntId() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(userinfoTokenKey) || window.sessionStorage.getItem(userinfoTokenKey) || '';
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.EntId || parsed?.entId || parsed?.Result?.EntId || '').trim();
  } catch {
    return '';
  }
}

function emptyToNull<T>(value: T): T | null {
  return value === '' ? null : value;
}

function normalizeUserDateFields<T extends SystemUserApi.User>(data: T): T {
  return {
    ...data,
    Birthday: emptyToNull(data.Birthday),
  };
}

async function loadUserTableById(id: string) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  customerTable.Filter = and(cond('ID', qyOperatorEnum.equal, id));
  const resQuery = await requestClient.post(customerTable.queryUrl, {
    Table: [customerTable],
    PageParam: { page: 1, index: 1 },
  }, {
    headers: customerTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  customerTable.execQueryResult(resQuery);
  return customerTable;
}

/** 新增用户 */
export async function createUser(data: SystemUserApi.User) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const id = data.ID || QB.GetNewGUID();
  const loginName = String(data.LoginName || data.UserName || '').trim();

  const saveData: SystemUserApi.User = normalizeUserDateFields({
    State: Number(data.State ?? 1),
    ID: id,
    LoginName: loginName,
    Path: data.Path || '',
    ROWID: data.ROWID || '',
    LoginPass: data.LoginPass || '',
    UserName: data.UserName,
    Sex: data.Sex || 'M',
    MaritalStatus: data.MaritalStatus || '0',
    Nation: data.Nation || '',
    IDCard: data.IDCard || '',
    entInfoUserPhone: data.entInfoUserPhone || '',
    mailbox: data.mailbox || '',
    NativePlace: data.NativePlace || '',
    PermanentTenancy: data.PermanentTenancy || '',
    Address: data.Address || '',
    memo: data.memo || '',
    EntId: data.EntId || getCurrentEntId(),
    Age: data.Age,
    Birthday: data.Birthday,
  });

  const saveParam = customerTable.getSaveParam([saveData], [], []);
  const saveResult = await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });

  const codeResult: any = await getCodeString(id, userCodeRule, customerTable.getRequestHeader());
  const codeData = codeResult?.data || codeResult;
  if (codeData?.Code === 400 || !codeData?.Message) {
    throw new Error('添加失败');
  }

  const updateTable = await loadUserTableById(id);
  const updateParam = updateTable.getSaveParam([], [{ ID: id, ROWID: codeData.Message }], []);
  await requestClient.post(updateTable.saveUrl, updateParam, {
    headers: updateTable.getRequestHeader(),
  });
  return saveResult;
}

/** 修改用户 */
export async function updateUser(data: SystemUserApi.User) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const loginName = String(data.LoginName || data.UserName || '').trim();
  const saveData = normalizeUserDateFields({ ...data, LoginName: loginName || data.LoginName });
  const saveParam = customerTable.getSaveParam([], [saveData], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 删除用户 */
export async function deleteUser(id: string) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const saveParam = customerTable.getSaveParam([], [], [{ [pkField]: id }]);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 批量删除用户 */
export async function deleteUserList(ids: string | string[]) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  let deleteList: any[] = [];

  if (Array.isArray(ids)) {
    deleteList = ids.map((id) => ({ [pkField]: id }));
  } else if (typeof ids === 'string') {
    deleteList = ids.split(',').map((id) => ({ [pkField]: id }));
  }

  const saveParam = customerTable.getSaveParam([], [], deleteList);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 用户密码重置 */
export async function resetUserPassword(id: string, password: string) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const data = { [pkField]: id, LoginPass: password };
  const saveParam = customerTable.getSaveParam([], [data], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 用户状态修改 */
export async function updateUserStatus(id: string, status: number) {
  const customerTable = new DataTable(modelID, tableName, dbName, pkField);
  const data = { [pkField]: id, State: status };
  const saveParam = customerTable.getSaveParam([], [data], []);
  return await requestClient.post(customerTable.saveUrl, saveParam, {
    headers: customerTable.getRequestHeader(),
  });
}

/** 导出用户 */
export function exportUser(params: any) {
  return requestClient.download('/system/user/export-excel', { params });
}

/** 下载用户导入模板 */
export function importUserTemplate() {
  return requestClient.download('/system/user/get-import-template');
}

/** 导入用户 */
export function importUser(file: File, updateSupport: boolean) {
  const payload: Record<string, any> & { upCtrl_Input: Blob | File } = {
    upCtrl_Input: file,
    updateSupport,
  };
  return requestClient.upload('/system/user/import', payload);
}

/** 获取用户精简信息列表 */
export async function getSimpleUserList() {
  const res = await getUserPage({ page: 0 });
  return res.list as any[];
}
