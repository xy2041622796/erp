<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getDimensionExceptionList, type DimensionExceptionItem } from '#/api/erp/finance/dimension/config';

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

defineOptions({ name: 'FinanceDimensionException' });

const loading = ref(false);
const keyword = ref('');
const tableData = ref<DimensionExceptionItem[]>([]);
const currentRow = ref<DimensionExceptionItem | null>(null);

const filteredData = computed(() => {
  const text = keyword.value.trim();
  if (!text) return tableData.value;
  return tableData.value.filter((item) =>
    [item.event_code, item.ref_id, item.error_message, item.rule_code, item.rule_name]
      .filter(Boolean)
      .some((value) => String(value).includes(text)),
  );
});

async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getDimensionExceptionList();
    currentRow.value = tableData.value[0] || null;
  } finally {
    loading.value = false;
  }
}

function handleRowClick(row: DimensionExceptionItem) {
  currentRow.value = row;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <ElCard shadow="never">
      <template #header>
        <div class="exception-page__header">
          <div>
            <div class="exception-page__title">维度异常池</div>
            <div class="exception-page__sub-title">聚合未命中规则、必填维度缺失、待处理单据，当前展示苏居模拟异常数据。</div>
          </div>
          <ElInput v-model="keyword" placeholder="搜索单号 / 事件 / 错误信息" clearable class="exception-page__search" />
        </div>
      </template>

      <div class="exception-page__layout">
        <ElTable v-loading="loading" :data="filteredData" border height="460" @row-click="handleRowClick">
          <ElTableColumn prop="event_code" label="事件编码" min-width="180" />
          <ElTableColumn prop="ref_id" label="业务单号" min-width="180" />
          <ElTableColumn prop="biz_category" label="业务分类" min-width="100" />
          <ElTableColumn label="维度状态" min-width="110">
            <template #default="{ row }">
              <ElTag :type="row.dimension_status === 'FAILED' ? 'danger' : 'warning'">
                {{ row.dimension_status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="凭证状态" min-width="110">
            <template #default="{ row }">
              <ElTag :type="row.voucher_status === 'FAILED' ? 'danger' : 'info'">
                {{ row.voucher_status }}
              </ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="error_message" label="错误信息" min-width="260" />
        </ElTable>

        <ElCard shadow="never" class="exception-page__detail-card">
          <template #header>
            <div class="exception-page__detail-title">异常详情</div>
          </template>

          <template v-if="currentRow">
            <ElDescriptions :column="1" border>
              <ElDescriptionsItem label="业务单号">{{ currentRow.ref_id }}</ElDescriptionsItem>
              <ElDescriptionsItem label="事件编码">{{ currentRow.event_code }}</ElDescriptionsItem>
              <ElDescriptionsItem label="业务分类">{{ currentRow.biz_category }}</ElDescriptionsItem>
              <ElDescriptionsItem label="业务日期">{{ currentRow.biz_date }}</ElDescriptionsItem>
              <ElDescriptionsItem label="命中规则">{{ currentRow.rule_code || '-' }} {{ currentRow.rule_name || '' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="维度状态">{{ currentRow.dimension_status }}</ElDescriptionsItem>
              <ElDescriptionsItem label="凭证状态">{{ currentRow.voucher_status }}</ElDescriptionsItem>
              <ElDescriptionsItem label="异常说明">{{ currentRow.error_message }}</ElDescriptionsItem>
            </ElDescriptions>
          </template>
          <ElEmpty v-else description="暂无异常数据" />
        </ElCard>
      </div>
    </ElCard>
  </Page>
</template>

<style scoped>
.exception-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.exception-page__title {
  font-size: 16px;
  font-weight: 600;
}

.exception-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.exception-page__search {
  width: 320px;
}

.exception-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
  gap: 16px;
}

.exception-page__detail-card {
  min-height: 460px;
}

.exception-page__detail-title {
  font-size: 15px;
  font-weight: 600;
}
</style>
