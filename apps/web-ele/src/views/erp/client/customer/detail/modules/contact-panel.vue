<script setup lang="ts">
import type { CrmCustomerContactApi } from '#/api/erp/customer/contact';

import { computed, ref, watch } from 'vue';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  deleteContact,
  getContact,
  getContactPage,
} from '#/api/erp/customer/contact';
import { formatGender, formatPrimary } from '#/views/erp/client/contact/data';
import ContactForm from '#/views/erp/client/contact/modules/form.vue';

import {
  ElButton,
  ElDialog,
  ElEmpty,
  ElLoading,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
  customerCode?: string;
  customerName?: string;
  companyType?: number;
}>();

const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentContact = ref<CrmCustomerContactApi.Contact | null>(null);
const tableData = ref<CrmCustomerContactApi.Contact[]>([]);

const ready = computed(() => !!String(props.customerId || '').trim());

async function loadTableData() {
  if (!ready.value) {
    tableData.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await getContactPage({
      index: 1,
      size: 999,
      companyType: Number(props.companyType || 1),
    } as any);
    tableData.value = (response?.list || []).filter(
      (item: CrmCustomerContactApi.Contact) =>
        String(item.customerId || '') === String(props.customerId || ''),
    );
  } catch (error) {
    console.error('加载客户联系人失败:', error);
    ElMessage.error('加载客户联系人失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  currentContact.value = {
    customerId: props.customerId,
    customerCode: props.customerCode,
    customerName: props.customerName,
    companyType: Number(props.companyType || 1),
    isPrimary: 0,
  } as CrmCustomerContactApi.Contact;
  dialogTitle.value = '新增联系人';
  dialogVisible.value = true;
}

async function handleEdit(row: CrmCustomerContactApi.Contact) {
  const loadingInstance = ElLoading.service({ text: '加载联系人详情中...' });
  try {
    currentContact.value = row.id ? await getContact(row.id) : { ...row };
    dialogTitle.value = '编辑联系人';
    dialogVisible.value = true;
  } catch (error) {
    console.error('加载联系人详情失败:', error);
    ElMessage.error('加载联系人详情失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleDelete(row: CrmCustomerContactApi.Contact) {
  try {
    await deleteContact(row.id as any);
    ElMessage.success('删除联系人成功');
    await loadTableData();
  } catch (error) {
    console.error('删除联系人失败:', error);
    ElMessage.error('删除联系人失败');
  }
}

watch(
  () => [props.customerId, props.companyType],
  () => {
    loadTableData();
  },
  { immediate: true },
);

defineExpose({ openCreate, reload: loadTableData });
</script>

<template>
  <div>
    <div class="mb-4 flex justify-end">
      <ElButton type="primary" :disabled="!ready" @click="openCreate">新增联系人</ElButton>
    </div>

    <ElEmpty v-if="!ready" description="请先保存客户主体信息，再维护联系人" />

    <ElTable v-else v-loading="loading" :data="tableData" stripe style="width: 100%">
      <ElTableColumn type="index" label="序号" width="60" />
      <ElTableColumn prop="contactName" label="联系人姓名" min-width="140" />
      <ElTableColumn label="性别" min-width="90">
        <template #default="{ row }">{{ formatGender(row.gender) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="mobile" label="手机号" min-width="140" />
      <ElTableColumn prop="phone" label="联系电话" min-width="140" />
      <ElTableColumn prop="email" label="邮箱" min-width="180" />
      <ElTableColumn prop="positionName" label="职务/岗位" min-width="120" />
      <ElTableColumn label="主联系人" min-width="100">
        <template #default="{ row }">{{ formatPrimary(row.isPrimary) }}</template>
      </ElTableColumn>
      <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <ElTableColumn label="操作" fixed="right" width="160">
        <template #default="{ row }">
          <TableAction
            :actions="[
              {
                label: '编辑',
                type: 'primary',
                link: true,
                icon: ACTION_ICON.EDIT,
                onClick: () => handleEdit(row),
              },
              {
                label: '删除',
                type: 'danger',
                link: true,
                icon: ACTION_ICON.DELETE,
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

    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="35%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 70vh; overflow-y: auto">
        <ContactForm
          :company-type="Number(companyType || 1)"
          :contact-data="currentContact"
          @close="dialogVisible = false"
          @save-success="() => { dialogVisible = false; loadTableData(); }"
        />
      </div>
    </ElDialog>
  </div>
</template>
