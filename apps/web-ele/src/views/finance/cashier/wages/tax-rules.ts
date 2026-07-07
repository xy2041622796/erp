import { moneyNumber, mulMoney, subMoney, sumByMoney, type MoneyInput, type MoneyRoundMode } from '#/utils/finance/decimal-money';

export type RoundMode = 'ROUND' | 'FLOOR' | 'CEIL';

export type SalaryTaxBracket = {
  upperBound: number;
  rate: number;
  quickDeduction: number;
};

export type SalaryTaxRule = {
  code: string;
  title: string;
  description: string;
  baseItemCodes: string[];
  threshold: number;
  taxableIncomeMode: 'already_taxable' | 'minus_threshold';
  minTaxableAmount?: number;
  roundMode?: RoundMode;
  brackets: SalaryTaxBracket[];
};

export type SocialInsuranceComponentRule = {
  key: string;
  label: string;
  personalRate: number;
  companyRate: number;
  itemCodes: string[];
};

export type SocialInsuranceRule = {
  code: string;
  title: string;
  description: string;
  baseItemCodes: string[];
  minBase?: number;
  maxBase?: number;
  roundMode?: RoundMode;
  components: SocialInsuranceComponentRule[];
};

export type RankContributionProfile = {
  rank_id: string;
  rank_code?: string;
  rank_name?: string;
  social_personal_rate?: number;
  social_company_rate?: number;
  housing_fund_personal_rate?: number;
  housing_fund_company_rate?: number;
  is_enabled?: number;
  remark?: string;
};

export type HousingFundRule = {
  code: string;
  title: string;
  description: string;
  baseItemCodes: string[];
  personalRate: number;
  companyRate: number;
  minBase?: number;
  maxBase?: number;
  roundMode?: RoundMode;
};

export type SocialInsuranceComponentAmount = SocialInsuranceComponentRule & {
  personalAmount: number;
  companyAmount: number;
};

const SALARY_TAX_RULE_STORAGE_KEY = 'erp.finance.cashier.salaryTaxRules';
const SOCIAL_INSURANCE_RULE_STORAGE_KEY = 'erp.finance.cashier.socialInsuranceRules';
const HOUSING_FUND_RULE_STORAGE_KEY = 'erp.finance.cashier.housingFundRules';
const RANK_CONTRIBUTION_PROFILE_STORAGE_KEY = 'erp.finance.cashier.rankContributionProfiles';

export const defaultSalaryTaxRules: SalaryTaxRule[] = [
  {
    code: 'SALARY_TAX_SIMPLE_CN_MONTHLY',
    title: '月度个税规则（可配置）',
    description:
      '默认使用 5000 起征点 + 月度超额累进税率 + 速算扣除数。若你们采用其他口径，可在薪酬规则中心直接维护税档并保存。',
    baseItemCodes: ['tax_base', 'taxable_income', '应税收入'],
    threshold: 5000,
    taxableIncomeMode: 'minus_threshold',
    minTaxableAmount: 0,
    roundMode: 'ROUND',
    brackets: [
      { upperBound: 3000, rate: 0.03, quickDeduction: 0 },
      { upperBound: 12000, rate: 0.1, quickDeduction: 210 },
      { upperBound: 25000, rate: 0.2, quickDeduction: 1410 },
      { upperBound: 35000, rate: 0.25, quickDeduction: 2660 },
      { upperBound: 55000, rate: 0.3, quickDeduction: 4410 },
      { upperBound: 80000, rate: 0.35, quickDeduction: 7160 },
      { upperBound: Number.POSITIVE_INFINITY, rate: 0.45, quickDeduction: 15160 },
    ],
  },
];

export const defaultSocialInsuranceRules: SocialInsuranceRule[] = [
  {
    code: 'SOCIAL_INSURANCE_CN_COMPONENT_DEFAULT',
    title: '社保规则（五险分项版）',
    description: '按统一缴费基数分别计算养老、医疗、失业、工伤、生育五个险种的个人承担与公司承担。',
    baseItemCodes: ['social_insurance_base', 'insurance_base', 'basic_salary', 'should_pay_total'],
    minBase: 0,
    maxBase: Number.POSITIVE_INFINITY,
    roundMode: 'ROUND',
    components: [
      {
        key: 'pension',
        label: '养老保险',
        personalRate: 0.08,
        companyRate: 0.16,
        itemCodes: ['personal_pension_insurance', 'pension_personal', 'personal_pension', '养老个人'],
      },
      {
        key: 'medical',
        label: '医疗保险',
        personalRate: 0.02,
        companyRate: 0.1,
        itemCodes: ['personal_medical_insurance', 'medical_personal', 'personal_medical', '医疗个人'],
      },
      {
        key: 'unemployment',
        label: '失业保险',
        personalRate: 0.005,
        companyRate: 0.005,
        itemCodes: ['personal_unemployment_insurance', 'unemployment_personal', 'personal_unemployment', '失业个人'],
      },
      {
        key: 'injury',
        label: '工伤保险',
        personalRate: 0,
        companyRate: 0.004,
        itemCodes: ['personal_work_injury_insurance', 'injury_personal', 'personal_injury', '工伤个人'],
      },
      {
        key: 'maternity',
        label: '生育保险',
        personalRate: 0,
        companyRate: 0.005,
        itemCodes: ['personal_maternity_insurance', 'maternity_personal', 'personal_maternity', '生育个人'],
      },
    ],
  },
];

