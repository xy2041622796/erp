<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  buildPurchaseReturnOutPreloadByCheck,
  buildSaleReturnInPreloadByCheck,
  getReturnCheckById,
  getReturnCheckGenerateOptions,
  getReturnCheckPage,
  RETURN_CHECK_BIZ_TYPE,
  RETURN_CHECK_FORM_KEY,
} from '#/api/erp/stock/return-check';
import { getWarehouseSimpleList } from '#/api/erp/stock/warehouse';

import PurchaseReturnOutForm from '../purchase-return-out/modules/form.vue';
import SaleReturnInForm from '../sale-return-in/modules/form.vue';
import ReturnCheckGenerateSelectModal from '../shared/return-check-generate-select-modal.vue';
import ReturnCheckModal from '../shared/return-check-modal.vue';

import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElMessage,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'ErpReturnCheck' });

const warehouseOptions = ref<any[]>([]);
const activeTab = ref(String(RETURN_CHECK_BIZ_TYPE.SALE_RETURN));
const pendingGenerateRow = ref<any>(null);
const pendingGenerateScope = ref<'qualified' | 'unqualified'>('qualified');

const [CheckModal, checkModalApi] = useVbenModal({
  connectedComponent: ReturnCheckModal,
  destroyOnClose: true,
});
const [GenerateSelectModal, generateSelectModalApi] = useVbenModal({
  connectedComponent: ReturnCheckGenerateSelectModal,
  destroyOnClose: true,
});
const [SaleReturnInModal, saleReturnInModalApi] = useVbenModal({
  connectedComponent: SaleReturnInForm,
  destroyOnClose: true,
});
const [PurchaseReturnOutModal, purchaseReturnOutModalApi] = useVbenModal({
  connectedComponent: PurchaseReturnOutForm,
  destroyOnClose: true,
});

function getStatusLabel(status: number) {
  if (Number(status) === 30) return '已检测';
  if (Number(status) === 20) return '部分检测';
  return '待检测';
}

function getStatusType(status: number) {
  if (Number(status) === 30) return 'success';
  if (Number(status) === 20) return 'warning';
  return 'info';
}

function getProcessStatusType(status: number) {
  if (Number(status) === 30) return 'success';
  if (Number(status) === 20) return 'warning';
  return 'info';
}

function currentBizType() {
  return Number(activeTab.value);
}

function resolveWarehouseName(warehouseId?: string) {
  return warehouseOptions.value.find((item) => String(item.rowid) === String(warehouseId || ''))?.name || warehouseId || '';
}

function useGridFormSchema(): VbenFormSchema[] {
  return [
    { fieldName: 'no', label: '检测单号', component: 'Input', componentProps: { placeholder: '请输入检测单号', allowClear: true } },
    { fieldName: 'biz_no', label: '退货单号', component: 'Input', componentProps: { placeholder: '请输入退货单号', allowClear: true } },
    {
      fieldName: 'check_status',
      label: '检测状态',
      component: 'Select',
      componentProps: { allowClear: true, options: [{ label: '待检测', value: 10 }, { label: '部分检测', value: 20 }, { label: '已检测', value: 30 }] },
    },
    {
      fieldName: 'warehouse_id',
      label: '仓库',
      component: 'Select',
      componentProps: { allowClear: true, filterable: true, options: warehouseOptions, labelField: 'name', valueField: 'rowid' },
    },
    {
      fieldName: 'is_latest',
      label: '当前有效',
      component: 'Select',
      defaultValue: 1,
      componentProps: { allowClear: true, options: [{ label: '是', value: 1 }, { label: '否', value: 0 }] },
    },
  ];
}

function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { field: 'no', title: '检测单号', minWidth: 180, fixed: 'left' },
    { field: 'biz_no', title: '退货单号', minWidth: 180 },
    { field: 'warehouse_id', title: '仓库', minWidth: 140, slots: { default: 'warehouse_id' } },
    { field: 'check_status', title: '检测状态', minWidth: 100, slots: { default: 'check_status' } },
    { field: 'process_status_label', title: '处理状态', minWidth: 100, slots: { default: 'process_status' } },
    { field: 'checker_name', title: '检测人', minWidth: 120 },
    { field: 'check_time', title: '检测时间', minWidth: 140 },
    { title: '操作', width: 180, fixed: 'right', slots: { default: 'actions' } },
  ];
}

async function handleRefresh() {
  await gridApi.query();
}

function handleTabChange(name: string | number) {
  activeTab.value = String(name);
  void handleRefresh();
}

function openCheck(row: any) {
  checkModalApi.setData({ context: Number(row.biz_type) === RETURN_CHECK_BIZ_TYPE.SALE_RETURN ? 'sale-return' : 'purchase-return', formKey: RETURN_CHECK_FORM_KEY, checkId: row.id, bizId: row.biz_id, bizNo: row.biz_no, sourceReturnId: row.source_return_id, sourceReturnNo: row.source_return_no, warehouseId: row.warehouse_id, readOnly: false }).open();
}

