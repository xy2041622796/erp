<script lang="ts" setup>
import type { AssetCategory } from '#/api/erp/finance/assets/category';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  deleteAssetCategory,
  fetchAssetCategoryList,
  toggleAssetCategoryStatus,
} from '#/api/erp/finance/assets/category';
import Form from '#/views/finance/assets/category/modules/form.vue';

defineOptions({ name: 'FinanceAssetCategory' });

const loading = ref(false);
const rows = ref<AssetCategory[]>([]);
const query = reactive({ keyword: '', status: '' as 0 | 1 | '' });
const showForm = ref(false);
const currentRow = ref<AssetCategory | null>(null);

function getCategoryKey(row: AssetCategory) {
  return String(row.id || row.rowid || '').trim();
}

function getSubjectText(row: AssetCategory) {
  return [row.subject_code, row.subject_name].filter(Boolean).join(' ');
}

function isIntangible(row: AssetCategory) {
  return String(row.asset_property || '').includes('无形');
}

function isDeferred(row: AssetCategory) {
  const property = String(row.asset_property || '');
  return property.includes('长期待摊') || property.includes('待摊');
}

function methodLabel(row: AssetCategory) {
  if (isIntangible(row) || isDeferred(row)) return '摊销方法';
  return '折旧方法';
}

function getAccumulatedSubjectText(row: AssetCategory) {
  if (isIntangible(row)) return '累计摊销';
  if (isDeferred(row)) return '长期待摊费用摊销';
  return '累计折旧';
}

function getExpenseSubjectText(row: AssetCategory) {
  if (isIntangible(row)) return '管理费用-无形资产摊销';
  if (isDeferred(row)) return '管理费用-长期待摊费用摊销';
  return '管理费用-折旧费';
}

function formatResidualRate(row: AssetCategory) {
  const value = Number(row.residual_rate ?? 0);
  if (!Number.isFinite(value)) return '';

  const percent = value > 1 ? value : value * 100;
  return `${Number(percent.toFixed(4))}%`;
}

function matchesCurrentQuery(row: AssetCategory) {
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    const text = [
      row.category_code,
      row.category_name,
      row.subject_code,
      row.subject_name,
    ].join(' ');
    if (!text.includes(keyword)) return false;
  }

  if (query.status === 0 || query.status === 1) {
    return Number(row.status || 0) === query.status;
  }

  return true;
}

function applySavedRow(row: AssetCategory) {
  const key = getCategoryKey(row);
  if (!key) return;

  const index = rows.value.findIndex((item) => getCategoryKey(item) === key);

  if (matchesCurrentQuery(row) && index !== -1) {
    rows.value.splice(index, 1, { ...rows.value[index], ...row });
    return;
  }

  if (matchesCurrentQuery(row)) {
    rows.value = [...rows.value, row].sort(
      (a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0),
    );
    return;
  }

  if (index !== -1) rows.value.splice(index, 1);
}

async function reload() {
  loading.value = true;
  try {
    rows.value = await fetchAssetCategoryList(query);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  currentRow.value = null;
  showForm.value = true;
}

function openEdit(row: AssetCategory) {
  currentRow.value = { ...row, id: String(row.id || row.rowid || '') };
  showForm.value = true;
}

async function onDelete(row: AssetCategory) {
  try {
    await deleteAssetCategory(row);
    ElMessage.success('删除成功');
    rows.value = rows.value.filter(
      (item) => getCategoryKey(item) !== getCategoryKey(row),
    );
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function onToggle(row: AssetCategory, val: boolean) {
  try {
    await toggleAssetCategoryStatus({
      id: String(row.id || row.rowid || ''),
      rowid: row.rowid,
      status: val,
      lingmaSysKey: row.lingma_sys_key,
    });
    ElMessage.success('状态已更新');
    applySavedRow({ ...row, status: val ? 1 : 0 });
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '更新失败');
  }
}

onMounted(reload);
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="flex h-full flex-col gap-3">
      <div
        class="asset-category-panel border-border bg-card min-h-0 flex-1 rounded-md border shadow-sm"
      >
        <div class="table-toolbar">
          <div class="table-toolbar__filters">
            <div class="filter-item filter-item--search">
              <span class="filter-label">类别搜索</span>
              <ElInput
                v-model="query.keyword"
                class="category-search-input"
                placeholder="类别编码/名称/会计科目"
                clearable
                @clear="reload"
                @keyup.enter="reload"
              />
            </div>

            <div class="filter-item">
              <span class="filter-label">状态</span>
              <ElSelect
                v-model="query.status"
                class="status-select"
                clearable
                placeholder="全部"
                @change="reload"
                @clear="reload"
              >
                <ElOption :value="1" label="启用" />
                <ElOption :value="0" label="停用" />
              </ElSelect>
            </div>
          </div>

          <div class="table-toolbar__actions">
            <ElButton type="primary" @click="reload">查询</ElButton>
            <ElButton @click="reload">刷新</ElButton>
            <ElButton type="primary" @click="openAdd">新增类别</ElButton>
          </div>
        </div>

        <ElTable v-loading="loading" :data="rows" border height="100%">
          <ElTableColumn
            prop="category_code"
            label="资产类别编码"
            width="140"
            fixed="left"
          />

          <ElTableColumn
            prop="category_name"
            label="资产类别名称"
            min-width="170"
            fixed="left"
          />

          <ElTableColumn prop="asset_property" label="资产大类" width="130">
            <template #default="{ row }">
              <ElTag effect="plain">
                {{ row.asset_property || '未设置' }}
              </ElTag>
            </template>
          </ElTableColumn>

          <ElTableColumn label="折旧/摊销方法" width="160">
            <template #default="{ row }">
              <span class="method-label">{{ methodLabel(row) }}：</span>
              {{ row.depreciation_method || '-' }}
            </template>
          </ElTableColumn>

          <ElTableColumn
            prop="useful_life_months"
            label="默认使用期限(月)"
            width="150"
            align="right"
          />

          <ElTableColumn label="预计净残值率" width="120" align="right">
            <template #default="{ row }">
              {{ formatResidualRate(row) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="原值科目" min-width="180">
            <template #default="{ row }">
              {{ getSubjectText(row) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="累计科目" min-width="150">
            <template #default="{ row }">
              {{ getAccumulatedSubjectText(row) }}
            </template>
          </ElTableColumn>

          <ElTableColumn label="费用科目" min-width="180">
            <template #default="{ row }">
              {{ getExpenseSubjectText(row) }}
            </template>
          </ElTableColumn>

          <ElTableColumn prop="sort_no" label="排序" width="80" align="right" />

          <ElTableColumn label="启用" width="90" align="center">
            <template #default="{ row }">
              <ElSwitch
                :model-value="Number(row.status || 0) === 1"
                @change="(val: any) => onToggle(row, !!val)"
              />
            </template>
          </ElTableColumn>

          <ElTableColumn prop="remark" label="备注" min-width="160" />

          <ElTableColumn label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="openEdit(row)">
                编辑
              </ElButton>
              <ElButton link type="danger" @click="onDelete(row)">
                删除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <Form v-model="showForm" :data="currentRow" @success="applySavedRow" />
    </div>
  </Page>
</template>

<style scoped>
.asset-category-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  flex-wrap: wrap;
}

.table-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item--search {
  flex: 1;
  min-width: 280px;
}

.filter-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.category-search-input {
  flex: 1;
}

.status-select {
  width: 140px;
}

.table-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.method-label {
  color: var(--el-text-color-secondary);
}
</style>
