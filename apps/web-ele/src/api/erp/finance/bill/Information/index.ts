import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

// Bil_Sales_Company
// 数据表相关参数（如需联调，请替换为真实 ModelId）
const SALES_COMPANY_MODEL_ID = 'B6E42E3BE77E83A2D08306F0775F64B7'; // Placeholder
const SALES_COMPANY_TABLE = 'Bil_Sales_Company';
const SALES_COMPANY_DB = 'LMBill';
// 注意：该表数据库主键是 (id, lingma_sys_ent) 复合主键；前端 DataTable 以 id 作为主键字段
const SALES_COMPANY_PK = 'id';

// 可选：公司编码规则 ID（为空则不自动生成）
const SALES_COMPANY_CODE_RULE_ID = '771065DFBB7AE47E58AA686247F5B0FC';

export namespace BilSalesCompanyApi {
  export interface SalesCompany {
    id?: string;
    lingma_sys_ent?: string;

    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;

    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    company_code?: string;
    address?: string;
    phone?: string;
    bank_account?: string;
    bank_name?: string;
    taxID?: string;
    company_name?: string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

/** 查询销方公司列表（分页） */
export async function getSalesCompanyPage(params: any) {
  const table = new DataTable(
    SALES_COMPANY_MODEL_ID,
    SALES_COMPANY_TABLE,
    SALES_COMPANY_DB,
    SALES_COMPANY_PK,
  );

  const filterConds: any[] = [];

  // 默认：不查已删除
  if (params?.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params?.company_name) {
    filterConds.push(cond('company_name', 'contains', params.company_name));
  }
  if (params?.taxID) {
    filterConds.push(cond('taxID', 'contains', params.taxID));
  }
  if (params?.phone) {
    filterConds.push(cond('phone', 'contains', params.phone));
  }

  if (params?.keyword) {
    filterConds.push(
      or(
        cond('company_name', 'contains', params.keyword),
        cond('taxID', 'contains', params.keyword),
        cond('bank_name', 'contains', params.keyword),
        cond('bank_account', 'contains', params.keyword),
        cond('phone', 'contains', params.keyword),
        cond('address', 'contains', params.keyword),
      ),
    );
  }

  // 企业标识（可选）
  if (params?.lingma_sys_ent) {
    filterConds.push(cond('lingma_sys_ent', 'equal', params.lingma_sys_ent));
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

  if (!table.Fields || table.Fields.length === 0) {

  }

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params?.page || 0,
      index: params?.pageNo || 1,
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

/** 查询销方公司详情 */
export async function getSalesCompany(id: string, lingmaSysEnt?: string) {
  const table = new DataTable(
    SALES_COMPANY_MODEL_ID,
    SALES_COMPANY_TABLE,
    SALES_COMPANY_DB,
    SALES_COMPANY_PK,
  );

  const conds: any[] = [cond(SALES_COMPANY_PK, 'equal', id)];
  if (lingmaSysEnt) conds.push(cond('lingma_sys_ent', 'equal', lingmaSysEnt));
  table.Filter = and(...conds);

  if (!table.Fields || table.Fields.length === 0) {

  }

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

/** 新增销方公司 */
export async function createSalesCompany(
  data: BilSalesCompanyApi.SalesCompany,
) {
  const table = new DataTable(
    SALES_COMPANY_MODEL_ID,
    SALES_COMPANY_TABLE,
    SALES_COMPANY_DB,
    SALES_COMPANY_PK,
  );

  const payload: any = {
    ...data,
    id: data.id || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  // 生成并回写公司编码（配置了规则才执行）
  if (res && SALES_COMPANY_CODE_RULE_ID) {
    try {
      const codeRes = await getCodeString(
        payload.id,
        SALES_COMPANY_CODE_RULE_ID,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateSalesCompany({
          id: payload.id,
          company_code: codeRes.Message,
        });
      } else {
        // 回滚：标记为删除
        await updateSalesCompany({ id: payload.id, lingma_sys_is_delete: 1 });
        throw new Error(codeRes.Message || '获取公司编码失败');
      }
    } catch (error) {
      await updateSalesCompany({ id: payload.id, lingma_sys_is_delete: 1 });
      throw error;
    }
  }

  return res;
}

/** 修改销方公司 */
export async function updateSalesCompany(
  data: BilSalesCompanyApi.SalesCompany,
) {
  if (!data.id) throw new Error('缺少 id');

  const table = new DataTable(
    SALES_COMPANY_MODEL_ID,
    SALES_COMPANY_TABLE,
    SALES_COMPANY_DB,
    SALES_COMPANY_PK,
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

/** 删除销方公司（软删） */
export async function deleteSalesCompany(id: string, lingmaSysEnt?: string) {
  return await updateSalesCompany({
    id,
    lingma_sys_ent: lingmaSysEnt,
    lingma_sys_is_delete: 1,
  });
}

/** 物理删除销方公司（谨慎） */
export async function hardDeleteSalesCompany(
  id: number | string,
  lingmaSysEnt?: string,
) {
  const table = new DataTable(
    SALES_COMPANY_MODEL_ID,
    SALES_COMPANY_TABLE,
    SALES_COMPANY_DB,
    SALES_COMPANY_PK,
  );

  const removeRow: any = { id };
  if (lingmaSysEnt) removeRow.lingma_sys_ent = lingmaSysEnt;

  const saveParam = table.getSaveParam([], [], [removeRow]);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
