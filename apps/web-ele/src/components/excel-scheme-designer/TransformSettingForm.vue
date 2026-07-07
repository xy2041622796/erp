<script lang="ts" setup>
import type { ImportConfigRow } from '#/api/erp/import-design';

import { computed, ref } from 'vue';


import {
  getCurrentAppDatabasePage,
  getCurrentAppTablePage,
  getTableFieldPage,
  type FinanceBusinessSourceSystemApi,
} from '#/api/erp/finance/settings/basic_data/business_standardization';

import {
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesignerTransformSettingForm' });

const props = defineProps<{
  modelValue: ImportConfigRow | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ImportConfigRow | null];
}>();

const fieldOptionsLoading = ref(false);
const fieldOptionsLoaded = ref(false);
const fieldOptions = ref<FinanceBusinessSourceSystemApi.TableFieldRow[]>([]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function updateField<K extends keyof ImportConfigRow>(key: K, value: ImportConfigRow[K]) {
  if (!model.value) return;
  model.value = {
    ...model.value,
    [key]: value,
  };
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
</script>

<template>
  <div class="designer-block">
    <div class="designer-block__title">行列转换配置</div>

    <el-form v-if="model" label-width="110px" size="small">
      <div class="designer-form-grid">
        <el-form-item label="转换类型">
          <el-select :model-value="model.transformType || ''" :disabled="readonly" clearable placeholder="请选择转换类型"
            @update:model-value="updateField('transformType', String($event || ''))">
            <el-option label="不转换" value="" />
            <el-option label="RtoC" value="RtoC" />
            <el-option label="CtoR" value="CtoR" />
            <el-option label="动态列展开" value="动态列展开" />
            <el-option label="动态列汇总" value="动态列汇总" />
          </el-select>
        </el-form-item>

        <el-form-item label="跳过空值">
          <el-select :model-value="Number(model.skipEmptyValue || 0)" :disabled="readonly"
            @update:model-value="updateField('skipEmptyValue', Number($event || 0))">
            <el-option label="否" :value="0" />
            <el-option label="是" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item label="标题字段">
          <el-select
            :model-value="model.dynamicTitle || ''"
            clearable
            filterable
            default-first-option
            :loading="fieldOptionsLoading"
            :disabled="readonly"
            placeholder="请选择或搜索当前表字段"
            @visible-change="handleFieldSelectVisible"
            @update:model-value="updateField('dynamicTitle', String($event || ''))"
          >
            <el-option
              v-for="field in fieldOptions"
              :key="`title-${String(field.rowid || field.enname || field.cnname || '')}`"
              :label="[field.enname, field.cnname].filter(Boolean).join(' / ') || String(field.enname || '')"
              :value="String(field.enname || field.AsName || field.cnname || '')"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="键字段">
          <el-select
            :model-value="model.dynamicKeyField || ''"
            clearable
            filterable
            default-first-option
            :loading="fieldOptionsLoading"
            :disabled="readonly"
            placeholder="请选择或搜索当前表字段"
            @visible-change="handleFieldSelectVisible"
            @update:model-value="updateField('dynamicKeyField', String($event || ''))"
          >
            <el-option
              v-for="field in fieldOptions"
              :key="String(field.rowid || field.enname || field.cnname || '')"
              :label="[field.enname, field.cnname].filter(Boolean).join(' / ') || String(field.enname || '')"
              :value="String(field.enname || field.AsName || field.cnname || '')"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="值字段">
          <el-select
            :model-value="model.dynamicValueField || ''"
            clearable
            filterable
            default-first-option
            :loading="fieldOptionsLoading"
            :disabled="readonly"
            placeholder="请选择或搜索当前表字段"
            @visible-change="handleFieldSelectVisible"
            @update:model-value="updateField('dynamicValueField', String($event || ''))"
          >
            <el-option
              v-for="field in fieldOptions"
              :key="`value-${String(field.rowid || field.enname || field.cnname || '')}`"
              :label="[field.enname, field.cnname].filter(Boolean).join(' / ') || String(field.enname || '')"
              :value="String(field.enname || field.AsName || field.cnname || '')"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="键来源列">
          <el-input :model-value="model.dynamicKeySourceCol" :disabled="readonly" placeholder="例如 B"
            @update:model-value="updateField('dynamicKeySourceCol', $event)" />
        </el-form-item>

        <el-form-item label="值来源列">
          <el-input :model-value="model.dynamicValueSourceCol" :disabled="readonly" placeholder="例如 C"
            @update:model-value="updateField('dynamicValueSourceCol', $event)" />
        </el-form-item>

        <el-form-item label="停止模式">
          <el-input :model-value="model.dynamicStopMode" :disabled="readonly" placeholder="例如 empty-row / empty-col"
            @update:model-value="updateField('dynamicStopMode', $event)" />
        </el-form-item>

        <el-form-item label="分组键列">
          <el-input :model-value="model.groupKeyCols" :disabled="readonly" placeholder="例如 employee_name,dept_name"
            @update:model-value="updateField('groupKeyCols', $event)" />
        </el-form-item>
      </div>
    </el-form>

    <el-empty v-else description="请先选择左侧节点" :image-size="64" />
  </div>
</template>

<style scoped>
.designer-block {
  padding: 10px 12px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.designer-block__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.designer-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.designer-number {
  width: 100%;
}
</style>
