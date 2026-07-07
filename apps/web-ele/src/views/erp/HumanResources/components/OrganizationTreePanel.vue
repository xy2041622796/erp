<script lang="ts" setup>
import { computed, ref, watch } from 'vue';


import type { OrganDept } from '#/api/erp/human-resources/organ';

import {
  ElButton,
  ElCard,
  ElEmpty,
  ElInput,
  ElTree,
} from 'element-plus';

defineOptions({ name: 'OrganizationTreePanel' });

const props = defineProps<{
  title?: string;
  nodes: OrganDept[];
  activeId?: string;
  loading?: boolean;
  countText?: string;
  showSearch?: boolean;
}>();

const emit = defineEmits<{
  select: [node: OrganDept];
  reload: [];
}>();

const treeRef = ref<any>(null);
const keyword = ref('');

const filteredNodes = computed(() => {
  const term = keyword.value.trim();
  if (!term) return props.nodes;
  const walk = (list: OrganDept[]): OrganDept[] => {
    return list
      .map((item) => {
        const children = walk(item.children || []);
        const matched = String(item.DepName || '').includes(term) || String(item.DepID || '').includes(term);
        return matched || children.length ? { ...item, children } : null;
      })
      .filter(Boolean) as OrganDept[];
  };
  return walk(props.nodes || []);
});

watch(
  () => props.activeId,
  (value) => {
    if (value && treeRef.value) treeRef.value.setCurrentKey(value);
  },
  { immediate: true },
);
</script>

<template>
  <ElCard shadow="never" class="tree-panel">
    <template #header>
      <div class="panel-header">
        <div>
          <div class="panel-title">{{ title || '组织树' }}</div>
          <div v-if="countText" class="panel-meta">{{ countText }}</div>
        </div>
        <ElButton link type="primary" @click="emit('reload')">刷新</ElButton>
      </div>
    </template>

    <ElInput
      v-if="showSearch !== false"
      v-model="keyword"
      clearable
      placeholder="筛选组织名称"
      class="tree-search"
    />

    <ElEmpty v-if="!filteredNodes.length && !loading" description="暂无组织数据" />
    <ElTree
      v-else
      ref="treeRef"
      :data="filteredNodes"
      node-key="DepID"
      default-expand-all
      highlight-current
      :expand-on-click-node="false"
      :props="{ label: 'DepName', children: 'children' }"
      @node-click="(data: OrganDept) => emit('select', data)"
    >
      <template #default="{ data } = {}">
        <div class="tree-node">
          <span class="tree-node__name">{{ data.DepName }}</span>
          <span class="tree-node__meta">{{ data.DepID }}</span>
        </div>
      </template>
    </ElTree>
  </ElCard>
</template>

<style scoped>
.tree-panel {
  height: 100%;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
}
.panel-meta {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}
.tree-search {
  margin-bottom: 12px;
}
.tree-node {
  display: flex;
  min-width: 0;
  width: 100%;
  justify-content: space-between;
  gap: 8px;
}
.tree-node__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node__meta {
  color: #909399;
  font-size: 12px;
}
</style>
