import type { Ref } from 'vue';

import { computed, ref } from 'vue';

import { ElLoading, ElMessage } from 'element-plus';

import { DataRowAuth } from '#/api/qyapi';

type Perm =
  | 'data:add'
  | 'data:allDelete'
  | 'row:add'
  | 'row:delete'
  | 'row:edit'
  | 'row:view';

interface DataTableLike {
  items?: any[];
  allowAddData?: () => boolean;
  allowAdd?: boolean;
  allowDeleteRow?: (pk?: unknown) => boolean;
  allowEditRow?: (pk?: unknown) => boolean;
  hasShowField?: (pk?: unknown) => boolean;
}

interface GridApiLike {
  reload?: (params?: Record<string, any>) => Promise<any>;
  query?: (params?: Record<string, any>) => Promise<any>;
}

interface UpdateStatusOptions {
  idField: string;
  approvedValue?: number | string;
}

export function useDataTablePermission() {
  const dataTable: Ref<DataTableLike | null> = ref(null);

  const hasPermission = (perm: Perm, pk?: unknown) => {
    const tb = dataTable.value;
    if (!tb) return false;
    if (perm === 'data:add' || perm === 'row:add') {
      return typeof tb.allowAddData === 'function'
        ? tb.allowAddData()
        : Boolean(tb.allowAdd);
    }

    if (perm === 'data:allDelete' || perm === 'row:delete') {
      const items = tb.items || [];
      let pkId = pk;
      if (!pk && items.length > 0) {
        pkId = items[0]?.rowid;
      }
      if (items.length === 0) return false;
      if (!pkId) return false;
      return typeof tb.allowDeleteRow === 'function'
        ? tb.allowDeleteRow(pkId)
        : false;
    }

    if (perm === 'row:edit') {
      const items = tb.items || [];
      if (items.length === 0) return false;
      return typeof tb.allowEditRow === 'function'
        ? tb.allowEditRow(pk)
        : false;
    }

    if (perm === 'row:view') {
      const items = tb.items || [];
      if (items.length === 0) return false;
      return typeof tb.hasShowField === 'function' ? tb.hasShowField(pk) : true;
    }

    return false;
  };

  // field 级别权限：柯里化，先绑定行 data，再判断字段
  const hasFieldPermission = (
    data: any,
    perm?: 'fd:edit' | 'fd:show',
    field?: string,
  ): any => {
    // 1. 如果传了三个参数，直接返回判定结果 boolean
    if (perm && field) {
      const m = new DataRowAuth(data);
      if (perm === 'fd:edit') {
        return m.isEditField(field);
      }
      if (perm === 'fd:show') {
        return m.isShowField(field);
      }
      return false;
    }

    // 2. 否则返回一个柯里化的函数 (perm, field) => boolean
    const m = new DataRowAuth(data);
    return (p: 'fd:edit' | 'fd:show', f: string, t?: string): boolean => {
      if (t === 'create') {
        return false;
      }
      if (p === 'fd:edit') {
        return m.isEditField(f);
      }

      if (p === 'fd:show') {
        return m.isShowField(f);
      }

      return false;
    };
  };

  const getFirstRowPk = (rowKeyField: string) =>
    dataTable.value?.items?.[0]?.[rowKeyField];

  return {
    dataTable,
    hasPermission,
    hasFieldPermission,
    getFirstRowPk,
    dataTableReady: computed(() => Boolean(dataTable.value)),
  };
}

type IdType = number | string;

export function useCrudHandlers({
  gridApi,
  apiDelete,
  apiUpdateStatus,
  checkedIdField,
}: {
  apiDelete: (ids: IdType | IdType[]) => Promise<any>;
  apiUpdateStatus: (id: IdType, status: IdType) => Promise<any>;
  checkedIdField: string;
  gridApi: GridApiLike;
}) {
  const checkedIds: Ref<IdType[]> = ref([]);

  const handleRowCheckboxChange = ({ records }: { records: any[] }) => {
    checkedIds.value = records.map((item) => item?.[checkedIdField]);
  };

  const handleRefresh = async () => {
    if (gridApi?.reload) {
      try {
        await gridApi.reload();
        return;
      } catch {}
    }
    if (gridApi?.query) {
      await gridApi.query();
    }
  };

  const handleDelete = async (ids: IdType | IdType[]) => {
    const loading = ElLoading.service({ fullscreen: true });
    try {
      await apiDelete(ids);
      ElMessage.success('删除成功');
      await handleRefresh();
    } finally {
      loading.close();
    }
  };

  const handleUpdateStatus = async (
    row: Record<string, any>,
    status: IdType,
    { idField }: UpdateStatusOptions,
  ) => {
    const loading = ElLoading.service({ fullscreen: true });
    try {
      await apiUpdateStatus(row[idField], status);
      ElMessage.success('操作成功');
      await handleRefresh();
    } finally {
      loading.close();
    }
  };

  return {
    checkedIds,
    handleRowCheckboxChange,
    handleRefresh,
    handleDelete,
    handleUpdateStatus,
  };
}
