<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { ArrowDown } from '@element-plus/icons-vue';

import {
  ElButton,
  ElDatePicker,
  ElIcon,
  ElPopover,
} from 'element-plus';

interface Props {
  modelValue: string;
  periodMode?: 'month' | 'quarter';
  allowQuarter?: boolean;
  width?: number;
}

const props = withDefaults(defineProps<Props>(), {
  periodMode: 'month',
  allowQuarter: false,
  width: 392,
});

const emit = defineEmits<{
  (e: 'apply', payload: { monthValue: string; periodMode: 'month' | 'quarter' }): void;
  (e: 'update:modelValue', value: string): void;
  (e: 'update:periodMode', value: 'month' | 'quarter'): void;
}>();

const visible = ref(false);
const draftMonthValue = ref(props.modelValue);

function buildPeriodLabel(monthValue: string) {
  const [yearText, monthText] = String(monthValue || '').split('-');
  const year = Number(yearText || 0);
  const month = Number(monthText || 1);
  return `${year}年${month}月`;
}

function syncDraftFromCurrent() {
  draftMonthValue.value = props.modelValue;
}

function applyPeriod() {
  const nextMonthValue = draftMonthValue.value;
  emit('update:periodMode', 'month');
  emit('update:modelValue', nextMonthValue);
  emit('apply', { monthValue: nextMonthValue, periodMode: 'month' });
  visible.value = false;
}

function resetPeriod() {
  const now = new Date();
  draftMonthValue.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function handleMonthPick(value: string) {
  if (!value) return;
  draftMonthValue.value = value;
}

const currentPeriodLabel = computed(() => buildPeriodLabel(props.modelValue));
const draftPeriodLabel = computed(() => buildPeriodLabel(draftMonthValue.value));
const pickerDefaultDate = computed(() => {
  const [yearText, monthText] = String(draftMonthValue.value || '').split('-');
  const year = Number(yearText || 0) || new Date().getFullYear();
  const month = Number(monthText || 1) || 1;
  return new Date(year, month - 1, 1);
});

watch(
  () => visible.value,
  (value) => {
    if (value) {
      syncDraftFromCurrent();
    }
  },
);
</script>

<template>
  <ElPopover
    v-model:visible="visible"
    placement="bottom-start"
    trigger="click"
    :width="width"
    popper-class="finance-period-popper"
  >
    <template #reference>
      <button type="button" class="finance-period-trigger">
        <span>{{ currentPeriodLabel }}</span>
        <ElIcon><ArrowDown /></ElIcon>
      </button>
    </template>

    <div class="finance-period-panel">
      <div class="finance-period-panel-row finance-period-panel-row-top">
        <span class="finance-period-panel-label">会计期间：</span>
        <div class="finance-period-picker-wrap">
          <ElDatePicker
            :model-value="draftMonthValue"
            type="month"
            value-format="YYYY-MM"
            class="finance-period-date-picker"
            :teleported="false"
            :clearable="false"
            :default-value="pickerDefaultDate"
            @update:model-value="handleMonthPick"
          />
        </div>
      </div>

      <div class="finance-period-panel-preview">
        当前选择：{{ draftPeriodLabel }}
      </div>

      <div class="finance-period-panel-actions">
        <ElButton type="primary" @click="applyPeriod">确定</ElButton>
        <ElButton @click="visible = false">取消</ElButton>
        <ElButton @click="resetPeriod">重置</ElButton>
      </div>
    </div>
  </ElPopover>
</template>

<style scoped>
.finance-period-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--el-color-primary);
  border-radius: 4px;
  background: var(--el-color-primary);
  color: var(--el-color-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.finance-period-trigger:hover {
  background: var(--el-color-primary-light-3);
  border-color: var(--el-color-primary-light-3);
}

.finance-period-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.finance-period-panel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.finance-period-panel-row-top {
  align-items: flex-start;
}

.finance-period-panel-label {
  width: 72px;
  flex-shrink: 0;
  color: var(--el-text-color-regular);
  line-height: 32px;
}

.finance-period-picker-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finance-period-date-picker {
  width: 100%;
}

.finance-period-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.finance-period-panel-preview {
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.finance-period-preview-sub {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.finance-period-panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
