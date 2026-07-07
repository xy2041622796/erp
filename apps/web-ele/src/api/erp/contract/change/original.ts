import { useUserStore } from '@vben/stores';

import { and, clientData, cond } from '#/api/qyapi';
import { getContractPage as getIncomeContractPage } from '#/api/erp/contract/income';
import { getContractPage as getOutcomeContractPage } from '#/api/erp/contract/outcome';
import { getExpenseSettlementPage } from '#/api/erp/finance/payment/settlement';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';
import { requestClient } from '#/api/request';

import { createFinanceDataTable } from '../../finance/common/account-set-scope';

const CONTRACT_BUSINESS_DB = 'LMBill';
const CONTRACT_MODEL_ID = 'A360801B9108B34DEE305B4EE18584E7';
const OUTCOME_CONTRACT_MODEL_ID = 'B1DC3404A2E11F00881224E1945BB74A';
const CHANGE_MODEL_ID = 'AAB9AE2E73CDE47D98D88AD3FA93E396';
const TERMINATION_MODEL_ID = 'AA628F0B5C955D672C0F2CDD4B690AB0';
const CONTRACT_PLAN_TABLE = 'Bil_Contract_settlement_plan';
const CONTRACT_PLAN_PK = 'rowid';

type ContractCategory = 0 | 1;
export type ChangeType = '金额变更' | '付款明细变更' | '收款计划变更' | '付款计划变更' | '期限变更' | '条款变更' | '综合变更';
export type TerminationType = '正常完结' | '提前终止' | '协商解除';

export interface PaymentTerm {
  id: string;
  type: string;
  ratio: number;
  amount: number;
  condition: string;
  days: number;
}

function createChangeTable(modelId = CHANGE_MODEL_ID) {
  return createFinanceDataTable(modelId, 'contract_changes', CONTRACT_BUSINESS_DB, 'id');
}

function getContractModelId(contractCategory?: ContractCategory) {
  return normalizeContractCategory(contractCategory) === 1 ? OUTCOME_CONTRACT_MODEL_ID : CONTRACT_MODEL_ID;
}

function createContractTable(contractCategory?: ContractCategory) {
  return createFinanceDataTable(getContractModelId(contractCategory), 'Bil_contract_info', CONTRACT_BUSINESS_DB, 'rowid');
}

function createChangeApplyContractTable() {
  return createFinanceDataTable(CHANGE_MODEL_ID, 'Bil_contract_info', CONTRACT_BUSINESS_DB, 'rowid');
}

function createContractPlanTable(contractCategory?: ContractCategory) {
  return createFinanceDataTable(getContractModelId(contractCategory), CONTRACT_PLAN_TABLE, CONTRACT_BUSINESS_DB, CONTRACT_PLAN_PK);
}

function createChangeApplyPlanTable() {
  return createFinanceDataTable(CHANGE_MODEL_ID, CONTRACT_PLAN_TABLE, CONTRACT_BUSINESS_DB, CONTRACT_PLAN_PK);
}

function uuid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function nowText() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseJson(value: any) {
  try {
    if (typeof value === 'string' && value.trim().startsWith('{')) return JSON.parse(value);
    if (value && typeof value === 'object') return value;
  } catch {}
  return {};
}

function formatDate(value: any) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0] || '';
  } catch {
    return String(value);
  }
}

function normalizeContractCategory(value: any): ContractCategory | undefined {
  const n = Number(value);
  if (n === 0) return 0;
  if (n === 1) return 1;
  return undefined;
}

function currentUserId() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  return String(info.id ?? info.ROWID ?? info.userId ?? info.userid ?? 'system');
}

function currentUserName() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  return String(info.nickname ?? info.username ?? info.name ?? info.realName ?? '');
}

