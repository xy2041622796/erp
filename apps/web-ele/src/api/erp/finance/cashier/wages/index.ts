import { generateUUID } from '@vben/utils';

import { and, cond, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';

const SALARY_MODEL_ID = 'EE51818A60B93DBFDD6222A2D2F6606B';
const SALARY_SLIP_TABLE = 'Bil_Salary_Slip';
const SALARY_SLIP_ITEM_TABLE = 'Bil_Salary_Slip_Item';
const SALARY_RANK_TABLE = 'Bas_Salary_Rank';
const SALARY_RANK_EMPLOYEE_TABLE = 'Bas_Salary_Rank_Employee';
const SALARY_DB = 'LMBill';

function createSalarySlipTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_SLIP_TABLE, SALARY_DB, 'rowid');
}

function createSalarySlipItemTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_SLIP_ITEM_TABLE, SALARY_DB, 'rowid');
}

function createSalaryRankTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_RANK_TABLE, SALARY_DB, 'rowid');
}

function createSalaryRankEmployeeTable() {
  return createFinanceDataTable(SALARY_MODEL_ID, SALARY_RANK_EMPLOYEE_TABLE, SALARY_DB, 'rowid');
}

function extractListAndTotal(raw: any): { items: any[]; total: number } {
  const resultData = raw?.data?.Result?.data || raw?.Result?.data || raw?.data?.Result || raw?.Result || raw?.data || raw;
  const items = Array.isArray(resultData?.Items)
    ? resultData.Items
    : Array.isArray(resultData?.items)
      ? resultData.items
      : Array.isArray(resultData?.list)
        ? resultData.list
        : [];
  const total = Number(resultData?.Count ?? resultData?.count ?? resultData?.total ?? items.length ?? 0);
  return { items, total };
}

function normalizeText(value: any) {
  return String(value ?? '').trim();
}

