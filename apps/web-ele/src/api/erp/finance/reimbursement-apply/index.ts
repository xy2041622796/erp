import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

// 数据表相关参数（如需联调，请替换为真实 ModelId）
const APPLY_MODEL_ID = '60A9BA04CB9C182DA2D5433235C13A07'; // Placeholder
const APPLY_TABLE = 'Bil_Reimbursement_Apply';
const APPLY_DB = 'LMBill';
const APPLY_PK = 'rowid';

// 注意：此处需要替换为你们“报销申请单号”的编码规则ID
// 参考：apps/web-ele/src/api/erp/sale/return/index.ts 的写法
const APPLY_NO_RULE_ID = '3A24AFDC21D08BD7C4FE767C6548BC86';

/**
 * 报销申请（Bil_Reimbursement_Apply）
 * 注意：status 的业务含义各项目可能不同，这里做了通用映射：
 * 0=草稿，10=待审批，20=待付款，30=已完成
 */
export namespace BilReimbursementApplyApi {
  export type ApplyStatus = 0 | 10 | 20 | 30 | number;

  export interface ReimbursementApply {
    rowid?: string;
    createuser?: string;
    createtime?: string;
    updateuser?: string;
    updatetime?: string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    project_id?: string;
    remark?: string;
    status?: ApplyStatus;

    reimbursement_reason?: string;
    total_amount?: number;
    reimbursement_date?: Date | number | string;
    reimbursement_department?: string;
    reimburser_name?: string;
    reimbursement_no?: string;
    receive_account?: string;
    postscript?: string;
  }
}

/** 查询报销申请列表（分页） */
export async function getReimbursementApplyPage(params: any) {
  const table = new DataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);

  const filterConds: any[] = [];

  // 默认：不查已删除
  if (params.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params.reimbursement_no) {
    filterConds.push(
      cond('reimbursement_no', 'contains', params.reimbursement_no),
    );
  }

  if (params.project_id) {
    filterConds.push(cond('project_id', 'contains', params.project_id));
  }

  // tab/status
  if (
    params.status !== undefined &&
    params.status !== null &&
    params.status !== ''
  ) {
    filterConds.push(cond('status', 'equal', params.status));
  }

  // 日期区间（reimbursementDateRange: [start,end]）
  if (
    Array.isArray(params.reimbursementDateRange) &&
    params.reimbursementDateRange.length === 2
  ) {
    const [start, end] = params.reimbursementDateRange;
    if (start)
      filterConds.push(cond('reimbursement_date', 'greaterthanorequal', start));
    if (end)
      filterConds.push(cond('reimbursement_date', 'lessthanorequal', end));
  }

  // 关键字：事由/备注/附言/报销单号/报销人/部门（or contains）
  if (params.keyword) {
    filterConds.push(
      or(
        cond('reimbursement_reason', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
        cond('postscript', 'contains', params.keyword),
        cond('reimbursement_no', 'contains', params.keyword),
        cond('reimburser_name', 'contains', params.keyword),
        cond('reimbursement_department', 'contains', params.keyword),
      ),
    );
  }

  if (filterConds.length > 0) table.Filter = and(...filterConds);

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
  const resultData =
    resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items =
    resultData && Array.isArray(resultData.Items) ? resultData.Items : [];
  const total = resultData?.Count || (Array.isArray(items) ? items.length : 0);

  return {
    dataTable: table,
    list: items,
    total,
  };
}

/** 查询报销申请详情 */
export async function getReimbursementApply(id: string) {
  const table = new DataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);
  table.Filter = cond(APPLY_PK, 'equal', id);

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

  table.execQueryResult(res.data);
  const resultData = res.data?.Result?.data || res.data?.Result || res.data;
  return (resultData.Items && resultData.Items[0]) || null;
}

/** 新增报销申请 */
export async function createReimbursementApply(
  data: BilReimbursementApplyApi.ReimbursementApply,
) {
  const table = new DataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);

  const uid = data.rowid || generateUUID();
  const payload = {
    ...data,
    rowid: uid,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  if (res && APPLY_NO_RULE_ID) {
    try {
      const codeRes = await getCodeString(
        uid,
        APPLY_NO_RULE_ID,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateReimbursementApply({
          rowid: uid,
          reimbursement_no: codeRes.Message,
        });
      } else {
        await deleteReimbursementApply(uid);
        throw new Error(codeRes.Message || '获取编码失败');
      }
    } catch (error) {
      await deleteReimbursementApply(uid);
      throw error;
    }
  }

  return res;
}

/** 修改报销申请 */
export async function updateReimbursementApply(
  data: BilReimbursementApplyApi.ReimbursementApply,
) {
  const table = new DataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除报销申请 */
export async function deleteReimbursementApply(id: string) {
  const table = new DataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);
  const saveParam = table.getSaveParam([], [], [{ [APPLY_PK]: id }]);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 更新报销申请状态 */
export async function updateReimbursementApplyStatus(
  id: string,
  status: number,
) {
  return await updateReimbursementApply({ rowid: id, status });
}
