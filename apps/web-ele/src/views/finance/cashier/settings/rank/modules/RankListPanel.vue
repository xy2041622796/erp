<script setup lang="ts">
import {
  ElButton,
  ElCard,
  ElEmpty,
  ElInput,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  rankList: any[];
  rankLoading: boolean;
  rankKeyword: string;
  selectedRankId: string;
  employeeCountMap: Map<string, number>;
}>();

const emit = defineEmits<{
  (e: 'update:rankKeyword', value: string): void;
  (e: 'query'): void;
  (e: 'select', value: string): void;
  (e: 'create'): void;
  (e: 'edit', row: any): void;
  (e: 'remove', row: any): void;
}>();
</script>

<template>
  <el-card shadow="hover" class="panel-card full-height">
    <template #header>
      <div class="panel-header">
        <span>职级主表</span>
        <el-button type="primary" @click="emit('create')">新增职级</el-button>
      </div>
    </template>

    <div class="toolbar toolbar-stack">
      <el-input
        :model-value="props.rankKeyword"
        clearable
        placeholder="搜索编码/名称/类型"
        @update:model-value="(value) => emit('update:rankKeyword', String(value || ''))"
        @keyup.enter="emit('query')"
      />
      <el-button @click="emit('query')">查询</el-button>
    </div>

    <div v-loading="props.rankLoading" class="rank-list">
      <div
        v-for="rank in props.rankList"
        :key="rank.rowid"
        class="rank-item"
        :class="{ active: String(rank.rowid || '') === props.selectedRankId }"
        @click="emit('select', String(rank.rowid || ''))"
      >
        <div class="rank-item-head">
          <div>
            <div class="rank-name">{{ rank.rank_name }}</div>
            <div class="rank-code">{{ rank.rank_code }} / {{ rank.rank_type || '未分类' }}</div>
          </div>
          <el-tag :type="Number(rank.is_enabled ?? 1) === 1 ? 'success' : 'info'">
            {{ Number(rank.is_enabled ?? 1) === 1 ? '启用' : '停用' }}
          </el-tag>
        </div>
        <div class="rank-meta">
          <span>层级 {{ rank.rank_level || 0 }}</span>
          <span>人数 {{ props.employeeCountMap.get(String(rank.rowid || '')) || 0 }}</span>
        </div>
        <div class="rank-remark">{{ rank.remark || '暂无备注' }}</div>
        <div class="rank-actions">
          <el-button link type="primary" @click.stop="emit('edit', rank)">编辑</el-button>
          <el-button link type="danger" @click.stop="emit('remove', rank)">删除</el-button>
        </div>
      </div>
      <el-empty v-if="!props.rankLoading && !props.rankList.length" description="暂无职级数据" />
    </div>
  </el-card>
</template>

<style scoped>
.panel-card {
  border-radius: 12px;
}
.full-height {
  min-height: 760px;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar-stack {
  align-items: center;
}
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rank-item {
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.rank-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.rank-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.rank-name {
  font-size: 16px;
  font-weight: 600;
}
.rank-code,
.rank-remark {
  color: var(--el-text-color-secondary);
}
.rank-meta {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 13px;
}
.rank-remark {
  margin-top: 8px;
  line-height: 1.6;
}
.rank-actions {
  margin-top: 8px;
}
@media (max-width: 1200px) {
  .full-height {
    min-height: auto;
  }
}
</style>
