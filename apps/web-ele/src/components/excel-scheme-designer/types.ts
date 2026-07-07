import type { ImportConfigRow, ImportFieldRow } from '#/api/erp/import-design';
import type { ImportSolutionRow } from '#/api/erp/import-solution';

export interface ExcelSchemeDesignerNode extends ImportConfigRow {
  children?: ExcelSchemeDesignerNode[];
}

export interface ExcelSchemeDesignerState {
  solution: ImportSolutionRow | null;
  nodes: ExcelSchemeDesignerNode[];
  activeNodeId: string;
  activeConfig: ImportConfigRow | null;
  fields: ImportFieldRow[];
}

export interface FieldTableSavePayload {
  rows: ImportFieldRow[];
  deletedRowIds: string[];
}

export function cloneConfig(config: ImportConfigRow | null): ImportConfigRow | null {
  if (!config) return null;
  return {
    ...config,
    dictJson: config.dictJson ?? null,
  };
}

export function cloneFieldRows(rows: ImportFieldRow[] = []): ImportFieldRow[] {
  return rows.map((item) => ({ ...item }));
}
