<script lang="ts" setup>
import { ref } from 'vue';


import { AppDbSelectModal } from '#/components/app-db-selector';
import { AppSelectModal } from '#/components/app-selector';
import { FieldSelectModal } from '#/components/field-selector';

import { ElButton, ElInput, ElMessage } from 'element-plus';

defineOptions({ name: 'BusinessObjectSelectorBlock' });

const props = withDefaults(
  defineProps<{
    title?: string;
    appName?: string;
    appCode?: string;
    dbName?: string;
    tableName?: string;
    tableId?: string;
    fieldName?: string;
    showField?: boolean;
    appDisabled?: boolean;
    objectDisabled?: boolean;
    fieldDisabled?: boolean;
  }>(),
  {
    title: '业务对象选择',
    appName: '',
    appCode: '',
    dbName: '',
    tableName: '',
    tableId: '',
    fieldName: '',
    showField: true,
    appDisabled: false,
    objectDisabled: false,
    fieldDisabled: false,
  },
);

const emit = defineEmits<{
  (e: 'select-app', value: any): void;
  (e: 'select-object', value: any): void;
  (e: 'select-field', value: any): void;
}>();

const appModalRef = ref();
const objectModalRef = ref();
const fieldModalRef = ref();

function openAppSelector() {
  if (props.appDisabled) return;
  appModalRef.value?.open?.();
}

function openObjectSelector() {
  if (props.objectDisabled) return;
  if (!props.appCode) {
    ElMessage.warning('请先选择应用');
    return;
  }
  objectModalRef.value?.open?.(props.appCode);
}

function openFieldSelector() {
  if (props.fieldDisabled) return;
  if (!props.tableId) {
    ElMessage.warning('请先选择表');
    return;
  }
  fieldModalRef.value?.open?.({ title: '选择字段', tblid: props.tableId });
}
</script>

<template>
  <div class="biz-object-block">
    <div class="biz-object-block__title">{{ title }}</div>
    <div class="biz-object-block__grid">
      <div class="biz-object-block__item">
        <div class="biz-object-block__label">应用</div>
        <div class="biz-object-block__action">
          <ElInput :model-value="appName || appCode" readonly placeholder="请选择应用" />
          <ElButton type="primary" :disabled="appDisabled" @click="openAppSelector">选择应用</ElButton>
        </div>
      </div>
      <div class="biz-object-block__item">
        <div class="biz-object-block__label">库</div>
        <ElInput :model-value="dbName" readonly placeholder="选择表后自动带出库" />
      </div>
      <div class="biz-object-block__item biz-object-block__item--span2">
        <div class="biz-object-block__label">表</div>
        <div class="biz-object-block__action">
          <ElInput :model-value="tableName" readonly placeholder="请选择表" />
          <ElButton type="primary" :disabled="objectDisabled" @click="openObjectSelector">选择库/表</ElButton>
        </div>
      </div>
      <div v-if="showField" class="biz-object-block__item biz-object-block__item--span2">
        <div class="biz-object-block__label">字段</div>
        <div class="biz-object-block__action">
          <ElInput :model-value="fieldName" readonly placeholder="请选择字段" />
          <ElButton type="primary" :disabled="fieldDisabled" @click="openFieldSelector">选择字段</ElButton>
        </div>
      </div>
    </div>

    <AppSelectModal ref="appModalRef" @confirm="(row:any) => emit('select-app', row)" />
    <AppDbSelectModal ref="objectModalRef" @confirm="(row:any) => emit('select-object', row)" />
    <FieldSelectModal ref="fieldModalRef" @confirm="(row:any) => emit('select-field', row)" />
  </div>
</template>

<style scoped>
.biz-object-block {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
}

.biz-object-block__title {
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.biz-object-block__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.biz-object-block__item--span2 {
  grid-column: span 2;
}

.biz-object-block__label {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.biz-object-block__action {
  display: flex;
  gap: 8px;
}

.biz-object-block__action :deep(.el-input) {
  flex: 1;
}

@media screen and (width <= 900px) {
  .biz-object-block__grid {
    grid-template-columns: 1fr;
  }

  .biz-object-block__item--span2 {
    grid-column: span 1;
  }

  .biz-object-block__action {
    flex-direction: column;
  }
}
</style>
