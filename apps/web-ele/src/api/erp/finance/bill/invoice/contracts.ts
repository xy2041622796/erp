import { generateUUID } from '@vben/utils';

import { and, clientData as ClientData, cond, DataTable } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { requestClient } from '#/api/request';

// Bil_Invoice_Apply_contract
// 数据表相关参数（如需联调，请替换为真实 ModelId）
const APPLY_CONTRACT_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C'; // Placeholder
const APPLY_CONTRACT_TABLE = 'Bil_Invoice_Apply_contract';
const APPLY_CONTRACT_DB = 'LMBill';
const APPLY_CONTRACT_PK = 'rowid';

export namespace BilInvoiceApplyContractApi {
  export interface InvoiceApplyContract {
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

    current_apply_amount?: number;
    contract_id?: string;
    invoice_apply_id?: string;
  }
}

export async function queryInvoiceApplyContracts(params: {
  invoice_apply_id: string;
}) {
  const table = createFinanceDataTable(
    APPLY_CONTRACT_MODEL_ID,
    APPLY_CONTRACT_TABLE,
    APPLY_CONTRACT_DB,
    APPLY_CONTRACT_PK,
  );

  table.Filter = and(
    cond('invoice_apply_id', 'equal', params.invoice_apply_id),
    cond('lingma_sys_is_delete', 'notequal', 1),
  );

  const queryParam = {
    Table: [table],
    PageParam: { page: 0, index: 1 },
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

  const returnData = new ClientData();
  returnData.dataTable = table;
  returnData.list = items;
  return returnData;
}

export async function saveInvoiceApplyContracts(payload: {
  add?: BilInvoiceApplyContractApi.InvoiceApplyContract[];
  removeRowIds?: string[];
  update?: BilInvoiceApplyContractApi.InvoiceApplyContract[];
}) {
  const table = createFinanceDataTable(
    APPLY_CONTRACT_MODEL_ID,
    APPLY_CONTRACT_TABLE,
    APPLY_CONTRACT_DB,
    APPLY_CONTRACT_PK,
  );

  const addList = (payload.add ?? []).map((item) => {
    const next = { ...item } as any;
    delete next.contract_no;
    delete next.project_name;
    delete next.settlement_nos;
    delete next.unbilled_amount;
    delete next.can_apply_amount;

    return {
      ...next,
      rowid: item.rowid || generateUUID(),
    };
  });

  const updateList = (payload.update ?? []).map((item) => {
    const next = { ...item } as any;
    delete next.contract_no;
    delete next.project_name;
    delete next.settlement_nos;
    delete next.unbilled_amount;
    delete next.can_apply_amount;

    return {
      ...next,
    };
  });

  const deleteList = (payload.removeRowIds ?? []).map((id) => ({
    [APPLY_CONTRACT_PK]: id,
  }));

  const saveParam = table.getSaveParam(addList, updateList, deleteList);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
