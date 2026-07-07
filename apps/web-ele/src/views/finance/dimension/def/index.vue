<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getDimensionDefinitionList, type DimensionDefinition } from '#/api/erp/finance/dimension/config';

import {
  ElCard,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceDimensionDefinition' });

const loading = ref(false);
const keyword = ref('');
const tableData = ref<DimensionDefinition[]>([]);

const filteredData = computed(() => {
  const text = keyword.value.trim();
  if (!text) return tableData.value;
  return tableData.value.filter((item) =>
    [item.dim_category, item.dim_code, item.dim_name, item.source_type]
      .filter(Boolean)
      .some((value) => String(value).includes(text)),
  );
});

async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getDimensionDefinitionList();
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
        <div class="def-page__header">
          <div>
            <div class="def-page__title">维度定义</div>
            <div class="def-page__sub-title">管理维度分类、维度编码、来源类型与必填属性，当前展示苏居模拟维度字典。</div>
          </div>
          <ElInput v-model="keyword" placeholder="搜索维度编码 / 名称 / 分类" clearable class="def-page__search" />
        </div>
      </template>

      <ElTable v-loading="loading" :data="filteredData" border>
        <ElTableColumn prop="dim_category" label="维度分类" min-width="120" />
        <ElTableColumn prop="dim_code" label="维度编码" min-width="140" />
        <ElTableColumn prop="dim_name" label="维度名称" min-width="150" />
        <ElTableColumn prop="value_data_type" label="值类型" min-width="100" />
        <ElTableColumn prop="source_type" label="来源类型" min-width="120" />
        <ElTableColumn label="必填" width="90">
          <template #default="{ row }">
            <ElTag :type="Number(row.required_flag) === 1 ? 'danger' : 'info'">
              {{ Number(row.required_flag) === 1 ? '是' : '否' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
              {{ Number(row.status) === 1 ? '启用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="description" label="说明" min-width="240" />
      </ElTable>
    </ElCard>
  </Page>
</template>

<style scoped>
.def-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.def-page__title {
  font-size: 16px;
  font-weight: 600;
}

.def-page__sub-title {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.def-page__search {
  width: 320px;
}
</style>
