import { generateUUID } from '@vben/utils';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

// 数据表相关参数
const EXPENSE_REGIST_MODEL_ID = '60A9BA04CB9C182DA2D5433235C13A07'; // Placeholder
const EXPENSE_REGIST_TABLE = 'Bil_Expense_Regist';
const EXPENSE_REGIST_DB = 'LMBill';
const EXPENSE_REGIST_PK = 'rowid';

// 注意：此处需要替换为你们“费用登记编号”的编码规则ID
// 参考：apps/web-ele/src/api/erp/sale/return/index.ts 的写法
const EXPENSE_REGIST_NO_RULE_ID = '54A80637C941B57329FAC694383621BE';

export namespace BilExpenseRegistApi {
  export interface ExpenseRegist {
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

    tax_rate?: number;
    expense_depart?: string;
    project_id?: string;
    remark?: string;

    registration_date?: Date | number | string;
    expense_amount?: number;
    expense_type?: string;
    user_id?: string;
    registration_no?: string;
    reimbursement_id?: string;
  }
}

/** 查询费用登记列表（分页） */
export async function getExpenseRegistPage(params: any) {
  const table = new DataTable(
    EXPENSE_REGIST_MODEL_ID,
    EXPENSE_REGIST_TABLE,
    EXPENSE_REGIST_DB,
    EXPENSE_REGIST_PK,
  );

  const filterConds: any[] = [];

  // 默认：不查已删除
  if (params.lingma_sys_is_delete === undefined) {
    filterConds.push(cond('lingma_sys_is_delete', 'notequal', 1));
  }

  if (params.registration_no) {
    filterConds.push(
      cond('registration_no', 'contains', params.registration_no),
    );
  }

  // tab：pending/history → flowstate
  if (params.flowstate !== undefined) {
    filterConds.push(cond('flowstate', 'equal', params.flowstate));
  } else if (params.tab === 'pending') {
    filterConds.push(cond('flowstate', 'equal', 0));
  } else if (params.tab === 'history') {
    filterConds.push(cond('flowstate', 'notequal', 0));
  }

  // 我的：按 user_id 过滤
  if (params.user_id) {
    filterConds.push(cond('user_id', 'equal', params.user_id));
  }

  if (params.expense_type) {
    filterConds.push(cond('expense_type', 'equal', params.expense_type));
  }

  if (params.expense_depart) {
    filterConds.push(cond('expense_depart', 'equal', params.expense_depart));
  }

  if (params.project_id) {
    filterConds.push(cond('project_id', 'contains', params.project_id));
  }

  if (
    params.tax_rate !== undefined &&
    params.tax_rate !== null &&
    params.tax_rate !== ''
  ) {
    filterConds.push(cond('tax_rate', 'equal', params.tax_rate));
  }

  // 日期区间（registrationDateRange: [start,end]）
  if (
    Array.isArray(params.registrationDateRange) &&
    params.registrationDateRange.length === 2
  ) {
    const [start, end] = params.registrationDateRange;
    if (start) {
      filterConds.push(cond('registration_date', 'greaterthanorequal', start));
    }
    if (end) {
      filterConds.push(cond('registration_date', 'lessthanorequal', end));
    }
  }

  // 关键字：摘要/备注/项目/登记编号/报销人
  if (params.keyword) {
    filterConds.push(
      or(
        cond('description', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
        cond('project_id', 'contains', params.keyword),
        cond('registration_no', 'contains', params.keyword),
        cond('user_id', 'contains', params.keyword),
        cond('createuser', 'contains', params.keyword),
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

/** 查询费用登记详情 */
export async function getExpenseRegist(id: string) {
  const table = new DataTable(
    EXPENSE_REGIST_MODEL_ID,
    EXPENSE_REGIST_TABLE,
    EXPENSE_REGIST_DB,
    EXPENSE_REGIST_PK,
  );
  table.Filter = cond(EXPENSE_REGIST_PK, 'equal', id);

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

/** 新增费用登记 */
export async function createExpenseRegist(
  data: BilExpenseRegistApi.ExpenseRegist,
) {
  const table = new DataTable(
    EXPENSE_REGIST_MODEL_ID,
    EXPENSE_REGIST_TABLE,
    EXPENSE_REGIST_DB,
    EXPENSE_REGIST_PK,
  );

  const uid = data.rowid || generateUUID();
  const payload = {
    ...data,
    rowid: uid,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  if (res) {
    try {
      const codeRes = await getCodeString(
        uid,
        EXPENSE_REGIST_NO_RULE_ID,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateExpenseRegist({
          rowid: uid,
          registration_no: codeRes.Message,
        });
      } else {
        await deleteExpenseRegist(uid);
        throw new Error(codeRes.Message || '获取编码失败');
      }
    } catch (error) {
      await deleteExpenseRegist(uid);
      throw error;
    }
  }

  return res;
}

/** 修改费用登记 */
export async function updateExpenseRegist(
  data: BilExpenseRegistApi.ExpenseRegist,
) {
  const table = new DataTable(
    EXPENSE_REGIST_MODEL_ID,
    EXPENSE_REGIST_TABLE,
    EXPENSE_REGIST_DB,
    EXPENSE_REGIST_PK,
  );
  const saveParam = table.getSaveParam([], [data], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

/** 删除费用登记 */
export async function deleteExpenseRegist(id: string) {
  const table = new DataTable(
    EXPENSE_REGIST_MODEL_ID,
    EXPENSE_REGIST_TABLE,
    EXPENSE_REGIST_DB,
    EXPENSE_REGIST_PK,
  );
  const saveParam = table.getSaveParam([], [], [{ [EXPENSE_REGIST_PK]: id }]);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
