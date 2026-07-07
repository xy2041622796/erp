<script lang="ts" setup>
import { reactive, ref } from 'vue';


import { BusinessObjectSelectorBlock } from '#/components/business-object-selector';

import { ElButton, ElInput, ElMessage, ElPopover } from 'element-plus';

defineOptions({ name: 'InlineBusinessFieldPicker' });

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  buttonText?: string;
}>(), {
  modelValue: '',
  placeholder: '请选择字段',
  disabled: false,
  buttonText: '选择',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const visible = ref(false);
const selection = reactive({
  appCode: '',
  appName: '',
  dbName: '',
  tableName: '',
  tableId: '',
  fieldName: '',
});

function handleAppSelect(app: any) {
  Object.assign(selection, {
    appCode: String(app?.rowid || ''),
    appName: String(app?.AppName || app?.NameStr || app?.rowid || ''),
    dbName: '',
    tableName: '',
    tableId: '',
    fieldName: '',
  });
}

function handleObjectSelect(row: any) {
  const dbRow = row?.dbRow || {};
  Object.assign(selection, {
    dbName: String(dbRow?.ValueName || dbRow?.Name || dbRow?.conName || ''),
    tableName: String(row?.tbldesc || row?.tblname || ''),
    tableId: String(row?.id || row?.rowid || row?.tblname || ''),
    fieldName: '',
  });
}

function handleFieldSelect(row: any) {
  selection.fieldName = String(row?.enname || row?.cnname || '');
}

function handleConfirm() {
  if (!selection.fieldName) {
    ElMessage.warning('请先选择字段');
    return;
  }
  emit('update:modelValue', selection.fieldName);
  emit('change', selection.fieldName);
  visible.value = false;
}

function handleClear() {
  emit('update:modelValue', '');
  emit('change', '');
}
</script>

<template>
  <div class="inline-field-picker">
    <ElInput :model-value="modelValue" readonly :placeholder="placeholder" clearable @clear="handleClear" />
    <ElPopover v-model:visible="visible" trigger="click" placement="bottom-start" :width="760" :disabled="disabled">
      <template #reference>
        <ElButton type="primary" plain :disabled="disabled">{{ buttonText }}</ElButton>
      </template>
      <div class="inline-field-picker__panel">
        <BusinessObjectSelectorBlock
          title="业务字段选择"
          :app-name="selection.appName"
          :app-code="selection.appCode"
          :db-name="selection.dbName"
          :table-name="selection.tableName"
          :table-id="selection.tableId"
          :field-name="selection.fieldName"
          @select-app="handleAppSelect"
          @select-object="handleObjectSelect"
          @select-field="handleFieldSelect"
        />
        <div class="inline-field-picker__footer">
          <ElButton @click="visible = false">取消</ElButton>
          <ElButton type="primary" @click="handleConfirm">确定</ElButton>
        </div>
      </div>
    </ElPopover>
  </div>
</template>

<style scoped>
.inline-field-picker {
  display: flex;
  gap: 8px;
}

.inline-field-picker :deep(.el-input) {
  flex: 1;
}

.inline-field-picker__panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inline-field-picker__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
