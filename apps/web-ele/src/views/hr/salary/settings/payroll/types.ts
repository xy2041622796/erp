export type DialogType = 'create' | 'edit';

export type PayrollOption = {
  label: string;
  value: string;
};

export type SalaryItemTemplate = {
  title: string;
  item_code: string;
  item_name: string;
  item_category: string;
  item_direction: string;
  input_mode: string;
  display_group: string;
  description: string;
  unit?: string;
  data_type?: string;
  default_value?: number;
  is_formula_item?: number;
  is_tax_item?: number;
  is_bonus_item?: number;
  sort_no?: number;
  tax_rule_code?: string;
  social_insurance_rule_code?: string;
  housing_fund_rule_code?: string;
};

export type SalaryItemTemplateCandidate = SalaryItemTemplate & {
  exists: boolean;
  statusText: string;
  existsReason: string;
};

export type PayrollOverviewCard = {
  key: string;
  label: string;
  total: number;
  enabled: number;
};

export type PayrollEditDialogExpose = {
  formRef?: { validate?: () => Promise<void> | void };
  validate?: () => Promise<void> | void;
  clearValidate?: () => void;
};

export type QueryFormState = {
  keyword: string;
  item_category: string;
  item_direction: string;
  input_mode: string;
  is_enabled: string | number;
  pageNo: number;
  page: number;
};

export type PageDataState = {
  list: any[];
  total: number;
};

export type EditFormState = {
  rowid: string;
  item_code: string;
  item_name: string;
  item_category: string;
  item_subcategory: string;
  default_value: number;
  default_source: string;
  input_mode: string;
  is_tax_item: number;
  is_formula_item: number;
  is_bonus_item: number;
  is_custom_item: number;
  required_flag: number;
  negative_allowed: number;
  salary_slip_display: string;
  display_group: string;
  display_name: string;
  setting_permission: string;
  visible_scope: string;
  editable_scope: string;
  item_direction: string;
  data_type: string;
  value_precision: number;
  unit: string;
  validation_rule: string;
  source_table: string;
  source_field: string;
  source_expr: string;
  tax_rule_code: string;
  social_insurance_rule_code: string;
  housing_fund_rule_code: string;
  effective_start_date: string;
  effective_end_date: string;
  version_no: number;
  is_enabled: number;
  sort_no: number;
  description: string;
  remark: string;
};
