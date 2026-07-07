import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '../../common/account-set-scope';

// 注意：此处需要替换为你们 Bil_Payment_Document_Detail 的真实 formkey
// 如果你们后端与 Bil_Expense_Settlement 共用 formkey，也可直接复用。
const PAYMENT_DETAIL_MODEL_ID = '55EF587C216C3D9B6FCF8F2C5BC40086';
const PAYMENT_DETAIL_TABLE = 'Bil_Payment_Document_Detail';
const PAYMENT_DETAIL_DB = 'LMBill';
const PAYMENT_DETAIL_PK = 'rowid';

export namespace ErpPaymentDetailApi {
  /** 收款/付款明细（Bil_Payment_Document_Detail） */
  export interface PaymentDetail {
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

    verification_amount?: number;
    apply_balance?: number;
    business_doc_balance?: number;
    business_doc_amount?: number;
    business_doc_id?: string;
    payment_apply_id?: string;

    /** 这里在“其他支出”场景里可作为“支出类别”使用 */
    payment_type?: string;

    tax_rate?: number;
    apply_month?: Date | string;
  }
}

export async function queryPaymentDetails(params: { business_doc_id: string }) {
  const table = createFinanceDataTable(
    PAYMENT_DETAIL_MODEL_ID,
    PAYMENT_DETAIL_TABLE,
    PAYMENT_DETAIL_DB,
    PAYMENT_DETAIL_PK,
  );

  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond('business_doc_id', 'equal', params.business_doc_id),
  );

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

  const resData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const returnData = new clientData();
  returnData.dataTable = table;
  returnData.list = resData?.Items || [];
  return returnData;
}

export async function addPaymentDetails(list: any[]) {
  const table = createFinanceDataTable(
    PAYMENT_DETAIL_MODEL_ID,
    PAYMENT_DETAIL_TABLE,
    PAYMENT_DETAIL_DB,
    PAYMENT_DETAIL_PK,
  );
  const saveParam = table.getSaveParam(list, [], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updatePaymentDetails(list: any[]) {
  const table = createFinanceDataTable(
    PAYMENT_DETAIL_MODEL_ID,
    PAYMENT_DETAIL_TABLE,
    PAYMENT_DETAIL_DB,
    PAYMENT_DETAIL_PK,
  );
  const saveParam = table.getSaveParam([], list, []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function deletePaymentDetails(rowids: string[]) {
  const table = createFinanceDataTable(
    PAYMENT_DETAIL_MODEL_ID,
    PAYMENT_DETAIL_TABLE,
    PAYMENT_DETAIL_DB,
    PAYMENT_DETAIL_PK,
  );

  const deleteList = rowids.map((id) => ({
    [PAYMENT_DETAIL_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
