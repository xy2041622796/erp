import { getImportSolutions, type ImportSolutionRow } from '#/api/erp/import-solution';
import {
  getImportConfigsBySchemeId,
  getImportFieldsByConfigId,
  type ImportConfigRow,
  type ImportFieldRow,
} from '#/api/erp/import-design';

export interface ImportSchemeDetail {
  scheme: ImportSolutionRow;
  config: ImportConfigRow;
  fields: ImportFieldRow[];
}

export interface ImportSchemeNodeDetail {
  config: ImportConfigRow;
  fields: ImportFieldRow[];
}

export interface ImportSchemeTreeDetail {
  scheme: ImportSolutionRow;
  nodes: ImportSchemeNodeDetail[];
}

export interface GetImportSchemeDetailPayload {
  schemeId?: string;
  schemeName?: string;
  sheetName?: string;
  table?: string;
}

function matchText(left: unknown, right: unknown) {
  return String(left || '').trim() === String(right || '').trim();
}

async function findScheme(payload: GetImportSchemeDetailPayload) {
  const solutions = await getImportSolutions();

  let scheme = payload.schemeId
    ? solutions.find((item) => matchText(item.rowid, payload.schemeId))
    : undefined;

  if (!scheme) {
    scheme = payload.schemeName
      ? solutions.find((item) => matchText(item.solutionName, payload.schemeName))
      : undefined;
  }

  if (!scheme && payload.table) {
    for (const item of solutions) {
      const configs = await getImportConfigsBySchemeId(item.rowid);
      const matched = configs.find((config) => matchText(config.table, payload.table));
      if (matched) {
        scheme = item;
        break;
      }
    }
  }

  return scheme || null;
}

function sortFields(fields: ImportFieldRow[]) {
  return fields
    .slice()
    .sort((a, b) => String(a.index || '').localeCompare(String(b.index || ''), 'en'));
}

export async function getImportSchemeDetail(
  payload: GetImportSchemeDetailPayload,
): Promise<ImportSchemeDetail | null> {
  const scheme = await findScheme(payload);
  if (!scheme) return null;

  const configs = await getImportConfigsBySchemeId(scheme.rowid);
  const config = payload.sheetName
    ? configs.find((item) => matchText(item.sheetName, payload.sheetName))
    : payload.table
      ? configs.find((item) => matchText(item.table, payload.table))
      : configs.find((item) => matchText(item.pid, scheme.rowid)) || configs[0];

  if (!config) return null;

  const fields = sortFields(await getImportFieldsByConfigId(config.rowid));

  return {
    scheme,
    config,
    fields,
  };
}

export async function getImportSchemeTreeDetail(
  payload: GetImportSchemeDetailPayload,
): Promise<ImportSchemeTreeDetail | null> {
  const scheme = await findScheme(payload);
  if (!scheme) return null;

  const configs = await getImportConfigsBySchemeId(scheme.rowid);
  if (!configs.length) return null;

  const sortedConfigs = configs.slice().sort((a, b) => {
    const sheetDiff = Number(a.sheet || 0) - Number(b.sheet || 0);
    if (sheetDiff !== 0) return sheetDiff;
    return String(a.rowid || '').localeCompare(String(b.rowid || ''), 'en');
  });

  const nodes: ImportSchemeNodeDetail[] = [];
  for (const config of sortedConfigs) {
    const fields = sortFields(await getImportFieldsByConfigId(config.rowid));
    nodes.push({ config, fields });
  }

  return {
    scheme,
    nodes,
  };
}
