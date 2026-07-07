<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteBusiness, getBusiness, getBusinessPage } from '#/api/erp/client/business';
import { $t } from '#/locales';

import { canDeleteBusiness, canEditBusiness, useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElButton, ElDialog, ElLoading, ElMessage } from 'element-plus';

const { push } = useRouter();
const dataTable = ref<any>(null);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentBusiness = ref<CrmCustomerBusinessApi.Business | null>(null);

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  currentBusiness.value = {
    businessStatus: 0,
    businessStage: 0,
    companyType: 1,
  } as CrmCustomerBusinessApi.Business;
  dialogTitle.value = '新增商机';
  dialogVisible.value = true;
}

async function handleEdit(row: CrmCustomerBusinessApi.Business) {
  const loadingInstance = ElLoading.service({ text: '加载商机详情中...' });
  try {
    const detail = row.rowid ? await getBusiness(row.rowid) : null;
    currentBusiness.value = detail || row;
    dialogTitle.value = '编辑商机';
    dialogVisible.value = true;
  } catch (error) {
    console.error('加载商机详情失败:', error);
    ElMessage.error('加载商机详情失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleDelete(row: CrmCustomerBusinessApi.Business) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.businessName || '']),
  });
  try {
    await deleteBusiness(String(row.rowid || row.id || ''));
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.businessName || '']));
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || '删除商机失败');
  } finally {
    loadingInstance.close();
  }
}

function handleDetail(row: CrmCustomerBusinessApi.Business) {
  push({ path: '/crm/business/detail', query: { id: String(row.rowid || row.id || '') } });
}

function handleCustomerDetail(row: CrmCustomerBusinessApi.Business) {
  const id = String(row.customerId || '').trim();
  if (!id) return;
  push({ path: `/crm/customer/detail/${id}` });
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentBusiness.value = null;
}

function handleSaveSuccess() {
  dialogVisible.value = false;
  currentBusiness.value = null;
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
          const response = await getBusinessPage({
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
  } as VxeTableGridOptions<CrmCustomerBusinessApi.Business>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新增商机',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(dataTable && dataTable.allowAddData && dataTable.allowAddData()),
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #name="{ row }">
        <ElButton type="primary" link @click="handleDetail(row)">
          {{ row.businessName }}
        </ElButton>
      </template>
      <template #customerName="{ row }">
        <ElButton type="primary" link @click="handleCustomerDetail(row)">
          {{ row.customerName }}
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
              disabled:
                !(dataTable && dataTable.allowEditRow && dataTable.allowEditRow(row.rowid)) ||
                !canEditBusiness(row.businessStatus),
              onClick: () => handleEdit(row),
            },
            {
              label: $t('common.delete'),
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              disabled:
                !(dataTable && dataTable.allowDeleteRow && dataTable.allowDeleteRow(row.rowid)) ||
                !canDeleteBusiness(row.businessStatus),
              popConfirm: {
                title: `确认删除商机【${row.businessName}】吗？`,
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
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 80vh; overflow-y: auto">
        <Form :business-data="currentBusiness" @close="handleCloseDialog" @save-success="handleSaveSuccess" />
      </div>
    </ElDialog>
  </Page>
</template>
