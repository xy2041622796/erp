<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteCustomer, exportCustomer, getCustomerPage } from '#/api/erp/customer';
import { $t } from '#/locales';

import SupplierForm from './modules/form.vue';
import { useGridColumns, useGridFormSchema } from './data';

import { ElButton, ElDialog, ElLoading, ElMessage } from 'element-plus';

const dataTable = ref<any>(null);
const dialogVisible = ref(false);
const currentSupplier = ref<CrmCustomerApi.Customer | null>(null);
const currentReadonly = ref(false);

function checkEditPermission(rowId: number | string) {
  return !!dataTable.value?.allowEditRow?.(rowId);
}

function checkDeletePermission(rowId: number | string) {
  return !!dataTable.value?.allowDeleteRow?.(rowId);
}

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const formValues = (gridApi.formApi?.getValues?.() || {}) as any;
  const createTimeRange = Array.isArray(formValues.createTime) ? formValues.createTime : [];
  const data = await exportCustomer({
    companyType: 2,
    includeAllStates: true,
    customerCode: formValues.customerCode,
    name: formValues.name,
    contactName: formValues.contactName,
    mobile: formValues.mobile,
    telephone: formValues.telephone,
    ownerUserName: formValues.ownerUserName,
    createTimeStart: createTimeRange[0],
    createTimeEnd: createTimeRange[1],
  });
  downloadFileFromBlobPart({ fileName: '供应商档案.xls', source: data });
}

function handleCreate() {
  currentSupplier.value = { companyType: 2 } as CrmCustomerApi.Customer;
  currentReadonly.value = false;
  dialogVisible.value = true;
}

function handleEdit(row: CrmCustomerApi.Customer) {
  currentSupplier.value = { ...row, companyType: 2 } as CrmCustomerApi.Customer;
  currentReadonly.value = false;
  dialogVisible.value = true;
}

function handleNameClick(row: CrmCustomerApi.Customer) {
  if (!checkEditPermission(row.id as any)) return ElMessage.warning('暂无编辑权限');
  handleEdit(row);
}

async function handleDelete(row: CrmCustomerApi.Customer) {
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deleting', [row.name]) });
  try {
    await deleteCustomer(row.id as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } catch (error) {
    console.error('删除供应商失败:', error);
    ElMessage.error('删除供应商失败');
  } finally {
    loadingInstance.close();
  }
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentSupplier.value = null;
  currentReadonly.value = false;
}

function handleSaved() {
  handleCloseDialog();
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
          const createTimeRange = Array.isArray((formValues as any).createTime)
            ? (formValues as any).createTime
            : [];
          const response = await getCustomerPage({
            index: page.currentPage,
            size: page.page,
            companyType: 2,
            includeAllStates: true,
            customerCode: (formValues as any).customerCode,
            name: (formValues as any).name,
            contactName: (formValues as any).contactName,
            mobile: (formValues as any).mobile,
            telephone: (formValues as any).telephone,
            ownerUserName: (formValues as any).ownerUserName,
            createTimeStart: createTimeRange[0],
            createTimeEnd: createTimeRange[1],
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
  } as VxeTableGridOptions<CrmCustomerApi.Customer>,
});

</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增供应商',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(dataTable && dataTable.allowAddData && dataTable.allowAddData()),
              onClick: handleCreate,
            },
            {
              label: $t('ui.actionTitle.export'),
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              disabled: false,
              onClick: handleExport,
            },
          ]"
        />
      </template>

      <template #name="{ row }">
        <ElButton type="primary" link @click="handleNameClick(row)">
          {{ row.name }}
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
                title: '确认删除供应商【' + row.name + '】吗？',
                confirm: () => handleDelete(row),
              },
            },
          ]"
        />
      </template>
    </Grid>

    <ElDialog
      v-model="dialogVisible"
      :title="currentSupplier?.id || currentSupplier?.rowid ? '编辑供应商' : '新增供应商'"
      width="42%"
      top="6vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 86vh; overflow-y: auto">
        <SupplierForm
          :customer-data="currentSupplier"
          :readonly="currentReadonly"
          @close="handleCloseDialog"
          @save-success="handleSaved"
        />
      </div>
    </ElDialog>
  </Page>
</template>
