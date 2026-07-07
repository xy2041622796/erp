import { moneyNumber, addMoney } from '#/utils/finance/decimal-money';

export type SalaryFieldSource = 'BASE' | 'COMPANY' | 'ITEM' | 'SUMMARY';

export type SalaryFieldDefinition = {
  aliases: string[];
  category: string;
  code: string;
  direction: string;
  source: SalaryFieldSource;
  title: string;
};

export const STANDARD_SALARY_FIELDS: SalaryFieldDefinition[] = [
  {
    code: 'base_salary',
    title: '基本工资',
    source: 'ITEM',
    category: 'BASIC',
    direction: 'add',
    aliases: ['basic_salary', 'base_pay', 'basic_pay', 'salary_base', 'fixed_salary', '基本工资', '基础工资'],
  },
  {
    code: 'personal_social_insurance',
    title: '个人社保',
    source: 'ITEM',
    category: 'INSURANCE',
    direction: 'deduct',
    aliases: ['insurance_personal', 'social_insurance_personal', 'social_insurance_total_personal', 'personal_insurance', '个人社保', '社保个人', '社保个人合计'],
  },
  {
    code: 'personal_housing_fund',
    title: '个人公积金',
    source: 'ITEM',
    category: 'INSURANCE',
    direction: 'deduct',
    aliases: ['housing_fund_personal', 'fund_personal', 'provident_fund_personal', '个人公积金', '公积金个人'],
  },
  { code: 'personal_pension_insurance', title: '个人养老保险', source: 'ITEM', category: 'INSURANCE', direction: 'deduct', aliases: ['pension_personal', 'personal_pension', '养老个人'] },
  { code: 'personal_medical_insurance', title: '个人医疗保险', source: 'ITEM', category: 'INSURANCE', direction: 'deduct', aliases: ['medical_personal', 'personal_medical', '医疗个人'] },
  { code: 'personal_unemployment_insurance', title: '个人失业保险', source: 'ITEM', category: 'INSURANCE', direction: 'deduct', aliases: ['unemployment_personal', 'personal_unemployment', '失业个人'] },
  { code: 'personal_work_injury_insurance', title: '个人工伤保险', source: 'ITEM', category: 'INSURANCE', direction: 'deduct', aliases: ['injury_personal', 'personal_injury', '工伤个人'] },
  { code: 'personal_maternity_insurance', title: '个人生育保险', source: 'ITEM', category: 'INSURANCE', direction: 'deduct', aliases: ['maternity_personal', 'personal_maternity', '生育个人'] },
  { code: 'company_pension_insurance', title: '公司养老保险', source: 'COMPANY', category: 'INSURANCE', direction: 'company', aliases: ['pension_company', 'company_pension', '养老公司'] },
  { code: 'company_medical_insurance', title: '公司医疗保险', source: 'COMPANY', category: 'INSURANCE', direction: 'company', aliases: ['medical_company', 'company_medical', '医疗公司'] },
  { code: 'company_unemployment_insurance', title: '公司失业保险', source: 'COMPANY', category: 'INSURANCE', direction: 'company', aliases: ['unemployment_company', 'company_unemployment', '失业公司'] },
  { code: 'company_work_injury_insurance', title: '公司工伤保险', source: 'COMPANY', category: 'INSURANCE', direction: 'company', aliases: ['injury_company', 'company_injury', '工伤公司'] },
  { code: 'company_maternity_insurance', title: '公司生育保险', source: 'COMPANY', category: 'INSURANCE', direction: 'company', aliases: ['maternity_company', 'company_maternity', '生育公司'] },
  {
    code: 'should_pay_total',
    title: '应发合计',
    source: 'SUMMARY',
    category: 'RESULT',
    direction: 'result',
    aliases: ['gross_salary', 'should_pay', 'total_should_pay', '应发合计', '应发工资'],
  },
  {
    code: 'deduct_total',
    title: '扣减合计',
    source: 'SUMMARY',
    category: 'RESULT',
    direction: 'result',
    aliases: ['total_deduct', 'deduct_pay', 'total_deduct_pay', '扣减合计', '扣款合计'],
  },
  {
    code: 'personal_income_tax',
    title: '个人所得税',
    source: 'ITEM',
    category: 'TAX',
    direction: 'deduct',
    aliases: ['income_tax', 'tax_value', 'tax', '个税', '个人所得税'],
  },
  {
    code: 'real_pay',
    title: '实发工资',
    source: 'SUMMARY',
    category: 'RESULT',
    direction: 'result',
    aliases: ['net_salary', 'actual_pay', 'total_actual_pay', 'real_salary', '实发工资', '实发合计'],
  },
  {
    code: 'company_social_insurance',
    title: '公司社保',
    source: 'COMPANY',
    category: 'INSURANCE',
    direction: 'company',
    aliases: ['company_social', 'companySocial', 'company_social_security', '公司社保'],
  },
  {
    code: 'company_housing_fund',
    title: '公司公积金',
    source: 'COMPANY',
    category: 'INSURANCE',
    direction: 'company',
    aliases: ['company_fund', 'companyFund', 'company_provident_fund', '公司公积金'],
  },
  {
    code: 'company_contribution_total',
    title: '公司承担合计',
    source: 'COMPANY',
    category: 'INSURANCE',
    direction: 'company',
    aliases: ['company_total', 'company_contribution', '公司承担合计'],
  },
  {
    code: 'social_insurance_base',
    title: '社保基数',
    source: 'ITEM',
    category: 'INSURANCE',
    direction: 'middle',
    aliases: ['insurance_base', '社保基数'],
  },
  {
    code: 'housing_fund_base',
    title: '公积金基数',
    source: 'ITEM',
    category: 'INSURANCE',
    direction: 'middle',
    aliases: ['fund_base', '公积金基数'],
  },
  {
    code: 'pretax_deduction_total',
    title: '税前扣除合计',
    source: 'SUMMARY',
    category: 'RESULT',
    direction: 'middle',
    aliases: ['pretax_deduction', '税前扣除合计', '税前扣除'],
  },
  {
    code: 'tax_base',
    title: '应税收入',
    source: 'SUMMARY',
    category: 'RESULT',
    direction: 'middle',
    aliases: ['taxable_income', '应税收入'],
  },
];

