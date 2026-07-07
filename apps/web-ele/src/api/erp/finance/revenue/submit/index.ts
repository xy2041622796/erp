import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../common/account-set-scope';
import { deleteSubmitWriteOffsBySubmitIds } from '../writeoff';

import { generateDimensionByCollectionSubmit } from '#/api/erp/finance/dimension';
import { resolveFundsAccountSubject } from '#/api/erp/finance/funds/account-subject';
import { resolveVoucherDateByPeriodStatus } from '#/api/erp/finance/period-status';
import { getAllSubjectList, type BilSubjectApi } from '#/api/erp/finance/settings/project';
import { createVoucher, getNextVoucherCodeByDate, getVoucherPage } from '#/api/erp/finance/voucher';

/**
 * 收款提报（Bil_Collection_Submit）
 * - status: 0=待审批，1=待确认，2=已确认
 * - income_type: 业务收款/预收款收款
 */
export namespace ErpCollectionSubmitApi {
  export type SubmitStatus = 0 | 1 | 2 | number;

  export interface CollectionSubmit {
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

    income_type?: string;
    status?: SubmitStatus;
    project_id?: string;
    contract_id?: string;
    customer_id?: string;

    remark?: string;
    collection_account?: string;
    payer_bank?: string;
    payer_account?: string;
    user_name?: string;
    collection_amount?: number;
    collection_date?: Date | string;
    depart_name?: string;
  }
}

const SUBMIT_MODEL_ID = '33B22E86D2F2B11CFDCBBD786A00058E';
const SUBMIT_TABLE = 'Bil_Collection_Submit';
const SUBMIT_DB = 'LMBill';
const SUBMIT_PK = 'rowid';
const SUBMIT_NO_RULE_ID = 'C4438602622838F4F888662835DEF328';

function normalizeSubmitDescription(input: unknown) {
  if (input === undefined || input === null) return input as undefined | null;
  const text = String(input).trim();
  if (!text) return undefined;

  try {
    const parsed = JSON.parse(text);
    const items = Array.isArray((parsed as any)?.items) ? (parsed as any).items : [];
    const rowids = Array.isArray((parsed as any)?.settlement_rowids)
      ? (parsed as any).settlement_rowids.filter(Boolean)
      : [];
    const count = items.length > 0 ? items.length : rowids.length;
    if (count > 0) return `关联${count}条业务单据`;
    return undefined;
  } catch {
    return text;
  }
}

