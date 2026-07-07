<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleReturnInApi } from '#/api/erp/stock/sale-return-in';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { deleteSaleReturnIn, getSaleReturnInPage, updateSaleReturnInStatus } from '#/api/erp/stock/sale-return-in';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import { getSaleReturnInStatusMeta, useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

import { ElLoading, ElMessage, ElTag } from 'element-plus';

defineOptions({ name: 'ErpSaleReturnInExec' });

const customerList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const checkedIds = ref<string[]>([]);

const [FormModal, formModalApi] = useVbenModal({ connectedComponent: Form, destroyOnClose: true });

function handleRefresh() { gridApi.query(); }
function handleCreate() { formModalApi.setData({ type: 'create' }).open(); }
function handleEdit(row: ErpSaleReturnInApi.SaleReturnIn) { formModalApi.setData({ type: 'edit', id: row.id }).open(); }
function handleDetail(row: ErpSaleReturnInApi.SaleReturnIn) { formModalApi.setData({ type: 'detail', id: row.id, canDetect: false }).open(); }

async function handleDelete(ids: string[]) {
  const loading = ElLoading.service({ text: '删除中...' });
  try { await deleteSaleReturnIn(ids); ElMessage.success('删除成功'); handleRefresh(); } finally { loading.close(); }
}

async function handleUpdateStatus(row: ErpSaleReturnInApi.SaleReturnIn, status: number) {
  const loading = ElLoading.service({ text: status === 20 ? '审批中...' : '反审批中...' });
  try {
    await updateSaleReturnInStatus(String(row.id || ''), status);
    ElMessage.success(status === 20 ? '审批成功' : '反审批成功');
    handleRefresh();
  } catch (error: any) {
    ElMessage.error(error?.message || (status === 20 ? '审批失败' : '反审批失败'));
  } finally {
    loading.close();
  }
}

function handleRowCheckboxChange({ records }: { records: ErpSaleReturnInApi.SaleReturnIn[] }) { checkedIds.value = records.map((item) => String(item.id || '')).filter(Boolean); }

onMounted(async () => {
  customerList.value = await getCustomerSimpleList();
  warehouseList.value = await getWarehouseSimpleList();
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: { ajax: { query: async ({ page }, formValues) => await getSaleReturnInPage({ index: page.currentPage, size: page.page, ...formValues }) } },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpSaleReturnInApi.SaleReturnIn>,
  gridEvents: { checkboxAll: handleRowCheckboxChange, checkboxChange: handleRowCheckboxChange },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="销售退货入库列表">
      <template #toolbar-tools>
        <TableAction :actions="[{ label: '销售退货入库', tooltip: { content: '创建新的销售退货入库单', placement: 'top' }, type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate }, { label: '批量删除', type: 'danger', tooltip: { content: '批量删除已选中的销售退货入库单', placement: 'top' }, disabled: isEmpty(checkedIds), icon: ACTION_ICON.DELETE, popConfirm: { title: '是否删除所选中数据？', confirm: handleDelete.bind(null, checkedIds) } }]" />
      </template>
      <template #status="{ row }">
        <ElTag v-if="getSaleReturnInStatusMeta(row.status)" :type="getSaleReturnInStatusMeta(row.status)?.tagType">{{ getSaleReturnInStatusMeta(row.status)?.label }}</ElTag>
        <span v-else>{{ row.status }}</span>
      </template>
      <template #warehouse_id="{ row }">{{ warehouseList.find((item) => String(item.rowid) === String(row.warehouse_id || ''))?.name || row.warehouse_inbound || row.warehouse_id }}</template>
      <template #customer_id="{ row }">{{ customerList.find((item) => String(item.id) === String(row.customer_id || ''))?.name || row.customer_id }}</template>
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