function generateChangeNo(prefix: 'CH' | 'JX') {
  const now = new Date();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${now.getFullYear()}-${random}`;
}

async function queryContractRows(contractCategory: ContractCategory) {
  const query = contractCategory === 1 ? getOutcomeContractPage : getIncomeContractPage;
  const res = await query({ pageNo: 1, page: 0 });
  return (((res as any)?.list ?? []) as any[]).map((row: any) => ({
    ...row,
    contract_category: contractCategory,
    __contract_category: contractCategory,
  }));
}

async function getAllOurContracts(contractCategory?: ContractCategory) {
  const cat = normalizeContractCategory(contractCategory);
  if (cat !== undefined) return await queryContractRows(cat);

  const [incomeRows, outcomeRows] = await Promise.all([
    queryContractRows(0),
    queryContractRows(1),
  ]);
  return [...incomeRows, ...outcomeRows];
}

async function getOurContractById(contractId: string, contractCategory?: ContractCategory) {
  const id = String(contractId || '').trim();
  if (!id) return undefined;
  const rows = await getAllOurContracts(contractCategory);
  return rows.find((row: any) => String(row?.rowid ?? row?.row_id ?? row?.id ?? '').trim() === id);
}

async function getOurContractMap(refs: any[]) {
  const rows = await getAllOurContracts();
  const map: Record<string, any> = {};
  const idSet = new Set(
    (refs || [])
      .map((ref: any) => String(typeof ref === 'object' ? ref?.id : ref || '').trim())
      .filter(Boolean),
  );

  rows.forEach((row: any) => {
    const id = String(row?.rowid ?? row?.row_id ?? row?.id ?? '').trim();
    if (!id || (idSet.size > 0 && !idSet.has(id))) return;
    const cat = normalizeContractCategory(row?.__contract_category ?? row?.contract_category) ?? 0;
    map[id] = map[id] || row;
    map[`${cat}:${id}`] = row;
  });
  return map;
}

export async function getOurContractsForChange(contractCategory?: ContractCategory) {
  return (await getAllOurContracts(contractCategory)).map((row: any) => {
    const cat = normalizeContractCategory(row?.__contract_category ?? row?.contract_category) ?? 0;
    return {
      id: String(row?.rowid ?? row?.row_id ?? row?.id ?? ''),
      contract_category: cat,
      contract_no: row?.contract_no,
      contract_name: row?.contract_name ?? row?.name,
      client_name: row?.client_name ?? row?.customerName ?? row?.contract_party_b,
      amount: Number(row?.contract_total_amount ?? row?.contract_amount ?? 0),
      start_date: formatDate(row?.contract_start_date ?? row?.start_date),
      end_date: formatDate(row?.contract_end_date ?? row?.end_date),
      account_set_id: row?.account_set_id,
      lingma_sys_ent: row?.lingma_sys_ent,
    };
  }).filter((row: any) => row.id);
}

function getAccountFields(contract: any) {
  return {
    account_set_id: contract?.account_set_id ?? null,
    lingma_sys_ent: contract?.lingma_sys_ent ?? 'NewApp',
  };
}

function mapContractFields(item: any, contract: any) {
  const cat = normalizeContractCategory(item?.contract_category ?? contract?.__contract_category ?? contract?.contract_category) ?? 0;
  return {
    ...item,
    contract_category: cat,
    contract_no: contract?.contract_no || '',
    contract_name: contract?.contract_name || contract?.name || '',
    client_name: contract?.client_name || contract?.customerName || contract?.contract_party_b || '',
    contract_amount: Number(contract?.contract_total_amount ?? contract?.contract_amount ?? 0),
    start_date: formatDate(contract?.contract_start_date ?? contract?.start_date),
    end_date: formatDate(contract?.contract_end_date ?? contract?.end_date),
    account_set_id: item?.account_set_id ?? contract?.account_set_id,
    ConState: contract?.ConState,
  };
}

async function updateContractMain(contractId: string, patch: Record<string, any>, contractCategory?: ContractCategory) {
  const id = String(contractId || '').trim();
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!id || entries.length === 0) return;
  const table = createContractTable(contractCategory);
  const row = { rowid: id, ...Object.fromEntries(entries), updatetime: nowText() };
  return requestClient.post(table.saveUrl, table.getSaveParam([], [row], []), { headers: table.getRequestHeader() });
}

async function updateContractMainByChange(contractId: string, patch: Record<string, any>) {
  const id = String(contractId || '').trim();
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!id || entries.length === 0) return;
  const table = createChangeApplyContractTable();
  const row = { rowid: id, ...Object.fromEntries(entries), updatetime: nowText() };
  return requestClient.post(table.saveUrl, table.getSaveParam([], [row], []), { headers: table.getRequestHeader() });
}

function normalizePlanRow(row: any, contractId: string, index = 0) {
  return {
    rowid: String(row?.rowid || row?.row_id || row?.id || uuid()),
    contract_id: contractId,
    plan_period: String(row?.plan_period || row?.term || index + 1).replace(/[^0-9]/g, '') || String(index + 1),
    plan_date: formatDate(row?.plan_date ?? row?.planDate),
    plan_amount: Number(row?.plan_amount ?? row?.planAmount ?? 0) || 0,
    settlement_type: Number(row?.settlement_type ?? 0),
    is_auto: Number(row?.is_auto ?? (row?.autoSettle ? 1 : 0)) || 0,
    is_overdue: Number(row?.is_overdue ?? 0) || 0,
    remark: String(row?.remark ?? ''),
    lingma_sys_is_delete: Number(row?.lingma_sys_is_delete ?? 0),
  };
}

async function getContractPlanRows(contractId: string, contractCategory: ContractCategory) {
  const table = createContractPlanTable(contractCategory);
  table.Filter = and(cond('contract_id', 'equal', contractId), cond('lingma_sys_is_delete', 'notequal', 1));
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 0, index: 1 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  return Array.isArray(data?.Items) ? data.Items : [];
}

async function applyPaymentChangeToContract(contractId: string, contractCategory: ContractCategory, paymentChange: any) {
  if (!paymentChange || !Array.isArray(paymentChange.after) || paymentChange.after.length === 0) return;

  const table = createContractPlanTable(contractCategory);
  const oldRows = await getContractPlanRows(contractId, contractCategory);
  const nextRows = paymentChange.after.map((row: any, index: number) => normalizePlanRow(row, contractId, index));
  const deleteRows = (oldRows || []).map((old: any) => ({ rowid: old.rowid ?? old.row_id }));
  const insertRows = nextRows.map((row: any) => ({ ...row, rowid: uuid() }));

  const reqList = table.getSaveParam(insertRows, [], deleteRows);
  if (!reqList.length) return;
  return requestClient.post(table.saveUrl, reqList, { headers: table.getRequestHeader() });
}

function getAmountValue(amountChange: any, key: string, fallbackKey?: string) {
  const raw = amountChange?.[key] ?? (fallbackKey ? amountChange?.[fallbackKey] : undefined);
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

async function applyChangeToContract(contractId: string, changes: any, contractCategory: ContractCategory) {
  const patch: Record<string, any> = {};
  const amount = changes?.amount_change || {};
  const afterContractAmount = getAmountValue(amount, 'after_contract_amount', 'after');
  const afterTaxRate = getAmountValue(amount, 'after_contract_tax_rate');
  const afterTaxAmount = getAmountValue(amount, 'after_contract_tax_amount');
  const afterTotalAmount = getAmountValue(amount, 'after_contract_total_amount', 'after');
  if (afterContractAmount !== undefined) patch.contract_amount = afterContractAmount;
  if (afterTaxRate !== undefined) patch.contract_tax_rate = afterTaxRate;
  if (afterTaxAmount !== undefined) patch.contract_tax_amount = afterTaxAmount;
  if (afterTotalAmount !== undefined) patch.contract_total_amount = afterTotalAmount;
  if (changes?.period_change?.after_start) patch.contract_start_date = changes.period_change.after_start;
  if (changes?.period_change?.after_end) patch.contract_end_date = changes.period_change.after_end;
  await updateContractMain(contractId, patch, contractCategory);
  await applyPaymentChangeToContract(contractId, contractCategory, changes?.payment_change);
}

async function completeContract(contractId: string, contractCategory: ContractCategory = 0) {
  await updateContractMain(contractId, { ConState: 3 }, contractCategory);
}

function calcChangeScope(changes: any) {
  const scope: string[] = [];
  const amount = changes?.amount_change;
  if (amount && (
    Number(amount.after_contract_amount ?? amount.after) !== Number(amount.before_contract_amount ?? amount.before) ||
    Number(amount.after_contract_tax_rate ?? 0) !== Number(amount.before_contract_tax_rate ?? 0) ||
    Number(amount.after_contract_tax_amount ?? 0) !== Number(amount.before_contract_tax_amount ?? 0) ||
    Number(amount.after_contract_total_amount ?? amount.after) !== Number(amount.before_contract_total_amount ?? amount.before)
  )) scope.push('amount');
  const period = changes?.period_change;
  if (period && (period.before_start !== period.after_start || period.before_end !== period.after_end)) scope.push('period');
  const terms = changes?.terms_change;
  if (terms && (String(terms.before || '') !== String(terms.after || ''))) scope.push('terms');
  const payment = changes?.payment_change;
  if (payment && Array.isArray(payment.after) && payment.after.length > 0) scope.push('payment');
  return scope.join(',');
}

async function updateChangeApplyStatus(changeId: string, applyStatus: 'pending' | 'applied' | 'failed') {
  const table = createChangeTable(CHANGE_MODEL_ID);
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [{ id: changeId, apply_status: applyStatus, updated_at: nowText(), updatetime: nowText() }], []),
    { headers: table.getRequestHeader() },
  );
}

async function getIncomePaymentSummaryMap(contractIds: string[]) {
  const ids = Array.from(new Set(contractIds.filter(Boolean).map(String)));
  const map: Record<string, { paid: number; invoice: number }> = {};
  ids.forEach((id) => (map[id] = { paid: 0, invoice: 0 }));
  if (ids.length === 0) return map;

  const res = await getIncomeSettlementPage({ pageNo: 1, page: 0 });
  const rows = (((res as any)?.list ?? []) as any[]).filter((row) => ids.includes(String(row?.contract_id ?? '')));
  rows.forEach((row: any) => {
    const id = String(row?.contract_id || '');
    if (!map[id]) map[id] = { paid: 0, invoice: 0 };
    map[id].paid += Number(row?.receive_amount ?? row?.total_amount ?? row?.amount ?? 0);
    map[id].invoice += Number(row?.ticket_amount ?? 0);
  });
  return map;
}

async function getExpensePaymentSummaryMap(contractIds: string[]) {
  const ids = Array.from(new Set(contractIds.filter(Boolean).map(String)));
  const map: Record<string, { paid: number; invoice: number }> = {};
  ids.forEach((id) => (map[id] = { paid: 0, invoice: 0 }));
  if (ids.length === 0) return map;

  const res = await getExpenseSettlementPage({ pageNo: 1, page: 0 });
  const rows = (((res as any)?.list ?? []) as any[]).filter((row) => ids.includes(String(row?.contract_id ?? '')));
  rows.forEach((row: any) => {
    const id = String(row?.contract_id || '');
    if (!map[id]) map[id] = { paid: 0, invoice: 0 };
    map[id].paid += Number(row?.pay_amount ?? row?.total_amount ?? row?.amount ?? 0);
    map[id].invoice += Number(row?.ticket_amount ?? 0);
  });
  return map;
}

async function getSettlementSummaryMap(refs: Array<{ contract_id: string; contract_category: ContractCategory }>) {
  const incomeIds = refs.filter((ref) => ref.contract_category === 0).map((ref) => ref.contract_id);
  const expenseIds = refs.filter((ref) => ref.contract_category === 1).map((ref) => ref.contract_id);
  const [incomeMap, expenseMap] = await Promise.all([
    getIncomePaymentSummaryMap(incomeIds),
    getExpensePaymentSummaryMap(expenseIds),
  ]);
  return { incomeMap, expenseMap };
}

export async function getChangePage(params: any = {}) {
  const table = createChangeTable(CHANGE_MODEL_ID);
  const filters: any[] = [cond('type', 'equal', 'modify')];
  const contractCategory = normalizeContractCategory(params.contract_category);
  if (contractCategory !== undefined) filters.push(cond('contract_category', 'equal', contractCategory));
  if (params.change_type && params.change_type !== 'all') filters.push(cond('changes', 'like', `%\"change_type\":\"${params.change_type}\"%`));
  table.Filter = filters.length === 1 ? filters[0] : and(...filters);

  const queryParam = { Table: [table], PageParam: { size: params.page || 20, index: params.pageNo || 1 } };
  const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  const rows = Array.isArray(data?.Items) ? data.Items : [];
  const contractRefs = rows.map((r: any) => ({ id: r.contract_id, contract_category: normalizeContractCategory(r.contract_category) ?? 0 }));
  const contracts = await getOurContractMap(contractRefs);

  const list = rows.map((row: any) => {
    const changes = parseJson(row.changes);
    const rowCategory = normalizeContractCategory(row.contract_category) ?? 0;
    const contractId = String(row.contract_id || '').trim();
    const contract = contracts[`${rowCategory}:${contractId}`] || contracts[contractId];
    return mapContractFields({
      ...row,
      contract_category: rowCategory,
      change_type: changes.change_type || '综合变更',
      change_reason: row.reason || '',
      apply_date: formatDate(row.created_at),
      applicant_name: row.createuser || currentUserName(),
      version: changes.version || 2,
      amount_change_detail: changes.amount_change || { before: 0, after: 0 },
      payment_change: changes.payment_change || { before: [], after: [] },
      period_change: changes.period_change || { before_start: '', before_end: '', after_start: '', after_end: '' },
      terms_change: changes.terms_change || { before: '', after: '' },
      change_scope: row.change_scope || calcChangeScope(changes),
      apply_status: row.apply_status || '',
    }, contract);
  });

  const ret = new clientData();
  ret.dataTable = table;
  ret.list = list;
  ret.total = data?.Count || list.length;
  return ret;
}

