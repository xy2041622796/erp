import type { PageParam } from '@vben/request';

import { generateUUID } from '@vben/utils';

import {
  and,
  buildTable,
  cond,
  extractListAndTotal,
  requestClient,
} from './_shared';

export namespace FinanceBusinessSourceSystemApi {
  export interface Row {
    rowid?: string;
    source_code?: string;
    source_name?: string;
    source_type?: string;
    protocol_type?: string;
    endpoint_config?: string;
    status?: string;
    remark?: string;
    lingma_sys_is_delete?: number;
  }

  export interface AppRow {
    rowid?: string;
    AppName?: string;
    AppType?: string;
    DeveloperName?: string;
    WebUrl?: string;
    AppDesc?: string;
    Icon?: string;
    NameStr?: string;
    EntShortName?: string;
    CreateTime?: string;
    flowstate?: number;
    status?: string;
    Status?: string;
    StateName?: string;
  }

  export interface AppDatabaseRow {
    rowid?: string;
    Id?: string;
    ValueName?: string;
    Name?: string;
    NameStr?: string;
    cnName?: string;
    conName?: string;
    type?: string;
    Type?: string;
    SchemaName?: string;
    ServerName?: string;
    State?: number | string;
    Remark?: string;
    sysid?: string;
    serverId?: string;
  }

  export interface AppTableRow {
    rowid?: string;
    id?: string;
    tblname?: string;
    tbldesc?: string;
    dbid?: string;
    sysid?: string;
    isRef?: number | string;
    crttime?: string;
    dbRow?: AppDatabaseRow;
  }

  export interface TableFieldRow {
    rowid?: string;
    tblid?: string;
    enname?: string;
    cnname?: string;
    description?: string;
    DataType?: string;
    DataTypeName?: string;
    DataLen?: string;
    IsPKey?: number | string;
    IsSys?: number | string;
    AsName?: string;
    ordIdx?: number | string;
  }
}

const TABLE_NAME = 'fbsa_source_system';
const PRIMARY_KEY = 'rowid';

const APP_SELECTOR_FORM_KEY = '0C29366252F30395A83BDC4B9FD5A0E9';
const APP_DB_SELECTOR_FORM_KEY = 'E31199497829CDEB93998F96A8D033FE';

export async function getBusinessSourceSystemPage(
  params: PageParam & {
    keyword?: string;
    status?: string;
    source_type?: string;
  },
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  const conditions: any[] = [cond('lingma_sys_is_delete', 'equal', 0)];

  if (params.keyword) {
    conditions.push(cond('source_name', 'contains', params.keyword));
  }
  if (params.status) {
    conditions.push(cond('status', 'equal', params.status));
  }
  if (params.source_type) {
    conditions.push(cond('source_type', 'equal', params.source_type));
  }

  table.Filter = and(...conditions);
  table.Fields = [
    { Name: 'rowid', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_code', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_name', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'source_type', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'protocol_type', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'status', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'remark', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'endpoint_config', AsName: '', OrderType: null, Order: 0, Group: 0 },
    { Name: 'createtime', AsName: '', OrderType: 'descending', Order: 1, Group: 0 },
  ];

  const res = await requestClient.post(
    table.queryUrl,
    {
      Table: [table],
      PageParam: {
        page: params.page || 10,
        index: params.pageNo || 1,
      },
    },
    {
      headers: table.getRequestHeader(),
      responseReturn: 'raw',
    },
  );

  table.execQueryResult(res);
  return extractListAndTotal(res);
}

