<script lang="ts" setup>
import { enabledText, formulaPresetText, getFormulaPreviewText, getItemLabel, parseFormulaExpr, roundModeText } from '../helpers';
import type { OptionItem, QueryFormState } from '../types';

import {
  ElButton,
  ElCard,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineProps<{
  loading: boolean;
  list: any[];
  total: number;
  pageNo: number;
  pageSize: number;
  targetItemOptions: OptionItem[];
  queryForm: QueryFormState;
}>();

const emit = defineEmits<{
  openTemplates: [];
  create: [];
  search: [];
  reset: [];
  edit: [row: any];
  delete: [row: any];
  sizeChange: [size: number];
  currentChange: [page: number];
}>();
</script>

<template>
  <el-card shadow="never" class="table-card">
    <template #header>
      <div class="card-header">
        <span>工资公式设置</span>
        <div class="header-actions">
          <el-button @click="emit('openTemplates')">常用公式</el-button>
          <el-button type="primary" @click="emit('create')">新增公式</el-button>
        </div>
      </div>
    </template>

    <el-form class="query-form" inline>
      <el-form-item label="关键字">
        <el-input v-model="queryForm.keyword" placeholder="公式名称 / 结果项目 / 公式表达式" clearable @keyup.enter="emit('search')" />
      </el-form-item>
      <el-form-item label="结果项目">
        <el-select v-model="queryForm.target_item_code" placeholder="全部" clearable filterable style="width: 220px">
          <el-option v-for="item in targetItemOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.is_enabled" placeholder="全部" clearable style="width: 140px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="emit('search')">查询</el-button>
        <el-button @click="emit('reset')">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="formula_name" label="公式名称" min-width="180" />
      <el-table-column label="结果项目" min-width="220" show-overflow-tooltip>
        <template #default="{ row = {} } = {}">{{ getItemLabel(targetItemOptions, row.target_item_code) }}</template>
      </el-table-column>
      <el-table-column label="公式类型" width="120">
        <template #default="{ row = {} } = {}">{{ formulaPresetText(parseFormulaExpr(row.formula_expr || '')?.preset || '') }}</template>
      </el-table-column>
      <el-table-column label="参与字段" min-width="240" show-overflow-tooltip>
        <template #default="{ row = {} } = {}">
          {{ (String(row.depends_on || '').split(',').map((code) => getItemLabel(targetItemOptions, String(code || '').trim(), false)).filter(Boolean).join('，')) || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="公式预览" min-width="260" show-overflow-tooltip>
        <template #default="{ row = {} } = {}">{{ getFormulaPreviewText(targetItemOptions, row) }}</template>
      </el-table-column>
      <el-table-column prop="calc_order" label="顺序" width="80" />
      <el-table-column label="舍入方式" width="110">
        <template #default="{ row = {} } = {}">{{ roundModeText(row.round_mode) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row = {} } = {}">
          <el-tag :type="Number(row.is_enabled) === 1 ? 'success' : 'info'" effect="light">{{ enabledText(row.is_enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" fixed="right" width="160">
        <template #default="{ row = {} } = {}">
          <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
          <el-button link type="danger" @click="emit('delete', row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager-wrap">
      <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :current-page="pageNo" :page-size="pageSize" :page-sizes="[10, 20, 50, 100]" @size-change="(size) => emit('sizeChange', size)" @current-change="(page) => emit('currentChange', page)" />
    </div>
  </el-card>
</template>

<style scoped>
.table-card {
  border-radius: 10px;
}

.card-header,
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header {
  justify-content: space-between;
}

.query-form {
  margin-bottom: 16px;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
