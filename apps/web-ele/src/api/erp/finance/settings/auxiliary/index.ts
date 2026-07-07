import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';

// 辅助核算类别：Bil_Auxiliary_Categories
// 说明：沿用财务设置域常用 ModelId（与收支类别等一致）
const AUX_MODEL_ID = '5B21EC55F1C3FA8682C6527629FFC25F';
const AUX_TABLE = 'Bil_Auxiliary_Categories';
const AUX_DB = 'LMBill';
const AUX_PK = 'id';

export namespace BilAuxiliaryCateApi {
  export interface Category {
    id?: string;
    code?: string;
    name?: string;
    mnemonic_code?: string;
    apply_scope?: number;
    enabled?: number;
    sort_no?: number;
    description?: string;
    lingma_sys_ent?: string;
    lingma_sys_is_delete?: number;
  }

  export interface OptionItem {
    label: string;
    value: string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

export async function getAuxiliaryCatePage(params: any) {
  const table = new DataTable(AUX_MODEL_ID, AUX_TABLE, AUX_DB, AUX_PK);
  table.Type = '数据库表';

  const filterConds: any[] = [];

  // 默认不展示软删
  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('code', 'contains', params.keyword),
        cond('name', 'contains', params.keyword),
        cond('mnemonic_code', 'contains', params.keyword),
      ),
    );
  }

  if (params?.enabled !== undefined && params?.enabled !== null) {
    filterConds.push(cond('enabled', 'equal', Number(params.enabled)));
  }

  if (params?.apply_scope !== undefined && params?.apply_scope !== null) {
    filterConds.push(cond('apply_scope', 'equal', Number(params.apply_scope)));
  }

  if (params?.lingma_sys_ent) {
    filterConds.push(cond('lingma_sys_ent', 'equal', params.lingma_sys_ent));
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  // 默认按 sort_no、createtime 排序
  table.Fields = [
    { Name: 'sort_no', AsName: '', OrderType: 'ascending', Order: 1, Group: 0 },
    { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 2, Group: 0 },
  ];

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page || 0,
      index: params.pageNo || 1,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);

  return {
    dataTable: table,
    list: items,
    total,
  };
}

export async function getSubjectAuxiliaryOptions(): Promise<BilAuxiliaryCateApi.OptionItem[]> {
  const res = await getAuxiliaryCatePage({
    pageNo: 1,
    page: 0,
    enabled: 1,
    lingma_sys_is_delete: 0,
  });

  const list = Array.isArray(res?.list) ? res.list : [];
  return list
    .filter((item: BilAuxiliaryCateApi.Category) => Number(item?.apply_scope ?? 0) > 0)
    .map((item: BilAuxiliaryCateApi.Category) => ({
      label: String(item?.name ?? '').trim(),
      value: String(item?.code ?? '').trim(),
    }))
    .filter((item: BilAuxiliaryCateApi.OptionItem) => item.label && item.value);
}

export async function createAuxiliaryCate(data: BilAuxiliaryCateApi.Category) {
  const table = new DataTable(AUX_MODEL_ID, AUX_TABLE, AUX_DB, AUX_PK);
  table.Type = '数据库表';

  const payload: any = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    enabled: data?.enabled ?? 1,
    apply_scope: data?.apply_scope ?? 0,
    sort_no: data?.sort_no ?? 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateAuxiliaryCate(data: BilAuxiliaryCateApi.Category) {
  if (!data.id) throw new Error('缺少 id');

  const table = new DataTable(AUX_MODEL_ID, AUX_TABLE, AUX_DB, AUX_PK);
  table.Type = '数据库表';

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteAuxiliaryCate(id: string) {
  return await updateAuxiliaryCate({ id, lingma_sys_is_delete: 1 });
}
