import type { FormRules } from 'element-plus';

import type { EditFormState, FormulaPreset, SalaryFormulaTemplateCandidate } from '#/views/finance/cashier/settings/payrollFormula/types';
import { buildFormulaExpr, getPresetFieldLimit, normalizeSelectedSourceFields, parseFormulaExpr } from '#/views/finance/cashier/settings/payrollFormula/helpers';

export function createInitialEditForm(): EditFormState {
  return {
    rowid: '',
    formula_name: '',
    target_item_code: '',
    formula_expr: '',
    depends_on: '',
    calc_order: 0,
    round_mode: 'ROUND',
    is_enabled: 1,
    description: '',
    remark: '',
  };
}

export function resetEditForm(form: EditFormState) {
  Object.assign(form, createInitialEditForm());
}

export function createEditFormRules(): FormRules {
  return {
    target_item_code: [{ required: true, message: '请选择结果项目', trigger: 'change' }],
  };
}

export function applyRowToEditForm(form: EditFormState, row: any) {
  Object.assign(form, {
    rowid: row.rowid || '',
    formula_name: row.formula_name || '',
    target_item_code: row.target_item_code || '',
    formula_expr: row.formula_expr || '',
    depends_on: row.depends_on || '',
    calc_order: Number(row.calc_order ?? 0),
    round_mode: row.round_mode || 'ROUND',
    is_enabled: Number(row.is_enabled ?? 1),
    description: row.description || '',
    remark: row.remark || '',
  });
}

export function resolveSelectionFromRow(row: any) {
  const parsed = parseFormulaExpr(row.formula_expr || '');
  if (parsed) {
    return {
      preset: parsed.preset,
      fields: parsed.fields,
    };
  }
  return {
    preset: 'ADD' as FormulaPreset,
    fields: normalizeSelectedSourceFields(
      'ADD',
      String(row.depends_on || '')
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean),
    ),
  };
}

export function validateFormulaSelection(targetItemCode: string, preset: FormulaPreset, selectedSourceFields: string[]) {
  const fields = selectedSourceFields.map((item) => String(item || '').trim()).filter(Boolean);
  const { min, max } = getPresetFieldLimit(preset);

  if (fields.length < min || fields.length > max) {
    const countText = min === max ? `请选择 ${min} 个元数据字段` : `请至少选择 ${min} 个元数据字段`;
    throw new Error(countText);
  }

  if (fields.includes(targetItemCode)) {
    throw new Error('结果项目不能同时作为参与计算的元数据字段');
  }

  return fields;
}

export function buildTemplatePayload(candidate: SalaryFormulaTemplateCandidate) {
  return {
    formula_name: candidate.formulaName,
    target_item_code: candidate.targetCode,
    formula_expr: buildFormulaExpr(candidate.preset, candidate.sourceCodes),
    depends_on: candidate.sourceCodes.join(','),
    calc_order: candidate.calcOrder,
    round_mode: candidate.roundMode,
    is_enabled: 1,
    description: candidate.description,
    remark: '常用公式一键生成',
  } as any;
}

export function buildSubmitPayload(
  form: EditFormState,
  selectedFormulaPreset: FormulaPreset,
  sourceFields: string[],
  generatedFormulaName: string,
) {
  const formulaExpr = buildFormulaExpr(selectedFormulaPreset, sourceFields);
  return {
    rowid: form.rowid,
    formula_name: String(form.formula_name || '').trim() || generatedFormulaName,
    target_item_code: form.target_item_code,
    formula_expr: formulaExpr,
    depends_on: sourceFields.join(','),
    calc_order: Number(form.calc_order ?? 0),
    round_mode: form.round_mode,
    is_enabled: Number(form.is_enabled ?? 1),
    description: form.description,
    remark: form.remark,
  } as any;
}