async function saveChangePatch(changeId: string, data: any) {
  const id = String(changeId || '').trim();
  if (!id) throw new Error('缺少变更记录ID');
  const table = createChangeTable(CHANGE_MODEL_ID);
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [{ id, ...data, updated_at: nowText(), updatetime: nowText() }], []),
    { headers: table.getRequestHeader() },
  );
}

export async function deleteChangeRecord(changeId: string) {
  const id = String(changeId || '').trim();
  if (!id) throw new Error('缺少变更记录ID');
  const table = createChangeTable(CHANGE_MODEL_ID);
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [{ id, lingma_sys_is_delete: 1, updated_at: nowText(), updatetime: nowText() }], []),
    { headers: table.getRequestHeader() },
  );
}

export async function updateChangeRecord(changeId: string, data: any) {
  const contractCategory = normalizeContractCategory(data.contract_category) ?? 0;
  const changes = {
    change_type: data.change_type || '综合变更',
    version: 3,
    amount_change: data.amount_change || { before_contract_amount: 0, after_contract_amount: 0, before_contract_tax_rate: 0, after_contract_tax_rate: 0, before_contract_tax_amount: 0, after_contract_tax_amount: 0, before_contract_total_amount: 0, after_contract_total_amount: 0 },
    payment_change: data.payment_change || { before: [], after: [] },
    period_change: data.period_change || { before_start: '', before_end: '', after_start: '', after_end: '' },
    terms_change: data.terms_change || { before: '', after: '' },
  };
  return saveChangePatch(changeId, {
    contract_id: data.contract_id,
    contract_category: contractCategory,
    change_scope: data.change_scope || calcChangeScope(changes),
    reason: data.change_reason || data.reason || '',
    changes: JSON.stringify(changes),
    amount_change: Number(changes.amount_change.after_contract_total_amount ?? changes.amount_change.after ?? 0) - Number(changes.amount_change.before_contract_total_amount ?? changes.amount_change.before ?? 0),
    effective_date: data.effective_date || null,
    status: data.status || 'pending',
    apply_status: data.apply_status || 'pending',
  });
}