function pickNonEmptyText(...candidates: any[]) {
  for (const item of candidates) {
    const value = String(item ?? '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeAmount(value: any) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeSubjectNo(value: any) {
  return String(value ?? '').trim();
}

function toMysqlDateTime(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('凭证日期无效，无法生成财务凭证');
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function matchesKeyword(subject: BilSubjectApi.Subject, keywords: string[]) {
  const no = normalizeSubjectNo(subject?.subject_number);
  const name = String(subject?.subject_name ?? '').trim();
  const full = `${no} ${name}`;
  return keywords.some((keyword) => full.includes(keyword));
}

function isLeafSubject(subject?: BilSubjectApi.Subject) {
  return Number(subject?.is_leaf_subject ?? 0) === 1;
}

function filterLeafSubjects(subjects: BilSubjectApi.Subject[]) {
  return (subjects || []).filter((item) => isLeafSubject(item));
}

function findLeafSubjectByKeywords(subjects: BilSubjectApi.Subject[], keywordGroups: string[][]) {
  const leafSubjects = filterLeafSubjects(subjects);
  for (const group of keywordGroups) {
    const matched = leafSubjects.find((item) => matchesKeyword(item, group));
    if (matched) return matched;
  }
  return undefined;
}

function buildVoucherSummary(
  row: ErpCollectionSubmitApi.CollectionSubmit,
  options?: { customerName?: string },
) {
  const incomeType = pickNonEmptyText(row.income_type, '收款');
  const customerName = pickNonEmptyText(options?.customerName);
  const reportId = pickNonEmptyText(row.ReportID);
  const remark = pickNonEmptyText(row.remark);
  const pieces = [incomeType, customerName, reportId, remark].filter(Boolean);
  return pieces.join(' / ');
}

async function getCollectionVoucherSubjects(row: ErpCollectionSubmitApi.CollectionSubmit) {
  const subjectRes = await getAllSubjectList({
    subject_state: 1,
    lingma_sys_is_delete: 0,
    pageNo: 1,
    page: 0,
  });
  const subjects = (subjectRes?.list || []) as BilSubjectApi.Subject[];

  if (!subjects.length) {
    throw new Error('未找到启用中的会计科目，无法自动生成凭证');
  }

  const fundsSubject = await resolveFundsAccountSubject(
    row.collection_account,
    '收款',
  );
  const debitSubject = {
    subject_number: fundsSubject.subject_code,
    subject_name: fundsSubject.subject_name,
  } as BilSubjectApi.Subject;

  const isAdvance = pickNonEmptyText(row.income_type).includes('预收');
  const creditSubject = isAdvance
    ? findLeafSubjectByKeywords(subjects, [
        ['2203', '预收账款'],
        ['2203', '合同负债'],
        ['预收账款'],
        ['合同负债'],
      ])
    : findLeafSubjectByKeywords(subjects, [['1122', '应收账款'], ['应收账款']]);

  if (!debitSubject?.subject_number) {
    throw new Error('未匹配到收款借方末级科目，请先检查现金/银行存款子级科目配置');
  }
  if (!creditSubject?.subject_number) {
    throw new Error('未匹配到收款贷方末级科目，请先检查应收账款/预收账款末级科目');
  }

  return {
    debitSubject,
    creditSubject,
  };
}

export async function getCollectionSubmitPage(
  params: any & PageParam,
): Promise<clientData> {
  const table = createFinanceDataTable(SUBMIT_MODEL_ID, SUBMIT_TABLE, SUBMIT_DB, SUBMIT_PK);

  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.ReportID) conditions.push(cond('ReportID', 'contains', params.ReportID));
  if (params.customer_id) conditions.push(cond('customer_id', 'equal', params.customer_id));
  if (params.project_id) conditions.push(cond('project_id', 'equal', params.project_id));
  if (params.income_type) conditions.push(cond('income_type', 'equal', params.income_type));
  if (!isEmpty(params.status)) conditions.push(cond('status', 'equal', params.status));

  if (params.createtime && Array.isArray(params.createtime) && params.createtime.length === 2) {
    conditions.push(cond('createtime', 'greaterthanorequal', params.createtime[0]));
    conditions.push(cond('createtime', 'lessthanorequal', params.createtime[1]));
  }

  table.Filter = and(...conditions);

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

export async function getCollectionSubmit(rowid: string) {
  const table = createFinanceDataTable(SUBMIT_MODEL_ID, SUBMIT_TABLE, SUBMIT_DB, SUBMIT_PK);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'equal', 0),
    cond(SUBMIT_PK, 'equal', rowid),
  );

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
  return (resultData.Items && resultData.Items[0]) || null;
}

export async function createCollectionSubmit(
  data: ErpCollectionSubmitApi.CollectionSubmit,
  options?: { codeRuleId?: string; codeMenuId?: string },
) {
  const table = createFinanceDataTable(SUBMIT_MODEL_ID, SUBMIT_TABLE, SUBMIT_DB, SUBMIT_PK);

  const uid = generateUUID();
  const payload = {
    ...data,
    description: normalizeSubmitDescription(data?.description),
    rowid: uid,
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([payload as any], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  const codeMenuId = options?.codeMenuId ?? options?.codeRuleId ?? SUBMIT_NO_RULE_ID;
  let reportId: string | undefined;
  if (codeMenuId) {
    try {
      const codeRes = await getCodeString(uid, codeMenuId, table.getRequestHeader());
      if (codeRes.Code === 200 && codeRes.Message) {
        reportId = codeRes.Message;
        await updateCollectionSubmit({ rowid: uid, ReportID: reportId });
      } else {
        await deleteCollectionSubmit([uid]);
        return Promise.reject(new Error(codeRes.Message || '获取编码失败'));
      }
    } catch (error) {
      await deleteCollectionSubmit([uid]);
      throw error;
    }
  }

  return { ...res, rowid: uid, ReportID: reportId };
}

export async function updateCollectionSubmit(
  data: ErpCollectionSubmitApi.CollectionSubmit,
) {
  const table = createFinanceDataTable(SUBMIT_MODEL_ID, SUBMIT_TABLE, SUBMIT_DB, SUBMIT_PK);
  const normalizedData = {
    ...data,
    description: normalizeSubmitDescription(data?.description),
  };
  const saveParam = table.getSaveParam([], [normalizedData as any], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  return res;
}

export async function ensureVoucherForCollectionSubmit(
  row: ErpCollectionSubmitApi.CollectionSubmit,
  options?: { customerName?: string },
) {
  const reportId = pickNonEmptyText(row.ReportID, row.rowid);
  const existed = await getVoucherPage({ pageNo: 1, page: 0, keyword: reportId } as any);
  const existedList = (existed?.list || []) as any[];
  const existedVoucher = existedList.find(
    (item) =>
      String(item?.business_code ?? '').trim() === reportId &&
      String(item?.business_url ?? '').trim() === 'erp/finance/revenue/submit',
  );
  if (existedVoucher?.rowid) {
    return existedVoucher;
  }

  const amount = normalizeAmount(row.collection_amount);
  if (amount <= 0) {
    throw new Error('收款金额必须大于 0，才能生成凭证');
  }

  const { debitSubject, creditSubject } = await getCollectionVoucherSubjects(row);
  const summary = buildVoucherSummary(row, options);
  const sourceVoucherDate = pickNonEmptyText(row.collection_date, row.createtime, new Date().toISOString());
  const resolvedVoucherDate = await resolveVoucherDateByPeriodStatus({ date: sourceVoucherDate });
  const voucherDate = toMysqlDateTime(resolvedVoucherDate.voucherDate);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '收');

  return await createVoucher(
    {
      business_url: 'erp/finance/revenue/submit',
      business_code: reportId,
      business_name: '收款提报',
      voucher_type: pickNonEmptyText(row.income_type, '收款凭证'),
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: amount,
      credit_amount: amount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: pickNonEmptyText(row.user_name, row.createuser, row.updateuser),
    },
    [
      {
        abstract_content: summary,
        account_code: String(debitSubject.subject_number ?? '').trim(),
        account_name: String(debitSubject.subject_name ?? '').trim(),
        debit_amount: amount,
        credit_amount: 0,
        sort_no: 1,
      },
      {
        abstract_content: summary,
        account_code: String(creditSubject.subject_number ?? '').trim(),
        account_name: String(creditSubject.subject_name ?? '').trim(),
        debit_amount: 0,
        credit_amount: amount,
        sort_no: 2,
      },
    ],
  );
}

export async function ensureDimensionForCollectionSubmit(
  row: ErpCollectionSubmitApi.CollectionSubmit,
) {
  const amount = normalizeAmount(row.collection_amount);
  if (amount <= 0) {
    throw new Error('收款金额必须大于 0，才能生成业务维度');
  }

  const { debitSubject, creditSubject } = await getCollectionVoucherSubjects(row);

  return await generateDimensionByCollectionSubmit(row, {
    debitSubjectNo: String(debitSubject.subject_number ?? '').trim(),
    creditSubjectNo: String(creditSubject.subject_number ?? '').trim(),
  });
}

export async function updateCollectionSubmitStatus(
  rowid: string,
  status: ErpCollectionSubmitApi.SubmitStatus,
) {
  return updateCollectionSubmit({ rowid, status });
}

export async function deleteCollectionSubmit(rowids: string[]) {
  const ids = Array.from(new Set((rowids || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (ids.length === 0) return;

  await deleteSubmitWriteOffsBySubmitIds(ids, 0);

  const table = createFinanceDataTable(SUBMIT_MODEL_ID, SUBMIT_TABLE, SUBMIT_DB, SUBMIT_PK);
  const deleteList = ids.map((id) => ({
    [SUBMIT_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}
