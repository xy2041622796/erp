<script lang="ts" setup>
import { computed, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAvatar,
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


/** siweiOA 结果归档静态业务页迁移 */
defineOptions({ name: 'HrPerformanceArchivePage' });

interface ArchiveRow {
  archiveId: string;
  avatar: string;
  name: string;
  department: string;
  evalPeriod: string;
  finalScore: string;
  grade: string;
  archiveDate: string;
  status: string;
}

const rows = ref<ArchiveRow[]>([
  { archiveId: 'ARC-2023-Q4-001', avatar: '张', name: '张三', department: '技术部', evalPeriod: '2023Q4', finalScore: '92.5', grade: 'A', archiveDate: '2024-01-10', status: '已归档' },
  { archiveId: 'ARC-2023-Q4-002', avatar: '李', name: '李四', department: '产品部', evalPeriod: '2023Q4', finalScore: '88.0', grade: 'B+', archiveDate: '2024-01-10', status: '已归档' },
  { archiveId: 'ARC-2023-Q4-003', avatar: '王', name: '王五', department: '设计部', evalPeriod: '2023Q4', finalScore: '78.5', grade: 'B', archiveDate: '2024-01-10', status: '已归档' },
  { archiveId: 'ARC-2023-Q4-004', avatar: '赵', name: '赵六', department: '市场部', evalPeriod: '2023Q4', finalScore: '95.0', grade: 'A+', archiveDate: '2024-01-10', status: '已归档' },
]);

const viewOpen = ref(false);
const viewing = ref<ArchiveRow | null>(null);

const gradeACount = computed(() => rows.value.filter((row) => row.grade.startsWith('A')).length);
const gradeBCount = computed(() => rows.value.filter((row) => row.grade.startsWith('B')).length);
const gradeCCount = computed(() => rows.value.filter((row) => row.grade.startsWith('C')).length);

function formatDisplayDate(value?: null | string) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function gradeTagType(grade: string) {
  if (grade.startsWith('A')) return 'success';
  if (grade.startsWith('B')) return 'primary';
  if (grade.startsWith('C')) return 'warning';
  return 'info';
}

function openView(row: ArchiveRow) {
  viewing.value = row;
  viewOpen.value = true;
}

function exportArchive() {
  ElMessage.info('归档导出功能待接入导出服务');
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-archive">
      <div class="page-header">
        <div>
          <h2>结果归档</h2>
          <p>将绩效考核结果自动归档存储，支持历史记录查询与分析。</p>
        </div>
        <el-button type="primary" @click="exportArchive">导出归档</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never">
          <div class="summary-number">624</div>
          <div class="summary-label">归档总数</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ gradeACount }}</div>
          <div class="summary-label">A级人数</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ gradeBCount }}</div>
          <div class="summary-label">B级人数</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ gradeCCount }}</div>
          <div class="summary-label">C级人数</div>
        </el-card>
      </div>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">绩效归档列表</div>
        </template>
        <el-table :data="rows" row-key="archiveId" border height="100%">
          <el-table-column prop="archiveId" label="归档编号" min-width="160" show-overflow-tooltip />
          <el-table-column label="员工" width="80">
            <template #default="{ row = {}} = {}">
              <el-avatar :size="30">{{ row.avatar }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="evalPeriod" label="考核周期" width="120" />
          <el-table-column prop="finalScore" label="最终得分" width="110" />
          <el-table-column label="绩效等级" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="gradeTagType(row.grade)" effect="plain">{{ row.grade }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="归档日期" width="130" ><template #default="{ row = {}} = {}">{{ formatDisplayDate(row.archiveDate) }}</template></el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag type="success" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="90">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="viewOpen" title="归档详情" width="640px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="归档编号">{{ viewing?.archiveId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ viewing?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ viewing?.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核周期">{{ viewing?.evalPeriod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最终得分">{{ viewing?.finalScore || '-' }}</el-descriptions-item>
          <el-descriptions-item label="绩效等级">{{ viewing?.grade || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归档日期">{{ formatDisplayDate(viewing?.archiveDate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-archive {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-header p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-number {
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
}

.card-title {
  font-weight: 600;
}
</style>