export async function approveChangeRecord(changeId: string) {
  return saveChangePatch(changeId, { status: 'approved' });
}

export async function createChangeRecord(data: any) {
  const table = createChangeTable(CHANGE_MODEL_ID);
  const contractCategory = normalizeContractCategory(data.contract_category) ?? 0;
  const contract = await getOurContractById(data.contract_id, contractCategory);
  const changes = {
    change_type: data.change_type || '综合变更',
    version: 3,
    amount_change: data.amount_change || { before_contract_amount: 0, after_contract_amount: 0, before_contract_tax_rate: 0, after_contract_tax_rate: 0, before_contract_tax_amount: 0, after_contract_tax_amount: 0, before_contract_total_amount: 0, after_contract_total_amount: 0 },
    payment_change: data.payment_change || { before: [], after: [] },
    period_change: data.period_change || { before_start: '', before_end: '', after_start: '', after_end: '' },
    terms_change: data.terms_change || { before: '', after: '' },
  };
  const changeId = uuid();
  const row = {
    id: changeId,
    contract_id: data.contract_id,
    contract_category: contractCategory,
    change_no: data.change_no || generateChangeNo('CH'),
    change_scope: data.change_scope || calcChangeScope(changes),
    type: 'modify',
    reason: data.change_reason || data.reason || '',
    changes: JSON.stringify(changes),
    amount_change: Number(changes.amount_change.after_contract_total_amount ?? changes.amount_change.after ?? 0) - Number(changes.amount_change.before_contract_total_amount ?? changes.amount_change.before ?? 0),
    effective_date: data.effective_date || null,
    status: data.status || 'pending',
    apply_status: 'pending',
    applicant_id: data.applicant_id || currentUserId(),
    attachments: JSON.stringify(data.attachments || []),
    created_at: nowText(),
    updated_at: nowText(),
    createuser: currentUserName(),
    createtime: nowText(),
    ...getAccountFields(contract),
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([row], [], []), { headers: table.getRequestHeader() });
}

