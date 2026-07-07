// 类型定义
type FilterType = 'and' | 'cond' | 'or';
type OperatorType =
  | 'contains'
  | 'endswith'
  | 'equal'
  | 'greaterthan'
  | 'greaterthanorequal'
  | 'in'
  | 'isempty'
  | 'isnotempty'
  | 'isnotnull'
  | 'isnull'
  | 'lessthan'
  | 'lessthanorequal'
  | 'nolike'
  | 'notequal'
  | 'notin'
  | 'startswith';

type CheckAuthType =
  | 'allowAdd'
  | 'allowDelete'
  | 'allowEdit'
  | 'hasData'
  | 'isAnyEdit'
  | 'isAnyShow'
  | 'isEdit'
  | 'isShow'
  | 'noAnyEdit'
  | 'noAnyShow'
  | 'noEdit'
  | 'noShow';

type OutputType =
  | 'HierarchyData'
  | 'Join'
  | 'Navigation'
  | 'SelfRefData'
  | 'Table';

interface Filter {
  Type: FilterType;
  Filters?: Filter[];
  Field?: string;
  Operator?: OperatorType;
  Value?: any;
  ValueFun?: ValueFunction;
}

interface ValueFunction {
  Type: string;
  Value?: any;
}

interface AuthSet {
  e: string[];
  h: string[];
  m: string[];
  d?: boolean; // 删除权限
}

interface PageParam {
  index: number;
  size: number;
}

interface QueryRequestData {
  Table: DataTable[];
  PageParam?: PageParam;
  keyField?: string;
  parentField?: string;
  nodeid?: string;
  hasChildField?: string;
  type?: string;
}

interface SaveRequestData {
  TableName: string;
  CrudModel: CrudModel;
}

interface JWTToken {
  exp: number;
  [key: string]: any;
}

interface QueryResponse {
  Result?: {
    allowAdd?: boolean;
    data?: {
      Items?: any[];
    };
    lingma_sys_key?: string;
  };
  [key: string]: any;
}

interface DataRowData {
  [key: string]: any;
  lingma_sys_params?: AuthSet;
  dataRow?: {
    lingma_sys_params?: {
      d?: boolean;
    };
  };
}

// export const baseUrl = 'http://192.168.124.10';
// export const baseUrl = 'http://8.148.73.250:9908';
export const baseApiUrl = `/api/`;
export const accessTokenKey = 'vue-next-admin:access-token';
export const refreshAccessTokenKey = `vue-next-admin:x-access-token`;
export const userinfoTokenKey = `vue-next-admin:userInfo`;
export const sysSessionIdKey = `vue-next-admin:sys-session-id`;

// 常量定义
// const accessTokenKey = "vue-next-admin:access-token";
// const refreshAccessTokenKey = `vue-next-admin:x-access-token`;
// const userinfoTokenKey = `vue-next-admin:userInfo`;
// const sysSessionIdKey = `vue-next-admin:sys-session-id`;

/**
 * filter使用and拼接的条件组
 */
export function and(...filters: Filter[]): Filter {
  return { Type: 'and', Filters: filters };
}

/**
 * filter使用or拼接的条件组
 */
export function or(...filters: Filter[]): Filter {
  return { Type: 'or', Filters: filters };
}

/**
 * filter条件
 */
export function cond(
  field: string,
  operator: OperatorType,
  value: any,
): Filter {
  return value && typeof value === 'object' && 'Type' in value
    ? {
        Type: 'cond',
        Field: field,
        Operator: operator,
        Value: null,
        ValueFun: value,
      }
    : {
        Type: 'cond',
        Field: field,
        Operator: operator,
        Value: null,
        ValueFun: { Type: 'GetConstValue', Value: value },
      };
}

/**
 * filter的operator枚举
 */
export const qyOperatorEnum = {
  equal: 'equal',
  notequal: 'notequal',
  greaterthan: 'greaterthan',
  greaterthanorequal: 'greaterthanorequal',
  lessthan: 'lessthan',
  lessthanorequal: 'lessthanorequal',
  isnull: 'isnull',
  isnotnull: 'isnotnull',
  contains: 'contains',
  nolike: 'nolike',
  startswith: 'startswith',
  endswith: 'endswith',
  in: 'in',
  notin: 'notin',
  isempty: 'isempty',
  isnotempty: 'isnotempty',
} as const;

/** page使用数据对象 */
export class clientData {
  dataTable!: DataTable;
  list!: Array<any> | object;
  total!: number;
}

