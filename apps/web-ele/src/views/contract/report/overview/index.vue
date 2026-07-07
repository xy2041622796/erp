<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getOverviewData } from '#/api/erp/contract/report/original';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElProgress,
  ElRow,
  ElStatistic,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const year = ref(String(new Date().getFullYear()));
const loading = ref(false);
const stats = ref<any>({});
const statusDistribution = ref<any[]>([]);
const monthlyData = ref<any[]>([]);
const typeStats = ref<any[]>([]);

const yearOptions = computed(() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2].map(String);
});

function formatAmount(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getOverviewData({ year: year.value });
    const overview = (res as any)?.data?.overview || {};
    stats.value = overview.stats || {};
    statusDistribution.value = overview.statusDistribution || [];
    monthlyData.value = overview.monthlyData || [];
    typeStats.value = overview.typeStats || [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex items-center gap-2">
      <ElDropdown @command="(val) => { year = val; loadData(); }">
        <ElButton type="default">
          {{ year }}年<span class="ml-1 text-xs">▼</span>
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem v-for="item in yearOptions" :key="item" :command="item">{{ item }}年</ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <ElButton :loading="loading" @click="loadData">刷新</ElButton>
      <ElButton disabled>导出报表</ElButton>
    </div>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="合同总数" :value="stats.totalContracts || 0" suffix="份" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="合同总额" :value="stats.totalAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="平均金额" :value="stats.avgAmount || 0" suffix="元" /></ElCard></ElCol>
      <ElCol :span="6"><ElCard v-loading="loading" shadow="never"><ElStatistic title="完成率" :value="stats.completionRate || 0" suffix="%" /></ElCard></ElCol>
    </ElRow>

    <ElRow :gutter="16" class="mb-4">
      <ElCol :span="12">
        <ElCard v-loading="loading" shadow="never" class="h-full">
          <template #header>合同状态分布</template>
          <div class="min-h-[460px]">
            <div v-for="item in statusDistribution" :key="item.label" class="mb-6">
              <div class="mb-1 flex justify-between text-sm">
                <span>{{ item.label }}</span>
                <span>{{ item.value }} 份 / {{ item.percentage }}%</span>
              </div>
              <ElProgress :percentage="Number(item.percentage || 0)" :show-text="false" />
            </div>
            <div v-if="statusDistribution.length === 0" class="py-8 text-center text-gray-400">暂无数据</div>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :span="12">
        <ElCard v-loading="loading" shadow="never" class="h-full">
          <template #header>签约走势</template>
          <ElTable :data="monthlyData" size="small" border>
            <ElTableColumn prop="month" label="月份" width="80" />
            <ElTableColumn prop="count" label="合同数" width="90" />
            <ElTableColumn label="签约金额">
              <template #default="{ row }">{{ formatAmount(row.amount) }} 元</template>
            </ElTableColumn>
          </ElTable>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElCard v-loading="loading" shadow="never">
      <template #header>合同类型统计</template>
      <ElTable :data="typeStats" border>
        <ElTableColumn prop="type" label="合同类型" min-width="160" />
        <ElTableColumn prop="count" label="合同数量" width="120" />
        <ElTableColumn label="合同金额" min-width="160">
          <template #default="{ row }">{{ formatAmount(row.amount) }} 元</template>
        </ElTableColumn>
        <ElTableColumn prop="percentage" label="金额占比" width="120">
          <template #default="{ row }"><ElTag effect="plain">{{ row.percentage }}%</ElTag></template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </Page>
</template>
