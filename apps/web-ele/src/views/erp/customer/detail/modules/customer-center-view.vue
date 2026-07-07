<script setup lang="ts">
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTabs } from '@vben/hooks';


import {
  getCustomer,
  getCustomerAttachments,
  getCustomerCapitalAccounts,
  getCustomerContacts,
  getCustomerInvoices,
} from '#/api/erp/customer';
import { getBusinessPage } from '#/api/erp/client/business';
import ParticipantPanel from '#/views/erp/client/lead/detail/modules/participant-panel.vue';

import BusinessPanel from './business-panel.vue';
import ContactPanel from './contact-panel.vue';
import SubjectForm from './subject-form.vue';

import {
  ElButton,
  ElCard,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

const props = withDefaults(
  defineProps<{
    mode?: 'dialog' | 'route';
    customerId?: number | string | null;
    createMode?: boolean;
    readonlyPoolMode?: boolean;
  }>(),
  {
    mode: 'route',
    customerId: null,
    createMode: false,
    readonlyPoolMode: false,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', id?: number | string): void;
}>();

const route = useRoute();
const router = useRouter();
const tabs = useTabs();

const activeTabName = ref('subject');
const loading = ref(false);
const customer = ref<CrmCustomerApi.Customer>({} as CrmCustomerApi.Customer);
const currentCustomerId = ref<number | string>('');
const currentCreateMode = ref(false);
const subjectReadonly = ref(true);
const contactPanelRef = ref<any>();
const businessPanelRef = ref<any>();

const contactCount = ref(0);
const businessCount = ref(0);
const accountCount = ref(0);
const invoiceCount = ref(0);
const attachmentCount = ref(0);

const isRouteMode = computed(() => props.mode === 'route');
const pageTitle = computed(() => (currentCreateMode.value ? '新增正式客户' : '客户信息'));
const allowContactTab = computed(() => !currentCreateMode.value);
const allowBusinessTab = computed(() => !currentCreateMode.value && !props.readonlyPoolMode);
const allowParticipantTab = computed(
  () => !currentCreateMode.value && !props.readonlyPoolMode && !!String(customer.value?.sourceLeadId || '').trim(),
);

async function loadCustomerDetail() {
  if (!currentCustomerId.value) {
    customer.value = {} as any;
    return;
  }
  loading.value = true;
  try {
    customer.value = (await getCustomer(currentCustomerId.value as any)) || ({} as any);
    const [contacts, businessRes, accounts, invoices, attachments] = await Promise.all([
      getCustomerContacts({ customerId: currentCustomerId.value, companyType: 1 }),
      getBusinessPage({ pageNo: 1, page: 999 } as any),
      getCustomerCapitalAccounts(currentCustomerId.value),
      getCustomerInvoices(currentCustomerId.value),
      getCustomerAttachments(currentCustomerId.value),
    ]);
    contactCount.value = contacts.length;
    businessCount.value = ((businessRes?.list || []) as CrmCustomerBusinessApi.Business[]).filter(
      (item) => String(item.customerId || '') === String(currentCustomerId.value || ''),
    ).length;
    accountCount.value = accounts.length;
    invoiceCount.value = invoices.length;
    attachmentCount.value = attachments.length;
  } finally {
    loading.value = false;
  }
}

async function initState(id?: number | string | null, createMode = false) {
  currentCreateMode.value = !!createMode;
  activeTabName.value = 'subject';
  subjectReadonly.value = !createMode;
  if (createMode) {
    currentCustomerId.value = '';
    customer.value = { companyType: 1, isPool: 0, dealStatus: true } as any;
    return;
  }
  currentCustomerId.value = (id || '') as any;
  await loadCustomerDetail();
}

function handleClose() {
  if (isRouteMode.value) {
    tabs.closeCurrentTab();
    router.back();
    return;
  }
  emit('close');
}

function enableSubjectEdit() {
  subjectReadonly.value = false;
  activeTabName.value = 'subject';
}

async function handleSubjectSaveSuccess(id?: number | string) {
  subjectReadonly.value = true;
  if (!id) {
    handleClose();
    return;
  }
  currentCreateMode.value = false;
  currentCustomerId.value = id;
  await loadCustomerDetail();
  emit('saved', id);
}

function handleAddBusiness() {
  if (!allowBusinessTab.value) return;
  activeTabName.value = 'business';
  nextTick(() => businessPanelRef.value?.openCreate?.());
}

function handleAddContact() {
  activeTabName.value = 'contact';
  nextTick(() => contactPanelRef.value?.openCreate?.());
}

watch(
  () => [props.customerId, props.createMode, props.mode, props.readonlyPoolMode],
  async () => {
    if (!isRouteMode.value) {
      await initState(props.customerId, props.createMode);
    }
  },
  { immediate: true },
);

watch(
  () => route.params.id,
  async (id) => {
    if (isRouteMode.value) {
      await initState(id as any, String(id) === 'new');
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-loading="loading" class="customer-center-view">
    <div class="page-heading">
      <div>
        <!-- <div class="page-title">{{ pageTitle }}</div> -->
      </div>
      <ElButton plain @click="handleClose">{{ isRouteMode ? '返回' : '关闭' }}</ElButton>
    </div>

    <ElCard v-if="!currentCreateMode" shadow="never" class="summary-card">
      <div class="summary-head">
        <div>
          <div class="customer-title">{{ customer?.name || customer?.customerName || '-' }}</div>
          <div class="customer-subtitle">客户编号：{{ customer?.customerCode || '-' }}</div>
        </div>
        <div class="tag-row">
          <ElTag type="primary">正式客户</ElTag>
          <ElTag v-if="customer?.sourceLeadCode || customer?.sourceLeadName" type="info" effect="plain">
            来源线索：{{ [customer?.sourceLeadCode, customer?.sourceLeadName].filter(Boolean).join(' / ') }}
          </ElTag>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-item"><span>负责人</span><strong>{{ customer?.ownerUserName || '-' }}</strong></div>
        <div class="stat-item"><span>部门</span><strong>{{ customer?.departName || customer?.ownerUserDeptName || '-' }}</strong></div>
        <div class="stat-item"><span>联系人</span><strong>{{ contactCount }}</strong></div>
        <div v-if="!props.readonlyPoolMode" class="stat-item"><span>商机</span><strong>{{ businessCount }}</strong></div>
        <div class="stat-item"><span>账户 / 发票 / 附件</span><strong>{{ `${accountCount} / ${invoiceCount} / ${attachmentCount}` }}</strong></div>
      </div>
      <div class="action-row">
        <ElButton type="primary" @click="enableSubjectEdit">编辑主体信息</ElButton>
        <ElButton @click="handleAddContact">新增联系人</ElButton>
        <ElButton v-if="!props.readonlyPoolMode" @click="handleAddBusiness">新建商机</ElButton>
        <ElButton v-if="allowParticipantTab" @click="activeTabName = 'participant'">查看参与人</ElButton>
      </div>
    </ElCard>

    <ElCard class="detail-tabs-card" shadow="never">
      <ElTabs v-model:model-value="activeTabName">
        <ElTabPane label="主体档案" name="subject">
          <SubjectForm
            :customer-data="currentCreateMode ? null : customer"
            :readonly="subjectReadonly"
            @close="handleClose"
            @cancel-edit="subjectReadonly = true"
            @save-success="handleSubjectSaveSuccess"
          />
        </ElTabPane>
        <ElTabPane label="联系人" name="contact" :disabled="!allowContactTab">
          <ContactPanel
            ref="contactPanelRef"
            :customer-id="currentCustomerId"
            :customer-code="customer?.customerCode"
            :customer-name="customer?.name || customer?.customerName"
            :company-type="1"
            @updated="loadCustomerDetail"
          />
        </ElTabPane>
        <ElTabPane v-if="allowBusinessTab" label="商机" name="business" :disabled="!allowBusinessTab">
          <BusinessPanel ref="businessPanelRef" :customer-id="currentCustomerId" @updated="loadCustomerDetail" />
        </ElTabPane>
        <ElTabPane v-if="allowParticipantTab" label="参与人" name="participant" :disabled="!allowParticipantTab">
          <ParticipantPanel
            :key="`customer-source-participant-${customer?.sourceLeadId || ''}-${customer?.sourceLeadCode || ''}`"
            :lead-id="customer?.sourceLeadId"
            :lead-code="customer?.sourceLeadCode"
            :lead-name="customer?.sourceLeadName"
            :readonly="true"
            :allow-create="false"
          />
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<style scoped>
.customer-center-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-heading,
.summary-head,
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title,
.customer-title {
  font-size: 22px;
  font-weight: 700;
}

.page-desc,
.customer-subtitle,
.stat-item span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.customer-subtitle {
  margin-top: 6px;
}

.summary-card,
.detail-tabs-card {
  border-radius: 14px;
}

.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-item {
  background: var(--el-fill-color-light);
  border-radius: 12px;
  padding: 14px;
}

.stat-item strong {
  display: block;
  margin-top: 8px;
  font-size: 14px;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .page-heading,
  .summary-head,
  .action-row {
    flex-direction: column;
    align-items: stretch;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
