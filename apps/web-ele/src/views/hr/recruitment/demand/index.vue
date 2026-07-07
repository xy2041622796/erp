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


defineOptions({ name: 'HrRecruitmentDemandPage' });

interface DemandRow {
  demandId: string;
  department: string;
  position: string;
  headcount: number;
  urgency: string;
  applicant: string;
  applyDate: string;
  status: string;
}

const rows = ref<DemandRow[]>([
  { demandId: 'REQ-2024-001', department: '技术部', position: '前端工程师', headcount: 2, urgency: '紧急', applicant: '张经理', applyDate: '2024-01-15', status: '待审批' },
  { demandId: 'REQ-2024-002', department: '产品部', position: '产品经理', headcount: 1, urgency: '一般', applicant: '李总监', applyDate: '2024-01-12', status: '已通过' },
  { demandId: 'REQ-2024-003', department: '设计部', position: 'UI设计师', headcount: 1, urgency: '紧急', applicant: '王主管', applyDate: '2024-01-10', status: '审批中' },
  { demandId: 'REQ-2024-004', department: '市场部', position: '市场专员', headcount: 3, urgency: '一般', applicant: '赵经理', applyDate: '2024-01-08', status: '已驳回' },
]);

const viewOpen = ref(false);
const viewing = ref<DemandRow | null>(null);

const pendingCount = computed(() => rows.value.filter((row) => row.status === '待审批' || row.status === '审批中').length);
const passedCount = computed(() => rows.value.filter((row) => row.status === '已通过').length);
const rejectedCount = computed(() => rows.value.filter((row) => row.status === '已驳回').length);

function formatDisplayDate(value?: null | string) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function statusType(status: string) {
  if (status === '已通过') return 'success';
  if (status === '已驳回') return 'danger';
  if (status === '审批中') return 'warning';
  return 'info';
}

function urgencyType(urgency: string) {
  return urgency === '紧急' ? 'danger' : 'info';
}

function openView(row: DemandRow) {
  viewing.value = row;
  viewOpen.value = true;
}

function approve(row: DemandRow) {
  row.status = '已通过';
  ElMessage.success('需求已通过');
}

function reject(row: DemandRow) {
  row.status = '已驳回';
  ElMessage.warning('需求已驳回');
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-recruitment-demand">
      <div class="page-header">
        <div>
          <h2>需求审批</h2>
          <p>用人部门提交招聘需求，经 HR 及领导审批后建档，规范招聘流程。</p>
        </div>
      </div>

      <div class="summary-grid">
        <el-card shadow="never"><div class="summary-number">45</div><div class="summary-label">需求总数</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ pendingCount }}</div><div class="summary-label">待审批</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ passedCount }}</div><div class="summary-label">已通过</div></el-card>
        <el-card shadow="never"><div class="summary-number">{{ rejectedCount }}</div><div class="summary-label">已驳回</div></el-card>
      </div>

      <el-card shadow="never">
        <template #header><div class="card-title">招聘需求列表</div></template>
        <el-table :data="rows" row-key="demandId" border height="100%">
          <el-table-column prop="demandId" label="需求编号" min-width="140" show-overflow-tooltip />
          <el-table-column prop="department" label="用人部门" width="120" />
          <el-table-column prop="position" label="招聘职位" min-width="140" show-overflow-tooltip />
          <el-table-column prop="headcount" label="招聘人数" width="100" />
          <el-table-column label="紧急程度" width="110">
            <template #default="{ row = {}} = {}"><el-tag :type="urgencyType(row.urgency)" effect="plain">{{ row.urgency }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="applicant" label="申请人" width="110" />
          <el-table-column label="申请日期" width="130" ><template #default="{ row = {}} = {}">{{ formatDisplayDate(row.applyDate) }}</template></el-table-column>
          <el-table-column label="审批状态" width="110">
            <template #default="{ row = {}} = {}"><el-tag :type="statusType(row.status)" effect="plain">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="success" :disabled="row.status === '已通过'" @click="approve(row)">通过</el-button>
              <el-button link type="warning" :disabled="row.status === '已驳回'" @click="reject(row)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="viewOpen" title="招聘需求详情" width="640px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="需求编号">{{ viewing?.demandId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用人部门">{{ viewing?.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="招聘职位">{{ viewing?.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="招聘人数">{{ viewing?.headcount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="紧急程度">{{ viewing?.urgency || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ viewing?.applicant || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请日期">{{ formatDisplayDate(viewing?.applyDate) }}</el-descriptions-item>
          <el-descriptions-item label="审批状态">{{ viewing?.status || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-recruitment-demand { display: flex; min-height: 100%; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.page-header p { margin: 6px 0 0; color: var(--el-text-color-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-number { font-size: 24px; font-weight: 700; }
.summary-label { margin-top: 4px; color: var(--el-text-color-secondary); }
.card-title { font-weight: 600; }
</style>
