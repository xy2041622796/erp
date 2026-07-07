import { generateUUID } from '@vben/utils';

import ExcelJS from 'exceljs';

import { getImportSchemeDetail } from '#/api/erp/import-design/scheme';
import { initializeFinanceAuxDepartmentsFromSystemDept } from '#/api/erp/finance/settings/auxiliary/finance-aux-values';

import { and, cond, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { getStoredAccountSetId, getStoredAccountSetName } from '#/utils/accountSet';
import {
  formatSubjectCodeRule,
  getNextSubjectCodeSegmentLength,
  getRootSubjectCodeLength,
  getSubjectCodeRuleSync,
} from './subject-code-rule';
import {
  createFinanceDataTable,
  createFinanceDataTableCurrent,
} from '../../common/account-set-scope';

// Bil_Subject_Info
const SUBJECT_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_TABLE = 'Bil_Subject_Info';
const SUBJECT_DB = 'LMBill';
const SUBJECT_PK = 'rowid';
export const SUBJECT_IO_ENCODING_ID = 'E0602184B0D95667BC795AB2F41D814C';

// Bil_Subject_Template
const SUBJECT_TEMPLATE_MODEL_ID = 'DA7DA9A4728EEED1C1481C08AE63ECE7';
const SUBJECT_TEMPLATE_TABLE = 'Bil_Subject_Template';
const SUBJECT_TEMPLATE_DB = 'LMBill';
const SUBJECT_TEMPLATE_PK = 'rowid';

// Bil_Account_Info
const ACCOUNTSET_MODEL_ID = '3316EE356C1730749A402D4EAF8B9944';
const ACCOUNTSET_TABLE = 'Bil_Account_Info';
const ACCOUNTSET_DB = 'LMBill';
const ACCOUNTSET_PK = 'rowid';

const VOUCHER_DETAIL_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_TABLE = 'Bil_Voucher_Detail';
const VOUCHER_DETAIL_DB = 'LMBill';
const VOUCHER_DETAIL_PK = 'rowid';

export namespace BilSubjectApi {
  export interface Subject {
    rowid?: string;
    createuser?: string;
    createtime?: Date | number | string;
    updateuser?: string;
    updatetime?: Date | number | string;
    wfid?: string;
    flowstate?: number;
    ReportID?: string;
    description?: string;
    lingma_sys_is_delete?: number;
    subject_state?: number;
    is_leaf_subject?: number;
    parent_subject_number?: string;
    balance_direction?: number | string;
    subject_type?: number | string;
    subject_name?: string;
    subject_number?: string;
    account_id?: string;
    account_set_id?: string;
    lingma_sys_ent?: string;
    auxiliary_accounting?: string;
  }

  export interface OptionItem {
    label: string;
    value: string;
    [key: string]: any;
  }

  export interface VoucherDetail {
    rowid?: string;
    voucher_id?: string;
    account_name?: string;
    account_code?: string;
    lingma_sys_is_delete?: number;
    [key: string]: any;
  }

  export interface DeleteEffect {
    subject: Subject;
    parentSubject: Subject | null;
    isChildSubject: boolean;
    isLastChild: boolean;
    childCountAfterDelete: number;
    voucherCount: number;
    confirmMessage: string;
  }
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = resultData?.Count ?? (Array.isArray(items) ? items.length : 0);
  return { items, total };
}

function normalizeSubjectNumber(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeSubjectType(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeNullableSubjectNumber(value: unknown) {
  const normalized = normalizeSubjectNumber(value);
  return normalized || null;
}

function getCurrentSubjectCodeRule(data?: BilSubjectApi.Subject) {
  const subjectType = data?.subject_type || String(data?.subject_number || '').trim().slice(0, 1);
  return getSubjectCodeRuleSync(subjectType);
}

function getNextSegmentLength(parentNumber: string, data?: BilSubjectApi.Subject) {
  return getNextSubjectCodeSegmentLength(parentNumber, getCurrentSubjectCodeRule(data));
}

function applySubjectOrder(table: DataTable) {
  table.Fields = [];
}

function compareSubjectRecords(
  a: BilSubjectApi.Subject,
  b: BilSubjectApi.Subject,
) {
  const numberCompare = normalizeSubjectNumber(a?.subject_number).localeCompare(
    normalizeSubjectNumber(b?.subject_number),
    'zh-Hans-CN-u-kn-true',
    { numeric: true, sensitivity: 'base' },
  );
  if (numberCompare !== 0) return numberCompare;

  return String(a?.rowid ?? '').localeCompare(String(b?.rowid ?? ''));
}

function sortSubjectList<T extends BilSubjectApi.Subject>(items: T[]) {
  return [...(items || [])].sort(compareSubjectRecords);
}

function assertSubjectNumberAllowed(data: BilSubjectApi.Subject) {
  const subjectNumber = normalizeSubjectNumber(data?.subject_number);
  if (!subjectNumber) {
    throw new Error('请输入科目编码');
  }

  if (!/^\d+$/.test(subjectNumber)) {
    throw new Error('科目编码只能输入数字');
  }

  const parentNumber = normalizeSubjectNumber(data?.parent_subject_number);
  if (parentNumber) {
    const nextSegmentLength = getNextSegmentLength(parentNumber, data);
    if (!nextSegmentLength) {
      throw new Error(`当前科目已达到 ${formatSubjectCodeRule(getCurrentSubjectCodeRule(data))} 规则的末级，不能继续新增下级`);
    }

    if (!subjectNumber.startsWith(parentNumber)) {
      throw new Error(`子科目编码必须以父科目编码 ${parentNumber} 开头`);
    }
    if (subjectNumber.length !== parentNumber.length + nextSegmentLength) {
      throw new Error(
        `子科目编码必须在父科目编码后追加 ${nextSegmentLength} 位数字`,
      );
    }
    return;
  }

  const subjectType = normalizeSubjectType(data?.subject_type);
  if (!/^[1-5]$/.test(subjectType)) {
    throw new Error('顶级科目只能挂在 1、2、3、4、5 这几个类别下');
  }

  const rootCodeLength = getRootSubjectCodeLength(getCurrentSubjectCodeRule(data));
  if (subjectNumber.length !== rootCodeLength) {
    throw new Error(`顶级科目编码必须是 ${rootCodeLength} 位数字`);
  }

  if (!subjectNumber.startsWith(subjectType)) {
    throw new Error(`顶级科目编码必须以 ${subjectType} 开头`);
  }
}

async function ensureParentNotLeaf(data: BilSubjectApi.Subject) {
  const parentNumber = normalizeSubjectNumber(data?.parent_subject_number);
  if (!parentNumber) return;

  const parent = await getSubjectByNumber(parentNumber);
  if (!parent?.rowid) {
    throw new Error(`未找到上级科目：${parentNumber}`);
  }

  if (Number(parent.is_leaf_subject ?? 0) !== 1) {
    return;
  }

  await updateSubject({
    rowid: parent.rowid,
    is_leaf_subject: 0,
  });
}

function createVoucherDetailTable() {
  return createFinanceDataTable(
    VOUCHER_DETAIL_MODEL_ID,
    VOUCHER_DETAIL_TABLE,
    VOUCHER_DETAIL_DB,
    VOUCHER_DETAIL_PK,
  );
}

function createSubjectTable() {
  return createFinanceDataTable(
    SUBJECT_MODEL_ID,
    SUBJECT_TABLE,
    SUBJECT_DB,
    SUBJECT_PK,
  );
}

function createSubjectTemplateTable() {
  return new DataTable(
    SUBJECT_TEMPLATE_MODEL_ID,
    SUBJECT_TEMPLATE_TABLE,
    SUBJECT_TEMPLATE_DB,
    SUBJECT_TEMPLATE_PK,
  );
}

function createAccountSetTable() {
  return createFinanceDataTableCurrent(
    ACCOUNTSET_MODEL_ID,
    ACCOUNTSET_TABLE,
    ACCOUNTSET_DB,
    ACCOUNTSET_PK,
  );
}

async function getSubjectTemplateList() {
  const table = createSubjectTemplateTable();
  table.Filter = cond('lingma_sys_is_delete', 'notequal', 1);

  const queryParam: any = {
    Table: [table],
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items as BilSubjectApi.Subject[];
}

async function getCurrentAccountSet() {
  const accountSetId = String(getStoredAccountSetId() || '').trim();
  if (!accountSetId) {
    throw new Error('未选择当前账套，无法初始化科目');
  }

  const table = createAccountSetTable();
  table.Filter = cond(ACCOUNTSET_PK, 'equal', accountSetId);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  const current = items[0] || null;
  if (!current?.rowid) {
    throw new Error('未找到当前账套信息，无法初始化科目');
  }
  return current;
}

function buildInitializedSubjectList(
  templateList: BilSubjectApi.Subject[],
  accountSet: Record<string, any>,
) {
  const accountId = String(accountSet.rowid || '').trim();
  const accountSetId = String(
    accountSet.account_set_id || accountSet.rowid || '',
  ).trim();

  if (!accountId) {
    throw new Error('缺少账套ID，无法初始化科目');
  }

  return templateList.map((item) => ({
    rowid: generateUUID(),
    createuser: item.createuser,
    createtime: item.createtime,
    updateuser: item.updateuser,
    updatetime: item.updatetime,
    wfid: item.wfid,
    flowstate: item.flowstate,
    ReportID: item.ReportID,
    description: item.description,
    lingma_sys_is_delete: item.lingma_sys_is_delete ?? 0,
    subject_state: item.subject_state ?? 1,
    is_leaf_subject: item.is_leaf_subject ?? 1,
    parent_subject_number: normalizeNullableSubjectNumber(
      item.parent_subject_number,
    ),
    balance_direction: item.balance_direction,
    subject_type: normalizeSubjectType(item.subject_type),
    subject_name: item.subject_name,
    subject_number: normalizeSubjectNumber(item.subject_number),
    account_id: accountId,
    account_set_id: accountSetId,
    lingma_sys_ent: item.lingma_sys_ent || accountSet.lingma_sys_ent,
    auxiliary_accounting: item.auxiliary_accounting,
  }));
}

export async function getSubjectTypeOptions(): Promise<
  BilSubjectApi.OptionItem[]
> {
  return [
    { label: '资产', value: '1' },
    { label: '负债', value: '2' },
    { label: '权益', value: '3' },
    { label: '成本', value: '4' },
    { label: '损益', value: '5' },
  ];
}

export async function getAllSubjectList(params: {
  account_id?: string;
  keyword?: string;
  lingma_sys_is_delete?: number;
  pageNo?: number;
  page?: number;
  subject_state?: number | string;
  subject_type?: number | string;
}) {
  const table = createSubjectTable();

  const filterConds: any[] = [];

  if (params?.subject_type !== undefined && params?.subject_type !== null) {
    filterConds.push(
      cond('subject_type', 'equal', String(params.subject_type)),
    );
  }

  if (
    params?.subject_state !== undefined &&
    params?.subject_state !== null &&
    params?.subject_state !== ''
  ) {
    filterConds.push(cond('subject_state', 'equal', params.subject_state));
  }

  if (params?.account_id) {
    filterConds.push(cond('account_id', 'equal', params.account_id));
  }

  if (
    params?.lingma_sys_is_delete !== undefined &&
    params?.lingma_sys_is_delete !== null
  ) {
    filterConds.push(
      cond('lingma_sys_is_delete', 'equal', params.lingma_sys_is_delete),
    );
  }

  const keyword = String(params?.keyword ?? '').trim();
  const keywordFilter = keyword
    ? or(
        cond('subject_name', 'contains', keyword),
        cond('subject_number', 'contains', keyword),
      )
    : null;

  if (filterConds.length > 0 && keywordFilter) {
    table.Filter = and(and(...filterConds), keywordFilter);
  } else if (filterConds.length > 0) {
    table.Filter = and(...filterConds);
  } else if (keywordFilter) {
    table.Filter = keywordFilter;
  }

  applySubjectOrder(table);

  const queryParam: any = {
    Table: [table],
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);
  const sortedList = sortSubjectList(items as BilSubjectApi.Subject[]);

  return {
    dataTable: table,
    list: sortedList,
    total,
  };
}

export async function getSubjectList(params: {
  account_id?: string;
  keyword?: string;
  lingma_sys_is_delete?: number;
  pageNo?: number;
  page?: number;
  subject_state?: number | string;
  subject_type?: number | string;
}) {
  const table = createSubjectTable();

  const filterConds: any[] = [];

  if (params?.subject_type !== undefined && params?.subject_type !== null) {
    filterConds.push(
      cond('subject_type', 'equal', String(params.subject_type)),
    );
  }

  if (
    params?.subject_state !== undefined &&
    params?.subject_state !== null &&
    params?.subject_state !== ''
  ) {
    filterConds.push(cond('subject_state', 'equal', params.subject_state));
  }

  if (
    params?.lingma_sys_is_delete !== undefined &&
    params?.lingma_sys_is_delete !== null
  ) {
    filterConds.push(
      cond('lingma_sys_is_delete', 'equal', params.lingma_sys_is_delete),
    );
  }

  const keyword = String(params?.keyword ?? '').trim();
  const keywordFilter = keyword
    ? or(
        cond('subject_name', 'contains', keyword),
        cond('subject_number', 'contains', keyword),
      )
    : null;

  if (filterConds.length > 0 && keywordFilter) {
    table.Filter = and(and(...filterConds), keywordFilter);
  } else if (filterConds.length > 0) {
    table.Filter = and(...filterConds);
  } else if (keywordFilter) {
    table.Filter = keywordFilter;
  }

  applySubjectOrder(table);

  const queryParam: any = {
    Table: [table],
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(resQuery);
  const { items, total } = extractListAndTotal(resQuery);
  const sortedList = sortSubjectList(items as BilSubjectApi.Subject[]);

  return {
    dataTable: table,
    list: sortedList,
    total,
  };
}

export async function getSubject(id: string) {
  const table = createSubjectTable();
  table.Filter = cond(SUBJECT_PK, 'equal', id);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function getSubjectByNumber(subjectNumber: string) {
  const normalizedNumber = normalizeSubjectNumber(subjectNumber);
  if (!normalizedNumber) return null;

  const table = createSubjectTable();
  table.Filter = cond('subject_number', 'equal', normalizedNumber);

  const queryParam = {
    Table: [table],
    PageParam: { page: 1, index: 1 },
  };
  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items[0] || null;
}

export async function getChildSubjectListByParentNumber(
  parentSubjectNumber: string,
) {
  const normalizedParentNumber = normalizeSubjectNumber(parentSubjectNumber);
  if (!normalizedParentNumber) return [] as BilSubjectApi.Subject[];

  const table = createSubjectTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('parent_subject_number', 'equal', normalizedParentNumber),
  );
  applySubjectOrder(table);

  const queryParam = {
    Table: [table],
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return sortSubjectList(items as BilSubjectApi.Subject[]);
}

export async function getVoucherDetailListByAccountCode(accountCode: string) {
  const normalizedCode = normalizeSubjectNumber(accountCode);
  if (!normalizedCode) return [] as BilSubjectApi.VoucherDetail[];

  const table = createVoucherDetailTable();
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_code', 'equal', normalizedCode),
  );

  const queryParam = {
    Table: [table],
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(res);
  const { items } = extractListAndTotal(res);
  return items as BilSubjectApi.VoucherDetail[];
}

export async function countVoucherDetailsByAccountCode(accountCode: string) {
  const list = await getVoucherDetailListByAccountCode(accountCode);
  return list.length;
}

export async function moveVoucherDetailsToSubject(params: {
  sourceAccountCode: string;
  targetAccountCode: string;
  targetAccountName: string;
}) {
  const sourceAccountCode = normalizeSubjectNumber(params?.sourceAccountCode);
  const targetAccountCode = normalizeSubjectNumber(params?.targetAccountCode);
  const targetAccountName = String(params?.targetAccountName ?? '').trim();

  if (!sourceAccountCode) throw new Error('缺少原科目编码');
  if (!targetAccountCode) throw new Error('缺少目标科目编码');
  if (!targetAccountName) throw new Error('缺少目标科目名称');

  const detailList = await getVoucherDetailListByAccountCode(sourceAccountCode);
  if (detailList.length === 0) {
    return { movedCount: 0, list: [] as BilSubjectApi.VoucherDetail[] };
  }

  const table = createVoucherDetailTable();
  const changedList = detailList
    .filter((item) => item?.rowid)
    .map((item) => ({
      rowid: item.rowid,
      account_code: targetAccountCode,
      account_name: targetAccountName,
    }));

  if (changedList.length === 0) {
    return { movedCount: 0, list: [] as BilSubjectApi.VoucherDetail[] };
  }

  const saveParam = table.getSaveParam([], changedList as any[], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  return {
    movedCount: changedList.length,
    list: changedList,
  };
}

export async function getDeleteSubjectEffect(
  id: string,
): Promise<BilSubjectApi.DeleteEffect> {
  const subject = await getSubject(id);
  if (!subject?.rowid) {
    throw new Error('未找到要删除的科目');
  }

  const parentSubjectNumber = normalizeSubjectNumber(
    subject.parent_subject_number,
  );
  const isChildSubject = !!parentSubjectNumber;
  const voucherCount = await countVoucherDetailsByAccountCode(
    String(subject.subject_number || '').trim(),
  );

  if (!isChildSubject) {
    return {
      subject,
      parentSubject: null,
      isChildSubject: false,
      isLastChild: false,
      childCountAfterDelete: 0,
      voucherCount,
      confirmMessage:
        voucherCount > 0
          ? `当前科目下有 ${voucherCount} 条凭证明细。删除后不会自动转移到其他科目，请确认是否继续删除？`
          : '确认删除该科目？',
    };
  }

  const parentSubject = await getSubjectByNumber(parentSubjectNumber);
  if (!parentSubject?.rowid) {
    throw new Error(`未找到上级科目：${parentSubjectNumber}`);
  }

  const childList =
    await getChildSubjectListByParentNumber(parentSubjectNumber);
  const remainChildren = childList.filter(
    (item) => String(item?.rowid || '') !== String(subject.rowid || ''),
  );
  const isLastChild = remainChildren.length === 0;

  let confirmMessage = '确认删除该下级科目？';
  if (isLastChild && voucherCount > 0) {
    confirmMessage = `当前科目是父级科目的最后一个下级，且当前科目下有 ${voucherCount} 条凭证明细。删除后，系统会自动将这些凭证明细转移到父级科目，并将父级科目转为末级科目。是否继续？`;
  } else if (isLastChild) {
    confirmMessage =
      '当前科目是父级科目的最后一个下级。删除后，系统会自动将父级科目转为末级科目。是否继续？';
  } else if (voucherCount > 0) {
    confirmMessage = `当前科目下有 ${voucherCount} 条凭证明细。删除后不会自动转移到其他科目，请确认是否继续删除？`;
  }

  return {
    subject,
    parentSubject,
    isChildSubject: true,
    isLastChild,
    childCountAfterDelete: remainChildren.length,
    voucherCount,
    confirmMessage,
  };
}

export async function createSubject(data: BilSubjectApi.Subject) {
  assertSubjectNumberAllowed(data);
  await ensureParentNotLeaf(data);

  const table = createSubjectTable();
  const currentAccountSetId = String(getStoredAccountSetId() || '').trim();

  const payload: any = {
    ...data,
    rowid: data.rowid || generateUUID(),
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
    subject_state: data?.subject_state ?? 1,
    is_leaf_subject: data?.is_leaf_subject ?? 1,
    parent_subject_number: normalizeNullableSubjectNumber(
      data?.parent_subject_number,
    ),
    subject_type: normalizeSubjectType(data?.subject_type),
    subject_number: normalizeSubjectNumber(data?.subject_number),
    account_id:
      String(data?.account_id ?? '').trim() || currentAccountSetId || undefined,
    account_set_id:
      String(data?.account_set_id ?? '').trim() ||
      currentAccountSetId ||
      undefined,
  };

  const saveParam = table.getSaveParam([payload], [], []);
  const res = await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
  return {
    ...(res as any),
    rowid: payload.rowid,
    data: payload,
  };
}

export async function updateSubject(data: BilSubjectApi.Subject) {
  if (!data.rowid) throw new Error('缺少 rowid');

  if (data.subject_number !== undefined) {
    assertSubjectNumberAllowed(data);
  }

  const table = createSubjectTable();
  const currentAccountSetId = String(getStoredAccountSetId() || '').trim();

  const payload: any = {
    ...data,
    lingma_sys_is_delete: data?.lingma_sys_is_delete ?? 0,
  };

  if (payload.subject_number !== undefined) {
    payload.subject_number = normalizeSubjectNumber(payload.subject_number);
  }
  if (payload.parent_subject_number !== undefined) {
    payload.parent_subject_number = normalizeNullableSubjectNumber(
      payload.parent_subject_number,
    );
  }
  if (payload.subject_type !== undefined) {
    payload.subject_type = normalizeSubjectType(payload.subject_type);
  }
  if (payload.account_id === undefined && currentAccountSetId) {
    payload.account_id = currentAccountSetId;
  }
  if (payload.account_set_id === undefined && currentAccountSetId) {
    payload.account_set_id = currentAccountSetId;
  }

  const saveParam = table.getSaveParam([], [payload], []);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });
}

export async function updateSubjectState(id: string, state: number) {
  return await updateSubject({ rowid: id, subject_state: state });
}

async function softDeleteSubject(id: string) {
  return await updateSubject({ rowid: id, lingma_sys_is_delete: 1 });
}

export async function deleteSubject(id: string) {
  const effect = await getDeleteSubjectEffect(id);

  let movedCount = 0;
  let parentBecameLeaf = false;

  if (effect.isLastChild && effect.parentSubject?.rowid) {
    if (effect.voucherCount > 0) {
      const moveRes = await moveVoucherDetailsToSubject({
        sourceAccountCode: String(effect.subject.subject_number || '').trim(),
        targetAccountCode: String(
          effect.parentSubject.subject_number || '',
        ).trim(),
        targetAccountName: String(
          effect.parentSubject.subject_name || '',
        ).trim(),
      });
      movedCount = Number(moveRes?.movedCount || 0);
    }

    await updateSubject({
      rowid: effect.parentSubject.rowid,
      is_leaf_subject: 1,
    });
    parentBecameLeaf = true;
  }

  await softDeleteSubject(id);

  return {
    movedCount,
    parentBecameLeaf,
    effect,
  };
}

export async function initializeCurrentAccountSubjects() {
  const accountSet = await getCurrentAccountSet();
  const accountSetId = String(
    accountSet.account_set_id || accountSet.rowid || '',
  ).trim();
  const accountId = String(accountSet.rowid || '').trim();

  const existing = await getAllSubjectList({
    account_id: accountId || undefined,
    lingma_sys_is_delete: 0,
    pageNo: 1,
    page: 0,
  });

  if (Number(existing?.total || 0) > 0) {
    throw new Error('当前账套已存在科目数据，请勿重复初始化');
  }

  const templateList = await getSubjectTemplateList();
  if (templateList.length === 0) {
    throw new Error('Bil_Subject_Template 没有可复制的数据，无法初始化科目');
  }

  const addedList = buildInitializedSubjectList(templateList, accountSet);
  const table = createSubjectTable();
  const saveParam = table.getSaveParam(addedList as any[], [], []);
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  return {
    accountSetId,
    accountId,
    addedCount: addedList.length,
  };
}

export async function resetCurrentAccountSubjectsToTemplate() {
  const accountSet = await getCurrentAccountSet();
  const accountSetId = String(
    accountSet.account_set_id || accountSet.rowid || '',
  ).trim();
  const accountId = String(accountSet.rowid || '').trim();

  if (!accountId) {
    throw new Error('缺少账套ID，无法恢复默认科目');
  }

  const [templateList, currentRes] = await Promise.all([
    getSubjectTemplateList(),
    getAllSubjectList({
      account_id: accountId,
      pageNo: 1,
      page: 0,
    }),
  ]);

  if (templateList.length === 0) {
    throw new Error('Bil_Subject_Template 没有可复制的数据，无法恢复默认科目');
  }

  const currentSubjectGroups = new Map<string, BilSubjectApi.Subject[]>();

  for (const item of currentRes.list || []) {
    const subjectNumber = normalizeSubjectNumber(item.subject_number);
    if (!subjectNumber) continue;
    const group = currentSubjectGroups.get(subjectNumber) || [];
    group.push(item);
    currentSubjectGroups.set(subjectNumber, group);
  }

  const addedList: BilSubjectApi.Subject[] = [];
  const changedList: BilSubjectApi.Subject[] = [];
  const restoredRowIds = new Set<string>();

  for (const template of templateList) {
    const subjectNumber = normalizeSubjectNumber(template.subject_number);
    if (!subjectNumber) continue;

    const currentGroup = currentSubjectGroups.get(subjectNumber) || [];
    const current =
      currentGroup.find(
        (item) => Number(item?.lingma_sys_is_delete ?? 0) !== 1,
      ) || currentGroup[0];

    const payload = {
      createuser: template.createuser,
      createtime: template.createtime,
      updateuser: template.updateuser,
      updatetime: template.updatetime,
      wfid: template.wfid,
      flowstate: template.flowstate,
      ReportID: template.ReportID,
      description: template.description,
      lingma_sys_is_delete: 0,
      subject_state: template.subject_state ?? 1,
      is_leaf_subject: template.is_leaf_subject ?? 1,
      parent_subject_number: normalizeNullableSubjectNumber(
        template.parent_subject_number,
      ),
      balance_direction: template.balance_direction,
      subject_type: normalizeSubjectType(template.subject_type),
      subject_name: template.subject_name,
      subject_number: subjectNumber,
      account_id: accountId,
      account_set_id: accountSetId,
      lingma_sys_ent: template.lingma_sys_ent || accountSet.lingma_sys_ent,
      auxiliary_accounting: template.auxiliary_accounting,
    };

    if (current?.rowid) {
      const rowid = String(current.rowid);
      changedList.push({
        rowid,
        ...payload,
      });
      restoredRowIds.add(rowid);
    } else {
      addedList.push({
        rowid: generateUUID(),
        ...payload,
      });
    }
  }

  const deletedList = (currentRes.list || [])
    .filter((item) => {
      const rowid = String(item?.rowid || '');
      return (
        rowid &&
        Number(item?.lingma_sys_is_delete ?? 0) !== 1 &&
        !restoredRowIds.has(rowid)
      );
    })
    .map((item) => ({
      rowid: item.rowid,
      lingma_sys_is_delete: 1,
      account_id: accountId,
      account_set_id: accountSetId,
    }));

  const table = createSubjectTable();
  const saveParam = table.getSaveParam(
    addedList as any[],
    [...changedList, ...deletedList] as any[],
    [],
  );
  await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
  });

  return {
    accountSetId,
    accountId,
    addedCount: addedList.length,
    deletedCount: deletedList.length,
    restoredCount: changedList.length,
    templateCount: templateList.length,
  };
}


interface FinanceInitializationTableConfig {
  label: string;
  modelId: string;
  tableName: string;
  primaryKey: string;
  type?: string;
}

interface FinanceInitializationResultItem {
  label: string;
  tableName: string;
  affectedCount: number;
  action: 'reset_amount' | 'delete';
}

const VOUCHER_MAIN_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_MAIN_TABLE = 'Bil_Voucher_Main';
const VOUCHER_DETAIL_AUX_MODEL_ID = '90818FF13C82F9290207BAC312F04867';
const VOUCHER_DETAIL_AUX_TABLE = 'Bil_Voucher_Detail_Aux';

const SUBJECT_OPENING_MODEL_ID = 'E0602184B0D95667BC795AB2F41D814C';
const SUBJECT_OPENING_TABLE = 'Bil_Subject_Opening';

const INIT_BUSINESS_MODEL_ID = 'A6C4A7FF1FA2802CE1D15D6C51E5E2F4';
const INIT_BUSINESS_TABLE = 'Bil_Init_Business';

const FUNDS_FORM_KEY = 'DC8DD8FFB2E2DFFA4F36BEBB20D72846';
const FUNDS_ACCOUNT_TABLE = 'Bil_Funds_Account';
const BANK_JOURNAL_TABLE = 'Bil_Bank_Journal';

const ASSET_FORM_KEY = 'C9FCC66011786A6ACDEAF1BFD3631E31';
const ASSET_TABLE = 'Bil_Asset';
const ASSET_CHANGE_TABLE = 'Bil_Asset_Change';
const ASSET_DEPRECIATION_TABLE = 'Bil_Asset_Depreciation';

const INVOICE_MODEL_ID = 'B6E42E3BE77E83A2D08306F0775F64B7';
const INVOICE_INFO_TABLE = 'Bil_Invoice_Info';
const INVOICE_DETAIL_TABLE = 'Bil_Invoice_Detail';

const PAYMENT_APPLY_MODEL_ID = '869CE3A9780CEC1BA75E9193D9C4EC33';
const PAYMENT_APPLY_TABLE = 'Bil_Payment_Apply';

const PAYMENT_DETAIL_MODEL_ID = '55EF587C216C3D9B6FCF8F2C5BC40086';
const PAYMENT_DETAIL_TABLE = 'Bil_Payment_Document_Detail';

const COLLECTION_SUBMIT_MODEL_ID = '33B22E86D2F2B11CFDCBBD786A00058E';
const COLLECTION_SUBMIT_TABLE = 'Bil_Collection_Submit';

const EXPENSE_REGIST_MODEL_ID = '60A9BA04CB9C182DA2D5433235C13A07';
const EXPENSE_REGIST_TABLE = 'Bil_Expense_Regist';

const INCOME_SETTLEMENT_MODEL_ID = '0FDA7AC1358501C3456DD9ABDC97C642';
const INCOME_SETTLEMENT_TABLE = 'Bil_Income_Settlement';

const CAPITAL_ACCOUNT_TABLE = 'Bil_Capital_Account';
const CAPITAL_TRANSFER_TABLE = 'Bil_Capital_Transfer';

const FINANCE_INIT_DELETE_TABLES: FinanceInitializationTableConfig[] = [
  { label: '凭证明细辅助核算', modelId: VOUCHER_DETAIL_AUX_MODEL_ID, tableName: VOUCHER_DETAIL_AUX_TABLE, primaryKey: 'rowid' },
  { label: '凭证明细', modelId: VOUCHER_DETAIL_MODEL_ID, tableName: VOUCHER_DETAIL_TABLE, primaryKey: 'rowid' },
  { label: '凭证主表', modelId: VOUCHER_MAIN_MODEL_ID, tableName: VOUCHER_MAIN_TABLE, primaryKey: 'rowid' },
  { label: '科目期初', modelId: SUBJECT_OPENING_MODEL_ID, tableName: SUBJECT_OPENING_TABLE, primaryKey: 'rowid' },
  { label: '业务期初', modelId: INIT_BUSINESS_MODEL_ID, tableName: INIT_BUSINESS_TABLE, primaryKey: 'id' },
  { label: '银行日记账', modelId: FUNDS_FORM_KEY, tableName: BANK_JOURNAL_TABLE, primaryKey: 'id', type: '数据库表' },
  { label: '资金调拨', modelId: FUNDS_FORM_KEY, tableName: CAPITAL_TRANSFER_TABLE, primaryKey: 'rowid', type: '数据库表' },
  { label: '资产卡片', modelId: ASSET_FORM_KEY, tableName: ASSET_TABLE, primaryKey: 'id', type: '数据库表' },
  { label: '资产变更', modelId: ASSET_FORM_KEY, tableName: ASSET_CHANGE_TABLE, primaryKey: 'id', type: '数据库表' },
  { label: '资产折旧', modelId: ASSET_FORM_KEY, tableName: ASSET_DEPRECIATION_TABLE, primaryKey: 'id', type: '数据库表' },
  { label: '发票主表', modelId: INVOICE_MODEL_ID, tableName: INVOICE_INFO_TABLE, primaryKey: 'rowid' },
  { label: '发票明细', modelId: INVOICE_MODEL_ID, tableName: INVOICE_DETAIL_TABLE, primaryKey: 'rowid' },
  { label: '付款申请', modelId: PAYMENT_APPLY_MODEL_ID, tableName: PAYMENT_APPLY_TABLE, primaryKey: 'rowid' },
  { label: '付款单据明细', modelId: PAYMENT_DETAIL_MODEL_ID, tableName: PAYMENT_DETAIL_TABLE, primaryKey: 'rowid' },
  { label: '收款登记', modelId: COLLECTION_SUBMIT_MODEL_ID, tableName: COLLECTION_SUBMIT_TABLE, primaryKey: 'rowid' },
  { label: '费用登记', modelId: EXPENSE_REGIST_MODEL_ID, tableName: EXPENSE_REGIST_TABLE, primaryKey: 'rowid' },
  { label: '收入结算', modelId: INCOME_SETTLEMENT_MODEL_ID, tableName: INCOME_SETTLEMENT_TABLE, primaryKey: 'rowid' },
];

const FINANCE_INIT_RESET_AMOUNT_TABLES: FinanceInitializationTableConfig[] = [
  { label: '资金账户', modelId: FUNDS_FORM_KEY, tableName: FUNDS_ACCOUNT_TABLE, primaryKey: 'id', type: '数据库表' },
  { label: '旧资金账户', modelId: FUNDS_FORM_KEY, tableName: CAPITAL_ACCOUNT_TABLE, primaryKey: 'rowid', type: '数据库表' },
];

function createInitializationTable(config: FinanceInitializationTableConfig) {
  const table = createFinanceDataTable(
    config.modelId,
    config.tableName,
    SUBJECT_DB,
    config.primaryKey,
  );
  if (config.type) table.Type = config.type;
  return table;
}

function getRowPrimaryKey(row: Record<string, any>, primaryKey: string) {
  return String(
    row?.[primaryKey] || row?.rowid || row?.row_id || row?.id || row?.rowId || '',
  ).trim();
}

function extractRawItems(raw: any) {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  return Array.isArray(resultData?.Items) ? resultData.Items : [];
}

async function getCurrentAccountSetActiveRows(
  config: FinanceInitializationTableConfig,
  accountSetId: string,
) {
  const table = createInitializationTable(config);
  table.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('account_set_id', 'equal', accountSetId),
  );
  table.Fields = [];

  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 0, index: 1 } },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );
  table.execQueryResult(res);
  return extractRawItems(res);
}

