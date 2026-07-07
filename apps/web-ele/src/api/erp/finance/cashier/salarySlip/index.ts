import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';

const SALARY_MODEL_ID = 'EE51818A60B93DBFDD6222A2D2F6606B';
const SALARY_SLIP_TABLE = 'Bil_Salary_Slip';
const SALARY_SLIP_ITEM_TABLE = 'Bil_Salary_Slip_Item';
const SALARY_DB = 'LMBill';

function createSalarySlipTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_SLIP_TABLE, SALARY_DB, 'rowid');
}

function createSalarySlipItemTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_SLIP_ITEM_TABLE, SALARY_DB, 'rowid');
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.data?.Result || raw?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count ?? items.length ?? 0);
  return { items, total };
}

function normalizeText(value: any) {
  return String(value ?? '').trim();
}

function normalizeMoney(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

async function queryHeaders(params: { keyword?: string; year?: string }) {
  const table = createSalarySlipTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.year) {
    filters.push(cond('salary_month', 'contains', params.year));
  }

  if (params.keyword) {
    filters.push(
      or(
        cond('slip_no', 'contains', params.keyword),
        cond('depart_name', 'contains', params.keyword),
        cond('project_name', 'contains', params.keyword),
      ),
    );
  }

  table.Filter = and(...filters);

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 9999, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res);
  return extractListAndTotal(res).items || [];
}

async function queryItems(params: { slipIds: string[]; keyword?: string }) {
  if (!params.slipIds.length) {
    return [];
  }

  const table = createSalarySlipItemTable();
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.slipIds.length === 1) {
    filters.push(cond('slip_id', 'equal', params.slipIds[0]));
  } else {
    filters.push(or(...params.slipIds.map((id) => cond('slip_id', 'equal', id))));
  }

  if (params.keyword) {
    filters.push(
      or(
        cond('employee_name', 'contains', params.keyword),
        cond('detail_depart_name', 'contains', params.keyword),
        cond('detail_project_name', 'contains', params.keyword),
        cond('item_name', 'contains', params.keyword),
        cond('item_code', 'contains', params.keyword),
      ),
    );
  }

  table.Filter = and(...filters);

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: { page: 9999, index: 1 },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res);
  return extractListAndTotal(res).items || [];
}

export namespace SalarySlipPageApi {
  export interface QueryParams {
    keyword?: string;
    year?: string;
  }

  export interface DetailItem {
    itemCode: string;
    itemName: string;
    itemDirection: string;
    itemCategory: string;
    itemValue: number;
  }

  export interface SlipCard {
    cardId: string;
    slipId: string;
    slipNo: string;
    salaryMonth: string;
    departName: string;
    projectName: string;
    employeeName: string;
    detailDepartName: string;
    detailProjectName: string;
    expenseCategory: string;
    shouldPay: number;
    deductTotal: number;
    taxValue: number;
    realPay: number;
    companySocial: number;
    companyFund: number;
    remark: string;
    detailItems: DetailItem[];
  }
}

export async function getSalarySlipCardList(params: SalarySlipPageApi.QueryParams = {}) {
  const headers = await queryHeaders(params);
  const slipIds = headers.map((item: any) => normalizeText(item.rowid)).filter(Boolean);
  if (!slipIds.length) {
    return [] as SalarySlipPageApi.SlipCard[];
  }

  const headerMap = new Map<string, any>();
  headers.forEach((item: any) => {
    headerMap.set(normalizeText(item.rowid), item);
  });

  const items = await queryItems({ slipIds, keyword: params.keyword });
  const groupMap = new Map<string, SalarySlipPageApi.SlipCard>();

  items.forEach((item: any) => {
    const slipId = normalizeText(item.slip_id);
    const employeeName = normalizeText(item.employee_name);
    const key = `${slipId}__${employeeName}`;
    const header = headerMap.get(slipId) || {};

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        cardId: key,
        slipId,
        slipNo: normalizeText(header.slip_no),
        salaryMonth: normalizeText(header.salary_month),
        departName: normalizeText(header.depart_name),
        projectName: normalizeText(header.project_name),
        employeeName,
        detailDepartName: normalizeText(item.detail_depart_name),
        detailProjectName: normalizeText(item.detail_project_name),
        expenseCategory: normalizeText(item.expense_category),
        shouldPay: normalizeMoney(item.should_pay),
        deductTotal: normalizeMoney(item.deduct_total),
        taxValue: normalizeMoney(item.tax_value),
        realPay: normalizeMoney(item.real_pay),
        companySocial: normalizeMoney(item.company_social),
        companyFund: normalizeMoney(item.company_fund),
        remark: normalizeText(item.remark || header.remark),
        detailItems: [],
      });
    }

    const card = groupMap.get(key)!;
    card.detailItems.push({
      itemCode: normalizeText(item.item_code),
      itemName: normalizeText(item.item_name || item.item_code),
      itemDirection: normalizeText(item.item_direction),
      itemCategory: normalizeText(item.item_category),
      itemValue: normalizeMoney(item.item_value),
    });
  });

  const cards = [...groupMap.values()].map((card) => ({
    ...card,
    detailItems: card.detailItems.sort((a, b) => a.itemName.localeCompare(b.itemName, 'zh-CN')),
  }));

  cards.sort((a, b) => {
    const monthCompare = String(b.salaryMonth || '').localeCompare(String(a.salaryMonth || ''));
    if (monthCompare !== 0) return monthCompare;
    return String(a.employeeName || '').localeCompare(String(b.employeeName || ''), 'zh-CN');
  });

  return cards;
}
