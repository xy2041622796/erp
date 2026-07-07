import type { Ref } from 'vue';

import type { DataTable } from '#/api/qyapi';

function getAuthTable(tableRef: Ref<DataTable | null | undefined>) {
  return tableRef.value || null;
}

function fallbackWhenNoTable() {
  return true;
}

export function useDataTableAuth(tableRef: Ref<DataTable | null | undefined>) {
  const canAdd = () => {
    const table = getAuthTable(tableRef);
    if (!table) return fallbackWhenNoTable();
    return Boolean(table.allowAddData?.() ?? table.allowAdd ?? true);
  };

  const canEditRow = (rowKey?: string) => {
    const table = getAuthTable(tableRef);
    if (!table) return fallbackWhenNoTable();
    if (!rowKey) return true;
    return Boolean(table.allowEditRow?.(rowKey) ?? true);
  };

  const canDeleteRow = (rowKey?: string) => {
    const table = getAuthTable(tableRef);
    if (!table) return fallbackWhenNoTable();
    if (!rowKey) return true;
    return Boolean(table.allowDeleteRow?.(rowKey) ?? true);
  };

  const canEditField = (rowKey?: string, fieldName?: string) => {
    const table = getAuthTable(tableRef);
    if (!table) return fallbackWhenNoTable();
    if (!rowKey || !fieldName) return true;
    return Boolean(table.isEditField?.(rowKey, fieldName) ?? true);
  };

  return { canAdd, canEditRow, canDeleteRow, canEditField };
}