function normalizeMoney(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function buildSlipNo(month: string) {
  const cleanMonth = normalizeText(month).replace('-', '');
  const suffix = String(Date.now()).slice(-6);
  return `GZ${cleanMonth}${suffix}`;
}

function buildSlipFilters(params: any = {}) {
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

  if (params.keyword) {
    filters.push(
      or(
        cond('slip_no', 'contains', params.keyword),
        cond('salary_month', 'contains', params.keyword),
        cond('pay_month', 'contains', params.keyword),
        cond('depart_name', 'contains', params.keyword),
        cond('project_name', 'contains', params.keyword),
      ),
    );
  }

  if (params.month) {
    filters.push(cond('salary_month', 'equal', params.month));
  }

  if (params.payMonth) {
    filters.push(cond('pay_month', 'equal', params.payMonth));
  }

  return filters;
}

function buildItemFilters(params: any = {}) {
  const filters: any[] = [cond('lingma_sys_is_delete', 'notequal', 1)];

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

  if (params.slipId) {
    filters.push(cond('slip_id', 'equal', params.slipId));
  }

  const slipIds = Array.isArray(params.slipIds) ? params.slipIds.filter(Boolean) : [];
  if (slipIds.length === 1) {
    filters.push(cond('slip_id', 'equal', slipIds[0]));
  } else if (slipIds.length > 1) {
    filters.push(or(...slipIds.map((id) => cond('slip_id', 'equal', id))));
  }

  return filters;
}

async function queryCurrentRankMapByEmployeeIds(employeeIds: string[]) {
  const normalizedEmployeeIds = Array.from(new Set(employeeIds.map((item) => normalizeText(item)).filter(Boolean)));
  if (!normalizedEmployeeIds.length) {
    return new Map<string, any>();
  }

  const employeeTable = createSalaryRankEmployeeTable();
  employeeTable.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('is_current', 'equal', 1),
    or(...normalizedEmployeeIds.map((employeeId) => cond('employee_id', 'equal', employeeId))),
  );

  const employeeQueryParam: any = {
    Table: [employeeTable],
    PageParam: {
      page: 9999,
      index: 1,
    },
  };

  const employeeRes = await requestClient.post(employeeTable.queryUrl, employeeQueryParam, {
    headers: employeeTable.getRequestHeader(),
    responseReturn: 'raw',
  });

  employeeTable.execQueryResult(employeeRes);
  const { items: employeeItems } = extractListAndTotal(employeeRes);
  if (!employeeItems.length) {
    return new Map<string, any>();
  }

  const rankIds = Array.from(
    new Set(employeeItems.map((item: any) => normalizeText(item.rank_id)).filter(Boolean)),
  );
  const rankMap = new Map<string, any>();

  if (rankIds.length) {
    const rankTable = createSalaryRankTable();
    rankTable.Filter = and(
      cond('lingma_sys_is_delete', 'notequal', 1),
      or(...rankIds.map((rankId) => cond('rowid', 'equal', rankId))),
    );

    const rankQueryParam: any = {
      Table: [rankTable],
      PageParam: {
        page: 9999,
        index: 1,
      },
    };

    const rankRes = await requestClient.post(rankTable.queryUrl, rankQueryParam, {
      headers: rankTable.getRequestHeader(),
      responseReturn: 'raw',
    });

    rankTable.execQueryResult(rankRes);
    const { items: rankItems } = extractListAndTotal(rankRes);
    rankItems.forEach((item: any) => {
      rankMap.set(normalizeText(item.rowid), item);
    });
  }

  const employeeRankMap = new Map<string, any>();
  employeeItems.forEach((item: any) => {
    const employeeId = normalizeText(item.employee_id);
    if (!employeeId || employeeRankMap.has(employeeId)) return;
    const rank = rankMap.get(normalizeText(item.rank_id)) || {};
    employeeRankMap.set(employeeId, {
      employee_id: employeeId,
      employee_no: normalizeText(item.employee_no),
      employee_name: normalizeText(item.employee_name),
      dept_id: normalizeText(item.dept_id),
      dept_name: normalizeText(item.dept_name),
      rank_id: normalizeText(item.rank_id),
      rank_code: normalizeText(rank.rank_code),
      rank_name: normalizeText(rank.rank_name),
    });
  });

  return employeeRankMap;
}

export namespace SalarySlipApi {
  export interface ItemValue {
    item_category?: string;
    item_code?: string;
    item_direction?: string;
    item_name?: string;
    sort_no?: number;
  }

  export interface RowInput {
    companyFund?: number;
    companySocial?: number;
    deductTotal?: number;
    detailDept?: string;
    detailDeptId?: string;
    detailProject?: string;
    employeeId?: string;
    employeeName?: string;
    employeeNo?: string;
    feeType?: string;
    itemValues?: Record<string, number>;
    realPay?: number;
    remark?: string;
    shouldPay?: number;
    tax?: number;
  }

  export interface SavePayload {
    attachmentName?: string;
    dept?: string;
    items?: ItemValue[];
    month?: string;
    payMonth?: string;
    project?: string;
    remark?: string;
    rows?: RowInput[];
  }
}

export async function getSalarySlipPage(params: any = {}) {
  const table = createSalarySlipTable();
  table.Filter = and(...buildSlipFilters(params));

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page,
      index: params.pageNo || 1,
    },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items, total } = extractListAndTotal(res);
  const list = [...items].sort((a: any, b: any) => String(b?.salary_month || '').localeCompare(String(a?.salary_month || '')));
  return { list, total };
}

