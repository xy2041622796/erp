import type { PageParams } from '../_baseDict';

import {
  createBaseDictData,
  getBaseDictDataPageByName,
  softDeleteBaseDictData,
  updateBaseDictData,
} from '../_baseDict';

export namespace TaxCategoryApi {
  export interface Row {
    id: string;
    name: string;
    rate?: number;
    description?: string;
    enabled: 0 | 1;
  }
}

// 对应字典：_Base_DictType.TypeName
const DICT_NAME = 'TaxType';

export async function getTaxCategoryPage(params: PageParams) {
  const res = await getBaseDictDataPageByName({
    dictName: DICT_NAME,
    keyword: params.keyword,
    pageNo: params.pageNo ?? 1,
    page: params.page ?? 10,
  });

  return {
    list: res.list.map((x) => ({
      id: String(x.rowid),
      name: x.txt || '',
      rate: x.val ? Number(x.val) : undefined,
      description: x.description,
      enabled: ((x.flowstate ?? 1) ? 1 : 0) as 0 | 1,
    })),
    total: res.total,
  };
}

export async function getTaxCategory(id: string) {
  return { id, name: '', enabled: 1 } as any;
}

export async function createTaxCategory(data: Partial<TaxCategoryApi.Row>) {
  return createBaseDictData(DICT_NAME, {
    txt: data.name,
    val: data.rate === undefined ? '' : String(data.rate),
    description: data.description,
    flowstate: data.enabled ?? 1,
  } as any);
}

export async function updateTaxCategory(
  data: Partial<TaxCategoryApi.Row> & { id: string },
) {
  return updateBaseDictData({
    rowid: data.id,
    txt: data.name,
    val: data.rate === undefined ? undefined : String(data.rate),
    description: data.description,
    flowstate: data.enabled,
  } as any);
}

export async function deleteTaxCategory(id: string) {
  await softDeleteBaseDictData(id);
  return true;
}