export const defaultHousingFundRules: HousingFundRule[] = [
  {
    code: 'HOUSING_FUND_SIMPLE_CN_DEFAULT',
    title: '公积金规则（简化版）',
    description: '按缴费基数和个人/公司比例自动计算个人公积金与公司公积金。',
    baseItemCodes: ['housing_fund_base', 'fund_base', 'basic_salary', 'should_pay_total'],
    personalRate: 0.12,
    companyRate: 0.12,
    minBase: 0,
    maxBase: Number.POSITIVE_INFINITY,
    roundMode: 'ROUND',
  },
];

const SOCIAL_INSURANCE_AGGREGATE_ITEM_CODES = [
  'personal_social_insurance',
  'social_insurance_personal',
  'social_insurance_total_personal',
  'insurance_personal',
  'personal_insurance',
  '个人社保',
  '社保个人',
  '社保个人合计',
];

const SOCIAL_INSURANCE_COMPANY_AGGREGATE_ITEM_CODES = [
  'company_social_insurance',
  'social_insurance_company',
  'social_insurance_total_company',
  '公司社保',
  '社保公司',
];

const SOCIAL_INSURANCE_COMPANY_ITEM_CODE_MAP: Record<string, string[]> = {
  pension: ['company_pension_insurance', 'company_pension', 'pension_company', '养老公司'],
  medical: ['company_medical_insurance', 'company_medical', 'medical_company', '医疗公司'],
  unemployment: ['company_unemployment_insurance', 'company_unemployment', 'unemployment_company', '失业公司'],
  injury: ['company_work_injury_insurance', 'company_injury', 'injury_company', '工伤公司'],
  maternity: ['company_maternity_insurance', 'company_maternity', 'maternity_company', '生育公司'],
};

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseInfiniteNumber(raw: any) {
  if (raw === null || raw === undefined || raw === 'Infinity' || raw === Infinity || raw === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function sanitizeStringArray(value: any) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function toMoneyRoundMode(roundMode: RoundMode = 'ROUND'): MoneyRoundMode {
  if (roundMode === 'FLOOR') return 'floor';
  if (roundMode === 'CEIL') return 'ceil';
  return 'round';
}

function roundMoneyByMode(value: MoneyInput, roundMode: RoundMode = 'ROUND') {
  return moneyNumber(value, toMoneyRoundMode(roundMode));
}

function normalizeBracket(raw: any): SalaryTaxBracket {
  return {
    upperBound: parseInfiniteNumber(raw?.upperBound),
    rate: Number(raw?.rate || 0),
    quickDeduction: Number(raw?.quickDeduction || 0),
  };
}

function normalizeTaxRule(raw: any): SalaryTaxRule {
  return {
    code: String(raw?.code || '').trim(),
    title: String(raw?.title || '').trim(),
    description: String(raw?.description || '').trim(),
    baseItemCodes: sanitizeStringArray(raw?.baseItemCodes),
    threshold: Number(raw?.threshold || 0),
    taxableIncomeMode: raw?.taxableIncomeMode === 'already_taxable' ? 'already_taxable' : 'minus_threshold',
    minTaxableAmount: Number(raw?.minTaxableAmount ?? 0),
    roundMode:
      raw?.roundMode === 'FLOOR' || raw?.roundMode === 'CEIL' || raw?.roundMode === 'ROUND'
        ? raw.roundMode
        : 'ROUND',
    brackets: Array.isArray(raw?.brackets)
      ? raw.brackets.map(normalizeBracket).sort((a, b) => Number(a.upperBound || 0) - Number(b.upperBound || 0))
      : [],
  };
}

function normalizeSocialInsuranceComponentRule(raw: any): SocialInsuranceComponentRule {
  return {
    key: String(raw?.key || '').trim(),
    label: String(raw?.label || '').trim(),
    personalRate: Number(raw?.personalRate || 0),
    companyRate: Number(raw?.companyRate || 0),
    itemCodes: sanitizeStringArray(raw?.itemCodes),
  };
}

function normalizeSocialInsuranceRule(raw: any): SocialInsuranceRule {
  return {
    code: String(raw?.code || '').trim(),
    title: String(raw?.title || '').trim(),
    description: String(raw?.description || '').trim(),
    baseItemCodes: sanitizeStringArray(raw?.baseItemCodes),
    minBase: Number(raw?.minBase ?? 0),
    maxBase: parseInfiniteNumber(raw?.maxBase),
    roundMode:
      raw?.roundMode === 'FLOOR' || raw?.roundMode === 'CEIL' || raw?.roundMode === 'ROUND'
        ? raw.roundMode
        : 'ROUND',
    components: Array.isArray(raw?.components) ? raw.components.map(normalizeSocialInsuranceComponentRule) : [],
  };
}

function normalizeRankContributionProfile(raw: any): RankContributionProfile {
  return {
    rank_id: String(raw?.rank_id || '').trim(),
    rank_code: String(raw?.rank_code || '').trim(),
    rank_name: String(raw?.rank_name || '').trim(),
    social_personal_rate: Number(raw?.social_personal_rate || 0),
    social_company_rate: Number(raw?.social_company_rate || 0),
    housing_fund_personal_rate: Number(raw?.housing_fund_personal_rate || 0),
    housing_fund_company_rate: Number(raw?.housing_fund_company_rate || 0),
    is_enabled: Number(raw?.is_enabled ?? 1),
    remark: String(raw?.remark || '').trim(),
  };
}

function normalizeHousingFundRule(raw: any): HousingFundRule {
  return {
    code: String(raw?.code || '').trim(),
    title: String(raw?.title || '').trim(),
    description: String(raw?.description || '').trim(),
    baseItemCodes: sanitizeStringArray(raw?.baseItemCodes),
    personalRate: Number(raw?.personalRate || 0),
    companyRate: Number(raw?.companyRate || 0),
    minBase: Number(raw?.minBase ?? 0),
    maxBase: parseInfiniteNumber(raw?.maxBase),
    roundMode:
      raw?.roundMode === 'FLOOR' || raw?.roundMode === 'CEIL' || raw?.roundMode === 'ROUND'
        ? raw.roundMode
        : 'ROUND',
  };
}

function loadRulesFromStorage<T>(storageKey: string, defaultRules: T[], normalize: (item: any) => T) {
  if (!canUseBrowserStorage()) {
    return defaultRules.map((item) => normalize(item));
  }
  try {
    const rawText = window.localStorage.getItem(storageKey);
    if (!rawText) {
      return defaultRules.map((item) => normalize(item));
    }
    const parsed = JSON.parse(rawText);
    if (!Array.isArray(parsed) || !parsed.length) {
      return defaultRules.map((item) => normalize(item));
    }
    return parsed.map((item) => normalize(item));
  } catch {
    return defaultRules.map((item) => normalize(item));
  }
}

function saveRulesToStorage<T>(storageKey: string, rules: T[], normalize: (item: any) => T) {
  const normalizedRules = (Array.isArray(rules) ? rules : []).map((item) => normalize(item));
  if (canUseBrowserStorage()) {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedRules));
  }
  return normalizedRules;
}

