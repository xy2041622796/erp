import { getVoucherDetailAuxiliariesByVoucherIds } from '#/api/erp/finance/voucher/voucherAux';
import { getAllSubjectList } from '#/api/erp/finance/settings/project';
import {
  getSubjectOpeningAuxiliaryList,
  type SubjectOpeningAuxiliaryValue,
} from '#/api/erp/finance/settings/initial/auxiliary';
import {
  getVoucherDetailsByIds,
  getVoucherPage,
  type ErpVoucherApi,
} from '#/api/erp/finance/voucher';
import { subjectYearBeginningToDebitPositiveRaw } from '#/utils/finance/subject-opening';

export type AuxiliaryBalanceRow = {
  rowId: string;
  dimCode?: string;
  dimName?: string;
  auxiliaryCode?: string;
  auxiliaryName?: string;
  voucherId?: string;
  voucherNo?: string;
  departmentCode: string;
  departmentName: string;
  projectCode: string;
  projectName: string;
  subjectCode: string;
  subjectName: string;
  openingDebit: number;
  openingCredit: number;
  currentDebit: number;
  currentCredit: number;
  endingDebit: number;
  endingCredit: number;
  debit: number;
  credit: number;
  balance: number;
  isTotal?: boolean;
};

export type AuxiliaryDetailRow = {
  rowId: string;
  voucherId: string;
  voucherDetailId: string;
  date: string;
  voucherNo: string;
  dimCode?: string;
  dimName?: string;
  auxiliaryCode?: string;
  auxiliaryName?: string;
  departmentCode: string;
  departmentName: string;
  projectCode: string;
  projectName: string;
  subjectCode: string;
  subjectName: string;
  auxiliaryText: string;
  summary: string;
  debit: number;
  credit: number;
  balance: number;
};

type DetailWithMain = {
  detail: ErpVoucherApi.VoucherDetail;
  main: ErpVoucherApi.VoucherMain;
};

type AuxRow = Awaited<
  ReturnType<typeof getVoucherDetailAuxiliariesByVoucherIds>
>[number];

const DEPARTMENT_DIM_CODES = ['DEPT', 'DEPARTMENT', 'ORG', 'ORGANIZATION'];
const PROJECT_DIM_CODES = ['PROJECT', 'PROJECT_ITEM', 'ITEM', 'PROJECTS'];
const AUXILIARY_DIM_LABELS: Record<string, string> = {
  CUSTOMER: '客户',
  SUPPLIER: '供应商',
  PROJECT: '项目',
  DEPT: '部门',
  DEPARTMENT: '部门',
  EMPLOYEE: '员工',
  STAFF: '员工',
  CONTRACT: '合同',
};

function monthRange(month: string) {
  const [y, m] = String(month || '')
    .split('-')
    .map(Number);
  const year =
    Number.isFinite(y) && Number(y) > 0 ? Number(y) : new Date().getFullYear();
  const monthIndex =
    Number.isFinite(m) && Number(m) > 0 ? Number(m) - 1 : new Date().getMonth();
  const utcStart = Date.UTC(year, monthIndex, 1, -8, 0, 0, 0);
  const utcEnd = Date.UTC(year, monthIndex + 1, 1, -8, 0, 0, 0) - 1;
  return {
    startISO: new Date(utcStart).toISOString(),
    endISO: new Date(utcEnd).toISOString(),
  };
}

function normalizePeriod(params: { periodEnd?: string; periodStart?: string }) {
  const start = String(params.periodStart || params.periodEnd || '').trim();
  const end = String(params.periodEnd || params.periodStart || '').trim();
  const normalizedStart = start && end && start > end ? end : start || end;
  const normalizedEnd = start && end && start > end ? start : end || start;
  const startRange = monthRange(normalizedStart);
  const endRange = monthRange(normalizedEnd);
  return { startISO: startRange.startISO, endISO: endRange.endISO };
}

function normalizePeriodMonths(params: {
  periodEnd?: string;
  periodStart?: string;
}) {
  const start = String(params.periodStart || params.periodEnd || '').trim();
  const end = String(params.periodEnd || params.periodStart || '').trim();
  return {
    startMonth: start && end && start > end ? end : start || end,
    endMonth: start && end && start > end ? start : end || start,
  };
}

function yearStartMonth(month: string) {
  const year =
    String(month || '').slice(0, 4) || String(new Date().getFullYear());
  return `${year}-01`;
}

function formatDate(d: any): string {
  if (!d) return '';
  const t = typeof d === 'string' ? d : (d as Date).toISOString();
  return t.slice(0, 10);
}

