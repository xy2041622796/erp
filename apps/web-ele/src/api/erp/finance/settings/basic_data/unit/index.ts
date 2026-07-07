import type { PageParams } from '../_baseDict';

import {
  createBaseDictData,
  getBaseDictDataPageByName,
  softDeleteBaseDictData,
  updateBaseDictData,
} from '../_baseDict';

export namespace UnitApi {
  export interface Row {
    id: string;
    unit_name: string;
    ordIdx?: number;
    description?: string;
    exVal_1?: string;
    exVal_2?: string;
    exVal_3?: string;
    exVal_4?: string;
  }
}

const DICT_NAME = 'unit';

export async function getUnitPage(params: PageParams) {
  const res = await getBaseDictDataPageByName({
    dictName: DICT_NAME,
    keyword: params.keyword,
    pageNo: params.pageNo ?? 1,
    page: params.page ?? 10,
  });
  return {
    list: res.list.map((x) => ({
      id: String(x.rowid),
      unit_name: x.txt || x.val || '',
      ordIdx: x.ordIdx,
      description: x.description,
      exVal_1: x.exVal_1,
      exVal_2: x.exVal_2,
      exVal_3: x.exVal_3,
      exVal_4: x.exVal_4,
    })),
    total: res.total,
  };
}

export async function getUnit(id: string) {
  return { id, unit_name: '' } as any;
}

export async function createUnit(data: Partial<UnitApi.Row>) {
  return createBaseDictData(DICT_NAME, {
    txt: data.unit_name,
    val: data.unit_name,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function updateUnit(data: Partial<UnitApi.Row> & { id: string }) {
  return updateBaseDictData({
    rowid: data.id,
    txt: data.unit_name,
    val: data.unit_name,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function deleteUnit(id: string) {
  await softDeleteBaseDictData(id);
  return true;
}
