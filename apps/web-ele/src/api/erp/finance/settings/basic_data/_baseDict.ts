import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

export type PageParams = {
  keyword?: string;
  page?: number;
  pageNo?: number;
};

function formatDateTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 复用字典表（_Base_DictType/_Base_DictData）
// 注意：FORM_ID/DB_NAME 需要与你们后端实际配置一致
const FORM_ID = 'E31199497829CDEB93998F96A8D033FE';
const DB_NAME = 'QYVirtualPlat';

const DICT_TYPE_TABLE = '_Base_DictType';
const DICT_TYPE_PK = 'rowid';

const DICT_DATA_TABLE = '_Base_DictData';
const DICT_DATA_PK = 'rowid';

export namespace BaseDictApi {
  export type DictType = {
    dictionaryType?: string;
    fiveValue?: string;
    fourthvalue?: string;
    functiondesc?: string;
    lingma_sys_is_delete?: number;
    ModName?: string;

    remark?: string;
    rowid?: string;
    secondValue?: string;
    thirdValue?: string;

    txt?: string;
    TypeName?: string;
    val?: string;
  };

  export type DictData = {
    author?: string;
    createtime?: string;
    createuser?: string;
    crttime?: string;
    description?: string;
    exVal_1?: string;
    exVal_2?: string;

    exVal_3?: string;
    exVal_4?: string;
    flowstate?: number;
    functiondesc?: string;

    lingma_sys_ent?: string;
    lingma_sys_is_delete?: number;
    ordIdx?: number;
    ReportID?: string;
    rowid?: string;
    txt?: string;
    typeid?: string;
    updatetime?: string;
    updateuser?: string;
    val?: string;
    wfid?: string;
  };

  export type PageResult<T> = {
    list: T[];
    total: number;
  };
}

function extractListAndTotal(raw: any): { list: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);
  return { list: items, total: Number.isFinite(count) ? count : 0 };
}

export async function getBaseDictTypeByName(
  dictName: string,
): Promise<BaseDictApi.DictType | null> {
  const name = String(dictName ?? '').trim();
  if (!name) return null;

  const table = new DataTable(FORM_ID, DICT_TYPE_TABLE, DB_NAME, DICT_TYPE_PK);

  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('TypeName', 'equal', name),
  );
  table.Fields = [
    { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'TypeName', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'ModName', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'dictionaryType', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'val', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'txt', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'secondValue', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'thirdValue', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'fourthvalue', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'fiveValue', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'functiondesc', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
    {
      Name: 'lingma_sys_is_delete',
      AsName: '',
      OrderType: null,
      Order: 0,
      Group: 0,
    },
    {
      Name: 'createtime',
      AsName: '',
      OrderType: 'descending',
      Order: 1,
      Group: 0,
    },
  ];

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { list } = extractListAndTotal(res);
  return (list?.[0] as BaseDictApi.DictType) ?? null;
}

export async function requireBaseDictTypeId(dictName: string): Promise<string> {
  const type = await getBaseDictTypeByName(dictName);
  const id = String(type?.rowid ?? '').trim();
  if (!id) {
    throw new Error(`未找到字典类型：${dictName}`);
  }
  return id;
}

export async function getBaseDictDataPage(params: {
  keyword?: string;
  pageNo: number;
  page: number;
  typeid: string;
}): Promise<BaseDictApi.PageResult<BaseDictApi.DictData>> {
  const table = new DataTable(FORM_ID, DICT_DATA_TABLE, DB_NAME, DICT_DATA_PK);

  const conditions: any[] = [
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('typeid', 'equal', params.typeid),
  ];

  const keyword = String(params.keyword ?? '').trim();
  if (keyword) {
    conditions.push(
      or(cond('txt', 'contains', keyword), cond('val', 'contains', keyword)),
    );
  }

  table.Filter = and(...conditions);

  table.Fields = [
    { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'typeid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'val', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'txt', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'exVal_1', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'exVal_2', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'exVal_3', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'exVal_4', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'description', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'functiondesc', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'flowstate', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'ordIdx', AsName: '', OrderType: 'ascending', Order: 1, Group: 0 },
    {
      Name: 'createtime',
      AsName: '',
      OrderType: 'descending',
      Order: 2,
      Group: 0,
    },
  ];

  const queryParam = {
    Table: [table],
    PageParam: { page: params.page, index: params.pageNo },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { list, total } = extractListAndTotal(res);
  console.log(
    `[基础数据] typeid=${params.typeid} 查询结果: ${list.length}条, total=${total}`,
  );
  return { list: list as BaseDictApi.DictData[], total };
}

export async function getBaseDictDataPageByName(params: {
  dictName: string;
  keyword?: string;
  pageNo: number;
  page: number;
}): Promise<BaseDictApi.PageResult<BaseDictApi.DictData>> {
  try {
    const typeid = await requireBaseDictTypeId(params.dictName);
    console.log(`[基础数据] 查询字典 ${params.dictName}, typeid=${typeid}`);
    return getBaseDictDataPage({
      typeid,
      keyword: params.keyword,
      pageNo: params.pageNo,
      page: params.page,
    });
  } catch (error: any) {
    console.error(`[基础数据] 字典类型不存在: ${params.dictName}`, error);
    // 返回空结果而不是抛错，避免页面崩溃
    return { list: [], total: 0 };
  }
}

export async function createBaseDictData(
  dictName: string,
  data: Partial<BaseDictApi.DictData>,
) {
  const typeid = await requireBaseDictTypeId(dictName);
  const table = new DataTable(FORM_ID, DICT_DATA_TABLE, DB_NAME, DICT_DATA_PK);

  const now = formatDateTime(new Date());

  const payload: BaseDictApi.DictData = {
    rowid: generateUUID(),
    typeid,
    val: String(data.val ?? '').trim(),
    txt: String(data.txt ?? '').trim(),
    ordIdx: data.ordIdx ?? 0,
    description: data.description ?? '',
    functiondesc: data.functiondesc ?? '',
    flowstate: data.flowstate ?? 1,
    crttime: now,
    createtime: now,
    updatetime: now,
    exVal_1: data.exVal_1 ?? '',
    exVal_2: data.exVal_2 ?? '',
    exVal_3: data.exVal_3 ?? '',
    exVal_4: data.exVal_4 ?? '',
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateBaseDictData(
  data: Partial<BaseDictApi.DictData> & { rowid: string },
) {
  const table = new DataTable(FORM_ID, DICT_DATA_TABLE, DB_NAME, DICT_DATA_PK);
  const payload: any = {
    rowid: data.rowid,
    val: data.val,
    txt: data.txt,
    ordIdx: data.ordIdx,
    description: data.description,
    functiondesc: data.functiondesc,
    flowstate: data.flowstate,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([], [payload], []);
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function softDeleteBaseDictData(rowid: string) {
  const id = String(rowid ?? '').trim();
  if (!id) return;

  const table = new DataTable(FORM_ID, DICT_DATA_TABLE, DB_NAME, DICT_DATA_PK);
  const saveParam = table.getSaveParam(
    [],
    [{ rowid: id, lingma_sys_is_delete: 1 }],
    [],
  );
  return requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
