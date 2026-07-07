<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleReturnApi } from '#/api/erp/sale/return';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { saveDimensionResultByRulePayload } from '#/api/erp/finance/dimension/config';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import {
  deleteSaleReturn,
  exportSaleReturn,
  getSaleReturn,
  getSaleReturnPage,
  updateSaleReturnStatus,
} from '#/api/erp/sale/return';
import { createSaleReturnCheckDrafts } from '#/api/erp/stock/return-check';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { useDataTablePermission } from '../../shared/useDataTablePermission';
import {
  getSaleReturnInvoiceStatusMeta,
  getSaleReturnStatusMeta,
  useGridColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElDialog,
  ElLoading,
  ElMessage,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpSaleReturn' });

const SALE_RETURN_EXPORT_ENCODING_ID = '8A8D7AE0BBF64BC2A1B3DD32C126AB5E';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportSaleReturn(
    await gridApi.formApi.getValues(),
    SALE_RETURN_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '销售退货.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpSaleReturnApi.SaleReturn) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({ text: $t('ui.actionMessage.deleting') });
  try {
    await deleteSaleReturn(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generateSaleReturnDimensionOnApprove(row: ErpSaleReturnApi.SaleReturn) {
  const saleReturnRow = row.id ? await getSaleReturn(String(row.id)) : row;
  await saveDimensionResultByRulePayload('SALE_RETURN', saleReturnRow as any, null, {
    allowOverwrite: true,
    skipWhenNoRule: true,
  });
}

async function handleUpdateStatus(row: ErpSaleReturnApi.SaleReturn, status: number) {
  const loadingInstance = ElLoading.service({ text: `确定${status === 20 ? '审批' : '反审批'}该订单吗？` });
  try {
    const invoice_status = status === 20 ? 1 : 0;
    await updateSaleReturnStatus(row.id!, { status, invoice_status });
    if (status === 20) {
      try {
        const latestDoc = await getSaleReturn(String(row.id || ''));
        const created = await createSaleReturnCheckDrafts(latestDoc);
        await generateSaleReturnDimensionOnApprove(row);
        ElMessage.success(`审批成功，已生成 ${created.length} 张检测草稿，并已生成维度`);
      } catch (error: any) {
        try {
          await updateSaleReturnStatus(String(row.id || ''), { status: 10, invoice_status: 0 });
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

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: ErpSaleReturnApi.SaleReturn[] }) {
  checkedIds.value = records.map((item) => item.id!);
}

const accountList = ref<any[]>([]);
getAccountSimpleList().then((res) => {
  accountList.value = res;
});

const userList = ref<any[]>([]);
getSimpleUserList().then((res) => {
  userList.value = res;
});

const customerList = ref<any[]>([]);
getCustomerSimpleList().then((res) => {
  customerList.value = Array.isArray(res) ? res : [];
});

const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

onMounted(async () => {
  const [products, categories, warehouses] = await Promise.all([
    getProductSimpleList(),
    getProductCategorySimpleList(),
    getWarehouseSimpleList(),
  ]);
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
  warehouseList.value = warehouses;
});

function getCustomerName(id: any) {
  return customerList.value.find((c) => c.id === id)?.name || id;
}

function getStatusLabel(status: unknown) {
  const meta = getSaleReturnStatusMeta(status);
  return meta?.label ?? (status === undefined || status === null || status === '' ? '-' : String(status));
}

function getStatusTagType(status: unknown) {
  return getSaleReturnStatusMeta(status)?.tagType;
}

function getInvoiceStatusLabel(status: unknown) {
  const meta = getSaleReturnInvoiceStatusMeta(status);
  return meta?.label ?? (status === undefined || status === null || status === '' ? '-' : String(status));
}

function getInvoiceStatusTagType(status: unknown) {
  return getSaleReturnInvoiceStatusMeta(status)?.tagType;
}

function handleDetail(row: ErpSaleReturnApi.SaleReturn) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

function enrichSaleReturnPrintData(data: any) {
  const customer = customerList.value.find((c) => c.id === data?.customer_id);
  return {
    ...data,
    _customer_name:
      customerList.value.find((item) => item.id === data?.customer_id)?.name ||
      data?.customer_id,
    contact_name: customer?.contactName || customer?.contact_name,
    contact_phone: customer?.contactPhone || customer?.contact_phone || customer?.telephone || customer?.mobile,
    address: customer?.address,
    _sale_user_name:
      userList.value.find((item) => String(item.ROWID ?? item.rowid ?? item.id ?? '') === String(data?.sale_user_id ?? ''))?.UserName ||
      data?.sale_user_id,
  };
}

async function handlePrintOne(row: ErpSaleReturnApi.SaleReturn) {
  if (!row?.id) return;
  const status = Number(row.status);
  if (status === 30) {
    ElMessage.warning('审核不通过的单据不能打印');
    return;
  }
  const detail = await getSaleReturn(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'sale-return',
    data: enrichSaleReturnPrintData(detail),
    companyName,
    previewOnly: status === 10,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseList.value,
  });
  if (status === 10) {
    printPreviewHtml.value = html;
    printPreviewVisible.value = true;
    ElMessage.warning('待审批单据仅支持预览，审核通过后才能正式打印');
    return;
  }
  await writePrintHtmlAndPrint(html);
}

async function handlePrintSelected() {
  if (checkedIds.value.length === 0) {
    ElMessage.warning('请先选择要打印的单据');
    return;
  }
  for (const id of checkedIds.value) {
    const row = gridApi.grid.getData().find((item: any) => String(item?.id || '') === String(id));
    if (row) await handlePrintOne(row as any);
  }
}

const { dataTable, hasPermission } = useDataTablePermission();
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getSaleReturnPage({ index: page.currentPage, size: page.page, ...formValues });
          dataTable.value = res.dataTable;
          return res;
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<ErpSaleReturnApi.SaleReturn>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="销售退货列表">
      <template #status="{ row }">
        <ElTag v-if="getSaleReturnStatusMeta(row.status)" :type="getStatusTagType(row.status) as any">
          {{ getStatusLabel(row.status) }}
        </ElTag>
        <span v-else>{{ getStatusLabel(row.status) }}</span>
      </template>

      <template #invoice_status="{ row }">
        <ElTag v-if="getSaleReturnInvoiceStatusMeta(row.invoice_status)" :type="getInvoiceStatusTagType(row.invoice_status) as any">
          {{ getInvoiceStatusLabel(row.invoice_status) }}
        </ElTag>
        <span v-else>{{ getInvoiceStatusLabel(row.invoice_status) }}</span>
      </template>

      <template #customer_id="{ row }">{{ getCustomerName(row.customer_id) }}</template>
      <template #account_id="{ row }">{{ accountList.find((item) => item.rowid === row.account_id)?.name || row.account_id }}</template>
      <template #sale_user_id="{ row }">{{ userList.find((item) => item.ROWID === row.sale_user_id)?.UserName || row.sale_user_id }}</template>

      <template #toolbar-tools>
        <TableAction :actions="[
          { label: '销售退货', tooltip: { content: '创建新的销售退货单', placement: 'top' }, type: 'primary', icon: ACTION_ICON.ADD, disabled: !(hasPermission('data:add')), onClick: handleCreate },
          { label: '导出数据', tooltip: { content: '导出销售退货数据为Excel文件', placement: 'top' }, type: 'primary', icon: ACTION_ICON.DOWNLOAD, disabled: !(hasPermission('data:add')), onClick: handleExport },
          { label: '打印选中', type: 'primary', icon: ACTION_ICON.DOWNLOAD, tooltip: { content: '打印已选中的销售退货单', placement: 'top' }, disabled: isEmpty(checkedIds), onClick: handlePrintSelected },
          { label: '批量删除', type: 'danger', tooltip: { content: '批量删除已选中的销售退货单', placement: 'top' }, disabled: (isEmpty(checkedIds)) || !(hasPermission('data:allDelete')),  icon: ACTION_ICON.DELETE, popConfirm: { title: `是否删除所选中数据？`, confirm: handleDelete.bind(null, checkedIds) } },
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

    <ElDialog
      v-model="printPreviewVisible"
      title="打印预览"
      width="980px"
      :close-on-click-modal="false"
    >
      <div class="mb-2 text-sm text-[#666]">待审批单据仅支持预览，审核通过后才能正式打印。</div>
      <iframe class="h-[520px] w-full border" :srcdoc="printPreviewHtml"></iframe>
      <template #footer>
        <ElButton type="primary" @click="printPreviewVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
:deep(.table-actions .iconify) {
  width: 1.25em;
  height: 1.25em;
}
</style>
