import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';

import {
  addPaymentDetails,
  deletePaymentDetails,
  queryPaymentDetails,
  updatePaymentDetails,
  type ErpPaymentDetailApi,
} from './paymentDetails';
import { createFinanceDataTable } from '../../common/account-set-scope';

export namespace ErpOtherIncomeApi {
  /** 主表：其他收入（Bil_Income_Settlement，settlement_type = 2） */
  export interface OtherIncome {
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

    settlement_type?: number; // 0=正常 1=退款 2=其他收入
    status?: number;

    receive_account?: string;
    total_amount?: number;
    is_tax_included?: number;
    tax_rate?: number;
    amount?: number;

    income_category?: string;
    product_name?: string;
    product_id?: string;

    project_id?: string;
    depart_id?: string;
    salesman_id?: string;
    contract_id?: string;

    settlement_date?: Date | string;
    account_period?: Date | string;

    settlement_no?: string;
    customer_id?: string;
    remark?: string;

    settlement_period?: string;
    ticket_amount?: number;
    receive_balance?: number;
    receive_amount?: number;

    /** 子表：收款/付款明细（在“其他收入”场景作为“收入明细”使用） */
    details?: ErpPaymentDetailApi.PaymentDetail[];
  }
}

// 与收入结算共用同一张表
// 注意：此处需要替换为你们 Bil_Income_Settlement 的真实 formkey
const OTHER_INCOME_MODEL_ID = '16310B11348BC13B8C0D64235A05C4F8';
const OTHER_INCOME_TABLE = 'Bil_Income_Settlement';
const OTHER_INCOME_DB = 'LMBill';
const OTHER_INCOME_PK = 'rowid';

// 注意：此处需要替换为你们“其他收入单号”的编码规则ID
// getCodeString 第二个参数实际是 menuId
const OTHER_INCOME_NO_RULE_ID = '238AFDE76F53BEF244AE4910B1E9BCE5';

async function rollbackOtherIncome(rowid: string, detailRowids: string[]) {
  try {
    if (detailRowids.length > 0) {
      await deletePaymentDetails(detailRowids);
    }
  } finally {
    await deleteOtherIncome([rowid]);
  }
}

export async function getOtherIncomePage(params: any & PageParam): Promise<clientData> {
  const table = createFinanceDataTable(
    OTHER_INCOME_MODEL_ID,
    OTHER_INCOME_TABLE,
    OTHER_INCOME_DB,
    OTHER_INCOME_PK,
  );

  const conditions: any[] = [
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_type', 'equal', 2),
  ];

  if (params.settlement_no) {
    conditions.push(cond('settlement_no', 'contains', params.settlement_no));
  }
  if (params.customer_id) {
    conditions.push(cond('customer_id', 'equal', params.customer_id));
  }
  if (params.project_id) {
    conditions.push(cond('project_id', 'equal', params.project_id));
  }
  if (!isEmpty(params.status)) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (
    params.settlement_date &&
    Array.isArray(params.settlement_date) &&
    params.settlement_date.length === 2
  ) {
    conditions.push(
      cond('settlement_date', 'greaterthanorequal', params.settlement_date[0]),
    );
    conditions.push(cond('settlement_date', 'lessthanorequal', params.settlement_date[1]));
  }

  table.Filter = and(...conditions);

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

  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = items;
  returnData.total = total;
  return returnData;
}

export async function getOtherIncome(rowid: string) {
  const table = createFinanceDataTable(
    OTHER_INCOME_MODEL_ID,
    OTHER_INCOME_TABLE,
    OTHER_INCOME_DB,
    OTHER_INCOME_PK,
  );

  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('settlement_type', 'equal', 2),
    cond(OTHER_INCOME_PK, 'equal', rowid),
  );

  if (!table.Fields || table.Fields.length === 0) {
      }

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const main = (resultData.Items && resultData.Items[0]) || null;

  if (main) {
    const resDetails = await queryPaymentDetails({ business_doc_id: main.rowid });
    main.details = resDetails.list || [];
  }

  return main;
}

