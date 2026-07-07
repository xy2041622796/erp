import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/payroll';
import { getSalaryFormulaPage } from '#/api/erp/finance/cashier/payrollFormula';
import { getSalaryRankEmployeeList, getSalaryRankItemList } from '#/api/erp/finance/cashier/rank';
import { getSalaryRuleBundle } from '#/api/erp/finance/cashier/salaryRule';
import { getSalaryRuleAssignmentPage, matchSalaryRuleAssignment } from '#/api/erp/finance/cashier/salaryRuleAssignment';
import { listAttendanceRecords } from '#/api/erp/human-resources/attendance';
import { listLeaveOvertime } from '#/api/erp/human-resources/attendance/leave-overtime';

import { moneyNumber, addMoney, subMoney, mulMoney, divMoney, sumByMoney } from '#/utils/finance/decimal-money';

import { evaluateFormulaExpr } from '../settings/payrollFormula/helpers';
import {
  defaultAttendanceSettlementRules,
  type AttendanceSettlementRule,
} from './attendance-settlement-rules';
import {
  calcHousingFundByRule,
  calcSalaryTaxByRule,
  resolveSocialInsuranceAnyItemAmount,
  type HousingFundRule,
  type SalaryTaxRule,
  type SocialInsuranceRule,
} from './tax-rules';
import {
  ensureStandardSalaryItemValues,
  getCanonicalSalaryFieldCode,
  getSalaryFieldValue,
  setSalaryFieldValue,
  STANDARD_SALARY_FIELDS,
} from './salary-field-registry';

export type MonthlySettlementPayload = {
  attachmentName?: string;
  dept?: string;
  items: Array<{
    item_category?: string;
    item_code?: string;
    item_direction?: string;
    item_name?: string;
    sort_no?: number;
  }>;
  month: string;
  payMonth: string;
  project?: string;
  remark?: string;
  rows: Array<Record<string, any>>;
};

type SalaryMetaItem = {
  rowid?: string;
  default_value?: number;
  display_name?: string;
  housing_fund_rule_code?: string;
  input_mode?: string;
  is_formula_item?: number;
  item_category?: string;
  item_code?: string;
  item_direction?: string;
  item_name?: string;
  social_insurance_rule_code?: string;
  sort_no?: number;
  tax_rule_code?: string;
};

type SalaryFormulaItem = {
  calc_order?: number;
  formula_expr?: string;
  is_enabled?: number;
  target_item_code?: string;
};

type RankEmployeeRow = Record<string, any>;
type RankItemRow = Record<string, any>;
type AttendanceRow = Record<string, any>;
type LeaveRow = Record<string, any>;

type SettlementRow = {
  companyFund: number;
  companySocial: number;
  deductTotal: number;
  detailDept: string;
  detailDeptId?: string;
  detailProject: string;
  employeeId?: string;
  employeeName: string;
  employeeNo?: string;
  feeType: string;
  itemValues: Record<string, number>;
  rankCode?: string;
  rankId?: string;
  rankName?: string;
  realPay: number;
  remark: string;
  shouldPay: number;
  tax: number;
};

