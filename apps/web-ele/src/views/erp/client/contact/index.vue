<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerContactApi } from '#/api/erp/customer/contact';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteContact, getContact, getContactPage } from '#/api/erp/customer/contact';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElButton, ElDialog, ElLoading, ElMessage } from 'element-plus';

const dataTable = ref<any>(null);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentContact = ref<CrmCustomerContactApi.Contact | null>(null);

function checkEditPermission(rowId: number | string) {
  return !!dataTable.value?.allowEditRow?.(rowId);
}

function checkDeletePermission(rowId: number | string) {
  return !!dataTable.value?.allowDeleteRow?.(rowId);
}

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  currentContact.value = {
    companyType: 1,
    isPrimary: 0,
  } as CrmCustomerContactApi.Contact;
  dialogTitle.value = '新增联系人';
  dialogVisible.value = true;
}

async function handleEdit(row: CrmCustomerContactApi.Contact) {
  const loadingInstance = ElLoading.service({ text: '加载联系人详情中...' });
  try {
    const detail = row.id ? await getContact(row.id) : null;
    currentContact.value = detail || { ...row };
    dialogTitle.value = '编辑联系人';
    dialogVisible.value = true;
  } catch (error) {
    console.error('加载联系人详情失败:', error);
    ElMessage.error('加载联系人详情失败');
  } finally {
    loadingInstance.close();
  }
}

function handleNameClick(row: CrmCustomerContactApi.Contact) {
  if (!checkEditPermission(row.id as any)) {
    ElMessage.warning('暂无编辑权限');
    return;
  }
  handleEdit(row);
}

async function handleDelete(row: CrmCustomerContactApi.Contact) {
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deleting', [row.contactName || '']) });
  try {
    await deleteContact(row.id as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.contactName || '']));
    handleRefresh();
  } catch (error) {
    console.error('删除联系人失败:', error);
    ElMessage.error('删除联系人失败');
  } finally {
    loadingInstance.close();
  }
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentContact.value = null;
}

function handleSaveSuccess() {
  dialogVisible.value = false;
  currentContact.value = null;
  handleRefresh();
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const response = await getContactPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          } as any);
          dataTable.value = response?.dataTable || null;
          return response;
        },
      },
    },
    rowConfig: {
      keyField: 'rowid',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<CrmCustomerContactApi.Contact>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['联系人']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(dataTable && dataTable.allowAddData && dataTable.allowAddData()),
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #name="{ row }">
        <ElButton type="primary" link @click="handleNameClick(row)">
          {{ row.contactName }}
        </ElButton>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: $t('common.edit'),
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              disabled: !checkEditPermission(row.id),
              onClick: () => handleEdit(row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled: !checkDeletePermission(row.id),
              popConfirm: {
                title: `确认删除联系人【${row.contactName}】吗？`,
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="35%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 70vh; overflow-y: auto">
        <Form :company-type="Number(currentContact?.companyType || 1)" :contact-data="currentContact" @close="handleCloseDialog" @save-success="handleSaveSuccess" />
      </div>
    </ElDialog>
  </Page>
</template>
