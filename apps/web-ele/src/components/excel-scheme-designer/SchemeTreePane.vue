<script lang="ts" setup>
import type { ImportSolutionRow } from '#/api/erp/import-solution';

import type { ExcelSchemeDesignerNode } from './types';

import { ElButton, ElEmpty, ElScrollbar, ElTree } from 'element-plus';

defineOptions({ name: 'ExcelSchemeDesignerTreePane' });

const props = defineProps<{
  solution: ImportSolutionRow | null;
  nodes: ExcelSchemeDesignerNode[];
  activeNodeId?: string;
  loading?: boolean;
  readonly?: boolean;
  allowChildNode?: boolean;
}>();

const emit = defineEmits<{
  select: [nodeId: string];
  addRoot: [];
  addChild: [nodeId: string];
  remove: [nodeId: string];
}>();

function handleNodeClick(data?: ExcelSchemeDesignerNode) {
  if (!data?.rowid) return;
  emit('select', data.rowid);
}

function handleAddRoot() {
  emit('addRoot');
}

function handleAddChild(nodeId?: string) {
  if (!nodeId) return;
  emit('addChild', nodeId);
}

function handleRemove(nodeId?: string) {
  if (!nodeId) return;
  emit('remove', nodeId);
}

function nodeLabel(data?: ExcelSchemeDesignerNode) {
  return data?.sheetName || data?.tableDesc || data?.table || '未命名节点';
}
</script>

<template>
  <div class="scheme-tree-pane">
    <div class="scheme-tree-pane__head">
      <div>
        <div class="scheme-tree-pane__title">Excel 导入导出方案</div>
        <div class="scheme-tree-pane__subtitle">
          {{ solution?.solutionName || '未选择方案' }}
        </div>
      </div>
      <el-button v-if="!readonly" size="small" type="primary" @click="handleAddRoot">
        新建
      </el-button>
    </div>

    <el-scrollbar class="scheme-tree-pane__body" v-loading="loading">
      <el-tree
        v-if="nodes.length"
        :data="nodes"
        node-key="rowid"
        :current-node-key="activeNodeId"
        default-expand-all
        highlight-current
        :expand-on-click-node="false"
        @node-click="handleNodeClick"
      >
        <template #default="slotProps">
          <div v-if="slotProps?.data" class="scheme-tree-node">
            <span class="scheme-tree-node__label">{{ nodeLabel(slotProps.data) }}</span>
            <span v-if="!readonly" class="scheme-tree-node__actions">
              <el-button
                v-if="allowChildNode"
                link
                type="primary"
                size="small"
                @click.stop="handleAddChild(slotProps.data?.rowid)"
              >
                子级
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                @click.stop="handleRemove(slotProps.data?.rowid)"
              >
                删除
              </el-button>
            </span>
          </div>
        </template>
      </el-tree>

      <el-empty v-else description="暂无配置节点" :image-size="80" />
    </el-scrollbar>
  </div>
</template>

<style scoped>
.scheme-tree-pane {
  display: flex;
  height: 100%;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.scheme-tree-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.scheme-tree-pane__title {
  font-size: 13px;
  font-weight: 600;
}

.scheme-tree-pane__subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.scheme-tree-pane__body {
  flex: 1;
  padding: 8px;
}

.scheme-tree-node {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scheme-tree-node__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scheme-tree-node__actions {
  flex-shrink: 0;
}
</style>
