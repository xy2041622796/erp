<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CrmContractApi } from '#/api/erp/contract/contract';

import {
  ref } from 'vue';

import { Page } from '@vben/common-ui';


import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getContractPage } from '#/api/erp/contract/contract';
import CustomerName from '#/components/customer-selector/CustomerName.vue';
import { formatDateOnly } from '#/utils/date';

import { useGridColumns, useGridFormSchema } from './data';

import {
  ElAlert,
  ElButton,
  ElMessage,
  ElRadioButton,
  ElRadioGroup,
  ElTag,
} from 'element-plus';

const flowType = ref<'change' | 'termination'>('change');
const contractCategory = ref<0 | 1>(0);

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getContractStatusLabel(row: any) {
  const state = Number(row?.ConState);
  if (state === 0) return '待审批';
  if (state === 1) return '待结算';
  if (state === 2) return contractCategory.value === 0 ? '待收款' : '待付款';
  if (state === 3) return '完成';
  return '-';
}

function handleQuery() {
  gridApi.query();
}

function handleCreateChange(row: any) {
  ElMessage.info(`合同变更流程待接入：${row?.contract_no || row?.contract_name || ''}`);
}

function handleCreateTermination(row: any) {
  ElMessage.info(`合同终结流程待接入：${row?.contract_no || row?.contract_name || ''}`);
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getContractPage({
            pageNo: page.currentPage,
            page: page.page,
            contract_category: contractCategory.value,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { keyField: 'rowid', isHover: true },
    toolbarConfig: { refresh: true, search: false },
  } as VxeTableGridOptions<CrmContractApi.Contract>,
});
</script>

<template>
  <Page auto-content-height>
    <ElAlert
      class="mb-4"
      show-icon
      title="商务与合同 / 合同变更终结"
      type="info"
    />

    <div class="mb-4 flex flex-wrap items-center gap-4">
      <ElRadioGroup v-model="contractCategory" @change="handleQuery">
        <ElRadioButton :label="0">收入合同</ElRadioButton>
        <ElRadioButton :label="1">支出合同</ElRadioButton>
      </ElRadioGroup>

      <ElRadioGroup v-model="flowType">
        <ElRadioButton label="change">合同变更</ElRadioButton>
        <ElRadioButton label="termination">合同终结</ElRadioButton>
      </ElRadioGroup>
    </div>
    <div class="mb-4">
      <component :is="(gridApi as any).searchForm"></component>
    </div>
    <Grid>
      <template #contract_no="{ row }">
        <span class="font-mono text-blue-600">{{ (row as any).contract_no || '-' }}</span>
      </template>

      <template #party="{ row }">
        <CustomerName :id="(row as any).contract_party_b ?? (row as any).contract_party_a" />
      </template>

      <template #total_amount="{ row }">
        {{ formatAmount((row as any).contract_total_amount) }}
      </template>

      <template #sign_date="{ row }">
        {{ formatDateOnly((row as any).contract_signing_date) || '-' }}
      </template>

      <template #status="{ row }">
        <ElTag effect="plain">{{ getContractStatusLabel(row) }}</ElTag>
      </template>

      <template #actions="{ row }">
        <ElButton
          v-if="flowType === 'change'"
          type="primary"
          link
          @click="handleCreateChange(row)"
        >
          发起变更
        </ElButton>
        <ElButton
          v-else
          type="danger"
          link
          @click="handleCreateTermination(row)"
        >
          发起终结
        </ElButton>
      </template>
    </Grid>
  </Page>
</template>
