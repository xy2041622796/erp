<script lang="ts" setup>
import { computed, ref } from 'vue';


import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import { getTableFieldPage } from '#/api/erp/finance/settings/basic_data/business_standardization';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FieldSelectModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: FinanceBusinessSourceSystemApi.TableFieldRow];
}>();

const visible = ref(false);
const loading = ref(false);
const title = ref('选择字段');
const tblid = ref('');
const keyword = ref('');
const pageNo = ref(1);
const page = ref(15);
const total = ref(0);
const list = ref<FinanceBusinessSourceSystemApi.TableFieldRow[]>([]);
const selected = ref<FinanceBusinessSourceSystemApi.TableFieldRow | null>(null);

const dialogTitle = computed(() => title.value || '选择字段');

async function loadData() {
  if (!tblid.value) {
    list.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await getTableFieldPage({
      pageNo: pageNo.value,
      page: page.value,
      tblid: tblid.value,
      keyword: keyword.value,
    } as any);
    list.value = (res?.list || []) as FinanceBusinessSourceSystemApi.TableFieldRow[];
    total.value = Number(res?.total || 0);
  } finally {
    loading.value = false;
  }
}

function open(options: { title?: string; tblid?: string }) {
  title.value = String(options?.title || '选择字段');
  tblid.value = String(options?.tblid || '');
  keyword.value = '';
  pageNo.value = 1;
  page.value = 15;
  total.value = 0;
  list.value = [];
  selected.value = null;
  visible.value = true;
  loadData();
}

function close() {
  visible.value = false;
}

function handleSearch() {
  pageNo.value = 1;
  selected.value = null;
  loadData();
}

function handleRowClick(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  selected.value = row;
}

function handleRowDblClick(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  selected.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selected.value) return;
  close();
  emit('confirm', selected.value);
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

function resolveName(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return row?.enname || row?.AsName || '-';
}

function resolveCnName(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return row?.cnname || row?.description || '-';
}

function resolveType(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return row?.DataTypeName || row?.DataType || '-';
}

function resolveLength(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return row?.DataLen || '-';
}

function resolvePKeyType(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return Number(row?.IsPKey || 0) === 1 ? 'danger' : 'info';
}

function resolvePKeyText(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return Number(row?.IsPKey || 0) === 1 ? '主键' : '普通';
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="dialogTitle"
    width="min(78rem, 96vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div>
      <div class="mb-3 flex gap-2">
        <ElInput
          v-model="keyword"
          placeholder="请输入字段名 / 中文名"
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
        <ElTableColumn label="字段名" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            {{ resolveName(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="中文名" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            {{ resolveCnName(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="类型" min-width="120" align="center">
          <template #default="scope">
            {{ resolveType(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="长度" min-width="100" align="center">
          <template #default="scope">
            {{ resolveLength(scope.row) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="主键" min-width="100" align="center">
          <template #default="scope">
            <ElTag :type="resolvePKeyType(scope.row)">{{ resolvePKeyText(scope.row) }}</ElTag>
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