async function buildDeleteCurrentAccountSetRowsParam(
  config: FinanceInitializationTableConfig,
  accountSetId: string,
) {
  const rows = await getCurrentAccountSetActiveRows(config, accountSetId);
  const deleted = rows
    .map((row: Record<string, any>) => {
      const primaryKey = getRowPrimaryKey(row, config.primaryKey);
      if (!primaryKey) return null;
      const payload: Record<string, any> = {
        [config.primaryKey]: primaryKey,
      };
      if (row?.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
      return payload;
    })
    .filter(Boolean) as Record<string, any>[];

  const table = createInitializationTable(config);
  const saveParam =
    deleted.length > 0 ? table.getSaveParam([], [], deleted) : [];

  return {
    table,
    saveParam,
    result: {
      label: config.label,
      tableName: config.tableName,
      affectedCount: deleted.length,
      action: 'delete' as const,
    },
  };
}

async function deleteCurrentAccountSetRowsBatch(
  configs: FinanceInitializationTableConfig[],
  accountSetId: string,
): Promise<FinanceInitializationResultItem[]> {
  const builtList = [];
  for (const config of configs) {
    builtList.push(await buildDeleteCurrentAccountSetRowsParam(config, accountSetId));
  }

  const batchSaveParam = builtList.flatMap((item) => item.saveParam);
  if (batchSaveParam.length > 0) {
    const firstTable = builtList.find((item) => item.saveParam.length > 0)?.table;
    if (!firstTable) throw new Error('未找到可提交的删除表配置');
    await requestClient.post(firstTable.saveUrl, batchSaveParam, {
      headers: firstTable.getRequestHeader(),
    });
  }

  return builtList.map((item) => item.result);
}

async function resetCurrentAccountSetAmountRows(
  config: FinanceInitializationTableConfig,
  accountSetId: string,
): Promise<FinanceInitializationResultItem> {
  const rows = await getCurrentAccountSetActiveRows(config, accountSetId);
  const changed = rows
    .map((row: Record<string, any>) => {
      const primaryKey = getRowPrimaryKey(row, config.primaryKey);
      if (!primaryKey) return null;
      const payload: Record<string, any> = {
        [config.primaryKey]: primaryKey,
        initial_amount: 0,
        account_balance: 0,
      };
      if (config.tableName === CAPITAL_ACCOUNT_TABLE) {
        payload.inflow_amount = 0;
        payload.outflow_amount = 0;
      }
      if (row?.lingma_sys_key) payload.lingma_sys_key = row.lingma_sys_key;
      return payload;
    })
    .filter(Boolean) as Record<string, any>[];

  if (changed.length > 0) {
    const table = createInitializationTable(config);
    const saveParam = table.getSaveParam([], changed, []);
    await requestClient.post(table.saveUrl, saveParam, {
      headers: table.getRequestHeader(),
    });
  }

  return {
    label: config.label,
    tableName: config.tableName,
    affectedCount: changed.length,
    action: 'reset_amount',
  };
}

export async function reinitializeCurrentFinanceAccountSet() {
  const accountSet = await getCurrentAccountSet();
  const accountSetId = String(
    accountSet.account_set_id || accountSet.rowid || '',
  ).trim();
  const accountId = String(accountSet.rowid || '').trim();

  if (!accountId) {
    throw new Error('缺少账套ID，无法重新初始化财务数据');
  }

  const deletedTables = await deleteCurrentAccountSetRowsBatch(
    FINANCE_INIT_DELETE_TABLES,
    accountSetId,
  );

  const resetAmountTables: FinanceInitializationResultItem[] = [];
  for (const config of FINANCE_INIT_RESET_AMOUNT_TABLES) {
    resetAmountTables.push(await resetCurrentAccountSetAmountRows(config, accountSetId));
  }

  const subjectResult = await resetCurrentAccountSubjectsToTemplate();
  const departmentResult = await initializeFinanceAuxDepartmentsFromSystemDept();

  return {
    accountSetId,
    accountId,
    deletedTables,
    resetAmountTables,
    subjectResult,
    departmentResult,
    deletedCount: deletedTables.reduce(
      (sum, item) => sum + Number(item.affectedCount || 0),
      0,
    ),
    resetAmountCount: resetAmountTables.reduce(
      (sum, item) => sum + Number(item.affectedCount || 0),
      0,
    ),
  };
}


const SUBJECT_TEMPLATE_FIELDS = [
  { key: 'subject_number', title: '科目编码' },
  { key: 'subject_name', title: '科目名称' },
  { key: 'subject_type_label', title: '类别' },
  { key: 'balance_direction_label', title: '余额方向' },
  { key: 'quantity_accounting', title: '数量核算' },
  { key: 'auxiliary_accounting_label', title: '辅助核算' },
  { key: 'auxiliary_required_label', title: '是否必录' },
  { key: 'foreign_currency_accounting', title: '外币核算' },
  { key: 'ending_exchange_adjustment', title: '期末调汇' },
] as const;

const SUBJECT_AUXILIARY_OPTIONS = [
  { label: '往来单位', value: 'partner' },
  { label: '项目', value: 'project' },
  { label: '部门', value: 'department' },
  { label: '职员', value: 'staff' },
  { label: '产品', value: 'product' },
];

function sanitizeSubjectFileNamePart(value: unknown) {
  const text = String(value ?? '').trim() || '当前账套';
  return text.replace(/[\\/:*?"<>|]/g, '_');
}

export function getSubjectExportFileName() {
  const accountSetName = sanitizeSubjectFileNamePart(getStoredAccountSetName());
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return '科目表_' + accountSetName + '_' + yyyy + mm + dd + '.xlsx';
}

function splitSubjectAuxiliaryItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  return String(value ?? '')
    .split(/[,，、;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function auxiliaryAccountingText(value: unknown) {
  return splitSubjectAuxiliaryItems(value)
    .map((item) => {
      const matched = SUBJECT_AUXILIARY_OPTIONS.find(
        (option) => String(option.value).toLowerCase() === String(item).toLowerCase(),
      );
      return matched?.label || item;
    })
    .filter(Boolean)
    .join('、');
}

function auxiliaryAccountingValue(value: unknown) {
  return splitSubjectAuxiliaryItems(value)
    .map((item) => {
      const text = String(item).trim();
      const matched = SUBJECT_AUXILIARY_OPTIONS.find(
        (option) => option.label === text || String(option.value).toLowerCase() === text.toLowerCase(),
      );
      return matched?.value || text;
    })
    .filter(Boolean)
    .join(',');
}

function subjectTypeText(value: unknown) {
  const map: Record<string, string> = {
    '1': '资产类',
    '2': '负债类',
    '3': '权益类',
    '4': '成本类',
    '5': '损益类',
  };
  return map[String(value ?? '').trim()] || String(value ?? '').trim();
}

function subjectTypeValue(value: unknown) {
  const text = String(value ?? '').trim();
  const map: Record<string, string> = {
    资产类: '1',
    资产: '1',
    负债类: '2',
    负债: '2',
    权益类: '3',
    权益: '3',
    所有者权益类: '3',
    成本类: '4',
    成本: '4',
    损益类: '5',
    损益: '5',
  };
  return map[text] || text;
}

function balanceDirectionText(value: unknown) {
  const text = String(value ?? '').trim();
  if (text === '1' || text === '借' || text.toLowerCase() === 'debit') return '借';
  if (text === '2' || text === '贷' || text.toLowerCase() === 'credit') return '贷';
  return text;
}

function balanceDirectionValue(value: unknown) {
  const text = String(value ?? '').trim();
  if (text === '借' || text === '1' || text.toLowerCase() === 'debit') return '1';
  if (text === '贷' || text === '2' || text.toLowerCase() === 'credit') return '2';
  return text;
}

function normalizeExcelText(value: unknown) {
  return String(value ?? '').trim();
}

function getExcelCellText(row: ExcelJS.Row, index: number) {
  const value = row.getCell(index).value as any;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item: any) => item.text || '').join('').trim();
    }
  }
  return String(value).trim();
}

function formatSubjectTemplateText(value: unknown, shouldIndent: boolean) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return shouldIndent ? '  ' + text : text;
}

