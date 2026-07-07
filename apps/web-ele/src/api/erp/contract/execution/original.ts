import { and, clientData, cond } from '#/api/qyapi';
import { createFinanceDataTable } from '../../finance/common/account-set-scope';
import { requestClient } from '#/api/request';
import { getContractPage as getIncomeContractPage } from '#/api/erp/contract/income';
import { getContractPage as getOutcomeContractPage } from '#/api/erp/contract/outcome';
import { getIncomeSettlementPage } from '#/api/erp/finance/revenue/settlement';

const CONTRACT_BUSINESS_DB = 'LMBill';
const ACCEPTANCE_MODEL_ID = 'AACA03C4E95DA6A274009B0EEA6246AA';
const INVOICE_MODEL_ID = 'AA1A08869180B60C3117BEF4F1AA1513';

type ContractCategory = 0 | 1;
export type ExecutionModule = 'acceptance' | 'invoice';

function createOriginalTable(module: ExecutionModule) {
  if (module === 'acceptance') return createFinanceDataTable(ACCEPTANCE_MODEL_ID, 'contract_executions', CONTRACT_BUSINESS_DB, 'id');
  if (module === 'invoice') return createFinanceDataTable(INVOICE_MODEL_ID, 'invoice_applications', CONTRACT_BUSINESS_DB, 'id');
  return createFinanceDataTable(ACCEPTANCE_MODEL_ID, 'contract_executions', CONTRACT_BUSINESS_DB, 'id');
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
  } catch {}
  return {};
}

function normalizeContractCategory(value: any): ContractCategory | undefined {
  const n = Number(value);
  if (n === 0) return 0;
  if (n === 1) return 1;
  return undefined;
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
  return rows.find((row: any) => String(row?.rowid ?? row?.id ?? '').trim() === id);
}

function getAccountFields(contract: any) {
  return {
    account_set_id: contract?.account_set_id ?? null,
    lingma_sys_ent: contract?.lingma_sys_ent ?? 'NewApp',
  };
}

async function getOurContractMap(refs: any[]) {
  const rows = await getAllOurContracts();
  const map: Record<string, any> = {};
  const idSet = new Set(
    (refs || [])
      .map((ref: any) => String(typeof ref === 'object' ? ref?.id : ref || '').trim())
      .filter(Boolean),
  );

  rows.forEach((row) => {
    const id = String(row?.rowid ?? row?.id ?? '').trim();
    if (!id || (idSet.size > 0 && !idSet.has(id))) return;
    const cat = normalizeContractCategory(row?.__contract_category ?? row?.contract_category) ?? 0;
    map[id] = map[id] || row;
    map[`${cat}:${id}`] = row;
  });

  return map;
}

export async function getOurContractOptions(contractCategory?: ContractCategory) {
  return (await getAllOurContracts(contractCategory)).map((row: any) => {
    const cat = normalizeContractCategory(row?.__contract_category ?? row?.contract_category) ?? 0;
    return {
      id: String(row?.rowid ?? row?.id ?? ''),
      contract_category: cat,
      contract_no: row?.contract_no,
      contract_name: row?.contract_name ?? row?.name,
      client_name: row?.client_name ?? row?.customerName ?? row?.contract_party_b,
      contract_total_amount: row?.contract_total_amount ?? row?.contract_amount,
      account_set_id: row?.account_set_id,
      lingma_sys_ent: row?.lingma_sys_ent,
    };
  }).filter((row: any) => row.id);
}

function mapContractFields(item: any, contract: any) {
  const cat = normalizeContractCategory(
    item?.contract_category ?? contract?.__contract_category ?? contract?.contract_category,
  );
  return {
    ...item,
    contract_category: cat ?? item?.contract_category,
    contract_no: contract?.contract_no || '',
    contract_name: contract?.contract_name || contract?.name || '',
    client_name: contract?.client_name || contract?.customerName || contract?.contract_party_b || '',
    contract_amount: contract?.contract_total_amount ?? contract?.contract_amount ?? 0,
    account_set_id: item?.account_set_id ?? contract?.account_set_id,
  };
}

export async function getAcceptancePage(params: any = {}) {
  const table = createOriginalTable('acceptance');
  const filters: any[] = [cond('type', 'equal', 'acceptance')];
  if (filters.length) table.Filter = and(...filters);
  const queryParam = { Table: [table], PageParam: { page: params.page || 20, index: params.pageNo || 1 } };
  const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  const rows = Array.isArray(data?.Items) ? data.Items : [];
  const contractRefs = rows.map((r: any) => {
    const desc = parseJson(r.description);
    return {
      id: r.contract_id,
      contract_category: normalizeContractCategory(r.contract_category ?? desc.contract_category),
    };
  });
  const contracts = await getOurContractMap(contractRefs);
  const list = rows.map((row: any) => {
    const desc = parseJson(row.description);
    const contractCategory = normalizeContractCategory(row.contract_category ?? desc.contract_category);
    const contractId = String(row.contract_id || '').trim();
    const contract = contractCategory === undefined
      ? contracts[contractId]
      : (contracts[`${contractCategory}:${contractId}`] || contracts[contractId]);
    return mapContractFields({
      ...row,
      contract_category: contractCategory,
      acceptance_type: desc.type || 'phase',
      acceptance_result: desc.result || 'pass',
      acceptance_date: row.execution_date,
      remark: desc.remark || '',
    }, contract);
  }).filter((row: any) => {
    if (!params.acceptance_result || params.acceptance_result === 'all') return true;
    return row.acceptance_result === params.acceptance_result;
  });
  const ret = new clientData();
  ret.dataTable = table;
  ret.list = list;
  ret.total = data?.Count || list.length;
  return ret;
}

