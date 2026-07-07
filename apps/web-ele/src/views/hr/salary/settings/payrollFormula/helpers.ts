import { formulaPresetOptions, roundModeOptions } from './constants';
import type {
  FormulaPreset,
  OptionItem,
  RoundMode,
  SalaryFormulaTemplate,
  SalaryFormulaTemplateCandidate,
} from './types';

export function getErrorMessage(error: any, fallback: string) {
  return String(error?.message || fallback);
}

export function enabledText(value: any) {
  return Number(value) === 1 ? '启用' : '停用';
}

export function roundModeText(value: string) {
  return roundModeOptions.find((item) => item.value === value)?.label || value || '-';
}

export function formulaPresetText(value: string) {
  return formulaPresetOptions.find((item) => item.value === value)?.label || value || '-';
}

export function parseFormulaExpr(expr: string) {
  const text = String(expr || '').trim();
  const matched = text.match(/^(DIRECT|ADD|SUBTRACT|MULTIPLY|DIVIDE)\((.*)\)$/);
  if (!matched) return null;
  const preset = matched[1] as FormulaPreset;
  const fields = String(matched[2] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return { preset, fields };
}

export function buildFormulaExpr(preset: FormulaPreset, fields: string[]) {
  const cleanFields = fields.map((item) => String(item || '').trim()).filter(Boolean);
  if (!cleanFields.length) return '';
  return `${preset}(${cleanFields.join(',')})`;
}

export function getPresetFieldLimit(preset: FormulaPreset) {
  switch (preset) {
    case 'DIRECT':
      return { min: 1, max: 1 };
    case 'SUBTRACT':
    case 'DIVIDE':
      return { min: 2, max: 2 };
    case 'ADD':
    case 'MULTIPLY':
    default:
      return { min: 2, max: Number.MAX_SAFE_INTEGER };
  }
}

export function normalizeSelectedSourceFields(preset: FormulaPreset, fields: string[]) {
  const { max } = getPresetFieldLimit(preset);
  return fields.length > max ? fields.slice(0, max) : fields;
}

export function normalizeKeyword(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s_\-（）()【】\[\]：:]/g, '');
}

export function getItemSearchText(item: OptionItem) {
  const raw = item.raw || {};
  return [item.value, raw.item_code, raw.item_name, raw.display_name, raw.display_group, item.label]
    .map((field) => normalizeKeyword(String(field || '')))
    .join('|');
}

export function matchOptionByAliases(options: OptionItem[], aliases: string[]) {
  const normalizedAliases = aliases.map((item) => normalizeKeyword(item)).filter(Boolean);

  const exactMatched = options.find((item) => {
    const raw = item.raw || {};
    const exactTargets = [item.value, raw.item_code, raw.item_name, raw.display_name]
      .map((field) => normalizeKeyword(String(field || '')))
      .filter(Boolean);
    return normalizedAliases.some((alias) => exactTargets.includes(alias));
  });
  if (exactMatched) return exactMatched;

  return options.find((item) => {
    const text = getItemSearchText(item);
    return normalizedAliases.some((alias) => text.includes(alias));
  });
}

export function resolveFormulaFieldCode(options: OptionItem[], fieldRef: string) {
  const ref = String(fieldRef || '').trim();
  if (!ref) return '';
  const matched = matchOptionByAliases(options, [ref]);
  return String(matched?.value || ref).trim();
}

export function resolveFormulaFieldCodes(options: OptionItem[], fields: string[]) {
  return fields
    .map((field) => resolveFormulaFieldCode(options, field))
    .filter(Boolean)
    .filter((field, index, arr) => arr.indexOf(field) === index);
}

export function buildFormulaValueContext(options: OptionItem[], row: Record<string, any>) {
  const context: Record<string, number> = {};
  const assignValue = (key: any, value: any) => {
    const text = String(key || '').trim();
    if (!text) return;
    const num = Number(value ?? 0);
    context[text] = Number.isFinite(num) ? num : 0;
  };

  options.forEach((item) => {
    const raw = item.raw || {};
    const code = String(item.value || raw.item_code || '').trim();
    const value = row?.[code];
    assignValue(code, value);
    assignValue(raw.item_code, value);
    assignValue(raw.item_name, value);
    assignValue(raw.display_name, value);
  });

  Object.keys(row || {}).forEach((key) => assignValue(key, row[key]));
  return context;
}

