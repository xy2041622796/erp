import type { FormRules } from 'element-plus';

import type { EditFormState, SalaryItemTemplate } from '#/views/finance/cashier/settings/payroll/types';

export function createInitialEditForm(): EditFormState {
  return {
    rowid: '',
    item_code: '',
    item_name: '',
    item_category: 'CUSTOM',
    item_subcategory: '',
    default_value: 0,
    default_source: 'INPUT',
    input_mode: 'MANUAL',
    is_tax_item: 0,
    is_formula_item: 0,
    is_bonus_item: 0,
    is_custom_item: 0,
    required_flag: 0,
    negative_allowed: 0,
    salary_slip_display: 'ALL',
    display_group: '',
    display_name: '',
    setting_permission: 'FIN',
    visible_scope: 'ALL',
    editable_scope: 'FIN',
    item_direction: 'income',
    data_type: 'DECIMAL',
    value_precision: 2,
    unit: 'CNY',
    validation_rule: '',
    source_table: '',
    source_field: '',
    source_expr: '',
    tax_rule_code: '',
    social_insurance_rule_code: '',
    housing_fund_rule_code: '',
    effective_start_date: '',
    effective_end_date: '',
    version_no: 1,
    is_enabled: 1,
    sort_no: 0,
    description: '',
    remark: '',
  };
}

export function resetEditForm(form: EditFormState) {
  Object.assign(form, createInitialEditForm());
}

export function normalizeDateValue(value: any) {
  return value ? String(value).slice(0, 10) : '';
}

export function applyRowToEditForm(form: EditFormState, row: any) {
  Object.assign(form, {
    rowid: row.rowid || '',
    item_code: row.item_code || '',
    item_name: row.item_name || '',
    item_category: row.item_category || 'CUSTOM',
    item_subcategory: row.item_subcategory || '',
    default_value: Number(row.default_value ?? 0),
    default_source: row.default_source || 'INPUT',
    input_mode: row.input_mode || 'MANUAL',
    is_tax_item: Number(row.is_tax_item ?? 0),
    is_formula_item: Number(row.is_formula_item ?? 0),
    is_bonus_item: Number(row.is_bonus_item ?? 0),
    is_custom_item: Number(row.is_custom_item ?? 0),
    required_flag: Number(row.required_flag ?? 0),
    negative_allowed: Number(row.negative_allowed ?? 0),
    salary_slip_display: row.salary_slip_display || 'ALL',
    display_group: row.display_group || '',
    display_name: row.display_name || '',
    setting_permission: row.setting_permission || 'FIN',
    visible_scope: row.visible_scope || 'ALL',
    editable_scope: row.editable_scope || 'FIN',
    item_direction: row.item_direction || 'income',
    data_type: row.data_type || 'DECIMAL',
    value_precision: Number(row.value_precision ?? 2),
    unit: row.unit || 'CNY',
    validation_rule: row.validation_rule || '',
    source_table: row.source_table || '',
    source_field: row.source_field || '',
    source_expr: row.source_expr || '',
    tax_rule_code: row.tax_rule_code || '',
    social_insurance_rule_code: row.social_insurance_rule_code || '',
    housing_fund_rule_code: row.housing_fund_rule_code || '',
    effective_start_date: normalizeDateValue(row.effective_start_date),
    effective_end_date: normalizeDateValue(row.effective_end_date),
    version_no: Number(row.version_no ?? 1),
    is_enabled: Number(row.is_enabled ?? 1),
    sort_no: Number(row.sort_no ?? 0),
    description: row.description || '',
    remark: row.remark || '',
  });
}

export function fillDefaultDisplayName(form: EditFormState) {
  if (!String(form.display_name || '').trim()) {
    form.display_name = String(form.item_name || '').trim();
  }
}

