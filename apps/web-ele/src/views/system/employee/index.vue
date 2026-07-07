<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DataTable } from '#/api/qyapi';
import type { SystemUserApi } from '#/api/system/user';

import { ref } from 'vue';

import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { DICT_TYPE } from '@vben/constants';
import { getDictLabel } from '@vben/hooks';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteUser,
  deleteUserList,
  getUserPage,
  updateUserStatus,
} from '#/api/system/user';
import { $t } from '#/locales';

import { useEmployeeGridColumns, useEmployeeGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage } from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const checkedIds = ref<string[]>([]);
const currentDataTable = ref<DataTable | null>(null);

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  formModalApi.setData(null).open();
}

function handleEdit(row: SystemUserApi.User) {
  formModalApi.setData(row).open();
}

async function handleDelete(row: SystemUserApi.User) {
  const loadingInstance = ElLoading.service({ text: `正在删除 ${row.UserName || ''}` });
  try {
    if (row.ID) {
      await deleteUser(row.ID);
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.UserName]));
      handleRefresh();
    }
  } finally {
    loadingInstance.close();
  }
}

async function handleDeleteBatch() {
  await confirm($t('ui.actionMessage.deleteBatchConfirm'));
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deletingBatch') });
  try {
    await deleteUserList(checkedIds.value);
    checkedIds.value = [];
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

function handleRowCheckboxChange({ records }: { records: SystemUserApi.User[] }) {
  checkedIds.value = records.map((item) => item.ID!).filter(Boolean);
}

async function handleStatusChange(
  newStatus: number,
  row: SystemUserApi.User,
): Promise<boolean | undefined> {
  await confirm({
    content: `确认将员工【${row.UserName}】状态切换为【${getDictLabel(DICT_TYPE.COMMON_STATUS, newStatus)}】吗？`,
  });
  if (!row.ID) return false;

  await updateUserStatus(row.ID, newStatus);
  ElMessage.success($t('ui.actionMessage.operationSuccess'));
  return true;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useEmployeeGridFormSchema(),
  },
  gridOptions: {
    columns: useEmployeeGridColumns(handleStatusChange),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getUserPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          if (res.dataTable) currentDataTable.value = res.dataTable;
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'ID',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<SystemUserApi.User>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <Grid table-title="员工列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增员工',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !currentDataTable?.allowAddData(),
              onClick: handleCreate,
            },
            {
              label: $t('ui.actionTitle.deleteBatch'),
              type: 'danger',
              icon: ACTION_ICON.DELETE,
              disabled: isEmpty(checkedIds),
              onClick: handleDeleteBatch,
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              disabled: !currentDataTable?.allowEditRow(row.ID),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled: !currentDataTable?.allowDeleteRow(row.ID),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.UserName]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
