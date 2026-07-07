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
  employeeList: any[];
  rankLoading: boolean;
  employeeLoading: boolean;
  rankKeyword: string;
  employeeKeyword: string;
  selectedRankId: string;
  employeeCountMap: Map<string, number>;
}>();

const emit = defineEmits<{
  (e: 'update:rankKeyword', value: string): void;
  (e: 'update:employeeKeyword', value: string): void;
  (e: 'update:selectedRankId', value: string): void;
  (e: 'query-rank'): void;
  (e: 'query-employee'): void;
  (e: 'create-rank'): void;
  (e: 'edit-rank', row: any): void;
  (e: 'remove-rank', row: any): void;
  (e: 'create-employee'): void;
  (e: 'edit-employee', row: any): void;
  (e: 'remove-employee', row: any): void;
}>();

function selectRank(rankId: string) {
  emit('update:selectedRankId', rankId);
}
</script>

<template>
  <el-card shadow="hover" class="panel-card full-height">
    <template #header>
      <div class="panel-header">
        <span>职级与人员</span>
        <div class="header-actions">
          <el-button type="primary" @click="emit('create-rank')">新增职级</el-button>
          <el-button type="primary" plain @click="emit('create-employee')">新增人员</el-button>
        </div>
      </div>
    </template>

    <div class="toolbar toolbar-stack">
      <el-input :model-value="props.rankKeyword" clearable placeholder="搜索职级编码/名称/类型"
        @update:model-value="(value: any) => emit('update:rankKeyword', String(value || ''))"
        @keyup.enter="emit('query-rank')" />
      <el-button @click="emit('query-rank')">查询职级</el-button>
    </div>

    <div v-loading="props.rankLoading" class="rank-list">
      <div v-for="rank in props.rankList" :key="rank.rowid" class="rank-item"
        :class="{ active: String(rank.rowid || '') === props.selectedRankId }"
        @click="selectRank(String(rank.rowid || ''))">
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

        <div class="rank-actions">
          <el-button link type="primary" @click.stop="emit('edit-rank', rank)">编辑职级</el-button>
          <el-button link type="danger" @click.stop="emit('remove-rank', rank)">删除职级</el-button>
        </div>

        <div v-if="String(rank.rowid || '') === props.selectedRankId" class="employee-block" @click.stop>
          <div class="employee-toolbar">
            <el-input :model-value="props.employeeKeyword" clearable placeholder="搜索人员工号/姓名/部门"
              @update:model-value="(value: any) => emit('update:employeeKeyword', String(value || ''))"
              @keyup.enter="emit('query-employee')" />
            <el-button @click="emit('query-employee')">查询人员</el-button>
          </div>

          <div v-loading="props.employeeLoading" class="employee-list-wrap">
            <div v-if="props.employeeList.length" class="employee-list">
              <div v-for="employee in props.employeeList" :key="employee.rowid" class="employee-chip">
                <span class="employee-name">{{ employee.employee_name || employee.employee_no || '未命名人员' }}</span>
                <div class="employee-actions">
                  <el-button link type="primary" @click="emit('edit-employee', employee)">编辑</el-button>
                  <el-button link type="danger" @click="emit('remove-employee', employee)">删除</el-button>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无人员" :image-size="72" />
          </div>
        </div>
      </div>

      <el-empty v-if="!props.rankLoading && !props.rankList.length" description="暂无职级数据" />
    </div>
  </el-card>
</template>

<style scoped>
.panel-card {
  border-radius: 8px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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

.rank-code {
  color: var(--el-text-color-secondary);
}

.rank-meta {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 13px;
}

.rank-actions {
  margin-top: 8px;
}

.employee-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--el-border-color);
}

.employee-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.employee-list-wrap {
  min-height: 120px;
}

.employee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.employee-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
}

.employee-name {
  line-height: 1;
}

.employee-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 1200px) {
  .full-height {
    min-height: auto;
  }

  .employee-toolbar,
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
