<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseReturnOutApi } from '#/api/erp/stock/purchase-return-out';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { deletePurchaseReturnOut, getPurchaseReturnOutPage, updatePurchaseReturnOutStatus } from '#/api/erp/stock/purchase-return-out';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { getPurchaseReturnOutStatusMeta, useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage, ElTag } from 'element-plus';

defineOptions({ name: 'ErpPurchaseReturnOutExec' });

const supplierList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const checkedIds = ref<string[]>([]);

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form, destroyOnClose: true });

function handleRefresh() { gridApi.query(); }
function handleCreate() { formModalApi.setData({ type: 'create' }).open(); }
function handleEdit(row: ErpPurchaseReturnOutApi.PurchaseReturnOut) { formModalApi.setData({ type: 'edit', id: row.id }).open(); }
function handleDetail(row: ErpPurchaseReturnOutApi.PurchaseReturnOut) { formModalApi.setData({ type: 'detail', id: row.id, canDetect: false }).open(); }

async function handleDelete(ids: string[]) {
  const loading = ElLoading.service({ text: '删除中...' });
  try { await deletePurchaseReturnOut(ids); ElMessage.success('删除成功'); handleRefresh(); } finally { loading.close(); }
}

async function handleUpdateStatus(row: ErpPurchaseReturnOutApi.PurchaseReturnOut, status: number) {
  const loading = ElLoading.service({ text: status === 20 ? '审批中...' : '反审批中...' });
  try {
    await updatePurchaseReturnOutStatus(String(row.id || ''), status);
    ElMessage.success(status === 20 ? '审批成功' : '反审批成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || (status === 20 ? '审批失败' : '反审批失败'));
  } finally {
    loading.close();
  }
}

function handleRowCheckboxChange({ records }: { records: ErpPurchaseReturnOutApi.PurchaseReturnOut[] }) { checkedIds.value = records.map((item) => String(item.id || '')).filter(Boolean); }

onMounted(async () => {
  supplierList.value = await getSupplierSimpleList();
  warehouseList.value = await getWarehouseSimpleList();
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: { ajax: { query: async ({ page }, formValues) => await getPurchaseReturnOutPage({ index: page.currentPage, size: page.page, ...formValues }) } },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpPurchaseReturnOutApi.PurchaseReturnOut>,
  gridEvents: { checkboxAll: handleRowCheckboxChange, checkboxChange: handleRowCheckboxChange },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="采购退货出库列表">
      <template #toolbar-tools>
        <TableAction :actions="[{ label: '采购退货出库', tooltip: { content: '创建新的采购退货出库单', placement: 'top' }, type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate }, { label: '批量删除', type: 'danger', tooltip: { content: '批量删除已选中的采购退货出库单', placement: 'top' }, disabled: isEmpty(checkedIds), icon: ACTION_ICON.DELETE, popConfirm: { title: '是否删除所选中数据？', confirm: handleDelete.bind(null, checkedIds) } }]" />
      </template>
      <template #status="{ row }">
        <ElTag v-if="getPurchaseReturnOutStatusMeta(row.status)" :type="getPurchaseReturnOutStatusMeta(row.status)?.tagType">{{ getPurchaseReturnOutStatusMeta(row.status)?.label }}</ElTag>
        <span v-else>{{ row.status }}</span>
      </template>
      <template #warehouse_id="{ row }">{{ warehouseList.find((item) => String(item.rowid) === String(row.warehouse_id || ''))?.name || row.warehouse_outbound || row.warehouse_id }}</template>
      <template #supplier_id="{ row }">{{ supplierList.find((item) => String(item.rowid) === String(row.supplier_id || ''))?.name || row.supplier_id }}</template>
      <template #action="{ row }">
        <TableAction :actions="[
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.VIEW, tooltip: { content: '详情', placement: 'top' }, onClick: handleDetail.bind(null, row) },
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.EDIT, tooltip: { content: '编辑', placement: 'top' }, disabled: !(Number(row.status) !== 20), onClick: handleEdit.bind(null, row) },
          { label: '', type: 'primary', link: true, icon: ACTION_ICON.AUDIT, tooltip: { content: Number(row.status) === 10 ? '审批' : '反审批', placement: 'top' }, popConfirm: { title: `确认${Number(row.status) === 10 ? '审批' : '反审批'}${row.no}吗？`, confirm: handleUpdateStatus.bind(null, row, Number(row.status) === 10 ? 20 : 10) } },
          { label: '', type: 'danger', link: true, icon: ACTION_ICON.DELETE, tooltip: { content: '删除', placement: 'top' }, disabled: !(Number(row.status) !== 20), popConfirm: { title: `确认删除${row.no}吗？`, confirm: handleDelete.bind(null, [String(row.id || '')]) } },
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
