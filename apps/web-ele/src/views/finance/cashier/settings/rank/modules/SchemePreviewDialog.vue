<script setup lang="ts">
import { ElButton, ElDialog } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  loading: boolean;
  payload: any;
  previewJson: string;
  dynamicValueFieldTitle: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="导入导出方案设计预览"
    width="960px"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <div v-if="props.payload" class="scheme-preview">
      <div class="preview-section">
        <div class="preview-title">方案概要</div>
        <div class="preview-grid">
          <div class="preview-item">
            <span class="preview-label">方案名称</span>
            <span class="preview-value">{{ props.payload.solutionName }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">目标工作表</span>
            <span class="preview-value">{{ props.payload.configs[0]?.sheetName }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">根数据表</span>
            <span class="preview-value">{{ props.payload.configs[0]?.table }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">转换类型</span>
            <span class="preview-value">{{ props.payload.configs[0]?.transformType || '无' }}</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">动态列范围</span>
            <span class="preview-value">{{ props.payload.configs[0]?.dynamicStartCol }} ~ {{ props.payload.configs[0]?.dynamicEndCol }}（与下载模板动态工资项列保持一致）</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">动态值字段</span>
            <span class="preview-value">{{ props.payload.configs[0]?.dynamicValueField }}（{{ props.dynamicValueFieldTitle }}）</span>
          </div>
          <div class="preview-item">
            <span class="preview-label">配置节点数量</span>
            <span class="preview-value">{{ props.payload.configs?.length || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-title">工资项字典预览</div>
        <pre class="preview-code">{{ JSON.stringify(props.payload.configs[0]?.dictData, null, 2) }}</pre>
      </div>

      <div class="preview-section">
        <div class="preview-title">设计页对应内容</div>
        <pre class="preview-code">{{ props.previewJson }}</pre>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="props.loading" @click="emit('confirm')">确认生成</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.scheme-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.preview-section {
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  padding: 16px;
}
.preview-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.preview-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preview-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.preview-value {
  font-weight: 500;
  word-break: break-all;
}
.preview-code {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.7;
}
@media (max-width: 768px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
