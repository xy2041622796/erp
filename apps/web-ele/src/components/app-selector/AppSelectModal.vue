<script lang="ts" setup>
import { computed, ref } from 'vue';


import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import { getSourceAppPage } from '#/api/erp/finance/settings/basic_data/business_standardization';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'AppSelectModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: FinanceBusinessSourceSystemApi.AppRow];
}>();

const queryName = ref('');
const pageNo = ref(1);
const page = ref(10);

const loading = ref(false);
const total = ref(0);
const list = ref<FinanceBusinessSourceSystemApi.AppRow[]>([]);
const selected = ref<FinanceBusinessSourceSystemApi.AppRow | null>(null);

const title = computed(() => '选择应用');
const visible = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const res = await getSourceAppPage({
      pageNo: pageNo.value,
      page: page.value,
      keyword: queryName.value,
    } as any);
    list.value = (res?.list || []) as FinanceBusinessSourceSystemApi.AppRow[];
    total.value = Number(res?.total || 0);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pageNo.value = 1;
  selected.value = null;
  loadData();
}

function handleRowClick(row: FinanceBusinessSourceSystemApi.AppRow) {
  selected.value = row;
}

function handleRowDblClick(row: FinanceBusinessSourceSystemApi.AppRow) {
  selected.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selected.value) return;
  close();
  emit('confirm', selected.value);
}

function open() {
  visible.value = true;
  queryName.value = '';
  pageNo.value = 1;
  page.value = 10;
  selected.value = null;
  loadData();
}

function close() {
  visible.value = false;
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

function resolveSystemName(row: FinanceBusinessSourceSystemApi.AppRow) {
  return row?.AppDesc || row?.NameStr || row?.AppName || '-';
}

function formatCreateTime(value?: string) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 10);
}

function resolveStatusText(row: FinanceBusinessSourceSystemApi.AppRow & Record<string, any>) {
  if (row?.status) return String(row.status);
  if (row?.Status) return String(row.Status);
  if (row?.StateName) return String(row.StateName);
  if (row?.flowstate === 0) return '策划';
  if (row?.flowstate === 1) return '开发';
  if (row?.flowstate === 2) return '测试';
  if (row?.flowstate === 3) return '上线';
  return '-';
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="title"
    width="min(75rem, 96vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div class="px-4">
      <div class="mb-3 flex gap-2">
        <ElInput
          v-model="queryName"
          placeholder="请输入简称 / 系统名称"
          clearable
          @keyup.enter="handleSearch"
        />
        <ElButton type="primary" @click="handleSearch">查询</ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        border
        highlight-current-row
        style="width: 100%; height: 460px"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblClick"
      >
        <ElTableColumn type="index" label="序号" width="70" align="center" />
        <ElTableColumn prop="AppName" label="简称" min-width="220" show-overflow-tooltip />
        <ElTableColumn label="系统名称" min-width="240" show-overflow-tooltip>
          <template #default="scope">
            {{ resolveSystemName(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="创建时间" min-width="140" align="center">
          <template #default="scope">
            {{ formatCreateTime(scope.row.CreateTime) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" min-width="120" align="center">
          <template #default="scope">
            {{ resolveStatusText(scope.row) }}
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex items-center justify-between">
        <ElPagination
          v-model:current-page="pageNo"
          v-model:page-size="page"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />

        <div class="flex gap-2">
          <ElButton @click="handleCancel">取消</ElButton>
          <ElButton type="primary" :disabled="!selected" @click="handleConfirm">确定</ElButton>
        </div>
      </div>
    </div>
  </ElDialog>
</template>