export async function createAcceptanceRecord(data: any) {
  const table = createOriginalTable('acceptance');
  const contractCategory = normalizeContractCategory(data.contract_category) ?? 0;
  const contract = await getOurContractById(data.contract_id, contractCategory);
  const row = {
    id: uuid(),
    contract_id: data.contract_id,
    type: 'acceptance',
    execution_date: data.acceptance_date,
    description: JSON.stringify({
      contract_category: contractCategory,
      type: data.acceptance_type,
      result: data.acceptance_result,
      remark: data.remark || '',
    }),
    attachments: JSON.stringify(data.attachments || []),
    created_at: nowText(),
    updated_at: nowText(),
    ...getAccountFields(contract),
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([row], [], []), { headers: table.getRequestHeader() });
}

export async function getInvoicePage(params: any = {}) {
  const table = createOriginalTable('invoice');
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.invoice_type && params.invoice_type !== 'all') filters.push(cond('invoice_type', 'equal', params.invoice_type));
  if (filters.length) table.Filter = and(...filters);
  const queryParam = { Table: [table], PageParam: { page: params.page || 20, index: params.pageNo || 1 } };
  const res = await requestClient.post(table.queryUrl, queryParam, { headers: table.getRequestHeader(), responseReturn: 'raw' });
  table.execQueryResult(res);
  const data = res.data?.Result?.data || res.data?.Result || res.data;
  const rows = Array.isArray(data?.Items) ? data.Items : [];
  const contracts = await getOurContractMap(rows.map((r: any) => ({ id: r.contract_id, contract_category: 0 })));
  const list = rows.map((row: any) => mapContractFields({
    ...row,
    contract_category: 0,
    apply_date: row.created_at,
    details: parseJson(row.notes).details || [],
  }, contracts[`0:${String(row.contract_id || '').trim()}`] || contracts[String(row.contract_id)]));
  const ret = new clientData();
  ret.dataTable = table;
  ret.list = list;
  ret.total = data?.Count || list.length;
  return ret;
}

export async function createInvoiceApplication(data: any) {
  const table = createOriginalTable('invoice');
  const contract = await getOurContractById(data.contract_id, 0);
  const row = {
    id: uuid(),
    contract_id: data.contract_id,
    invoice_type: data.invoice_type,
    amount: Number(data.amount || 0),
    tax_rate: Number(data.tax_rate || 0),
    tax_amount: Number(data.tax_amount || 0),
    status: data.status || 'pending',
    notes: JSON.stringify({ details: data.details || [], remark: data.notes || '' }),
    created_at: nowText(),
    updated_at: nowText(),
    ...getAccountFields(contract),
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([row], [], []), { headers: table.getRequestHeader() });
}

function mapIncomeSettlementStatus(value: any) {
  const status = Number(value ?? 10);
  if (status >= 30) return 'confirmed';
  return 'pending';
}

function mapPaymentStatusToIncomeSettlementStatus(value: any) {
  if (value === 'confirmed') return 30;
  if (value === 'pending') return [10, 20];
  return undefined;
}

export async function getPaymentPage(params: any = {}) {
  const settlementStatus = mapPaymentStatusToIncomeSettlementStatus(params.status);
  const res = await getIncomeSettlementPage({
    pageNo: params.pageNo || 1,
    page: params.page || 20,
    settlement_no: params.payment_no || params.settlement_no,
    contract_id: params.contract_id,
    status: settlementStatus,
  });
  const rows = (((res as any)?.list ?? []) as any[]).map((row: any) => {
    return {
      ...row,
      id: row.rowid,
      payment_no: row.settlement_no,
      amount: Number(row.receive_amount ?? row.total_amount ?? row.amount ?? 0),
      payment_type: row.settlement_type === 1 ? 'final' : 'progress',
      payment_method: row.receive_account ? 'bank' : 'other',
      payment_date: row.settlement_date,
      payer_name: row.customer_id,
      bank_name: row.receive_account || '',
      bank_account: '',
      status: mapIncomeSettlementStatus(row.status),
      notes: row.remark || '',
      contract_id: row.contract_id,
      contract_category: 0,
    };
  });
  const contracts = await getOurContractMap(rows.map((r: any) => ({ id: r.contract_id, contract_category: 0 })));
  const list = rows.map((row: any) => mapContractFields(row, contracts[`0:${String(row.contract_id || '').trim()}`] || contracts[String(row.contract_id)]));
  const ret = new clientData();
  ret.dataTable = (res as any)?.dataTable;
  ret.list = list;
  ret.total = (res as any)?.total ?? list.length;
  return ret;
}

export async function createPaymentRecord(_data: any) {
  return Promise.reject(new Error('回款登记已改为读取财务收入结算数据，请到财务收入结算页面办理新增或修改。'));
}
