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
  ElCard,
  ElDialog,
  ElEmpty,
  ElLoading,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
  customerCode?: string;
  customerName?: string;
  companyType?: number;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentContact = ref<CrmCustomerContactApi.Contact | null>(null);
const tableData = ref<CrmCustomerContactApi.Contact[]>([]);

const ready = computed(() => !!String(props.customerId || '').trim());
const primaryContact = computed(() => {
  return tableData.value.find((item) => Number(item.isPrimary || 0) === 1) || tableData.value[0] || null;
});

async function loadTableData() {
  if (!ready.value) {
    tableData.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await getContactPage({
      pageNo: 1,
      page: 999,
      companyType: Number(props.companyType || 1),
    } as any);
    tableData.value = (response?.list || []).filter(
      (item: CrmCustomerContactApi.Contact) =>
        String(item.customerId || '') === String(props.customerId || ''),
    );
    emit('updated');
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
  <div class="contact-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">联系人</div>
        <div class="panel-desc">先看主联系人，再看完整联系人列表，避免所有联系人平铺成同一层级。</div>
      </div>
      <ElButton type="primary" :disabled="!ready" @click="openCreate">新增联系人</ElButton>
    </div>

    <ElEmpty v-if="!ready" description="请先保存客户主体信息，再维护联系人" />

    <template v-else>
      <ElCard shadow="never" class="primary-contact-card">
        <template #header>
          <div class="card-header-row">
            <span>主联系人卡</span>
            <ElTag type="success" effect="plain">{{ primaryContact ? '当前主联系人' : '待补充主联系人' }}</ElTag>
          </div>
        </template>

        <div v-if="primaryContact" class="primary-contact-grid">
          <div class="contact-name-wrap">
            <div class="contact-name">{{ primaryContact.contactName || '-' }}</div>
            <div class="contact-position">{{ primaryContact.positionName || '未填写职务' }}</div>
          </div>
          <div class="contact-meta"><span>手机</span><strong>{{ primaryContact.mobile || '-' }}</strong></div>
          <div class="contact-meta"><span>电话</span><strong>{{ primaryContact.phone || '-' }}</strong></div>
          <div class="contact-meta"><span>邮箱</span><strong>{{ primaryContact.email || '-' }}</strong></div>
          <div class="contact-meta"><span>性别</span><strong>{{ formatGender(primaryContact.gender) }}</strong></div>
          <div class="contact-meta"><span>备注</span><strong>{{ primaryContact.remark || '-' }}</strong></div>
        </div>
        <ElEmpty v-else description="暂无联系人，请先新增联系人并标记主联系人" :image-size="90" />
      </ElCard>

      <ElCard shadow="never" class="list-card">
        <template #header>
          <div class="card-header-row">
            <span>全部联系人列表</span>
            <span class="list-count">共 {{ tableData.length }} 位</span>
          </div>
        </template>

        <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
          <ElTableColumn type="index" label="序号" width="60" />
          <ElTableColumn prop="contactName" label="姓名" min-width="140" />
          <ElTableColumn prop="mobile" label="手机号" min-width="140" />
          <ElTableColumn prop="phone" label="电话" min-width="140" />
          <ElTableColumn prop="positionName" label="职务" min-width="120" />
          <ElTableColumn prop="email" label="邮箱" min-width="180" />
          <ElTableColumn label="主联系人" min-width="100">
            <template #default="{ row }">{{ formatPrimary(row.isPrimary) }}</template>
          </ElTableColumn>
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
      </ElCard>
    </template>

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

<style scoped>
.contact-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header,
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
}

.panel-desc,
.list-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.primary-contact-card,
.list-card {
  border-radius: 14px;
}

.primary-contact-grid {
  display: grid;
  grid-template-columns: 1.2fr repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.contact-name-wrap,
.contact-meta {
  border-radius: 12px;
  padding: 16px;
  background: var(--el-fill-color-light);
}

.contact-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.contact-position {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.contact-meta span {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.contact-meta strong {
  display: block;
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

@media (max-width: 1200px) {
  .primary-contact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .panel-header,
  .card-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .primary-contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
