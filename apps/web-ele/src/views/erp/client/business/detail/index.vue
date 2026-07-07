<script setup lang="ts">
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import { getBusiness } from '#/api/erp/client/business';

import { canEditBusiness, formatBusinessStage, formatBusinessStatus, formatDateTime } from '../data';
import Form from '../modules/form.vue';
import Info from './modules/info.vue';
import StatusForm from './modules/status-form.vue';

import { ElCard, ElDialog, ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const business = ref<CrmCustomerBusinessApi.Business | null>(null);
const editDialogVisible = ref(false);
const statusDialogVisible = ref(false);

const businessId = computed(() => String(route.query.id || route.params.id || '').trim());

async function loadBusinessDetail() {
  if (!businessId.value) {
    business.value = null;
    return;
  }
  loading.value = true;
  try {
    business.value = await getBusiness(businessId.value);
  } catch (error) {
    console.error('加载商机详情失败:', error);
    ElMessage.error('加载商机详情失败');
    business.value = null;
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  router.back();
}

function handleEdit() {
  if (!business.value || !canEditBusiness(business.value.businessStatus)) return;
  editDialogVisible.value = true;
}

function handleStatusChange() {
  if (!business.value || !canEditBusiness(business.value.businessStatus)) return;
  statusDialogVisible.value = true;
}

function handleViewCustomer() {
  const id = String(business.value?.customerId || '').trim();
  if (!id) return;
  router.push({ path: `/crm/customer/detail/${id}` });
}

function handleEditSuccess() {
  editDialogVisible.value = false;
  loadBusinessDetail();
}

function handleStatusSuccess() {
  statusDialogVisible.value = false;
  loadBusinessDetail();
}

onMounted(() => {
  loadBusinessDetail();
});
</script>

<template>
  <Page auto-content-height :title="business?.businessName || '商机详情'" :loading="loading">
    <template #extra>
      <TableAction
        :actions="[
          {
            label: '返回',
            type: 'default',
            icon: 'lucide:arrow-left',
            onClick: handleBack,
          },
          {
            label: '编辑',
            type: 'primary',
            icon: ACTION_ICON.EDIT,
            disabled: !canEditBusiness(business?.businessStatus),
            onClick: handleEdit,
          },
          {
            label: '变更状态',
            type: 'primary',
            disabled: !canEditBusiness(business?.businessStatus),
            onClick: handleStatusChange,
          },
          {
            label: '查看客户',
            type: 'default',
            onClick: handleViewCustomer,
          },
        ]"
      />
    </template>

    <div class="grid grid-cols-2 gap-4">
      <ElCard shadow="never">
        <template #header>归属</template>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>负责人：{{ business?.ownerUserName || '-' }}</div>
          <div>部门：{{ business?.departName || '-' }}</div>
          <div>来源线索：{{ business?.sourceLeadName || '-' }}</div>
          <div>更新时间：{{ formatDateTime(business?.updatetime) }}</div>
        </div>
      </ElCard>

      <ElCard shadow="never">
        <template #header>阶段</template>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>商机阶段：{{ formatBusinessStage(business?.businessStage) }}</div>
          <div>商机状态：{{ formatBusinessStatus(business?.businessStatus) }}</div>
          <div>预计签约时间：{{ formatDateTime(business?.expectedSignDate) }}</div>
          <div>成交概率：{{ business?.successRate ?? '-' }}{{ business?.successRate !== undefined && business?.successRate !== null && business?.successRate !== '' ? '%' : '' }}</div>
        </div>
      </ElCard>
    </div>

    <div class="mt-4">
      <Info v-if="business" :business="business" />
    </div>

    <ElDialog
      v-model="editDialogVisible"
      title="编辑商机"
      width="70%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 80vh; overflow-y: auto">
        <Form :business-data="business" @close="editDialogVisible = false" @save-success="handleEditSuccess" />
      </div>
    </ElDialog>

    <ElDialog
      v-model="statusDialogVisible"
      title="变更商机状态"
      width="35%"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <StatusForm :business-data="business" @close="statusDialogVisible = false" @save-success="handleStatusSuccess" />
    </ElDialog>
  </Page>
</template>