export function fillDefaultDisplayGroup(form: EditFormState) {
  if (String(form.display_group || '').trim()) return;
  const map: Record<string, string> = {
    BASIC: '固定工资',
    FLOATING: '浮动工资',
    ALLOWANCE: '补贴项目',
    ATTENDANCE: '考勤调整',
    INSURANCE: '五险一金',
    TAX: '税务项目',
    RESULT: '汇总项目',
    CUSTOM: '自定义项目',
  };
  form.display_group = map[form.item_category] || '';
}

function codeValidator(_rule: any, value: string, callback: any) {
  const text = String(value || '').trim();
  if (!text) return callback(new Error('请输入项目编码'));
  if (text.length > 100) return callback(new Error('项目编码长度不能超过 100'));
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(text)) {
    return callback(new Error('项目编码只能以字母开头，并由字母、数字、下划线组成'));
  }
  callback();
}

function nameValidator(_rule: any, value: string, callback: any) {
  const text = String(value || '').trim();
  if (!text) return callback(new Error('请输入项目名称'));
  if (text.length > 100) return callback(new Error('项目名称长度不能超过 100'));
  callback();
}

function textLengthValidator(label: string, maxLength: number) {
  return (_rule: any, value: string, callback: any) => {
    if (String(value || '').trim().length > maxLength) {
      return callback(new Error(`${label}长度不能超过 ${maxLength}`));
    }
    callback();
  };
}

function nonNegativeIntegerValidator(label: string, min = 0, max?: number) {
  return (_rule: any, value: number, callback: any) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num < min || (typeof max === 'number' && num > max)) {
      return callback(new Error(`${label}必须是${min}${typeof max === 'number' ? `到${max}` : ''}的整数`));
    }
    callback();
  };
}

export function createEditFormRules(editForm: EditFormState): FormRules {
  function dateRangeValidator(_rule: any, _value: any, callback: any) {
    if (
      editForm.effective_start_date &&
      editForm.effective_end_date &&
      editForm.effective_start_date > editForm.effective_end_date
    ) {
      return callback(new Error('生效结束日期不能早于生效开始日期'));
    }
    callback();
  }

  return {
    item_code: [{ required: true, validator: codeValidator, trigger: 'blur' }],
    item_name: [{ required: true, validator: nameValidator, trigger: 'blur' }],
    item_category: [{ required: true, message: '请选择项目分类', trigger: 'change' }],
    item_direction: [{ required: true, message: '请选择项目方向', trigger: 'change' }],
    input_mode: [{ required: true, message: '请选择录入模式', trigger: 'change' }],
    data_type: [{ required: true, message: '请选择数据类型', trigger: 'change' }],
    unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
    sort_no: [{ required: true, validator: nonNegativeIntegerValidator('排序', 0), trigger: 'change' }],
    value_precision: [{ required: true, validator: nonNegativeIntegerValidator('数值精度', 0, 6), trigger: 'change' }],
    version_no: [{ required: true, validator: nonNegativeIntegerValidator('版本号', 1), trigger: 'change' }],
    item_subcategory: [{ validator: textLengthValidator('项目子分类', 50), trigger: 'blur' }],
    display_group: [{ validator: textLengthValidator('显示分组', 50), trigger: 'blur' }],
    display_name: [{ validator: textLengthValidator('显示名称', 100), trigger: 'blur' }],
    validation_rule: [{ validator: textLengthValidator('校验规则', 255), trigger: 'blur' }],
    source_table: [{ validator: textLengthValidator('来源表', 100), trigger: 'blur' }],
    source_field: [{ validator: textLengthValidator('来源字段', 100), trigger: 'blur' }],
    source_expr: [{ validator: textLengthValidator('来源表达式', 500), trigger: 'blur' }],
    tax_rule_code: [{ validator: textLengthValidator('税规则编码', 100), trigger: 'blur' }],
    social_insurance_rule_code: [{ validator: textLengthValidator('社保规则编码', 100), trigger: 'blur' }],
    housing_fund_rule_code: [{ validator: textLengthValidator('公积金规则编码', 100), trigger: 'blur' }],
    description: [{ validator: textLengthValidator('说明', 1000), trigger: 'blur' }],
    remark: [{ validator: textLengthValidator('备注', 500), trigger: 'blur' }],
    effective_start_date: [{ validator: dateRangeValidator, trigger: 'change' }],
    effective_end_date: [{ validator: dateRangeValidator, trigger: 'change' }],
  };
}