export async function createOtherIncome(
  data: ErpOtherIncomeApi.OtherIncome,
  options?: { codeMenuId?: string; codeRuleId?: string },
) {
  const table = createFinanceDataTable(
    OTHER_INCOME_MODEL_ID,
    OTHER_INCOME_TABLE,
    OTHER_INCOME_DB,
    OTHER_INCOME_PK,
  );

  const uid = generateUUID();

  const details = Array.isArray(data?.details) ? data.details : [];
  const newDetails = details.map((d: any) => ({
    ...d,
    rowid: d.rowid || generateUUID(),
    business_doc_id: uid,
    lingma_sys_is_delete: 0,
  }));

  const detailRowids = newDetails.map((d: any) => String(d.rowid)).filter(Boolean);

  const { details: _details, ...rest } = data as any;
  const payload = {
    ...rest,
    rowid: uid,
    settlement_type: 2,
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  let res: any;
  try {
    if (newDetails.length > 0) {
      await addPaymentDetails(newDetails);
    }

    res = await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });

    const codeMenuId =
      options?.codeMenuId ?? options?.codeRuleId ?? OTHER_INCOME_NO_RULE_ID;

    if (codeMenuId) {
      const codeRes = await getCodeString(
        uid,
        codeMenuId,
        table.getRequestHeader(),
      );
      if (codeRes.Code === 200 && codeRes.Message) {
        await updateOtherIncome({ rowid: uid, settlement_no: codeRes.Message });
        return { ...res, rowid: uid, settlement_no: codeRes.Message };
      }

      await rollbackOtherIncome(uid, detailRowids);
      return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
    }

    return { ...res, rowid: uid };
  } catch (error) {
    // 任一环节失败都回滚（主表+明细）
    await rollbackOtherIncome(uid, detailRowids);
    throw error;
  }
}

export async function updateOtherIncome(data: ErpOtherIncomeApi.OtherIncome) {
  const table = createFinanceDataTable(
    OTHER_INCOME_MODEL_ID,
    OTHER_INCOME_TABLE,
    OTHER_INCOME_DB,
    OTHER_INCOME_PK,
  );

  const rowid = data.rowid;
  if (!rowid) {
    throw new Error('缺少 rowid，无法更新');
  }

  // 子表：按 rowid 分流（新增/更新/删除）
  if (Array.isArray(data.details)) {
    const oldDetailsRes = await queryPaymentDetails({ business_doc_id: rowid });
    const oldDetails = (oldDetailsRes.list || []) as any[];
    const oldDetailMap = new Map(oldDetails.map((d: any) => [d.rowid, d]));

    const incoming = data.details as any[];
    const incomingIds = new Set();

    const toAdd: any[] = [];
    const toUpdate: any[] = [];

    for (const d of incoming) {
      if (d.rowid && oldDetailMap.has(d.rowid)) {
        incomingIds.add(d.rowid);
        toUpdate.push({
          ...d,
          business_doc_id: rowid,
          lingma_sys_is_delete: d.lingma_sys_is_delete ?? 0,
        });
      } else {
        // 新增：如果没有rowid，或rowid不在旧数据中（视为新增）
        const newId = generateUUID();
        // 如果原有 d.rowid 是有效值但不在DB中，我们也可以选择保留，但为了安全生成新的UUID通常更好，除非前端已经生成了UUID
        // 这里采用：如果前端生成了 ID（比如用于key），我们还是生成一个新的后端ID，避免格式问题。
        // 或者保留 d.rowid 如果它是 uuid。简化起见，重新生成 rowid 确保唯一且符合格式。
        toAdd.push({
          ...d,
          rowid: newId,
          business_doc_id: rowid,
          lingma_sys_is_delete: 0,
        });
      }
    }

    const toDelete = oldDetails
      .filter((d) => !incomingIds.has(d.rowid))
      .map((d) => d.rowid);

    if (toDelete.length > 0) {
      await deletePaymentDetails(toDelete);
    }
    if (toAdd.length > 0) {
      await addPaymentDetails(toAdd);
    }
    if (toUpdate.length > 0) {
      await updatePaymentDetails(toUpdate);
    }
  }

  const { details: _details, ...rest } = data as any;
  const saveParam = table.getSaveParam([], [rest], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateOtherIncomeStatus(rowid: string, status: number) {
  return updateOtherIncome({ rowid, status });
}

export async function deleteOtherIncome(rowids: string[]) {
  const table = createFinanceDataTable(
    OTHER_INCOME_MODEL_ID,
    OTHER_INCOME_TABLE,
    OTHER_INCOME_DB,
    OTHER_INCOME_PK,
  );

  const deleteList = rowids.map((id) => ({
    [OTHER_INCOME_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
