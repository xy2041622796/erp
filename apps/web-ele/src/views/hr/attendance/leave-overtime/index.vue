<script lang="ts" setup>
import type { HrLeaveOvertimeApi } from '#/api/erp/human-resources/attendance/leave-overtime';
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { listUserDjOptions } from '#/api/erp/human-resources/attendance';
import {
  createLeaveOvertime,
  deleteLeaveOvertime,
  listLeaveOvertime,
  updateLeaveOvertime,
} from '#/api/erp/human-resources/attendance/leave-overtime';

import {
  ElButton,
  ElCard,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

/** siweiOA 请假加班真实迁移页 */
defineOptions({ name: 'HrAttendanceLeaveOvertimePage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrLeaveOvertimeApi.LeaveOvertime | null>(null);
const rows = ref<HrLeaveOvertimeApi.LeaveOvertime[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
});

const form = reactive({
  applyNo: '',
  userDjRowid: '',
  depId: '',
  requestType: '事假',
  startAt: '',
  endAt: '',
  durationMinutes: 0,
  reason: '',
  approveUserRowid: '',
  status: '待审批',
  remark: '',
});

function normalizeDate(value?: null | string) {
  return value ? String(value).slice(0, 10) : '-';
}

const MINUTES_PER_DAY = 480;
const HALF_DAY_SPLIT_HOUR = 12;

function parseDateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return [year, month, day].join('-');
}

function getHalfDayStartIndex(date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayNo = Math.floor(dayStart / 86_400_000);
  const isAfternoon = date.getHours() >= 12;
  return dayNo * 2 + (isAfternoon ? 1 : 0);
}

function getHalfDayEndIndex(date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayNo = Math.floor(dayStart / 86_400_000);
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes <= 8 * 60 + 30) return dayNo * 2;
  if (minutes <= 13 * 60 + 30) return dayNo * 2 + 1;
  return dayNo * 2 + 2;
}

function calcLeaveDayUnits(startAt: string, endAt: string) {
  const start = parseDateTime(startAt);
  const end = parseDateTime(endAt);
  if (!start || !end || end <= start) return 0;

  const startIndex = getHalfDayStartIndex(start);
  const endIndex = getHalfDayEndIndex(end);
  const diffUnits = (endIndex - startIndex) * 0.5;

  return Math.max(diffUnits, 0.5);
}

const WORK_TIME_POINTS: Array<[number, number]> = [
  [8, 30],
  [9, 0],
  [9, 30],
  [10, 0],
  [10, 30],
  [11, 0],
  [11, 30],
  [12, 0],
  [13, 30],
  [14, 0],
  [14, 30],
  [15, 0],
  [15, 30],
  [16, 0],
  [16, 30],
  [17, 0],
  [17, 30],
  [18, 0],
];
function getAllowedMinutesByHour(hour: number) {
  return WORK_TIME_POINTS.filter(([pointHour]) => pointHour === hour).map(([, minute]) => minute);
}

function disabledWorkHours() {
  const enabledHours = new Set(WORK_TIME_POINTS.map(([hour]) => hour));
  return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => !enabledHours.has(hour));
}

function disabledWorkMinutes(hour: number) {
  const enabledMinutes = getAllowedMinutesByHour(hour);
  if (!enabledMinutes.length) return Array.from({ length: 60 }, (_, minute) => minute);
  return Array.from({ length: 60 }, (_, minute) => minute).filter((minute) => !enabledMinutes.includes(minute));
}

function disabledWorkSeconds() {
  return Array.from({ length: 59 }, (_, index) => index + 1);
}

function formatWorkDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return [year, month, day].join('-') + ' ' + hour + ':' + minute + ':00';
}

function isWorkTimePoint(value: string) {
  const date = parseDateTime(value);
  if (!date) return false;
  return WORK_TIME_POINTS.some(([hour, minute]) => date.getHours() === hour && date.getMinutes() === minute);
}

