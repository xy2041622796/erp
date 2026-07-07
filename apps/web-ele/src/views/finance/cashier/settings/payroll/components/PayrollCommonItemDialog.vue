<script lang="ts" setup>
import { computed } from 'vue';

import { ElAlert, ElButton, ElDialog, ElTag } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  candidates: any[];
  loading: boolean;
  categoryOptions: Array<{ label: string; value: string }>;
  directionOptions: Array<{ label: string; value: string }>;
  inputModeOptions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  createItem: [item: any];
  createAll: [];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const creatableCount = computed(() => props.candidates.filter((item) => !item.exists).length);
const existedCount = computed(() => props.candidates.length - creatableCount.value);

function findOptionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((item) => item.value === value)?.label || value || '-';
}

function categoryText(value: string) {
  return findOptionLabel(props.categoryOptions, value);
}

function directionText(value: string) {
  return findOptionLabel(props.directionOptions, value);
}

function inputModeText(value: string) {
  return findOptionLabel(props.inputModeOptions, value);
}
</script>

<template>
  <el-dialog v-model="dialogVisible" title="常用工资项目" width="920px" destroy-on-close>
    <el-alert
      title="系统会在打开时先检查现有工资项目，编码或名称重复的模板会直接标记为已存在，不再进入可创建列表。"
      type="info"
      :closable="false"
      show-icon
      class="common-item-alert"
    />
    <div class="common-item-summary">
      <el-tag type="primary" effect="light">可创建 {{ creatableCount }} 项</el-tag>
      <el-tag type="success" effect="light">已存在 {{ existedCount }} 项</el-tag>
    </div>
    <div class="common-item-grid">
      <div v-for="item in candidates" :key="item.item_code" class="common-item-card" :class="{ 'is-disabled': item.exists }">
        <div class="common-item-head">
          <div>
            <div class="common-item-title">{{ item.title }}</div>
            <div class="common-item-desc">{{ item.description }}</div>
          </div>
          <el-tag :type="item.exists ? 'success' : 'primary'" effect="light">{{ item.statusText }}</el-tag>
        </div>
        <div class="common-item-line"><span>项目编码：</span>{{ item.item_code }}</div>
        <div class="common-item-line"><span>项目分类：</span>{{ categoryText(item.item_category) }}</div>
        <div class="common-item-line"><span>项目方向：</span>{{ directionText(item.item_direction) }}</div>
        <div class="common-item-line"><span>录入模式：</span>{{ inputModeText(item.input_mode) }}</div>
        <div v-if="item.existsReason" class="common-item-line common-item-reason"><span>重复原因：</span>{{ item.existsReason }}</div>
        <div class="common-item-actions">
          <el-button size="small" :disabled="item.exists" @click="emit('createItem', item)">创建当前项目</el-button>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button type="primary" :loading="loading" :disabled="!creatableCount" @click="emit('createAll')">一键创建常用工资项目</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.common-item-alert {
  margin-bottom: 16px;
}

.common-item-summary {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.common-item-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.common-item-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
}

.common-item-card.is-disabled {
  background: var(--el-fill-color-light);
  opacity: 0.86;
}

.common-item-head,
.common-item-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.common-item-actions {
  margin-top: 8px;
}

.common-item-title {
  font-size: 16px;
  font-weight: 600;
}

.common-item-desc,
.common-item-line {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.common-item-line span {
  color: var(--el-text-color-primary);
  font-weight: 600;
  margin-right: 6px;
}

.common-item-reason {
  color: var(--el-color-danger);
}
</style>