export function buildCommonItemPayload(item: SalaryItemTemplate) {
  return {
    item_code: item.item_code,
    item_name: item.item_name,
    item_category: item.item_category,
    item_subcategory: '',
    default_value: Number(item.default_value ?? 0),
    default_source: 'INPUT',
    input_mode: item.input_mode,
    is_tax_item: Number(item.is_tax_item ?? 0),
    is_formula_item: Number(item.is_formula_item ?? 0),
    is_bonus_item: Number(item.is_bonus_item ?? 0),
    is_custom_item: item.item_category === 'CUSTOM' ? 1 : 0,
    required_flag: 0,
    negative_allowed: 0,
    salary_slip_display: 'ALL',
    display_group: item.display_group,
    display_name: item.item_name,
    setting_permission: 'FIN',
    visible_scope: 'ALL',
    editable_scope: 'FIN',
    item_direction: item.item_direction,
    data_type: item.data_type || 'DECIMAL',
    value_precision: 2,
    unit: item.unit || 'CNY',
    validation_rule: '',
    source_table: '',
    source_field: '',
    source_expr: '',
    tax_rule_code: item.tax_rule_code || '',
    social_insurance_rule_code: item.social_insurance_rule_code || '',
    housing_fund_rule_code: item.housing_fund_rule_code || '',
    effective_start_date: null,
    effective_end_date: null,
    version_no: 1,
    is_enabled: 1,
    sort_no: Number(item.sort_no ?? 0),
    description: item.description,
    remark: '常用工资项目一键创建',
  } as any;
}

export function buildSubmitPayload(editForm: EditFormState) {
  return {
    ...editForm,
    item_code: String(editForm.item_code || '').trim(),
    item_name: String(editForm.item_name || '').trim(),
    item_subcategory: String(editForm.item_subcategory || '').trim(),
    display_group: String(editForm.display_group || '').trim(),
    display_name: String(editForm.display_name || '').trim() || String(editForm.item_name || '').trim(),
    validation_rule: String(editForm.validation_rule || '').trim(),
    source_table: String(editForm.source_table || '').trim(),
    source_field: String(editForm.source_field || '').trim(),
    source_expr: String(editForm.source_expr || '').trim(),
    tax_rule_code: String(editForm.tax_rule_code || '').trim(),
    social_insurance_rule_code: String(editForm.social_insurance_rule_code || '').trim(),
    housing_fund_rule_code: String(editForm.housing_fund_rule_code || '').trim(),
    effective_start_date: editForm.effective_start_date || null,
    effective_end_date: editForm.effective_end_date || null,
    description: String(editForm.description || '').trim(),
    remark: String(editForm.remark || '').trim(),
    default_value: Number(editForm.default_value ?? 0),
    value_precision: Number(editForm.value_precision ?? 2),
    version_no: Number(editForm.version_no ?? 1),
    sort_no: Number(editForm.sort_no ?? 0),
    is_tax_item: Number(editForm.is_tax_item ?? 0),
    is_formula_item: Number(editForm.is_formula_item ?? 0),
    is_bonus_item: Number(editForm.is_bonus_item ?? 0),
    is_custom_item: Number(editForm.is_custom_item ?? 0),
    required_flag: Number(editForm.required_flag ?? 0),
    negative_allowed: Number(editForm.negative_allowed ?? 0),
    is_enabled: Number(editForm.is_enabled ?? 1),
  } as any;
}
