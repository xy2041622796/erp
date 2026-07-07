import type { PageParam } from '@vben/request';

import { generateUUID, isEmpty } from '@vben/utils';

import { and, clientData, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getCodeString } from '#/api/system/coding';
import { createFinanceDataTable } from '../../common/account-set-scope';

import { resolveFundsAccountSubject } from '#/api/erp/finance/funds/account-subject';
import { resolveVoucherDateByPeriodStatus } from '#/api/erp/finance/period-status';
import { getAllSubjectList, type BilSubjectApi } from '#/api/erp/finance/settings/project';
import { createVoucher, getNextVoucherCodeByDate, getVoucherPage } from '#/api/erp/finance/voucher';
import { getSubmitWriteOffList } from '#/api/erp/finance/revenue/writeoff';
import { getExpenseSettlementPage, updateExpenseSettlement } from '#/api/erp/finance/payment/settlement';

/**
 * 支出申请（Bil_Payment_Apply）
 * - status: 0=待审批，1=待确认/待付款（按你们业务定义），2=已确认/已完成
 */
export namespace ErpPaymentApplyApi {
  export type ApplyStatus = 0 | 1 | 2 | number;

  export interface PaymentApply {
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
    lingma_sys_ent?: number;

    customer_id?: string;
    remark?: string;
    contract_id?: string;
    project_id?: string;
    status?: ApplyStatus;

    apply_depart?: string;
    repay_date?: Date | string;
    payee_name?: string;
    payment_purpose?: string;
    payment_amount?: number;
    apply_date?: Date | string;
    applicant_name?: string;
    apply_no?: string;

    pay_balance?: number;
    pay_amount?: number;
    payment_type?: string;
    pay_account?: string;
  }
}

const APPLY_MODEL_ID = '869CE3A9780CEC1BA75E9193D9C4EC33';
const APPLY_TABLE = 'Bil_Payment_Apply';
const APPLY_DB = 'LMBill';
const APPLY_PK = 'rowid';
const APPLY_NO_RULE_ID = '3852A2D83657C7A9D2B92845AC3E2F62';

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

function buildPaymentVoucherSummary(row: ErpPaymentApplyApi.PaymentApply) {
  const paymentType = pickNonEmptyText(row.payment_type, '付款申请');
  const payeeName = pickNonEmptyText(row.payee_name);
  const applyNo = pickNonEmptyText(row.apply_no, row.ReportID);
  const purpose = pickNonEmptyText(row.payment_purpose, row.remark);
  const pieces = [paymentType, payeeName, applyNo, purpose].filter(Boolean);
  return pieces.join(' / ');
}

async function getPaymentVoucherSubjects(row: ErpPaymentApplyApi.PaymentApply) {
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

  const debitByType = pickNonEmptyText(row.payment_type);

  const fundsSubject = await resolveFundsAccountSubject(row.pay_account, '付款');
  const creditSubject = {
    subject_number: fundsSubject.subject_code,
    subject_name: fundsSubject.subject_name,
  } as BilSubjectApi.Subject;

  let debitSubject: BilSubjectApi.Subject | undefined;
  if (/预付/.test(debitByType)) {
    debitSubject = findLeafSubjectByKeywords(subjects, [['1123', '预付账款'], ['预付账款']]);
  } else if (/借支|借出/.test(debitByType)) {
    debitSubject = findLeafSubjectByKeywords(subjects, [['1221', '其他应收款'], ['其他应收款']]);
  } else if (/押金|保证金/.test(debitByType)) {
    debitSubject = findLeafSubjectByKeywords(subjects, [['1221', '其他应收款'], ['2241', '其他应付款'], ['其他应收款']]);
  } else if (/工资/.test(debitByType)) {
    debitSubject = findLeafSubjectByKeywords(subjects, [['2211', '应付职工薪酬'], ['应付职工薪酬']]);
  } else if (/退回预收/.test(debitByType)) {
    debitSubject = findLeafSubjectByKeywords(subjects, [['2203', '预收账款'], ['2203', '合同负债'], ['预收账款'], ['合同负债']]);
  } else {
    debitSubject = findLeafSubjectByKeywords(subjects, [['2202', '应付账款'], ['2241', '其他应付款'], ['应付账款'], ['其他应付款']]);
  }

  if (!debitSubject?.subject_number) {
    throw new Error('未匹配到付款借方末级科目，请先检查应付/预付/其他应收等末级科目');
  }
  if (!creditSubject?.subject_number) {
    throw new Error('未匹配到付款贷方末级科目，请先检查银行存款/库存现金子级科目');
  }

  return {
    debitSubject,
    creditSubject,
  };
}

