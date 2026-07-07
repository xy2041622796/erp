import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../../common/account-set-scope';

// 注意：此处需要替换为你们 Bil_Project_Info 的真实 formkey
const PROJECT_MODEL_ID = '0FDA7AC1358501C3456DD9ABDC97C642';
const PROJECT_TABLE = 'Bil_Project_Info';
const PROJECT_DB = 'LMBill';
const PROJECT_PK = 'rowid';

export namespace ErpOtherIncomeProjectApi {
  export interface Project {
    rowid?: string;
    project_name?: string;
    project_code?: string;
    customer_id?: string;
    project_status?: number;
    lingma_sys_is_delete?: number;
  }
}

export async function getOtherIncomeProjectPage(params: any) {
  const table = createFinanceDataTable(PROJECT_MODEL_ID, PROJECT_TABLE, PROJECT_DB, PROJECT_PK);

  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.keyword) {
    const nameCond = cond('project_name', 'contains', params.keyword);
    const codeCond = cond('project_code', 'contains', params.keyword);
    table.Filter = and(and(...conditions), and(nameCond, codeCond));
  } else {
    if (params.project_name) {
      conditions.push(cond('project_name', 'contains', params.project_name));
    }
    if (params.project_code) {
      conditions.push(cond('project_code', 'contains', params.project_code));
    }
    if (params.customer_id) {
      conditions.push(cond('customer_id', 'equal', params.customer_id));
    }
    if (params.project_status !== undefined && params.project_status !== null && params.project_status !== '') {
      conditions.push(cond('project_status', 'equal', Number(params.project_status)));
    }
    table.Filter = and(...conditions);
  }

  if (!table.Fields || table.Fields.length === 0) {
      }

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
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  const projectData = new clientData();
  projectData.dataTable = table;
  projectData.list = items;
  projectData.total = total;
  return projectData;
}

export async function getOtherIncomeProjectSimpleList() {
  const table = createFinanceDataTable(PROJECT_MODEL_ID, PROJECT_TABLE, PROJECT_DB, PROJECT_PK);
  table.Filter = and(cond('lingma_sys_is_delete', 'equal', 0));

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  return items as any[];
}
