import type { PageParams } from '../_baseDict';

import {
  createBaseDictData,
  getBaseDictDataPageByName,
  softDeleteBaseDictData,
  updateBaseDictData,
} from '../_baseDict';

export namespace BasicWarehouseApi {
  export interface Row {
    id: string;
    name: string;
    val?: string;
    description?: string;
    ordIdx?: number;
    exVal_1?: string;
    exVal_2?: string;
    exVal_3?: string;
    exVal_4?: string;
  }
}

const DICT_NAME = 'storeDict';

export async function getBasicWarehousePage(params: PageParams) {
  const res = await getBaseDictDataPageByName({
    dictName: DICT_NAME,
    keyword: params.keyword,
    pageNo: params.pageNo ?? 1,
    page: params.page ?? 10,
  });
  return {
    list: res.list.map((x) => ({
      id: String(x.rowid),
      name: x.txt || x.val || '',
      val: x.val,
      description: x.description,
      ordIdx: x.ordIdx,
      exVal_1: x.exVal_1,
      exVal_2: x.exVal_2,
      exVal_3: x.exVal_3,
      exVal_4: x.exVal_4,
    })),
    total: res.total,
  };
}

export async function getBasicWarehouse(id: string) {
  return { id, name: '' } as any;
}

export async function createBasicWarehouse(
  data: Partial<BasicWarehouseApi.Row>,
) {
  return createBaseDictData(DICT_NAME, {
    txt: data.name,
    val: data.val ?? data.name,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function updateBasicWarehouse(
  data: Partial<BasicWarehouseApi.Row> & { id: string },
) {
  return updateBaseDictData({
    rowid: data.id,
    txt: data.name,
    val: data.val ?? data.name,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function deleteBasicWarehouse(id: string) {
  await softDeleteBaseDictData(id);
  return true;
}
