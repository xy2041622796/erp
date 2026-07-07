<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { ImportFieldRow } from '#/api/erp/import-design';
import { createEmptyImportField } from '#/api/erp/import-design';
import type { FinanceReferenceFieldApi } from '#/api/erp/finance/settings/basic_data/business_standardization';

import type { CurrentAppFieldSelectionResult } from '#/components/current-app-field-selector';
import { CurrentAppFieldSelectorModal } from '#/components/current-app-field-selector';
import { ReferenceFieldSelectorModal } from '#/components/reference-field-selector';

import type { FieldTableSavePayload } from './types';

import {
  ElButton,
  ElEmpty,
  ElInput,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesignerFieldMappingTable' });

const props = defineProps<{
  configId?: string;
  rows: ImportFieldRow[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  save: [payload: FieldTableSavePayload];
}>();

const selectorRef = ref<InstanceType<typeof ReferenceFieldSelectorModal>>();
const fieldSelectorRef = ref<InstanceType<typeof CurrentAppFieldSelectorModal>>();
const innerRows = ref<ImportFieldRow[]>([]);
const deletedRowIds = ref<string[]>([]);
const activeReferenceRowIndex = ref<number>(-1);
const activeFieldRowIndex = ref<number>(-1);
const selectorOpening = ref(false);
const fieldSelectorOpening = ref(false);

const hasConfig = computed(() => Boolean(props.configId));

function syncRows() {
  innerRows.value = (props.rows || []).map((item) => ({ ...item }));
  deletedRowIds.value = [];
  activeReferenceRowIndex.value = -1;
  activeFieldRowIndex.value = -1;
}

watch(
  () => props.rows,
  () => syncRows(),
  { immediate: true, deep: true },
);

watch(
  () => props.configId,
  () => syncRows(),
);

function handleAdd() {
  if (!props.configId) return;
  innerRows.value.push(createEmptyImportField(props.configId));
}

function handleDelete(index: number) {
  const row = innerRows.value[index];
  if (!row) return;
  if (row.rowid) {
    deletedRowIds.value.push(row.rowid);
  }
  innerRows.value.splice(index, 1);
}

function moveRow(index: number, offset: number) {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= innerRows.value.length) return;
  const cloned = innerRows.value.slice();
  const current = cloned[index];
  cloned.splice(index, 1);
  cloned.splice(targetIndex, 0, current as any);
  innerRows.value = cloned;
}

function handleSave() {
  emit('save', {
    rows: innerRows.value.map((item) => ({ ...item })),
    deletedRowIds: deletedRowIds.value.slice(),
  });
  deletedRowIds.value = [];
}

function getRowRefDisplay(row: ImportFieldRow) {
  return String(row.refTableDesc || '');
}

function handleFocusReferenceSelector(index: number, event?: FocusEvent) {
  if (props.readonly || selectorOpening.value) return;
  const row = innerRows.value[index];
  if (!row) return;

  selectorOpening.value = true;
  activeReferenceRowIndex.value = index;

  const target = event?.target as HTMLInputElement | null;
  target?.blur();

  selectorRef.value?.open({
    title: '选择引用表/键/文字字段',
    appDesc: '数据资产管理',
    types: ['table', 'view', 'dict', 'api', 'json'],
    defaultType: 'table',
    textTitle: '文字字段',
    valueTitle: '值字段',
    textLabel: '键',
    valueLabel: '值',
    defaultValue: row.refTableDesc || '',
  });

  window.setTimeout(() => {
    selectorOpening.value = false;
  }, 150);
}

function handleReferenceConfirm(result: FinanceReferenceFieldApi.SelectedPayload) {
  const index = activeReferenceRowIndex.value;
  const row = innerRows.value[index];
  if (!row) return;
  row.refTableDesc = String(result.fullCHText || '');
  row.refTable = String(
    result.dataSource?.id ||
      result.dataSource?.rowid ||
      result.dataSource?.tblname ||
      result.dataSource?.name ||
      '',
  );
  row.textField = String(result.fieldText?.enname || result.fieldText?.cnname || '');
  row.valueField = String(result.FieldValue?.enname || result.FieldValue?.cnname || '');
  row.refDataid = String(
    result.dataSource?.id || result.dataSource?.rowid || result.database?.Id || result.database?.rowid || '',
  );
}

function handleFocusFieldSelector(index: number, event?: FocusEvent) {
  if (props.readonly || fieldSelectorOpening.value) return;
  const row = innerRows.value[index];
  if (!row) return;

  fieldSelectorOpening.value = true;
  activeFieldRowIndex.value = index;

  const target = event?.target as HTMLInputElement | null;
  target?.blur();

  fieldSelectorRef.value?.open({
    title: '选择表和字段',
    appDesc: '数据资产管理',
  });

  window.setTimeout(() => {
    fieldSelectorOpening.value = false;
  }, 150);
}

function handleFieldSelectorConfirm(result: CurrentAppFieldSelectionResult) {
  const index = activeFieldRowIndex.value;
  const row = innerRows.value[index];
  if (!row || !result.table || !result.field) return;

  row.name = String(result.field.enname || '');
  row.title = String(result.field.cnname || result.field.description || '');
  row.refDataid = String(result.field.rowid || result.field.tblid || '');
  row.refTable = String(result.table.tblname || result.table.id || result.table.rowid || '');
  row.refTableDesc = String(result.table.tbldesc || result.table.tblname || '');
  row.description = [
    String(result.database?.conName || result.database?.Name || result.database?.ValueName || '').trim(),
    String(result.table.tbldesc || result.table.tblname || '').trim(),
    String(result.field.cnname || result.field.enname || '').trim(),
  ]
    .filter(Boolean)
    .join(' / ');
}
</script>

<template>
  <div class="field-table-wrap">
    <div class="field-table-wrap__head">
      <div class="field-table-wrap__title">字段配置</div>
      <div class="field-table-wrap__actions">
        <el-button size="small" :disabled="readonly || !hasConfig" @click="handleAdd">新增</el-button>
        <el-button size="small" type="primary" :disabled="readonly || !hasConfig" @click="handleSave">
          保存字段
        </el-button>
      </div>
    </div>

    <el-table v-if="hasConfig" :data="innerRows" border height="100%" size="small" class="field-table-wrap__table">
      <el-table-column type="index" label="#" width="48" align="center" fixed="left" />
      <el-table-column label="字段名" min-width="180" fixed="left">
        <template #default="scope">
          <el-input
            v-model="scope.row.name"
            class="field-table-wrap__trigger-input"
            readonly
            :disabled="readonly"
            placeholder="聚焦后选择表和字段"
            @focus="handleFocusFieldSelector(scope.$index, $event)"
          />
        </template>
      </el-table-column>

      <el-table-column label="表格配置" min-width="250" align="center">
        <el-table-column label="标题" min-width="140">
          <template #default="scope">
            <el-input v-model="scope.row.title" :disabled="readonly" />
          </template>
        </el-table-column>
        <el-table-column label="Excel 列号" width="110" align="center">
          <template #default="scope">
            <el-input v-model="scope.row.index" :disabled="readonly" />
          </template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="引用配置" min-width="320" align="center">
        <template #default="scope">
          <div class="field-table-wrap__stack-cell">
            <div class="field-table-wrap__stack-line">
              <span class="field-table-wrap__stack-label">引用表描述</span>
              <el-input
                :model-value="getRowRefDisplay(scope.row)"
                class="field-table-wrap__trigger-input"
                readonly
                :disabled="readonly"
                placeholder="聚焦后选择引用表/键/文字字段"
                @focus="handleFocusReferenceSelector(scope.$index, $event)"
              />
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="过滤配置" min-width="260" align="center">
        <el-table-column label="过滤字段" width="130">
          <template #default="scope">
            <el-input v-model="scope.row.filterField" :disabled="readonly" />
          </template>
        </el-table-column>
        <el-table-column label="过滤值" width="130">
          <template #default="scope">
            <el-input v-model="scope.row.filterValue" :disabled="readonly" />
          </template>
        </el-table-column>
      </el-table-column>

      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="scope">
          <div class="field-table-wrap__row-actions">
            <el-button link type="primary" :disabled="readonly || scope.$index === 0" @click="moveRow(scope.$index, -1)">
              上移
            </el-button>
            <el-button
              link
              type="primary"
              :disabled="readonly || scope.$index === innerRows.length - 1"
              @click="moveRow(scope.$index, 1)"
            >
              下移
            </el-button>
            <el-button link type="danger" :disabled="readonly" @click="handleDelete(scope.$index)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-else description="请先选择节点" :image-size="72" />

    <CurrentAppFieldSelectorModal ref="fieldSelectorRef" @confirm="handleFieldSelectorConfirm" />
    <ReferenceFieldSelectorModal ref="selectorRef" @confirm="handleReferenceConfirm" />
  </div>
</template>

<style scoped>
.field-table-wrap {
  display: flex;
  height: 100%;
  flex-direction: column;
  min-height: 260px;
}

.field-table-wrap__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.field-table-wrap__title {
  font-size: 13px;
  font-weight: 600;
}

.field-table-wrap__actions,
.field-table-wrap__row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field-table-wrap__stack-cell {
  display: flex;
  min-height: 56px;
  flex-direction: column;
  justify-content: center;
}

.field-table-wrap__stack-line {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-table-wrap__stack-label {
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-secondary);
}

:deep(.field-table-wrap__table .el-table__header-wrapper th) {
  vertical-align: middle;
}

:deep(.field-table-wrap__trigger-input .el-input__wrapper) {
  cursor: pointer;
}

:deep(.field-table-wrap__trigger-input .el-input__inner) {
  cursor: pointer;
}
</style>
