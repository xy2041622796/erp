<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ErpPurchaseInApi } from '#/api/erp/purchase/in';

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
  previewPurchaseInDimensionRule,
  savePurchaseInDimensionResult,
} from '#/api/erp/finance/dimension/config';
import { getSupplierSimpleList } from '#/api/erp/customer';
import { getProductCategorySimpleList } from '#/api/erp/product/category';
import { getProductSimpleList } from '#/api/erp/product/product';
import {
  deletePurchaseIn,
  exportPurchaseIn,
  getPurchaseIn,
  getPurchaseInPage,
  updatePurchaseInStatus,
} from '#/api/erp/purchase/in';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';
import { getSimpleUserList } from '#/api/system/user';
import { $t } from '#/locales';
import {
  buildErpOrderPrintHtml,
  getErpPrintCompanyName,
  writePrintHtmlAndPrint,
} from '#/views/erp/shared/print-templates';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  getPurchaseInStatusMeta,
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

/** ERP 采购入库列表 */
defineOptions({ name: 'ErpPurchaseIn' });

const PURCHASE_IN_EXPORT_ENCODING_ID = '03079BA6F54354727D9CA2D486CDA19F';

const { dataTable, hasPermission } = useDataTablePermission();
const supplierOptions = ref<any[]>([]);
const warehouseOptions = ref<any[]>([]);
const userList = ref<any[]>([]);
const productList = ref<any[]>([]);
const categoryList = ref<any[]>([]);
const dimensionDialogVisible = ref(false);
const dimensionLoading = ref(false);
const dimensionTarget = ref<ErpPurchaseInApi.PurchaseIn | null>(null);
const dimensionPreview = ref<any>(null);
const printPreviewVisible = ref(false);
const printPreviewHtml = ref('');

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function formatPreviewDisplay(value: any, emptyText = '-') {
  if (value === null || value === undefined) return emptyText;
  if (typeof value === 'number') return Number.isFinite(value) ? value : emptyText;
  const text = String(value).trim();
  return text === '' ? emptyText : text;
}

onMounted(async () => {
  const [suppliers, warehouses, users, products, categories] = await Promise.all([
    getSupplierSimpleList(),
    getWarehouseSimpleList(),
    getSimpleUserList(),
    getProductSimpleList(),
    getProductCategorySimpleList(),
  ]);
  supplierOptions.value = suppliers;
  warehouseOptions.value = warehouses;
  userList.value = users;
  productList.value = Array.isArray(products) ? products : [];
  categoryList.value = Array.isArray(categories) ? categories : [];
});

function handleRefresh() {
  gridApi.query();
}

async function handleExport() {
  const data = await exportPurchaseIn(
    await gridApi.formApi.getValues(),
    PURCHASE_IN_EXPORT_ENCODING_ID,
  );
  downloadFileFromBlobPart({ fileName: '采购入库.xls', source: data });
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: ErpPurchaseInApi.PurchaseIn) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(ids: string[]) {
  const rows = ids
    .map((id) => gridApi.grid.getData().find((item: any) => String(item?.id || '') === String(id)))
    .filter(Boolean) as ErpPurchaseInApi.PurchaseIn[];
  const approvedRow = rows.find((item) => Number(item.status) === 20);
  if (approvedRow) {
    ElMessage.warning('审核通过的采购入库单不能直接删除，请先反审批后再删除');
    return false;
  }
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting'),
  });
  try {
    await deletePurchaseIn(ids);
    ElMessage.success($t('ui.actionMessage.deleteSuccess'));
    handleRefresh();
    return true;
  } finally {
    loadingInstance.close();
  }
}

async function generatePurchaseInDimensionOnApprove(row: ErpPurchaseInApi.PurchaseIn) {
  const purchaseInRow = row.id ? await getPurchaseIn(String(row.id)) : row;
  await saveDimensionResultsByRulePayloads(
    buildMasterAndItemDimensionRequests(
      'PURCHASE_IN',
      purchaseInRow as any,
      'PURCHASE_IN_ITEM',
      { allowOverwrite: true, skipWhenNoRule: true },
    ),
  );
}

