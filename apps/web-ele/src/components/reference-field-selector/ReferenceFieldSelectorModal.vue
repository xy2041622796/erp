<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';


import {
  defaultReferenceFieldLoaders,
  getObjectName,
  resolveObjectCode,
  resolveObjectLabel,
} from '#/api/erp/finance/settings/basic_data/business_standardization/reference-field';
import type { FinanceReferenceFieldApi } from '#/api/erp/finance/settings/basic_data/business_standardization/reference-field';

import {
  ElButton,
  ElDialog,
  ElEmpty,
  ElInput,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElScrollbar,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ReferenceFieldSelectorModal' });

const emit = defineEmits<{
  cancel: [];
  confirm: [value: FinanceReferenceFieldApi.SelectedPayload];
}>();

const visible = ref(false);
const loading = ref(false);

const options = reactive<Required<Omit<FinanceReferenceFieldApi.OpenOptions, 'loaders'>> & {
  loaders: Required<FinanceReferenceFieldApi.LoaderSet>;
}>({
  title: '选择引用表/键/文字字段',
  appDesc: '数据资产管理',
  types: ['table'],
  defaultType: 'table',
  textTitle: '文字字段',
  valueTitle: '值字段',
  textLabel: '键',
  valueLabel: '值',
  selectOne: false,
  defaultValue: '',
  resultFields: [],
  loaders: defaultReferenceFieldLoaders,
});

const appList = ref<FinanceReferenceFieldApi.AppRow[]>([]);
const databaseList = ref<FinanceReferenceFieldApi.DatabaseRow[]>([]);
const objectList = ref<FinanceReferenceFieldApi.ObjectRow[]>([]);
const valueFieldList = ref<FinanceReferenceFieldApi.FieldRow[]>([]);
const textFieldList = ref<FinanceReferenceFieldApi.FieldRow[]>([]);

const selectedType = ref<FinanceReferenceFieldApi.BindType>('table');
const selectedApp = ref<FinanceReferenceFieldApi.AppRow | null>(null);
const selectedDatabase = ref<FinanceReferenceFieldApi.DatabaseRow | null>(null);
const selectedObject = ref<FinanceReferenceFieldApi.ObjectRow | null>(null);
const selectedValueField = ref<FinanceReferenceFieldApi.FieldRow | null>(null);
const selectedTextField = ref<FinanceReferenceFieldApi.FieldRow | null>(null);

const appKeyword = ref('');
const objectKeyword = ref('');
const valueKeyword = ref('');
const textKeyword = ref('');

const allowedTypes = computed(() =>
  (options.types?.length ? options.types : ['table']) as FinanceReferenceFieldApi.BindType[],
);

const dialogTitle = computed(() => options.title || '选择引用表/键/文字字段');
const currentTypeName = computed(() => getObjectName(selectedType.value));
const showDatabaseColumn = computed(() => selectedType.value === 'table');
const valueFieldTitle = computed(() => options.valueTitle || '值字段');
const textFieldTitle = computed(() => options.textTitle || '文字字段');

function mergeOptions(input?: FinanceReferenceFieldApi.OpenOptions) {
  options.title = input?.title || '选择引用表/键/文字字段';
  options.appDesc = input?.appDesc || '数据资产管理';
  options.types = (input?.types?.length ? input.types : ['table']) as FinanceReferenceFieldApi.BindType[];
  options.defaultType = (input?.defaultType || options.types[0] || 'table') as FinanceReferenceFieldApi.BindType;
  options.textTitle = input?.textTitle || '文字字段';
  options.valueTitle = input?.valueTitle || '值字段';
  options.textLabel = input?.textLabel || '键';
  options.valueLabel = input?.valueLabel || '值';
  options.selectOne = Boolean(input?.selectOne);
  options.defaultValue = input?.defaultValue || '';
  options.resultFields = input?.resultFields || [];
  options.loaders = {
    ...defaultReferenceFieldLoaders,
    ...(input?.loaders || {}),
  };
}

function resetSelectionState() {
  appList.value = [];
  databaseList.value = [];
  objectList.value = [];
  valueFieldList.value = [];
  textFieldList.value = [];

  selectedApp.value = null;
  selectedDatabase.value = null;
  selectedObject.value = null;
  selectedValueField.value = null;
  selectedTextField.value = null;

  appKeyword.value = '';
  objectKeyword.value = '';
  valueKeyword.value = '';
  textKeyword.value = '';
}

async function open(input?: FinanceReferenceFieldApi.OpenOptions) {
  mergeOptions(input);
  resetSelectionState();
  selectedType.value = options.defaultType;
  visible.value = true;
  await loadApps();
}

function close() {
  visible.value = false;
}

async function runLoading(task: () => Promise<void>) {
  loading.value = true;
  try {
    await task();
  } finally {
    loading.value = false;
  }
}

async function loadApps() {
  await runLoading(async () => {
    const res = await options.loaders.loadApps({
      pageNo: 1,
      page: 200,
      keyword: appKeyword.value,
    });
    appList.value = res.list || [];
    const matched =
      appList.value.find((item) => String(item.AppDesc || '').trim() === String(options.appDesc || '').trim()) ||
      appList.value[0] ||
      null;
    selectedApp.value = matched;
    await loadDatabasesAndObjects();
  });
}

async function loadDatabasesAndObjects() {
  selectedDatabase.value = null;
  databaseList.value = [];
  selectedObject.value = null;
  objectList.value = [];
  clearFieldSelection();

  if (selectedType.value === 'table') {
    const dbRes = await options.loaders.loadDatabases({
      pageNo: 1,
      page: 200,
      sysid: String(selectedApp.value?.rowid || ''),
      keyword: '',
    });
    databaseList.value = dbRes.list || [];
    selectedDatabase.value = databaseList.value[0] || null;
  }

  await loadObjects();
}

async function loadObjects() {
  clearObjectSelection();
  const objectRes = await options.loaders.loadObjects({
    type: selectedType.value,
    app: selectedApp.value,
    database: selectedDatabase.value,
    keyword: objectKeyword.value,
    pageNo: 1,
    page: 500,
  });
  objectList.value = objectRes.list || [];
  const firstAvailable =
    selectedType.value === 'table'
      ? objectList.value.find((item) => Number(item.isRef || 0) === 0) || objectList.value[0] || null
      : objectList.value[0] || null;
  selectedObject.value = firstAvailable;
  await loadFields();
}

function clearObjectSelection() {
  selectedObject.value = null;
  objectList.value = [];
  clearFieldSelection();
}

function clearFieldSelection() {
  valueFieldList.value = [];
  textFieldList.value = [];
  selectedValueField.value = null;
  selectedTextField.value = null;
}

async function loadFields() {
  clearFieldSelection();
  if (!selectedObject.value) {
    return;
  }
  const [valueRes, textRes] = await Promise.all([
    options.loaders.loadFields({
      type: selectedType.value,
      app: selectedApp.value,
      database: selectedDatabase.value,
      object: selectedObject.value,
      keyword: valueKeyword.value,
      pageNo: 1,
      page: 500,
    }),
    options.loaders.loadFields({
      type: selectedType.value,
      app: selectedApp.value,
      database: selectedDatabase.value,
      object: selectedObject.value,
      keyword: textKeyword.value,
      pageNo: 1,
      page: 500,
    }),
  ]);
  valueFieldList.value = valueRes.list || [];
  textFieldList.value = textRes.list || [];
  selectedValueField.value = valueFieldList.value[0] || null;
  selectedTextField.value = options.selectOne ? selectedValueField.value : textFieldList.value[0] || null;
}

async function handleTypeChange(value: FinanceReferenceFieldApi.BindType) {
  selectedType.value = value;
  await runLoading(async () => {
    await loadDatabasesAndObjects();
  });
}

async function handleAppChange(rowid: string) {
  selectedApp.value = appList.value.find((item) => String(item.rowid || '') === String(rowid || '')) || null;
  await runLoading(async () => {
    await loadDatabasesAndObjects();
  });
}

async function handleDatabaseClick(row: FinanceReferenceFieldApi.DatabaseRow) {
  selectedDatabase.value = row;
  await runLoading(async () => {
    await loadObjects();
  });
}

async function handleObjectClick(row: FinanceReferenceFieldApi.ObjectRow) {
  selectedObject.value = row;
  await runLoading(async () => {
    await loadFields();
  });
}

function handleValueFieldClick(row: FinanceReferenceFieldApi.FieldRow) {
  selectedValueField.value = row;
  if (options.selectOne) {
    selectedTextField.value = row;
  }
}

function handleTextFieldClick(row: FinanceReferenceFieldApi.FieldRow) {
  selectedTextField.value = row;
}

function resolveFieldName(row: FinanceReferenceFieldApi.FieldRow | null | undefined) {
  return String(row?.cnname || row?.description || row?.enname || '-');
}

function resolveFieldCode(row: FinanceReferenceFieldApi.FieldRow | null | undefined) {
  return String(row?.enname || row?.AsName || row?.rowid || '-');
}

function resolveDatabaseLabel(row: FinanceReferenceFieldApi.DatabaseRow | null | undefined) {
  if (!row) return '-';
  return String(row.conName || row.Name || row.ValueName || row.NameStr || '-');
}

function resolveAppLabel(row: FinanceReferenceFieldApi.AppRow | null | undefined) {
  if (!row) return '-';
  return String(row.AppDesc || row.NameStr || row.AppName || '-');
}

function buildResult() {
  if (!selectedObject.value || !selectedValueField.value || !selectedTextField.value) {
    return null;
  }
  const typeMap: Record<FinanceReferenceFieldApi.BindType, FinanceReferenceFieldApi.SelectedPayload['type']> = {
    api: 'Api',
    dict: 'Dict',
    json: 'Json',
    table: 'Table',
    view: 'View',
  };
  const payload: FinanceReferenceFieldApi.SelectedPayload = {
    type: typeMap[selectedType.value],
    fullCHText: `[${currentTypeName.value}]${resolveObjectLabel(selectedType.value, selectedObject.value)} [${options.textLabel}]${resolveFieldName(selectedValueField.value)} [${options.valueLabel}]${resolveFieldName(selectedTextField.value)}`,
    app: selectedApp.value,
    database: selectedDatabase.value,
    dataSource: selectedObject.value,
    FieldValue: selectedValueField.value,
    fieldText: selectedTextField.value,
  };
  for (const item of options.resultFields) {
    const sourceMap = {
      app: selectedApp.value,
      database: selectedDatabase.value,
      fieldText: selectedTextField.value,
      fieldValue: selectedValueField.value,
      object: selectedObject.value,
    } as const;
    payload[item.key] = (sourceMap[item.source] as Record<string, any> | null | undefined)?.[item.field];
  }
  return payload;
}

function handleConfirm() {
  const result = buildResult();
  if (!result) return;
  close();
  emit('confirm', result);
}

function handleCancel() {
  if (!visible.value) return;
  emit('cancel');
  close();
}

defineExpose({ open, close });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="dialogTitle"
    width="min(96rem, 96vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleCancel"
  >
    <div class="reference-field-selector">
      <div class="toolbar-row">
        <ElSelect
          class="app-select"
          :model-value="selectedApp?.rowid"
          placeholder="请选择应用"
          filterable
          @change="handleAppChange"
        >
          <ElOption
            v-for="item in appList"
            :key="item.rowid || item.AppName"
            :label="resolveAppLabel(item)"
            :value="item.rowid || ''"
          />
        </ElSelect>
        <ElRadioGroup :model-value="selectedType" @update:model-value="handleTypeChange">
          <ElRadioButton v-for="item in allowedTypes" :key="item" :label="item">
            {{ getObjectName(item) }}
          </ElRadioButton>
        </ElRadioGroup>
      </div>

      <div v-loading="loading" class="content-grid" :class="{ single: options.selectOne }">
        <div v-if="showDatabaseColumn" class="pane">
          <div class="pane-header">数据库名称</div>
          <ElScrollbar max-height="420px">
            <ElTable
              :data="databaseList"
              border
              highlight-current-row
              height="420"
              @row-click="handleDatabaseClick"
            >
              <ElTableColumn label="数据库名称" min-width="180" show-overflow-tooltip>
                <template #default="scope">
                  {{ resolveDatabaseLabel(scope.row) }}
                </template>
              </ElTableColumn>
            </ElTable>
          </ElScrollbar>
        </div>

        <div class="pane">
          <div class="pane-header">{{ currentTypeName }}名称</div>
          <div class="pane-search">
            <ElInput v-model="objectKeyword" clearable placeholder="请输入名称关键字" @keyup.enter="loadObjects" />
          </div>
          <ElTable
            :data="objectList"
            border
            highlight-current-row
            height="380"
            @row-click="handleObjectClick"
          >
            <ElTableColumn :label="`${currentTypeName}名称`" min-width="180" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveObjectLabel(selectedType, scope.row) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="编码" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveObjectCode(selectedType, scope.row) }}
              </template>
            </ElTableColumn>
          </ElTable>
          <ElEmpty v-if="!objectList.length" :image-size="60" description="无记录显示" />
        </div>

        <div class="pane">
          <div class="pane-header">{{ valueFieldTitle }}</div>
          <div class="pane-search">
            <ElInput v-model="valueKeyword" clearable placeholder="请输入值字段关键字" @keyup.enter="loadFields" />
          </div>
          <ElTable
            :data="valueFieldList"
            border
            highlight-current-row
            height="380"
            @row-click="handleValueFieldClick"
          >
            <ElTableColumn :label="valueFieldTitle" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveFieldName(scope.row) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="字段名" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveFieldCode(scope.row) }}
              </template>
            </ElTableColumn>
          </ElTable>
          <ElEmpty v-if="!valueFieldList.length" :image-size="60" description="无记录显示" />
        </div>

        <div v-if="!options.selectOne" class="pane">
          <div class="pane-header">{{ textFieldTitle }}</div>
          <div class="pane-search">
            <ElInput v-model="textKeyword" clearable placeholder="请输入文字字段关键字" @keyup.enter="loadFields" />
          </div>
          <ElTable
            :data="textFieldList"
            border
            highlight-current-row
            height="380"
            @row-click="handleTextFieldClick"
          >
            <ElTableColumn :label="textFieldTitle" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveFieldName(scope.row) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="字段名" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                {{ resolveFieldCode(scope.row) }}
              </template>
            </ElTableColumn>
          </ElTable>
          <ElEmpty v-if="!textFieldList.length" :image-size="60" description="无记录显示" />
        </div>
      </div>

      <div class="footer-row">
        <div class="result-text">
          已选：
          <span v-if="selectedObject && selectedValueField && (selectedTextField || options.selectOne)">
            {{ buildResult()?.fullCHText }}
          </span>
          <span v-else>请完成对象与字段选择</span>
        </div>
        <div class="footer-actions">
          <ElButton @click="handleCancel">取消</ElButton>
          <ElButton
            type="primary"
            :disabled="!selectedObject || !selectedValueField || (!selectedTextField && !options.selectOne)"
            @click="handleConfirm"
          >
            保存
          </ElButton>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
.reference-field-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.app-select {
  width: 420px;
  max-width: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr 1.1fr 1.1fr;
  gap: 16px;
}

.content-grid.single {
  grid-template-columns: 1.1fr 1.5fr 1.5fr;
}

.pane {
  min-width: 0;
}

.pane-header {
  margin-bottom: 8px;
  font-weight: 600;
}

.pane-search {
  margin-bottom: 8px;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.result-text {
  min-height: 32px;
  color: var(--el-text-color-secondary);
}

.footer-actions {
  display: flex;
  gap: 12px;
}

@media screen and (width <= 1400px) {
  .content-grid,
  .content-grid.single {
    grid-template-columns: 1fr;
  }
}
</style>