function normalizeToWorkTimePoint(value: string) {
  const date = parseDateTime(value);
  if (!date) return '';
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const matched = WORK_TIME_POINTS.find(([hour, minute]) => hour * 60 + minute >= currentMinutes) || WORK_TIME_POINTS[WORK_TIME_POINTS.length - 1];
  if (!matched) return '';
  date.setHours(matched[0], matched[1], 0, 0);
  return formatWorkDateTime(date);
}

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listLeaveOvertime({
        q: queryForm.q.trim() || undefined,
        status: queryForm.status,
      }),
      loadUserOptions(),
    ]);
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.applyNo = '';
  form.userDjRowid = '';
  form.depId = '';
  form.requestType = '事假';
  form.startAt = '';
  form.endAt = '';
  form.durationMinutes = 0;
  form.reason = '';
  form.approveUserRowid = '';
  form.status = '待审批';
  form.remark = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrLeaveOvertimeApi.LeaveOvertime) {
  editing.value = row;
  form.applyNo = row.apply_no || '';
  form.userDjRowid = row.user_dj_rowid || '';
  form.depId = row.dep_id || '';
  form.requestType = row.request_type || '事假';
  form.startAt = row.start_at ? String(row.start_at).slice(0, 19).replace('T', ' ') : '';
  form.endAt = row.end_at ? String(row.end_at).slice(0, 19).replace('T', ' ') : '';
  form.durationMinutes = Number(row.duration_minutes || 0);
  form.reason = row.reason || '';
  form.approveUserRowid = row.approve_user_rowid || '';
  form.status = row.status || '待审批';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

const departmentOptions = computed(() => {
  const map = new Map<string, { depId: string; depName: string }>();
  userDjOptions.value.forEach((item) => {
    if (item.depId && !map.has(item.depId)) {
      map.set(item.depId, { depId: item.depId, depName: item.depName });
    }
  });
  return [...map.values()];
});

const approverOptions = computed(() => {
  const map = new Map<string, { userName: string; userRowid: string }>();
  userDjOptions.value.forEach((item) => {
    if (item.userRowid && !map.has(item.userRowid)) {
      map.set(item.userRowid, { userName: item.userName, userRowid: item.userRowid });
    }
  });
  return [...map.values()];
});

const durationDisplay = computed({
  get() {
    const minutes = Number(form.durationMinutes || 0);
    if (!minutes) return '';
    return (minutes / MINUTES_PER_DAY).toFixed(1).replace(/\.0$/, '');
  },
  set() {
    // readonly
  },
});

const timeRange = computed<[string, string] | []>({
  get() {
    return form.startAt && form.endAt ? [form.startAt, form.endAt] : [];
  },
  set(value) {
    const [startAt, endAt] = Array.isArray(value) ? value : [];
    form.startAt = startAt ? normalizeToWorkTimePoint(startAt) : '';
    form.endAt = endAt ? normalizeToWorkTimePoint(endAt) : '';
    calcDuration();
  },
});

function selectedUser() {
  return userDjOptions.value.find((item) => String(item.userDjRowid) === String(form.userDjRowid));
}

function onUserChange() {
  const user = selectedUser();
  if (user) {
    form.depId = user.depId || '';
  } else {
    form.depId = '';
  }
}

function calcDuration() {
  const dayUnits = calcLeaveDayUnits(form.startAt, form.endAt);
  form.durationMinutes = Math.round(dayUnits * MINUTES_PER_DAY);
}

async function submit() {
  const rel = selectedUser();
  if (!rel) {
    ElMessage.warning('请选择人员 / 部门 / 岗位');
    return;
  }
  if (!form.depId) {
    ElMessage.warning('请选择部门');
    return;
  }
  if (!form.startAt || !form.endAt) {
    ElMessage.warning('请选择时间区间');
    return;
  }
  if (!isWorkTimePoint(form.startAt) || !isWorkTimePoint(form.endAt)) {
    ElMessage.warning('时间区间只能选择上班时间点');
    return;
  }
  if (!form.approveUserRowid) {
    ElMessage.warning('请选择审批人');
    return;
  }
  if (!form.reason) {
    ElMessage.warning('请输入申请原因');
    return;
  }

  const payload: HrLeaveOvertimeApi.LeaveOvertime = {
    apply_no: form.applyNo || null,
    user_dj_rowid: rel.userDjRowid,
    user_rowid: rel.userRowid,
    dep_id: form.depId || rel.depId,
    job_rowid: rel.jobRowid,
    request_type: form.requestType,
    start_at: form.startAt,
    end_at: form.endAt,
    duration_minutes: Number(form.durationMinutes || 0),
    reason: form.reason || null,
    status: form.status,
    approve_user_rowid: form.approveUserRowid || null,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    if (editing.value?.id) await updateLeaveOvertime(editing.value.id, payload);
    else await createLeaveOvertime(payload);
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function audit(row: HrLeaveOvertimeApi.LeaveOvertime, status: '已通过' | '已驳回') {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(
      `确认${status === '已通过' ? '通过' : '驳回'}申请「${row.apply_no || row.userName || row.id}」吗？`,
      '审批确认',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  await updateLeaveOvertime(row.id, { status });
  ElMessage.success(status === '已通过' ? '已通过申请' : '已驳回申请');
  await load();
}

async function handleDelete(row: HrLeaveOvertimeApi.LeaveOvertime) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除申请「${row.apply_no || row.userName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteLeaveOvertime(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-leave-overtime">
      <div class="page-header">
        <div>
          <h2>请假加班</h2>
          <p>维护请假、加班申请，并支持审批通过/驳回。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增申请</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="queryForm.q"
              clearable
              placeholder="申请编号 / 人员 / 部门 / 岗位"
              style="width: 280px"
              @keyup.enter="load"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待审批" value="待审批" />
              <el-option label="已通过" value="已通过" />
              <el-option label="已驳回" value="已驳回" />
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
          <div class="card-title">申请列表</div>
        </template>
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="apply_no" label="申请编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="userName" label="人员" min-width="120" show-overflow-tooltip />
          <el-table-column prop="departmentName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="140" show-overflow-tooltip />
          <el-table-column prop="request_type" label="类型" width="100" />
          <el-table-column label="开始日期" min-width="120">
            <template #default="{ row = {}} = {}">{{ normalizeDate(row.start_at) }}</template>
          </el-table-column>
          <el-table-column label="结束日期" min-width="120">
            <template #default="{ row = {}} = {}">{{ normalizeDate(row.end_at) }}</template>
          </el-table-column>
          <el-table-column label="时长(天)" width="110">
            <template #default="{ row = {} } = {}">{{ Number(row.duration_minutes || 0) ? (Number(row.duration_minutes || 0) / MINUTES_PER_DAY).toFixed(1).replace(/\.0$/, '') : '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" :disabled="row.status !== '待审批'" @click="audit(row, '已通过')">通过</el-button>
              <el-button link type="warning" :disabled="row.status !== '待审批'" @click="audit(row, '已驳回')">驳回</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑请假加班申请' : '新增请假加班申请'" width="560px" destroy-on-close>
        <el-form :model="form" label-width="100px">
          <el-form-item label="员工姓名" required>
            <el-select v-model="form.userDjRowid" filterable placeholder="请选择员工姓名" style="width: 100%" @change="onUserChange" @focus="loadUserOptions">
              <el-option
                v-for="item in userDjOptions"
                :key="item.userDjRowid"
                :label="item.userName"
                :value="item.userDjRowid"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="部门" required>
            <el-select v-model="form.depId" filterable placeholder="请选择部门" style="width: 100%">
              <el-option
                v-for="item in departmentOptions"
                :key="item.depId"
                :label="item.depName"
                :value="item.depId"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="申请类型" required>
            <el-select v-model="form.requestType" placeholder="请选择申请类型" style="width: 100%">
              <el-option label="事假" value="事假" />
              <el-option label="病假" value="病假" />
              <el-option label="年假" value="年假" />
              <el-option label="加班" value="加班" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间区间" required>
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              start-placeholder="选择开始时间"
              end-placeholder="选择结束时间"
              range-separator="至"
              :disabled-hours="disabledWorkHours"
              :disabled-minutes="disabledWorkMinutes"
              :disabled-seconds="disabledWorkSeconds"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="时长" required>
            <el-input v-model="durationDisplay" readonly placeholder="按半天/一天自动计算">
              <template #append>天</template>
            </el-input>
          </el-form-item>
          <el-form-item label="审批人" required>
            <el-select v-model="form.approveUserRowid" filterable placeholder="请选择审批人" style="width: 100%">
              <el-option
                v-for="item in approverOptions"
                :key="item.userRowid"
                :label="item.userName"
                :value="item.userRowid"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="原因" required>
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="请输入申请原因"
            />
          </el-form-item>
          <el-form-item label="状态" required>
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="待审批" value="待审批" />
              <el-option label="已通过" value="已通过" />
              <el-option label="已驳回" value="已驳回" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-leave-overtime {
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

.card-title {
  font-weight: 600;
}


.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}
</style>
