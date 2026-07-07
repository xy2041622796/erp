import type { DataTable } from '#/api/qyapi';

import { and, cond } from '#/api/qyapi';
import { createFinanceDataTable } from '#/api/erp/finance/common/account-set-scope';
import { getStoredAccountSetId } from '#/utils/accountSet';

export const PROJECT_DEFAULT_ACCOUNT_SET_ID = 'f7497e4470f04a52fcaf808770c46014';

export function getProjectAccountSetId() {
  return String(getStoredAccountSetId() || PROJECT_DEFAULT_ACCOUNT_SET_ID).trim();
}

function applyProjectAccountSetToRows(rows: any[]) {
  const accountSetId = getProjectAccountSetId();
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

function withProjectAccountSetFilter(filter: any) {
  const accountSetId = getProjectAccountSetId();
  if (!accountSetId) return filter;

  const accountSetCond = cond('account_set_id', 'equal', accountSetId);
  if (!filter) return accountSetCond;

  const hasAccountSetFilter = (() => {
    if (filter?.Field === 'account_set_id') return true;
    if (!Array.isArray(filter?.Filters)) return false;
    return filter.Filters.some((item: any) => item?.Field === 'account_set_id');
  })();

  return hasAccountSetFilter ? filter : and(filter, accountSetCond);
}

export function createProjectDataTable(
  formKey: string,
  tableName: string,
  dbName: string,
  primaryKey: string,
): DataTable {
  const table = createFinanceDataTable(formKey, tableName, dbName, primaryKey);

  const rawGetSaveParam = table.getSaveParam.bind(table);
  table.getSaveParam = function (added: any[], changed: any[], deleted: any[]) {
    applyProjectAccountSetToRows(added);
    applyProjectAccountSetToRows(changed);
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
      withProjectAccountSetFilter(filter),
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
    json.Filter = withProjectAccountSetFilter(json.Filter ?? table.Filter ?? null);
    return json;
  } as typeof table.toJSON;

  return table;
}
