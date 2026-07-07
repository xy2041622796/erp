<script lang="ts" setup>

import { computed } from 'vue';

import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElInput,
  ElInputNumber,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'RankItemPanel' });

const props = defineProps<{
  loading: boolean;
  itemKeyword: string;
  list: any[];
  itemSaving: boolean;
  schemeBindingLoading: boolean;
  schemeSolutionLoading: boolean;
  importTemplateLoading: boolean;
  exportTemplateLoading: boolean;
  selectedRankDynamicStartCol: string;
}>();

const emit = defineEmits<{
  'update:itemKeyword': [value: string];
  toggleSelected: [row: any, checked: boolean | string | number];
  bindScheme: [];
  syncScheme: [];
  openPreview: [];
  openDesigner: [];
  openTemplateBinding: [];
  downloadImportTemplate: [];
  downloadExportTemplate: [];
  save: [];
}>();

const tableLoading = computed(
  () =>
    props.loading ||
    props.itemSaving,
);
</script>

<template>
  <el-card shadow="hover" class="panel-card full-height">
    <template #header>
      <div class="panel-header">
        <span>职级工资项</span>
        <div class="header-actions">
          <!-- <el-tag type="info">整体方案单独维护，当前页仅处理职级方案</el-tag> -->
          <el-button :loading="schemeBindingLoading" @click="emit('bindScheme')">绑定导入导出方案</el-button>
          <el-button :loading="schemeBindingLoading" type="primary" plain @click="emit('syncScheme')">同步模板方案</el-button>
          <el-button :loading="schemeSolutionLoading" @click="emit('openPreview')">生成导入导出方案</el-button>
          <el-button type="primary" plain @click="emit('openDesigner')">打开方案设计器</el-button>
          <el-button @click="emit('openTemplateBinding')">模板绑定</el-button>
          <!-- <el-button :loading="importTemplateLoading" @click="emit('downloadImportTemplate')">下载当前职级导入模板</el-button>
          <el-button :loading="exportTemplateLoading" @click="emit('downloadExportTemplate')">下载当前职级导出模板</el-button> -->
          <el-button type="primary" :loading="itemSaving" @click="emit('save')">保存职级工资项</el-button>
        </div>
      </div>
    </template>

    <div class="toolbar toolbar-stack toolbar-summary">
      <el-input :model-value="itemKeyword" clearable placeholder="搜索工资项编码/名称/分类/方向"
        @update:model-value="emit('update:itemKeyword', String($event || ''))" />
      <el-tag type="info">
        模板列与方案列已统一使用同一套表头定义；动态工资项列从 {{ selectedRankDynamicStartCol }} 开始。
      </el-tag>
    </div>

    <el-table v-loading="tableLoading" :data="list" border height="620">
      <el-table-column label="已选" width="70" fixed="left">
        <template #default="{ row = {}} = {}">
          <el-checkbox :model-value="row.selected" @change="(checked) => emit('toggleSelected', row, checked)" />
        </template>
      </el-table-column>
      <el-table-column prop="item_name" label="工资项" min-width="150" />
      <el-table-column prop="item_code" label="编码" min-width="120" />
      <el-table-column prop="item_category" label="分类" min-width="90" />
      <el-table-column prop="item_direction" label="方向" min-width="80" />
      <el-table-column label="必选" width="80">
        <template #default="{ row = {}} = {}">
          <el-switch v-model="row.is_required" :disabled="!row.selected" />
        </template>
      </el-table-column>
      <el-table-column label="默认" width="80">
        <template #default="{ row = {}} = {}">
          <el-switch v-model="row.is_default_selected" :disabled="!row.selected" />
        </template>
      </el-table-column>
      <el-table-column label="默认金额" min-width="120">
        <template #default="{ row = {}} = {}">
          <el-input-number v-model="row.default_amount" :precision="2" :min="0" :disabled="!row.selected"
            style="width: 100%" />
        </template>
      </el-table-column>
      <el-table-column label="排序" width="90">
        <template #default="{ row = {}} = {}">
          <el-input-number v-model="row.sort_no" :min="0" :disabled="!row.selected" style="width: 100%" />
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="160">
        <template #default="{ row = {}} = {}">
          <el-input v-model="row.remark" :disabled="!row.selected" />
        </template>
      </el-table-column>
    </el-table>
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

.toolbar-summary {
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .full-height {
    min-height: auto;
  }
}
</style>