export async function getSourceAppPage(
  params: PageParam & {
    keyword?: string;
  },
) {
  const keyword = String(params.keyword || '').trim();
  const filters: any[] = [];

  if (keyword) {
    filters.push({
      Type: 'or',
      Filters: [
        cond('AppName', 'contains', keyword),
        cond('NameStr', 'contains', keyword),
        cond('DeveloperName', 'contains', keyword),
        cond('AppType', 'contains', keyword),
      ],
    });
  }

  const payload = {
    Table: [
      {
        Name: 'view_filter_app',
        MetaName: 'view_filter_app',
        Description: '多租户应用视图',
        Type: '数据库视图',
        DbId: 'EBEFF17BBB6443B185D6FB32FF69F0BB',
        DbName: 'QYVirtualPlat',
        Filter: {
          Type: 'and',
          Filters: filters,
        },
        Fields: [
          { Name: 'rowid', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'AppName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'AppType', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'DeveloperName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'WebUrl', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'AppDesc', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'Icon', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'NameStr', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'EntShortName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'CreateTime', AsName: null, FieldType: 'datetime', OrderType: 'descending', Order: 1, Group: 0 },
          { Name: 'flowstate', AsName: null, FieldType: 'int', OrderType: null, Order: 0, Group: 0 },
        ],
        PrimaryKeyFields: null,
        ForeignKeyFields: null,
        IsBusinessMain: 0,
        DISTINCT: true,
        parentField: null,
        hasChildField: null,
        selfType: 'child',
        topValue: null,
        RequestComplete: null,
        OutputType: 'Table',
        ChildTables: [],
        JoinType: 0,
        JoinFilter: null,
        RelationFilterType: 'and',
        _ApiInfo: {
          url: '/api/DataOperation/GetData',
          SelfRefUrl: '/api/DataOperation/GetSelfRefData',
          insertUrl: '/api/DataOperation/QYVirtualPlat/InsertByCRUD',
          updateUrl: '/api/DataOperation/QYVirtualPlat/UpdateByCRUD',
          deleteUrl: '/api/DataOperation/QYVirtualPlat/DeleteByCRUD',
          batchChangesUrl: '/api/DataOperation/BatchTableOperateRequestByCRUD',
          httpType: 'POST',
        },
        partial: [],
        isPartial: false,
        inputParams: [],
        addApi: '',
        updateApi: '',
        deleteApi: '',
        cacheType: '不设置',
        hasCache: false,
        cacheData: { Added: [] },
        allowAdd: true,
        lmKey: '',
        WhereExp: '',
        framework: 'ej2',
        IsBusiness: false,
      },
    ],
    PageParam: {
      index: params.pageNo || 1,
      size: params.page || 10,
    },
  };

  const res = await requestClient.post('/api/DataOperation/GetData', payload, {
    headers: {
      'x-FormKey': APP_SELECTOR_FORM_KEY,
      'x-StepId': '',
    },
    responseReturn: 'raw',
  });

  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);
  return {
    list: items as FinanceBusinessSourceSystemApi.AppRow[],
    total: Number.isFinite(count) ? count : 0,
  };
}