export async function getSalarySlipItemPage(params: any = {}) {
  const table = createSalarySlipItemTable();
  table.Filter = and(...buildItemFilters(params));

  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: params.page ?? 9999,
      index: params.pageNo || 1,
    },
  };

  const res = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });

  table.execQueryResult(res);
  const { items, total } = extractListAndTotal(res);
  const filterSlipIds = new Set<string>([
    normalizeText(params.slipId),
    ...(Array.isArray(params.slipIds) ? params.slipIds.map((item: any) => normalizeText(item)) : []),
  ].filter(Boolean));
  const filteredItems = filterSlipIds.size
    ? items.filter((item: any) => filterSlipIds.has(normalizeText(item?.slip_id)))
    : items;
  const list = [...filteredItems].sort((a: any, b: any) => {
    const slipCompare = String(a?.slip_id || '').localeCompare(String(b?.slip_id || ''));
    if (slipCompare !== 0) return slipCompare;
    const lineCompare = Number(a?.line_no || 0) - Number(b?.line_no || 0);
    if (lineCompare !== 0) return lineCompare;
    const nameCompare = String(a?.employee_name || '').localeCompare(String(b?.employee_name || ''));
    if (nameCompare !== 0) return nameCompare;
    return String(a?.item_code || '').localeCompare(String(b?.item_code || ''));
  });
  return { list, total: filterSlipIds.size ? list.length : total };
}

export async function createSalarySlip(payload: SalarySlipApi.SavePayload) {
  const month = normalizeText(payload.month);
  if (!month) {
    throw new Error('工资月份不能为空');
  }
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    throw new Error('工资明细不能为空');
  }

  const itemMetaMap = new Map(
    (Array.isArray(payload.items) ? payload.items : [])
      .filter((item) => normalizeText(item.item_code))
      .map((item) => [normalizeText(item.item_code), item]),
  );

  const employeeRankMap = await queryCurrentRankMapByEmployeeIds(
    rows.map((row) => normalizeText(row.employeeId)).filter(Boolean),
  );

  const slipRowid = generateUUID();
  const slipNo = buildSlipNo(month);
  const employeeCount = rows.length;
  const totalShouldPay = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.shouldPay || 0), 0));
  const totalDeductPay = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.deductTotal || 0), 0));
  const totalTax = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.tax || 0), 0));
  const totalActualPay = normalizeMoney(rows.reduce((sum, row) => sum + Number(row.realPay || 0), 0));

  const slipTable = createSalarySlipTable();
  const itemTable = createSalarySlipItemTable();

  const slipHeader = {
    rowid: slipRowid,
    slip_no: slipNo,
    salary_month: month,
    pay_month: normalizeText(payload.payMonth),
    depart_name: normalizeText(payload.dept),
    project_name: normalizeText(payload.project),
    employee_count: employeeCount,
    total_should_pay: totalShouldPay,
    total_deduct_pay: totalDeductPay,
    total_tax: totalTax,
    total_actual_pay: totalActualPay,
    paid_salary: 0,
    write_off_amount: 0,
    remaining_should_pay: totalActualPay,
    description: normalizeText(payload.remark),
    remark: normalizeText(payload.attachmentName || payload.remark),
    status: 1,
    lingma_sys_is_delete: 0,
  };

  const itemRows = rows.flatMap((row, rowIndex) => {
    const itemValues = row.itemValues || {};
    const employeeId = normalizeText(row.employeeId);
    const employeeRank = employeeRankMap.get(employeeId) || {};
    const employeeNo = normalizeText(row.employeeNo || employeeRank.employee_no);
    const employeeName = normalizeText(row.employeeName || employeeRank.employee_name);
    const detailDept = normalizeText(row.detailDept || employeeRank.dept_name);
    const rankId = normalizeText(employeeRank.rank_id);
    const rankCode = normalizeText(employeeRank.rank_code);
    const rankName = normalizeText(employeeRank.rank_name);

    const dynamicItems = Object.keys(itemValues).map((itemCode) => {
      const itemMeta = itemMetaMap.get(normalizeText(itemCode));
      return {
        rowid: generateUUID(),
        slip_id: slipRowid,
        line_no: rowIndex + 1,
        employee_id: employeeId,
        employee_no: employeeNo,
        employee_name: employeeName,
        rank_id: rankId,
        rank_code: rankCode,
        rank_name: rankName,
        detail_depart_name: detailDept,
        detail_project_name: normalizeText(row.detailProject),
        expense_category: normalizeText(row.feeType),
        item_code: normalizeText(itemCode),
        item_name: normalizeText(itemMeta?.item_name || itemCode),
        item_direction: normalizeText(itemMeta?.item_direction),
        item_category: normalizeText(itemMeta?.item_category),
        item_value: normalizeMoney(itemValues[itemCode]),
        should_pay: normalizeMoney(row.shouldPay),
        deduct_total: normalizeMoney(row.deductTotal),
        tax_value: normalizeMoney(row.tax),
        real_pay: normalizeMoney(row.realPay),
        company_social: normalizeMoney(row.companySocial),
        company_fund: normalizeMoney(row.companyFund),
        remark: normalizeText(row.remark),
        status: 1,
        lingma_sys_is_delete: 0,
      };
    });

    return dynamicItems.length
      ? dynamicItems
      : [
          {
            rowid: generateUUID(),
            slip_id: slipRowid,
            line_no: rowIndex + 1,
            employee_id: employeeId,
            employee_no: employeeNo,
            employee_name: employeeName,
            rank_id: rankId,
            rank_code: rankCode,
            rank_name: rankName,
            detail_depart_name: detailDept,
            detail_project_name: normalizeText(row.detailProject),
            expense_category: normalizeText(row.feeType),
            item_code: 'SUMMARY',
            item_name: '汇总',
            item_direction: 'result',
            item_category: 'RESULT',
            item_value: normalizeMoney(row.realPay),
            should_pay: normalizeMoney(row.shouldPay),
            deduct_total: normalizeMoney(row.deductTotal),
            tax_value: normalizeMoney(row.tax),
            real_pay: normalizeMoney(row.realPay),
            company_social: normalizeMoney(row.companySocial),
            company_fund: normalizeMoney(row.companyFund),
            remark: normalizeText(row.remark),
            status: 1,
            lingma_sys_is_delete: 0,
          },
        ];
  });

  const saveSlipParam = slipTable.getSaveParam([slipHeader as any], [], []);
  await requestClient.post(slipTable.saveUrl, saveSlipParam, {
    headers: slipTable.getRequestHeader(),
  });

  const saveItemParam = itemTable.getSaveParam(itemRows as any[], [], []);
  await requestClient.post(itemTable.saveUrl, saveItemParam, {
    headers: itemTable.getRequestHeader(),
  });

  return {
    rowid: slipRowid,
    slip_no: slipNo,
  };
}

