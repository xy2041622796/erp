<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getDimensionEventList, type DimensionEventConfig } from '#/api/erp/finance/dimension/config';

import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionEventConfig' });

const loading = ref(false);
const keyword = ref('');
const currentRow = ref<DimensionEventConfig | null>(null);
const tableData = ref<DimensionEventConfig[]>([]);

const filteredData = computed(() => {
  const text = keyword.value.trim();
  if (!text) return tableData.value;
  return tableData.value.filter((item) =>
    [item.event_code, item.event_name, item.biz_category, item.source_table, item.trigger_action]
      .filter(Boolean)
      .some((value) => String(value).includes(text)),
  );
});

async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getDimensionEventList();
    currentRow.value = tableData.value[0] || null;
  } finally {
    loading.value = false;
  }
}

function handleRowClick(row: DimensionEventConfig) {
  currentRow.value = row;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="dimension-page">
      <ElCard shadow="never">
        <template #header>
          <div class="dimension-page__title-wrap">
            <div>
              <div class="dimension-page__title">维度事件配置</div>
              <div class="dimension-page__sub-title">定义哪些业务动作会触发业财维度计算，当前为苏居模拟数据。</div>
            </div>
            <ElInput v-model="keyword" placeholder="搜索事件编码 / 名称 / 来源表" clearable class="dimension-page__search" />
          </div>
        </template>

        <div class="dimension-page__content">
          <ElTable v-loading="loading" :data="filteredData" border height="460" @row-click="handleRowClick">
            <ElTableColumn prop="event_code" label="事件编码" min-width="180" />
            <ElTableColumn prop="event_name" label="事件名称" min-width="180" />
            <ElTableColumn prop="biz_category" label="业务分类" min-width="100" />
            <ElTableColumn prop="source_table" label="来源表" min-width="180" />
            <ElTableColumn prop="trigger_action" label="触发动作" min-width="120" />
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="Number(row.enabled) === 1 ? 'success' : 'info'">
                  {{ Number(row.enabled) === 1 ? '启用' : '停用' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>

          <ElCard shadow="never" class="dimension-page__detail-card">
            <template #header>
              <div class="dimension-page__detail-title">事件说明</div>
            </template>
            <template v-if="currentRow">
              <ElDescriptions :column="1" border>
                <ElDescriptionsItem label="事件编码">{{ currentRow.event_code }}</ElDescriptionsItem>
                <ElDescriptionsItem label="事件名称">{{ currentRow.event_name }}</ElDescriptionsItem>
                <ElDescriptionsItem label="业务分类">{{ currentRow.biz_category }}</ElDescriptionsItem>
                <ElDescriptionsItem label="来源表">{{ currentRow.source_table }}</ElDescriptionsItem>
                <ElDescriptionsItem label="触发动作">{{ currentRow.trigger_action }}</ElDescriptionsItem>
                <ElDescriptionsItem label="说明">{{ currentRow.description || '-' }}</ElDescriptionsItem>
              </ElDescriptions>
            </template>
            <ElEmpty v-else description="暂无事件配置" />
          </ElCard>
        </div>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.dimension-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dimension-page__title-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dimension-page__title {
  font-size: 16px;
  font-weight: 600;
}

.dimension-page__sub-title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  margin-top: 4px;
}

.dimension-page__search {
  width: 320px;
}

.dimension-page__content {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 16px;
}

.dimension-page__detail-card {
  min-height: 460px;
}

.dimension-page__detail-title {
  font-size: 15px;
  font-weight: 600;
}
</style>
