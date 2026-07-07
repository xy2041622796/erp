<script lang="ts" setup>
import { computed, ref } from 'vue';


import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';
import {
  getCurrentAppDatabasePage,
  getCurrentAppTablePage,
} from '#/api/erp/finance/settings/basic_data/business_standardization';

import {
  ElButton,
  ElDialog,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'AppDbSelectModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }];
}>();

const dbKeyword = ref('');
const tableKeyword = ref('');
const pageNo = ref(1);
const page = ref(15);
const currentSysId = ref('');

const dbLoading = ref(false);
const tableLoading = ref(false);
const dbList = ref<FinanceBusinessSourceSystemApi.AppDatabaseRow[]>([]);
const tableList = ref<FinanceBusinessSourceSystemApi.AppTableRow[]>([]);
const selectedDb = ref<FinanceBusinessSourceSystemApi.AppDatabaseRow | null>(null);
const selectedTable = ref<(FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) | null>(null);
const tableTotal = ref(0);

const title = computed(() => '选择当前应用下的表');
const visible = ref(false);

async function loadDbList() {
  if (!currentSysId.value) {
    dbList.value = [];
    selectedDb.value = null;
    tableList.value = [];
    tableTotal.value = 0;
    return;
  }
  dbLoading.value = true;
  try {
    const res = await getCurrentAppDatabasePage({
      pageNo: 1,
      page: 200,
      sysid: currentSysId.value,
      keyword: dbKeyword.value,
    } as any);
    dbList.value = (res?.list || []) as FinanceBusinessSourceSystemApi.AppDatabaseRow[];
    const firstDb = dbList.value[0] || null;
    selectedDb.value = firstDb;
    pageNo.value = 1;
    selectedTable.value = null;
    await loadTableList();
  } finally {
    dbLoading.value = false;
  }
}

async function loadTableList() {
  const dbid = String(selectedDb.value?.Id || selectedDb.value?.rowid || '');
  if (!currentSysId.value || !dbid) {
    tableList.value = [];
    tableTotal.value = 0;
    return;
  }
  tableLoading.value = true;
  try {
    const res = await getCurrentAppTablePage({
      pageNo: pageNo.value,
      page: page.value,
      sysid: currentSysId.value,
      dbid,
      keyword: tableKeyword.value,
    } as any);
    tableList.value = ((res?.list || []) as FinanceBusinessSourceSystemApi.AppTableRow[]).map((item) => ({
      ...item,
      dbRow: selectedDb.value || undefined,
    }));
    tableTotal.value = Number(res?.total || 0);
  } finally {
    tableLoading.value = false;
  }
}

function handleDbSearch() {
  selectedTable.value = null;
  loadDbList();
}

function handleTableSearch() {
  pageNo.value = 1;
  selectedTable.value = null;
  loadTableList();
}

function handleDbRowClick(row: FinanceBusinessSourceSystemApi.AppDatabaseRow) {
  selectedDb.value = row;
  pageNo.value = 1;
  selectedTable.value = null;
  loadTableList();
}

function handleTableRowClick(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  selectedTable.value = row;
}

function handleTableRowDblClick(row: FinanceBusinessSourceSystemApi.AppTableRow & { dbRow?: FinanceBusinessSourceSystemApi.AppDatabaseRow }) {
  selectedTable.value = row;
  handleConfirm();
}

function handleConfirm() {
  if (!selectedTable.value) return;
  close();
  emit('confirm', selectedTable.value);
}

async function open(sysid: string) {
  currentSysId.value = String(sysid || '');
  visible.value = true;
  dbKeyword.value = '';
  tableKeyword.value = '';
  pageNo.value = 1;
  page.value = 15;
  selectedDb.value = null;
  selectedTable.value = null;
  await loadDbList();
}

function close() {
  visible.value = false;
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

function resolveDbName(row: FinanceBusinessSourceSystemApi.AppDatabaseRow) {
  return row?.conName || row?.Name || row?.ValueName || '-';
}

function resolveDbCnName(row: FinanceBusinessSourceSystemApi.AppDatabaseRow) {
  return row?.cnName || row?.NameStr || '-';
}

function resolveDbType(row: FinanceBusinessSourceSystemApi.AppDatabaseRow) {
  return row?.type || row?.Type || '-';
}

function resolveStateType(state: unknown) {
  const value = Number(state);
  if (value === 1) return 'success';
  if (value === 0) return 'info';
  return 'warning';
}

function resolveStateText(state: unknown) {
  const value = Number(state);
  if (Number.isNaN(value)) return String(state || '-');
  if (value === 1) return '启用';
  if (value === 0) return '停用';
  return String(value);
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="title"
    width="min(96rem, 60vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div class="app-db-selector-dialog">
      <div class="db-panel">
        <div class="toolbar">
          <ElInput
            v-model="dbKeyword"
            placeholder="请输入库名 / 中文名"
            clearable
            @keyup.enter="handleDbSearch"
          />
        </div>
        <ElTable
          v-loading="dbLoading"
          :data="dbList"
          border
          highlight-current-row
          height="460"
          @row-click="handleDbRowClick"
        >
          <ElTableColumn type="index" label="序号" width="70" align="center" />
          <ElTableColumn label="库名" min-width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ resolveDbName(scope.row) }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="中文名称" min-width="140" show-overflow-tooltip>
            <template #default="scope">
              {{ resolveDbCnName(scope.row) }}
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="table-panel">
        <div class="toolbar toolbar-right">
          <ElInput
            v-model="tableKeyword"
            placeholder="请输入表名 / 中文名"
            clearable
            @keyup.enter="handleTableSearch"
          />
          <ElButton type="primary" @click="handleTableSearch">查询</ElButton>
        </div>
        <ElTable
          v-loading="tableLoading"
          :data="tableList"
          border
          highlight-current-row
          height="460"
          @row-click="handleTableRowClick"
          @row-dblclick="handleTableRowDblClick"
        >
            <ElTableColumn type="index" label="序号" width="70" align="center" />
          <ElTableColumn prop="tblname" label="表名" min-width="80" show-overflow-tooltip />
          <ElTableColumn prop="tbldesc" label="中文名称" min-width="80" show-overflow-tooltip />
        </ElTable>

        <div class="footer-row">
          <ElPagination
            v-model:current-page="pageNo"
            v-model:page-size="page"
            :total="tableTotal"
            layout="total, prev, pager, next"
            @current-change="loadTableList"
          />

          <div class="footer-actions">
            <ElButton @click="handleCancel">取消</ElButton>
            <ElButton type="primary" :disabled="!selectedTable" @click="handleConfirm">确定</ElButton>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
.app-db-selector-dialog {
  display: grid;
  grid-template-columns: 0.95fr 2.05fr;
  gap: 24px;
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar-right {
  display: flex;
  gap: 12px;
}

.footer-row {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

@media screen and (width <= 1200px) {
  .app-db-selector-dialog {
    grid-template-columns: 1fr;
  }
}
</style>