export function getSalaryTaxRules() {
  return loadRulesFromStorage(SALARY_TAX_RULE_STORAGE_KEY, defaultSalaryTaxRules, normalizeTaxRule);
}

export function saveSalaryTaxRules(rules: SalaryTaxRule[]) {
  return saveRulesToStorage(SALARY_TAX_RULE_STORAGE_KEY, rules, normalizeTaxRule);
}

export function resetSalaryTaxRules() {
  if (canUseBrowserStorage()) {
    window.localStorage.removeItem(SALARY_TAX_RULE_STORAGE_KEY);
  }
  return defaultSalaryTaxRules.map((item) => normalizeTaxRule(item));
}

export function getSocialInsuranceRules() {
  return loadRulesFromStorage(SOCIAL_INSURANCE_RULE_STORAGE_KEY, defaultSocialInsuranceRules, normalizeSocialInsuranceRule);
}

export function saveSocialInsuranceRules(rules: SocialInsuranceRule[]) {
  return saveRulesToStorage(SOCIAL_INSURANCE_RULE_STORAGE_KEY, rules, normalizeSocialInsuranceRule);
}

export function resetSocialInsuranceRules() {
  if (canUseBrowserStorage()) {
    window.localStorage.removeItem(SOCIAL_INSURANCE_RULE_STORAGE_KEY);
  }
  return defaultSocialInsuranceRules.map((item) => normalizeSocialInsuranceRule(item));
}