export async function getPaymentApplyPage(params: any & PageParam): Promise<clientData> {
  const table = createFinanceDataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);

  const conditions: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.apply_no) conditions.push(cond('apply_no', 'contains', params.apply_no));
  if (params.customer_id) conditions.push(cond('customer_id', 'equal', params.customer_id));
  if (params.project_id) conditions.push(cond('project_id', 'equal', params.project_id));
  if (params.contract_id) conditions.push(cond('contract_id', 'equal', params.contract_id));
  if (!isEmpty(params.status)) conditions.push(cond('status', 'equal', params.status));

  if (params.apply_date && Array.isArray(params.apply_date) && params.apply_date.length === 2) {
    conditions.push(cond('apply_date', 'greaterthanorequal', params.apply_date[0]));
    conditions.push(cond('apply_date', 'lessthanorequal', params.apply_date[1]));
  }

  if (params.keyword) {
    conditions.push(
      or(
        cond('payment_purpose', 'contains', params.keyword),
        cond('payee_name', 'contains', params.keyword),
        cond('remark', 'contains', params.keyword),
        cond('description', 'contains', params.keyword),
      ),
    );
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

export async function getPaymentApply(rowid: string) {
  const table = createFinanceDataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);
  table.Filter = and(cond('lingma_sys_is_delete', 'notequal', 1), cond(APPLY_PK, 'equal', rowid));

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

export async function createPaymentApply(
  data: ErpPaymentApplyApi.PaymentApply,
  options?: { codeRuleId?: string; codeMenuId?: string },
) {
  const table = createFinanceDataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);

  const uid = generateUUID();
  const payload = {
    ...data,
    rowid: uid,
    lingma_sys_is_delete: 0,
  };

  const saveParam = table.getSaveParam([payload as any], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  const codeMenuId = options?.codeMenuId ?? options?.codeRuleId ?? APPLY_NO_RULE_ID;
  let applyNo: string | undefined;

  if (codeMenuId && codeMenuId !== '00000000000000000000000000000000') {
    try {
      const codeRes = await getCodeString(uid, codeMenuId, table.getRequestHeader());
      if (codeRes?.Code === 200 && codeRes?.Message) {
        applyNo = codeRes.Message;
        await updatePaymentApply({ rowid: uid, apply_no: applyNo });
      } else {
        await deletePaymentApply([uid]);
        return Promise.reject(new Error(codeRes?.Message || '获取编码失败'));
      }
    } catch (error) {
      await deletePaymentApply([uid]);
      throw error;
    }
  }

  return { ...res, rowid: uid, apply_no: applyNo };
}

export async function updatePaymentApply(data: ErpPaymentApplyApi.PaymentApply) {
  const table = createFinanceDataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);
  const saveParam = table.getSaveParam([], [data as any], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function ensureVoucherForPaymentApply(row: ErpPaymentApplyApi.PaymentApply) {
  const businessCode = pickNonEmptyText(row.apply_no, row.ReportID, row.rowid);
  const existed = await getVoucherPage({ pageNo: 1, page: 0, keyword: businessCode } as any);
  const existedList = (existed?.list || []) as any[];
  const existedVoucher = existedList.find(
    (item) =>
      String(item?.business_code ?? '').trim() === businessCode &&
      String(item?.business_url ?? '').trim() === 'erp/finance/payment/submit',
  );
  if (existedVoucher?.rowid) {
    return existedVoucher;
  }

  const amount = normalizeAmount(row.payment_amount ?? row.pay_amount);
  if (amount <= 0) {
    throw new Error('付款金额必须大于 0，才能生成凭证');
  }

  const { debitSubject, creditSubject } = await getPaymentVoucherSubjects(row);
  const summary = buildPaymentVoucherSummary(row);
  const sourceVoucherDate = pickNonEmptyText(row.apply_date, row.createtime, new Date().toISOString());
  const resolvedVoucherDate = await resolveVoucherDateByPeriodStatus({ date: sourceVoucherDate });
  const voucherDate = toMysqlDateTime(resolvedVoucherDate.voucherDate);
  const voucherCode = await getNextVoucherCodeByDate(voucherDate, '付');

  return await createVoucher(
    {
      business_url: 'erp/finance/payment/submit',
      business_code: businessCode,
      business_name: '付款申请',
      voucher_type: pickNonEmptyText(row.payment_type, '付款凭证'),
      voucher_date: voucherDate,
      voucher_code: voucherCode,
      debit_amount: amount,
      credit_amount: amount,
      description: summary,
      is_posted: 0,
      is_reversed: 0,
      operator: pickNonEmptyText(row.applicant_name, row.createuser, row.updateuser),
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

export async function updatePaymentApplyStatus(rowid: string, status: ErpPaymentApplyApi.ApplyStatus) {
  return updatePaymentApply({ rowid, status });
}

export async function deletePaymentApply(rowids: string[]) {
  const table = createFinanceDataTable(APPLY_MODEL_ID, APPLY_TABLE, APPLY_DB, APPLY_PK);

  const deleteList = rowids.map((id) => ({
    [APPLY_PK]: id,
    lingma_sys_is_delete: 1,
  }));

  const saveParam = table.getSaveParam([], [], deleteList as any);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}


export async function markExpenseSettlementsInPaymentProcess(submitId: string) {
  const id = String(submitId || '').trim();
  if (!id) return;
  const writeOffs = await getSubmitWriteOffList({ submit_id: id, write_off_type: 1 });
  const settlementIds = Array.from(new Set((writeOffs || []).map((w: any) => String(w?.settlement_id || '').trim()).filter(Boolean)));
  await Promise.all(settlementIds.map((sid) => updateExpenseSettlement({ rowid: sid, status: 25 } as any)));
}

export async function confirmExpenseSettlementsByPaymentApply(submitId: string) {
  const id = String(submitId || '').trim();
  if (!id) return;
  const writeOffs = await getSubmitWriteOffList({ submit_id: id, write_off_type: 1 });
  const settlementIds = Array.from(new Set((writeOffs || []).map((w: any) => String(w?.settlement_id || '').trim()).filter(Boolean)));
  if (settlementIds.length === 0) return;
  const settlementRes = await getExpenseSettlementPage({ pageNo: 1, page: 1000, rowids: settlementIds } as any);
  const settlements = ((settlementRes as any)?.list || []) as any[];
  const settlementMap = new Map<string, any>();
  for (const s of settlements) settlementMap.set(String(s?.rowid || '').trim(), s);
  const applyMap = new Map<string, number>();
  for (const w of writeOffs || []) {
    const sid = String((w as any)?.settlement_id || '').trim();
    if (!sid) continue;
    applyMap.set(sid, Number(applyMap.get(sid) || 0) + Number((w as any)?.write_off_amount || 0));
  }
  await Promise.all(Array.from(applyMap.entries()).map(async ([sid, addAmount]) => {
    const row = settlementMap.get(sid) || { rowid: sid };
    const total = Number(row?.total_amount ?? 0);
    const paid = Number(row?.pay_amount ?? 0) + Number(addAmount || 0);
    const balance = Math.max(Number(row?.pay_balance ?? total) - Number(addAmount || 0), 0);
    const nextStatus = balance > 0 ? 25 : 30;
    await updateExpenseSettlement({ rowid: sid, pay_amount: paid, pay_balance: balance, ticket_amount: balance, status: nextStatus } as any);
  }));
}
