import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { getStoredAccountSetId } from '#/utils/accountSet';
import { createFinanceDataTableCurrent } from '../../common/account-set-scope';

// Bil_Inexp_Categories
// 说明：同一财务设置域的 Bil_* 表通常共用同一个 ModelId（参照 accountset / subject 等）
const INEXPCATE_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const INEXPCATE_TABLE = 'Bil_Inexp_Categories';
const INEXPCATE_DB = 'LMBill';
const INEXPCATE_PK = 'id';

/**
 * 收支类别编码规则ID（菜单ID）。
 * 你可以在 env 中配置：VITE_INEXPCATE_CODE_RULE_ID
 */
const INEXPCATE_CODE_RULE_ID = String(
  (import.meta as any)?.env?.VITE_INEXPCATE_CODE_RULE_ID ?? 'A244B2B5315044B04121AD268AD88B2B',
).trim();

export namespace BilInexpCateApi {
  export interface Category {
    id?: string;
    lingma_sys_ent?: string;
    lingma_sys_is_delete?: number;
    code?: string;
    name?: string;
    parent_id?: string;
    category_type?: number;
    use_scope?: number;
    subject_id?: string;
    subject_code?: string;
    subject_name?: string;
    enabled?: number;
    sort_no?: number;
    description?: string;
    cash_flow_code?: string;
    cash_flow_name?: string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function getInexpCateSortNo(row: any) {
  const sortNo = Number(row?.sort_no || 0);
  return Number.isFinite(sortNo) && sortNo > 0 ? sortNo : Number.MAX_SAFE_INTEGER;
}

function isDefaultInexpCateRow(row: any) {
  const code = String(row?.code || '').trim().toUpperCase();
  const categoryType = Number(row?.category_type || 0);
  const numberPart = Number(code.replace(/^(IN|OUT)/, ''));
  if (categoryType === 1 && /^IN\d+$/.test(code)) return numberPart >= 1 && numberPart <= 7;
  if (categoryType === 2 && /^OUT\d+$/.test(code)) return numberPart >= 1 && numberPart <= 12;
  return false;
}

function compareInexpCateOrder(a: any, b: any) {
  const typeDiff = Number(a?.category_type || 0) - Number(b?.category_type || 0);
  if (typeDiff !== 0) return typeDiff;

  const aDefault = isDefaultInexpCateRow(a);
  const bDefault = isDefaultInexpCateRow(b);
  if (aDefault !== bDefault) return aDefault ? -1 : 1;

  if (aDefault && bDefault) {
    const sortDiff = getInexpCateSortNo(a) - getInexpCateSortNo(b);
    if (sortDiff !== 0) return sortDiff;
  }

  // 自定义类别按创建时间稳定排，保证新建类别出现在同类自定义类别最后。
  const createDiff = String(a?.createtime || '').localeCompare(String(b?.createtime || ''));
  if (createDiff !== 0) return createDiff;

  const sortDiff = getInexpCateSortNo(a) - getInexpCateSortNo(b);
  if (sortDiff !== 0) return sortDiff;
  const codeDiff = String(a?.code || '').localeCompare(String(b?.code || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
  if (codeDiff !== 0) return codeDiff;
  return String(a?.id || '').localeCompare(String(b?.id || ''), 'zh-Hans-CN-u-kn-true', { numeric: true, sensitivity: 'base' });
}

async function getNextInexpCateSortNo(categoryType: number) {
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('category_type', 'equal', Number(categoryType)),
  );
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: 0,
      index: 1,
    },
  };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);
  const maxSortNo = (items || []).reduce((max, item) => {
    const sortNo = Number(item?.sort_no || 0);
    return Number.isFinite(sortNo) && sortNo > max ? sortNo : max;
  }, 0);
  return maxSortNo + 1;
}


