<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { getContractPage } from '#/api/erp/contract/contract';

import {
  ElCard,
  ElCol,
  ElEmpty,
  ElIcon,
  ElRow,
  ElStatistic,
} from 'element-plus';
import {
  DocumentAdd,
  DocumentChecked,
  DocumentCopy,
} from '@element-plus/icons-vue';

const router = useRouter();

const loading = ref(false);
const incomeContracts = ref<any[]>([]);
const outcomeContracts = ref<any[]>([]);

function daysUntil(dateStr: string) {
  if (!dateStr) return Infinity;
  const end = new Date(dateStr.includes('T') ? dateStr.split('T')[0] : dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const pendingApproval = computed(() =>
  [...incomeContracts.value, ...outcomeContracts.value].filter((row) => Number(row?.ConState) === 1),
);

const pendingSettlement = computed(() =>
  [...incomeContracts.value, ...outcomeContracts.value].filter((row) => Number(row?.ConState) === 2),
);

const expiringSoon = computed(() =>
  [...incomeContracts.value, ...outcomeContracts.value].filter((row) => {
    const days = daysUntil(row?.contract_end_date);
    return days >= 0 && days <= 7;
  }),
);

function toAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sumAmount(rows: any[]) {
  return rows.reduce((total, row) => total + toAmount(row?.contract_total_amount ?? row?.contract_amount), 0);
}

function countCompleted(rows: any[]) {
  return rows.filter((row) => Number(row?.ConState) === 3).length;
}

const incomeAmount = computed(() => sumAmount(incomeContracts.value));
const outcomeAmount = computed(() => sumAmount(outcomeContracts.value));
const incomeCompletedCount = computed(() => countCompleted(incomeContracts.value));
const outcomeCompletedCount = computed(() => countCompleted(outcomeContracts.value));
const executingCount = computed(() => {
  return [...incomeContracts.value, ...outcomeContracts.value].filter((row) => {
    const state = Number(row?.ConState);
    return state === 1 || state === 2;
  }).length;
});

function goTo(path: string) {
  router.push(path);
}

async function loadDashboard() {
  loading.value = true;
  try {
    const [incomeRes, outcomeRes] = await Promise.all([
      getContractPage({ pageNo: 1, page: 0, contract_category: 0 }),
      getContractPage({ pageNo: 1, page: 0, contract_category: 1 }),
    ]);
    incomeContracts.value = ((incomeRes as any)?.list ?? []) as any[];
    outcomeContracts.value = ((outcomeRes as any)?.list ?? []) as any[];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboard();
});
</script>

<template>
  <Page auto-content-height>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="6">
        <ElCard v-loading="loading" shadow="never">
          <template #header>合同总数</template>
          <ElStatistic :value="incomeContracts.length + outcomeContracts.length" suffix="份" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard v-loading="loading" shadow="never">
          <template #header>收入合同金额</template>
          <ElStatistic :value="incomeAmount" suffix="元" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard v-loading="loading" shadow="never">
          <template #header>支出合同金额</template>
          <ElStatistic :value="outcomeAmount" suffix="元" />
        </ElCard>
      </ElCol>
      <ElCol :span="6">
        <ElCard v-loading="loading" shadow="never">
          <template #header>履行中合同</template>
          <ElStatistic :value="executingCount" suffix="份" />
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="12">
        <ElCard shadow="never" class="h-full">
          <template #header>收入合同概览</template>
          <ElEmpty v-if="incomeContracts.length === 0" description="暂无收入合同数据" />
          <div v-else class="space-y-3">
            <ElStatistic :value="incomeContracts.length" suffix="份" />
            <div class="space-y-1 text-sm text-gray-600">
              <div>合同金额合计：{{ incomeAmount.toFixed(2) }} 元</div>
              <div>已完成合同：{{ incomeCompletedCount }} 份</div>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :span="12">
        <ElCard shadow="never" class="h-full">
          <template #header>支出合同概览</template>
          <ElEmpty v-if="outcomeContracts.length === 0" description="暂无支出合同数据" />
          <div v-else class="space-y-3">
            <ElStatistic :value="outcomeContracts.length" suffix="份" />
            <div class="space-y-1 text-sm text-gray-600">
              <div>合同金额合计：{{ outcomeAmount.toFixed(2) }} 元</div>
              <div>已完成合同：{{ outcomeCompletedCount }} 份</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16">
      <ElCol :span="8">
        <ElCard shadow="never" class="h-full cursor-pointer" @click="goTo('/contract/draft/income')">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-500">待审批合同</div>
              <div class="mt-1 text-2xl font-semibold">{{ pendingApproval.length }} 份</div>
            </div>
            <div class="rounded-full bg-blue-50 p-3 text-blue-500">
              <ElIcon :size="24"><DocumentAdd /></ElIcon>
            </div>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="never" class="h-full cursor-pointer" @click="goTo('/contract/draft/income')">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-500">待结算合同</div>
              <div class="mt-1 text-2xl font-semibold">{{ pendingSettlement.length }} 份</div>
            </div>
            <div class="rounded-full bg-orange-50 p-3 text-orange-500">
              <ElIcon :size="24"><DocumentCopy /></ElIcon>
            </div>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="never" class="h-full cursor-pointer" @click="goTo('/contract/draft/income')">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-500">7日内到期合同</div>
              <div class="mt-1 text-2xl font-semibold">{{ expiringSoon.length }} 份</div>
            </div>
            <div class="rounded-full bg-red-50 p-3 text-red-500">
              <ElIcon :size="24"><DocumentChecked /></ElIcon>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </Page>
</template>
