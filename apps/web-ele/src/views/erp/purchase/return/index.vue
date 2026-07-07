<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseReturnApi } from '#/api/erp/purchase/return';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { saveDimensionResultByRulePayload } from '#/api/erp/finance/dimension/config';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import {
  deletePurchaseReturn,
  exportPurchaseReturn,
  getPurchaseReturn,
  getPurchaseReturnPage,
  updatePurchaseReturnStatus,
} from '#/api/erp/purchase/return';
import { createPurchaseReturnCheckDrafts } from '#/api/erp/stock/return-check';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { useDataTablePermission } from '../../shared/useDataTablePermission';
import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage } from 'element-plus';

defineOptions({ name: 'ErpPurchaseReturn' });

const PURCHASE_RETURN_EXPORT_ENCODING_ID = 'F7DE984B16DD9127A16C600FE9C1381E';

const { dataTable, hasPermission } = useDataTablePermission();

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form, destroyOnClose: true });

function handleRefresh() {
  gridApi.query();
}

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: ErpPurchaseReturnApi.PurchaseReturn[] }) {
  checkedIds.value = records.map((item) => item.id!).filter(Boolean);
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpPurchaseReturnApi.PurchaseReturn) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

function handleDetail(row: ErpPurchaseReturnApi.PurchaseReturn) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deleting') });
  try {
    await deletePurchaseReturn(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generatePurchaseReturnDimensionOnApprove(row: ErpPurchaseReturnApi.PurchaseReturn) {
  const purchaseReturnRow = row.id ? await getPurchaseReturn(String(row.id)) : row;
  await saveDimensionResultByRulePayload('PURCHASE_RETURN', purchaseReturnRow as any, null, {
    allowOverwrite: true,
    skipWhenNoRule: true,
  });
}

async function handleUpdateStatus(row: ErpPurchaseReturnApi.PurchaseReturn, status: number) {
  const loadingInstance = ElLoading.service({ text: `确定${status === 20 ? '审批' : '反审批'}该订单吗？` });
  try {
    await updatePurchaseReturnStatus(row.id!, status);
    if (status === 20) {
      try {
        const latestDoc = await getPurchaseReturn(String(row.id || ''));
        const created = await createPurchaseReturnCheckDrafts(latestDoc);
        await generatePurchaseReturnDimensionOnApprove(row);
        ElMessage.success(`审批成功，已生成 ${created.length} 张检测草稿，并已生成维度`);
      } catch (error: any) {
        try {
          await updatePurchaseReturnStatus(String(row.id || ''), 10);
        } catch (rollbackError: any) {
          ElMessage.error(`审批后生成检测草稿失败，且回滚审批失败：${rollbackError?.message || '未知异常'}；原始错误：${error?.message || '未知异常'}`);
          return;
        }
        ElMessage.error(`检测草稿生成失败，已回滚审批：${error?.message || '未知异常'}`);
        handleRefresh();
        return;
      }
    } else {
      ElMessage.success('反审批成功');
    }
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function handleExport() {
  const data = await exportPurchaseReturn(await gridApi.formApi.getValues(), PURCHASE_RETURN_EXPORT_ENCODING_ID);
  downloadFileFromBlobPart({ fileName: '采购退货.xls', source: data });
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getPurchaseReturnPage({ index: page.currentPage, size: page.page, ...formValues });
          if ((res as any).dataTable) dataTable.value = (res as any).dataTable;
          return res;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpPurchaseReturnApi.PurchaseReturn>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});

const supplierOptions = ref<any[]>([]);
const accountList = ref<any[]>([]);
const userList = ref<any[]>([]);

onMounted(async () => {
  supplierOptions.value = await getSupplierSimpleList();
  accountList.value = await getAccountSimpleList();
  userList.value = await getSimpleUserList();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />

    <Grid table-title="采购退货列表">
      <template #supplier_id="{ row }">
        {{ supplierOptions.find((item) => item.rowid === row.supplier_id)?.name || row.supplier_id }}
      </template>
      <template #account_id="{ row }">
        {{ accountList.find((item) => item.rowid === row.account_id)?.name || row.account_id }}
      </template>
      <template #createuser="{ row }">
        {{ userList.find((item) => item.ROWID === row.createuser)?.UserName || row.createuser }}
      </template>
      <template #toolbar-tools>
        <TableAction :actions="[
          { label: '采购退货', type: 'primary', icon: ACTION_ICON.ADD, tooltip: { content: '创建新的采购退货单', placement: 'top' }, disabled: !(hasPermission('data:add')), onClick: handleCreate },
          { label: '导出数据', type: 'primary', icon: ACTION_ICON.DOWNLOAD, tooltip: { content: '导出采购退货数据为Excel文件', placement: 'top' }, disabled: !(hasPermission('data:add')), onClick: handleExport },
          { label: '批量删除', type: 'danger', tooltip: { content: '批量删除已选中的采购退货单', placement: 'top' }, disabled: (isEmpty(checkedIds)) || !(hasPermission('data:allDelete')), icon: ACTION_ICON.DELETE,  popConfirm: { title: `是否删除所选中数据？`, confirm: handleDelete.bind(null, checkedIds) } },
        ]" />
      </template>
      <template #actions="{ row }">
        <TableAction :actions="[
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.VIEW, tooltip: { content: $t('common.detail'), placement: 'top' }, disabled: !(hasPermission('row:view', row.id)), onClick: handleDetail.bind(null, row) },
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.EDIT, tooltip: { content: $t('common.edit'), placement: 'top' }, disabled: !(hasPermission('row:edit', row.id) && row.status === 10), onClick: handleEdit.bind(null, row) },
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.AUDIT, tooltip: { content: row.status === 10 ? '审批' : '反审批', placement: 'top' }, disabled: !(hasPermission('row:edit', row.id)), popConfirm: { title: `确认${row.status === 10 ? '审批' : '反审批'}${row.no}吗？`, confirm: handleUpdateStatus.bind(null, row, row.status === 10 ? 20 : 10) } },
          { label: '', type: 'danger', link: true, icon: ACTION_ICON.DELETE, tooltip: { content: $t('common.delete'), placement: 'top' }, disabled: !(hasPermission('row:delete', row.id)), popConfirm: { title: $t('ui.actionMessage.deleteConfirm', [row.no]), confirm: handleDelete.bind(null, [row.id!]) } },
        ]" />
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
:deep(.table-actions .iconify) {
  width: 1.25em;
  height: 1.25em;
}
</style>