export async function getCurrentAppDatabasePage(
  params: PageParam & {
    sysid?: string;
    keyword?: string;
  },
) {
  const sysid = String(params.sysid || '').trim();
  const keyword = String(params.keyword || '').trim();

  if (!sysid) {
    return {
      list: [] as FinanceBusinessSourceSystemApi.AppDatabaseRow[],
      total: 0,
    };
  }

  const keywordFilters = keyword
    ? [
        {
          Type: 'or',
          Filters: [
            cond('ValueName', 'contains', keyword),
            cond('Name', 'contains', keyword),
            cond('cnName', 'contains', keyword),
            cond('conName', 'contains', keyword),
            cond('NameStr', 'contains', keyword),
            cond('ServerName', 'contains', keyword),
          ],
        },
      ]
    : [];

  const payload = {
    Table: [
      {
        Name: 'db_relation_show',
        MetaName: 'db_relation_show',
        Description: '数据库关联展示',
        Type: '视图',
        DbId: '1A927C754D924B218FCEA1A3B4AF97C6',
        DbName: '1A927C754D924B218FCEA1A3B4AF97C6',
        Filter: {
          Type: 'and',
          Filters: keywordFilters,
        },
        Fields: [
          { Name: 'rowid', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'Id', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'ValueName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'Name', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'NameStr', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'cnName', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'conName', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'type', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'Type', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'SchemaName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'ServerName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'State', AsName: null, FieldType: 'int', OrderType: null, Order: 0, Group: 0 },
          { Name: 'Remark', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
          { Name: 'sysid', AsName: null, FieldType: 'VARCHAR', OrderType: null, Order: 0, Group: 0 },
          { Name: 'serverId', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, Group: 0 },
        ],
        PrimaryKeyFields: null,
        ForeignKeyFields: null,
        IsBusinessMain: 1,
        DISTINCT: true,
        parentField: null,
        hasChildField: null,
        selfType: 'child',
        topValue: null,
        RequestComplete: null,
        OutputType: 'Table',
        ChildTables: [],
        JoinType: 0,
        JoinFilter: null,
        RelationFilterType: 'and',
        _ApiInfo: {
          url: '/api/DataOperation/GetData',
          SelfRefUrl: '',
          insertUrl: '/api/ViewData/AddViewData',
          updateUrl: '/api/ViewData/EditViewData',
          deleteUrl: '/api/ViewData/DelViewData',
          batchChangesUrl: '/api/ViewData/BatchData',
          httpType: 'POST',
        },
        partial: [],
        isPartial: false,
        inputParams: [
          {
            Name: 'database',
            AsName: null,
            FieldType: 'varchar',
            OrderType: null,
            Order: 0,
            ValueFun: {
              Value: 'database',
              Type: 'GetConstValue',
            },
            Value: 'database',
            Description: '类型',
            IsPKey: false,
            IsOutput: false,
            Group: 0,
          },
          {
            Name: 'sysid',
            AsName: null,
            FieldType: 'varchar',
            OrderType: null,
            Order: 0,
            ValueFun: {
              ParamName: 'sysid',
              Value: null,
              Type: 'SystemData',
            },
            Value: sysid,
            Description: '系统id',
            IsPKey: false,
            IsOutput: false,
            Group: 0,
          },
        ],
        addApi: '',
        updateApi: '',
        deleteApi: '',
        cacheType: '不设置',
        hasCache: false,
        cacheData: { Added: [] },
        allowAdd: true,
        lmKey: '',
        WhereExp: '',
        framework: 'ej2',
        IsBusiness: true,
      },
    ],
    PageParam: {
      index: params.pageNo || 1,
      size: params.page || 10,
    },
  };

  const res = await requestClient.post('/api/DataOperation/GetData', payload, {
    headers: {
      'x-FormKey': APP_DB_SELECTOR_FORM_KEY,
      'x-StepId': '',
    },
    responseReturn: 'raw',
  });

  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);

  return {
    list: items as FinanceBusinessSourceSystemApi.AppDatabaseRow[],
    total: Number.isFinite(count) ? count : 0,
  };
}

export async function getCurrentAppTablePage(
  params: PageParam & {
    sysid?: string;
    dbid?: string;
    keyword?: string;
  },
) {
  const sysid = String(params.sysid || '').trim();
  const dbid = String(params.dbid || '').trim();
  const keyword = String(params.keyword || '').trim();

  if (!sysid || !dbid) {
    return {
      list: [] as FinanceBusinessSourceSystemApi.AppTableRow[],
      total: 0,
    };
  }

  const filters: any[] = [
    {
      Type: 'and',
      Filters: [
        {
          Type: 'cond',
          Field: 'dbid',
          Operator: 'equal',
          Value: null,
          ValueFun: {
            Type: 'GetConstValue',
            Value: dbid,
          },
        },
      ],
    },
  ];

  if (keyword) {
    filters.push({
      Type: 'or',
      Filters: [
        cond('tblname', 'contains', keyword),
        cond('tbldesc', 'contains', keyword),
      ],
    });
  }

  const payload = {
    Table: [
      {
        Name: 'View_TblRelation_List',
        MetaName: 'View_TblRelation_List',
        ShortName: null,
        Description: '表关系数据',
        Type: '数据库视图',
        DbId: 'EBEFF17BBB6443B185D6FB32FF69F0BB',
        DbName: 'QYVirtualPlat',
        Filter: {
          Type: 'and',
          Filters: filters,
        },
        Fields: [
          { Name: 'tblname', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'tblname', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'id', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'id', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'isRef', AsName: null, FieldType: 'bigint', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'isRef', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'dbid', AsName: null, FieldType: 'char', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'dbid', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'rowid', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'rowid', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'tbldesc', AsName: null, FieldType: 'mediumtext', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'tbldesc', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'crttime', AsName: null, FieldType: 'varchar', OrderType: 'descending', Order: 1, ValueFun: null, Value: null, Description: 'crttime', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'sysid', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'sysid', IsPKey: false, IsOutput: true, Group: 0 },
        ],
        PrimaryKeyFields: null,
        ForeignKeyFields: null,
        IsBusinessMain: 0,
        DISTINCT: true,
        parentField: null,
        hasChildField: null,
        selfType: 'child',
        topValue: null,
        RequestComplete: null,
        OutputType: 'Table',
        ChildTables: [],
        JoinType: 0,
        JoinFilter: null,
        RelationFilterType: 'and',
        partial: [],
        isPartial: false,
        inputParams: [],
        addApi: null,
        updateApi: null,
        deleteApi: null,
        cacheType: '不设置',
        hasCache: false,
        cacheData: {
          Added: [],
        },
        allowAdd: true,
        lmKey: '',
        WhereExp: '',
        framework: 'ej2',
        IsBusiness: false,
        isGetData: true,
        _CurrentRow: null,
        _SelectRows: null,
      },
    ],
    PageParam: {
      index: params.pageNo || 1,
      size: params.page || 15,
    },
  };

  const res = await requestClient.post('/api/DataOperation/GetData', payload, {
    headers: {
      'x-FormKey': '0BCD0448FBD9483D9A9FD2FB20C2FAB7',
      'x-StepId': '',
    },
    responseReturn: 'raw',
  });

  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);

  return {
    list: items as FinanceBusinessSourceSystemApi.AppTableRow[],
    total: Number.isFinite(count) ? count : 0,
  };
}

