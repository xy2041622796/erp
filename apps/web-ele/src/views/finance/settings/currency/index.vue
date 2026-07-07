<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  deleteCurrency,
  getCurrencyPage,
  saveCurrency,
  toggleCurrencyEnable,
  type CurrencyVO,
} from '#/api/erp/finance/settings/currency';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
} from 'element-plus';

defineOptions({ name: 'FinanceSettingsCurrency' });

const loading = ref(false);
const currencySyncing = ref(false);
const rows = ref<CurrencyVO[]>([]);
const total = ref(0);
const filterExpanded = ref(false);
const showDevCurrencySync = import.meta.env.DEV;
const syncCurrencyButtonText = '\u540c\u6b65\u5e01\u522b';

const query = reactive({
  keyword: '',
  enableStatus: '' as '' | 0 | 1,
  isBaseCurrency: '' as '' | 0 | 1,
  pageNo: 1,
  pageSize: 20,
});

const showDialog = ref(false);
const editForm = reactive<CurrencyVO>({
  id: '',
  currencyCode: '',
  currencyName: '',
  currencySymbol: '',
  currencyUnit: '',
  exchangeRate: 1,
  isBaseCurrency: false,
  enableStatus: 1,
  sortNo: 0,
  remark: '',
});

const dialogTitle = computed(() => (editForm.id ? '编辑币别' : '新增币别'));
const filterSummary = computed(() => {
  const items: string[] = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) items.push(`关键词：${keyword}`);
  if (query.enableStatus === 1) items.push('状态：启用');
  if (query.enableStatus === 0) items.push('状态：停用');
  if (query.isBaseCurrency === 1) items.push('本位币：是');
  if (query.isBaseCurrency === 0) items.push('本位币：否');
  return items.join('；');
});

function resetForm() {
  Object.assign(editForm, {
    id: '',
    currencyCode: '',
    currencyName: '',
    currencySymbol: '',
    currencyUnit: '',
    exchangeRate: 1,
    isBaseCurrency: false,
    enableStatus: 1,
    sortNo: 0,
    remark: '',
    lingmaSysEnt: undefined,
    lingmaSysKey: undefined,
  });
}

async function reload(resetPage = false) {
  if (resetPage) query.pageNo = 1;
  loading.value = true;
  try {
    const res = await getCurrencyPage({
      keyword: query.keyword,
      enableStatus: query.enableStatus,
      isBaseCurrency: query.isBaseCurrency,
      pageNo: query.pageNo,
      page: query.pageSize,
    });
    rows.value = res.list;
    total.value = res.total;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '加载币别失败');
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  resetForm();
  showDialog.value = true;
}

function openEdit(row: CurrencyVO) {
  resetForm();
  Object.assign(editForm, row);
  showDialog.value = true;
}

async function onSave() {
  try {
    await saveCurrency({ ...editForm });
    ElMessage.success('保存成功');
    showDialog.value = false;
    await reload();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '保存失败');
  }
}

async function onDelete(row: CurrencyVO) {
  try {
    await ElMessageBox.confirm(`确认删除币别“${row.currencyName || row.currencyCode}”？`, '提示', {
      type: 'warning',
    });
    await deleteCurrency(row);
    ElMessage.success('删除成功');
    await reload();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  }
}

