<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpSaleOutApi } from '#/api/erp/sale/out';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, isEmpty } from '@vben/utils';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  buildMasterAndItemDimensionRequests,
  saveDimensionResultsByRulePayloads,
} from '#/api/erp/finance/dimension/config';
import {
  getDimCategoryLabel,
  getDimCodeLabel,
  getDirectionLabel,
  previewSaleOutDimensionRule,
  saveSaleOutDimensionResult,
} from '#/api/erp/finance/dimension/config';
import { getCustomerSimpleList } from '#/api/erp/customer';
import { getAccountSimpleList } from '#/api/erp/finance/account';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import {
  deleteSaleOut,
  exportSaleOut,
  getSaleOut,
  getSaleOutPage,
  updateSaleOutStatus,
} from '#/api/erp/sale/out';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';

import { useDataTablePermission } from '../../shared/useDataTablePermission';
import {
  getSaleOutStatusMeta,
  useGridColumns,
  useGridFormSchema,
} from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpSaleOut' });

const SALE_OUT_EXPORT_ENCODING_ID = '014FF0030A017C3F13C7159802C6100C';
const { dataTable, hasPermission } = useDataTablePermission();

const customerList = ref<any[]>([]);
const warehouseList = ref<any[]>([]);
const accountList = ref<any[]>([]);
const userList = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const dimensionDialogVisible = ref(false);
const dimensionLoading = ref(false);
const dimensionTarget = ref<ErpSaleOutApi.SaleOut | null>(null);
const dimensionPreview = ref<any>(null);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportSaleOut(
    await gridApi.formApi.getValues(),
    SALE_OUT_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '销售出库.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpSaleOutApi.SaleOut) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deleteSaleOut(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
  } finally {
    loadingInstance.close();
  }
}

async function generateSaleOutDimensionOnApprove(row: ErpSaleOutApi.SaleOut) {
  const saleOutRow = row.id ? await getSaleOut(String(row.id)) : row;
  await saveDimensionResultsByRulePayloads(
    buildMasterAndItemDimensionRequests(
      'SALE_SHIPMENT',
      saleOutRow as any,
      'SALE_SHIPMENT_ITEM',
      { allowOverwrite: true, skipWhenNoRule: true },
    ),
  );
}

async function doUpdateStatus(row: ErpSaleOutApi.SaleOut, status: number) {
  const actionText = status === 20 ? '审批' : '反审批';
  const loadingInstance = ElLoading.service({ text: `${actionText}中...` });
  try {
    await updateSaleOutStatus(row.id!, status);
    if (status === 20) {
      await generateSaleOutDimensionOnApprove(row);
    }
    ElMessage.success(`${status === 20 ? '审批成功' : actionText + '成功'}`);
    handleRefresh();
    return true;
  } catch (error: any) {
    ElMessage.error(error?.message || `${actionText}失败`);
    return false;
  } finally {
    loadingInstance.close();
  }
}

async function openDimensionWriteDialog(row: ErpSaleOutApi.SaleOut) {
  if (!row.id) {
    ElMessage.error('缺少主键，无法执行维度规则写入');
    return;
  }
  dimensionLoading.value = true;
  dimensionTarget.value = row;
  dimensionPreview.value = null;
  dimensionDialogVisible.value = true;
  try {
    const detail = await getSaleOut(String(row.id));
    if (!detail) {
      throw new Error('未读取到销售出库详情，不能执行维度规则预览');
    }
    dimensionPreview.value = await previewSaleOutDimensionRule(detail);
    if (!dimensionPreview.value?.matched) {
      ElMessage.warning('当前销售出库未命中启用规则，请先到维度规则中心调整规则配置');
    }
  } catch (error: any) {
    dimensionPreview.value = null;
    ElMessage.error(error?.message || '维度规则预览失败');
  } finally {
    dimensionLoading.value = false;
  }
}

