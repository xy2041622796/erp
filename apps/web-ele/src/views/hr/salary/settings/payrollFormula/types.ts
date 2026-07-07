export type FormulaPreset = 'DIRECT' | 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE';

export type RoundMode = 'CEIL' | 'FLOOR' | 'ROUND';

export type OptionItem = { label: string; value: string; raw?: any };

export type SalaryFormulaTemplate = {
  key: string;
  title: string;
  targetAliases: string[];
  sourceGroups: string[][];
  preset: FormulaPreset;
  calcOrder: number;
  description: string;
  roundMode?: RoundMode;
};

export type SalaryFormulaTemplateCandidate = {
  calcOrder: number;
  creatable: boolean;
  description: string;
  exists: boolean;
  formulaName: string;
  missingGroups: string[];
  preset: FormulaPreset;
  previewText: string;
  roundMode: RoundMode;
  sourceCodes: string[];
  sourceLabels: string[];
  targetCode: string;
  targetLabel: string;
  title: string;
};

export type QueryFormState = {
  keyword: string;
  target_item_code: string;
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
  formula_name: string;
  target_item_code: string;
  formula_expr: string;
  depends_on: string;
  calc_order: number;
  round_mode: RoundMode;
  is_enabled: number;
  description: string;
  remark: string;
};

export type QuickStartCard = {
  title: string;
  desc: string;
};

export type FormulaPresetOption = {
  label: string;
  value: FormulaPreset;
  tip: string;
};

export type RoundModeOption = {
  label: string;
  value: RoundMode;
};

export type PayrollFormulaEditDialogExpose = {
  formRef?: { validate?: () => Promise<void> | void };
  validate?: () => Promise<void> | void;
  clearValidate?: () => void;
};