const DEFAULT_FEE_TYPE = '工资';
const DEFAULT_PROJECT = '月度工资汇总';
const DEFAULT_REMARK = '系统按当月薪酬与考勤相关数据自动汇总生成';

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function roundMoney(value: unknown) {
  return moneyNumber(value);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthPrefix(month?: string) {
  return normalizeText(month) || getCurrentMonth();
}

function inMonth(value: unknown, month: string) {
  return normalizeText(value).startsWith(`${month}`);
}

function createSalaryItemMap(items: SalaryMetaItem[]) {
  const map = new Map<string, SalaryMetaItem>();
  items.forEach((item) => {
    const code = normalizeText(item.item_code);
    const rowid = normalizeText(item.rowid);
    if (code) map.set(`code:${code}`, item);
    if (rowid) map.set(`rowid:${rowid}`, item);
  });
  return map;
}

function isSocialInsuranceItem(item: SalaryMetaItem) {
  const text = [item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
  return String(item.item_category || '').toUpperCase() === 'INSURANCE' && !text.includes('fund') && !text.includes('公积金');
}

function isHousingFundItem(item: SalaryMetaItem) {
  const text = [item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
  return String(item.item_category || '').toUpperCase() === 'INSURANCE' && (text.includes('fund') || text.includes('公积金'));
}

function buildRuntimeSalaryItems(sourceList: SalaryMetaItem[]) {
  const existedCodes = new Set(sourceList.map((item) => normalizeText(item.item_code)).filter(Boolean));
  const runtimeItems = sourceList.map((source) => {
    const item = { ...source };
    if (isSocialInsuranceItem(item) && !normalizeText(item.social_insurance_rule_code)) {
      item.social_insurance_rule_code = 'AUTO_SOCIAL_INSURANCE_RULE';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    if (isHousingFundItem(item) && !normalizeText(item.housing_fund_rule_code)) {
      item.housing_fund_rule_code = 'AUTO_HOUSING_FUND_RULE';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    if (getCanonicalSalaryFieldCode(item.item_code) === 'personal_income_tax' && !normalizeText(item.tax_rule_code)) {
      item.tax_rule_code = 'SALARY_TAX_SIMPLE_CN_MONTHLY';
      item.input_mode = 'FORMULA';
      item.is_formula_item = 1;
    }
    return item;
  });

  STANDARD_SALARY_FIELDS.forEach((field, index) => {
    if (existedCodes.has(field.code)) return;
    runtimeItems.push({
      item_code: field.code,
      item_name: field.title,
      display_name: field.title,
      item_category: field.category,
      item_direction: field.direction,
      input_mode: field.direction === 'add' ? 'MANUAL' : 'FORMULA',
      is_formula_item: field.direction === 'add' ? 0 : 1,
      social_insurance_rule_code: field.code.includes('insurance') && field.direction !== 'company' ? 'AUTO_SOCIAL_INSURANCE_RULE' : '',
      housing_fund_rule_code: field.code.includes('housing_fund') ? 'AUTO_HOUSING_FUND_RULE' : '',
      tax_rule_code: field.code === 'personal_income_tax' ? 'SALARY_TAX_SIMPLE_CN_MONTHLY' : '',
      sort_no: 9000 + index,
    });
  });

  return runtimeItems.sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0));
}

function isFormulaReadonly(item: SalaryMetaItem) {
  return (
    String(item.input_mode || '').toUpperCase() === 'FORMULA' ||
    Number(item.is_formula_item || 0) === 1 ||
    Boolean(normalizeText(item.tax_rule_code)) ||
    Boolean(normalizeText(item.social_insurance_rule_code)) ||
    Boolean(normalizeText(item.housing_fund_rule_code))
  );
}

function createEmptyRow(salaryItems: SalaryMetaItem[]): SettlementRow {
  const itemValues: Record<string, number> = {};
  salaryItems.forEach((item) => {
    const code = normalizeText(item.item_code);
    if (code) itemValues[code] = roundMoney(item.default_value ?? 0);
  });
  return {
    companyFund: 0,
    companySocial: 0,
    deductTotal: 0,
    detailDept: '',
    detailProject: DEFAULT_PROJECT,
    feeType: DEFAULT_FEE_TYPE,
    itemValues,
    realPay: 0,
    remark: '',
    shouldPay: 0,
    tax: 0,
  };
}

function getItemValue(row: SettlementRow, code: string) {
  return moneyNumber(getSalaryFieldValue(row as any, code) || 0);
}

function setItemValue(row: SettlementRow, code: string, value: unknown) {
  row.itemValues[code] = roundMoney(value);
}

function getOvertimeItemCode(items: SalaryMetaItem[], rule?: AttendanceSettlementRule) {
  const configured = normalizeText(rule?.overtimeItemCode);
  if (configured) {
    const found = items.find((item) => normalizeText(item.item_code) === configured || getCanonicalSalaryFieldCode(item.item_code) === getCanonicalSalaryFieldCode(configured));
    if (found) return normalizeText(found.item_code);
  }
  const fuzzy = items.find((item) => {
    const text = [item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
    return text.includes('overtime') || text.includes('加班');
  });
  return normalizeText(fuzzy?.item_code);
}

function getAttendanceDeductionItemCode(items: SalaryMetaItem[], rule?: AttendanceSettlementRule) {
  const configured = normalizeText(rule?.attendanceDeductionItemCode);
  if (configured) {
    const found = items.find((item) => normalizeText(item.item_code) === configured || getCanonicalSalaryFieldCode(item.item_code) === getCanonicalSalaryFieldCode(configured));
    if (found) return normalizeText(found.item_code);
  }
  const fuzzy = items.find((item) => {
    const text = [item.item_code, item.item_name, item.display_name].map((value) => normalizeText(value).toLowerCase()).join(' ');
    return text.includes('attendance') || text.includes('考勤') || text.includes('deduction') || text.includes('扣款');
  });
  return normalizeText(fuzzy?.item_code);
}

function calcShouldPay(row: SettlementRow, salaryItems: SalaryMetaItem[]) {
  return roundMoney(
    sumByMoney(salaryItems.filter((item) => item.item_direction === 'add' || item.item_direction === 'income'), (item) => getItemValue(row, normalizeText(item.item_code))),
  );
}

function calcDeduct(row: SettlementRow, salaryItems: SalaryMetaItem[]) {
  const counted = new Set<string>();
  return roundMoney(
    sumByMoney(
      salaryItems.filter((item) => item.item_direction === 'deduct').filter((item) => {
        const canonicalCode = getCanonicalSalaryFieldCode(item.item_code);
        if (!canonicalCode || counted.has(canonicalCode)) return false;
        counted.add(canonicalCode);
        return true;
      }),
      (item) => getItemValue(row, normalizeText(item.item_code)),
    ),
  );
}

function calcTax(row: SettlementRow) {
  return roundMoney(getSalaryFieldValue(row as any, 'personal_income_tax'));
}

function calcRealPay(row: SettlementRow, salaryItems: SalaryMetaItem[]) {
  return moneyNumber(subMoney(calcShouldPay(row, salaryItems), calcDeduct(row, salaryItems)));
}

function getFormulaOptions(salaryItems: SalaryMetaItem[]) {
  return salaryItems.map((item) => ({
    label: `${item.display_name || item.item_name || ''}（${item.item_code || ''}）`,
    value: normalizeText(item.item_code),
    raw: item,
  }));
}

function applyFormulas(row: SettlementRow, formulas: SalaryFormulaItem[], salaryItems: SalaryMetaItem[]) {
  const formulaOptions = getFormulaOptions(salaryItems);
  formulas.forEach((formula) => {
    const targetCode = normalizeText(formula.target_item_code);
    if (!targetCode) return;
    row.itemValues[targetCode] = evaluateFormulaExpr(normalizeText(formula.formula_expr), { ...row, ...(row.itemValues || {}) }, formulaOptions, 'ROUND', 2);
  });
}

function resolveRuleBaseItemCodes(baseItemCodes: string[] = [], ruleType: 'HOUSING_FUND' | 'SOCIAL' | 'TAX', salaryItems: SalaryMetaItem[]) {
  const result: string[] = [];
  const push = (value: unknown) => {
    const text = normalizeText(value);
    if (text && !result.includes(text)) result.push(text);
  };
  baseItemCodes.forEach(push);
  if (ruleType === 'SOCIAL') push('social_insurance_base');
  if (ruleType === 'HOUSING_FUND') push('housing_fund_base');
  if (ruleType === 'TAX') {
    push('should_pay_total');
    push('tax_base');
  }
  salaryItems.filter((item) => String(item.item_category || '').toUpperCase() === 'BASIC').forEach((item) => push(item.item_code));
  push('base_salary');
  return result;
}

function buildRuleValues(row: SettlementRow, baseItemCodes: string[]) {
  const values = { ...(row.itemValues || {}) };
  setSalaryFieldValue({ itemValues: values } as any, 'should_pay_total', row.shouldPay);
  baseItemCodes.forEach((code) => {
    const canonicalCode = getCanonicalSalaryFieldCode(code);
    if (values[code] === undefined && values[canonicalCode] !== undefined) values[code] = values[canonicalCode];
    if (values[code] === undefined) values[code] = moneyNumber(getSalaryFieldValue(row as any, code) || 0);
  });
  return values;
}

function applyInsuranceAndTax(
  row: SettlementRow,
  salaryItems: SalaryMetaItem[],
  salaryTaxRules: SalaryTaxRule[],
  socialInsuranceRules: SocialInsuranceRule[],
  housingFundRules: HousingFundRule[],
  salaryRuleAssignments: any[],
  month: string,
) {
  let companySocial = 0;
  let companyFund = 0;

  salaryItems.forEach((item) => {
    const code = normalizeText(item.item_code);
    if (!code) return;

    const socialRuleCode = normalizeText(
      matchSalaryRuleAssignment(salaryRuleAssignments, 'SOCIAL', {
        employeeId: row.employeeId,
        rankId: row.rankId,
        rankCode: row.rankCode,
        deptId: row.detailDeptId,
        period: month,
      })?.rule_code || item.social_insurance_rule_code,
    );
    if (socialRuleCode) {
      const rule = socialInsuranceRules.find((entry) => normalizeText(entry.code) === socialRuleCode) || socialInsuranceRules[0];
      if (rule) {
        const baseCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'SOCIAL', salaryItems);
        const result = resolveSocialInsuranceAnyItemAmount({ ...rule, baseItemCodes: baseCodes }, code, buildRuleValues(row, baseCodes));
        row.itemValues[code] = roundMoney(result.amount);
        companySocial = Math.max(companySocial, roundMoney(result.calcResult?.totalCompanyAmount || 0));
      }
    }

    const fundRuleCode = normalizeText(
      matchSalaryRuleAssignment(salaryRuleAssignments, 'HOUSING_FUND', {
        employeeId: row.employeeId,
        rankId: row.rankId,
        rankCode: row.rankCode,
        deptId: row.detailDeptId,
        period: month,
      })?.rule_code || item.housing_fund_rule_code,
    );
    if (fundRuleCode) {
      const rule = housingFundRules.find((entry) => normalizeText(entry.code) === fundRuleCode) || housingFundRules[0];
      if (rule) {
        const baseCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'HOUSING_FUND', salaryItems);
        const result = calcHousingFundByRule({ ...rule, baseItemCodes: baseCodes }, buildRuleValues(row, baseCodes));
        const canonicalCode = getCanonicalSalaryFieldCode(code);
        row.itemValues[code] = canonicalCode === 'company_housing_fund' ? roundMoney(result.companyAmount) : roundMoney(result.personalAmount);
        companyFund = Math.max(companyFund, roundMoney(result.companyAmount || 0));
      }
    }
  });

  row.companySocial = companySocial;
  row.companyFund = companyFund;
  setSalaryFieldValue(row as any, 'company_social_insurance', companySocial);
  setSalaryFieldValue(row as any, 'company_housing_fund', companyFund);

  salaryItems.forEach((item) => {
    const code = normalizeText(item.item_code);
    if (!code) return;
    const taxRuleCode = normalizeText(
      matchSalaryRuleAssignment(salaryRuleAssignments, 'TAX', {
        employeeId: row.employeeId,
        rankId: row.rankId,
        rankCode: row.rankCode,
        deptId: row.detailDeptId,
        period: month,
      })?.rule_code || item.tax_rule_code,
    );
    if (!taxRuleCode) return;
    const rule = salaryTaxRules.find((entry) => normalizeText(entry.code) === taxRuleCode) || salaryTaxRules[0];
    if (!rule) return;
    const baseCodes = resolveRuleBaseItemCodes(rule.baseItemCodes, 'TAX', salaryItems);
    const result = calcSalaryTaxByRule({ ...rule, baseItemCodes: baseCodes }, buildRuleValues(row, baseCodes));
    row.itemValues[code] = roundMoney(result.taxAmount);
  });
}

function syncSummary(row: SettlementRow, salaryItems: SalaryMetaItem[]) {
  ensureStandardSalaryItemValues(row as any);
  row.shouldPay = calcShouldPay(row, salaryItems);
  row.deductTotal = calcDeduct(row, salaryItems);
  row.tax = calcTax(row);
  row.realPay = calcRealPay(row, salaryItems);
  setSalaryFieldValue(row as any, 'should_pay_total', row.shouldPay);
  setSalaryFieldValue(row as any, 'deduct_total', row.deductTotal);
  setSalaryFieldValue(row as any, 'personal_income_tax', row.tax);
  setSalaryFieldValue(row as any, 'real_pay', row.realPay);
}

function computeAttendanceContribution(
  row: SettlementRow,
  salaryItems: SalaryMetaItem[],
  attendanceRows: AttendanceRow[],
  leaveRows: LeaveRow[],
  month: string,
  attendanceRule: AttendanceSettlementRule,
) {
  const userId = normalizeText(row.employeeId);
  const userAttendance = attendanceRows.filter((item) => normalizeText(item.user_rowid) === userId && inMonth(item.attendance_date, month));
  const approvedLeaves = leaveRows.filter((item) => normalizeText(item.user_rowid) === userId && inMonth(item.start_at, month) && ['已通过', '已完成', '完成'].includes(normalizeText(item.status)));

  const baseSalary = moneyNumber(getSalaryFieldValue(row as any, 'base_salary') || 0);
  const dailySalary = baseSalary > 0 ? moneyNumber(divMoney(baseSalary, Number(attendanceRule.dailySalaryDays || 21.75))) : 0;
  const hourlySalary = moneyNumber(divMoney(dailySalary, Number(attendanceRule.workHoursPerDay || 8)));

  const overtimeMinutes = approvedLeaves.filter((item) => normalizeText(item.request_type) === '加班').reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);

  const leaveDeduct = moneyNumber(
    sumByMoney(
      approvedLeaves.filter((item) => normalizeText(item.request_type) !== '加班'),
      (item) => {
        const type = normalizeText(item.request_type);
        const hours = divMoney(Number(item.duration_minutes || 0), 60);
        const days = divMoney(hours, Number(attendanceRule.workHoursPerDay || 8));
        if (type === '年假') return mulMoney(mulMoney(days, dailySalary), Number(attendanceRule.annualLeaveDeductRate || 0));
        if (type === '病假') return mulMoney(mulMoney(days, dailySalary), Number(attendanceRule.sickLeaveDeductRate || 0.5));
        return mulMoney(mulMoney(days, dailySalary), Number(attendanceRule.personalLeaveDeductRate || 1));
      },
    ),
  );

  const lateEarlyCount = userAttendance.filter((item) => ['迟到', '早退'].includes(normalizeText(item.status))).length;
  const absentCount = userAttendance.filter((item) => normalizeText(item.status) === '旷工').length;
  const overtimeItemCode = getOvertimeItemCode(salaryItems, attendanceRule);
  const deductionItemCode = getAttendanceDeductionItemCode(salaryItems, attendanceRule);

  if (overtimeItemCode) {
    setItemValue(
      row,
      overtimeItemCode,
      mulMoney(mulMoney(hourlySalary, divMoney(overtimeMinutes, 60)), Number(attendanceRule.overtimeMultiplierWorkday || 1.5)),
    );
  }
  if (deductionItemCode) {
    setItemValue(
      row,
      deductionItemCode,
      addMoney([
        leaveDeduct,
        mulMoney(mulMoney(absentCount, dailySalary), Number(attendanceRule.absentDeductRate || 1)),
        mulMoney(lateEarlyCount, Number(attendanceRule.lateEarlyFixedAmount || 20)),
      ]),
    );
  }

  if (salaryItems.some((item) => normalizeText(item.item_code) === 'social_insurance_base')) setItemValue(row, 'social_insurance_base', baseSalary);
  if (salaryItems.some((item) => normalizeText(item.item_code) === 'housing_fund_base')) setItemValue(row, 'housing_fund_base', baseSalary);
}

function buildSalaryItemsPayload(salaryItems: SalaryMetaItem[]) {
  const existedCodes = new Set(salaryItems.map((item) => normalizeText(item.item_code)).filter(Boolean));
  const standardItems = STANDARD_SALARY_FIELDS.filter((item) => !existedCodes.has(item.code)).map((item) => ({
    item_code: item.code,
    item_name: item.title,
    item_category: item.category,
    item_direction: item.direction,
    sort_no: 9000,
  }));

  return [
    ...salaryItems.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      item_category: item.item_category,
      item_direction: item.item_direction,
      sort_no: item.sort_no,
    })),
    ...standardItems,
  ];
}

