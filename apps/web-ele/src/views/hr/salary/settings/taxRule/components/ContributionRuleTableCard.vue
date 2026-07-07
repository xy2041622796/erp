<script lang="ts" setup>

import type { ContributionRuleKind } from '../types';

import { ElButton, ElTable, ElTableColumn } from 'element-plus';

defineProps<{
  editing: boolean;
  list: Array<any>;
  formatPercent: (value: number) => string;
  formatContributionRange: (row: any) => string;
  roundModeText: (value?: string) => string;
  contributionTypeText: (value: ContributionRuleKind) => string;
}>();

const emit = defineEmits<{
  create: [type: ContributionRuleKind];
  edit: [type: ContributionRuleKind, index: number];
  delete: [type: ContributionRuleKind, index: number];
}>();
</script>

<template>
  <div>
    <div class="toolbar-row">
      <div class="toolbar-left">
        <el-button v-if="editing" type="primary" @click="emit('create', 'social')">新增社保类规则</el-button>
        <el-button v-if="editing" @click="emit('create', 'fund')">新增公积金规则</el-button>
        <span class="toolbar-tip">社保、医保、养老、公积金本质上都是“基数 × 个人比例 / 公司比例”，统一在一张表维护。</span>
      </div>
    </div>

    <el-table :data="list" border class="rule-table">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column label="规则类别" width="160">
        <template #default="{ row = {}} = {}">{{ contributionTypeText(row.ruleType) }}</template>
      </el-table-column>
      <el-table-column prop="code" label="规则编码" min-width="220" show-overflow-tooltip />
      <el-table-column prop="title" label="规则标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="基数来源编码" min-width="260" show-overflow-tooltip>
        <template #default="{ row = {}} = {}">{{ row.baseItemCodes?.join(', ') || '-' }}</template>
      </el-table-column>
      <el-table-column label="个人比例" width="120">
        <template #default="{ row = {}} = {}">{{ formatPercent(Number(row.personalRate)) }}</template>
      </el-table-column>
      <el-table-column label="公司比例" width="120">
        <template #default="{ row = {}} = {}">{{ formatPercent(Number(row.companyRate)) }}</template>
      </el-table-column>
      <el-table-column label="基数范围" min-width="180">
        <template #default="{ row = {}} = {}">{{ formatContributionRange(row) }}</template>
      </el-table-column>
      <el-table-column label="取整方式" width="120">
        <template #default="{ row = {}} = {}">{{ roundModeText(row.roundMode) }}</template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column v-if="editing" label="操作" width="150" fixed="right">
        <template #default="{ row = {}} = {}">
          <el-button link type="primary" @click="emit('edit', row.ruleType, row.originIndex)">编辑</el-button>
          <el-button link type="danger" @click="emit('delete', row.ruleType, row.originIndex)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.toolbar-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
.toolbar-left { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.toolbar-tip { color:var(--el-text-color-secondary); font-size:12px; }
.rule-table { background:var(--el-bg-color); }
</style>
