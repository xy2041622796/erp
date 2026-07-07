<script lang="ts" setup>
import type { ImportConfigRow } from '#/api/erp/import-design';

import { computed } from 'vue';

import { BusinessObjectSelectorBlock } from '#/components/business-object-selector';

import {
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
} from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesignerBaseSettingForm' });

interface FieldOption {
  label: string;
  value: string;
}

const props = defineProps<{
  modelValue: ImportConfigRow | null;
  readonly?: boolean;
  appCode?: string;
  appName?: string;
  dbName?: string;
  tableId?: string;
  parentFieldOptions?: FieldOption[];
  foreignKeyFieldOptions?: FieldOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ImportConfigRow | null];
  'select-app': [value: any];
  'select-object': [value: any];
}>();

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
</script>

<template>
  <div class="designer-block">
    <div class="designer-block__title">基本设置</div>

    <el-form v-if="model" label-width="96px" size="small" class="designer-form">
      <div class="designer-form-grid">
        <el-form-item label="工作表名称">
          <el-input
            :model-value="model.sheetName"
            :disabled="readonly"
            placeholder="请输入工作表名称"
            @update:model-value="updateField('sheetName', $event)"
          />
        </el-form-item>

        <el-form-item label="工作表索引">
          <el-input-number
            :model-value="Number(model.sheet || 0)"
            :disabled="readonly"
            :min="0"
            :controls="false"
            class="designer-number"
            @update:model-value="updateField('sheet', Number($event || 0))"
          />
        </el-form-item>

        <el-form-item label="表头行">
          <el-input-number
            :model-value="Number(model.titleIndex || 1)"
            :disabled="readonly"
            :min="-1"
            :controls="false"
            class="designer-number"
            @update:model-value="updateField('titleIndex', Number($event || 1))"
          />
        </el-form-item>

        <el-form-item label="数据开始行">
          <el-input-number
            :model-value="Number(model.dataIndex || 2)"
            :disabled="readonly"
            :min="1"
            :controls="false"
            class="designer-number"
            @update:model-value="updateField('dataIndex', Number($event || 2))"
          />
        </el-form-item>

        <div class="designer-form-item--full designer-object-wrap">
          <BusinessObjectSelectorBlock
            title="目标数据"
            :app-name="appName || model.relatedAppName || ''"
            :app-code="appCode || model.relatedappid || ''"
            :db-name="dbName || ''"
            :table-name="model.table || ''"
            :table-id="tableId || ''"
            :field-name="''"
            :show-field="false"
            :app-disabled="readonly"
            :object-disabled="readonly"
            @select-app="emit('select-app', $event)"
            @select-object="emit('select-object', $event)"
          />
        </div>

        <el-form-item label="父表字段">
          <el-select
            :model-value="model.parentField || ''"
            :disabled="readonly"
            clearable
            filterable
            allow-create
            default-first-option
            placeholder="请选择父表关联字段"
            @update:model-value="updateField('parentField', String($event || ''))"
          >
            <el-option
              v-for="item in parentFieldOptions || []"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="关联字段">
          <el-select
            :model-value="model.foreignKeyField || ''"
            :disabled="readonly"
            clearable
            filterable
            allow-create
            default-first-option
            placeholder="请选择当前表外键字段"
            @update:model-value="updateField('foreignKeyField', String($event || ''))"
          >
            <el-option
              v-for="item in foreignKeyFieldOptions || []"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="导出格式">
          <el-select
            :model-value="model.exportType || 'tree'"
            :disabled="readonly"
            placeholder="请选择导出格式"
            @update:model-value="updateField('exportType', String($event || 'tree'))"
          >
            <el-option label="树结构" value="tree" />
            <el-option label="平铺结构" value="flat" />
            <el-option label="列表结构" value="list" />
          </el-select>
        </el-form-item>

        <el-form-item label="关联应用">
          <el-input :model-value="model.relatedAppName" :disabled="true" placeholder="通过目标数据选择自动带出" />
        </el-form-item>

        <el-form-item label="过滤条件" class="designer-form-item--full">
          <el-input
            :model-value="model.filters"
            :disabled="readonly"
            type="textarea"
            :rows="2"
            placeholder="导出过滤条件 / JSON / SQL 片段"
            @update:model-value="updateField('filters', $event)"
          />
        </el-form-item>

        <el-form-item label="排序规则" class="designer-form-item--full">
          <el-input
            :model-value="model.sorted"
            :disabled="readonly"
            type="textarea"
            :rows="2"
            placeholder="例如：create_time desc"
            @update:model-value="updateField('sorted', $event)"
          />
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

.designer-form-item--full {
  grid-column: 1 / -1;
}

.designer-number {
  width: 100%;
}

.designer-object-wrap {
  padding-bottom: 8px;
}
</style>