const FIELD_ALIAS_MAP = new Map<string, SalaryFieldDefinition>();

STANDARD_SALARY_FIELDS.forEach((field) => {
  [field.code, ...field.aliases].forEach((alias) => {
    const key = String(alias || '').trim();
    if (key) FIELD_ALIAS_MAP.set(key, field);
  });
});

export function getSalaryFieldDefinition(codeOrAlias: unknown) {
  return FIELD_ALIAS_MAP.get(String(codeOrAlias ?? '').trim()) || null;
}

export function getCanonicalSalaryFieldCode(codeOrAlias: unknown) {
  return getSalaryFieldDefinition(codeOrAlias)?.code || String(codeOrAlias ?? '').trim();
}

export function getStandardSalaryItemMeta(codeOrAlias: unknown) {
  const definition = getSalaryFieldDefinition(codeOrAlias);
  if (!definition) return null;
  return {
    item_code: definition.code,
    item_name: definition.title,
    display_name: definition.title,
    item_category: definition.category,
    item_direction: definition.direction,
  };
}

export function getSalaryFieldValue(row: Record<string, any>, codeOrAlias: unknown) {
  const code = getCanonicalSalaryFieldCode(codeOrAlias);
  const aliasMap: Record<string, string[]> = {
    base_salary: ['base_salary', 'basic_salary', 'base_pay', 'basic_pay', 'salary_base', 'fixed_salary', '基本工资', '基础工资'],
    should_pay_total: ['should_pay_total', 'shouldPay', 'should_pay', 'gross_salary', 'total_should_pay'],
    deduct_total: ['deduct_total', 'deductTotal', 'total_deduct', 'total_deduct_pay'],
    personal_social_insurance: ['personal_social_insurance', 'insurance_personal', 'social_insurance_personal', 'social_insurance_total_personal', 'personal_insurance'],
    personal_housing_fund: ['personal_housing_fund', 'housing_fund_personal', 'fund_personal', 'provident_fund_personal'],
    personal_income_tax: ['personal_income_tax', 'tax', 'taxValue', 'tax_value', 'income_tax'],
    real_pay: ['real_pay', 'realPay', 'net_salary', 'actual_pay', 'total_actual_pay'],
    company_social_insurance: ['company_social_insurance', 'companySocial', 'company_social'],
    company_housing_fund: ['company_housing_fund', 'companyFund', 'company_fund'],
    company_contribution_total: ['company_contribution_total', 'companyTotal', 'company_total'],
    personal_pension_insurance: ['personal_pension_insurance', 'pension_personal', 'personal_pension'],
    personal_medical_insurance: ['personal_medical_insurance', 'medical_personal', 'personal_medical'],
    personal_unemployment_insurance: ['personal_unemployment_insurance', 'unemployment_personal', 'personal_unemployment'],
    personal_work_injury_insurance: ['personal_work_injury_insurance', 'injury_personal', 'personal_injury'],
    personal_maternity_insurance: ['personal_maternity_insurance', 'maternity_personal', 'personal_maternity'],
    company_pension_insurance: ['company_pension_insurance', 'pension_company', 'company_pension'],
    company_medical_insurance: ['company_medical_insurance', 'medical_company', 'company_medical'],
    company_unemployment_insurance: ['company_unemployment_insurance', 'unemployment_company', 'company_unemployment'],
    company_work_injury_insurance: ['company_work_injury_insurance', 'injury_company', 'company_injury'],
    company_maternity_insurance: ['company_maternity_insurance', 'maternity_company', 'company_maternity'],
  };

  const aliases = aliasMap[code] || [code];
  for (const alias of aliases) {
    if (row?.itemValues && row.itemValues[alias] !== undefined && row.itemValues[alias] !== null && row.itemValues[alias] !== '') {
      return row.itemValues[alias];
    }
    if (row?.[alias] !== undefined && row?.[alias] !== null && row?.[alias] !== '') {
      return row[alias];
    }
  }
  return 0;
}

export function setSalaryFieldValue(row: Record<string, any>, codeOrAlias: unknown, value: unknown) {
  const code = getCanonicalSalaryFieldCode(codeOrAlias);
  if (!row.itemValues) row.itemValues = {};
  row.itemValues[code] = value;

  if (code === 'company_social_insurance') row.companySocial = value;
  if (code === 'company_housing_fund') row.companyFund = value;
  if (code === 'company_contribution_total') row.companyTotal = value;
  if (code === 'should_pay_total') row.shouldPay = value;
  if (code === 'deduct_total') row.deductTotal = value;
  if (code === 'personal_income_tax') row.tax = value;
  if (code === 'real_pay') row.realPay = value;
}

export function ensureStandardSalaryItemValues(row: Record<string, any>) {
  if (!row.itemValues) row.itemValues = {};
  const companySocial = moneyNumber(getSalaryFieldValue(row, 'company_social_insurance'));
  const companyFund = moneyNumber(getSalaryFieldValue(row, 'company_housing_fund'));
  setSalaryFieldValue(row, 'company_social_insurance', companySocial);
  setSalaryFieldValue(row, 'company_housing_fund', companyFund);
  setSalaryFieldValue(row, 'company_contribution_total', moneyNumber(addMoney([companySocial, companyFund])));
}