/**
 * 数据编辑模型
 */
export class CrudModel {
  Added: any[] = [];
  Changed: any[] = [];
  Deleted: any[] = [];
}

/**
 * 表的数据编辑模型
 */
export class TableCRUD {
  CrudModel: CrudModel;
  keyField: string;
  TableName: string;

  constructor(tableName: string, dbName: string, keyField: string) {
    this.TableName = `${dbName}@${tableName}`;
    this.CrudModel = new CrudModel();
    this.keyField = keyField;
  }
}

/**
 * 表示一个数据列（DataColumn）对象，通常用于描述数据表中的字段属性。
 */
export class DataColumn {
  AsName: string = '';
  Group: number = 0;
  Name: string = '';
  Order: number = 0;
  OrderType: 'ascending' | 'descending' | null = null;
}

/**
 * CheckAuth的checkType枚举
 */
export const checkAuthType = {
  allowAdd: 'allowAdd',
  allowEdit: 'allowEdit',
  allowDelete: 'allowDelete',
  hasData: 'hasData',
  isEdit: 'isEdit',
  isShow: 'isShow',
  noEdit: 'noEdit',
  noShow: 'noShow',
  isAnyEdit: 'isAnyEdit',
  noAnyEdit: 'noAnyEdit',
  isAnyShow: 'isAnyShow',
  noAnyShow: 'noAnyShow',
} as const;

/**
 * 权限检测
 */
export class CheckAuth {
  table: DataTable;

  constructor(table: DataTable) {
    this.table = table;
  }

  /**
   * 根据参数获取权限
   */
  getAuth(
    rowKey: any,
    fieldName: null | string,
    checkType: CheckAuthType,
  ): boolean {
    if (!rowKey) {
      return checkType === 'hasData'
        ? this.table.items.length > 0
        : this.table.allowAdd;
    }

    const rowData = this.table.items.find(
      (x) => x[this.table.PrimaryKeyFields] === rowKey,
    );
    if (!rowData) {
      return false;
    }

    return this.getRowAuth(rowData, fieldName, checkType);
  }

  /**
   * 获取数据行相关权限
   */
  getRowAuth(
    rowData: DataRowData,
    fieldName: null | string,
    checkType: CheckAuthType,
  ): boolean {
    // 数据行不包含lingma_sys_params字段表示放开权限
    if (!('lingma_sys_params' in rowData)) {
      return true;
    }

    const authSet = rowData.lingma_sys_params as AuthSet;

    if (fieldName) {
      let checkResult = false;
      switch (checkType) {
        case 'isEdit': {
          checkResult = authSet.e.includes(fieldName);
          break;
        }
        case 'isShow': {
          checkResult = !authSet.h.includes(fieldName);
          break;
        }
        case 'noEdit': {
          checkResult = !authSet.e.includes(fieldName);
          break;
        }
        case 'noShow': {
          checkResult = authSet.h.includes(fieldName);
          break;
        }
      }
      return checkResult;
    } else {
      switch (checkType) {
        case 'isAnyEdit': {
          return authSet.e.length > 0;
        }
        case 'isAnyShow': {
          return (
            authSet.h.length === 0 ||
            authSet.e.length > 0 ||
            authSet.m.length > 0
          );
        }
        case 'noAnyEdit': {
          return authSet.e.length === 0;
        }
        case 'noAnyShow': {
          return !(
            authSet.h.length === 0 ||
            authSet.e.length > 0 ||
            authSet.m.length > 0
          );
        }
        default: {
          // 默认判断行是否能删除
          return checkType === 'allowEdit'
            ? authSet.e.length > 0
            : !!rowData?.lingma_sys_params?.d;
        }
      }
    }
  }
}

/**
 * 数据行类
 */
export class DataRow {
  authCheck: CheckAuth;
  data: DataRowData;

  constructor(data: DataRowData, authCheck: CheckAuth) {
    this.data = data;
    this.authCheck = authCheck;
  }

  /**
   * 权限判断是否存在可编辑的字段
   */
  hasEditField(): boolean {
    return this.authCheck.getRowAuth(this.data, null, 'isAnyEdit');
  }

  /**
   * 权限判断是否存在可显示的字段
   */
  hasShowField(): boolean {
    return this.authCheck.getRowAuth(this.data, null, 'isAnyShow');
  }

  /**
   * 权限判断指定行的字段是否可编辑
   */
  isEditField(fieldName: string): boolean {
    return this.authCheck.getRowAuth(this.data, fieldName, 'isEdit');
  }

