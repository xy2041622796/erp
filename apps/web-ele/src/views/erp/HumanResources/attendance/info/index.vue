<script lang="ts" setup>
import type { HrAttendanceApi } from '#/api/erp/human-resources/attendance';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  createAttendanceRecord,
  deleteAttendanceRecord,
  listAttendanceRecords,
  listUserDjOptions,
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

/** siweiOA 考勤信息真实迁移页 */
defineOptions({ name: 'HrAttendanceInfoPage' });

const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editing = ref<HrAttendanceApi.AttendanceRecord | null>(null);
const rows = ref<HrAttendanceApi.AttendanceRecord[]>([]);
const userDjOptions = ref<HrAttendanceApi.UserDjOption[]>([]);

const queryForm = reactive({
  q: '',
  status: 'all',
  date: '',
});

const form = reactive({
  attendanceCode: '',
  userDjRowid: '',
  attendanceDate: '',
  checkInAt: '',
  checkInType: '指纹',
  checkOutAt: '',
  checkOutType: '指纹',
  workMinutes: 0,
  status: '正常',
  remark: '',
});

const userDjMap = computed(() => new Map(userDjOptions.value.map((item) => [String(item.userDjRowid), item])));

function normalizeDateTime(value?: null | string) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : '-';
}

function toDatetimeLocal(value?: null | string) {
  return value ? String(value).slice(0, 16) : '';
}

async function loadUserOptions() {
  userDjOptions.value = await listUserDjOptions({ q: queryForm.q.trim() || undefined });
}

