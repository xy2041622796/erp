<script lang="ts" setup>
import type { ImportConfigRow } from '#/api/erp/import-design';

import { computed, ref, watch } from 'vue';


import {
  getCurrentAppDatabasePage,
  getCurrentAppTablePage,
  getTableFieldPage,
  type FinanceBusinessSourceSystemApi,
} from '#/api/erp/finance/settings/basic_data/business_standardization';

import {
  ElButton,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesignerDynamicDictEditor' });

type DictMappingRow = {
  key: string;
  title: string;
  column: string;
};

type DictJsonGroup = {
  field?: string;
  type?: string;
  mappings?: Array<{ key?: string; value?: string; title?: string; column?: string }>;
};

type DictJsonFlatRow = {
  key?: string;
  value?: string;
  title?: string;
  column?: string;
};

const props = defineProps<{
  modelValue: ImportConfigRow | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ImportConfigRow | null];
}>();

const sourceField = ref('');
const sourceType = ref('');
const rows = ref<DictMappingRow[]>([]);
const fieldOptionsLoading = ref(false);
const fieldOptionsLoaded = ref(false);
const fieldOptions = ref<FinanceBusinessSourceSystemApi.TableFieldRow[]>([]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function normalizeRows(list: any[] = []) {
  return list.map((item) => ({
    key: String(item?.key || ''),
    title: String(item?.title || item?.value || ''),
    column: String(item?.column || ''),
  }));
}

function parseDictJson(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function syncFromModel(config: ImportConfigRow | null) {
  const list = parseDictJson(config?.dictJson);
  const first = list[0] || {};

  if (first && Object.prototype.hasOwnProperty.call(first, 'mappings')) {
    const group = first as DictJsonGroup;
    sourceField.value = String(group.field || '');
    sourceType.value = String(group.type || '');
    rows.value = normalizeRows(group.mappings || []);
    return;
  }

  sourceField.value = String(config?.dynamicKeyField || '');
  sourceType.value = String(config?.transformType || '');
  rows.value = normalizeRows(list as DictJsonFlatRow[]);
}

function buildDictJson() {
  const mappings = rows.value.map((item) => ({
    key: String(item.key || '').trim(),
    title: String(item.title || '').trim(),
    column: String(item.column || '').trim(),
  }));

  if (mappings.length === 0) {
    return null;
  }

  return JSON.stringify(mappings, null, 2);
}

function writeBack() {
  if (!model.value) return;
  model.value = {
    ...model.value,
    dictJson: buildDictJson(),
  };
}

function handleAdd() {
  rows.value.push({ key: '', title: '', column: '' });
  writeBack();
}

function handleDelete(index: number) {
  rows.value.splice(index, 1);
  writeBack();
}

function splitTablePath(tableValue?: string | null) {
  const raw = String(tableValue || '').trim();
  const parts = raw.split('@');
  if (parts.length < 2) {
    return {
      dbName: '',
      tableName: raw,
    };
  }
  return {
    dbName: String(parts[0] || '').trim(),
    tableName: String(parts.slice(1).join('@') || '').trim(),
  };
}

function sortTableFields(tableFields: FinanceBusinessSourceSystemApi.TableFieldRow[] = []) {
  return [...tableFields].sort((a, b) => {
    const aPKey = Number(a?.IsPKey || 0) === 1 ? 1 : 0;
    const bPKey = Number(b?.IsPKey || 0) === 1 ? 1 : 0;
    if (aPKey !== bPKey) return bPKey - aPKey;
    const aOrd = Number(a?.ordIdx || 0);
    const bOrd = Number(b?.ordIdx || 0);
    if (aOrd !== bOrd) return aOrd - bOrd;
    return String(a?.enname || '').localeCompare(String(b?.enname || ''), 'en');
  });
}

async function resolveCurrentTableFields() {
  const config = model.value;
  const sysid = String(config?.relatedappid || '').trim();
  const { dbName, tableName } = splitTablePath(config?.table);

  if (!sysid || !dbName || !tableName) {
    throw new Error('请先在基本设置中绑定目标数据表');
  }

  const dbRes = await getCurrentAppDatabasePage({
    pageNo: 1,
    page: 200,
    sysid,
    keyword: dbName,
  });
  const dbRow = (dbRes.list || []).find((item) => {
    const candidates = [item?.conName, item?.Name, item?.ValueName, item?.cnName, item?.NameStr]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);
    return candidates.includes(dbName.toLowerCase());
  }) || dbRes.list?.[0];

  const dbid = String(dbRow?.Id || dbRow?.rowid || '').trim();
  if (!dbid) {
    throw new Error('未找到当前绑定的数据库');
  }

  const tableRes = await getCurrentAppTablePage({
    pageNo: 1,
    page: 200,
    sysid,
    dbid,
    keyword: tableName,
  });
  const tableRow = (tableRes.list || []).find(
    (item) => String(item?.tblname || '').trim().toLowerCase() === tableName.toLowerCase(),
  ) || (tableRes.list || []).find(
    (item) => String(item?.tbldesc || '').trim().toLowerCase() === tableName.toLowerCase(),
  ) || tableRes.list?.[0];

  const tblid = String(tableRow?.rowid || tableRow?.id || '').trim();
  if (!tblid) {
    throw new Error('未找到当前绑定的数据表');
  }

  const fieldRes = await getTableFieldPage({ pageNo: 1, page: 0, tblid });
  return sortTableFields(fieldRes.list || []);
}

function getFieldTitle(field?: FinanceBusinessSourceSystemApi.TableFieldRow | null) {
  return String(field?.cnname || field?.description || field?.enname || '').trim();
}

async function ensureFieldOptions(force = false) {
  if (!model.value) return;
  if (fieldOptionsLoaded.value && !force) return;
  fieldOptionsLoading.value = true;
  try {
    fieldOptions.value = await resolveCurrentTableFields();
    fieldOptionsLoaded.value = true;
  } catch (error: any) {
    fieldOptions.value = [];
    fieldOptionsLoaded.value = false;
    ElMessage.warning(error?.message || '请先绑定目标数据表');
  } finally {
    fieldOptionsLoading.value = false;
  }
}

function handleFieldSelectVisible(visible: boolean) {
  if (!visible) return;
  ensureFieldOptions();
}

function handleKeyFieldChange(row: DictMappingRow, value: string) {
  row.key = String(value || '');
  const matched = fieldOptions.value.find(
    (field) => String(field.enname || field.AsName || field.cnname || '') === row.key,
  );
  row.title = row.key ? getFieldTitle(matched) : '';
  writeBack();
}

watch(
  () => props.modelValue,
  (value) => syncFromModel(value),
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="dict-editor">
    <div class="dict-editor__head">
      <div class="dict-editor__title">动态字典</div>
      <div class="dict-editor__actions">
        <el-button size="small" :disabled="readonly || !model" @click="handleAdd">新增</el-button>
      </div>
    </div>

    <template v-if="model">
      <div class="dict-editor__meta">
        <el-form label-width="78px" size="small">
          <div class="dict-editor__meta-grid">
            <el-form-item label="来源字段">
              <el-input v-model="sourceField" :disabled="true" placeholder="例如 item_code" />
            </el-form-item>
            <el-form-item label="字典类型">
              <el-input v-model="sourceType" :disabled="true" placeholder="例如 RtoC" />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <el-table :data="rows" border height="100%" size="small">
        <el-table-column type="index" label="#" width="48" align="center" />
        <el-table-column label="键字段" min-width="180">
          <template #default="scope">
            <el-select
              :model-value="scope.row.key"
              clearable
              filterable
              default-first-option
              :loading="fieldOptionsLoading"
              :disabled="readonly"
              placeholder="请选择或搜索当前表字段"
              @visible-change="handleFieldSelectVisible"
              @update:model-value="handleKeyFieldChange(scope.row, String($event || ''))"
            >
              <el-option
                v-for="field in fieldOptions"
                :key="String(field.rowid || field.enname || field.cnname || '')"
                :label="[field.enname, field.cnname].filter(Boolean).join(' / ') || String(field.enname || '')"
                :value="String(field.enname || field.AsName || field.cnname || '')"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="180">
          <template #default="scope">
            <el-input v-model="scope.row.title" :disabled="readonly" placeholder="键字段选择后自动带出标题" @change="writeBack" />
          </template>
        </el-table-column>
        <el-table-column label="Excel 列号" width="120">
          <template #default="scope">
            <el-input v-model="scope.row.column" :disabled="readonly" @change="writeBack" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="danger" :disabled="readonly" @click="handleDelete(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-empty v-else description="请先选择节点" :image-size="72" />
  </div>
</template>

<style scoped>
.dict-editor {
  display: flex;
  height: 100%;
  min-height: 260px;
  flex-direction: column;
}

.dict-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.dict-editor__title {
  font-size: 13px;
  font-weight: 600;
}

.dict-editor__meta {
  padding: 10px 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.dict-editor__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
</style>
