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

import { ElAlert, ElTabPane, ElTabs, ElTag } from 'element-plus';

const activeTab = ref<'income' | 'outcome'>('income');
const contractCategory = ref<0 | 1>(0);

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function getContractStatusLabel(row: any) {
  const state = Number(row?.ConState);
  if (state === 0) return '待审批';
  if (state === 1) return '待结算';
  if (state === 2) return '待收付款';
  if (state === 3) return '完成';
  return '-';
}

function handleChangeCategory(name: string | number) {
  contractCategory.value = String(name) === 'outcome' ? 1 : 0;
  gridApi.query();
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
      title="商务与合同 / 合同台账"
      type="info"
      description="仿照收入合同页面，使用 getContractPage 查询合同主表，通过 contract_category 区分收入合同和支出合同。"
    />

    <ElTabs v-model:model-value="activeTab" class="mb-4" @tab-change="handleChangeCategory">
      <ElTabPane label="收入合同台账" name="income" />
      <ElTabPane label="支出合同台账" name="outcome" />
    </ElTabs>
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

      <template #sign_date="{ row }">
        {{ formatDateOnly((row as any).contract_signing_date) || '-' }}
      </template>

      <template #amount="{ row }">
        {{ formatAmount((row as any).contract_amount) }}
      </template>

      <template #total_amount="{ row }">
        {{ formatAmount((row as any).contract_total_amount) }}
      </template>

      <template #status="{ row }">
        <ElTag effect="plain">{{ getContractStatusLabel(row) }}</ElTag>
      </template>
    </Grid>
  </Page>
</template>
