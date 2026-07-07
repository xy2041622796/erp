import type { PageParams } from '../_baseDict';

import {
  createBaseDictData,
  getBaseDictDataPageByName,
  softDeleteBaseDictData,
  updateBaseDictData,
} from '../_baseDict';

export namespace ContractTypeApi {
  export interface Row {
    id: string;
    /** 对应 DictData.val */
    val?: string;
    /** 对应 DictData.txt */
    type: string;
    /** 对应 DictData.description */
    description?: string;
    ordIdx?: number;
    exVal_1?: string;
    exVal_2?: string;
    exVal_3?: string;
    exVal_4?: string;
  }
}

const DICT_NAME = 'contractType';

export async function getContractTypePage(params: PageParams) {
  const res = await getBaseDictDataPageByName({
    dictName: DICT_NAME,
    keyword: params.keyword,
    pageNo: params.pageNo ?? 1,
    page: params.page ?? 10,
  });
  return {
    list: res.list.map((x) => ({
      id: String(x.rowid),
      val: x.val,
      type: x.txt || '',
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

export async function getContractType(id: string) {
  // 目前页面不依赖单条详情接口，保留占位
  return { id, type: '' } as any;
}

export async function createContractType(data: Partial<ContractTypeApi.Row>) {
  return createBaseDictData(DICT_NAME, {
    val: data.val ?? data.type,
    txt: data.type,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function updateContractType(
  data: Partial<ContractTypeApi.Row> & { id: string },
) {
  return updateBaseDictData({
    rowid: data.id,
    val: data.val ?? data.type,
    txt: data.type,
    description: data.description,
    ordIdx: data.ordIdx,
    exVal_1: data.exVal_1,
    exVal_2: data.exVal_2,
    exVal_3: data.exVal_3,
    exVal_4: data.exVal_4,
  } as any);
}

export async function deleteContractType(id: string) {
  await softDeleteBaseDictData(id);
  return true;
}