async function load() {
  loading.value = true;
  try {
    const [data] = await Promise.all([
      listAttendanceRecords({
        q: queryForm.q.trim() || undefined,
        status: queryForm.status,
        date: queryForm.date || undefined,
      }),
      loadUserOptions(),
    ]);
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.attendanceCode = '';
  form.userDjRowid = '';
  form.attendanceDate = '';
  form.checkInAt = '';
  form.checkInType = '指纹';
  form.checkOutAt = '';
  form.checkOutType = '指纹';
  form.workMinutes = 0;
  form.status = '正常';
  form.remark = '';
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogOpen.value = true;
}

function openEdit(row: HrAttendanceApi.AttendanceRecord) {
  editing.value = row;
  form.attendanceCode = row.attendance_code || '';
  form.userDjRowid = row.user_dj_rowid || '';
  form.attendanceDate = row.attendance_date || '';
  form.checkInAt = toDatetimeLocal(row.check_in_at);
  form.checkInType = row.check_in_type || '指纹';
  form.checkOutAt = toDatetimeLocal(row.check_out_at);
  form.checkOutType = row.check_out_type || '指纹';
  form.workMinutes = Number(row.work_minutes || 0);
  form.status = row.status || '正常';
  form.remark = row.remark || '';
  dialogOpen.value = true;
}

async function submit() {
  const rel = userDjMap.value.get(String(form.userDjRowid || ''));
  if (!rel) {
    ElMessage.warning('请选择人员 / 部门 / 岗位');
    return;
  }
  if (!form.attendanceDate) {
    ElMessage.warning('请选择考勤日期');
    return;
  }
  if (!form.checkInAt) {
    ElMessage.warning('请选择签到时间');
    return;
  }
  if (!form.checkOutAt) {
    ElMessage.warning('请选择签退时间');
    return;
  }

  saving.value = true;
  try {
    const payload: HrAttendanceApi.AttendanceRecord = {
      attendance_code: form.attendanceCode || null,
      user_dj_rowid: rel.userDjRowid,
      user_rowid: rel.userRowid,
      dep_id: rel.depId,
      job_rowid: rel.jobRowid,
      attendance_date: form.attendanceDate,
      check_in_at: form.checkInAt || null,
      check_in_type: form.checkInType,
      check_out_at: form.checkOutAt || null,
      check_out_type: form.checkOutType,
      work_minutes: Number(form.workMinutes || 0),
      status: form.status,
      remark: form.remark || null,
    };

    if (editing.value?.id) await updateAttendanceRecord(editing.value.id, payload);
    else await createAttendanceRecord(payload);

    ElMessage.success('保存成功');
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row: HrAttendanceApi.AttendanceRecord) {
  if (!row.id) return;
  await ElMessageBox.confirm(`确认删除考勤记录「${row.attendance_code || row.userName || row.id}」吗？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  });
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
    <div class="hr-attendance-info">
      <div class="page-header">
        <div>
          <h2>考勤信息</h2>
          <p>考勤编号、人员任岗、签到签退、工时和异常状态维护。</p>
        </div>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <el-card class="query-card" shadow="never">
        <el-form :model="queryForm" inline @submit.prevent>
          <el-form-item label="关键词">
            <el-input
              v-model="queryForm.q"
              clearable
              placeholder="考勤编号/人员/部门/岗位"
              style="width: 260px"
              @keyup.enter="load"
            />
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker v-model="queryForm.date" type="date" value-format="YYYY-MM-DD" placeholder="考勤日期" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryForm.status" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="正常" value="正常" />
              <el-option label="迟到" value="迟到" />
              <el-option label="早退" value="早退" />
              <el-option label="旷工" value="旷工" />
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
        <el-table v-loading="loading" :data="rows" row-key="id" border height="100%">
          <el-table-column prop="attendance_code" label="考勤编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="userName" label="人员" min-width="120" show-overflow-tooltip />
          <el-table-column prop="departmentName" label="部门" min-width="140" show-overflow-tooltip />
          <el-table-column prop="jobName" label="岗位" min-width="140" show-overflow-tooltip />
          <el-table-column prop="attendance_date" label="日期" width="120" />
          <el-table-column label="签到" min-width="170">
            <template #default="{ row = {}} = {}">{{ normalizeDateTime(row.check_in_at) }}</template>
          </el-table-column>
          <el-table-column label="签退" min-width="170">
            <template #default="{ row = {}} = {}">{{ normalizeDateTime(row.check_out_at) }}</template>
          </el-table-column>
          <el-table-column prop="work_minutes" label="工时(分钟)" width="110" />
          <el-table-column label="状态" width="100">
            <template #default="{ row = {}} = {}">
              <el-tag effect="plain">{{ row.status || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row = {}} = {}">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="dialogOpen" :title="editing ? '编辑考勤' : '新增考勤'" width="720px" destroy-on-close>
        <el-form label-width="120px" :model="form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="考勤编号">
                <el-input v-model="form.attendanceCode" disabled placeholder="保存后自动生成" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="考勤日期" required>
                <el-date-picker v-model="form.attendanceDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="人员/部门/岗位" required>
                <el-select v-model="form.userDjRowid" filterable remote reserve-keyword style="width: 100%" @focus="loadUserOptions">
                  <el-option
                    v-for="item in userDjOptions"
                    :key="item.userDjRowid"
                    :label="`${item.userName} / ${item.depName} / ${item.jobName}`"
                    :value="item.userDjRowid"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option label="正常" value="正常" />
                  <el-option label="迟到" value="迟到" />
                  <el-option label="早退" value="早退" />
                  <el-option label="旷工" value="旷工" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="工作分钟数">
                <el-input-number v-model="form.workMinutes" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签到时间" required>
                <el-date-picker v-model="form.checkInAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签到方式">
                <el-input v-model="form.checkInType" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签退时间" required>
                <el-date-picker v-model="form.checkOutAt" type="datetime" value-format="YYYY-MM-DDTHH:mm" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="签退方式">
                <el-input v-model="form.checkOutType" />
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
    </div>
  </Page>
</template>

<style scoped>
.hr-attendance-info {
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

.query-card :deep(.el-card__body) {
  padding-bottom: 2px;
}
</style>
