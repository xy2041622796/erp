<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  deleteInexpCate,
  getInexpCatePage,
  resetDefaultInexpCate,
  updateInexpCate,
} from '#/api/erp/finance/settings/inexpcate';

import Form from '#/views/finance/funds/inexpcate/modules/form.vue';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElSwitch,
  ElTabPane,
  ElTable,
  ElTableColumn,
  ElTabs,
} from 'element-plus';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const activeTab = ref<'expense' | 'income'>('income');
const loading = ref(false);
const rows = ref<any[]>([]);
const total = ref(0);
const filterExpanded = ref(false);

const query = reactive({
  keyword: '',
  pageNo: 1,
  pageSize: 10,
});

const typeText = computed(() => (activeTab.value === 'income' ? '收入' : '支出'));
const filterSummary = computed(() => {
  const keyword = String(query.keyword || '').trim();
  return keyword ? `关键词：${keyword}` : '';
});

function getMatchKeywords(row: any) {
  const value = String(row?.match_keywords || row?.keywords || row?.description || '').trim();
  return value.includes('新增账套时自动初始化') ? '' : value;
}

function getCashFlowText(row: any) {
  return String(row?.cash_flow_name || row?.cashFlowName || row?.cash_flow_item_name || '').trim();
}

function clearInexpCateBadColumnCache() {
  if (typeof window === 'undefined') return;
  const storages = [window.localStorage, window.sessionStorage].filter(Boolean);
  for (const storage of storages) {
    const removeKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i) || '';
      const value = storage.getItem(key) || '';
      if (value.includes('getTypeText()') || value.includes('=>') || value.includes('useGridColumns')) {
        removeKeys.push(key);
      }
    }
    removeKeys.forEach((key) => storage.removeItem(key));
  }
}

async function reload(resetPage = false) {
  if (resetPage) query.pageNo = 1;
  loading.value = true;
  try {
    const category_type = activeTab.value === 'income' ? 1 : 2;
    const res = await getInexpCatePage({
      keyword: query.keyword,
      pageNo: query.pageNo,
      page: query.pageSize,
      category_type,
    });
    rows.value = res.list || [];
    total.value = res.total || 0;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载收支类别失败');
  } finally {
    loading.value = false;
  }
}

async function handleTabChange() {
  query.pageNo = 1;
  await nextTick();
  await reload(true);
}

function handleRefresh() {
  reload();
}

function handleCreate(parentRow?: any) {
  const category_type = activeTab.value === 'income' ? 1 : 2;
  formModalApi
    .setData({
      type: 'create',
      category_type,
      parent_id: parentRow?.id,
      parent_name: parentRow?.name,
    })
    .open();
}

