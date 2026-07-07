<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getDimensionDictMapList, type DimensionDictMap } from '#/api/erp/finance/dimension/config';

import {
  ElCard,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionDictMap' });

const loading = ref(false);
const keyword = ref('');
const tableData = ref<DimensionDictMap[]>([]);

const filteredData = computed(() => {
  const text = keyword.value.trim();
  if (!text) return tableData.value;
  return tableData.value.filter((item) =>
    [item.map_code, item.source_value, item.target_value, item.target_name]
      .filter(Boolean)
      .some((value) => String(value).includes(text)),
  );
});

async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getDimensionDictMapList();
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <ElCard shadow="never">
      <template #header>
        <div class="dict-page__header">
          <div>
            <div class="dict-page__title">维度字典映射</div>
            <div class="dict-page__sub-title">用于把业务字段值映射成分析维度值，当前内置苏居客户等级映射样例。</div>
          </div>
          <ElInput v-model="keyword" placeholder="搜索映射编码 / 来源值 / 目标值" clearable class="dict-page__search" />
        </div>
      </template>

      <ElTable v-loading="loading" :data="filteredData" border>
        <ElTableColumn prop="map_code" label="映射编码" min-width="180" />
        <ElTableColumn prop="source_value" label="来源值" min-width="120" />
        <ElTableColumn prop="target_value" label="目标值" min-width="120" />
        <ElTableColumn prop="target_name" label="目标名称" min-width="150" />
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '启用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="description" label="说明" min-width="260" />
      </ElTable>
    </ElCard>
  </Page>
</template>

<style scoped>
.dict-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dict-page__title {
  font-size: 16px;
  font-weight: 600;
}

.dict-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.dict-page__search {
  width: 320px;
}
</style>