export async function getCurrentAppAllTablePage(
  params: PageParam & {
    appDesc?: string;
    sysid?: string;
    keyword?: string;
  },
) {
  let sysid = String(params.sysid || '').trim();
  const keyword = String(params.keyword || '').trim();
  const appDesc = String(params.appDesc || '数据资产管理').trim();

  if (!sysid) {
    const appRes = await getSourceAppPage({
      pageNo: 1,
      page: 200,
      keyword: appDesc,
    });
    const matched = (appRes.list || []).find(
      (item) => String(item.AppDesc || '').trim() === appDesc,
    );
    sysid = String(matched?.rowid || appRes.list?.[0]?.rowid || '').trim();
  }

  if (!sysid) {
    return {
      list: [] as FinanceBusinessSourceSystemApi.AppTableRow[],
      total: 0,
    };
  }

  const dbRes = await getCurrentAppDatabasePage({
    pageNo: 1,
    page: 200,
    sysid,
    keyword: '',
  });
  const dbList = dbRes.list || [];
  if (!dbList.length) {
    return {
      list: [] as FinanceBusinessSourceSystemApi.AppTableRow[],
      total: 0,
    };
  }

  const tableGroups = await Promise.all(
    dbList.map(async (dbRow) => {
      const tableRes = await getCurrentAppTablePage({
        pageNo: 1,
        page: 500,
        sysid,
        dbid: String(dbRow.Id || dbRow.rowid || ''),
        keyword,
      });
      return (tableRes.list || []).map((item) => ({
        ...item,
        dbRow,
      }));
    }),
  );

  const merged = tableGroups.flat();
  const start = Math.max((Number(params.pageNo || 1) - 1) * Number(params.page || merged.length || 1), 0);
  const end = start + Number(params.page || merged.length || 1);

  return {
    list: merged.slice(start, end),
    total: merged.length,
  };
}

