import { and, cond, DataTable } from '#/api/qyapi';
import { getStoredAccountSetId } from '#/utils/accountSet';

function getTableName(table: DataTable) {
  return `${table.DbName}@${table.Name}`;
}

function shouldApplyAccountSetScope(table: DataTable) {
  return getTableName(table) !== 'LMBill@Bil_Account_Info';
}

function withAccountSetFilter(table: DataTable, filter: any) {
  if (!shouldApplyAccountSetScope(table)) return filter;

  const accountSetId = getStoredAccountSetId();
  if (!accountSetId) return filter;

  const accountSetCond = cond('account_set_id', 'equal', accountSetId);
  if (!filter) return accountSetCond;

  const hasAccountSetFilter = (() => {
    if (filter?.Field === 'account_set_id') return true;
    if (!Array.isArray(filter?.Filters)) return false;
    return filter.Filters.some((item: any) => item?.Field === 'account_set_id');
  })();

  if (hasAccountSetFilter) return filter;
  return and(filter, accountSetCond);
}

function applyAccountSetToRows(table: DataTable, rows: any[]) {
  if (!shouldApplyAccountSetScope(table)) return;

  const accountSetId = getStoredAccountSetId();
  if (!accountSetId) return;

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    if (
      row.account_set_id === undefined ||
      row.account_set_id === null ||
      row.account_set_id === ''
    ) {
      row.account_set_id = accountSetId;
    }
  });
}

function withAccountSetFilterCurrent(table: DataTable, filter: any) {
  if (!shouldApplyAccountSetScope(table)) return filter;

  const accountSetId = getStoredAccountSetId();
  if (!accountSetId) return filter;

  const accountSetCond = cond('account_set_id', 'equal', accountSetId);
  if (!filter) return accountSetCond;

  const hasAccountSetFilter = (() => {
    if (filter?.Field === 'account_set_id') return true;
    if (!Array.isArray(filter?.Filters)) return false;
    return filter.Filters.some((item: any) => item?.Field === 'account_set_id');
  })();

  if (hasAccountSetFilter) return filter;
  return and(filter, accountSetCond);
}

// 创建过滤当前账套的 DataTable
export function createFinanceDataTableCurrent(
  formKey: string,
  name: string,
  dbName: string,
  primaryKeyField: string,
) {
  const table = new DataTable(formKey, name, dbName, primaryKeyField);

  const rawGetSaveParam = table.getSaveParam.bind(table);
  table.getSaveParam = function (
    added: any[],
    changed: any[],
    deleted: any[],
  ) {
    applyAccountSetToRows(table, added);
    applyAccountSetToRows(table, changed);
    return rawGetSaveParam(added, changed, deleted);
  } as typeof table.getSaveParam;

  const rawGetQueryParam = table.getQueryParam.bind(table);
  table.getQueryParam = function (
    outputType: string,
    filter: any,
    inputParams: any,
    sortFields: any,
    page = 0,
    index = 0,
    keyField: null | string = null,
    parentField: null | string = null,
    nodeid: null | string = null,
    hasChildField = 'hasChild',
    type = 'child',
  ) {
    return rawGetQueryParam(
      outputType,
      withAccountSetFilterCurrent(table, filter),
      inputParams,
      sortFields,
      page,
      index,
      keyField,
      parentField,
      nodeid,
      hasChildField,
      type,
    );
  } as typeof table.getQueryParam;

  const rawToJSON = table.toJSON.bind(table);
  table.toJSON = function () {
    const json = rawToJSON() as any;
    json.Filter = withAccountSetFilterCurrent(table, json.Filter ?? table.Filter ?? null);
    return json;
  } as typeof table.toJSON;

  return table;
}

export function createFinanceDataTable(
  formKey: string,
  name: string,
  dbName: string,
  primaryKeyField: string,
) {
  const table = new DataTable(formKey, name, dbName, primaryKeyField);

  const rawGetSaveParam = table.getSaveParam.bind(table);
  table.getSaveParam = function (
    added: any[],
    changed: any[],
    deleted: any[],
  ) {
    applyAccountSetToRows(table, added);
    applyAccountSetToRows(table, changed);
    return rawGetSaveParam(added, changed, deleted);
  } as typeof table.getSaveParam;

  const rawGetQueryParam = table.getQueryParam.bind(table);
  table.getQueryParam = function (
    outputType: string,
    filter: any,
    inputParams: any,
    sortFields: any,
    page = 0,
    index = 0,
    keyField: null | string = null,
    parentField: null | string = null,
    nodeid: null | string = null,
    hasChildField = 'hasChild',
    type = 'child',
  ) {
    return rawGetQueryParam(
      outputType,
      withAccountSetFilter(table, filter),
      inputParams,
      sortFields,
      page,
      index,
      keyField,
      parentField,
      nodeid,
      hasChildField,
      type,
    );
  } as typeof table.getQueryParam;

  const rawToJSON = table.toJSON.bind(table);
  table.toJSON = function () {
    const json = rawToJSON() as any;
    json.Filter = withAccountSetFilter(table, json.Filter ?? table.Filter ?? null);
    return json;
  } as typeof table.toJSON;

  return table;
}