  /**
   * 权限判断指定行的字段是否可见
   */
  isShowField(fieldName: string): boolean {
    return this.authCheck.getRowAuth(this.data, fieldName, 'isShow');
  }
}

export class DataRowAuth {
  data: DataRowData;
  private rowAuth?: AuthSet;

  constructor(data: DataRowData) {
    this.data = data;
    if (data) {
      this.rowAuth = data.lingma_sys_params;
    }
  }

  /**
   * 权限判断是否存在可编辑的字段
   * 等价于 CheckAuth.getRowAuth(..., null, 'isAnyEdit')
   */
  hasEditField(): boolean {
    const auth = this.rowAuth;
    if (!auth) return true; // 没有权限信息表示不做限制
    const editable = auth.e || [];
    return editable.length > 0;
  }

  /**
   * 权限判断是否存在可显示的字段
   * 等价于 CheckAuth.getRowAuth(..., null, 'isAnyShow')
   */
  hasShowField(): boolean {
    const auth = this.rowAuth;
    if (!auth) return true;
    const hidden = auth.h || [];
    const editable = auth.e || [];
    const modifiable = auth.m || [];
    return hidden.length === 0 || editable.length > 0 || modifiable.length > 0;
  }

  /**
   * 权限判断指定行的字段是否可编辑
   * 等价于 CheckAuth.getRowAuth(..., fieldName, 'isEdit')
   */
  isEditField(fieldName: string): boolean {
    if (!this?.rowAuth && this?.data?.lingma_sys_key) {
      return false;
    }
    const auth = this.rowAuth;
    if (!auth) return true;
    const editable = auth.e || [];
    return !editable.includes(fieldName);
  }

  /**
   * 权限判断指定行的字段是否可见
   * 等价于 CheckAuth.getRowAuth(..., fieldName, 'isShow')
   */
  isShowField(fieldName: string): boolean {
    const auth = this.rowAuth;
    if (!auth) return true;
    const hidden = auth.h || [];
    return !hidden.includes(fieldName);
  }
}

/**
 * 表示一个通用数据表对象，用于描述表结构、输入输出参数等。
 */
export class DataTable {
  allowAdd: boolean = false;
  authCheck: CheckAuth;
  DbName: string;
  Fields: DataColumn[] = [];
  Filter: Filter | null = null;
  formKey: string;
  httpType: string = 'POST';
  inputParams: DataColumn[] = [];
  items: any[] = [];
  lmKey: string = '';
  Name: string;
  OutputType: string = '';
  PrimaryKeyFields: string;
  queryUrl: string;
  saveUrl: string;
  Type: string = '';
  uploadUrl: string;
  constructor(
    formKey: string,
    Name: string,
    DbName: string,
    primaryKeyField: string,
  ) {
    this.Name = Name;
    this.DbName = DbName;
    this.PrimaryKeyFields = primaryKeyField;
    this.formKey = formKey;
    this.queryUrl = `${baseApiUrl}DataOperation/GetData`;
    this.saveUrl = `${baseApiUrl}DataOperation/BatchTableOperateRequestByCRUD`;
    this.uploadUrl = `${baseApiUrl}File/UploadFile`;
    this.authCheck = new CheckAuth(this);
    this.OutputType = 'Table';
    this.Type = '数据库表';
  }

  /**
   * 权限判断是否允许新增数据
   */
  allowAddData(): boolean {
    return this.authCheck.getAuth(null, null, 'allowAdd');
  }

  /**
   * 权限判断指定行是否可删除
   */
  allowDeleteRow(rowKey: any): boolean {
    return this.authCheck.getAuth(rowKey, null, 'allowDelete');
  }

  /**
   * 权限判断指定行是否可编辑
   */
  allowEditRow(rowKey: any): boolean {
    return this.authCheck.getAuth(rowKey, null, 'allowEdit');
  }

  /**
   * 处理查询结果，记录数据及权限信息
   */
  execQueryResult(result: QueryResponse): void {
    const jsonData = result.data;

    this.allowAdd =
      jsonData.Result && 'allowAdd' in jsonData.Result
        ? Boolean(jsonData.Result.allowAdd)
        : true;
    this.lmKey =
      jsonData.Result && 'lingma_sys_key' in jsonData.Result
        ? jsonData.Result.lingma_sys_key || ''
        : '';

    const resultData =
      jsonData.Result && 'data' in jsonData.Result
        ? jsonData.Result.data
        : jsonData.Result;
    const rawItems = ((resultData as any)?.Items ?? resultData) ?? [];
    this.items = Array.isArray(rawItems) ? rawItems : [];
  }

