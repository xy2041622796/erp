import type { PageParam } from '@vben/request';

import {
  getCurrentAppDatabasePage,
  getCurrentAppTablePage,
  getSourceAppPage,
  getTableFieldPage,
} from './source-system';

export namespace FinanceReferenceFieldApi {
  export type BindType = 'api' | 'dict' | 'json' | 'table' | 'view';

  export interface AppRow {
    rowid?: string;
    AppName?: string;
    AppDesc?: string;
    NameStr?: string;
    AppType?: string;
    [key: string]: any;
  }

  export interface DatabaseRow {
    rowid?: string;
    Id?: string;
    ValueName?: string;
    Name?: string;
    NameStr?: string;
    cnName?: string;
    conName?: string;
    [key: string]: any;
  }

  export interface ObjectRow {
    rowid?: string;
    id?: string;
    tblid?: string;
    tblname?: string;
    tbldesc?: string;
    name?: string;
    Name?: string;
    functiondesc?: string;
    isRef?: number | string;
    [key: string]: any;
  }

  export interface FieldRow {
    rowid?: string;
    tblid?: string;
    enname?: string;
    cnname?: string;
    description?: string;
    DataType?: string;
    DataTypeName?: string;
    DataLen?: string;
    IsPKey?: number | string;
    [key: string]: any;
  }

  export interface QueryResult<T> {
    list: T[];
    total: number;
  }

  export interface QueryContext {
    type: BindType;
    app?: AppRow | null;
    database?: DatabaseRow | null;
    object?: ObjectRow | null;
    keyword?: string;
    pageNo?: number;
    page?: number;
  }

  export interface LoaderSet {
    loadApps?: (params: PageParam & { keyword?: string }) => Promise<QueryResult<AppRow>>;
    loadDatabases?: (params: PageParam & { sysid?: string; keyword?: string }) => Promise<QueryResult<DatabaseRow>>;
    loadObjects?: (context: QueryContext) => Promise<QueryResult<ObjectRow>>;
    loadFields?: (context: QueryContext) => Promise<QueryResult<FieldRow>>;
  }

  export interface ResultFieldConfig {
    key: string;
    source: 'app' | 'database' | 'fieldText' | 'fieldValue' | 'object';
    field: string;
  }

  export interface OpenOptions {
    title?: string;
    appDesc?: string;
    types?: BindType[];
    defaultType?: BindType;
    textTitle?: string;
    valueTitle?: string;
    textLabel?: string;
    valueLabel?: string;
    selectOne?: boolean;
    defaultValue?: string;
    resultFields?: ResultFieldConfig[];
    loaders?: LoaderSet;
  }

  export interface SelectedPayload {
    type: 'Api' | 'Dict' | 'Json' | 'Table' | 'View';
    fullCHText: string;
    app?: AppRow | null;
    database?: DatabaseRow | null;
    dataSource: ObjectRow;
    FieldValue: FieldRow;
    fieldText: FieldRow;
    [key: string]: any;
  }
}

export async function getReferenceAppPage(
  params: PageParam & {
    keyword?: string;
  },
) {
  return getSourceAppPage(params);
}

export async function getReferenceDatabasePage(
  params: PageParam & {
    sysid?: string;
    keyword?: string;
  },
) {
  return getCurrentAppDatabasePage(params);
}

export async function getReferenceTablePage(
  context: FinanceReferenceFieldApi.QueryContext,
) {
  return getCurrentAppTablePage({
    pageNo: context.pageNo || 1,
    page: context.page || 15,
    sysid: String(context.app?.rowid || ''),
    dbid: String(context.database?.Id || context.database?.rowid || ''),
    keyword: context.keyword,
  });
}

export async function getReferenceTableFieldPage(
  context: FinanceReferenceFieldApi.QueryContext,
) {
  return getTableFieldPage({
    pageNo: context.pageNo || 1,
    page: context.page || 100,
    tblid: String(context.object?.id || context.object?.rowid || context.object?.tblid || ''),
    keyword: context.keyword,
  });
}

export const defaultReferenceFieldLoaders: Required<FinanceReferenceFieldApi.LoaderSet> = {
  async loadApps(params) {
    return getReferenceAppPage(params);
  },
  async loadDatabases(params) {
    return getReferenceDatabasePage(params);
  },
  async loadObjects(context) {
    if (context.type !== 'table') {
      return { list: [], total: 0 };
    }
    return getReferenceTablePage(context);
  },
  async loadFields(context) {
    return getReferenceTableFieldPage(context);
  },
};

export function getObjectName(type: FinanceReferenceFieldApi.BindType) {
  switch (type) {
    case 'dict': {
      return '字典';
    }
    case 'view': {
      return '视图';
    }
    case 'api': {
      return '接口';
    }
    case 'json': {
      return 'JSON';
    }
    default: {
      return '表';
    }
  }
}

export function resolveObjectLabel(
  type: FinanceReferenceFieldApi.BindType,
  row: FinanceReferenceFieldApi.ObjectRow | null | undefined,
) {
  if (!row) return '-';
  switch (type) {
    case 'dict': {
      return String(row.functiondesc || row.name || row.Name || row.rowid || '-');
    }
    case 'view':
    case 'json': {
      return String(row.name || row.tbldesc || row.tblname || row.rowid || '-');
    }
    case 'api': {
      return String(row.Name || row.name || row.tbldesc || row.rowid || '-');
    }
    default: {
      return String(row.tbldesc || row.tblname || row.name || row.rowid || '-');
    }
  }
}

export function resolveObjectCode(
  type: FinanceReferenceFieldApi.BindType,
  row: FinanceReferenceFieldApi.ObjectRow | null | undefined,
) {
  if (!row) return '-';
  switch (type) {
    case 'dict': {
      return String(row.name || row.Name || row.rowid || '-');
    }
    case 'view':
    case 'json': {
      return String(row.name || row.tblname || row.rowid || '-');
    }
    case 'api': {
      return String(row.Name || row.name || row.rowid || '-');
    }
    default: {
      return String(row.tblname || row.name || row.rowid || '-');
    }
  }
}
