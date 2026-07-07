<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { DataTable } from '#/api/qyapi';
import type { SystemDeptApi } from '#/api/system/dept';
import type { SystemUserApi } from '#/api/system/user';

import { ref } from 'vue';

import { confirm, Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getStaffList } from '#/api/common/staff-selector';
import {
  deleteUser,
  deleteUserList,
  getUserByRowid,
  getUserPage,
} from '#/api/system/user';
import DeptTree from '#/views/system/user/modules/dept-tree.vue';
import { $t } from '#/locales';

import { useEmployeeGridColumns, useEmployeeGridFormSchema } from '#/views/finance/cashier/settings/employee/data';
import Form from '#/views/finance/cashier/settings/employee/modules/form.vue';

import { ElButton, ElCard, ElLoading, ElMessage } from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const checkedIds = ref<string[]>([]);
const currentDataTable = ref<DataTable | null>(null);
const selectedDept = ref<SystemDeptApi.Dept | null>(null);

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function getStaffKeyword(formValues: Record<string, any>) {
  return normalizeText(
    formValues.UserName || formValues.LoginName || formValues.entInfoUserPhone,
  );
}

async function resolveUserId(row: SystemUserApi.User) {
  if (row.ID) return row.ID;
  if (!row.ROWID) return '';

  const res = await getUserByRowid(row.ROWID);
  const detail = res.list as SystemUserApi.User | undefined;
  if (detail?.ID) {
    Object.assign(row, detail);
    return detail.ID;
  }
  return '';
}

function staffToEmployeeRow(row: Staff): SystemUserApi.User {
  return {
    ROWID: row.ROWID,
    UserName: row.UserName,
    LoginName: row.LoginName,
    DepID: row.DepID,
    DepName: row.DepName,
  } as SystemUserApi.User;
}

function handleRefresh() {
  gridApi.query();
}

function clearDeptSelect() {
  selectedDept.value = null;
  handleRefresh();
}

function handleDeptSelect(dept: SystemDeptApi.Dept) {
  selectedDept.value = dept;
  checkedIds.value = [];
  handleRefresh();
}

function handleCreate() {
  formModalApi.setData({ dept: selectedDept.value }).open();
}

async function handleDelete(row: SystemUserApi.User) {
  const loadingInstance = ElLoading.service({ text: `正在删除 ${row.UserName || ''}` });
  try {
    const userId = await resolveUserId(row);
    if (userId) {
      await deleteUser(userId);
      ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.UserName]));
      handleRefresh();
    } else {
      ElMessage.warning('未找到该员工的用户主键，无法删除');
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

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useEmployeeGridFormSchema(),
  },
  gridOptions: {
    columns: useEmployeeGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const keyword = getStaffKeyword(formValues);
          const deptId = selectedDept.value?.id ? String(selectedDept.value.id) : undefined;

          const staffList = await getStaffList(deptId, keyword);
          const list = staffList.map(staffToEmployeeRow);
          const start = (page.currentPage - 1) * page.page;
          const authRes = await getUserPage({ pageNo: 1, page: 1 });
          if (authRes.dataTable) currentDataTable.value = authRes.dataTable;
          return {
            ...authRes,
            list: list.slice(start, start + page.page),
            total: list.length,
          };
        },
      },
    },
    rowConfig: {
      keyField: 'ROWID',
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

    <div class="flex h-full w-full gap-4">
      <ElCard class="h-full w-1/5" shadow="never">
        <template #header>
          <div class="flex items-center justify-between">
            <span>部门</span>
            <el-button v-if="selectedDept" link type="primary" @click="clearDeptSelect">
              全部
            </el-button>
          </div>
        </template>
        <DeptTree @select="handleDeptSelect" />
      </ElCard>

      <div class="w-4/5">
        <Grid :table-title="selectedDept?.name ? `${selectedDept.name} - 员工列表` : '员工列表'">
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
                  label: $t('common.delete'),
                  type: 'danger',
                  link: true,
                  icon: ACTION_ICON.DELETE,
                  disabled: false,
                  popConfirm: {
                    title: $t('ui.actionMessage.deleteConfirm', [row.UserName]),
                    confirm: handleDelete.bind(null, row),
                  },
                },
              ]"
            />
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