async function handleWriteDimensionResult() {
  if (!dimensionTarget.value?.id) return;
  try {
    const detail = await getSaleOut(String(dimensionTarget.value.id));
    if (!detail) {
      throw new Error('未读取到最新销售出库详情，不能写入维度结果');
    }
    const saveRes = await saveSaleOutDimensionResult(detail, dimensionPreview.value || null);
    ElMessage.success(
      saveRes?.duplicated
        ? `维度结果已存在：${saveRes.setId}`
        : `已写入维度主表/子表：${saveRes.setId}`,
    );
    dimensionDialogVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error?.message || '写入维度结果失败');
  }
}

function formatPreviewDisplay(value: any, emptyText = '-') {
  if (value === null || value === undefined) return emptyText;
  if (typeof value === 'number') return Number.isFinite(value) ? value : emptyText;
  const text = String(value).trim();
  return text === '' ? emptyText : text;
}

async function handleApproveFromDetail(row: ErpSaleOutApi.SaleOut, status: number) {
  const actionText = status === 20 ? '审批' : '反审批';
  if (!row.id) {
    ElMessage.error('缺少主键，无法更新状态');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定${actionText}该单据吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  await doUpdateStatus(row, status);
}

const checkedIds = ref<string[]>([]);
function handleRowCheckboxChange({ records }: { records: ErpSaleOutApi.SaleOut[] }) {
  checkedIds.value = records.map((item) => item.id!).filter(Boolean);
}

function handleDetail(row: ErpSaleOutApi.SaleOut) {
  formModalApi
    .setData({
      type: 'detail',
      id: row.id,
      canApprove: hasPermission('row:edit', row.id),
    })
    .open();
}

function enrichSaleOutPrintData(data: any) {
  const customer = customerList.value.find((c) => c.id === data?.customer_id);
  const account = accountList.value.find(
    (item) => String(item.rowid) === String(data?.account_id ?? ''),
  );
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
    _warehouse_name:
      warehouseList.value.find((item) => String(item.rowid) === String(data?.warehouse_id || ''))?.name ||
      data?.warehouse_name,
    account_name: account?.name || data?.account_name || '',
  };
}