  getDataRow(rowKey: any): DataRow {
    const data = this.items.find((x) => x[this.PrimaryKeyFields] === rowKey);
    return new DataRow(data, this.authCheck);
  }

  /**
   * 获取查询参数
   */
  getQueryParam(
    outputType: string,
    filter: Filter | null,
    inputParams: DataColumn[] | null,
    sortFields: DataColumn[] | null,
    page: number = 0,
    index: number = 0,
    keyField: null | string = null,
    parentField: null | string = null,
    nodeid: null | string = null,
    hasChildField: string = 'hasChild',
    type: string = 'child',
  ): QueryRequestData {
    const paramTB = JSON.parse(JSON.stringify(this));
    paramTB.OutputType = outputType;
    paramTB.Filter = filter;
    paramTB.inputParams = inputParams;

    const requestData: QueryRequestData = {
      Table: [paramTB],
    };

    if (page !== 0) {
      requestData.PageParam = {
        index: index,
        size: page,
      };
    }

    if (keyField && parentField && nodeid) {
      requestData.keyField = keyField;
      requestData.parentField = parentField;
      requestData.nodeid = nodeid;
      requestData.hasChildField = hasChildField;
      requestData.type = type;
    }

    return requestData;
  }

  /**
   * 获取请求header
   */
  getRequestHeader(): Record<string, string> {
    return QB.getHeadersWithTokenAndRefresh(this.formKey);
  }

  /**
   * 获取保存参数
   */
  getSaveParam(
    added: any[],
    changed: any[],
    deleted: any[],
  ): SaveRequestData[] {
    const requestData: SaveRequestData[] = [];
    const tbParam: SaveRequestData = {
      TableName: `${this.DbName}@${this.Name}`,
      CrudModel: {
        Added: added,
        Changed: changed,
        Deleted: deleted,
      },
    };

    if (this.lmKey) {
      added.forEach((addObj) => {
        addObj.lingma_sys_key = this.lmKey;
      });

      changed.forEach((changedObj) => {
        if (!('lingma_sys_key' in changedObj)) {
          const foundItem = this.items.find(
            (y) =>
              y[this.PrimaryKeyFields] === changedObj[this.PrimaryKeyFields],
          );
          if (foundItem) {
            changedObj.lingma_sys_key = foundItem.lingma_sys_key;
          }
        }
      });

      deleted.forEach((deletedObj) => {
        if (!('lingma_sys_key' in deletedObj)) {
          const foundItem = this.items.find(
            (y) =>
              y[this.PrimaryKeyFields] === deletedObj[this.PrimaryKeyFields],
          );
          if (foundItem) {
            deletedObj.lingma_sys_key = foundItem.lingma_sys_key;
          }
        }
      });
    }

    requestData.push(tbParam);
    return requestData;
  }

  /**
   * 权限判断是否存在数据
   */
  hasData(): boolean {
    return this.authCheck.getAuth(null, null, 'hasData');
  }

  /**
   * 权限判断是否存在可编辑的字段
   */
  hasEditField(rowKey: any): boolean {
    return this.authCheck.getAuth(rowKey, null, 'isAnyEdit');
  }

  /**
   * 权限判断是否存在可显示的字段
   */
  hasShowField(rowKey: any): boolean {
    return this.authCheck.getAuth(rowKey, null, 'isAnyShow');
  }

  /**
   * 权限判断指定行的字段是否可编辑
   */
  isEditField(rowKey: any, fieldName: string): boolean {
    return this.authCheck.getAuth(rowKey, fieldName, 'isEdit');
  }

  /**
   * 权限判断指定行的字段是否可见
   */
  isShowField(rowKey: any, fieldName: string): boolean {
    return this.authCheck.getAuth(rowKey, fieldName, 'isShow');
  }

  toJSON(): object {
    const { formKey, httpType, queryUrl, saveUrl, authCheck, items, ...rest } =
      this as any;
    return rest;
  }
}

// 工具函数
// ...existing code...
/**
 * 解码 base64url（跨端）
 */
// const base64UrlDecode = (input: string): string => {
//   const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
//   const padLen = normalized.length % 4;
//   const padded = normalized + (padLen ? '='.repeat(4 - padLen) : '');

