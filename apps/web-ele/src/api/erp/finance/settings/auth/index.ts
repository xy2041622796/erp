import { generateUUID } from '@vben/utils';

import { DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

const PAGE_FORM_KEY = '34BD9608FE6942D793AD2A9F446CB496';
const FIRST_FOLDER = 'NewApp';

const ROLE_HOST_DB_ID = 'BA0159D310154FEC9CFEF05558DEA012';
const ROLE_LIST_FORM_KEY = '9BB57B29626F4B5EB06C7C23055F25C0';
const ROLE_CLASS_ID = '6111300AFC9E4DA083C067EFE1655D49';

const ROLE_INFO_TABLE = 'Base_RoleInfo';
const ROLE_INFO_DB = 'QYVirtualPlat';
const ROLE_INFO_KEY = 'B567074D82D649C8AFCA11DBCEC7D518';
const ROLE_INFO_PK = 'rowid';

const ROLE_USER_TABLE = 'Base_MainBody_RoleUser';
const ROLE_USER_DB = 'QYVirtualPlat';
const ROLE_USER_KEY = '30B5316B73CC40D497E5CB659F42054D';
const ROLE_USER_PK = 'rowid';

export interface RoleHostOption {
  id: string;
  text: string;
  lingma_sys_key?: string;
  lingma_sys_params?: Record<string, any>;
}

export interface RoleOption {
  rowid: string;
  RoleName: string;
  RoleIdField?: string;
  ClassId?: string;
  EntityID?: null | string;
  Memo?: null | string;
  UserIdField?: null | string;
  authId?: null | string;
  lingma_sys_key?: string;
  lingma_sys_params?: Record<string, any>;
}

export interface SaveRoleUserPayload {
  CategoryID?: string;
  EntityPKValue: string;
  RoleIdField: string;
  UserIdField: string;
  rowid?: string;
}

export interface AddRolePayload {
  RoleName: string;
  EntityID?: null | string;
  EntityTextFiled?: null | string;
  Memo?: null | string;
  IsType?: null | string;
}

function buildHeaders(PAEG_KEY = PAGE_FORM_KEY) {
  return {
    'x-FormKey': PAEG_KEY,
    'x-FormParam': '',
    'x-FunCode': 'null',
    'x-FirstFolder': FIRST_FOLDER,
    'x-StepId': '',
  };
}

function extractRows(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items;
  if (Array.isArray(resultData)) return resultData;
  return [];
}

function extractErrorMessage(error: any) {
  return (
    error?.response?.data?.Message ||
    error?.response?.data?.message ||
    error?.response?.data?.Result?.Message ||
    error?.response?.data?.Result?.message ||
    error?.data?.Message ||
    error?.data?.message ||
    error?.message ||
    '操作失败'
  );
}

function createRoleHostTable() {
  const table: any = new DataTable(
    PAGE_FORM_KEY,
    '获取角色宿主信息',
    ROLE_HOST_DB_ID,
    'id',
  );

  table.MetaName = '获取角色宿主信息';
  table.ShortName = null;
  table.Description = '获取角色宿主';
  table.Type = '接口';
  table.DbId = ROLE_HOST_DB_ID;
  table.DbName = ROLE_HOST_DB_ID;
  table.Filter = { Type: 'and', Filters: [] };
  table.Fields = [
    {
      Name: 'text',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: null,
      Value: null,
      Description: null,
      IsPKey: false,
      IsOutput: true,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
    {
      Name: 'id',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: null,
      Value: null,
      Description: null,
      IsPKey: false,
      IsOutput: true,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
  ];
  table.PrimaryKeyFields = null;
  table.ForeignKeyFields = null;
  table.IsBusinessMain = 1;
  table.DISTINCT = true;
  table.parentField = null;
  table.hasChildField = null;
  table.selfType = 'child';
  table.topValue = null;
  table.OutputType = 'Table';
  table.ChildTables = [];
  table.JoinType = 0;
  table.JoinFilter = null;
  table.RelationFilterType = 'and';
  table._ApiInfo = {
    url: '/api/DataOperation/GetData',
    SelfRefUrl: '',
    insertUrl: '/api/dataInterface/GetApiData',
    updateUrl: '/api/dataInterface/GetApiData',
    deleteUrl: '/api/dataInterface/GetApiData',
    batchChangesUrl: '',
    httpType: 'POST',
  };
  table.partial = [];
  table.isPartial = false;
  table.inputParams = [
    {
      Name: 'text',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: { ParamName: 'EntityTextField', Value: null, Type: 'SystemData' },
      Value: 'account_name',
      Description: null,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
    {
      Name: 'table',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: { ParamName: 'TName', Value: null, Type: 'SystemData' },
      Value: 'Bil_Account_Info',
      Description: null,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
    {
      Name: 'Dbid',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: { ParamName: 'dbid', Value: null, Type: 'SystemData' },
      Value: 'E7D2C6E2E0E24D3CA507040136B71F54',
      Description: null,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
    {
      Name: 'id',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: { ParamName: 'PKField', Value: null, Type: 'SystemData' },
      Value: 'rowid',
      Description: null,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
    {
      Name: 'DbName',
      AsName: null,
      FieldType: 'string',
      OrderType: null,
      Order: 0,
      ValueFun: { ParamName: 'dbname', Value: null, Type: 'SystemData' },
      Value: 'LMBill',
      Description: null,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      allowAIAdd: false,
      aiSort: 0,
      aiMemo: null,
      DISTINCT: false,
      defaultValue: null,
      Expression: null,
      IsMapToChild: null,
    },
  ];
  table.addApi = null;
  table.updateApi = null;
  table.deleteApi = null;
  table.cacheType = '不设置';
  table.hasCache = false;
  table.cacheData = { Added: [] };
  table.allowAdd = true;
  table.lmKey = '';
  table.WhereExp = '';
  table.framework = 'ej2';
  table.paramType = 'Body';
  table.IsBusiness = true;

  return table;
}

function createRoleListTable(sysid: string) {
  const table: any = new DataTable(
    ROLE_USER_KEY,
    '人员选择',
    ROLE_LIST_FORM_KEY,
    'rowid',
  );

  table.MetaName = '人员选择';
  table.Description = '角色人员配置';
  table.Type = '视图';
  table.DbId = ROLE_LIST_FORM_KEY;
  table.DbName = ROLE_LIST_FORM_KEY;
  table.Filter = { Type: 'and', Filters: [] };
  table.Fields = [
    { Name: 'ChildNodes', FieldType: 'int', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'CategoryID', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'RoleIdField', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'IsType', FieldType: 'char', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'workDesc', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'rowid', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'EntityPKField', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'sysId', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'RoleName', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'authId', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'EntityPKValue', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'EntityTextFiled', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'ClassId', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'Prowid', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'CSR', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'Memo', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'UserIdField', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'EntityID', FieldType: 'varchar', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
    { Name: 'useScoped', FieldType: 'text', Order: 0, IsPKey: false, IsOutput: true, Group: 0, DISTINCT: false },
  ];
  table.IsBusinessMain = 1;
  table.DISTINCT = true;
  table.selfType = 'child';
  table.OutputType = 'Table';
  table.ChildTables = [];
  table.JoinType = 0;
  table.RelationFilterType = 'and';
  table._ApiInfo = {
    url: '/api/DataOperation/GetData',
    SelfRefUrl: '',
    insertUrl: '/api/ViewData/AddViewData',
    updateUrl: '/api/ViewData/EditViewData',
    deleteUrl: '/api/ViewData/DelViewData',
    batchChangesUrl: '/api/ViewData/BatchData',
    httpType: 'POST',
  };
  table.partial = [];
  table.isPartial = false;
  table.inputParams = [
    {
      Name: 'ClassId',
      FieldType: 'varchar',
      Order: 0,
      ValueFun: { ParamName: 'ClassId', Value: null, Type: 'SystemData' },
      Value: ROLE_CLASS_ID,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      DISTINCT: false,
    },
    {
      Name: 'sysid',
      FieldType: 'varchar',
      Order: 0,
      ValueFun: { ParamName: 'sysid', Value: null, Type: 'SystemData' },
      Value: sysid,
      IsPKey: false,
      IsOutput: false,
      Group: 0,
      DISTINCT: false,
    },
  ];
  table.cacheType = '不设置';
  table.hasCache = false;
  table.cacheData = { Added: [] };
  table.allowAdd = true;
  table.lmKey = '';
  table.WhereExp = '';
  table.framework = 'ej2';
  table.IsBusiness = true;

  return table;
}

function createRoleInfoTable() {
  const table: any = new DataTable(
    ROLE_INFO_KEY,
    ROLE_INFO_TABLE,
    ROLE_INFO_DB,
    ROLE_INFO_PK,
  );
  table.Type = '数据库表';
  return table;
}

function createRoleUserTable() {
  const table: any = new DataTable(
    ROLE_USER_KEY,
    ROLE_USER_TABLE,
    ROLE_USER_DB,
    ROLE_USER_PK,
  );
  table.Type = '数据库表';
  return table;
}

function extractSavedRoleUserRowId(raw: any) {
  const result = raw?.data?.Result;
  const groups = [result?.mapListAdd, result?.mapListEdit];

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const rows = item?.['QYVirtualPlat@Base_MainBody_RoleUser'];
      if (Array.isArray(rows) && rows[0]?.rowid) {
        return String(rows[0].rowid);
      }
    }
  }

  return '';
}

function extractSavedRoleRowId(raw: any) {
  const result = raw?.data?.Result;
  const groups = [result?.mapListAdd, result?.mapListEdit];

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      const rows = item?.['QYVirtualPlat@Base_RoleInfo'];
      if (Array.isArray(rows) && rows[0]?.rowid) {
        return String(rows[0].rowid);
      }
    }
  }

  return '';
}

export async function getRoleHostOptions() {
  const table = createRoleHostTable();
  const queryParam: any = {
    Table: [table],
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: buildHeaders(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const rows = extractRows(resQuery);
  return (Array.isArray(rows) ? rows : []) as RoleHostOption[];
}

export async function getRoleOptionsBySysId(sysid: string) {
  const table = createRoleListTable(sysid);
  const queryParam: any = {
    Table: [table],
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: buildHeaders(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const rows = extractRows(resQuery);
  return (Array.isArray(rows) ? rows : []) as RoleOption[];
}

export async function addRole(data: AddRolePayload) {
  const roleName = String(data?.RoleName || '').trim();
  const entityID = String(data?.EntityID || '').trim();
  const entityTextFiled = String(data?.EntityTextFiled || '').trim();
  const isExclusive = String(data?.IsType || '').trim() === '1';

  if (!roleName) throw new Error('角色名称不能为空');
  if (isExclusive && !entityID) throw new Error('专属角色缺少帐套ID');

  const table = createRoleInfoTable();
  const payload: any = {
    ClassId: ROLE_CLASS_ID,
    rowid: null,
    EntityPKField: null,
    RoleName: roleName,
    EntityID: isExclusive ? entityID : null,
    ChildNodes: null,
    CSR: null,
    Prowid: null,
    Memo: data?.Memo ?? '',
    IsType: isExclusive ? '1' : null,
    EntityTextFiled: isExclusive ? entityTextFiled : null,
  };

  const saveParam = table.getSaveParam([payload], [], []);

  try {
    const response = await requestClient.post(table.saveUrl, saveParam, {
      headers: buildHeaders(ROLE_INFO_KEY),
      responseReturn: 'raw',
    });

    return {
      response,
      rowid: extractSavedRoleRowId(response),
    };
  } catch (error: any) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function saveRoleUser(data: SaveRoleUserPayload) {
  if (!data?.RoleIdField) throw new Error('缺少 RoleIdField');
  if (!data?.EntityPKValue) throw new Error('缺少 EntityPKValue');

  const table = createRoleUserTable();
  const payload: any = {
    rowid: data.rowid || generateUUID(),
    RoleIdField: data.RoleIdField,
    CategoryID: data.CategoryID || ROLE_CLASS_ID,
    EntityPKValue: data.EntityPKValue,
    UserIdField: data.UserIdField || '',
  };

  const saveParam = data.rowid
    ? table.getSaveParam([], [payload], [])
    : table.getSaveParam([payload], [], []);

  try {
    const response = await requestClient.post(table.saveUrl, saveParam, {
      headers: buildHeaders(ROLE_USER_KEY),
    });

    return {
      response,
      rowid: extractSavedRoleUserRowId(response) || payload.rowid,
    };
  } catch (error: any) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteRoleUser(rowid: string) {
  const nextRowId = String(rowid || '').trim();
  if (!nextRowId) throw new Error('缺少 rowid');

  const table = createRoleUserTable();
  const payload: any = {
    rowid: nextRowId,
  };

  const saveParam = table.getSaveParam([], [], [payload]);

  try {
    return await requestClient.post(table.saveUrl, saveParam, {
      headers: buildHeaders(ROLE_USER_KEY),
    });
  } catch (error: any) {
    throw new Error(extractErrorMessage(error));
  }
}
