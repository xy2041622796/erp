export type TransformType = '列转行' | '行转列' | '行列互转';

export interface DictMappingItem {
  value: string;
  column?: string;
}

export interface DictConfigMappingRow {
  key: string;
  value: string;
  column?: string;
}

export interface DictConfigItem {
  field: string;
  type?: string;
  mappings: Array<DictConfigMappingRow> | Record<string, DictMappingItem>;
}

export interface TransformFieldConfig {
  name: string;
  title?: string;
  index?: string;
  type?: number;
}

export interface RowColumnTransformConfig {
  transformType?: TransformType;
  dynamicStartCol?: string | null;
  dynamicEndCol?: string | null;
  dynamicKeyField?: string | null;
  dynamicValueField?: string | null;
  skipEmptyValue?: number;
  dynamicStartRow?: number | null;
  dynamicEndRow?: number | null;
  dynamicKeySourceCol?: string | null;
  dynamicValueSourceCol?: string | null;
  dynamicStopMode?: string | null;
  groupKeyCols?: string | string[] | null;
  fields?: TransformFieldConfig[];
  dictData?: DictConfigItem[];
}

export interface TransformResult<T = Record<string, any>> {
  rows: T[];
  columns: string[];
}

function normalizeValue(value: unknown) {
  return value === undefined || value === null ? '' : value;
}

function normalizeGroupKeys(groupKeyCols?: string | string[] | null, fields?: TransformFieldConfig[]) {
  if (Array.isArray(groupKeyCols)) return groupKeyCols.filter(Boolean);
  if (typeof groupKeyCols === 'string' && groupKeyCols.trim()) {
    const fieldMap = new Map(
      (fields || []).map((item) => [String(item.index || '').trim().toUpperCase(), item.name]),
    );
    return groupKeyCols
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => fieldMap.get(item.toUpperCase()) || item);
  }
  return (fields || []).map((item) => item.name).filter(Boolean);
}

function getDictConfig(config: RowColumnTransformConfig) {
  return Array.isArray(config.dictData) && config.dictData.length > 0 ? config.dictData[0] : null;
}

function getDictEntries(config: RowColumnTransformConfig) {
  const dict = getDictConfig(config);
  if (!dict) return [] as Array<[string, DictMappingItem]>;

  const mappings = dict.mappings || {};
  const entries = Array.isArray(mappings)
    ? mappings
        .map((item) => [String(item?.key || ''), { value: String(item?.value || ''), column: item?.column }] as [string, DictMappingItem])
        .filter((item) => item[0])
    : Object.entries(mappings);

  return entries.sort((a, b) => {
    const aCol = String(a[1]?.column || '');
    const bCol = String(b[1]?.column || '');
    return aCol.localeCompare(bCol, 'en');
  });
}

function shouldSkipValue(value: unknown, skipEmptyValue?: number) {
  if (skipEmptyValue !== 1) return false;
  return value === '' || value === null || value === undefined;
}

export function transformRowsToColumns<T extends Record<string, any>>(
  data: T[],
  config: RowColumnTransformConfig,
): TransformResult<T> {
  const dynamicKeyField = String(config.dynamicKeyField || '');
  const dynamicValueField = String(config.dynamicValueField || '');
  if (!dynamicKeyField || !dynamicValueField) {
    return { rows: [...data], columns: Object.keys(data[0] || {}) };
  }

  const groupKeys = normalizeGroupKeys(config.groupKeyCols, config.fields).filter(
    (item) => item && item !== dynamicKeyField && item !== dynamicValueField,
  );
  const dict = getDictConfig(config);
  const dictEntries = getDictEntries(config);
  const dictField = String(dict?.field || dynamicKeyField);
  const dictValueToCode = new Map<string, string>();
  const orderedDynamicCodes: string[] = [];

  dictEntries.forEach(([code, mapping]) => {
    orderedDynamicCodes.push(code);
    dictValueToCode.set(String(mapping.value || ''), code);
  });

  const grouped = new Map<string, Record<string, any>>();

  data.forEach((row) => {
    const groupObject: Record<string, any> = {};
    groupKeys.forEach((key) => {
      groupObject[key] = normalizeValue(row[key]);
    });
    const groupId = JSON.stringify(groupObject);
    if (!grouped.has(groupId)) {
      grouped.set(groupId, { ...groupObject });
    }
    const current = grouped.get(groupId)!;
    const rawKey = normalizeValue(row[dynamicKeyField]);
    const mappedCode = dictValueToCode.get(String(rawKey)) || String(rawKey);
    const value = row[dynamicValueField];
    if (shouldSkipValue(value, config.skipEmptyValue)) return;
    current[mappedCode] = value;
    if (!orderedDynamicCodes.includes(mappedCode)) {
      orderedDynamicCodes.push(mappedCode);
    }
  });

  const rows = Array.from(grouped.values()).map((row) => {
    const result: Record<string, any> = { ...row };
    orderedDynamicCodes.forEach((code) => {
      result[code] = normalizeValue(result[code]);
    });
    if (dictField && dynamicKeyField !== dictField) {
      result[dictField] = '';
    }
    return result as T;
  });

  return {
    rows,
    columns: [...groupKeys, ...orderedDynamicCodes],
  };
}

export function transformColumnsToRows<T extends Record<string, any>>(
  data: T[],
  config: RowColumnTransformConfig,
): TransformResult<T> {
  const dynamicKeyField = String(config.dynamicKeyField || '');
  const dynamicValueField = String(config.dynamicValueField || '');
  if (!dynamicKeyField || !dynamicValueField) {
    return { rows: [...data], columns: Object.keys(data[0] || {}) };
  }

  const groupKeys = normalizeGroupKeys(config.groupKeyCols, config.fields);
  const dictEntries = getDictEntries(config);
  const dynamicColumns = dictEntries.length
    ? dictEntries.map(([code]) => code)
    : Object.keys(data[0] || {}).filter((key) => !groupKeys.includes(key));
  const dictCodeToValue = new Map(
    dictEntries.map(([code, mapping]) => [code, String(mapping.value || code)]),
  );

  const rows: T[] = [];
  data.forEach((row) => {
    dynamicColumns.forEach((dynamicColumn) => {
      const value = row[dynamicColumn];
      if (shouldSkipValue(value, config.skipEmptyValue)) return;
      const item: Record<string, any> = {};
      groupKeys.forEach((key) => {
        item[key] = normalizeValue(row[key]);
      });
      item[dynamicKeyField] = dictCodeToValue.get(dynamicColumn) || dynamicColumn;
      item[dynamicValueField] = value;
      rows.push(item as T);
    });
  });

  return {
    rows,
    columns: [...groupKeys, dynamicKeyField, dynamicValueField],
  };
}

export function transformByImportExportConfig<T extends Record<string, any>>(
  data: T[],
  config: RowColumnTransformConfig,
): TransformResult<T> {
  const transformType = config.transformType || '行列互转';
  if (transformType === '列转行') {
    return transformColumnsToRows(data, config);
  }
  if (transformType === '行转列') {
    return transformRowsToColumns(data, config);
  }
  return transformRowsToColumns(data, config);
}
