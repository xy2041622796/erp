<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';


defineOptions({ name: 'HrRecruitmentTimeoutPage' });

interface TimeoutRow {
  alertId: string;
  processType: string;
  relatedId: string;
  relatedName: string;
  currentStep: string;
  pendingDays: number;
  pendingHandler: string;
  alertLevel: string;
  status: string;
}

const rows = ref<TimeoutRow[]>([
  { alertId: 'ALT-2024-001', processType: '需求审批', relatedId: 'REQ-2024-005', relatedName: '技术部招聘需求', currentStep: 'HR审批', pendingDays: 5, pendingHandler: '王HR', alertLevel: '严重', status: '待处理' },
  { alertId: 'ALT-2024-002', processType: 'Offer审批', relatedId: 'OFF-2024-005', relatedName: '候选人李明', currentStep: '领导审批', pendingDays: 3, pendingHandler: '张总', alertLevel: '一般', status: '待处理' },
  { alertId: 'ALT-2024-003', processType: '职位发布', relatedId: 'JOB-2024-005', relatedName: '后端工程师', currentStep: 'HR确认', pendingDays: 2, pendingHandler: '李HR', alertLevel: '提示', status: '待处理' },
  { alertId: 'ALT-2024-004', processType: '需求审批', relatedId: 'REQ-2024-003', relatedName: '设计部招聘需求', currentStep: '总监审批', pendingDays: 7, pendingHandler: '赵总监', alertLevel: '严重', status: '已提醒' },
]);

const viewOpen = ref(false);
const viewing = ref<TimeoutRow | null>(null);

const seriousCount = computed(() => rows.value.filter((row) => row.alertLevel === '严重').length);
const normalCount = computed(() => rows.value.filter((row) => row.alertLevel === '一般').length);
const tipCount = computed(() => rows.value.filter((row) => row.alertLevel === '提示').length);

function levelType(level: string) {
  if (level === '严重') return 'danger';
  if (level === '一般') return 'warning';
  return 'info';
}

function openView(row: TimeoutRow) {
  viewing.value = row;
  viewOpen.value = true;
}

function remind(row: TimeoutRow) {
  row.status = '已提醒';
  ElMessage.success('已发送提醒');
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-recruitment-timeout">
      <div class="page-header">
        <div>
          <h2>超时提醒</h2>
          <p>对招聘流程各环节超时情况自动预警，提升流程效率。</p>
        </div>
      </div>

      <div class="summary-grid">
        <el-card shadow="never"><div class="summary-number">{{ rows.length }}</div><div class="summary-label">预警总数</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ seriousCount }}</div><div class="summary-label">严重预警</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ normalCount }}</div><div class="summary-label">一般预警</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ tipCount }}</div><div class="summary-label">提示预警</div></el-card>
      </div>

      <el-card shadow="never">
        <template #header><div class="card-title">超时预警列表</div></template>
        <el-table :data="rows" row-key="alertId" border height="100%">
          <el-table-column prop="alertId" label="预警编号" min-width="140" show-overflow-tooltip />
          <el-table-column prop="processType" label="流程类型" width="120" />
          <el-table-column prop="relatedId" label="关联单号" min-width="140" show-overflow-tooltip />
          <el-table-column prop="relatedName" label="关联事项" min-width="160" show-overflow-tooltip />
          <el-table-column prop="currentStep" label="当前环节" width="120" />
          <el-table-column prop="pendingDays" label="滞留天数" width="100" />
          <el-table-column prop="pendingHandler" label="待处理人" width="110" />
          <el-table-column label="预警级别" width="110">
            <template #default="{ row = {}} = {}"><el-tag :type="levelType(row.alertLevel)" effect="plain">{{ row.alertLevel }}</el-tag></template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}"><el-tag :type="row.status === '已提醒' ? 'success' : 'warning'" effect="plain">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="warning" :disabled="row.status === '已提醒'" @click="remind(row)">提醒</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="viewOpen" title="预警详情" width="640px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="预警编号">{{ viewing?.alertId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="流程类型">{{ viewing?.processType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联单号">{{ viewing?.relatedId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联事项">{{ viewing?.relatedName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前环节">{{ viewing?.currentStep || '-' }}</el-descriptions-item>
          <el-descriptions-item label="滞留天数">{{ viewing?.pendingDays ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="待处理人">{{ viewing?.pendingHandler || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预警级别">{{ viewing?.alertLevel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-recruitment-timeout { display: flex; min-height: 100%; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: var(--el-text-color-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-number { font-size: 24px; font-weight: 700; }
.summary-label { margin-top: 4px; color: var(--el-text-color-secondary); }
.card-title { font-weight: 600; }
</style>
