<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';


import CustomerName from '#/components/customer-selector/CustomerName.vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPaymentPage } from '#/api/erp/contract/execution/original';

import { useGridColumns, useGridFormSchema } from './data';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
  ElTag,
} from 'element-plus';

const pageRows = ref<any[]>([]);
const selectedPayment = ref<any>(null);
const [DetailModal, detailModalApi] = useVbenModal();

const paymentSummary = computed(() => {
  const rows = pageRows.value;
  return {
    amount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    confirmed: rows.filter((row) => row.status === 'confirmed').length,
    pending: rows.filter((row) => row.status === 'pending').length,
    total: rows.length,
  };
});

function handleCreate() {
  ElMessage.info('回款新增和修改请到财务 / 收入结算页面办理，本页只展示合同履行中的回款结果。');
}

function handleView(row: any) {
  selectedPayment.value = row;
  detailModalApi.open();
}

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getPaymentTypeLabel(value: string) {
  if (value === 'advance') return '首付款';
  if (value === 'final') return '尾款';
  if (value === 'other') return '其他';
  return '进度款';
}

function getPaymentTypeTagType(value: string) {
  if (value === 'advance') return 'primary';
  if (value === 'final') return 'success';
  if (value === 'other') return 'info';
  return 'warning';
}

function getPaymentMethodLabel(value: string) {
  if (value === 'check') return '支票';
  if (value === 'cash') return '现金';
  if (value === 'other') return '其他';
  return '银行转账';
}

function getPaymentMethodTagType(value: string) {
  if (value === 'bank') return 'primary';
  if (value === 'check') return 'warning';
  if (value === 'cash') return 'success';
  return 'info';
}

function getStatusLabel(value: string) {
  return value === 'confirmed' ? '已确认' : '待确认';
}

function getStatusType(value: string) {
  return value === 'confirmed' ? 'success' : 'warning';
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: '100%',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const res = await getPaymentPage({
            pageNo: page.currentPage,
            page: page.page,
            ...formValues,
          });
          pageRows.value = ((res as any)?.list ?? []) as any[];
          return res;
        },
      },
    },
    rowConfig: { keyField: 'id', isHover: true },
    toolbarConfig: { refresh: true, search: false },
  } as VxeTableGridOptions<any>,
});
</script>

<template>
  <Page auto-content-height class="contract-business-page">
    <DetailModal title="回款详情" class="w-[720px]">
      <ElDescriptions v-if="selectedPayment" :column="2" border>
        <ElDescriptionsItem label="回款编号">{{ selectedPayment.payment_no || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同编号">{{ selectedPayment.contract_no || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="合同名称">{{ selectedPayment.contract_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="客户名称">
          <CustomerName :id="selectedPayment.client_name || selectedPayment.contract_party_b" />
        </ElDescriptionsItem>
        <ElDescriptionsItem label="回款类型">
          <ElTag :type="getPaymentTypeTagType(selectedPayment.payment_type)" effect="plain">
            {{ getPaymentTypeLabel(selectedPayment.payment_type) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="回款金额">{{ formatAmount(selectedPayment.amount) }} 元</ElDescriptionsItem>
        <ElDescriptionsItem label="回款日期">{{ selectedPayment.payment_date || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="付款方式">
          <ElTag :type="getPaymentMethodTagType(selectedPayment.payment_method)" effect="plain">
            {{ getPaymentMethodLabel(selectedPayment.payment_method) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="付款方">{{ selectedPayment.payer_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="getStatusType(selectedPayment.status)" effect="plain">
            {{ getStatusLabel(selectedPayment.status) }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="备注" :span="2">{{ selectedPayment.notes || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton @click="detailModalApi.close()">关闭</ElButton>
      </template>
    </DetailModal>

    <ElCard class="mb-4" shadow="never">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold">回款登记</div>
          <div class="mt-1 text-sm text-gray-500">从财务收入结算读取合同回款/结算结果，本页不再单独维护回款记录。</div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div class="rounded bg-gray-50 p-3">回款记录：{{ paymentSummary.total }}</div>
        <div class="rounded bg-yellow-50 p-3 text-yellow-700">待确认：{{ paymentSummary.pending }}</div>
        <div class="rounded bg-green-50 p-3 text-green-700">已确认：{{ paymentSummary.confirmed }}</div>
        <div class="rounded bg-blue-50 p-3 text-blue-700">本页金额：{{ formatAmount(paymentSummary.amount) }} 元</div>
      </div>
    </ElCard>
    <div class="mb-4">
      <component :is="(gridApi as any).searchForm"></component>
    </div>
    <ElCard class="contract-list-card" shadow="never">
<Grid>
        <template #toolbar-tools>
          <TableAction
            :actions="[
              { label: '去财务办理', type: 'primary', icon: ACTION_ICON.ADD, onClick: handleCreate },
            ]"
          />
        </template>
        <template #client_name="{ row }">
          <CustomerName :id="(row as any).client_name || (row as any).contract_party_b" />
        </template>
        <template #amount="{ row }">{{ formatAmount((row as any).amount) }}</template>
        <template #payment_type="{ row }">
          <ElTag :type="getPaymentTypeTagType((row as any).payment_type)" effect="plain">
            {{ getPaymentTypeLabel((row as any).payment_type) }}
          </ElTag>
        </template>
        <template #payment_method="{ row }">
          <ElTag :type="getPaymentMethodTagType((row as any).payment_method)" effect="plain">
            {{ getPaymentMethodLabel((row as any).payment_method) }}
          </ElTag>
        </template>
        <template #status="{ row }">
          <ElTag :type="getStatusType((row as any).status)" effect="plain">
            {{ getStatusLabel((row as any).status) }}
          </ElTag>
        </template>
        <template #actions="{ row }">
          <TableAction
            :actions="[
              { label: '详情', type: 'primary', link: true, icon: ACTION_ICON.VIEW, onClick: () => handleView(row) },
            ]"
          />
        </template>
      </Grid>
    </ElCard>
  </Page>
</template>

<style scoped>
.contract-list-card {
  height: calc(100vh - 390px);
  min-height: 360px;
  overflow: hidden;
}

.contract-list-card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;
}

.contract-list-card :deep(.vben-vxe-grid),
.contract-list-card :deep(.vxe-grid) {
  height: 100%;
  min-height: 0;
}
</style>
