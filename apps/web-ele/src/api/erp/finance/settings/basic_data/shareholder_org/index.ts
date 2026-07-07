import type { PageParams } from '../_baseDict';

import {
  createBaseDictData,
  getBaseDictDataPageByName,
  softDeleteBaseDictData,
  updateBaseDictData,
} from '../_baseDict';

export namespace ShareholderOrgApi {
  export interface Row {
    id: string;
    name: string;
    /** 展示“类型”，例如：机构/股东 */
    type?: string;
    description?: string;
    /** 1 启用 / 0 停用 */
    enabled: 0 | 1;
  }
}

// 对应字典：_Base_DictType.TypeName
const DICT_NAME = 'InstitutionalShareholders';

export async function getShareholderOrgPage(params: PageParams) {
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
      type: x.functiondesc || x.exVal_1 || '',
      description: x.description,
      enabled: ((x.flowstate ?? 1) ? 1 : 0) as 0 | 1,
    })),
    total: res.total,
  };
}

export async function getShareholderOrg(id: string) {
  // 当前页面不依赖单条详情接口，保留占位
  return { id, name: '', enabled: 1 } as any;
}

export async function createShareholderOrg(
  data: Partial<ShareholderOrgApi.Row>,
) {
  return createBaseDictData(DICT_NAME, {
    txt: data.name,
    val: data.name,
    description: data.description,
    functiondesc: data.type,
    flowstate: data.enabled ?? 1,
  } as any);
}

export async function updateShareholderOrg(
  data: Partial<ShareholderOrgApi.Row> & { id: string },
) {
  return updateBaseDictData({
    rowid: data.id,
    txt: data.name,
    val: data.name,
    description: data.description,
    functiondesc: data.type,
    flowstate: data.enabled,
  } as any);
}

export async function deleteShareholderOrg(id: string) {
  await softDeleteBaseDictData(id);
  return true;
}
