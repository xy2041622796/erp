<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { getSalaryRankEmployeeList, getSalaryRankItemList, getSalaryRankList } from '#/api/erp/finance/cashier/rank';
import { getSalaryItemMetaPage } from '#/api/erp/finance/cashier/settings/payroll';
import { listAttendanceRecords, listScheduleRules } from '#/api/erp/human-resources/attendance';
import { listLeaveOvertime } from '#/api/erp/human-resources/attendance/leave-overtime';
import { getEmployeeBaseSalaryOverride } from '../monthly-settlement';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'settle', month: string): void;
}>();

const loading = ref(false);
const month = ref('');

const state = reactive({
  employees: [] as any[],
  attendance: [] as any[],
  leaveOvertime: [] as any[],
  scheduleRules: [] as any[],
  rankItems: [] as any[],
  salaryMeta: [] as any[],
  ranks: [] as any[],
});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function inMonth(value: unknown, targetMonth: string) {
  return String(value ?? '').startsWith(targetMonth);
}

function hasBaseSalary(employee: any) {
  const personal = getEmployeeBaseSalaryOverride(String(employee.employee_id || ''));
  if (personal > 0) return true;
  // 检查职级是否有基本工资项
  const rankItem = state.rankItems.find(
    (item) => String(item.rank_id) === String(employee.rank_id),
  );
  if (!rankItem) return false;
  const meta = state.salaryMeta.find(
    (m) => String(m.rowid) === String(rankItem.item_id),
  );
  if (!meta) return false;
  const code = String(meta.item_code || '').toLowerCase();
  return code.includes('base') || code.includes('basic') || code.includes('基本');
}

function hasAttendance(employee: any, targetMonth: string) {
  return state.attendance.some(
    (item) =>
      (String(item.user_rowid) === String(employee.employee_id) ||
        String(item.user_dj_rowid) === String(employee.employee_id)) &&
      inMonth(item.attendance_date, targetMonth),
  );
}

function hasLeaveOvertime(employee: any, targetMonth: string) {
  return state.leaveOvertime.some(
    (item) =>
      (String(item.user_rowid) === String(employee.employee_id) ||
        String(item.user_dj_rowid) === String(employee.employee_id)) &&
      inMonth(item.start_at, targetMonth),
  );
}

function hasScheduleRule(employee: any) {
  if (!employee.dept_id) return false;
  return state.scheduleRules.some((rule) => {
    const depts = rule.departments || [];
    return depts.some((d: any) => String(d.depId) === String(employee.dept_id));
  });
}

const checkRows = computed(() => {
  const targetMonth = month.value || getCurrentMonth();
  return state.employees.map((employee) => {
    const baseOk = hasBaseSalary(employee);
    const attendanceOk = hasAttendance(employee, targetMonth);
    const leaveOk = hasLeaveOvertime(employee, targetMonth);
    const scheduleOk = hasScheduleRule(employee);
    const ready = baseOk && attendanceOk;
    return {
      employee,
      employee_name: employee.employee_name || '-',
      dept_name: employee.dept_name || '-',
      rank_name:
        state.ranks.find((r) => String(r.rowid) === String(employee.rank_id))?.rank_name || '-',
      baseOk,
      attendanceOk,
      leaveOk,
      scheduleOk,
      ready,
    };
  });
});

const summary = computed(() => {
  const total = checkRows.value.length;
  const ready = checkRows.value.filter((r) => r.ready).length;
  const noBase = checkRows.value.filter((r) => !r.baseOk).length;
  const noAttendance = checkRows.value.filter((r) => !r.attendanceOk).length;
  return { total, ready, noBase, noAttendance };
});

async function load() {
  const targetMonth = month.value || getCurrentMonth();
  loading.value = true;
  try {
    const [empRes, attRes, leaveRes, ruleRes, itemRes, metaRes, rankRes] = await Promise.all([
      getSalaryRankEmployeeList({}).catch(() => ({ list: [] })),
      listAttendanceRecords({ index: 1, page: 9999 }).catch(() => []),
      listLeaveOvertime({ status: '已通过' }).catch(() => []),
      listScheduleRules({}).catch(() => []),
      getSalaryRankItemList({}).catch(() => ({ list: [] })),
      getSalaryItemMetaPage({ is_enabled: 1, pageNo: 1, page: 9999 }).catch(() => ({ list: [] })),
      getSalaryRankList({}).catch(() => ({ list: [] })),
    ]);
    state.employees = (empRes.list || []).filter((item: any) => Number(item.is_current ?? 1) === 1);
    state.attendance = Array.isArray(attRes) ? attRes : [];
    state.leaveOvertime = Array.isArray(leaveRes) ? leaveRes : [];
    state.scheduleRules = Array.isArray(ruleRes) ? ruleRes : [];
    state.rankItems = itemRes.list || [];
    state.salaryMeta = metaRes.list || [];
    state.ranks = rankRes.list || [];
  } catch (error: any) {
    ElMessage.error(error?.message || '加载检查数据失败');
  } finally {
    loading.value = false;
  }
}

function handleSettle() {
  emit('settle', month.value || getCurrentMonth());
  emit('update:modelValue', false);
}

onMounted(() => {
  month.value = getCurrentMonth();
  load();
});
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    title="月度结算前联动检查"
    width="960px"
    destroy-on-close
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <div class="check-header">
      <el-date-picker v-model="month" type="month" value-format="YYYY-MM" placeholder="选择月份" @change="load" />
      <div class="summary">
        <span>总人数：<strong>{{ summary.total }}</strong></span>
        <span>可结算：<strong style="color: var(--el-color-success)">{{ summary.ready }}</strong></span>
        <span>缺基本工资：<strong style="color: var(--el-color-warning)">{{ summary.noBase }}</strong></span>
        <span>缺考勤：<strong style="color: var(--el-color-danger)">{{ summary.noAttendance }}</strong></span>
      </div>
    </div>

    <el-table v-loading="loading" :data="checkRows" border height="460">
      <el-table-column prop="employee_name" label="姓名" min-width="100" fixed />
      <el-table-column prop="dept_name" label="部门" min-width="120" />
      <el-table-column prop="rank_name" label="职级" min-width="120" />
      <el-table-column label="基本工资" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.baseOk" type="success" size="small">有</el-tag>
          <el-tag v-else type="danger" size="small">无</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="当月考勤" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.attendanceOk" type="success" size="small">有</el-tag>
          <el-tag v-else type="danger" size="small">无</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="请假加班" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.leaveOk" type="success" size="small">有</el-tag>
          <el-tag v-else type="info" size="small">无</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排班规则" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.scheduleOk" type="success" size="small">有</el-tag>
          <el-tag v-else type="warning" size="small">无</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="是否可结算" width="110" align="center" fixed="right">
        <template #default="{ row }">
          <el-tag v-if="row.ready" type="success">可结算</el-tag>
          <el-tag v-else type="danger">不可结算</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button type="primary" @click="handleSettle">前往月度结算</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.check-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}

.summary {
  display: flex;
  gap: 18px;
  font-size: 14px;
}

.summary strong {
  font-weight: 600;
}
</style>
