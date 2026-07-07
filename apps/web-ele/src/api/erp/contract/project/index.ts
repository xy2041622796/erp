import { exportExcelByConfig } from '#/api/common/import-export';
import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';

// 数据表相关参数
const PROJECT_MODEL_ID = 'E34F39AAD233284463DE6CADB4DC3765'; // formkey
const PROJECT_TABLE = 'Bil_Project_Info';
const PROJECT_DB = 'LMBill';
const PROJECT_PK = 'rowid';

export namespace ErpProjectApi {
	export interface Project {
		rowid?: string;
		createuser?: string;
		createtime?: Date | string;
		updateuser?: string;
		updatetime?: Date | string;
		wfid?: string;
		flowstate?: number;
		ReportID?: string;
		description?: string;
		lingma_sys_is_delete?: number;

		project_group?: string;
		customer_id?: string;
		project_type?: string;
		project_participant?: string;
		project_depart?: string;
		project_Manager?: string;
		project_status?: number;
		project_end_date?: Date | string;
		project_start_date?: Date | string;
		project_amount?: number;
		project_description?: string;
		project_name?: string;
		project_code?: string;
	}
}

function ymdToday() {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}

/** 查询项目列表（分页） */
export async function getProjectPage(params: any) {
	const projectTable = createFinanceDataTable(
		PROJECT_MODEL_ID,
		PROJECT_TABLE,
		PROJECT_DB,
		PROJECT_PK,
	);

	const filterConds = [];
	// 默认只显示未删除
	filterConds.push(cond('lingma_sys_is_delete', 'equal', 0));

	if (params.project_name)
		filterConds.push(cond('project_name', 'contains', params.project_name));
	if (params.project_code)
		filterConds.push(cond('project_code', 'contains', params.project_code));
	if (params.customer_id)
		filterConds.push(cond('customer_id', 'equal', params.customer_id));
	if (params.project_status !== undefined && params.project_status !== null && params.project_status !== '')
		filterConds.push(cond('project_status', 'equal', Number(params.project_status)));
	if (params.project_group)
		filterConds.push(cond('project_group', 'equal', params.project_group));

	// showExpired=false 时：只显示未过期（结束日期 >= 今天）
	if (params.showExpired === false) {
		// filterConds.push(cond('project_end_date', 'greaterthanorequal', ymdToday()));
	}

	if (filterConds.length > 0) projectTable.Filter = and(...filterConds);
	if (!projectTable.Fields || projectTable.Fields.length === 0) {
			}

	const queryParam: any = {
		Table: [projectTable],
		PageParam: {
			page: params.page || 0,
			index: params.pageNo || 1,
		},
	};

	const resQuery = await requestClient.post(projectTable.queryUrl, queryParam, {
		headers: projectTable.getRequestHeader(),
		responseReturn: 'raw',
	});

	projectTable.execQueryResult(resQuery);
	const resultData =
		resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
	const items = resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
	const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

	const projectData = new clientData();
	projectData.dataTable = projectTable;
	projectData.list = items;
	projectData.total = total;
	return projectData;
}

/** 查询项目详情 */
export async function getProject(id: string) {
	const projectTable = createFinanceDataTable(
		PROJECT_MODEL_ID,
		PROJECT_TABLE,
		PROJECT_DB,
		PROJECT_PK,
	);
	projectTable.Filter = cond(PROJECT_PK, 'equal', id);
	if (!projectTable.Fields || projectTable.Fields.length === 0) {
			}
	const queryParam = {
		Table: [projectTable],
		PageParam: { page: 1, index: 1 },
	};
	const resQuery = await requestClient.post(projectTable.queryUrl, queryParam, {
		headers: projectTable.getRequestHeader(),
		responseReturn: 'raw',
	});
	projectTable.execQueryResult(resQuery.data);
	const resultData =
		resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
	return (resultData.Items && resultData.Items[0]) || null;
}

/** 新增项目 */
export async function createProject(data: ErpProjectApi.Project) {
	const projectTable = createFinanceDataTable(
		PROJECT_MODEL_ID,
		PROJECT_TABLE,
		PROJECT_DB,
		PROJECT_PK,
	);
	const saveParam = projectTable.getSaveParam([data], [], []);
	return await requestClient.post(projectTable.saveUrl, saveParam, {
		headers: projectTable.getRequestHeader(),
	});
}

/** 修改项目 */
export async function updateProject(data: ErpProjectApi.Project) {
	const projectTable = createFinanceDataTable(
		PROJECT_MODEL_ID,
		PROJECT_TABLE,
		PROJECT_DB,
		PROJECT_PK,
	);
	const saveParam = projectTable.getSaveParam([], [data], []);
	return await requestClient.post(projectTable.saveUrl, saveParam, {
		headers: projectTable.getRequestHeader(),
	});
}

export async function deleteProject(id: string) {
	const projectTable = createFinanceDataTable(
		PROJECT_MODEL_ID,
		PROJECT_TABLE,
		PROJECT_DB,
		PROJECT_PK,
	);
	const saveParam = projectTable.getSaveParam(
		[],
		[],
		[{ [PROJECT_PK]: id, lingma_sys_is_delete: 1 } as any],
	);
	return await requestClient.post(projectTable.saveUrl, saveParam, {
		headers: projectTable.getRequestHeader(),
	});
}



/** 导出项目信息 */
export function exportProject(params: any, encodingId?: string) {
  if (encodingId) {
    return exportExcelByConfig({
      formId: PROJECT_MODEL_ID,
      tableName: PROJECT_TABLE,
      dbName: PROJECT_DB,
      primaryKey: PROJECT_PK,
      fileName: '项目信息',
      encodingId,
      extraData: params,
    });
  }

  const projectTable = createFinanceDataTable(
    PROJECT_MODEL_ID,
    PROJECT_TABLE,
    PROJECT_DB,
    PROJECT_PK,
  );

  const filterConds = [];
  filterConds.push(cond('lingma_sys_is_delete', 'equal', 0));
  if (params.project_name) filterConds.push(cond('project_name', 'contains', params.project_name));
  if (params.project_code) filterConds.push(cond('project_code', 'contains', params.project_code));
  if (params.customer_id) filterConds.push(cond('customer_id', 'equal', params.customer_id));
  if (params.project_status !== undefined && params.project_status !== null && params.project_status !== '') {
    filterConds.push(cond('project_status', 'equal', Number(params.project_status)));
  }
  if (params.project_group) filterConds.push(cond('project_group', 'equal', params.project_group));
  if (filterConds.length > 0) projectTable.Filter = and(...filterConds);

  const queryParam = {
    Table: [projectTable],
    PageParam: { page: 0, index: 1 },
  };

  return requestClient.download(projectTable.queryUrl, {
    method: 'post',
    data: queryParam,
    headers: projectTable.getRequestHeader(),
  });
}
