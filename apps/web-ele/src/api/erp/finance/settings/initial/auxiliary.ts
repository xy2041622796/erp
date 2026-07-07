import { generateUUID } from '@vben/utils';

import { and, cond } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId } from '#/utils/accountSet';

import { createFinanceDataTable } from '../../common/account-set-scope';

const SUBJECT_OPENING_AUX_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_OPENING_AUX_TABLE = 'Bil_Subject_Opening_Auxiliary';
const SUBJECT_OPENING_AUX_DB = 'LMBill';
const SUBJECT_OPENING_AUX_PK = 'rowid';

export type SubjectOpeningAuxiliaryValue = {
  dim_code: string;
  dim_name?: string;
  value_code: string;
  value_name?: string;
};

export type SubjectOpeningAuxiliaryRow = {
  account_set_id?: string;
  auxiliary_values?: string | SubjectOpeningAuxiliaryValue[];
  beginning_balance?: number;
  cebit_balance_sum?: number;
  createuser?: string;
  debit_balance_sum?: number;
  lingma_sys_is_delete?: number;
  rowid?: string;
  sort_no?: number;
  subject_code?: string;
  subject_name?: string;
};

function createSubjectOpeningAuxiliaryTable() {
  return createFinanceDataTable(
    SUBJECT_OPENING_AUX_MODEL_ID,
    SUBJECT_OPENING_AUX_TABLE,
    SUBJECT_OPENING_AUX_DB,
    SUBJECT_OPENING_AUX_PK,
  );
}

function resolveAccountSetId(accountSetId?: string) {
  return String(accountSetId || getStoredAccountSetId() || '').trim();
}

function extractItems(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  return Array.isArray(resultData?.Items) ? resultData.Items : [];
}

export async function getSubjectOpeningAuxiliaryList(params: {
  account_set_id?: string;
  subject_code?: string;
}) {
  const accountSetId = resolveAccountSetId(params.account_set_id);
  const subjectCode = String(params.subject_code || '').trim();
  if (!accountSetId) return [];

  const table = createSubjectOpeningAuxiliaryTable();
  const filters = [
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_set_id', 'equal', accountSetId),
  ];
  if (subjectCode) filters.push(cond('subject_code', 'equal', subjectCode));
  table.Filter = and(...filters);
  table.Fields = [
    // { Name: 'sort_no', AsName: '', OrderType: 'ascending', Order: 1, Group: 0 },
    // {
    //   Name: 'createtime',
    //   AsName: '',
    //   OrderType: 'ascending',
    //   Order: 2,
    //   Group: 0,
    // },
  ];

  const response = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 0, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  table.execQueryResult(response);
  return extractItems(response) as SubjectOpeningAuxiliaryRow[];
}

export async function saveSubjectOpeningAuxiliaryList(params: {
  account_set_id?: string;
  rows: SubjectOpeningAuxiliaryRow[];
  subject_code: string;
  subject_name?: string;
}) {
  const accountSetId = resolveAccountSetId(params.account_set_id);
  const subjectCode = String(params.subject_code || '').trim();
  if (!accountSetId) throw new Error('未选择当前账套，无法保存辅助期初');
  if (!subjectCode) throw new Error('缺少科目编码，无法保存辅助期初');

  const oldRows = await getSubjectOpeningAuxiliaryList({
    account_set_id: accountSetId,
    subject_code: subjectCode,
  });
  const table = createSubjectOpeningAuxiliaryTable();
  const deleted = oldRows
    .filter((row) => row.rowid)
    .map((row) => ({
      rowid: row.rowid,
      lingma_sys_is_delete: 1,
    }));
  const added = (params.rows || []).map((row, index) => ({
    ...row,
    rowid: generateUUID(),
    account_set_id: accountSetId,
    subject_code: subjectCode,
    subject_name: params.subject_name,
    auxiliary_values:
      typeof row.auxiliary_values === 'string'
        ? row.auxiliary_values
        : JSON.stringify(row.auxiliary_values || []),
    sort_no: index + 1,
    lingma_sys_is_delete: 0,
  }));

  if (added.length === 0 && deleted.length === 0) return;
  const saveParam = table.getSaveParam(added, [], deleted);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