export function getHousingFundRules() {
  return loadRulesFromStorage(HOUSING_FUND_RULE_STORAGE_KEY, defaultHousingFundRules, normalizeHousingFundRule);
}

export function saveHousingFundRules(rules: HousingFundRule[]) {
  return saveRulesToStorage(HOUSING_FUND_RULE_STORAGE_KEY, rules, normalizeHousingFundRule);
}

export function resetHousingFundRules() {
  if (canUseBrowserStorage()) {
    window.localStorage.removeItem(HOUSING_FUND_RULE_STORAGE_KEY);
  }
  return defaultHousingFundRules.map((item) => normalizeHousingFundRule(item));
}

export function getSalaryTaxRuleByCode(ruleCode: string) {
  const code = String(ruleCode || '').trim();
  if (!code) return null;
  return getSalaryTaxRules().find((item) => item.code === code) || null;
}

export function getSocialInsuranceRuleByCode(ruleCode: string) {
  const code = String(ruleCode || '').trim();
  if (!code) return null;
  return getSocialInsuranceRules().find((item) => item.code === code) || null;
}

export function getHousingFundRuleByCode(ruleCode: string) {
  const code = String(ruleCode || '').trim();
  if (!code) return null;
  return getHousingFundRules().find((item) => item.code === code) || null;
}

export function resolveAmountByBaseItemCodes(baseItemCodes: string[], itemValues: Record<string, number>) {
  let firstMatchedAmount = 0;
  let hasMatchedAmount = false;

  for (const code of baseItemCodes || []) {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) continue;
    if (Object.prototype.hasOwnProperty.call(itemValues, normalizedCode)) {
      const amount = Number(itemValues[normalizedCode] || 0);
      if (!hasMatchedAmount) {
        firstMatchedAmount = amount;
        hasMatchedAmount = true;
      }
      if (amount !== 0) return amount;
    }
  }

  return hasMatchedAmount ? firstMatchedAmount : 0;
}

export function calcSocialInsuranceByRule(rule: SocialInsuranceRule, itemValues: Record<string, number>) {
  const rawBaseAmount = resolveAmountByBaseItemCodes(rule.baseItemCodes, itemValues);
  const contributionBase = Math.min(
    Math.max(rawBaseAmount, Number(rule.minBase ?? 0)),
    parseInfiniteNumber(rule.maxBase),
  );
  const components: SocialInsuranceComponentAmount[] = (rule.components || []).map((component) => ({
    ...component,
    personalAmount: roundMoneyByMode(mulMoney(contributionBase, component.personalRate, 'round', 6), rule.roundMode),
    companyAmount: roundMoneyByMode(mulMoney(contributionBase, component.companyRate, 'round', 6), rule.roundMode),
  }));

  return {
    rawBaseAmount,
    contributionBase,
    components,
    totalPersonalAmount: roundMoneyByMode(
      sumByMoney(components, (item) => item.personalAmount),
      rule.roundMode,
    ),
    totalCompanyAmount: roundMoneyByMode(
      sumByMoney(components, (item) => item.companyAmount),
      rule.roundMode,
    ),
  };
}

export function resolveSocialInsuranceItemAmount(rule: SocialInsuranceRule, itemCode: string, itemValues: Record<string, number>) {
  const result = resolveSocialInsuranceAnyItemAmount(rule, itemCode, itemValues);
  return {
    personalAmount: result.personalAmount,
    calcResult: result.calcResult,
    matchedComponent: result.matchedComponent,
  };
}