async function openGenerateSelector(row: any, scope: 'qualified' | 'unqualified') {
  if (Number(row.check_status) !== 30) {
    ElMessage.warning('检测未完成，不能生成后续单据');
    return;
  }
  const options: any = await getReturnCheckGenerateOptions(Number(row.biz_type), String(row.id), scope);
  if (!options?.items || options.items.length <= 0) {
    ElMessage.warning('当前类型下没有可生成的数据');
    return;
  }
  pendingGenerateRow.value = row;
  pendingGenerateScope.value = scope;
  generateSelectModalApi.setData({
    title: scope === 'qualified' ? '选择合格产品生成范围' : '选择不合格产品生成范围',
    warehouseOptions: (options.warehouseOptions || []).map((item: any) => ({ ...item, warehouseName: resolveWarehouseName(item.warehouseId) })),
    items: (options.items || []).map((item: any) => ({ ...item, warehouse_name: resolveWarehouseName(item.warehouse_id) })),
    defaultWarehouseId: options.defaultWarehouseId,
  }).open();
}

async function handleGenerateSelection(payload: { warehouseId: string; checkItemIds: string[] }) {
  const row = pendingGenerateRow.value;
  const scope = pendingGenerateScope.value;
  if (!row) return;
  if (Number(row.biz_type) === RETURN_CHECK_BIZ_TYPE.SALE_RETURN) {
    const preload: any = await buildSaleReturnInPreloadByCheck(String(row.id), scope, { warehouseId: payload.warehouseId, checkItemIds: payload.checkItemIds });
    if (!preload?.preloadReturn?.items || preload.preloadReturn.items.length <= 0) {
      ElMessage.warning('当前选择下没有可带出的入库数据');
      return;
    }
    saleReturnInModalApi.setData({ type: 'create', preloadReturn: preload.preloadReturn, sourceCheckId: row.id, sourceCheckBizType: row.biz_type, sourceCheckGenerateKey: `sale_return_in_${scope}` }).open();
    return;
  }
  const preload: any = await buildPurchaseReturnOutPreloadByCheck(String(row.id), scope, { warehouseId: payload.warehouseId, checkItemIds: payload.checkItemIds });
  if (!preload?.preloadReturn?.items || preload.preloadReturn.items.length <= 0) {
    ElMessage.warning('当前选择下没有可带出的出库数据');
    return;
  }
  purchaseReturnOutModalApi.setData({ type: 'create', preloadReturn: preload.preloadReturn, sourceCheckId: row.id, sourceCheckBizType: row.biz_type, sourceCheckGenerateKey: `purchase_return_out_${scope}` }).open();
}

async function handleExecDocSaved(payload?: any) {
  try {
    if (payload?.sourceCheckId) {
      await getReturnCheckById(RETURN_CHECK_FORM_KEY, String(payload.sourceCheckId));
    }
  } finally {
    await handleRefresh();
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: { ajax: { query: async ({ page }, formValues) => {
      const isLatest = formValues?.is_latest !== undefined && formValues?.is_latest !== null && formValues?.is_latest !== '' ? formValues.is_latest : 1;
      return await getReturnCheckPage({ index: page.currentPage, size: page.page, biz_type: currentBizType(), ...formValues, is_latest: isLatest });
    } } },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: true },
  } as VxeTableGridOptions<any>,
});

onMounted(async () => {
  warehouseOptions.value = await getWarehouseSimpleList();
  await handleRefresh();
});
</script>

<template>
  <Page auto-content-height>
    <CheckModal @success="handleRefresh" />
    <GenerateSelectModal @success="handleGenerateSelection" />
    <SaleReturnInModal @success="handleExecDocSaved" />
    <PurchaseReturnOutModal @success="handleExecDocSaved" />

    <ElTabs v-model="activeTab" class="mb-2" @tab-change="handleTabChange">
      <ElTabPane :name="String(RETURN_CHECK_BIZ_TYPE.SALE_RETURN)" label="销售退货检测" />
      <ElTabPane :name="String(RETURN_CHECK_BIZ_TYPE.PURCHASE_RETURN)" label="采购退货检测" />
    </ElTabs>

    <Grid table-title="退货检测列表">
      <template #warehouse_id="{ row }">
        {{ resolveWarehouseName(row.warehouse_id) }}
      </template>
      <template #check_status="{ row }">
        <ElTag :type="getStatusType(row.check_status) as any">{{ getStatusLabel(row.check_status) }}</ElTag>
      </template>
      <template #process_status="{ row }">
        <ElTag :type="getProcessStatusType(row.process_status) as any">{{ row.process_status_label || '-' }}</ElTag>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center gap-2">
          <TableAction :actions="[{ label: '', type: 'primary', link: true, icon: ACTION_ICON.EDIT, tooltip: { content: '检测', placement: 'top' }, onClick: openCheck.bind(null, row) }]" />
          <ElDropdown trigger="click" :disabled="Number(row.check_status) !== 30" @command="(command) => openGenerateSelector(row, command)">
            <ElButton link type="primary" :disabled="Number(row.check_status) !== 30">生成单据</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="qualified">生成合格单</ElDropdownItem>
                <ElDropdownItem command="unqualified">生成不合格单</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
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
