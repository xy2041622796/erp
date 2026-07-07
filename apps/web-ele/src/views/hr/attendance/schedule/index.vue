<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { EditPen, Moon, Sunrise, Sunny } from '@element-plus/icons-vue';

import {
  createHoliday,
  createScheduleRule,
  deleteHoliday,
  deleteScheduleRule,
  listBaseDepartInfo,
  listBaseJobInfo,
  listHolidays,
  listScheduleRules,
  updateScheduleRule,
} from '#/api/erp/human-resources/attendance';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimePicker,
} from 'element-plus';

/** siweiOA 排班规则真实迁移页 */
defineOptions({ name: 'HrAttendanceSchedulePage' });

const loading = ref(false);
const saving = ref(false);
const holidaySaving = ref(false);
const ruleDialogOpen = ref(false);
const holidayDialogOpen = ref(false);
const editing = ref<HrAttendanceApi.ScheduleRule | null>(null);
const rules = ref<HrAttendanceApi.ScheduleRule[]>([]);
const holidays = ref<HrAttendanceApi.Holiday[]>([]);
const departments = ref<any[]>([]);
const jobs = ref<any[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  ruleName: '',
  ruleType: '固定排班',
  workStart: '09:00',
  workEnd: '18:00',
  breakStart: '12:00',
  breakEnd: '13:00',
  departments: [] as string[],
  jobs: [] as string[],
  flexMinutes: 0,
  status: '启用',
  remark: '',
  weekDays: ['1', '2', '3', '4', '5'],
});

const holidayForm = reactive({
  name: '',
  startDate: '',
  endDate: '',
});

function getDeptName(depId: string) {
  const hit = departments.value.find((item) => String(item.DepID || '') === String(depId));
  return String(hit?.DepName || depId);
}

function getJobName(jobId: string) {
  const hit = jobs.value.find((item) => String(item.rowid || item.ROWID || '') === String(jobId));
  return String(hit?.JobName || jobId);
}

const weekDayOptions = [
  { label: '一', value: '1' },
  { label: '二', value: '2' },
  { label: '三', value: '3' },
  { label: '四', value: '4' },
  { label: '五', value: '5' },
  { label: '六', value: '6' },
  { label: '日', value: '0' },
];

