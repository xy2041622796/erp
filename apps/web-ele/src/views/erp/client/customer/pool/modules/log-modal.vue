<script lang="ts" setup>
import type { CrmCustomerPoolApi } from '#/api/erp/customer/pool';

import { ref, watch } from 'vue';


import { getCustomerPoolLogPage } from '#/api/erp/customer/pool';

import { formatPoolDateTime, formatPoolOperateType } from '../data';

import {
  ElEmpty,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
}>();

const loading = ref(false);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<CrmCustomerPoolApi.PoolLog[]>([]);

async function loadTableData() {
  if (!props.customerId) {
    tableData.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await getCustomerPoolLogPage({
      customerId: props.customerId,
      index: currentPage.value,
      size: page.value,
    });
    tableData.value = res?.list || [];
    total.value = res?.total || 0;
  } catch (error) {
    console.error('加载公海日志失败:', error);
    ElMessage.error('加载公海日志失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function formatDisplayDate(value?: null | string) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function handleSizeChange(size: number) {
  page.value = size;
  currentPage.value = 1;
  loadTableData();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadTableData();
}

watch(
  () => props.customerId,
  () => {
    currentPage.value = 1;
    loadTableData();
  },
  { immediate: true },
);
</script>

<template>
  <div class="px-2 py-2">
    <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
      <ElTableColumn prop="operateType" label="操作类型" min-width="120">
        <template #default="{ row }">
          {{ formatPoolOperateType(row.operateType) }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="operateTime" label="操作时间" min-width="170">
        <template #default="{ row }">
          {{ formatPoolDateTime(row.operateTime) }}
        </template>
      </ElTableColumn>
      <ElTableColumn prop="operatorUserName" label="操作人" min-width="120" />
      <ElTableColumn prop="beforeOwnerUserName" label="变更前负责人" min-width="140" />
      <ElTableColumn prop="afterOwnerUserName" label="变更后负责人" min-width="140" />
      <ElTableColumn prop="beforeDepartName" label="变更前部门" min-width="140" />
      <ElTableColumn prop="afterDepartName" label="变更后部门" min-width="140" />
      <ElTableColumn prop="reason" label="原因" min-width="180" show-overflow-tooltip />
      <template #empty>
        <ElEmpty description="暂无日志" />
      </template>
    </ElTable>

    <div class="pagination-container mt-4">
      <ElPagination
        v-model:current-page="currentPage"
        v-model:page-size="page"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: flex-end;
}
</style>
