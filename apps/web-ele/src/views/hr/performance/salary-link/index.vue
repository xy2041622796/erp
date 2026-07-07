<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAvatar,
  ElButton,
  ElCard,
  ElCol,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';


/** siweiOA 调薪联动静态业务页迁移 */
defineOptions({ name: 'HrPerformanceSalaryLinkPage' });

interface SalaryLinkRow {
  linkId: string;
  avatar: string;
  name: string;
  department: string;
  evalPeriod: string;
  grade: string;
  linkType: string;
  adjustDetail: string;
  effectiveDate: string;
  status: string;
}

const rows = ref<SalaryLinkRow[]>([
  { linkId: 'LNK-2024-001', avatar: '张', name: '张三', department: '技术部', evalPeriod: '2023Q4', grade: 'A', linkType: '调薪', adjustDetail: '薪资上调10%', effectiveDate: '2024-02-01', status: '已生效' },
  { linkId: 'LNK-2024-002', avatar: '李', name: '李四', department: '产品部', evalPeriod: '2023Q4', grade: 'B+', linkType: '晋升', adjustDetail: '晋升为高级产品经理', effectiveDate: '2024-02-01', status: '已生效' },
  { linkId: 'LNK-2024-003', avatar: '王', name: '王五', department: '设计部', evalPeriod: '2023Q4', grade: 'B', linkType: '培训', adjustDetail: '安排技能提升培训', effectiveDate: '2024-02-15', status: '待执行' },
  { linkId: 'LNK-2024-004', avatar: '赵', name: '赵六', department: '市场部', evalPeriod: '2023Q4', grade: 'A+', linkType: '调薪+晋升', adjustDetail: '薪资上调15%，晋升经理', effectiveDate: '2024-02-01', status: '已生效' },
]);

const dialogOpen = ref(false);
const viewOpen = ref(false);
const editing = ref<SalaryLinkRow | null>(null);
const viewing = ref<SalaryLinkRow | null>(null);

const form = reactive<SalaryLinkRow>({
  linkId: '',
  avatar: '',
  name: '',
  department: '',
  evalPeriod: '',
  grade: '',
  linkType: '调薪',
  adjustDetail: '',
  effectiveDate: '',
  status: '待执行',
});

const salaryCount = computed(() => rows.value.filter((row) => row.linkType.includes('调薪')).length);
const promotionCount = computed(() => rows.value.filter((row) => row.linkType.includes('晋升')).length);
const trainingCount = computed(() => rows.value.filter((row) => row.linkType.includes('培训')).length);

function formatDisplayDate(value?: null | string) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function statusTagType(status: string) {
  if (status === '已生效') return 'success';
  if (status === '待执行') return 'warning';
  return 'info';
}

function linkTypeTagType(type: string) {
  if (type.includes('调薪')) return 'success';
  if (type.includes('晋升')) return 'primary';
  if (type.includes('培训')) return 'warning';
  return 'info';
}

function resetForm() {
  form.linkId = '';
  form.avatar = '';
  form.name = '';
  form.department = '';
  form.evalPeriod = '';
  form.grade = '';
  form.linkType = '调薪';
  form.adjustDetail = '';
  form.effectiveDate = '';
  form.status = '待执行';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: SalaryLinkRow) {
  editing.value = row;
  Object.assign(form, row);
  dialogOpen.value = true;
}

function openView(row: SalaryLinkRow) {
  viewing.value = row;
  viewOpen.value = true;
}

function submit() {
  if (!form.linkId.trim()) {
    ElMessage.warning('请输入联动编号');
    return;
  }
  if (!form.name.trim()) {
    ElMessage.warning('请输入姓名');
    return;
  }
  if (!form.department.trim()) {
    ElMessage.warning('请输入部门');
    return;
  }
  const payload = { ...form, avatar: form.avatar || form.name.slice(0, 1) };
  if (editing.value) Object.assign(editing.value, payload);
  else rows.value = [payload, ...rows.value];
  ElMessage.success('保存成功');
  dialogOpen.value = false;
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-performance-salary-link">
      <div class="page-header">
        <div>
          <h2>调薪联动</h2>
          <p>绩效结果关联调薪、晋升及培训需求，实现绩效结果有效应用。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增联动</el-button>
      </div>

      <div class="summary-grid">
        <el-card shadow="never">
          <div class="summary-number">{{ rows.length }}</div>
          <div class="summary-label">联动记录</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ salaryCount }}</div>
          <div class="summary-label">调薪</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ promotionCount }}</div>
          <div class="summary-label">晋升</div>
        </el-card>
        <el-card shadow="never">
          <div class="summary-number">{{ trainingCount }}</div>
          <div class="summary-label">培训</div>
        </el-card>
      </div>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">绩效联动列表</div>
        </template>
        <el-table :data="rows" row-key="linkId" border height="100%">
          <el-table-column prop="linkId" label="联动编号" min-width="150" show-overflow-tooltip />
          <el-table-column label="员工" width="80">
            <template #default="{ row = {}} = {}">
              <el-avatar :size="30">{{ row.avatar }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="evalPeriod" label="考核周期" width="120" />
          <el-table-column prop="grade" label="绩效等级" width="110" />
          <el-table-column label="联动类型" width="120">
            <template #default="{ row = {}} = {}">
              <el-tag :type="linkTypeTagType(row.linkType)" effect="plain">{{ row.linkType }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="adjustDetail" label="调整详情" min-width="180" show-overflow-tooltip />
          <el-table-column label="生效日期" width="130" ><template #default="{ row = {}} = {}">{{ formatDisplayDate(row.effectiveDate) }}</template></el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag :type="statusTagType(row.status)" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openView(row)">查看</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑联动记录' : '新增联动记录'" width="760px" destroy-on-close>
        <el-form :model="form" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="联动编号" required>
                <el-input v-model="form.linkId" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="姓名" required>
                <el-input v-model="form.name" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="部门" required>
                <el-input v-model="form.department" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考核周期">
                <el-input v-model="form.evalPeriod" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="绩效等级">
                <el-input v-model="form.grade" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联动类型">
                <el-select v-model="form.linkType" style="width: 100%">
                  <el-option label="调薪" value="调薪" />
                  <el-option label="晋升" value="晋升" />
                  <el-option label="培训" value="培训" />
                  <el-option label="调薪+晋升" value="调薪+晋升" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="生效日期">
                <el-input v-model="form.effectiveDate" placeholder="如 2024-02-01" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="待执行" value="待执行" />
                  <el-option label="已生效" value="已生效" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="调整详情">
                <el-input v-model="form.adjustDetail" :rows="3" type="textarea" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="dialogOpen = false">取消</el-button>
          <el-button type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="viewOpen" title="联动详情" width="640px">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="联动编号">{{ viewing?.linkId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ viewing?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ viewing?.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="考核周期">{{ viewing?.evalPeriod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="绩效等级">{{ viewing?.grade || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联动类型">{{ viewing?.linkType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="调整详情">{{ viewing?.adjustDetail || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生效日期">{{ formatDisplayDate(viewing?.effectiveDate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ viewing?.status || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-performance-salary-link {
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