export async function applyChangeRecord(changeId: string) {
  const id = String(changeId || '').trim();
  if (!id) throw new Error('缺少变更记录ID');
  const table = createChangeTable(CHANGE_MODEL_ID);
  table.Filter = cond('id', 'equal', id);
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { page: 1, index: 1 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  const row = Array.isArray(data?.Items) ? data.Items[0] : null;
  if (!row) throw new Error('未找到变更记录');
  if (String(row.apply_status || '') === 'applied') return row;
  if (String(row.status || '') !== 'approved') throw new Error('只有已审批的合同变更才能应用');
  const changes = parseJson(row.changes);
  const contractCategory = normalizeContractCategory(row.contract_category) ?? 0;
  const contract = await getOurContractById(String(row.contract_id || ''), contractCategory);
  if (Number(contract?.ConState) === 3) {
    throw new Error('该合同已终结，无法应用变更');
  }
  try {
    await applyChangeToContract(String(row.contract_id || ''), changes, contractCategory);
    await updateChangeApplyStatus(id, 'applied');
  } catch (error) {
    await updateChangeApplyStatus(id, 'failed');
    throw error;
  }
  return { ...row, apply_status: 'applied' };
}

export async function getTerminationPage(params: any = {}) {
  const table = createChangeTable(TERMINATION_MODEL_ID);
  const filters: any[] = [cond('type', 'equal', 'terminate')];
  const contractCategory = normalizeContractCategory(params.contract_category);
  if (contractCategory !== undefined) filters.push(cond('contract_category', 'equal', contractCategory));
  table.Filter = filters.length === 1 ? filters[0] : and(...filters);

  const queryParam = { Table: [table], PageParam: { size: params.page || 20, index: params.pageNo || 1 } };
  const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  const rows = Array.isArray(data?.Items) ? data.Items : [];
  const contractRefs = rows.map((r: any) => ({ id: r.contract_id, contract_category: normalizeContractCategory(r.contract_category) ?? 0 }));
  const contracts = await getOurContractMap(contractRefs);
  const { incomeMap, expenseMap } = await getSettlementSummaryMap(contractRefs.map((ref) => ({ contract_id: String(ref.id || ''), contract_category: ref.contract_category })));

  const list = rows.map((row: any) => {
    const changes = parseJson(row.changes);
    const rowCategory = normalizeContractCategory(row.contract_category) ?? 0;
    const contractId = String(row.contract_id || '').trim();
    const contract = contracts[`${rowCategory}:${contractId}`] || contracts[contractId];
    const contractAmount = Number(contract?.contract_total_amount ?? contract?.contract_amount ?? 0);
    const settlement = rowCategory === 1 ? (expenseMap[contractId] || { paid: 0, invoice: 0 }) : (incomeMap[contractId] || { paid: 0, invoice: 0 });
    return mapContractFields({
      ...row,
      contract_category: rowCategory,
      apply_no: row.change_no,
      actual_end_date: formatDate(row.effective_date),
      termination_type: changes.termination_type || '正常完结',
      termination_reason: row.reason || '',
      apply_date: formatDate(row.created_at),
      applicant_name: row.createuser || currentUserName(),
      archive_date: changes.archive_date || '',
      remarks: changes.remarks || '',
      paid_amount: settlement.paid,
      invoice_amount: settlement.invoice,
      unpaid_amount: contractAmount - settlement.paid,
    }, contract);
  });

  const ret = new clientData();
  ret.dataTable = table;
  ret.list = list;
  ret.total = data?.Count || list.length;
  return ret;
}

export async function createTerminationRecord(data: any) {
  const table = createChangeTable(TERMINATION_MODEL_ID);
  const contractCategory = normalizeContractCategory(data.contract_category) ?? 0;
  const contract = await getOurContractById(data.contract_id, contractCategory);
  const changes = { termination_type: data.termination_type || '正常完结', remarks: data.remarks || '' };
  const row = {
    id: uuid(),
    contract_id: data.contract_id,
    contract_category: contractCategory,
    change_no: data.apply_no || generateChangeNo('JX'),
    type: 'terminate',
    reason: data.termination_reason || data.reason || '',
    changes: JSON.stringify(changes),
    effective_date: data.actual_end_date || data.effective_date || null,
    applicant_id: data.applicant_id || currentUserId(),
    attachments: JSON.stringify(data.attachments || []),
    created_at: nowText(),
    updated_at: nowText(),
    createuser: currentUserName(),
    createtime: nowText(),
    ...getAccountFields(contract),
  };
  const res = await requestClient.post(table.saveUrl, table.getSaveParam([row], [], []), { headers: table.getRequestHeader() });
  await completeContract(data.contract_id, contractCategory);
  return res;
}

export async function getPaymentSummaryByContract(contractId: string, contractCategory: ContractCategory = 0) {
  if (contractCategory === 1) {
    const map = await getExpensePaymentSummaryMap([contractId]);
    return map[String(contractId)] || { paid: 0, invoice: 0 };
  }
  const map = await getIncomePaymentSummaryMap([contractId]);
  return map[String(contractId)] || { paid: 0, invoice: 0 };
}