const shiftTemplates = [
  { name: '标准班', icon: Sunny, start: '09:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00', color: '#67c23a' },
  { name: '早班', icon: Sunrise, start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00', color: '#409eff' },
  { name: '晚班', icon: Moon, start: '13:00', end: '22:00', breakStart: '17:00', breakEnd: '18:00', color: '#9254de' },
  { name: '自定义', icon: EditPen, start: '', end: '', breakStart: '', breakEnd: '', color: '#909399' },
];

function applyShiftTemplate(template: typeof shiftTemplates[number]) {
  form.workStart = template.start || '';
  form.workEnd = template.end || '';
  form.breakStart = template.breakStart || '';
  form.breakEnd = template.breakEnd || '';
}

function toggleWeekDay(value: string) {
  const idx = form.weekDays.indexOf(value);
  if (idx >= 0) form.weekDays.splice(idx, 1);
  else form.weekDays.push(value);
}

function resetRuleForm() {
  form.ruleName = '';
  form.ruleType = '固定排班';
  form.workStart = '09:00';
  form.workEnd = '18:00';
  form.breakStart = '12:00';
  form.breakEnd = '13:00';
  form.departments = [];
  form.jobs = [];
  form.flexMinutes = 0;
  form.status = '启用';
  form.remark = '';
  form.weekDays = ['1', '2', '3', '4', '5'];
}

function resetHolidayForm() {
  holidayForm.name = '';
  holidayForm.startDate = '';
  holidayForm.endDate = '';
}

async function loadDepartments() {
  const res = await listBaseDepartInfo();
  departments.value = Array.isArray(res?.data) ? res.data : [];
}

async function loadJobs() {
  const res = await listBaseJobInfo();
  jobs.value = Array.isArray(res?.data) ? res.data : [];
}

async function load() {
  loading.value = true;
  try {
    const [ruleData, holidayData] = await Promise.all([
      listScheduleRules({ q: queryForm.q.trim() || undefined, status: queryForm.status === '启用' ? '有效' : queryForm.status }),
      listHolidays(),
      loadDepartments(),
      loadJobs(),
    ]);
    rules.value = Array.isArray(ruleData) ? ruleData : [];
    holidays.value = Array.isArray(holidayData) ? holidayData : [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  resetRuleForm();
  ruleDialogOpen.value = true;
}

function parseRuleDescription(row: HrAttendanceApi.ScheduleRule) {
  try {
    const raw = (row as any)?.description;
    if (raw && typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function openEdit(row: HrAttendanceApi.ScheduleRule) {
  editing.value = row;
  form.ruleName = row.rule_name || '';
  form.ruleType = row.rule_type || '固定排班';
  form.flexMinutes = Number(row.flex_minutes || 0);
  form.status = row.status === '有效' ? '启用' : (row.status || '启用');
  form.remark = row.remark || '';
  form.departments = (row.departments || []).map((item) => String(item.depId));
  const saved = parseRuleDescription(row);
  form.jobs = saved?.jobs || [];
  form.weekDays = saved?.weekDays || ['1', '2', '3', '4', '5'];
  form.workStart = row.segments?.[0]?.start_time || '09:00';
  form.breakStart = row.segments?.[0]?.end_time || '12:00';
  form.breakEnd = row.segments?.[1]?.start_time || '13:00';
  form.workEnd = row.segments?.[1]?.end_time || '18:00';
  ruleDialogOpen.value = true;
}

async function submitRule() {
  if (!form.ruleName.trim()) {
    ElMessage.warning('请输入规则名称');
    return;
  }
  if (!form.workStart || !form.workEnd) {
    ElMessage.warning('请选择上班时间和下班时间');
    return;
  }

  const payload: HrAttendanceApi.ScheduleRulePayload = {
    rule_code: (editing.value?.rule_code) || null,
    rule_name: form.ruleName,
    rule_type: form.ruleType,
    flex_minutes: Number(form.flexMinutes || 0),
    status: form.status === '启用' ? '有效' : form.status,
    remark: form.remark || null,
    departments: form.departments || [],
    segments: [
      { segment_no: 1, segment_type: 'work', start_time: form.workStart, end_time: form.breakStart },
      { segment_no: 2, segment_type: 'work', start_time: form.breakEnd, end_time: form.workEnd },
    ],
  };
  (payload as any).jobs = form.jobs || [];
  (payload as any).weekDays = form.weekDays || [];

  saving.value = true;
  try {
    if (editing.value?.id) await updateScheduleRule(editing.value.id, payload);
    else await createScheduleRule(payload);
    ElMessage.success('保存成功');
    ruleDialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDeleteRule(row: HrAttendanceApi.ScheduleRule) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除排班规则「${row.rule_name || row.rule_code || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteScheduleRule(row.id);
  ElMessage.success('删除成功');
  await load();
}

function openHolidayCreate() {
  resetHolidayForm();
  holidayDialogOpen.value = true;
}

function calcHolidayDays() {
  if (!holidayForm.startDate || !holidayForm.endDate) return 1;
  const start = new Date(holidayForm.startDate);
  const end = new Date(holidayForm.endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days > 0 ? days : 1;
}

async function submitHoliday() {
  if (!holidayForm.name.trim()) {
    ElMessage.warning('请输入节假日名称');
    return;
  }
  if (!holidayForm.startDate || !holidayForm.endDate) {
    ElMessage.warning('请选择节假日起止日期');
    return;
  }

  holidaySaving.value = true;
  try {
    await createHoliday({
      name: holidayForm.name,
      startDate: holidayForm.startDate,
      endDate: holidayForm.endDate,
      days: calcHolidayDays(),
      isDefault: 0,
    });
    ElMessage.success('保存成功');
    holidayDialogOpen.value = false;
    await load();
  } finally {
    holidaySaving.value = false;
  }
}

async function handleDeleteHoliday(row: HrAttendanceApi.Holiday) {
  if (!row.id || Number(row.isDefault || 0) === 1) return;
  try {
    await ElMessageBox.confirm(`确认删除节假日「${row.name || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteHoliday(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-attendance-schedule">
      <div class="page-header">
        <div>
          <h2>排班规则</h2>
          <p>维护排班规则、适用部门、班次时段和节假日。</p>
        </div>
        <div class="header-actions">
          <el-button @click="openHolidayCreate">新增节假日</el-button>
          <el-button type="primary" @click="openCreate">新增规则</el-button>
        </div>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="queryForm.q"
              clearable
              placeholder="规则编号 / 规则名称"
              style="width: 260px"
              @keyup.enter="load"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="启用" value="启用" />
              <el-option label="停用" value="停用" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button
              @click="
                queryForm.q = '';
                queryForm.status = 'all';
                load();
              "
            >
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">规则列表</div>
        </template>
        <el-table v-loading="loading" :data="rules" row-key="id" border>
          <el-table-column prop="rule_code" label="规则编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="rule_name" label="规则名称" min-width="150" show-overflow-tooltip />
          <el-table-column prop="rule_type" label="类型" width="120" />
          <el-table-column prop="flex_minutes" label="弹性分钟" width="100" />
          <el-table-column label="适用部门" min-width="220" show-overflow-tooltip>
            <template #default="{ row = {} } = {}">
              <span v-if="row.departments?.length">{{ row.departments.map((item: any) => item.depName).join('、') }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间段" min-width="220" show-overflow-tooltip>
            <template #default="{ row = {} } = {}">
              <span v-if="row.segments?.length">
                {{ row.segments.map((item: any) => `${item.start_time}-${item.end_time}`).join(' / ') }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row = {} } = {}">
              <el-tag effect="plain">{{ row.status === '有效' ? '启用' : (row.status || '-') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {} } = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteRule(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-title">节假日</div>
        </template>
        <el-table :data="holidays" row-key="id" border>
          <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="startDate" label="开始日期" width="140" />
          <el-table-column prop="endDate" label="结束日期" width="140" />
          <el-table-column prop="days" label="天数" width="100" />
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row = {} } = {}">
              <el-button v-if="Number(row.isDefault || 0) !== 1" link type="danger" @click="handleDeleteHoliday(row)">删除</el-button>
              <span v-else class="muted">默认</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="ruleDialogOpen" :title="editing ? '编辑排班规则' : '新增排班规则'" width="860px" destroy-on-close>
        <el-form :model="form" label-width="120px" label-position="left">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="规则名称" required>
                <el-input v-model="form.ruleName" placeholder="请输入规则名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规则类型" required>
                <el-select v-model="form.ruleType" placeholder="请选择规则类型" style="width: 100%">
                  <el-option label="固定排班" value="固定排班" />
                  <el-option label="弹性工时" value="弹性工时" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="上班时间" required>
                <el-time-picker v-model="form.workStart" format="HH:mm" value-format="HH:mm" placeholder="选择时间" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="下班时间" required>
                <el-time-picker v-model="form.workEnd" format="HH:mm" value-format="HH:mm" placeholder="选择时间" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="午休时间">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-time-picker v-model="form.breakStart" format="HH:mm" value-format="HH:mm" placeholder="开始" style="width: 100%" />
                  <span>-</span>
                  <el-time-picker v-model="form.breakEnd" format="HH:mm" value-format="HH:mm" placeholder="结束" style="width: 100%" />
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用部门">
                <el-select v-model="form.departments" multiple filterable placeholder="请选择部门" style="width: 100%">
                  <el-option
                    v-for="item in departments"
                    :key="String(item.DepID)"
                    :label="getDeptName(String(item.DepID))"
                    :value="String(item.DepID)"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="适用岗位">
                <el-select v-model="form.jobs" multiple filterable placeholder="请选择岗位" style="width: 100%">
                  <el-option
                    v-for="item in jobs"
                    :key="String(item.rowid || item.ROWID)"
                    :label="getJobName(String(item.rowid || item.ROWID))"
                    :value="String(item.rowid || item.ROWID)"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="弹性分钟">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-input-number v-model="form.flexMinutes" :min="0" style="width: 100%" controls-position="right" />
                  <span style="white-space: nowrap; color: var(--el-text-color-secondary);">分钟</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" required>
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="启用" value="启用" />
                  <el-option label="停用" value="停用" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="周设置">
                <div class="week-days">
                  <el-button
                    v-for="day in weekDayOptions"
                    :key="day.value"
                    :type="form.weekDays.includes(day.value) ? 'primary' : 'default'"
                    class="week-day-btn"
                    @click="toggleWeekDay(day.value)"
                  >
                    {{ day.label }}
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <div style="margin-top: 8px;">
            <div class="section-title">
              <span>班次模板</span>
              <span class="label-tip">（可快速应用模板配置）</span>
            </div>
            <div class="shift-templates">
              <div
                v-for="template in shiftTemplates"
                :key="template.name"
                class="shift-card"
                @click="applyShiftTemplate(template)"
              >
                <div class="shift-card-header">
                  <div class="shift-icon" :style="{ color: template.color }">
                    <el-icon><component :is="template.icon" /></el-icon>
                  </div>
                  <div class="shift-card-info">
                    <div class="shift-name">{{ template.name }}</div>
                    <div class="shift-time">
                      {{ template.start || '--:--' }} - {{ template.end || '--:--' }}
                    </div>
                  </div>
                </div>
                <el-button size="small" plain style="width: 100%" @click.stop="applyShiftTemplate(template)">应用</el-button>
              </div>
            </div>
          </div>
        </el-form>
        <template #footer>
          <el-button @click="ruleDialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submitRule">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="holidayDialogOpen" title="新增节假日" width="520px" destroy-on-close>
        <el-form :model="holidayForm" label-width="100px">
          <el-form-item label="名称" required>
            <el-input v-model="holidayForm.name" />
          </el-form-item>
          <el-form-item label="开始日期" required>
            <el-date-picker v-model="holidayForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期" required>
            <el-date-picker v-model="holidayForm.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="holidayDialogOpen = false">取消</el-button>
          <el-button :loading="holidaySaving" type="primary" @click="submitHoliday">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-attendance-schedule {
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

.header-actions {
  display: flex;
  gap: 8px;
}

.card-title {
  font-weight: 600;
}

.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}

.muted {
  color: var(--el-text-color-secondary);
}

.week-days {
  display: flex;
  gap: 4px;
}

.week-day-btn {
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  font-size: 12px;
  line-height: 22px;
}

.shift-templates {
  display: flex;
  gap: 16px;
  width: 100%;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.label-tip {
  margin-left: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: normal;
}

.shift-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 28px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 0;
}

.shift-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.shift-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shift-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.shift-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.shift-time {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}
</style>
