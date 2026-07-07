<script setup lang="ts">
import type { CrmCustomerBusinessApi } from '#/api/erp/client/business';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';


import { ACTION_ICON, TableAction } from '#/adapter/vxe-table';
import {
  deleteBusiness,
  getBusiness,
  getBusinessPage,
} from '#/api/erp/client/business';
import {
  canDeleteBusiness,
  canEditBusiness,
  formatBusinessStage,
  formatBusinessStatus,
} from '#/views/erp/client/business/data';
import BusinessForm from '#/views/erp/client/business/modules/form.vue';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElLoading,
  ElMessage,
  ElStatistic,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  customerId?: number | string;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const router = useRouter();
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentBusiness = ref<CrmCustomerBusinessApi.Business | null>(null);
const tableData = ref<CrmCustomerBusinessApi.Business[]>([]);

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

const ready = computed(() => !!String(props.customerId || '').trim());
const activeBusinessCount = computed(() => tableData.value.filter((item) => Number(item.businessStatus || 0) === 0).length);
const nearestBusiness = computed(() => {
  const withDate = tableData.value.filter((item) => item.expectedSignDate);
  return [...withDate].sort((a, b) => new Date(String(a.expectedSignDate)).getTime() - new Date(String(b.expectedSignDate)).getTime())[0] || tableData.value[0] || null;
});

async function loadTableData() {
  if (!ready.value) {
    tableData.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await getBusinessPage({
      index: 1,
      size: 999,
    } as any);
    tableData.value = (response?.list || []).filter(
      (item: CrmCustomerBusinessApi.Business) =>
        String(item.customerId || '') === String(props.customerId || ''),
    );
    emit('updated');
  } catch (error) {
    console.error('加载客户商机失败:', error);
    ElMessage.error('加载客户商机失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  currentBusiness.value = {
    businessStatus: 0,
    businessStage: 0,
    companyType: 1,
    customerId: props.customerId,
  } as CrmCustomerBusinessApi.Business;
  dialogTitle.value = '新增商机';
  dialogVisible.value = true;
}

async function handleEdit(row: CrmCustomerBusinessApi.Business) {
  const loadingInstance = ElLoading.service({ text: '加载商机详情中...' });
  try {
    currentBusiness.value = row.rowid ? await getBusiness(row.rowid) : row;
    dialogTitle.value = '编辑商机';
    dialogVisible.value = true;
  } catch (error) {
    console.error('加载商机详情失败:', error);
    ElMessage.error('加载商机详情失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleDelete(row: CrmCustomerBusinessApi.Business) {
  try {
    await deleteBusiness(String(row.rowid || row.id || ''));
    ElMessage.success('删除商机成功');
    await loadTableData();
  } catch (error: any) {
    console.error('删除商机失败:', error);
    ElMessage.error(error?.message || '删除商机失败');
  } finally {
  }
}

function handleDetail(row: CrmCustomerBusinessApi.Business) {
  router.push({ path: '/crm/business/detail', query: { id: String(row.rowid || row.id || '') } });
}

watch(
  () => props.customerId,
  () => {
    loadTableData();
  },
  { immediate: true },
);

defineExpose({ openCreate, reload: loadTableData });
</script>

<template>
  <div class="business-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">商机</div>
        <div class="panel-desc">先看商机摘要，再维护完整列表，不重写原有商机业务逻辑。</div>
      </div>
      <ElButton type="primary" :disabled="!ready" @click="openCreate">新增商机</ElButton>
    </div>

    <ElEmpty v-if="!ready" description="请先保存客户主体信息，再维护商机" />

    <template v-else>
      <div class="summary-grid">
        <ElCard shadow="never" class="summary-card">
          <ElStatistic title="商机总数" :value="tableData.length" />
        </ElCard>
        <ElCard shadow="never" class="summary-card">
          <ElStatistic title="跟进中商机" :value="activeBusinessCount" />
        </ElCard>
        <ElCard shadow="never" class="summary-card summary-card-highlight">
          <div class="summary-title">最近预计签约</div>
          <div class="summary-value">{{ formatDateTime(nearestBusiness?.expectedSignDate) }}</div>
          <div class="summary-sub">{{ nearestBusiness?.businessName || '暂无商机摘要' }}</div>
        </ElCard>
      </div>

      <ElCard shadow="never" class="list-card">
        <template #header>
          <div class="card-header-row">
            <span>商机列表</span>
            <ElTag type="info" effect="plain">客户维度查看</ElTag>
          </div>
        </template>

        <ElTable v-loading="loading" :data="tableData" stripe style="width: 100%">
          <ElTableColumn type="index" label="序号" width="60" />
          <ElTableColumn prop="businessCode" label="商机编号" min-width="140" />
          <ElTableColumn prop="businessName" label="商机名称" min-width="200">
            <template #default="{ row }">
              <ElButton type="primary" link @click="handleDetail(row)">{{ row.businessName }}</ElButton>
            </template>
          </ElTableColumn>
          <ElTableColumn label="商机阶段" min-width="120">
            <template #default="{ row }">{{ formatBusinessStage(row.businessStage) }}</template>
          </ElTableColumn>
          <ElTableColumn label="商机状态" min-width="120">
            <template #default="{ row }">{{ formatBusinessStatus(row.businessStatus) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="ownerUserName" label="负责人" min-width="120" />
          <ElTableColumn prop="expectedSignDate" label="预计签约时间" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.expectedSignDate) }}</template>
          </ElTableColumn>
          <ElTableColumn prop="lastFollowContent" label="最近跟进摘要" min-width="220" show-overflow-tooltip />
          <ElTableColumn label="操作" fixed="right" width="200">
            <template #default="{ row }">
              <TableAction
                :actions="[
                  {
                    label: '编辑',
                    type: 'primary',
                    link: true,
                    icon: ACTION_ICON.EDIT,
                    disabled: !canEditBusiness(row.businessStatus),
                    onClick: () => handleEdit(row),
                  },
                  {
                    label: '删除',
                    type: 'danger',
                    link: true,
                    icon: ACTION_ICON.DELETE,
                    disabled: !canDeleteBusiness(row.businessStatus),
                    popConfirm: {
                      title: `确认删除商机【${row.businessName}】吗？`,
                      confirm: () => handleDelete(row),
                    },
                  },
                  {
                    label: '查看详情',
                    type: 'default',
                    link: true,
                    icon: ACTION_ICON.PREVIEW,
                    onClick: () => handleDetail(row),
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
      width="55%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 75vh; overflow-y: auto">
        <BusinessForm
          :business-data="currentBusiness"
          :customer-id="customerId"
          @close="dialogVisible = false"
          @save-success="() => { dialogVisible = false; loadTableData(); }"
        />
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.business-panel {
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
.summary-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card,
.list-card {
  border-radius: 14px;
}

.summary-card-highlight {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.summary-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .panel-header,
  .card-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
