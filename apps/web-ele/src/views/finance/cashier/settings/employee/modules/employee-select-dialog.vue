<script lang="ts" setup>
import { computed } from 'vue';

import { ElButton, ElDialog } from 'element-plus';

export interface EmployeeSelectOption {
  code: string;
  name: string;
  description?: string;
}

const props = defineProps<{
  visible: boolean;
  title: string;
  options: EmployeeSelectOption[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  select: [item: EmployeeSelectOption];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

function handleSelect(item: EmployeeSelectOption) {
  emit('select', item);
  dialogVisible.value = false;
}
</script>

<template>
  <el-dialog v-model="dialogVisible" :title="title" width="720px" destroy-on-close>
    <div class="employee-select-grid">
      <div
        v-for="item in options"
        :key="item.code"
        class="employee-select-card"
        @click="handleSelect(item)"
      >
        <div class="employee-select-title">{{ item.name }}</div>
        <div class="employee-select-code">编码：{{ item.code }}</div>
        <div v-if="item.description" class="employee-select-desc">
          {{ item.description }}
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.employee-select-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.employee-select-card {
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  transition: all 0.16s ease;
}

.employee-select-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
}

.employee-select-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.employee-select-code,
.employee-select-desc {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}
</style>