export function resolveSocialInsuranceAnyItemAmount(rule: SocialInsuranceRule, itemCode: string, itemValues: Record<string, number>) {
  const calcResult = calcSocialInsuranceByRule(rule, itemValues);
  const normalizedItemCode = String(itemCode || '').trim();
  if (!normalizedItemCode) {
    return {
      amount: 0,
      amountSide: 'personal' as const,
      personalAmount: 0,
      companyAmount: 0,
      calcResult,
    };
  }

  if (SOCIAL_INSURANCE_AGGREGATE_ITEM_CODES.includes(normalizedItemCode)) {
    return {
      amount: calcResult.totalPersonalAmount,
      amountSide: 'personal' as const,
      personalAmount: calcResult.totalPersonalAmount,
      companyAmount: 0,
      calcResult,
    };
  }

  if (SOCIAL_INSURANCE_COMPANY_AGGREGATE_ITEM_CODES.includes(normalizedItemCode)) {
    return {
      amount: calcResult.totalCompanyAmount,
      amountSide: 'company' as const,
      personalAmount: 0,
      companyAmount: calcResult.totalCompanyAmount,
      calcResult,
    };
  }

  const matchedPersonalComponent = calcResult.components.find((item) => item.itemCodes.includes(normalizedItemCode));
  if (matchedPersonalComponent) {
    return {
      amount: Number(matchedPersonalComponent.personalAmount || 0),
      amountSide: 'personal' as const,
      personalAmount: Number(matchedPersonalComponent.personalAmount || 0),
      companyAmount: 0,
      calcResult,
      matchedComponent: matchedPersonalComponent,
    };
  }

  const matchedCompanyComponent = calcResult.components.find((item) => {
    const aliases = SOCIAL_INSURANCE_COMPANY_ITEM_CODE_MAP[item.key] || [];
    return aliases.includes(normalizedItemCode);
  });

  return {
    amount: Number(matchedCompanyComponent?.companyAmount || 0),
    amountSide: 'company' as const,
    personalAmount: 0,
    companyAmount: Number(matchedCompanyComponent?.companyAmount || 0),
    calcResult,
    matchedComponent: matchedCompanyComponent,
  };
}

export function calcHousingFundByRule(rule: HousingFundRule, itemValues: Record<string, number>) {
  const rawBaseAmount = resolveAmountByBaseItemCodes(rule.baseItemCodes, itemValues);
  const contributionBase = Math.min(
    Math.max(rawBaseAmount, Number(rule.minBase ?? 0)),
    parseInfiniteNumber(rule.maxBase),
  );

  return {
    rawBaseAmount,
    contributionBase,
    personalAmount: roundMoneyByMode(mulMoney(contributionBase, rule.personalRate, 'round', 6), rule.roundMode),
    companyAmount: roundMoneyByMode(mulMoney(contributionBase, rule.companyRate, 'round', 6), rule.roundMode),
  };
}

export function calcSalaryTaxByRule(rule: SalaryTaxRule, itemValues: Record<string, number>) {
  const rawBaseAmount = resolveAmountByBaseItemCodes(rule.baseItemCodes, itemValues);
  const taxableIncome = Math.max(
    rule.taxableIncomeMode === 'already_taxable' ? rawBaseAmount : subMoney(rawBaseAmount, rule.threshold),
    Number(rule.minTaxableAmount ?? 0),
  );

  if (taxableIncome <= 0) {
    return {
      rawBaseAmount,
      taxableIncome: 0,
      taxAmount: 0,
      matchedBracket: null,
    };
  }

  const matchedBracket =
    rule.brackets.find((item) => taxableIncome <= Number(item.upperBound || 0)) ||
    rule.brackets[rule.brackets.length - 1] ||
    null;

  if (!matchedBracket) {
    return {
      rawBaseAmount,
      taxableIncome,
      taxAmount: 0,
      matchedBracket: null,
    };
  }

  const taxAmount = roundMoneyByMode(
    subMoney(mulMoney(taxableIncome, matchedBracket.rate, 'round', 6), matchedBracket.quickDeduction),
    rule.roundMode,
  );

  return {
    rawBaseAmount,
    taxableIncome,
    taxAmount: taxAmount > 0 ? taxAmount : 0,
    matchedBracket,
  };
}

/**
 * 兼容旧版工资页：
 * 旧代码曾使用“按职级档案”命名读取税务/社保配置。
 * 当前实现已改为通用规则中心，因此这里提供兼容别名，先保证模块可以正常加载。
 */
export function getRankContributionProfiles() {
  return loadRulesFromStorage(RANK_CONTRIBUTION_PROFILE_STORAGE_KEY, [] as RankContributionProfile[], normalizeRankContributionProfile);
}

export function saveRankContributionProfiles(rules: RankContributionProfile[]) {
  return saveRulesToStorage(RANK_CONTRIBUTION_PROFILE_STORAGE_KEY, rules, normalizeRankContributionProfile);
}

export function resetRankContributionProfiles() {
  if (canUseBrowserStorage()) {
    window.localStorage.removeItem(RANK_CONTRIBUTION_PROFILE_STORAGE_KEY);
  }
  return [] as RankContributionProfile[];
}

export function getRankTaxProfiles() {
  return getSalaryTaxRules();
}

export function saveRankTaxProfiles(rules: SalaryTaxRule[]) {
  return saveSalaryTaxRules(rules);
}

export function resetRankTaxProfiles() {
  return resetSalaryTaxRules();
}
