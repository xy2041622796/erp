<script lang="ts" setup>

import { computed } from 'vue';

import type { SalaryFormulaTemplateCandidate } from '../types';

import { ElAlert, ElButton, ElDialog, ElTag } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  loading: boolean;
  currentAccountSetId: string;
  candidates: SalaryFormulaTemplateCandidate[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  generate: [candidate: SalaryFormulaTemplateCandidate];
  generateAll: [];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});
</script>

<template>
  <el-dialog v-model="dialogVisible" title="常用公式" width="720px" destroy-on-close>
    <div class="drawer-body">
      <el-alert :title="`当前按帐套匹配工资项目${currentAccountSetId ? `（帐套：${currentAccountSetId}）` : ''}。模板会基于当前帐套下全部工资项目和全部已存在公式进行识别，而不是只看当前页列表。`" type="info" :closable="false" show-icon class="drawer-alert" />
      <div class="template-grid">
        <div v-for="item in candidates" :key="item.title" class="template-item">
          <div class="template-head">
            <div>
              <div class="template-title">{{ item.title }}</div>
              <div class="template-desc">{{ item.description }}</div>
            </div>
            <el-tag v-if="item.exists" type="success" effect="light">已存在</el-tag>
            <el-tag v-else-if="item.creatable" type="primary" effect="light">可生成</el-tag>
            <el-tag v-else type="info" effect="light">待补项目</el-tag>
          </div>
          <div class="template-line"><span>结果项目：</span>{{ item.targetLabel }}</div>
          <div class="template-line"><span>参与字段：</span>{{ item.sourceLabels.join('，') || '-' }}</div>
          <div class="template-line"><span>预览表达式：</span>{{ item.previewText }}</div>
          <div v-if="item.missingGroups.length" class="template-warning">缺少项目：{{ item.missingGroups.join('、') }}</div>
          <div class="template-actions">
            <el-button size="small" :disabled="!item.creatable || item.exists" @click="emit('generate', item)">生成当前公式</el-button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button type="primary" :loading="loading" @click="emit('generateAll')">一键生成常用公式</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.drawer-body{display:flex;flex-direction:column;gap:16px}
.drawer-alert{margin-bottom:4px}
.template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.template-item{border:1px solid var(--el-border-color-lighter);border-radius:10px;padding:12px;background:var(--el-fill-color-blank)}
.template-head,.template-actions{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.template-actions{margin-top:8px}
.template-title{font-size:14px;font-weight:600;margin-bottom:4px}
.template-desc,.template-line,.template-warning{color:var(--el-text-color-secondary);line-height:1.6}
.template-line span{color:var(--el-text-color-primary);font-weight:600;margin-right:6px}
</style>