async function handlePrintOne(row: ErpSaleOutApi.SaleOut) {
  if (!row?.id) return;
  const status = Number(row.status);
  if (status === 30) {
    ElMessage.warning('审核不通过的单据不能打印');
    return;
  }
  const detail = await getSaleOut(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'sale-out',
    data: enrichSaleOutPrintData(detail),
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

onMounted(async () => {
  const [customers, warehouses, users, products, categories, accounts] =
    await Promise.all([
      getCustomerSimpleList(),
      getWarehouseSimpleList(),
      getSimpleUserList(),
      getProductSimpleList(),
      getProductCategorySimpleList(),
      getAccountSimpleList(),
    ]);
  customerList.value = customers;
  warehouseList.value = warehouses;
  userList.value = users;
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
  accountList.value = accounts;
});

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
          const res = await getSaleOutPage({
            index: page.currentPage,
            size: page.page,
            ...formValues,
          });
          dataTable.value = res.dataTable;
          return res;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
      custom: true,
    },
  } as VxeTableGridOptions<ErpSaleOutApi.SaleOut>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" @approve="handleApproveFromDetail" />
    <Grid table-title="销售出库列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '销售出库',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的销售出库单', placement: 'top' },
              disabled: !(hasPermission('data:add')),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出销售出库数据为Excel文件', placement: 'top' },
              disabled: !(hasPermission('data:add')),
              onClick: handleExport,
            },
            {
              label: '打印选中',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '打印已选中的销售出库单', placement: 'top' },
              disabled: isEmpty(checkedIds),
              onClick: handlePrintSelected,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的销售出库单', placement: 'top' },
              disabled: (isEmpty(checkedIds)) || !(hasPermission('data:allDelete')),
              icon: ACTION_ICON.DELETE,

              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: handleDelete.bind(null, checkedIds),
              },
            },
          ]"
        />
      </template>

      <template #status="{ row }">
        <ElTag
          v-if="getSaleOutStatusMeta(row.status)"
          :type="getSaleOutStatusMeta(row.status)?.tagType"
          effect="plain"
        >
          {{ getSaleOutStatusMeta(row.status)?.label }}
        </ElTag>
        <span v-else>{{ row.status }}</span>
      </template>

      <template #customer_id="{ row }">
        {{ customerList.find((item) => item.id === row.customer_id)?.name }}
      </template>

      <template #warehouse_id="{ row }">
        {{ warehouseList.find((item) => String(item.rowid) === String(row.warehouse_id || ''))?.name || row.warehouse_name || row.warehouse_id }}
      </template>

      <template #sale_user_id="{ row }">
        {{
          userList.find(
            (item) =>
              String(item.ROWID ?? item.rowid ?? item.id ?? '') ===
              String(row.sale_user_id ?? ''),
          )?.UserName || row.sale_user_id
        }}
      </template>

      <template #action="{ row }">
        <TableAction
          :actions="[
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: '详情-审批', placement: 'top' },
              disabled: !(hasPermission('row:view', row.id)),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(row.status !== 20 && hasPermission('row:edit', row.id)),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: '维度规则写入', placement: 'top' },
              disabled: !(hasPermission('row:view', row.id)),
              onClick: openDimensionWriteDialog.bind(null, row),
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !(hasPermission('row:delete', row.id)),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.no]),
                confirm: handleDelete.bind(null, [row.id!]),
              },
            },
          ]"
        />
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

    <ElDialog
      v-model="dimensionDialogVisible"
      title="销售出库维度规则写入"
      width="980px"
      :close-on-click-modal="false"
    >
      <div v-loading="dimensionLoading">
        <template v-if="dimensionPreview">
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem label="命中状态">
              <ElTag :type="dimensionPreview.matched ? 'success' : 'danger'">
                {{ dimensionPreview.matched ? '已命中规则' : '未命中规则' }}
              </ElTag>
            </ElDescriptionsItem>
            <ElDescriptionsItem label="单据号">{{ dimensionTarget?.no || '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="命中规则">{{ dimensionPreview.rule?.rule_name || '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="规则编码">{{ dimensionPreview.rule?.rule_code || '-' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="输出条数">{{ dimensionPreview.details?.length || 0 }}</ElDescriptionsItem>
            <ElDescriptionsItem label="业务类型">销售出库维度写入</ElDescriptionsItem>
            <ElDescriptionsItem label="数据来源">实时读取销售出库详情</ElDescriptionsItem>
          </ElDescriptions>
          <ElTable :data="dimensionPreview.details || []" border size="small" max-height="360" class="mt-4">
            <ElTableColumn label="维度分类" min-width="120">
              <template #default="{ row }">{{ row.dim_category_label || getDimCategoryLabel(row.dim_category) }}</template>
            </ElTableColumn>
            <ElTableColumn label="维度编码" min-width="120">
              <template #default="{ row }">{{ row.dim_code_label || getDimCodeLabel(row.dim_code) }}</template>
            </ElTableColumn>
            <ElTableColumn label="维度名称" min-width="140">
              <template #default="{ row }">{{ row.dim_code_label || getDimCodeLabel(row.dim_code) }}</template>
            </ElTableColumn>
            <ElTableColumn label="输出值" min-width="140">
              <template #default="{ row }">{{ formatPreviewDisplay(row.value_code) }}</template>
            </ElTableColumn>
            <ElTableColumn label="金额" min-width="120">
              <template #default="{ row }">{{ formatPreviewDisplay(row.amount) }}</template>
            </ElTableColumn>
            <ElTableColumn label="方向" min-width="100">
              <template #default="{ row }">{{ formatPreviewDisplay(row.direction_label || getDirectionLabel(row.direction)) }}</template>
            </ElTableColumn>
            <ElTableColumn label="期间" min-width="120">
              <template #default="{ row }">{{ formatPreviewDisplay(row.period) }}</template>
            </ElTableColumn>
            <ElTableColumn label="说明" min-width="180">
              <template #default="{ row }">{{ formatPreviewDisplay(row.description) }}</template>
            </ElTableColumn>
          </ElTable>
        </template>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="dimensionDialogVisible = false">关闭</ElButton>
          <ElButton
            type="primary"
            :disabled="!dimensionPreview?.matched"
            @click="handleWriteDimensionResult"
          >
            继续写入维度结果
          </ElButton>
        </div>
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