export async function deleteSalarySlip(rowid: string) {
  const table = createSalarySlipTable();
  const itemTable = createSalarySlipItemTable();

  const saveHeaderParam = table.getSaveParam([], [{ rowid, lingma_sys_is_delete: 1 } as any], []);
  await requestClient.post(table.saveUrl, saveHeaderParam, {
    headers: table.getRequestHeader(),
  });

  const itemQueryParam: any = {
    Table: [itemTable],
    PageParam: { page: 0, index: 1 },
  };
  itemTable.Filter = and(
    cond('lingma_sys_is_delete', 'notequal', 1),
    cond('slip_id', 'equal', rowid),
  );
  const itemRes = await requestClient.post(itemTable.queryUrl, itemQueryParam, {
    headers: itemTable.getRequestHeader(),
    responseReturn: 'raw',
  });
  itemTable.execQueryResult(itemRes);
  const { items } = extractListAndTotal(itemRes);
  if (items.length) {
    const changed = items.map((item: any) => ({ rowid: item.rowid, lingma_sys_is_delete: 1 }));
    const saveItemParam = itemTable.getSaveParam([], changed as any[], []);
    await requestClient.post(itemTable.saveUrl, saveItemParam, {
      headers: itemTable.getRequestHeader(),
    });
  }
}