async function doUpdateStatus(
  row: ErpPurchaseInApi.PurchaseIn,
  status: number,
) {
  const actionText = status === 20 ? '审批' : '反审批';
  const loadingInstance = ElLoading.service({ text: `${actionText}中...` });
  try {
    await updatePurchaseInStatus(row.id!, status);
    if (status === 20) {
      await generatePurchaseInDimensionOnApprove(row);
    }
    ElMessage.success(`${status === 20 ? '审批成功' : actionText + '成功'}`);
    handleRefresh();
    return true;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || `${actionText}失败`);
    return false;
  } finally {
    loadingInstance.close();
  }
}

async function openDimensionWriteDialog(row: ErpPurchaseInApi.PurchaseIn) {
  if (!row.id) {
    ElMessage.error('缺少主键，无法执行维度规则写入');
    return;
  }
  dimensionLoading.value = true;
  dimensionTarget.value = row;
  dimensionPreview.value = null;
  dimensionDialogVisible.value = true;
  try {
    const detail = await getPurchaseIn(String(row.id));
    if (!detail) {
      throw new Error('未读取到采购入库详情，不能执行维度规则预览');
    }
    dimensionPreview.value = await previewPurchaseInDimensionRule(detail);
    if (!dimensionPreview.value?.matched) {
      ElMessage.warning('当前采购入库未命中启用规则，请先到维度规则中心调整规则配置');
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
    const detail = await getPurchaseIn(String(dimensionTarget.value.id));
    if (!detail) {
      throw new Error('未读取到最新采购入库详情，不能写入维度结果');
    }
    const saveRes = await savePurchaseInDimensionResult(detail, dimensionPreview.value || null);
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

async function handleApproveFromDetail(
  row: ErpPurchaseInApi.PurchaseIn,
  status: number,
) {
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
function handleRowCheckboxChange({
  records,
}: {
  records: ErpPurchaseInApi.PurchaseIn[];
}) {
  checkedIds.value = records
    .map((item) => String(item.id || ''))
    .filter(Boolean);
}

function handleDetail(row: ErpPurchaseInApi.PurchaseIn) {
  formModalApi
    .setData({
      type: 'detail',
      id: row.id,
      canApprove: hasPermission('row:edit', row.id),
    })
    .open();
}

function enrichPurchaseInPrintData(data: any) {
  const supplier = supplierOptions.value.find((item) => item.rowid === data?.supplier_id);
  return {
    ...data,
    _supplier_name: supplier?.name || '',
    contact_name: supplier?.contact_name || supplier?.contactName,
    contact_phone: supplier?.contact_phone || supplier?.contactPhone || supplier?.telephone || supplier?.mobile,
    address: supplier?.address,
    _warehouse_name:
      warehouseOptions.value.find((item) => String(item.rowid) === String(data?.warehouse_id || ''))?.name ||
      data?.warehouse_name,
  };
}

async function handlePrintOne(row: ErpPurchaseInApi.PurchaseIn) {
  if (!row?.id) return;
  const status = Number(row.status);
  if (status === 30) {
    ElMessage.warning('审核不通过的单据不能打印');
    return;
  }
  const detail = await getPurchaseIn(String(row.id));
  const companyName = await getErpPrintCompanyName();
  const html = buildErpOrderPrintHtml({
    type: 'purchase-in',
    data: enrichPurchaseInPrintData(detail),
    companyName,
    previewOnly: status === 10,
    categoryList: categoryList.value,
    productList: productList.value,
    warehouseList: warehouseOptions.value,
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
          const res = await getPurchaseInPage({
            pageNo: page.currentPage,
            page: page.page,
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
    },
  } as VxeTableGridOptions<ErpPurchaseInApi.PurchaseIn>,
  gridEvents: {
    checkboxAll: handleRowCheckboxChange,
    checkboxChange: handleRowCheckboxChange,
  },
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" @approve="handleApproveFromDetail" />
    <Grid table-title="采购入库列表">
      <template #status="{ row }">
        <ElTag
          v-if="getPurchaseInStatusMeta(row.status)"
          :type="getPurchaseInStatusMeta(row.status)?.tagType"
          effect="plain"
        >
          {{ getPurchaseInStatusMeta(row.status)?.label }}
        </ElTag>
        <span v-else>{{ row.status }}</span>
      </template>
      <template #supplier_id="{ row }">
        {{
          supplierOptions.find((item) => item.rowid === row.supplier_id)
            ?.name || row.supplier_id
        }}
      </template>
      <template #warehouse_id="{ row }">
        {{
          warehouseOptions.find((item) => String(item.rowid) === String(row.warehouse_id || ''))?.name || row.warehouse_name || row.warehouse_id
        }}
      </template>
      <template #createuser="{ row }">
        {{
          userList.find((item) => item.ROWID === row.createuser)?.UserName ||
          row.createuser
        }}
      </template>
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '采购入库',
              type: 'primary',
              icon: ACTION_ICON.ADD,
              tooltip: { content: '创建新的采购入库单', placement: 'top' },
              disabled: !hasPermission('data:add'),
              onClick: handleCreate,
            },
            {
              label: '导出数据',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '导出采购入库数据为Excel文件', placement: 'top' },
              disabled: !hasPermission('data:add'),
              onClick: handleExport,
            },
            {
              label: '打印选中',
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              tooltip: { content: '打印已选中的采购入库单', placement: 'top' },
              disabled: isEmpty(checkedIds) || !hasPermission('data:add'),
              onClick: handlePrintSelected,
            },
            {
              label: '批量删除',
              type: 'danger',
              tooltip: { content: '批量删除已选中的采购入库单', placement: 'top' },
              disabled: isEmpty(checkedIds) || !hasPermission('data:allDelete'),
              icon: ACTION_ICON.DELETE,
              popConfirm: {
                title: `是否删除所选中数据？`,
                confirm: handleDelete.bind(null, checkedIds),
              },
            },
          ]"
        />
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: '详情-审批', placement: 'top' },
              disabled: !hasPermission('row:view', row.id),
              onClick: handleDetail.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.EDIT,
              tooltip: { content: $t('common.edit'), placement: 'top' },
              disabled: !(Number(row.status) === 10 && hasPermission('row:edit', row.id)),
              onClick: handleEdit.bind(null, row),
            },
            {
              label: '',
              type: 'primary',
              link: true,
              icon: ACTION_ICON.VIEW,
              tooltip: { content: '维度规则写入', placement: 'top' },
              onClick: openDimensionWriteDialog.bind(null, row),
            },
            {
              label: '',
              type: 'danger',
              link: true,
              icon: ACTION_ICON.DELETE,
              tooltip: { content: $t('common.delete'), placement: 'top' },
              disabled: !hasPermission('row:delete', row.id),
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.no || row.id]),
                confirm: handleDelete.bind(null, [String(row.id || '')]),
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
      title="采购入库维度规则写入"
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
            <ElDescriptionsItem label="单据号">{{
              dimensionTarget?.no || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="命中规则">{{
              dimensionPreview.rule?.rule_name || dimensionPreview.rule_name || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="规则编码">{{
              dimensionPreview.rule?.rule_code || '-'
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="输出条数">{{
              dimensionPreview.details?.length || 0
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="业务类型">采购入库维度写入</ElDescriptionsItem>
            <ElDescriptionsItem label="数据来源">实时读取采购入库详情</ElDescriptionsItem>
          </ElDescriptions>
          <ElTable
            :data="dimensionPreview.details || []"
            border
            size="small"
            max-height="360"
            class="mt-4"
          >
            <ElTableColumn label="维度分类" min-width="120">
              <template #default="{ row }">
                {{
                  row.dim_category_label || getDimCategoryLabel(row.dim_category)
                }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="维度编码" min-width="120">
              <template #default="{ row }">
                {{ row.dim_code_label || getDimCodeLabel(row.dim_code) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="维度名称" min-width="140">
              <template #default="{ row }">
                {{ row.dim_code_label || getDimCodeLabel(row.dim_code) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="输出值" min-width="140">
              <template #default="{ row }">
                {{ formatPreviewDisplay(row.value_code) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="金额" min-width="120">
              <template #default="{ row }">
                {{ formatPreviewDisplay(row.amount) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="方向" min-width="100">
              <template #default="{ row }">
                {{
                  formatPreviewDisplay(
                    row.direction_label || getDirectionLabel(row.direction),
                  )
                }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="期间" min-width="120">
              <template #default="{ row }">
                {{ formatPreviewDisplay(row.period) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="说明" min-width="220">
              <template #default="{ row }">
                {{ formatPreviewDisplay(row.description) }}
              </template>
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