export function evaluateFormulaExpr(
  expr: string,
  row: Record<string, any>,
  options: OptionItem[] = [],
  roundMode: RoundMode = 'ROUND',
  precision = 2,
) {
  const parsed = parseFormulaExpr(expr);
  if (!parsed) return 0;

  const context = buildFormulaValueContext(options, row);
  const values = parsed.fields.map((field) => context[field] ?? context[resolveFormulaFieldCode(options, field)] ?? 0);
  if (!values.length) return 0;

  let result = 0;
  switch (parsed.preset) {
    case 'DIRECT':
      result = values[0] ?? 0;
      break;
    case 'SUBTRACT':
      result = (values[0] ?? 0) - (values[1] ?? 0);
      break;
    case 'MULTIPLY':
      result = values.reduce((total, value) => total * value, 1);
      break;
    case 'DIVIDE':
      result = values[1] ? (values[0] ?? 0) / values[1] : 0;
      break;
    case 'ADD':
    default:
      result = values.reduce((total, value) => total + value, 0);
      break;
  }

  const scale = 10 ** Math.max(Number(precision) || 0, 0);
  if (roundMode === 'CEIL') return Math.ceil(result * scale) / scale;
  if (roundMode === 'FLOOR') return Math.floor(result * scale) / scale;
  return Math.round(result * scale) / scale;
}

export function getItemLabel(options: OptionItem[], code: string, withCode = true) {
  const found = options.find((item) => item.value === code) || matchOptionByAliases(options, [code]);
  if (!found) return code || '-';
  if (withCode) return found.label;
  return String(found.label || '').replace(/（.*?）$/, '') || code;
}

export function buildTemplateCandidate(
  template: SalaryFormulaTemplate,
  options: OptionItem[],
  existingFormulaTargetCodeSet: Set<string>,
): SalaryFormulaTemplateCandidate {
  const targetOption = matchOptionByAliases(options, template.targetAliases);
  const missingGroups: string[] = [];
  const sourceCodes: string[] = [];
  const sourceLabels: string[] = [];

  template.sourceGroups.forEach((groupAliases) => {
    const found = matchOptionByAliases(options, groupAliases);
    if (!found) {
      missingGroups.push(groupAliases[0] || '未命名项目');
      return;
    }
    if (targetOption && found.value === targetOption.value) {
      return;
    }
    if (!sourceCodes.includes(found.value)) {
      sourceCodes.push(found.value);
      sourceLabels.push(getItemLabel(options, found.value, false));
    }
  });

  const fieldLimit = getPresetFieldLimit(template.preset);
  const creatable = Boolean(targetOption?.value) && sourceCodes.length >= fieldLimit.min && sourceCodes.length <= fieldLimit.max;
  const targetCode = String(targetOption?.value || '');
  const targetLabel = targetCode ? getItemLabel(options, targetCode, false) : '未匹配';
  const formulaName = `${template.title}-系统模板`;
  const previewText = creatable ? buildFormulaExpr(template.preset, sourceCodes) : '缺少必要工资项目，暂不能生成';

  return {
    calcOrder: template.calcOrder,
    creatable,
    description: template.description,
    exists: existingFormulaTargetCodeSet.has(targetCode),
    formulaName,
    missingGroups,
    preset: template.preset,
    previewText,
    roundMode: template.roundMode || 'ROUND',
    sourceCodes,
    sourceLabels,
    targetCode,
    targetLabel,
    title: template.title,
  };
}

export function getFormulaPreviewText(options: OptionItem[], row: any) {
  const parsed = parseFormulaExpr(row.formula_expr || '');
  if (!parsed) return row.formula_expr || '-';
  const labels = parsed.fields.map((code) => getItemLabel(options, resolveFormulaFieldCode(options, code), false));
  const joinText = parsed.preset === 'SUBTRACT' ? ' - ' : parsed.preset === 'MULTIPLY' ? ' × ' : parsed.preset === 'DIVIDE' ? ' ÷ ' : ' + ';
  return `${formulaPresetText(parsed.preset)}：${labels.join(joinText)}`;
}

export function getSelectedFieldTip(preset: FormulaPreset) {
  const { min, max } = getPresetFieldLimit(preset);
  if (min === max) return `当前公式需选择 ${min} 个参与字段`;
  return `当前公式至少选择 ${min} 个参与字段`;
}