function handleEdit(row: any) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认删除类别“${row.name || row.code}”？`,
      '提示',
      { type: 'warning' },
    );
    await deleteInexpCate(row.id);
    ElMessage.success('删除成功');
    await reload();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function handleToggleEnabled(row: any, value: boolean) {
  const previous = row.enabled;
  row.enabled = value ? 1 : 0;
  try {
    await updateInexpCate({ id: row.id, enabled: value ? 1 : 0 });
    ElMessage.success(value ? '已启用' : '已停用');
    await reload();
  } catch (error: any) {
    row.enabled = previous;
    console.error(error);
    ElMessage.error(error?.message || '更新启用状态失败');
  }
}

function resetQuery() {
  query.keyword = '';
  reload(true);
}

async function handleResetDefault() {
  try {
    await ElMessageBox.confirm(
      '确认重置当前账套的收支类别？\n\n该操作会先软删除当前账套已有有效收支类别，再重新插入一批标准收入/支出类别。\n\n注意：新插入的类别会生成新的ID，历史现金/银行日记账中引用旧类别ID的记录，可能出现收支类别显示为空；默认类别也不会自动带出会计科目，需要后续维护科目后才能用于日记账保存。',
      '重置收支类别',
      {
        type: 'warning',
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        dangerouslyUseHTMLString: false,
      },
    );
    loading.value = true;
    const result = await resetDefaultInexpCate();
    query.keyword = '';
    ElMessage.success(
      `重置成功，已删除 ${result.removed} 条并插入 ${result.added} 条`,
    );
    await reload(true);
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '重置收支类别失败');
  } finally {
    loading.value = false;
  }
}

function onPageChange(pageNo: number) {
  query.pageNo = pageNo;
  reload();
}

function onSizeChange(pageSize: number) {
  query.pageSize = pageSize;
  query.pageNo = 1;
  reload();
}

onMounted(() => {
  clearInexpCateBadColumnCache();
  reload(true);
});
</script>

<template>
  <Page auto-content-height class="inexpcate-page">
    <FormModal @success="handleRefresh" />

    <div class="inexpcate-card">
      <div class="inexpcate-filter-bar">
        <template v-if="!filterExpanded">
          <div class="inexpcate-filter-compact">
            <div class="inexpcate-left-tools">
              <ElTabs v-model="activeTab" class="inexpcate-tabs" @tab-change="handleTabChange">
                <ElTabPane label="收入" name="income" />
                <ElTabPane label="支出" name="expense" />
              </ElTabs>
              <div class="inexpcate-quick-search"><span class="inexpcate-quick-search__label">快速搜索</span>
              <ElInput
                v-model="query.keyword"
                class="inexpcate-core-filter"
                clearable
                placeholder="请输入编码或名称"
                @keyup.enter="reload(true)"
              />
              </div>
            </div>
            <div v-if="filterSummary" class="inexpcate-filter-summary" :title="filterSummary">
              {{ filterSummary }}
            </div>
            <div class="inexpcate-actions">
              <ElButton type="primary" @click="handleCreate()">新增类</ElButton>
              <ElButton type="primary" @click="reload(true)">搜索</ElButton>
              <ElButton @click="handleResetDefault">重置</ElButton>
              <ElButton @click="filterExpanded = true">展开筛选</ElButton>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="inexpcate-filter-expanded">
            <ElForm label-width="110px" class="inexpcate-filter-form">
              <ElFormItem label="类别">
                <ElTabs v-model="activeTab" class="inexpcate-tabs" @tab-change="handleTabChange">
                  <ElTabPane label="收入" name="income" />
                  <ElTabPane label="支出" name="expense" />
                </ElTabs>
              </ElFormItem>
              <ElFormItem label="输入编码或名称">
                <ElInput
                  v-model="query.keyword"
                  clearable
                  placeholder="请输入编码或名称"
                  @keyup.enter="reload(true)"
                />
              </ElFormItem>
              <div class="inexpcate-filter-actions">
                <ElButton @click="filterExpanded = false">收起筛选</ElButton>
                <div class="inexpcate-actions">
                  <ElButton type="primary" @click="reload(true)">搜索</ElButton>
                  <ElButton @click="handleResetDefault">重置</ElButton>
                  <ElButton type="primary" @click="handleCreate()">新增类</ElButton>
                </div>
              </div>
            </ElForm>
          </div>
        </template>
      </div>

      <div class="inexpcate-table-scroll">
        <ElTable v-loading="loading" :data="rows" border height="100%">
          <ElTableColumn prop="name" :label="typeText + '名称'" min-width="160" />
          <ElTableColumn label="智能匹配关键字" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">{{ getMatchKeywords(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="关联现金流" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ getCashFlowText(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="启用状态" width="120" align="center">
            <template #default="{ row }">
              <ElSwitch
                :model-value="Number(row.enabled ?? 1) === 1"
                @change="(val: any) => handleToggleEnabled(row, !!val)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="inexpcate-pagination">
        <ElPagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </div>
  </Page>
</template>

<style scoped>
.inexpcate-page {
  height: 100%;
}

.inexpcate-card {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.inexpcate-filter-bar {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.inexpcate-filter-compact {
  display: grid;
  grid-template-columns: minmax(640px, 760px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.inexpcate-left-tools {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.inexpcate-tabs {
  flex: 0 0 auto;
}

.inexpcate-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.inexpcate-quick-search {
  display: flex;
  min-width: 320px;
  align-items: center;
  gap: 8px;
}

.inexpcate-quick-search__label {
  flex: 0 0 auto;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 500;
}

.inexpcate-core-filter {
  min-width: 260px;
}

.inexpcate-filter-summary {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inexpcate-actions,
.inexpcate-filter-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.inexpcate-actions :deep(.el-button),
.inexpcate-filter-actions :deep(.el-button) {
  flex: 0 0 auto;
}

.inexpcate-filter-expanded {
  padding: 12px;
}

.inexpcate-filter-form {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(280px, 420px) minmax(0, 1fr);
  gap: 12px 16px;
}

.inexpcate-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.inexpcate-filter-form :deep(.el-input) {
  width: 100%;
}

.inexpcate-filter-actions {
  justify-content: space-between;
}

.inexpcate-table-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.inexpcate-table-scroll :deep(.el-table__header th) {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.inexpcate-pagination {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

@media (max-width: 1100px) {
  .inexpcate-filter-compact,
  .inexpcate-filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .inexpcate-left-tools,
  .inexpcate-quick-search,
  .inexpcate-actions,
  .inexpcate-filter-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