async function onToggleEnable(row: CurrencyVO, enable: boolean) {
  try {
    await toggleCurrencyEnable(row, enable);
    ElMessage.success('已更新');
    await reload();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '更新失败');
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

function onPrint() {
  window.print();
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function onExport() {
  const header = ['币别编码', '币别名称', '符号', '单位', '汇率', '本位币', '启用状态', '排序', '备注'];
  const body = rows.value.map((row) => [
    row.currencyCode,
    row.currencyName,
    row.currencySymbol,
    row.currencyUnit,
    row.exchangeRate,
    row.isBaseCurrency ? '是' : '否',
    row.enableStatus === 1 ? '启用' : '停用',
    row.sortNo,
    row.remark,
  ]);
  const csv = [header, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'currency.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function onSyncDefaultCurrency() {
  if (!import.meta.env.DEV) return;
  currencySyncing.value = true;
  try {
    const { syncDefaultCurrencyForCurrentAccountSet } = await import(
      '#/api/erp/finance/settings/currency'
    );
    const result = await syncDefaultCurrencyForCurrentAccountSet();
    ElMessage.success(
      result.created
        ? '\u5df2\u540c\u6b65\u9ed8\u8ba4\u5e01\u522b'
        : '\u5f53\u524d\u8d26\u5957\u5df2\u6709\u9ed8\u8ba4\u5e01\u522b',
    );
    await reload();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '\u540c\u6b65\u5e01\u522b\u5931\u8d25');
  } finally {
    currencySyncing.value = false;
  }
}

onMounted(() => reload(true));
</script>

<template>
  <Page auto-content-height class="currency-page">
    <div class="currency-table-card">
      <div class="currency-filter-bar no-print">
        <template v-if="!filterExpanded">
          <div class="currency-filter-compact">
            <ElInput
              v-model="query.keyword"
              class="currency-core-filter"
              clearable
              placeholder="币别编码 / 名称"
              @keyup.enter="reload(true)"
            />
            <ElButton class="currency-create-button" type="primary" @click="openAdd">新增</ElButton>
            <div v-if="filterSummary" class="currency-filter-summary" :title="filterSummary">
              {{ filterSummary }}
            </div>
            <div class="currency-compact-actions">
              <ElButton
                v-if="showDevCurrencySync"
                :loading="currencySyncing"
                @click="onSyncDefaultCurrency"
              >
                {{ syncCurrencyButtonText }}
              </ElButton>
              <ElButton type="primary" @click="reload(true)">查询</ElButton>
              <ElButton @click="onPrint">打印</ElButton>
              <ElButton @click="onExport">导出</ElButton>
              <ElButton @click="filterExpanded = true">展开筛选</ElButton>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="currency-filter-expanded">
            <ElForm label-width="82px" class="currency-filter-form">
              <ElFormItem label="关键词">
                <ElInput
                  v-model="query.keyword"
                  clearable
                  placeholder="币别编码 / 名称 / 符号"
                  @keyup.enter="reload(true)"
                />
              </ElFormItem>
              <ElFormItem label="启用状态">
                <ElSelect v-model="query.enableStatus" clearable placeholder="全部">
                  <ElOption :value="1" label="启用" />
                  <ElOption :value="0" label="停用" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="本位币">
                <ElSelect v-model="query.isBaseCurrency" clearable placeholder="全部">
                  <ElOption :value="1" label="是" />
                  <ElOption :value="0" label="否" />
                </ElSelect>
              </ElFormItem>
              <div class="currency-filter-actions">
                <ElButton @click="filterExpanded = false">收起筛选</ElButton>
                <div class="currency-filter-actions__right">
                  <ElButton
                    v-if="showDevCurrencySync"
                    :loading="currencySyncing"
                    @click="onSyncDefaultCurrency"
                  >
                    {{ syncCurrencyButtonText }}
                  </ElButton>
                  <ElButton type="primary" @click="reload(true)">查询</ElButton>
                  <ElButton @click="onPrint">打印</ElButton>
                  <ElButton @click="onExport">导出</ElButton>
                  <ElButton type="primary" @click="openAdd">新增</ElButton>
                </div>
              </div>
            </ElForm>
          </div>
        </template>
      </div>

      <div class="currency-table-scroll">
        <ElTable v-loading="loading" :data="rows" border height="100%">
          <ElTableColumn prop="currencyCode" label="币别编码" width="130" fixed="left" />
          <ElTableColumn prop="currencyName" label="币别名称" min-width="150" />
          <ElTableColumn prop="currencySymbol" label="符号" width="90" />
          <ElTableColumn prop="currencyUnit" label="单位" width="110" />
          <ElTableColumn prop="exchangeRate" label="兑本位币汇率" width="140" align="right" />
          <ElTableColumn label="本位币" width="100" align="center">
            <template #default="{ row }">{{ row.isBaseCurrency ? '是' : '否' }}</template>
          </ElTableColumn>
          <ElTableColumn label="启用状态" width="120" align="center">
            <template #default="{ row }">
              <ElSwitch
                :model-value="row.enableStatus === 1"
                @change="(val: any) => onToggleEnable(row, !!val)"
              />
            </template>
          </ElTableColumn>
          <ElTableColumn prop="sortNo" label="排序" width="90" align="right" />
          <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <ElTableColumn label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="onDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="currency-pagination no-print">
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

    <ElDialog v-model="showDialog" :title="dialogTitle" width="min(520px, 92vw)" destroy-on-close>
      <ElForm label-width="110px" class="currency-edit-form">
        <ElFormItem label="币别编码" required>
          <ElInput v-model="editForm.currencyCode" placeholder="例如 CNY" maxlength="20" />
        </ElFormItem>
        <ElFormItem label="币别名称" required>
          <ElInput v-model="editForm.currencyName" placeholder="例如 人民币" maxlength="50" />
        </ElFormItem>
        <ElFormItem label="符号">
          <ElInput v-model="editForm.currencySymbol" placeholder="例如 ¥" maxlength="20" />
        </ElFormItem>
        <ElFormItem label="单位">
          <ElInput v-model="editForm.currencyUnit" placeholder="例如 元" maxlength="20" />
        </ElFormItem>
        <ElFormItem label="兑本位币汇率">
          <ElInputNumber v-model="editForm.exchangeRate" :min="0" :precision="6" :controls="false" class="w-full" />
        </ElFormItem>
        <ElFormItem label="本位币">
          <ElSwitch v-model="editForm.isBaseCurrency" />
        </ElFormItem>
        <ElFormItem label="启用状态">
          <ElSwitch v-model="editForm.enableStatus" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="editForm.sortNo" :controls="false" class="w-full" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="editForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showDialog = false">取消</ElButton>
        <ElButton type="primary" @click="onSave">保存</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.currency-page {
  height: 100%;
}

.currency-table-card {
  display: flex;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.currency-filter-bar {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.currency-filter-compact {
  display: grid;
  grid-template-columns: minmax(220px, 300px) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.currency-core-filter {
  min-width: 0;
}

.currency-filter-summary {
  min-width: 0;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.currency-compact-actions,
.currency-filter-actions__right {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.currency-compact-actions :deep(.el-button),
.currency-filter-actions__right :deep(.el-button),
.currency-create-button {
  flex: 0 0 auto;
}

.currency-filter-expanded {
  padding: 12px;
}

.currency-filter-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
}

.currency-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.currency-filter-form :deep(.el-select),
.currency-filter-form :deep(.el-input) {
  width: 100%;
}

.currency-filter-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 2px;
}

.currency-table-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.currency-pagination {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.currency-edit-form {
  padding-right: 12px;
}

@media (max-width: 1100px) {
  .currency-filter-form {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .currency-filter-compact {
    grid-template-columns: minmax(180px, 260px) auto minmax(0, 1fr);
  }

  .currency-compact-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 820px) {
  .currency-filter-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .currency-filter-compact {
    grid-template-columns: minmax(0, 1fr);
  }

  .currency-filter-summary {
    display: block;
  }

  .currency-compact-actions,
  .currency-filter-actions,
  .currency-filter-actions__right {
    flex-wrap: wrap;
  }
}

@media (max-width: 560px) {
  .currency-filter-form {
    grid-template-columns: 1fr;
  }

  .currency-filter-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .currency-filter-actions__right,
  .currency-compact-actions {
    justify-content: flex-start;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .currency-table-card {
    border: 0;
  }
}
</style>