export async function getTableFieldPage(
  params: PageParam & {
    tblid?: string;
    keyword?: string;
  },
) {
  const tblid = String(params.tblid || '').trim();
  const keyword = String(params.keyword || '').trim();

  if (!tblid) {
    return {
      list: [] as FinanceBusinessSourceSystemApi.TableFieldRow[],
      total: 0,
    };
  }

  const filters: any[] = [
    {
      Type: 'and',
      Filters: [
        {
          Type: 'cond',
          Field: 'tblid',
          Operator: 'equal',
          Value: null,
          ValueFun: {
            Type: 'GetConstValue',
            Value: tblid,
          },
        },
      ],
    },
  ];

  if (keyword) {
    filters.push({
      Type: 'or',
      Filters: [
        cond('enname', 'contains', keyword),
        cond('cnname', 'contains', keyword),
        cond('description', 'contains', keyword),
      ],
    });
  }

  const payload = {
    Table: [
      {
        Name: 'Base_TblField',
        MetaName: 'Base_TblField',
        ShortName: null,
        Description: '字段表',
        Type: '数据库表',
        DbId: 'EBEFF17BBB6443B185D6FB32FF69F0BB',
        DbName: 'QYVirtualPlat',
        Filter: {
          Type: 'and',
          Filters: filters,
        },
        Fields: [
          { Name: 'rowid', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: 'rowid', IsPKey: true, IsOutput: true, Group: 0 },
          { Name: 'tblid', AsName: null, FieldType: 'char', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '表ID', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'enname', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '字段名', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'cnname', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '中文名', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'description', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '摘要', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'DataType', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '字段类型', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'DataTypeName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '字段类型名称', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'DataLen', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '字段长度', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'IsPKey', AsName: null, FieldType: 'tinyint', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '是否为主键', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'IsSys', AsName: null, FieldType: 'int', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '是否系统字段', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'AsName', AsName: null, FieldType: 'varchar', OrderType: null, Order: 0, ValueFun: null, Value: null, Description: '别名', IsPKey: false, IsOutput: true, Group: 0 },
          { Name: 'ordIdx', AsName: null, FieldType: 'tinyint', OrderType: 'ascending', Order: 1, ValueFun: null, Value: null, Description: '排序', IsPKey: false, IsOutput: true, Group: 0 },
        ],
        PrimaryKeyFields: null,
        ForeignKeyFields: null,
        IsBusinessMain: 0,
        DISTINCT: true,
        parentField: null,
        hasChildField: null,
        selfType: 'child',
        topValue: null,
        RequestComplete: null,
        OutputType: 'Table',
        ChildTables: [],
        JoinType: 0,
        JoinFilter: null,
        RelationFilterType: 'and',
        partial: [],
        isPartial: false,
        inputParams: [],
        addApi: '',
        updateApi: '',
        deleteApi: '',
        cacheType: '不设置',
        hasCache: false,
        cacheData: {
          Added: [],
        },
        allowAdd: true,
        lmKey: '',
        WhereExp: '',
        framework: 'ej2',
        IsBusiness: false,
      },
    ],
    PageParam: {
      index: params.pageNo || 1,
      size: params.page || 15,
    },
  };

  const res = await requestClient.post('/api/DataOperation/GetData', payload, {
    headers: {
      'x-FormKey': '848EECD3C60147BD97E232A77794AEA3',
      'x-StepId': '',
    },
    responseReturn: 'raw',
  });

  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const count = Number(resultData?.Count ?? items.length ?? 0);

  return {
    list: items as FinanceBusinessSourceSystemApi.TableFieldRow[],
    total: Number.isFinite(count) ? count : 0,
  };
}

export async function createBusinessSourceSystem(
  data: FinanceBusinessSourceSystemApi.Row,
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  const payload = {
    ...data,
    rowid: data.rowid || generateUUID(),
    lingma_sys_is_delete: 0,
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([payload], [], []), {
    headers: table.getRequestHeader(),
  });
}

export async function updateBusinessSourceSystem(
  data: FinanceBusinessSourceSystemApi.Row & { rowid: string },
) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  return requestClient.post(table.saveUrl, table.getSaveParam([], [data], []), {
    headers: table.getRequestHeader(),
  });
}

export async function deleteBusinessSourceSystem(rowid: string) {
  const table = buildTable(TABLE_NAME, PRIMARY_KEY);
  return requestClient.post(
    table.saveUrl,
    table.getSaveParam([], [], [{ rowid, lingma_sys_is_delete: 1 }]),
    { headers: table.getRequestHeader() },
  );
}
