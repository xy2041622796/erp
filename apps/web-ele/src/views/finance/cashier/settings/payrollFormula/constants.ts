import type { FormulaPresetOption, QuickStartCard, RoundModeOption, SalaryFormulaTemplate } from '#/views/finance/cashier/settings/payrollFormula/types';

export const roundModeOptions: RoundModeOption[] = [
  { label: '四舍五入', value: 'ROUND' },
  { label: '向下取整', value: 'FLOOR' },
  { label: '向上取整', value: 'CEIL' },
];

export const formulaPresetOptions: FormulaPresetOption[] = [
  { label: '直接取值', value: 'DIRECT', tip: '适合基本工资等直接取元数据值的场景' },
  { label: '求和', value: 'ADD', tip: '适合应发合计、补贴合计等多个项目求和' },
  { label: '相减', value: 'SUBTRACT', tip: '适合实发工资等“项目1 - 项目2”场景' },
  { label: '相乘', value: 'MULTIPLY', tip: '适合单价 × 数量、时薪 × 工时等场景' },
  { label: '相除', value: 'DIVIDE', tip: '适合均值、比例换算等“项目1 / 项目2”场景' },
];

export const quickStartCards: QuickStartCard[] = [
  { title: '最少 3 步', desc: '选结果项目 → 选公式类型 → 选参与字段' },
  { title: '系统自动生成', desc: '自动生成表达式、依赖字段和默认公式名称' },
  { title: '规则页兼容', desc: 'tax-rule 负责维护税档、五险一金比例；本页负责维护基数来源、应发/扣减/实发等公式链路' },
];

export const commonFormulaTemplates: SalaryFormulaTemplate[] = [
  {
    key: 'should_pay_total',
    title: '应发合计',
    targetAliases: ['应发合计', '应发工资', 'total_should_pay', 'should_pay_total', '应发'],
    sourceGroups: [
      ['基本工资', 'base_salary', 'basic_salary'],
      ['岗位工资', 'post_salary', 'position_salary'],
      ['绩效工资', 'performance_salary', '绩效'],
      ['奖金', 'bonus', '绩效奖金'],
      ['提成', 'commission'],
      ['补贴', 'allowance', 'subsidy'],
      ['加班费', 'overtime_pay', '加班工资'],
    ],
    preset: 'ADD',
    calcOrder: 100,
    description: '系统按常见收入项自动汇总应发合计',
  },
  {
    key: 'social_insurance_base',
    title: '社保基数',
    targetAliases: ['社保基数', 'social_insurance_base', 'insurance_base'],
    sourceGroups: [
      ['基本工资', 'base_salary', 'basic_salary'],
      ['应发合计', '应发工资', 'total_should_pay', 'should_pay_total'],
    ],
    preset: 'DIRECT',
    calcOrder: 120,
    description: '供五险一金总体维护页按职级比例计算社保个人/公司承担时作为基数来源',
  },
  {
    key: 'housing_fund_base',
    title: '公积金基数',
    targetAliases: ['公积金基数', 'housing_fund_base', 'fund_base'],
    sourceGroups: [
      ['基本工资', 'base_salary', 'basic_salary'],
      ['应发合计', '应发工资', 'total_should_pay', 'should_pay_total'],
    ],
    preset: 'DIRECT',
    calcOrder: 130,
    description: '供五险一金总体维护页按职级比例计算公积金个人/公司承担时作为基数来源',
  },
  {
    key: 'pretax_deduction_total',
    title: '税前扣除合计',
    targetAliases: ['税前扣除合计', 'pretax_deduction_total', '税前扣除'],
    sourceGroups: [
      ['个人社保', 'social_security_personal', 'personal_social_insurance', '社保个人'],
      ['个人公积金', 'housing_fund_personal', 'personal_housing_fund', '公积金个人'],
    ],
    preset: 'ADD',
    calcOrder: 150,
    description: '系统按常见税前扣除项自动汇总税前扣除合计',
  },
  {
    key: 'tax_base',
    title: '应税收入',
    targetAliases: ['应税收入', 'tax_base', 'taxable_income'],
    sourceGroups: [
      ['应发合计', '应发工资', 'total_should_pay', 'should_pay_total'],
      ['税前扣除合计', 'pretax_deduction_total', '税前扣除'],
    ],
    preset: 'SUBTRACT',
    calcOrder: 180,
    description: '系统按“应发合计 - 税前扣除合计”自动计算应税收入，起征点和税档由 tax-rule 页面维护',
  },
  {
    key: 'deduct_total',
    title: '扣减合计',
    targetAliases: ['扣减合计', '扣款合计', 'deduct_total', 'total_deduct', '扣减'],
    sourceGroups: [
      ['个人社保', 'social_security_personal', 'personal_social_insurance', '社保个人'],
      ['个人公积金', 'housing_fund_personal', 'personal_housing_fund', '公积金个人'],
      ['个税', 'personal_income_tax', 'income_tax', 'tax_value'],
      ['考勤扣款', 'attendance_deduct', 'absence_deduction', 'late_deduction'],
      ['其他扣款', 'other_deduction', 'deduction_other'],
    ],
    preset: 'ADD',
    calcOrder: 200,
    description: '系统按常见扣减项自动汇总扣减合计',
  },
  {
    key: 'real_pay',
    title: '实发工资',
    targetAliases: ['实发工资', '实发合计', 'net_salary', 'real_pay', 'total_actual_pay'],
    sourceGroups: [
      ['应发合计', '应发工资', 'total_should_pay', 'should_pay_total'],
      ['扣减合计', '扣款合计', 'deduct_total', 'total_deduct'],
    ],
    preset: 'SUBTRACT',
    calcOrder: 300,
    description: '系统按“应发合计 - 扣减合计”自动计算实发工资',
  },
];
