<script lang="ts" setup>
import type { CrmCustomerContactApi } from '#/api/erp/customer/contact';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  deleteContact,
  getContactPage,
} from '#/api/erp/customer/contact';
import { $t } from '#/locales';

import { formatGender, formatPrimary } from './data';
import Form from './modules/form.vue';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElLoading,
  ElMessage,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
} from 'element-plus';

const sceneType = ref('1');
const loading = ref(false);
const currentPage = ref(1);
const page = ref(10);
const total = ref(0);
const tableData = ref<CrmCustomerContactApi.Contact[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentContact = ref<CrmCustomerContactApi.Contact | null>(null);
const dataTable = ref<any>(null);

const queryForm = reactive({
  customerName: '',
  customerCode: '',
  contactName: '',
  mobile: '',
  email: '',
  ownerUserName: '',
});

function checkEditPermission(rowId: number | string) {
  return !!dataTable.value?.allowEditRow?.(rowId);
}

function checkDeletePermission(rowId: number | string) {
  return !!dataTable.value?.allowDeleteRow?.(rowId);
}

async function loadTableData() {
  loading.value = true;
  try {
    const response = await getContactPage({
      pageNo: currentPage.value,
      page: page.value,
      companyType: Number(sceneType.value || 0),
      customerName: queryForm.customerName,
      customerCode: queryForm.customerCode,
      contactName: queryForm.contactName,
      mobile: queryForm.mobile,
      email: queryForm.email,
      ownerUserName: queryForm.ownerUserName,
    } as any);

    tableData.value = response?.list || [];
    total.value = response?.total || 0;
    dataTable.value = response?.dataTable || null;
  } catch (error) {
    console.error('加载联系人数据失败:', error);
    ElMessage.error('加载联系人数据失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadTableData();
}

function handleReset() {
  queryForm.customerName = '';
  queryForm.customerCode = '';
  queryForm.contactName = '';
  queryForm.mobile = '';
  queryForm.email = '';
  queryForm.ownerUserName = '';
  currentPage.value = 1;
  loadTableData();
}

function handleCreate() {
  currentContact.value = {
    companyType: Number(sceneType.value || 0),
    isPrimary: 0,
  } as CrmCustomerContactApi.Contact;
  dialogTitle.value = '新增联系人';
  dialogVisible.value = true;
}

function handleEdit(row: CrmCustomerContactApi.Contact) {
  currentContact.value = { ...row };
  dialogTitle.value = '编辑联系人';
  dialogVisible.value = true;
}

async function handleDelete(row: CrmCustomerContactApi.Contact) {
  const loadingInstance = ElLoading.service({
    text: $t('ui.actionMessage.deleting', [row.contactName || '']),
  });
  try {
    await deleteContact(row.id as any);
    ElMessage.success($t('ui.actionMessage.deleteSuccess', [row.contactName || '']));
    loadTableData();
  } catch (error) {
    console.error('删除联系人失败:', error);
    ElMessage.error('删除联系人失败');
  } finally {
    loadingInstance.close();
  }
}

function handleSceneTypeChange(name: string | number) {
  sceneType.value = String(name || '1');
  currentPage.value = 1;
  loadTableData();
}

function handleCloseDialog() {
  dialogVisible.value = false;
  currentContact.value = null;
}

function handleSaveSuccess() {
  dialogVisible.value = false;
  currentContact.value = null;
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

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('zh-CN');
}

onMounted(() => {
  loadTableData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <ElTabs v-model="sceneType" @tab-change="handleSceneTypeChange">
        <ElTabPane label="客户联系人" name="1" />
        <ElTabPane label="供应商联系人" name="2" />
      </ElTabs>

      <ElForm :inline="true" :model="queryForm" class="mb-4">
        <ElFormItem label="主体名称">
          <ElInput v-model="queryForm.customerName" clearable placeholder="请输入主体名称" />
        </ElFormItem>
        <ElFormItem label="主体编号">
          <ElInput v-model="queryForm.customerCode" clearable placeholder="请输入主体编号" />
        </ElFormItem>
        <ElFormItem label="联系人姓名">
          <ElInput v-model="queryForm.contactName" clearable placeholder="请输入联系人姓名" />
        </ElFormItem>
        <ElFormItem label="手机号">
          <ElInput v-model="queryForm.mobile" clearable placeholder="请输入手机号" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="queryForm.email" clearable placeholder="请输入邮箱" />
        </ElFormItem>
        <ElFormItem label="负责人">
          <ElInput v-model="queryForm.ownerUserName" clearable placeholder="请输入负责人" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="handleSearch">查询</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <div class="mb-4">
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['联系人']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              disabled: !(
                dataTable &&
                dataTable.allowAddData &&
                dataTable.allowAddData()
              ),
              onClick: handleCreate,
            },
          ]"
        />
      </div>

      <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
        <ElTableColumn type="index" label="序号" width="60" fixed="left" />
        <ElTableColumn prop="customerCode" label="主体编号" min-width="150" fixed="left" />
        <ElTableColumn prop="customerName" label="主体名称" min-width="180" fixed="left" />
        <ElTableColumn prop="contactName" label="联系人姓名" min-width="140" />
        <ElTableColumn label="性别" min-width="90">
          <template #default="{ row }">
            {{ formatGender(row.gender) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="mobile" label="手机号" min-width="140" />
        <ElTableColumn prop="phone" label="联系电话" min-width="140" />
        <ElTableColumn prop="email" label="邮箱" min-width="180" />
        <ElTableColumn prop="positionName" label="职务/岗位" min-width="120" />
        <ElTableColumn label="主联系人" min-width="100">
          <template #default="{ row }">
            {{ formatPrimary(row.isPrimary) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="ownerUserName" label="负责人" min-width="100" />
        <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="createTime" label="创建时间" min-width="140">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updateTime" label="更新时间" min-width="140">
          <template #default="{ row }">
            {{ formatDate(row.updateTime) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="160" fixed="right">
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
                    title: `确认删除联系人【${row.contactName}】吗？`,
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
        :title="dialogTitle"
        width="700px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <Form
          :company-type="Number(sceneType || 0)"
          :contact-data="currentContact"
          @close="handleCloseDialog"
          @save-success="handleSaveSuccess"
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
