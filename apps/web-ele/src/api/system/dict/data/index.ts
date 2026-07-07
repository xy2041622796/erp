import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// 数据表配置
const FORM_ID = '808171E1BEEB39628534FFE429195F38'; // 替换为真实ID
const TABLE_NAME = '_Base_DictData';
const DB_NAME = 'QYVirtualPlat';
const PRIMARY_KEY = 'rowid';

export namespace SystemDictDataApi {
  /** 字典数据 */
  export type DictData = {
    createtime?: string;
    createuser?: string;
    description?: string; // remark, cssClass?
    dictType?: string;
    exVal_1?: string;
    functiondesc?: string; // cssClass?
    // 兼容前端旧字段名 (可选，如果前端未改完)
    id?: string;
    label?: string;
    ordIdx?: number; // sort
    rowid?: string; // id
    sort?: number;
    status?: number; // status - 注意：提供的SQL中无此字段，请确认数据库结构
    txt: string; // label
    typeid: string; // dictType
    val: string; // value
    value?: string;
  };
}

// 查询字典数据（精简)列表
export async function getProdictType() {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const conditions: any[] = [];
  conditions.push(cond('typeid', 'equal', '75727E9359E745478068352C4090387E'));
  table.Filter = and(...conditions);

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
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items;
  return returnData.list as SystemDictDataApi.DictData[];
}

// 查询字典数据（精简)列表
export async function getCateOfIn() {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const conditions: any[] = [];
  conditions.push(cond('typeid', 'equal', '71AAEBFF0E754FA4B73326C8D044AD4D'));
  table.Filter = and(...conditions);

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
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items;
  return returnData.list as SystemDictDataApi.DictData[];
}

export async function getCateOfOut() {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const conditions: any[] = [];
  conditions.push(cond('typeid', 'equal', 'A826105C415C449BBCA1A0727FE653BF'));
  table.Filter = and(...conditions);

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
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items;
  return returnData.list as SystemDictDataApi.DictData[];
}
// 查询字典数据（精简)列表
export async function getSimpleDictDataList() {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);

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
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData.Items;
  return returnData.list as SystemDictDataApi.DictData[];
}

// 查询字典数据列表
export async function getDictDataPage(params: any) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const conditions: any[] = [];
  if (params?.txt) {
    conditions.push(cond('txt', 'contains', params.txt));
  }
  if (params?.label) {
    // 兼容旧参数名
    conditions.push(cond('txt', 'contains', params.label));
  }
  if (params?.typeid) {
    conditions.push(cond('typeid', 'equal', params.typeid));
  }
  if (params?.dictType) {
    // 兼容 data-grid props 传入
    conditions.push(cond('typeid', 'equal', params.dictType));
  }
  if (params?.status !== undefined) {
    // conditions.push(cond('status', 'equal', params.status));
  }

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

  if (params?.page && params?.pageNo) {
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

  if (params?.page && params?.pageNo) {
    returnData.list = resData.Items;
    returnData.total = resData.Count;
  } else if (resData.Items && resData.Items.length > 0) {
    returnData.list = resData.Items;
    if (resData.Count) returnData.total = resData.Count;
  } else {
    returnData.list = [];
  }
  return returnData;
}

// 查询字典数据详情
export async function getDictData(id: string) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  table.Filter = and(cond(PRIMARY_KEY, 'equal', id));
  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resData = resQuery.data.Result.data;
  if (resData.Items && resData.Items.length > 0) {
    return resData.Items[0] as SystemDictDataApi.DictData;
  }
  return null;
}

// 新增字典数据
export async function createDictData(data: SystemDictDataApi.DictData) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([data], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 修改字典数据
export async function updateDictData(data: SystemDictDataApi.DictData) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const saveParam = table.getSaveParam([], [data], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 删除字典数据
export async function deleteDictData(id: string) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const deleteList = [{ [PRIMARY_KEY]: id }];
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 批量删除字典数据
export async function deleteDictDataList(ids: string[]) {
  const table = new DataTable(FORM_ID, TABLE_NAME, DB_NAME, PRIMARY_KEY);
  const deleteList = ids.map((id) => ({ [PRIMARY_KEY]: id }));
  const saveParam = table.getSaveParam([], [], deleteList);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

// 导出字典类型数据
export function exportDictData(params: any) {
  return requestClient.download('/system/dict-data/export-excel', { params });
}