function pickNonEmptyText(...candidates: any[]) {
  for (const c of candidates) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function toAmount(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRowId(row: any) {
  return pickNonEmptyText(row?.rowid, row?.row_id, row?.rowId, row?.row_id_);
}

function normalizeDimCode(value: any) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function getAuxValue(rows: AuxRow[], dimCodes: string[]) {
  const dimSet = new Set(dimCodes.map((item) => normalizeDimCode(item)));
  const matched = rows.find((row: any) =>
    dimSet.has(normalizeDimCode(row?.dim_code)),
  );
  const code = pickNonEmptyText((matched as any)?.value_code);
  return {
    code,
    name: pickNonEmptyText((matched as any)?.value_name, code),
  };
}

function getSelectedAuxValue(rows: AuxRow[], dimCode?: string) {
  const normalized = normalizeDimCode(dimCode) || 'PROJECT';
  const matched = rows.find(
    (row: any) => normalizeDimCode(row?.dim_code) === normalized,
  );
  const code = pickNonEmptyText((matched as any)?.value_code);
  return {
    code,
    dimCode: normalized,
    dimName: pickNonEmptyText(
      (matched as any)?.dim_name,
      AUXILIARY_DIM_LABELS[normalized],
      normalized,
    ),
    name: pickNonEmptyText((matched as any)?.value_name, code),
  };
}

function buildAuxiliaryText(rows: AuxRow[]) {
  return rows
    .map((row: any) => {
      const dim = pickNonEmptyText(row?.dim_name, row?.dim_code);
      const value = pickNonEmptyText(row?.value_name, row?.value_code);
      return [dim, value].filter(Boolean).join(':');
    })
    .filter(Boolean)
    .join(' / ');
}

async function fetchVoucherLedgerSource(params: {
  periodEnd?: string;
  periodStart?: string;
}) {
  const { startISO, endISO } = normalizePeriod(params);
  const voucherPage = await getVoucherPage({
    pageNo: 1,
    page: 0,
    voucherDateRange: [startISO, endISO],
  } as any);
  const mains = (voucherPage?.list || []) as ErpVoucherApi.VoucherMain[];
  const mainById = new Map<string, ErpVoucherApi.VoucherMain>();
  for (const main of mains) {
    const voucherId = normalizeRowId(main);
    if (voucherId) mainById.set(voucherId, main);
  }

  const voucherIds = [...mainById.keys()];
  const [details, auxRows] = await Promise.all([
    getVoucherDetailsByIds(voucherIds),
    getVoucherDetailAuxiliariesByVoucherIds(voucherIds),
  ]);

  const byDetailId = new Map<string, DetailWithMain>();
  for (const detail of details || []) {
    const voucherId = pickNonEmptyText((detail as any).voucher_id);
    const main = mainById.get(voucherId);
    const detailId = normalizeRowId(detail);
    if (main && detailId) byDetailId.set(detailId, { detail, main });
  }

  return { auxRows, byDetailId };
}

function matchKeyword(
  row: {
    auxiliaryText?: string;
    departmentCode: string;
    departmentName: string;
    projectCode: string;
    projectName: string;
    subjectCode: string;
    subjectName: string;
    summary?: string;
  },
  keyword?: string,
) {
  const k = String(keyword || '').trim();
  if (!k) return true;
  return [
    row.departmentCode,
    row.departmentName,
    row.projectCode,
    row.projectName,
    row.subjectCode,
    row.subjectName,
    row.auxiliaryText,
    row.summary,
  ].some((item) => String(item || '').includes(k));
}

function compareVoucherNo(a: string, b: string) {
  return String(a || '').localeCompare(String(b || ''), 'zh-Hans-CN', {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortDetailRows(rows: AuxiliaryDetailRow[]) {
  return [...rows].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    const voucherCompare = compareVoucherNo(a.voucherNo, b.voucherNo);
    if (voucherCompare !== 0) return voucherCompare;
    return a.voucherDetailId.localeCompare(b.voucherDetailId);
  });
}

function shouldKeepByDimFilter(rows: AuxRow[], dimCode?: string) {
  const normalized = normalizeDimCode(dimCode);
  if (!normalized) return true;
  return rows.some(
    (row: any) => normalizeDimCode(row?.dim_code) === normalized,
  );
}

export async function fetchAuxiliaryProjectDetailRows(params: {
  departmentCode?: string;
  dimCode?: string;
  keyword?: string;
  periodEnd?: string;
  periodStart?: string;
  projectCode?: string;
  subjectCode?: string;
  valueCode?: string;
}) {
  const { auxRows, byDetailId } = await fetchVoucherLedgerSource(params);

  const auxRowsByDetailId = new Map<string, AuxRow[]>();
  for (const aux of auxRows || []) {
    const detailId = pickNonEmptyText((aux as any).voucher_detail_id);
    if (!detailId) continue;
    const rows = auxRowsByDetailId.get(detailId) || [];
    rows.push(aux);
    auxRowsByDetailId.set(detailId, rows);
  }

  const out: AuxiliaryDetailRow[] = [];

  for (const [detailId, auxList] of auxRowsByDetailId.entries()) {
    const ctx = byDetailId.get(detailId);
    if (!ctx) continue;
    if (!shouldKeepByDimFilter(auxList, params.dimCode)) continue;
    const selectedAuxiliary = getSelectedAuxValue(auxList, params.dimCode);
    if (
      params.dimCode &&
      params.valueCode &&
      selectedAuxiliary.code !== String(params.valueCode).trim()
    )
      continue;

    const department = getAuxValue(auxList, DEPARTMENT_DIM_CODES);
    const project = getAuxValue(auxList, PROJECT_DIM_CODES);
    const subjectCode = pickNonEmptyText((ctx.detail as any).account_code);
    const subjectName = pickNonEmptyText((ctx.detail as any).account_name);
    const summary = pickNonEmptyText((ctx.detail as any).abstract_content);
    const auxiliaryText = buildAuxiliaryText(auxList);

    const base = {
      dimCode: selectedAuxiliary.dimCode,
      dimName: selectedAuxiliary.dimName,
      auxiliaryCode: selectedAuxiliary.code,
      auxiliaryName: selectedAuxiliary.name,
      departmentCode: department.code,
      departmentName: department.name,
      projectCode: project.code,
      projectName: project.name,
      subjectCode,
      subjectName,
      auxiliaryText,
      summary,
    };
    if (!matchKeyword(base, params.keyword)) continue;
    if (
      params.departmentCode &&
      department.code !== String(params.departmentCode).trim()
    )
      continue;
    if (
      params.projectCode &&
      project.code !== String(params.projectCode).trim()
    )
      continue;
    if (params.subjectCode && subjectCode !== String(params.subjectCode).trim())
      continue;

    out.push({
      rowId: detailId,
      voucherId: normalizeRowId(ctx.main),
      voucherDetailId: detailId,
      date: formatDate(
        pickNonEmptyText(
          ctx.main.voucher_date,
          ctx.main.createtime,
          ctx.main.updatetime,
        ),
      ),
      voucherNo: pickNonEmptyText(
        ctx.main.voucher_code,
        ctx.main.ReportID,
        ctx.main.business_code,
      ),
      dimCode: selectedAuxiliary.dimCode,
      dimName: selectedAuxiliary.dimName,
      auxiliaryCode: selectedAuxiliary.code,
      auxiliaryName: selectedAuxiliary.name,
      departmentCode: department.code,
      departmentName: department.name,
      projectCode: project.code,
      projectName: project.name,
      subjectCode,
      subjectName,
      auxiliaryText,
      summary,
      debit: toAmount(ctx.detail.debit_amount),
      credit: toAmount(ctx.detail.credit_amount),
      balance: 0,
    });
  }

  let running = 0;
  return sortDetailRows(out).map((row) => {
    running += row.debit - row.credit;
    return { ...row, balance: running };
  });
}

export async function fetchAuxiliaryProjectBalanceRows(params: {
  departmentCode?: string;
  dimCode?: string;
  keyword?: string;
  periodEnd?: string;
  periodStart?: string;
  projectCode?: string;
  subjectCode?: string;
  valueCode?: string;
}) {
  const { startMonth, endMonth } = normalizePeriodMonths(params);
  if (!startMonth || !endMonth) return [];

  const periodStartTime = new Date(monthRange(startMonth).startISO).getTime();
  const periodEndTime = new Date(monthRange(endMonth).endISO).getTime();
  const [{ auxRows, byDetailId }, openingRows, subjectRes] = await Promise.all([
    fetchVoucherLedgerSource({
      periodStart: yearStartMonth(startMonth),
      periodEnd: endMonth,
    }),
    getSubjectOpeningAuxiliaryList({}),
    getAllSubjectList({
      pageNo: 1,
      page: 0,
      lingma_sys_is_delete: 0,
    } as any),
  ]);

  const subjectDirection = new Map<string, string>();
  for (const subject of subjectRes?.list || []) {
    const code = pickNonEmptyText(
      (subject as any).subject_number,
      (subject as any).subject_code,
    );
    if (code)
      subjectDirection.set(
        code,
        String((subject as any).balance_direction ?? '1'),
      );
  }

  const splitBalance = (raw: number) =>
    raw >= 0 ? { debit: raw, credit: 0 } : { debit: 0, credit: Math.abs(raw) };
  const openingRawByAuxiliary = new Map<string, number>();
  const openingMetaByAuxiliary = new Map<
    string,
    {
      auxiliaryCode: string;
      auxiliaryName: string;
      dimCode: string;
      dimName: string;
    }
  >();

  for (const opening of openingRows) {
    let values: SubjectOpeningAuxiliaryValue[] = [];
    try {
      values = Array.isArray(opening.auxiliary_values)
        ? opening.auxiliary_values
        : JSON.parse(String(opening.auxiliary_values || '[]'));
    } catch {
      values = [];
    }
    const selected = values.find(
      (value) =>
        normalizeDimCode(value?.dim_code) ===
        (normalizeDimCode(params.dimCode) || 'PROJECT'),
    );
    const auxiliaryCode = pickNonEmptyText(selected?.value_code);
    if (!auxiliaryCode) continue;
    openingMetaByAuxiliary.set(auxiliaryCode, {
      dimCode:
        normalizeDimCode(selected?.dim_code) ||
        normalizeDimCode(params.dimCode) ||
        'PROJECT',
      dimName: pickNonEmptyText(
        selected?.dim_name,
        AUXILIARY_DIM_LABELS[normalizeDimCode(params.dimCode)],
        params.dimCode,
      ),
      auxiliaryCode,
      auxiliaryName: pickNonEmptyText(selected?.value_name, auxiliaryCode),
    });
    const direction = subjectDirection.get(
      String(opening.subject_code || '').trim(),
    );
    const signedOpening = subjectYearBeginningToDebitPositiveRaw(
      opening,
      direction,
    );
    openingRawByAuxiliary.set(
      auxiliaryCode,
      toAmount(openingRawByAuxiliary.get(auxiliaryCode)) + signedOpening,
    );
  }

  const auxRowsByDetailId = new Map<string, AuxRow[]>();
  for (const aux of auxRows || []) {
    const detailId = pickNonEmptyText((aux as any).voucher_detail_id);
    if (!detailId) continue;
    const rows = auxRowsByDetailId.get(detailId) || [];
    rows.push(aux);
    auxRowsByDetailId.set(detailId, rows);
  }

  const map = new Map<string, AuxiliaryBalanceRow>();

  for (const [detailId, auxiliaryRows] of auxRowsByDetailId) {
    const ctx = byDetailId.get(detailId);
    if (!ctx || !shouldKeepByDimFilter(auxiliaryRows, params.dimCode)) continue;
    const selected = getSelectedAuxValue(auxiliaryRows, params.dimCode);
    if (!selected.code) continue;
    const department = getAuxValue(auxiliaryRows, DEPARTMENT_DIM_CODES);
    const project = getAuxValue(auxiliaryRows, PROJECT_DIM_CODES);
    const subjectCode = pickNonEmptyText((ctx.detail as any).account_code);
    const subjectName = pickNonEmptyText((ctx.detail as any).account_name);
    const meta = {
      dimCode: selected.dimCode,
      dimName: selected.dimName,
      auxiliaryCode: selected.code,
      auxiliaryName: selected.name,
    };
    if (
      params.valueCode &&
      meta.auxiliaryCode !== String(params.valueCode).trim()
    )
      continue;
    if (
      params.departmentCode &&
      department.code !== String(params.departmentCode).trim()
    )
      continue;
    if (
      params.projectCode &&
      project.code !== String(params.projectCode).trim()
    )
      continue;
    if (params.subjectCode && subjectCode !== String(params.subjectCode).trim())
      continue;
    if (
      !matchKeyword(
        {
          departmentCode: department.code,
          departmentName: department.name,
          projectCode: project.code,
          projectName: project.name,
          subjectCode,
          subjectName,
          auxiliaryText: buildAuxiliaryText(auxiliaryRows),
        },
        params.keyword,
      )
    )
      continue;

    const key = [meta.dimCode, meta.auxiliaryCode].join('|');
    const row = map.get(key) || {
      rowId: key,
      ...meta,
      voucherId: '',
      voucherNo: '',
      departmentCode: department.code,
      departmentName: department.name,
      projectCode: project.code,
      projectName: project.name,
      subjectCode: '',
      subjectName: '',
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      endingDebit: 0,
      endingCredit: 0,
      debit: 0,
      credit: 0,
      balance: 0,
    };
    const voucherDate = new Date(
      pickNonEmptyText(
        ctx.main.voucher_date,
        ctx.main.createtime,
        ctx.main.updatetime,
      ),
    ).getTime();
    const debit = toAmount(ctx.detail.debit_amount);
    const credit = toAmount(ctx.detail.credit_amount);
    map.set(key, row);
    if (voucherDate > 0 && voucherDate < periodStartTime) {
      openingRawByAuxiliary.set(
        meta.auxiliaryCode,
        toAmount(openingRawByAuxiliary.get(meta.auxiliaryCode)) +
          debit -
          credit,
      );
    } else if (voucherDate >= periodStartTime && voucherDate <= periodEndTime) {
      row.currentDebit += debit;
      row.currentCredit += credit;
    }
  }

  for (const [auxiliaryCode, meta] of openingMetaByAuxiliary) {
    const key = [meta.dimCode, auxiliaryCode].join('|');
    if (map.has(key)) continue;
    map.set(key, {
      rowId: key,
      ...meta,
      voucherId: '',
      voucherNo: '',
      departmentCode: '',
      departmentName: '',
      projectCode: meta.dimCode === 'PROJECT' ? auxiliaryCode : '',
      projectName: meta.dimCode === 'PROJECT' ? meta.auxiliaryName : '',
      subjectCode: '',
      subjectName: '',
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      endingDebit: 0,
      endingCredit: 0,
      debit: 0,
      credit: 0,
      balance: 0,
    });
  }

  for (const [auxiliaryCode, openingRaw] of openingRawByAuxiliary) {
    const existingKey = [...map.keys()].find((key) =>
      key.endsWith(`|${auxiliaryCode}`),
    );
    if (!existingKey) continue;
    const row = map.get(existingKey)!;
    const opening = splitBalance(openingRaw);
    const ending = splitBalance(
      openingRaw + row.currentDebit - row.currentCredit,
    );
    Object.assign(row, {
      openingDebit: opening.debit,
      openingCredit: opening.credit,
      endingDebit: ending.debit,
      endingCredit: ending.credit,
      debit: row.currentDebit,
      credit: row.currentCredit,
      balance: ending.debit - ending.credit,
    });
  }

  for (const row of map.values()) {
    if (row.endingDebit || row.endingCredit) continue;
    const ending = splitBalance(row.currentDebit - row.currentCredit);
    row.endingDebit = ending.debit;
    row.endingCredit = ending.credit;
    row.debit = row.currentDebit;
    row.credit = row.currentCredit;
    row.balance = ending.debit - ending.credit;
  }

  const keyword = String(params.keyword || '').trim();
  const rows = [...map.values()]
    .filter((row) => {
      if (!keyword) return true;
      return [row.auxiliaryCode, row.auxiliaryName].some((value) =>
        String(value || '').includes(keyword),
      );
    })
    .sort((a, b) => {
      const auxCompare = String(a.auxiliaryCode || '').localeCompare(
        String(b.auxiliaryCode || ''),
        'zh-Hans-CN',
      );
      return auxCompare;
    });

  const total = rows.reduce(
    (acc, row) => {
      acc.openingDebit += row.openingDebit;
      acc.openingCredit += row.openingCredit;
      acc.currentDebit += row.currentDebit;
      acc.currentCredit += row.currentCredit;
      acc.endingDebit += row.endingDebit;
      acc.endingCredit += row.endingCredit;
      acc.debit = acc.currentDebit;
      acc.credit = acc.currentCredit;
      acc.balance = acc.endingDebit - acc.endingCredit;
      return acc;
    },
    {
      rowId: 'total',
      dimCode: normalizeDimCode(params.dimCode) || 'PROJECT',
      dimName: '合计',
      auxiliaryCode: '',
      auxiliaryName: '合计',
      voucherId: '',
      voucherNo: '',
      departmentCode: '',
      departmentName: '',
      projectCode: '',
      projectName: '合计',
      subjectCode: '',
      subjectName: '',
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      endingDebit: 0,
      endingCredit: 0,
      debit: 0,
      credit: 0,
      balance: 0,
      isTotal: true,
    } as AuxiliaryBalanceRow,
  );

  return rows.length > 0 ? [...rows, total] : rows;
}
