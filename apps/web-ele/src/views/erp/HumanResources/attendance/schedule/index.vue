<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createHoliday,
  createScheduleRule,
  deleteHoliday,
  deleteScheduleRule,
  listBaseDepartInfo,
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

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  ruleCode: '',
  ruleName: '',
  ruleType: '固定班次',
  flexMinutes: 0,
  status: '有效',
  remark: '',
  departments: [] as string[],
  seg1Start: '09:00',
  seg1End: '12:00',
  seg2Start: '13:30',
  seg2End: '18:00',
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

function resetRuleForm() {
  form.ruleCode = '';
  form.ruleName = '';
  form.ruleType = '固定班次';
  form.flexMinutes = 0;
  form.status = '有效';
  form.remark = '';
  form.departments = [];
  form.seg1Start = '09:00';
  form.seg1End = '12:00';
  form.seg2Start = '13:30';
  form.seg2End = '18:00';
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

async function load() {
  loading.value = true;
  try {
    const [ruleData, holidayData] = await Promise.all([
      listScheduleRules({ q: queryForm.q.trim() || undefined, status: queryForm.status }),
      listHolidays(),
      loadDepartments(),
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

function openEdit(row: HrAttendanceApi.ScheduleRule) {
  editing.value = row;
  form.ruleCode = row.rule_code || '';
  form.ruleName = row.rule_name || '';
  form.ruleType = row.rule_type || '固定班次';
  form.flexMinutes = Number(row.flex_minutes || 0);
  form.status = row.status || '有效';
  form.remark = row.remark || '';
  form.departments = (row.departments || []).map((item) => String(item.depId));
  form.seg1Start = row.segments?.[0]?.start_time || '09:00';
  form.seg1End = row.segments?.[0]?.end_time || '12:00';
  form.seg2Start = row.segments?.[1]?.start_time || '13:30';
  form.seg2End = row.segments?.[1]?.end_time || '18:00';
  ruleDialogOpen.value = true;
}

async function submitRule() {
  if (!form.ruleName.trim()) {
    ElMessage.warning('请输入规则名称');
    return;
  }

  const payload: HrAttendanceApi.ScheduleRulePayload = {
    rule_code: form.ruleCode || null,
    rule_name: form.ruleName,
    rule_type: form.ruleType,
    flex_minutes: Number(form.flexMinutes || 0),
    status: form.status,
    remark: form.remark || null,
    departments: form.departments || [],
    segments: [
      { segment_no: 1, segment_type: 'work', start_time: form.seg1Start, end_time: form.seg1End },
      { segment_no: 2, segment_type: 'work', start_time: form.seg2Start, end_time: form.seg2End },
    ],
  };

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
              <el-option label="有效" value="有效" />
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
            <template #default="{ row = {}} = {}">
              <span v-if="row.departments?.length">{{ row.departments.map((item: any) => item.depName).join('、') }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间段" min-width="220" show-overflow-tooltip>
            <template #default="{ row = {}} = {}">
              <span v-if="row.segments?.length">
                {{ row.segments.map((item: any) => `${item.start_time}-${item.end_time}`).join(' / ') }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
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
            <template #default="{ row = {}} = {}">
              <el-button v-if="Number(row.isDefault || 0) !== 1" link type="danger" @click="handleDeleteHoliday(row)">删除</el-button>
              <span v-else class="muted">默认</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="ruleDialogOpen" :title="editing ? '编辑规则' : '新增规则'" width="780px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="规则编号">
                <el-input v-model="form.ruleCode" disabled placeholder="保存后自动生成" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规则名称" required>
                <el-input v-model="form.ruleName" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="班次类型">
                <el-select v-model="form.ruleType" style="width: 100%">
                  <el-option label="固定班次" value="固定班次" />
                  <el-option label="弹性工时" value="弹性工时" />
                  <el-option label="轮班制" value="轮班制" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="弹性分钟">
                <el-input-number v-model="form.flexMinutes" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="有效" value="有效" />
                  <el-option label="停用" value="停用" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注">
                <el-input v-model="form.remark" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="适用部门">
                <el-select v-model="form.departments" multiple filterable placeholder="请选择适用部门" style="width: 100%">
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
              <el-form-item label="时段1开始">
                <el-input v-model="form.seg1Start" type="time" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="时段1结束">
                <el-input v-model="form.seg1End" type="time" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="时段2开始">
                <el-input v-model="form.seg2Start" type="time" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="时段2结束">
                <el-input v-model="form.seg2End" type="time" />
              </el-form-item>
            </el-col>
          </el-row>
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
</style>