function buildDefaultInexpCateSeedList() {
  const accountSetId = String(getStoredAccountSetId() || '').trim();
  if (!accountSetId) {
    throw new Error('当前未选择账套，无法重置收支类别');
  }

  // 标准收支类别初始化模板。
  // description 字段用于“智能匹配摘要关键字”。
  // 内容来自当前数据库已维护的有效关键字，并统一改为逗号分割，后续新增账套/重置收支类别均按这里初始化。
  const defaults = [
    { code: 'IN001', name: '销售收入', category_type: 1, sort_no: 1, description: '销售,收入,回款,收款,货款,款项回款,零售,主营' },
    { code: 'IN002', name: '服务收入', category_type: 1, sort_no: 2, description: '服务,劳务,计费,咨询,医疗,教育' },
    { code: 'IN003', name: '利息收入', category_type: 1, sort_no: 3 },
    { code: 'IN004', name: '股东投入', category_type: 1, sort_no: 4 },
    { code: 'IN005', name: '短期借款', category_type: 1, sort_no: 5 },
    { code: 'IN006', name: '长期借款', category_type: 1, sort_no: 6, description: '长期借款' },
    { code: 'IN007', name: '其他收入', category_type: 1, sort_no: 7 },
    { code: 'OUT001', name: '购买材料', category_type: 2, sort_no: 1, description: '购买,采购,材料,原材料,支付,付款,贷款,款项,补款' },
    { code: 'OUT002', name: '工资社保', category_type: 2, sort_no: 2 },
    { code: 'OUT003', name: '税费支出', category_type: 2, sort_no: 3, description: '税,税费,增值税,所得税,缴纳,税款,纳税,税务' },
    { code: 'OUT004', name: '个人所得税', category_type: 2, sort_no: 4 },
    { code: 'OUT005', name: '利息支出', category_type: 2, sort_no: 5 },
    { code: 'OUT006', name: '手续费', category_type: 2, sort_no: 6 },
    { code: 'OUT007', name: '租金物业', category_type: 2, sort_no: 7, description: '租金,物业,房租,租赁' },
    { code: 'OUT008', name: '水电费', category_type: 2, sort_no: 8, description: '水电,水电费,水费,电费' },
    { code: 'OUT009', name: '运输费', category_type: 2, sort_no: 9, description: '运输,运输费,运费,物流,快递费,货运,托运,空运,海运' },
    { code: 'OUT010', name: '差旅费', category_type: 2, sort_no: 10 },
    { code: 'OUT011', name: '招待费', category_type: 2, sort_no: 11 },
    { code: 'OUT012', name: '其他支出', category_type: 2, sort_no: 12 },
  ];

  return defaults.map((item) => ({
    id: generateUUID(),
    lingma_sys_is_delete: 0,
    account_set_id: accountSetId,
    parent_id: '0',
    enabled: 1,
    use_scope: 1,
    cash_flow_code: undefined,
    cash_flow_name: undefined,
    ...item,
  }));
}

export async function getInexpCatePage(params: any) {
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );

  const filterConds: any[] = [];

  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.category_type !== undefined && params?.category_type !== null) {
    filterConds.push(cond('category_type', 'equal', Number(params.category_type)));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('code', 'contains', params.keyword),
        cond('name', 'contains', params.keyword),
        cond('subject_name', 'contains', params.keyword),
      ),
    );
  }

  if (params?.enabled !== undefined && params?.enabled !== null) {
    filterConds.push(cond('enabled', 'equal', Number(params.enabled)));
  }

  if (params?.lingma_sys_ent) {
    filterConds.push(cond('lingma_sys_ent', 'equal', params.lingma_sys_ent));
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

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
    list: [...items].sort(compareInexpCateOrder),
    total,
  };
}

export async function getInexpCate(id: string) {
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );
  table.Filter = cond(INEXPCATE_PK, 'equal', id);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function createInexpCate(data: BilInexpCateApi.Category) {
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );

  const categoryType = Number(data?.category_type || 0);
  const sortNo = Number(data?.sort_no || 0);
  const payload: any = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    enabled: data?.enabled ?? 1,
    use_scope: data?.use_scope ?? 1,
    sort_no: Number.isFinite(sortNo) && sortNo > 0 ? sortNo : await getNextInexpCateSortNo(categoryType),
  };

  // 规则：新增必须有编码。
  // - 如果前端未填写 code，则使用编码服务自动生成并回写。
  // - 若未配置编码规则ID，则直接报错，避免产生“无编码”的类别。
  const inputCode = String(payload?.code ?? '').trim();
  if (!inputCode) {
    if (!INEXPCATE_CODE_RULE_ID) {
      throw new Error(
        '未配置收支类别编码规则ID（VITE_INEXPCATE_CODE_RULE_ID），无法自动生成编码。',
      );
    }
  }

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  // 生成并回写编码：当新增未填写 code 时执行
  if (!inputCode) {
    try {
      const codeRes = await getCodeString(
        payload.id,
        INEXPCATE_CODE_RULE_ID,
        table.getRequestHeader(),
      );
      if (codeRes?.Code === 200 && codeRes?.Message) {
        await updateInexpCate({ id: payload.id, code: codeRes.Message });
      } else {
        // 回滚：软删该条记录
        await updateInexpCate({ id: payload.id, lingma_sys_is_delete: 1 });
        throw new Error(codeRes?.Message || '获取编码失败');
      }
    } catch (error) {
      await updateInexpCate({ id: payload.id, lingma_sys_is_delete: 1 });
      throw error;
    }
  }

  return res;
}

export async function updateInexpCate(data: BilInexpCateApi.Category) {
  if (!data.id) throw new Error('缺少 id');
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };
  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deleteInexpCate(id: string) {
  return await updateInexpCate({ id, lingma_sys_is_delete: 1 });
}

export async function resetDefaultInexpCate() {
  const table = createFinanceDataTableCurrent(
    INEXPCATE_MODEL_ID,
    INEXPCATE_TABLE,
    INEXPCATE_DB,
    INEXPCATE_PK,
  );
  table.Filter = cond('lingma_sys_is_delete', 'notequal', 1);

  const queryParam: any = { Table: [table] };
  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const { items } = extractListAndTotal(resQuery);

  const removedList = items
    .filter((item: any) => item?.id)
    .map((item: any) => ({
      id: item.id,
      lingma_sys_is_delete: 1,
      account_set_id: item.account_set_id,
    }));
  const addedList = buildDefaultInexpCateSeedList();

  const saveParam = table.getSaveParam(addedList, removedList, []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  return { res, added: addedList.length, removed: removedList.length };
}