//   // 环境判断：H5 使用 window.atob；小程序/Node 使用 Buffer
//   const env = Taro.getEnv?.();
//   if (env === Taro.ENV_TYPE.WEB && typeof window !== 'undefined' && typeof window.atob === 'function') {
//     const binary = window.atob(padded);
//     const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
//     return new TextDecoder().decode(bytes);
//   } else {
//     const arrayBuffer = Taro.base64ToArrayBuffer(padded);
//     const uint8Array = new Uint8Array(arrayBuffer);
//     let result = '';
//     for (let i = 0; i < uint8Array.length; i++) {
//       result += String.fromCharCode(uint8Array[i]);
//     }
//     return result;

//   }
// };

/**
 * 解密JWT令牌的函数（跨端）
 */
// const decryptJWT = function (token: string): JWTToken {
//   // 支持 "Bearer xxx" 前缀
//   const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
//   const payload = raw.split('.')[1] || '';
//   const json = base64UrlDecode(payload);
//   return JSON.parse(json);
// };
const decryptJWT = function (token: string): JWTToken {
  // 将所有下划线替换为斜杠，将所有破折号替换为加号，以使令牌有效的base64编码
  token = token.replaceAll('_', '/').replaceAll('-', '+');

  // 解码令牌的base64编码的有效载荷，并将其转换为JSON字符串
  const json = decodeURIComponent(escape(window.atob(token.split('.')[1])));

  // 解析JSON字符串并返回结果对象
  return JSON.parse(json);
};

/**
 * 将时间戳转换为Date对象的函数
 */
const getJWTDate = function (timestamp: number): Date {
  return new Date(timestamp * 1000);
};

// QB 对象定义
interface QBType {
  GetToken: () => null | string;
  clearAccessTokens: () => void;
  getHeadersWithTokenAndRefresh: (formKey: string) => Record<string, string>;
  AddTokenToRequest: (httprequest: Request | XMLHttpRequest) => void;
  RefreshToken: (res: Response) => boolean;
  ValidateToken: (
    accessToken: null | string,
    refreshAccessToken: null | string,
  ) => boolean;
  DataTable: typeof DataTable;
  DataColumn: typeof DataColumn;
  TableCRUD: typeof TableCRUD;
  CrudModel: typeof CrudModel;
  CheckAuth: typeof CheckAuth;
  qyOperatorEnum: typeof qyOperatorEnum;
  checkAuthType: typeof checkAuthType;
  and: typeof and;
  or: typeof or;
  cond: typeof cond;
  GetNewGUID: () => string;
}

const QB: QBType = {} as QBType;

/**
 * 获取访问令牌的函数
 */
QB.GetToken = function (): null | string {
  const token = window.localStorage.getItem(accessTokenKey);
  if (token === null || token === 'undefined') {
    const prot = window.location.protocol;
    const host = window.location.host;
    const first = window.location.pathname.split('/')[1];
    let loginUrl = `${prot}//${host}/${first}/UserLoginManagement/Login.html`;
    if (window.location.href.startsWith(loginUrl)) {
      return null;
    }
    loginUrl += `?returnUrl=${window.encodeURIComponent(window.location.href)}`;
    window.location.href = loginUrl;
    return null;
  } else {
    try {
      const tokenObj = token; // JSON.parse(token);
      return tokenObj.startsWith('Bearer ') ? tokenObj : `Bearer ${tokenObj}`;
    } catch (error) {
      console.error('Token解析错误:', error);
      return null;
    }
  }
};

/**
 * 清除所有访问令牌的函数
 */
QB.clearAccessTokens = (): void => {
  // Taro.removeStorageSync(accessTokenKey);
  // Taro.removeStorageSync(refreshAccessTokenKey);
  // Taro.removeStorageSync(userinfoTokenKey);
  // Taro.removeStorageSync(sysSessionIdKey);
  window.localStorage.removeItem(accessTokenKey);
  window.localStorage.removeItem(refreshAccessTokenKey);
  window.sessionStorage.removeItem(accessTokenKey);
  window.sessionStorage.removeItem(refreshAccessTokenKey);
  window.sessionStorage.removeItem(userinfoTokenKey);
  window.sessionStorage.removeItem(sysSessionIdKey);
};

/**
 * 获取访问令牌并根据情况添加刷新令牌到头部对象
 */
