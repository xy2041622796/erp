<script lang="ts" setup>
import { computed, ref } from 'vue';


import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import {
  getCurrentAppAllTablePage,
  getTableFieldPage,
} from '#/api/erp/finance/settings/basic_data/business_standardization';

import type {
  CurrentAppFieldSelectionResult,
  CurrentAppFieldSelectorOpenOptions,
} from './types';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'CurrentAppFieldSelectorModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: CurrentAppFieldSelectionResult];
}>();

const visible = ref(false);
const loading = ref(false);
const dialogTitle = ref('选择表和字段');
const appDesc = ref('数据资产管理');

const tableList = ref<FinanceBusinessSourceSystemApi.AppTableRow[]>([]);
const fieldList = ref<FinanceBusinessSourceSystemApi.TableFieldRow[]>([]);

const selectedTable = ref<FinanceBusinessSourceSystemApi.AppTableRow | null>(null);
const selectedField = ref<FinanceBusinessSourceSystemApi.TableFieldRow | null>(null);

const tableKeyword = ref('');
const fieldKeyword = ref('');

const tablePageNo = ref(1);
const tablePageSize = ref(15);
const tableTotal = ref(0);

const fieldPageNo = ref(1);
const fieldPageSize = ref(15);
const fieldTotal = ref(0);

const currentTableName = computed(() => {
  const row = selectedTable.value;
  return String(row?.tbldesc || row?.tblname || '-');
});

async function runLoading(task: () => Promise<void>) {
  loading.value = true;
  try {
    await task();
  } finally {
    loading.value = false;
  }
}

async function loadTableList() {
  const res = await getCurrentAppAllTablePage({
    pageNo: tablePageNo.value,
    page: tablePageSize.value,
    appDesc: appDesc.value,
    keyword: tableKeyword.value,
  });
  tableList.value = res.list || [];
  tableTotal.value = Number(res.total || 0);
  selectedTable.value = tableList.value[0] || null;
}

async function loadFieldList() {
  const tblid = String(selectedTable.value?.id || selectedTable.value?.rowid || '');
  if (!tblid) {
    fieldList.value = [];
    fieldTotal.value = 0;
    selectedField.value = null;
    return;
  }
  const res = await getTableFieldPage({
    pageNo: fieldPageNo.value,
    page: fieldPageSize.value,
    tblid,
    keyword: fieldKeyword.value,
  });
  fieldList.value = res.list || [];
  fieldTotal.value = Number(res.total || 0);
  selectedField.value = fieldList.value[0] || null;
}

async function open(options?: CurrentAppFieldSelectorOpenOptions) {
  dialogTitle.value = options?.title || '选择表和字段';
  appDesc.value = options?.appDesc || '数据资产管理';
  visible.value = true;

  tableKeyword.value = '';
  fieldKeyword.value = '';
  tablePageNo.value = 1;
  fieldPageNo.value = 1;
  selectedTable.value = null;
  selectedField.value = null;
  tableList.value = [];
  fieldList.value = [];
  tableTotal.value = 0;
  fieldTotal.value = 0;

  await runLoading(async () => {
    await loadTableList();
    await loadFieldList();
  });
}

function close() {
  visible.value = false;
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

async function handleTableSearch() {
  tablePageNo.value = 1;
  fieldPageNo.value = 1;
  await runLoading(async () => {
    await loadTableList();
    await loadFieldList();
  });
}

async function handleTablePageChange(page: number) {
  tablePageNo.value = page;
  fieldPageNo.value = 1;
  await runLoading(async () => {
    await loadTableList();
    await loadFieldList();
  });
}

async function handleTableRowClick(row: FinanceBusinessSourceSystemApi.AppTableRow) {
  selectedTable.value = row;
  fieldPageNo.value = 1;
  await runLoading(async () => {
    await loadFieldList();
  });
}

async function handleFieldSearch() {
  fieldPageNo.value = 1;
  await runLoading(async () => {
    await loadFieldList();
  });
}

async function handleFieldPageChange(page: number) {
  fieldPageNo.value = page;
  await runLoading(async () => {
    await loadFieldList();
  });
}

function handleFieldRowClick(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  selectedField.value = row;
}

function handleFieldRowDblClick(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  selectedField.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selectedTable.value || !selectedField.value) return;
  emit('confirm', {
    database: selectedTable.value?.dbRow || null,
    table: selectedTable.value,
    field: selectedField.value,
  });
  close();
}

function resolveDbName(row: FinanceBusinessSourceSystemApi.AppTableRow) {
  return String(row?.dbRow?.conName || row?.dbRow?.Name || row?.dbRow?.ValueName || '-');
}

function resolveFieldCnName(row: FinanceBusinessSourceSystemApi.TableFieldRow) {
  return String(row?.cnname || row?.description || '-');
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog v-model="visible" :title="dialogTitle" width="min(80rem, 96vw)" append-to-body destroy-on-close
    :close-on-click-modal="false" :close-on-press-escape="true" @close="handleCancel">
    <div v-loading="loading" class="current-app-field-selector">
      <div class="panel-section">
        <div class="panel-search panel-search--inline">
          <ElInput v-model="tableKeyword" placeholder="请输入表名 / 中文名" clearable @keyup.enter="handleTableSearch" />
          <ElButton type="primary" @click="handleTableSearch">查询</ElButton>
        </div>
        <ElTable :data="tableList" border highlight-current-row height="520" @row-click="handleTableRowClick">
          <ElTableColumn type="index" label="序号" width="50" align="center" />
          <ElTableColumn label="库名" min-width="60" show-overflow-tooltip>
            <template #default="scope">
              {{ resolveDbName(scope.row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="tblname" label="表名" min-width="60" show-overflow-tooltip />
          <ElTableColumn prop="tbldesc" label="中文名称" min-width="60" show-overflow-tooltip />
        </ElTable>
        <div class="panel-pagination">
          <div class="panel-current">当前选表：{{ currentTableName }}</div>
          <ElPagination v-model:current-page="tablePageNo" v-model:page-size="tablePageSize" :total="tableTotal"
            layout="total, prev, pager, next" @current-change="handleTablePageChange" />
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-search panel-search--inline">
          <ElInput v-model="fieldKeyword" placeholder="请输入字段名 / 中文名" clearable @keyup.enter="handleFieldSearch" />
          <ElButton type="primary" @click="handleFieldSearch">查询</ElButton>
        </div>
        <ElTable :data="fieldList" border highlight-current-row height="520" @row-click="handleFieldRowClick"
          @row-dblclick="handleFieldRowDblClick">
          <ElTableColumn type="index" label="序号" width="50" align="center" />
          <ElTableColumn prop="enname" label="字段名" min-width="120" show-overflow-tooltip />
          <ElTableColumn label="中文名称" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ resolveFieldCnName(scope.row) }}
            </template>
          </ElTableColumn>
        </ElTable>
        <div class="panel-pagination">
          <div class="panel-current">双击字段可直接确定</div>
          <ElPagination v-model:current-page="fieldPageNo" v-model:page-size="fieldPageSize" :total="fieldTotal"
            layout="total, prev, pager, next" @current-change="handleFieldPageChange" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-actions">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" :disabled="!selectedField" @click="handleConfirm">确定</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.current-app-field-selector {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.panel-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.panel-search--inline {
  display: flex;
  gap: 12px;
}

.panel-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-current {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media screen and (width <=1200px) {
  .current-app-field-selector {
    grid-template-columns: 1fr;
  }
}
</style>