function findNearestParentSubjectNumber(subjectCode: string, allCodes: Set<string>) {
  const code = normalizeSubjectNumber(subjectCode);
  if (!code) return '';
  let parent = '';
  for (const candidate of allCodes) {
    if (!candidate || candidate === code) continue;
    if (!code.startsWith(candidate)) continue;
    if (candidate.length > parent.length) parent = candidate;
  }
  return parent;
}

function buildSubjectTreeMeta(rows: Array<Record<string, any>>) {
  const allCodes = new Set(
    rows.map((row) => normalizeSubjectNumber(row?.subject_number)).filter(Boolean),
  );
  const childCount = new Map<string, number>();
  const parentMap = new Map<string, string>();
  for (const code of allCodes) {
    const parent = findNearestParentSubjectNumber(code, allCodes);
    parentMap.set(code, parent);
    if (parent) childCount.set(parent, (childCount.get(parent) || 0) + 1);
  }
  return { childCount, parentMap };
}

function normalizeCompareValue(value: unknown) {
  return String(value ?? '').trim();
}

function hasSubjectRowDiff(current: any, next: Record<string, any>, fields: string[]) {
  return fields.some((field) => normalizeCompareValue(current?.[field]) !== normalizeCompareValue(next?.[field]));
}

function buildSubjectMapForIo(subjects: any[]) {
  const map = new Map<string, any>();
  for (const item of subjects || []) {
    const code = normalizeSubjectNumber(item?.subject_number || item?.subject_code);
    if (code) map.set(code, item);
  }
  return map;
}