QB.getHeadersWithTokenAndRefresh = function (
  formKey: string,
): Record<string, string> {
  // const accessToken = this.GetToken();
  // const headers: Record<string, string> = {
  //   'Authorization': `${accessToken}`,
  //   'x-FormKey': formKey,
  //   'x-FormParam': "",
  //   'x-FirstFolder': "",//window.location.pathname.split('/')[1],
  //   'x-StepId': "",
  // };

  // if (accessToken) {
  //   try {
  //     const jwt = decryptJWT(accessToken);
  //     if (new Date() >= getJWTDate(jwt.exp)) {
  //       const refreshAccessToken = window.localStorage.getItem(refreshAccessTokenKey);
  //       if (refreshAccessToken) {
  //         try {
  //           const parsedToken = refreshAccessToken;//JSON.parse(refreshAccessToken);
  //           headers["X-Authorization"] = parsedToken.startsWith("Bearer ") ? parsedToken : `Bearer ${parsedToken}`;
  //         } catch (error) {
  //           console.error('Refresh token解析错误:', error);
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('JWT解析错误:', error);
  //   }
  // }
  const headers: Record<string, string> = {
    'x-FormKey': formKey,
    'x-StepId': '',
  };
  return headers;
};

/**
 * 将访问令牌添加到请求中的函数
 */
QB.AddTokenToRequest = function (httprequest: Request | XMLHttpRequest): void {
  const headers = this.getHeadersWithTokenAndRefresh('');
  if (httprequest instanceof XMLHttpRequest) {
    for (const key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        httprequest.setRequestHeader(key, headers[key]);
      }
    }
  } else if (httprequest instanceof Request) {
    (httprequest as any).headers = new Headers(headers);
  } else {
    (httprequest as any).headers = new Headers(headers);
  }
};

/**
 * 过期后刷新token
 */
QB.RefreshToken = function (res: any): boolean {
  const accessToken = res.header['access-token'];
  const refreshAccessToken = res.header['x-access-token'];
  return QB.ValidateToken(accessToken, refreshAccessToken);
};

/**
 * 验证token
 */
QB.ValidateToken = function (
  accessToken: null | string,
  refreshAccessToken: null | string,
): boolean {
  if (accessToken === 'invalid_token') {
    return false;
  } else if (
    refreshAccessToken &&
    accessToken &&
    accessToken !== 'invalid_token'
  ) {
    try {
      window.localStorage.setItem(accessTokenKey, accessToken);
      window.localStorage.setItem(refreshAccessTokenKey, refreshAccessToken);
    } catch (error) {
      console.error('Token存储错误:', error);
      return false;
    }
  }
  return true;
};

export function GetNewGUID() {
  let guid = '';
  for (let i = 1; i <= 32; i++) {
    const n = Math.floor(Math.random() * 16).toString(16);
    guid += n;
  }
  return guid.toUpperCase();
}

QB.GetNewGUID = GetNewGUID;

// 在 export default QB 之前添加这些行
QB.DataTable = DataTable;
QB.DataColumn = DataColumn;
QB.TableCRUD = TableCRUD;
QB.CrudModel = CrudModel;
QB.CheckAuth = CheckAuth;

// 导出枚举和函数
QB.qyOperatorEnum = qyOperatorEnum;
QB.checkAuthType = checkAuthType;
QB.and = and;
QB.or = or;
QB.cond = cond;

export default QB;

// 使用示例（保持原有注释）
/**
//FORMKEY为平台创建的页面数据模型id
let dt = new DataTable("FORMKEY", "TableName", "DbName", "KeyField");
//请求数据url，保存使用dt.saveUrl;
let apiUrl = dt.queryUrl;
//请求参数，保存使用dt.getSaveParam(added, changed, delete);added,changed,delete为数据对象数组
let queryData = dt.getQueryParam("Table", and(cond("KeyField", "equal", "1")), null, null, 10, 1);
//请求header对象
let queryHeader = dt.getRequestHeader();
//httptype
let queryHttpType = dt.httpType;
fetch(apiUrl, {
    method: queryHttpType,
    headers: queryHeader,
    body: queryData,
})
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then((data) => {
        console.log(data);
        //仅请求数据时执行
        dt.execQueryResult(data);
    })
    .catch(error => console.error('Error:', error));

// 使用async/await方式
function axiosPost() {
    axios.post(apiUrl, queryData, {
        headers: queryHeader
    })
        .then(response => {
            console.log(response.data);
            //仅请求数据时执行
            dt.execQueryResult(response.data);
        })
        .catch(error => {
            console.error(error.message);
        });
}
//*/
