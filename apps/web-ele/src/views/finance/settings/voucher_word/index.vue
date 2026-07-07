<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  deleteVoucherWord,
  getVoucherWordPage,
  updateVoucherWord,
  type VoucherWordVO,
} from '#/api/erp/finance/settings/voucher_word';

import Form from '#/views/finance/settings/voucher_word/modules/form.vue';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPagination,
  ElSwitch,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceSettingsVoucherWord' });

const loading = ref(false);
const rows = ref<VoucherWordVO[]>([]);
const total = ref(0);
const filterExpanded = ref(false);

const query = reactive({
  keyword: '',
  pageNo: 1,
  pageSize: 20,
});

const filterSummary = computed(() => {
  const keyword = String(query.keyword || '').trim();
  return keyword ? `关键词：${keyword}` : '';
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

async function reload(resetPage = false) {
  if (resetPage) query.pageNo = 1;
  loading.value = true;
  try {
    const res = await getVoucherWordPage({
      keyword: query.keyword,
      pageNo: query.pageNo,
      page: query.pageSize,
    });
    rows.value = res.list;
    total.value = res.total;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载凭证字失败');
  } finally {
    loading.value = false;
  }
}

function handleRefresh() {
  reload();
}

function handleCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleEdit(row: VoucherWordVO) {
  formModalApi.setData({ type: 'edit', id: row.id }).open();
}

function handleDetail(row: VoucherWordVO) {
  formModalApi.setData({ type: 'detail', id: row.id }).open();
}

async function handleDelete(row: VoucherWordVO) {
  try {
    await ElMessageBox.confirm(
      `确认删除凭证字“${row.word || row.printTitle}”？`,
      '提示',
      { type: 'warning' },
    );
    await deleteVoucherWord(row.id);
    ElMessage.success('删除成功');
    await reload();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function handleToggleDefault(row: VoucherWordVO, value: boolean) {
  const previous = row.isDefault;
  row.isDefault = value;
  try {
    await updateVoucherWord({
      id: row.id,
      word: row.word,
      printTitle: row.printTitle,
      isDefault: value,
      ordIdx: row.ordIdx,
      accountSetId: row.accountSetId,
    });
    ElMessage.success(value ? '已设为默认' : '已取消默认');
    await reload();
  } catch (error: any) {
    row.isDefault = previous;
    console.error(error);
    ElMessage.error(error?.message || '更新默认状态失败');
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

onMounted(() => reload(true));
</script>

<template>
  <Page auto-content-height class="voucher-word-page">
    <FormModal @success="handleRefresh" />

    <div class="voucher-word-card">
      <div class="voucher-word-filter-bar">
        <template v-if="!filterExpanded">
          <div class="voucher-word-filter-compact">
            <ElInput
              v-model="query.keyword"
              class="voucher-word-core-filter"
              clearable
              placeholder="凭证字 / 打印标题"
              @keyup.enter="reload(true)"
            />
            <ElButton class="voucher-word-create-button" type="primary" @click="handleCreate">新增</ElButton>
            <div v-if="filterSummary" class="voucher-word-filter-summary" :title="filterSummary">
              {{ filterSummary }}
            </div>
            <div class="voucher-word-actions">
              <ElButton type="primary" @click="reload(true)">查询</ElButton>
              <ElButton @click="query.keyword = ''; reload(true)">重置</ElButton>
              <ElButton @click="filterExpanded = true">展开筛选</ElButton>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="voucher-word-filter-expanded">
            <ElForm label-width="82px" class="voucher-word-filter-form">
              <ElFormItem label="关键词">
                <ElInput
                  v-model="query.keyword"
                  clearable
                  placeholder="凭证字 / 打印标题"
                  @keyup.enter="reload(true)"
                />
              </ElFormItem>
              <div class="voucher-word-filter-actions">
                <ElButton @click="filterExpanded = false">收起筛选</ElButton>
                <div class="voucher-word-actions">
                  <ElButton type="primary" @click="reload(true)">查询</ElButton>
                  <ElButton @click="query.keyword = ''; reload(true)">重置</ElButton>
                  <ElButton type="primary" @click="handleCreate">新增</ElButton>
                </div>
              </div>
            </ElForm>
          </div>
        </template>
      </div>

      <div class="voucher-word-table-scroll">
        <ElTable v-loading="loading" :data="rows" border height="100%">
          <ElTableColumn type="index" label="#" width="60" fixed="left" />
          <ElTableColumn prop="word" label="凭证字" min-width="140" />
          <ElTableColumn prop="printTitle" label="打印标题" min-width="220" />
          <ElTableColumn label="是否默认" width="120" align="center">
            <template #default="{ row }">
              <ElSwitch
                :model-value="row.isDefault"
                @change="(val: any) => handleToggleDefault(row, !!val)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn prop="ordIdx" label="排序" width="100" align="right" />
          <ElTableColumn label="操作" width="170" fixed="right" align="center">
            <template #default="{ row }">
              <ElButton link type="primary" @click="handleDetail(row)">详情</ElButton>
              <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="voucher-word-pagination">
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
.voucher-word-page {
  height: 100%;
}

.voucher-word-card {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.voucher-word-filter-bar {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.voucher-word-filter-compact {
  display: grid;
  grid-template-columns: minmax(220px, 320px) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.voucher-word-core-filter {
  min-width: 0;
}

.voucher-word-filter-summary {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voucher-word-actions,
.voucher-word-filter-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.voucher-word-actions :deep(.el-button),
.voucher-word-filter-actions :deep(.el-button),
.voucher-word-create-button {
  flex: 0 0 auto;
}

.voucher-word-filter-expanded {
  padding: 12px;
}

.voucher-word-filter-form {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 12px 16px;
}

.voucher-word-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.voucher-word-filter-form :deep(.el-input) {
  width: 100%;
}

.voucher-word-filter-actions {
  justify-content: space-between;
}

.voucher-word-table-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.voucher-word-table-scroll :deep(.el-table__header th) {
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.voucher-word-pagination {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

@media (max-width: 900px) {
  .voucher-word-filter-compact,
  .voucher-word-filter-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .voucher-word-actions,
  .voucher-word-filter-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
