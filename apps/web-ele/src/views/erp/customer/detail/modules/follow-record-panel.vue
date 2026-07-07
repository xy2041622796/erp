<script setup lang="ts">
import type { CrmCustomerFollowRecordApi } from '#/api/erp/customer/follow-record';

import { useUserStore } from '@vben/stores';
import { computed, ref, watch } from 'vue';


import {
  deleteFollowRecord,
  getFollowRecord,
  getSubjectFollowTimelinePage,
} from '#/api/erp/customer/follow-record';
import FollowRecordForm from './follow-record-form.vue';

import {
  ElButton,
  ElDialog,
  ElEmpty,
  ElLoading,
  ElMessage,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

const props = defineProps<{
  bizType: 'CUSTOMER' | 'LEAD';
  bizId?: number | string;
  bizCode?: string;
  bizName?: string;
  customerId?: number | string;
  customerCode?: string;
  leadId?: number | string;
  ownerUserId?: number | string;
  allowCreate?: boolean;
  readonlyLeadHistory?: boolean;
  readonlyAllHistory?: boolean;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const userStore = useUserStore();
const loading = ref(false);
const tableData = ref<CrmCustomerFollowRecordApi.FollowRecord[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const currentFollowRecord = ref<CrmCustomerFollowRecordApi.FollowRecord | null>(null);
const pageNo = ref(1);
const page = ref(20);
const total = ref(0);

const ready = computed(() => !!String(props.bizId || '').trim());
const currentUserInfo = computed(() => {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    userId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    userName: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
});

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function canEditRow(row: CrmCustomerFollowRecordApi.FollowRecord) {
  if (props.readonlyAllHistory) return false;
  if (props.readonlyLeadHistory && String(row.bizType || '') === 'LEAD') return false;
  const currentUserId = currentUserInfo.value.userId;
  const currentUserName = currentUserInfo.value.userName;
  if (String(props.ownerUserId || '').trim() && String(props.ownerUserId || '') === currentUserId)
    return true;
  if (String(row.operatorUserId || '') === currentUserId) return true;
  if (String(row.createuser || '') === currentUserName) return true;
  return false;
}

async function loadTableData(reset = false) {
  if (!ready.value) {
    tableData.value = [];
    total.value = 0;
    return;
  }
  if (reset) pageNo.value = 1;
  loading.value = true;
  try {
    const response = await getSubjectFollowTimelinePage({
      leadId: props.leadId || (props.bizType === 'LEAD' ? props.bizId : undefined),
      customerId:
        props.customerId || (props.bizType === 'CUSTOMER' ? props.bizId : undefined),
      customerCode: props.customerCode,
      pageNo: pageNo.value,
      page: page.value,
    });
    tableData.value = response?.list || [];
    total.value = Number(response?.total || 0);
    emit('updated');
  } catch (error) {
    console.error('加载跟进记录失败:', error);
    ElMessage.error('加载跟进记录失败');
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  if (!props.allowCreate || props.readonlyAllHistory || !ready.value) return;
  currentFollowRecord.value = null;
  dialogTitle.value = '新增跟进记录';
  dialogVisible.value = true;
}

async function handleEdit(row: CrmCustomerFollowRecordApi.FollowRecord) {
  if (!canEditRow(row)) return ElMessage.warning('当前记录不可编辑');
  const loadingInstance = ElLoading.service({ text: '加载跟进记录详情中...' });
  try {
    currentFollowRecord.value = row.id ? await getFollowRecord(row.id) : { ...row };
    dialogTitle.value = '编辑跟进记录';
    dialogVisible.value = true;
  } catch (error) {
    console.error('加载跟进记录详情失败:', error);
    ElMessage.error('加载跟进记录详情失败');
  } finally {
    loadingInstance.close();
  }
}

async function handleDelete(row: CrmCustomerFollowRecordApi.FollowRecord) {
  if (!canEditRow(row)) return ElMessage.warning('当前记录不可删除');
  try {
    await deleteFollowRecord(row.id as any);
    ElMessage.success('删除跟进记录成功');
    await loadTableData(true);
  } catch (error) {
    console.error('删除跟进记录失败:', error);
    ElMessage.error('删除跟进记录失败');
  }
}

function handleLoadMore() {
  page.value += 20;
  loadTableData();
}

watch(
  () => [props.bizType, props.bizId, props.customerId, props.customerCode, props.leadId],
  () => {
    loadTableData(true);
  },
  { immediate: true },
);

defineExpose({ reload: () => loadTableData(true), openCreate });
</script>

<template>
  <div class="follow-panel">
    <div class="panel-header">
      <div>
        <div class="panel-title">跟进记录</div>
        <div class="panel-desc">按跟进时间倒序展示跟进时间线。</div>
      </div>
      <ElButton
        v-if="allowCreate"
        type="primary"
        :disabled="!ready || readonlyAllHistory"
        @click="openCreate"
      >
        新增跟进记录
      </ElButton>
    </div>

    <ElEmpty v-if="!ready" description="缺少业务ID，暂无法维护跟进记录" />

    <div v-else v-loading="loading" class="timeline-card">
      <ElEmpty v-if="tableData.length === 0" description="暂无跟进记录" :image-size="90" />
      <template v-else>
        <ElTimeline>
          <ElTimelineItem
            v-for="row in tableData"
            :key="String(row.id || row.rowid || row.followTime)"
            :timestamp="formatDateTime(row.followTime)"
            placement="top"
          >
            <div class="timeline-entry">
              <div class="timeline-entry-head">
                <div class="timeline-entry-title">
                  <span>{{ row.operatorUserName || '未填写跟进人' }}</span>
                </div>
                <div v-if="canEditRow(row)" class="timeline-entry-actions">
                  <ElButton text type="primary" @click="handleEdit(row)">编辑</ElButton>
                  <ElButton text type="danger" @click="handleDelete(row)">删除</ElButton>
                </div>
              </div>
              <div class="timeline-content">{{ row.followContent || '-' }}</div>
              <div class="timeline-plan-row">
                <span>下次跟进：{{ formatDateTime(row.nextFollowTime) }}</span>
                <span>{{ row.nextFollowContent || '未填写下次计划' }}</span>
              </div>
              <div v-if="row.remark" class="timeline-remark">备注：{{ row.remark }}</div>
            </div>
          </ElTimelineItem>
        </ElTimeline>
        <div v-if="total > tableData.length" class="load-more-wrap">
          <ElButton text type="primary" @click="handleLoadMore">加载更多</ElButton>
        </div>
      </template>
    </div>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="50%"
      top="5vh"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <div style="max-height: 70vh; overflow-y: auto">
        <FollowRecordForm
          :key="String(currentFollowRecord?.id || currentFollowRecord?.rowid || 'create')"
          :biz-type="String(currentFollowRecord?.bizType || bizType) as any"
          :biz-id="currentFollowRecord?.bizId || bizId"
          :biz-code="currentFollowRecord?.bizCode || bizCode"
          :biz-name="currentFollowRecord?.bizName || bizName"
          :customer-id="currentFollowRecord?.customerId || customerId"
          :customer-code="currentFollowRecord?.customerCode || customerCode"
          :follow-record-data="currentFollowRecord"
          @close="dialogVisible = false"
          @save-success="() => { dialogVisible = false; loadTableData(true); }"
        />
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.follow-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-header,
.timeline-entry-head {
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
.timeline-plan-row,
.timeline-remark {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.timeline-card,
.timeline-entry {
  border-radius: 14px;
}

.timeline-entry {
  padding: 14px;
  background: var(--el-fill-color-light);
}

.timeline-entry-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.timeline-entry-actions {
  flex-shrink: 0;
}

.timeline-content {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
}

.timeline-plan-row,
.timeline-remark {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

@media (max-width: 900px) {
  .panel-header,
  .timeline-entry-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