function rowToSubjectTemplate(row: any) {
  const hasParent = !!String(row?.parent_subject_number || '').trim();
  const code = normalizeSubjectNumber(row?.subject_number || row?.subject_code);
  return {
    subject_number: formatSubjectTemplateText(code, hasParent),
    subject_name: formatSubjectTemplateText(row?.subject_name, hasParent),
    subject_type_label: subjectTypeText(row?.subject_type),
    balance_direction_label: balanceDirectionText(row?.balance_direction),
    quantity_accounting: '',
    auxiliary_accounting_label: auxiliaryAccountingText(row?.auxiliary_accounting),
    auxiliary_required_label: auxiliaryAccountingText(row?.auxiliary_required),
    foreign_currency_accounting: '',
    ending_exchange_adjustment: '',
  };
}

function writeSubjectTemplateSheet(workbook: ExcelJS.Workbook, rows: any[]) {
  const sheet = workbook.addWorksheet(' 科目 ');
  sheet.addRow(SUBJECT_TEMPLATE_FIELDS.map((field) => field.title));
  for (const row of rows) {
    sheet.addRow(SUBJECT_TEMPLATE_FIELDS.map((field) => row[field.key] ?? ''));
  }
  sheet.columns = [
    { key: 'subject_number', width: 22 },
    { key: 'subject_name', width: 32 },
    { key: 'subject_type_label', width: 18 },
    { key: 'balance_direction_label', width: 14 },
    { key: 'quantity_accounting', width: 14 },
    { key: 'auxiliary_accounting_label', width: 16 },
    { key: 'auxiliary_required_label', width: 14 },
    { key: 'foreign_currency_accounting', width: 14 },
    { key: 'ending_exchange_adjustment', width: 14 },
  ];
  const usedRange = sheet.getRows(1, Math.max(rows.length + 1, 1));
  usedRange?.forEach((row) => {
    row.height = 20;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: row.number === 1 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

async function workbookToSubjectBlob(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function exportSubjectExcel(params: any = {}) {
  const accountSetId = String(params?.account_id || params?.account_set_id || getStoredAccountSetId() || '').trim();
  if (!accountSetId) throw new Error('未选择当前账套，无法导出科目');
  const subjectRes = await getAllSubjectList({
    account_id: accountSetId,
    lingma_sys_is_delete: 0,
    keyword: params.keyword,
    pageNo: 1,
    page: 0,
  } as any);
  const rows = sortSubjectList(subjectRes.list || []).map(rowToSubjectTemplate);
  const workbook = new ExcelJS.Workbook();
  writeSubjectTemplateSheet(workbook, rows);
  return await workbookToSubjectBlob(workbook);
}

export async function downloadSubjectExcelTemplate(params: any = {}) {
  return await exportSubjectExcel(params);
}

export async function importSubjectExcel(file: File) {
  const accountSetId = String(getStoredAccountSetId() || '').trim();
  if (!accountSetId) throw new Error('未选择当前账套，无法导入科目');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet(' 科目 ') || workbook.getWorksheet('科目') || workbook.worksheets[0];
  if (!sheet) throw new Error('未读取到 Excel 工作表');

  const headerIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const title = String(cell.value ?? '').trim();
    if (title) headerIndex.set(title, colNumber);
  });
  const requiredHeaders = ['科目编码', '科目名称', '类别', '余额方向'];
  const missingHeaders = requiredHeaders.filter((title) => !headerIndex.has(title));
  if (missingHeaders.length > 0) throw new Error('模板缺少列：' + missingHeaders.join('、'));

  const readValue = (row: ExcelJS.Row, title: string) => {
    const col = headerIndex.get(title);
    return col ? getExcelCellText(row, col) : '';
  };

  const subjectRes = await getAllSubjectList({
    account_id: accountSetId,
    pageNo: 1,
    page: 0,
  } as any);
  const currentSubjects = subjectRes.list || [];
  const subjectMap = buildSubjectMapForIo(currentSubjects);

  const importRows: any[] = [];
  const errors: string[] = [];
  const seenCodes = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const subjectNumber = normalizeSubjectNumber(readValue(row, '科目编码'));
    if (!subjectNumber) return;
    if (seenCodes.has(subjectNumber)) {
      errors.push('第 ' + rowNumber + ' 行科目编码 ' + subjectNumber + ' 重复');
      return;
    }
    seenCodes.add(subjectNumber);
    const subjectName = normalizeExcelText(readValue(row, '科目名称'));
    const subjectType = subjectTypeValue(readValue(row, '类别'));
    const balanceDirection = balanceDirectionValue(readValue(row, '余额方向'));
    if (!subjectName) errors.push('第 ' + rowNumber + ' 行科目名称不能为空');
    if (!subjectType) errors.push('第 ' + rowNumber + ' 行类别不能为空');
    if (!balanceDirection) errors.push('第 ' + rowNumber + ' 行余额方向不能为空');
    importRows.push({
      rowNumber,
      subject_number: subjectNumber,
      subject_name: subjectName,
      subject_type: subjectType,
      balance_direction: balanceDirection,
      auxiliary_accounting: auxiliaryAccountingValue(readValue(row, '辅助核算')),
      auxiliary_required: auxiliaryAccountingValue(readValue(row, '是否必录')),
      account_id: accountSetId,
      account_set_id: accountSetId,
      lingma_sys_is_delete: 0,
      subject_state: 1,
    });
  });

  if (errors.length > 0) throw new Error(errors.slice(0, 8).join('；'));

  const mergedRows = [
    ...currentSubjects
      .filter((item: any) => normalizeSubjectNumber(item?.subject_number))
      .map((item: any) => ({ ...item, subject_number: normalizeSubjectNumber(item.subject_number) })),
    ...importRows,
  ];
  const { childCount, parentMap } = buildSubjectTreeMeta(mergedRows);
  const importRowsByCode = new Map(importRows.map((row) => [row.subject_number, row]));
  const affectedCodes = new Set<string>(importRows.map((row) => row.subject_number));
  for (const code of importRowsByCode.keys()) {
    const parent = parentMap.get(code);
    if (parent) affectedCodes.add(parent);
  }

  const addedRows: any[] = [];
  const changedRows: any[] = [];
  const skippedRows: any[] = [];
  const diffFields = [
    'subject_name',
    'subject_type',
    'balance_direction',
    'auxiliary_accounting',
    'auxiliary_required',
    'parent_subject_number',
    'is_leaf_subject',
  ];

  for (const code of affectedCodes) {
    const imported = importRowsByCode.get(code);
    const current = subjectMap.get(code);
    const payload: any = {
      ...(imported || {}),
      subject_number: code,
      parent_subject_number: parentMap.get(code) || null,
      is_leaf_subject: childCount.get(code) ? 0 : 1,
      account_id: accountSetId,
      account_set_id: accountSetId,
      lingma_sys_is_delete: 0,
      subject_state: 1,
    };

    if (!imported && current) {
      payload.subject_name = current.subject_name;
      payload.subject_type = current.subject_type;
      payload.balance_direction = current.balance_direction;
      payload.auxiliary_accounting = current.auxiliary_accounting;
      payload.auxiliary_required = current.auxiliary_required;
    }

    if (!current) {
      addedRows.push({ ...payload, rowid: generateUUID() });
      continue;
    }

    if (Number(current?.lingma_sys_is_delete ?? 0) === 1 || hasSubjectRowDiff(current, payload, diffFields)) {
      changedRows.push({ rowid: current.rowid, ...payload });
    } else if (imported) {
      skippedRows.push(payload);
    }
  }

  const sortedAddedRows = sortSubjectList(addedRows);
  const sortedChangedRows = sortSubjectList(changedRows);
  for (const row of sortedAddedRows) await createSubject(row as any);
  for (const row of sortedChangedRows) await updateSubject(row as any);

  return {
    addedCount: sortedAddedRows.length,
    changedCount: sortedChangedRows.length,
    skippedCount: skippedRows.length,
  };
}

export async function getSubjectImportSchemeDetail() {
  return await getImportSchemeDetail({
    schemeName: '科目',
    table: 'LMBill@Bil_Subject_Info',
  });
}
