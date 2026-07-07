<script lang="ts" setup>
import type { CrmCustomerApi } from '#/api/erp/customer';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import { deleteCustomer, exportCustomer, getCustomerPage } from '#/api/erp/customer';
import { $t } from '#/locales';

import CustomerCenterView from './detail/modules/customer-center-view.vue';
import ImportForm from './modules/import-form.vue';

import {
  ElButton,
  ElDialog,
  ElLoading,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

const sceneType = ref('1');
const dataTable = ref<any>(null);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<CrmCustomerApi.Customer[]>([]);
const loading = ref(false);

const dialogVisible = ref(false);
const currentCustomerId = ref<number | string | null>(null);
const currentCreateMode = ref(false);
const importDialogVisible = ref(false);
const importFileInputRef = ref<HTMLInputElement | null>(null);
const selectedImportFile = ref<File | null>(null);

function checkEditPermission(rowId: number | string) {
  return !!dataTable.value?.allowEditRow?.(rowId);
}

function checkDeletePermission(rowId: number | string) {
  return !!dataTable.value?.allowDeleteRow?.(rowId);
}

async function loadTableData(extraParams = {}) {
  loading.value = true;
  try {
    const resolvedCompanyType = (extraParams as any)?.companyType ?? (sceneType.value === '1' ? 1 : 2);
    const response = await getCustomerPage({
      pageNo: currentPage.value,
      page: page.value,
      sceneType: sceneType.value,
      companyType: resolvedCompanyType,
      ...extraParams,
    });

    if (response && response.list) {
      tableData.value = response.list;
      total.value = response.total || 0;
      dataTable.value = response.dataTable;
    } else {
      tableData.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleRefresh() {
  loadTableData();
}

function handleChangeSceneType(key: number | string) {
  sceneType.value = key.toString();
  currentPage.value = 1;
  loadTableData();
}

function handleSizeChange(size: number) {
  page.value = size;
  currentPage.value = 1;
  loadTableData();
}

function handleCurrentChange(page: number) {
  currentPage.value = page;
  loadTableData();
}

function handleImport() {
  importFileInputRef.value?.click();
}

function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
  if (!isExcel) {
    ElMessage.warning('仅支持上传 xls 或 xlsx 文件');
    input.value = '';
    return;
  }

  selectedImportFile.value = file;
  importDialogVisible.value = true;
  input.value = '';
}

async function handleExport() {
  const data = await exportCustomer();
  downloadFileFromBlobPart({ fileName: '客户.xls', source: data });
}

function handleCreate() {
  currentCustomerId.value = null;
  currentCreateMode.value = true;
  dialogVisible.value = true;
}

function handleEdit(row: CrmCustomerApi.Customer) {
  currentCustomerId.value = (row.id || row.rowid || '') as any;
  currentCreateMode.value = false;
  dialogVisible.value = true;
}

function handleNameClick(row: CrmCustomerApi.Customer) {
  if (!checkEditPermission(row.id as any)) {
    ElMessage.warning('暂无编辑权限');
    return;
  }
  handleEdit(row);
}

async function handleDelete(row: CrmCustomerApi.Customer) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.name]),
  });
  try {
    await deleteCustomer(row.id as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  } finally {
    loadingInstance.close();
  }
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentCustomerId.value = null;
  currentCreateMode.value = false;
}

function handleCenterSaved() {
  handleRefresh();
}

function handleCloseImportDialog() {
  importDialogVisible.value = false;
  selectedImportFile.value = null;
}

function handleImportSuccess() {
  importDialogVisible.value = false;
  selectedImportFile.value = null;
  handleRefresh();
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const str = String(dateString).trim();
  const msMatch = str.match(/^\/Date\((-?\d+)\)\/$/);
  if (msMatch) return new Date(Number(msMatch[1])).toLocaleDateString('zh-CN');
  return new Date(str).toLocaleDateString('zh-CN');
}

onMounted(async () => {
  loadTableData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <input
        ref="importFileInputRef"
        type="file"
        accept=".xls,.xlsx"
        style="display: none"
        @change="handleImportFileChange"
      />

      <ElTabs v-model="sceneType" @tab-change="handleChangeSceneType">
        <ElTabPane label="客户" name="1" />
        <ElTabPane label="供应商" name="2" />
      </ElTabs>

      <div class="mb-4">
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['客户']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(dataTable && dataTable.allowAddData && dataTable.allowAddData()),
              onClick: handleCreate,
            },
            {
              label: $t('ui.actionTitle.import'),
              type: 'primary',
              icon: ACTION_ICON.UPLOAD,
              disabled: !(dataTable && dataTable.allowAddData && dataTable.allowAddData()),
              onClick: handleImport,
            },
            {
              label: $t('ui.actionTitle.export'),
              type: 'primary',
              icon: ACTION_ICON.DOWNLOAD,
              disabled: false,
              onClick: handleExport,
            },
          ]"
        />
      </div>

      <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
        <ElTableColumn type="selection" fixed="left" width="50" />
        <ElTableColumn type="index" label="序号" width="60" fixed="left" />
        <ElTableColumn prop="customerCode" label="客户/供应商编号" min-width="160" fixed="left" />
        <ElTableColumn prop="name" label="名称" min-width="200">
          <template #default="{ row }">
            <ElButton type="primary" link @click="handleNameClick(row)">
              {{ row.name }}
            </ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="contactName" label="联系人姓名" min-width="150" />
        <ElTableColumn prop="mobile" label="联系人手机" min-width="120" />
        <ElTableColumn prop="telephone" label="公司电话" min-width="120" />
        <ElTableColumn prop="email" label="邮箱" min-width="180" />
        <ElTableColumn prop="region" label="地区" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="detailAddress" label="详细地址" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="ownerUserName" label="负责人" min-width="100" />
        <ElTableColumn prop="createTime" label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.createTime as string) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updateTime" label="更新时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.updateTime as string) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <TableAction
              :actions="[
                {
                  label: $t('common.edit'),
                  type: 'primary',
                  link: true,
                  icon: ACTION_ICON.EDIT,
                  disabled: !checkEditPermission(row.id),
                  onClick: () => handleEdit(row),
                },
                {
                  label: $t('common.delete'),
                  type: 'danger',
                  link: true,
                  icon: ACTION_ICON.DELETE,
                  disabled: !checkDeletePermission(row.id),
                  popConfirm: {
                    title: `确认删除客户【${row.name}】吗？`,
                    confirm: () => handleDelete(row),
                  },
                },
              ]"
            />
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pagination-container mt-4">
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="page"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <ElDialog
        v-model="dialogVisible"
        :title="currentCreateMode ? '新增客户' : '客户中心'"
        width="90%"
        top="3vh"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        destroy-on-close
      >
        <div style="max-height: 86vh; overflow-y: auto">
          <CustomerCenterView
            mode="dialog"
            :customer-id="currentCustomerId"
            :create-mode="currentCreateMode"
            @close="handleCloseDialog"
            @saved="handleCenterSaved"
          />
        </div>
      </ElDialog>

      <ElDialog
        v-model="importDialogVisible"
        title="导入客户"
        width="600px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <ImportForm
          :initial-file="selectedImportFile"
          @success="handleImportSuccess"
          @close="handleCloseImportDialog"
        />
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: flex-end;
}
</style>
