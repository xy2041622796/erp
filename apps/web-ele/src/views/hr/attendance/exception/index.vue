<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  deleteAttendanceRecord,
  listAttendanceRecords,
  updateAttendanceRecord,
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

/** siweiOA 考勤异常真实迁移页 */
defineOptions({ name: 'HrAttendanceExceptionPage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const handleDialogOpen = ref(false);
const editing = ref<HrAttendanceApi.AttendanceRecord | null>(null);
const handling = ref<HrAttendanceApi.AttendanceRecord | null>(null);
const rows = ref<HrAttendanceApi.AttendanceRecord[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
  date: '',
});

const form = reactive({
  attendanceCode: '',
  attendanceDate: '',
  checkInAt: '',
  checkOutAt: '',
  workMinutes: 0,
  status: '迟到',
  remark: '',
});

const handleForm = reactive({
  status: '迟到',
  exceptionDate: '',
  description: '',
  handleWay: '补卡',
  handleResult: '有效',
  remark: '',
});

const abnormalStatuses = ['迟到', '早退', '旷工', '连续迟到'];

const handleWayOptions = ['补卡', '调休', '免打卡', '加班抵扣', '其他'];
const handleResultOptions = ['有效', '无效', '待定'];

const exceptionRows = computed(() => rows.value.filter((item) => abnormalStatuses.includes(String(item.status || ''))));

function normalizeDateTime(value?: null | string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : '-';
}

function toDatetimeLocal(value?: null | string) {
  return value ? String(value).slice(0, 16) : '';
}

function getExceptionDetail(row: HrAttendanceApi.AttendanceRecord) {
  const status = String(row.status || '异常');
  if (status === '迟到') return row.check_in_at ? `签到时间 ${normalizeDateTime(row.check_in_at)}` : '迟到，未记录签到时间';
  if (status === '早退') return row.check_out_at ? `签退时间 ${normalizeDateTime(row.check_out_at)}` : '早退，未记录签退时间';
  if (status === '旷工') return '当天未满足出勤要求';
  if (status === '连续迟到') return '连续迟到预警';
  return row.remark || status;
}

async function load() {
  loading.value = true;
  try {
    const data = await listAttendanceRecords({
      q: queryForm.q.trim() || undefined,
      status: queryForm.status,
      date: queryForm.date || undefined,
    });
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function openEdit(row: HrAttendanceApi.AttendanceRecord) {
  editing.value = row;
  form.attendanceCode = row.attendance_code || '';
  form.attendanceDate = row.attendance_date || '';
  form.checkInAt = toDatetimeLocal(row.check_in_at);
  form.checkOutAt = toDatetimeLocal(row.check_out_at);
  form.workMinutes = Number(row.work_minutes || 0);
  form.status = row.status || '迟到';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

function parseHandleInfo(row: HrAttendanceApi.AttendanceRecord) {
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

function toDatetimeWithSeconds(value?: null | string) {
  if (!value) return '';
  const s = String(value).replace('T', ' ');
  if (s.length >= 19) return s.slice(0, 19);
  if (s.length === 10) return `${s} 00:00:00`;  // 纯日期 YYYY-MM-DD
  return `${s.slice(0, 16)}:00`;
}

function openHandle(row: HrAttendanceApi.AttendanceRecord) {
  handling.value = row;
  handleForm.status = row.status || '迟到';
  // 优先取 attendance_date（处理对话框保存的是这个字段），再回退到 check_in_at
  handleForm.exceptionDate = row.attendance_date
    ? toDatetimeWithSeconds(row.attendance_date)
    : (row.check_in_at ? toDatetimeWithSeconds(row.check_in_at) : '');
  handleForm.description = getExceptionDetail(row);
  handleForm.handleWay = '补卡';
  handleForm.handleResult = '有效';
  const prev = parseHandleInfo(row);
  if (prev) {
    if (prev.handleWay) handleForm.handleWay = prev.handleWay;
    if (prev.handleResult) handleForm.handleResult = prev.handleResult;
    if (prev.description) handleForm.description = prev.description;
  }
  handleForm.remark = row.remark || '';
  handleDialogOpen.value = true;
}

async function submitHandle() {
  if (!handling.value?.id) return;
  saving.value = true;
  try {
    const handleInfo = JSON.stringify({
      handleWay: handleForm.handleWay,
      handleResult: handleForm.handleResult,
      description: handleForm.description,
    });
    await updateAttendanceRecord(handling.value.id, {
      attendance_date: handleForm.exceptionDate ? String(handleForm.exceptionDate).slice(0, 10) : undefined,
      status: handleForm.status,
      remark: handleForm.remark || null,
      description: handleInfo,
    } as any);
    ElMessage.success('提交处理成功');
    handleDialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function submit() {
  if (!editing.value?.id) return;
  saving.value = true;
  try {
    await updateAttendanceRecord(editing.value.id, {
      attendance_date: form.attendanceDate,
      check_in_at: form.checkInAt || null,
      check_out_at: form.checkOutAt || null,
      work_minutes: Number(form.workMinutes || 0),
      status: form.status,
      remark: form.remark || null,
    });
    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function markNormal(row: HrAttendanceApi.AttendanceRecord) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认将「${row.attendance_code || row.userName || row.id}」标记为正常吗？`, '处理确认', {
      confirmButtonText: '标记正常',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await updateAttendanceRecord(row.id, { status: '正常', remark: row.remark || '异常已处理' });
  ElMessage.success('已标记为正常');
  await load();
}

async function handleDelete(row: HrAttendanceApi.AttendanceRecord) {
  if (!row.id) return;
  try {
    await ElMessageBox.confirm(`确认删除异常记录「${row.attendance_code || row.userName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  await deleteAttendanceRecord(row.id);
  ElMessage.success('删除成功');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <Page auto-content-height>
    <div class="hr-attendance-exception">
      <div class="page-header">
        <div>
          <h2>异常预警</h2>
          <p>基于真实考勤记录识别迟到、早退、旷工等异常，并支持处理。</p>
        </div>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="queryForm.q"
              clearable
              placeholder="考勤编号 / 人员 / 部门 / 岗位"
              style="width: 280px"
              @keyup.enter="load"
            />
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker v-model="queryForm.date" type="date" value-format="YYYY-MM-DD" placeholder="异常日期" />
          </el-form-item>
          <el-form-item label="异常类型">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="迟到" value="迟到" />
              <el-option label="早退" value="早退" />
              <el-option label="旷工" value="旷工" />
              <el-option label="连续迟到" value="连续迟到" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button
              @click="
                queryForm.q = '';
                queryForm.status = 'all';
                queryForm.date = '';
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
          <div class="card-title">异常列表</div>
        </template>
        <el-table v-loading="loading" :data="exceptionRows" row-key="id" border height="100%">
          <el-table-column prop="attendance_code" label="异常编号" min-width="150" show-overflow-tooltip>
            <template #default="{ row = {}} = {}">{{ row.attendance_code || row.id || '-' }}</template>
          </el-table-column>
          <el-table-column prop="userName" label="姓名" min-width="120" show-overflow-tooltip />
          <el-table-column prop="departmentName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="140" show-overflow-tooltip />
          <el-table-column label="异常类型" width="110">
            <template #default="{ row = {}} = {}">
              <el-tag effect="plain" type="warning">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="attendance_date" label="异常日期" width="120" />
          <el-table-column label="异常详情" min-width="220" show-overflow-tooltip>
            <template #default="{ row = {}} = {}">{{ getExceptionDetail(row) }}</template>
          </el-table-column>
          <el-table-column label="通知状态" width="100">
            <template #default>已通知</template>
          </el-table-column>
          <el-table-column label="处理状态" width="100">
            <template #default="{ row = {} } = {}"
            >
              <el-tag v-if="row.status === '正常' || parseHandleInfo(row)" effect="plain" type="success">已处理</el-tag>
              <el-tag v-else effect="plain" type="danger">待处理</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="230">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openHandle(row)">处理</el-button>
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" @click="markNormal(row)">标记正常</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" title="编辑异常记录" width="680px" destroy-on-close>
        <el-form :model="form" label-width="110px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="异常编号">
                <el-input v-model="form.attendanceCode" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="异常日期">
                <el-date-picker v-model="form.attendanceDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="异常类型">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="迟到" value="迟到" />
                  <el-option label="早退" value="早退" />
                  <el-option label="旷工" value="旷工" />
                  <el-option label="连续迟到" value="连续迟到" />
                  <el-option label="正常" value="正常" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工时(分钟)">
                <el-input-number v-model="form.workMinutes" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签到时间">
                <el-date-picker v-model="form.checkInAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签退时间">
                <el-date-picker v-model="form.checkOutAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="3" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="dialogOpen = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="submit">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="handleDialogOpen" title="处理异常记录" width="560px" destroy-on-close>
        <el-form :model="handleForm" label-width="100px" label-position="left">
          <el-form-item label="当前状态">
            <el-tag type="primary" effect="light">{{ handling?.status === '正常' ? '已处理' : '待处理' }}</el-tag>
          </el-form-item>
          <el-form-item label="员工姓名" required>
            <el-input :model-value="handling?.userName || ''" disabled />
          </el-form-item>
          <el-form-item label="部门">
            <el-input :model-value="handling?.departmentName || ''" disabled />
          </el-form-item>
          <el-form-item label="异常类型" required>
            <el-select v-model="handleForm.status" style="width: 100%">
              <el-option label="迟到" value="迟到" />
              <el-option label="早退" value="早退" />
              <el-option label="旷工" value="旷工" />
              <el-option label="连续迟到" value="连续迟到" />
            </el-select>
          </el-form-item>
          <el-form-item label="异常日期" required>
            <el-date-picker
              v-model="handleForm.exceptionDate"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              placeholder="选择日期时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="异常说明">
            <el-input
              v-model="handleForm.description"
              type="textarea"
              :rows="2"
              placeholder="请输入异常说明"
            />
          </el-form-item>
          <el-form-item label="处理方式" required>
            <el-select v-model="handleForm.handleWay" placeholder="请选择处理方式" style="width: 100%">
              <el-option v-for="opt in handleWayOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-form-item label="处理结果" required>
            <el-select v-model="handleForm.handleResult" placeholder="请选择处理结果" style="width: 100%">
              <el-option v-for="opt in handleResultOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="handleForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="handleDialogOpen = false">关闭</el-button>
          <el-button :loading="saving" type="primary" @click="submitHandle">提交处理</el-button>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.hr-attendance-exception {
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