export async function buildMonthlySalarySettlementPayload(month?: string): Promise<MonthlySettlementPayload> {
  const targetMonth = getMonthPrefix(month);

  const [metaRes, formulaRes, ruleBundle, assignmentRes, rankEmployeeRes, rankItemRes, attendanceRows, leaveRows] = await Promise.all([
    getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
    getSalaryFormulaPage({ is_enabled: 1, pageNo: 1, page: 9999 }),
    getSalaryRuleBundle(),
    getSalaryRuleAssignmentPage({ is_enabled: 1, pageNo: 1, page: 9999 }).catch(() => ({ list: [] })),
    getSalaryRankEmployeeList({}).catch(() => ({ list: [] })),
    getSalaryRankItemList({}).catch(() => ({ list: [] })),
    listAttendanceRecords({ index: 1, page: 9999 }).catch(() => []),
    listLeaveOvertime({ status: '已通过' }).catch(() => []),
  ]);

  const salaryItems = buildRuntimeSalaryItems((metaRes.list || []).slice());
  const formulaItems = (formulaRes.list || [])
    .filter((item: SalaryFormulaItem) => Number(item.is_enabled ?? 1) === 1)
    .slice()
    .sort((a: SalaryFormulaItem, b: SalaryFormulaItem) => Number(a.calc_order || 0) - Number(b.calc_order || 0));
  const salaryTaxRules = ruleBundle.salaryTaxRules || [];
  const socialInsuranceRules = ruleBundle.socialInsuranceRules || [];
  const housingFundRules = ruleBundle.housingFundRules || [];
  const attendanceRule = (ruleBundle.attendanceSettlementRules || defaultAttendanceSettlementRules)[0] || defaultAttendanceSettlementRules[0]!;
  const salaryRuleAssignments = assignmentRes.list || [];
  const employeeList = (rankEmployeeRes.list || []).filter((item: RankEmployeeRow) => Number(item.is_current ?? 1) === 1);
  const rankItemList = rankItemRes.list || [];
  const salaryItemMap = createSalaryItemMap(salaryItems);
  const rankItemsByRank = new Map<string, RankItemRow[]>();

  rankItemList.forEach((item: RankItemRow) => {
    const rankId = normalizeText(item.rank_id);
    if (!rankId) return;
    if (!rankItemsByRank.has(rankId)) rankItemsByRank.set(rankId, []);
    rankItemsByRank.get(rankId)?.push(item);
  });

  const rows: SettlementRow[] = employeeList.map((employee: RankEmployeeRow) => {
    const row = createEmptyRow(salaryItems);
    row.employeeId = normalizeText(employee.employee_id);
    row.employeeNo = normalizeText(employee.employee_no);
    row.employeeName = normalizeText(employee.employee_name);
    row.rankId = normalizeText(employee.rank_id);
    row.rankCode = normalizeText(employee.rank_code);
    row.rankName = normalizeText(employee.rank_name);
    row.detailDeptId = normalizeText(employee.dept_id);
    row.detailDept = normalizeText(employee.dept_name);
    row.detailProject = DEFAULT_PROJECT;
    row.feeType = DEFAULT_FEE_TYPE;
    row.remark = DEFAULT_REMARK;

    (rankItemsByRank.get(row.rankId || '') || []).forEach((rankItem) => {
      const meta = salaryItemMap.get(`rowid:${normalizeText(rankItem.item_id)}`) || salaryItemMap.get(`code:${normalizeText(rankItem.item_id)}`);
      if (!meta) return;
      const code = normalizeText(meta.item_code);
      if (!code || isFormulaReadonly(meta)) return;
      row.itemValues[code] = roundMoney(rankItem.default_amount || meta.default_value || 0);
    });

    computeAttendanceContribution(row, salaryItems, attendanceRows as AttendanceRow[], leaveRows as LeaveRow[], targetMonth, attendanceRule);
    applyFormulas(row, formulaItems, salaryItems);
    syncSummary(row, salaryItems);
    applyInsuranceAndTax(row, salaryItems, salaryTaxRules, socialInsuranceRules, housingFundRules, salaryRuleAssignments, targetMonth);
    applyFormulas(row, formulaItems, salaryItems);
    syncSummary(row, salaryItems);
    return row;
  });

  if (!rows.length) throw new Error('未找到可参与本月工资汇总的在职职级人员');

  return {
    month: targetMonth,
    payMonth: targetMonth,
    dept: '全部部门',
    project: DEFAULT_PROJECT,
    remark: DEFAULT_REMARK,
    items: buildSalaryItemsPayload(salaryItems),
    rows: rows.map((row) => ({
      employeeId: row.employeeId,
      employeeNo: row.employeeNo,
      employeeName: row.employeeName,
      rankId: row.rankId,
      rankCode: row.rankCode,
      rankName: row.rankName,
      detailDeptId: row.detailDeptId,
      detailDept: row.detailDept,
      detailProject: row.detailProject,
      feeType: row.feeType,
      companySocial: roundMoney(row.companySocial),
      companyFund: roundMoney(row.companyFund),
      shouldPay: roundMoney(row.shouldPay),
      deductTotal: roundMoney(row.deductTotal),
      tax: roundMoney(row.tax),
      realPay: roundMoney(row.realPay),
      itemValues: { ...row.itemValues },
      remark: row.remark,
    })),
  };
}
