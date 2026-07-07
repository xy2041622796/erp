<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import { listData as listCostViews } from '#/api/erp/project/cost/view';
import { listData as listProjectTeam } from '#/api/erp/project/manage/team';
import { listData as listResourceHours } from '#/api/erp/project/resource/hours';

import { ElButton, ElCard, ElDialog, ElEmpty } from 'element-plus';

type CostViewItem = Record<string, any>;
type HoursItem = Record<string, any>;
type MemberItem = Record<string, any>;
type DayRecord = { cost: number; hours: number; unpricedHours: number; missingMemberHours: number };
type DayCell = {
  isoDate: string;
  day: number;
  inCurrentMonth: boolean;
  hasRecord: boolean;
  cost: number;
  hours: number;
  unpricedHours: number;
  missingMemberHours: number;
};

const route = useRoute();
const router = useRouter();
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const selectedProjectId = ref('');
const currentMonth = ref(getMonthStart(new Date()));
const loading = ref(false);
const hoursItems = ref<HoursItem[]>([]);
const costViewItems = ref<CostViewItem[]>([]);
const memberItems = ref<MemberItem[]>([]);
const selectedDay = ref<DayCell | null>(null);

function getMonthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function pad(value: number) { return String(value).padStart(2, '0'); }
function formatMonthValue(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`; }
function formatMonthTitle(date: Date) { return `${date.getFullYear()}年${date.getMonth() + 1}月`; }
function formatCurrency(value: number) { return `¥${Math.round(value || 0)}`; }
function formatHours(value: number) { const num = Number(value || 0); const normalized = Number.isInteger(num) ? num : Number(num.toFixed(1)); return `${normalized}h`; }
function toNumber(value: unknown) { const num = Number(value ?? 0); return Number.isFinite(num) ? num : 0; }
function isLaborCostCategory(value: unknown) {
  const category = String(value || '').trim();
  return ['人工', '人工成本'].includes(category);
}
function isBudgetInMonth(item: Record<string, any>, year: number, month: number) {
  const rawMonth = item?.month;
  const hasMonth = rawMonth !== undefined && rawMonth !== null && String(rawMonth).trim() !== '';
  return Number(item?.year) === year && (!hasMonth || Number(rawMonth) === month);
}
function getMemberHourlyRate(member?: Record<string, any> | null) {
  if (!member) return 0;
  const effectiveHour = toNumber(member?.effective_hour_cost);
  if (effectiveHour > 0) return effectiveHour;
  const hour = toNumber(member?.cost_rate_hour);
  if (hour > 0) return hour;
  const day = toNumber(member?.cost_rate_day);
  return day > 0 ? Number((day / 8).toFixed(2)) : 0;
}
function toIsoDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function buildCalendarDays(monthDate: Date, dayMap: Map<string, DayRecord>) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startWeekDay);
  const cells: DayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const isoDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const record = dayMap.get(isoDate);
    cells.push({
      isoDate,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      hasRecord: !!record && (record.hours > 0 || record.cost > 0),
      cost: record?.cost || 0,
      hours: record?.hours || 0,
      unpricedHours: record?.unpricedHours || 0,
      missingMemberHours: record?.missingMemberHours || 0,
    });
  }
  return cells;
}
async function fetchAllRows(loader: (params: Record<string, any>) => Promise<any>, baseParams: Record<string, any> = {}) {
  const page = 500;
  let pageNo = 1;
  let total = Infinity;
  const rows: any[] = [];
  while (rows.length < total && pageNo <= 20) {
    const res = await loader({ ...baseParams, pageNo, page });
    const list = Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
    const count = Number(res?.total || res?.data?.total || list.length || 0);
    total = Number.isFinite(count) && count > 0 ? count : list.length;
    rows.push(...list);
    if (list.length < page) break;
    pageNo += 1;
  }
  return rows;
}
async function loadCalendarData() {
  if (!selectedProjectId.value) {
    hoursItems.value = [];
    costViewItems.value = [];
    memberItems.value = [];
    return;
  }
  loading.value = true;
  try {
    const [hoursRows, budgetRows, memberRows] = await Promise.all([
      fetchAllRows(listResourceHours, { project_id: selectedProjectId.value }),
      fetchAllRows(listCostViews, { project_id: selectedProjectId.value }),
      fetchAllRows(listProjectTeam, { project_id: selectedProjectId.value }),
    ]);
    hoursItems.value = hoursRows;
    costViewItems.value = budgetRows;
    memberItems.value = memberRows;
  } finally {
    loading.value = false;
  }
}
const monthOptions = computed(() => {
  const current = new Date();
  const list: Array<{ label: string; value: string }> = [];
  for (let offset = -12; offset <= 12; offset += 1) {
    const date = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    list.push({ label: formatMonthTitle(date), value: formatMonthValue(date) });
  }
  return list;
});
const selectedProjectName = computed(() => selectedProjectId.value || '请选择项目');
const monthText = computed(() => formatMonthValue(currentMonth.value));
const filteredHours = computed(() => {
  return hoursItems.value.filter((item) => {
    const projectId = String(item?.project_id || '').trim();
    if (projectId !== selectedProjectId.value) return false;
    const workDate = toIsoDate(item?.work_date);
    return workDate.startsWith(monthText.value);
  });
});
const memberRateMap = computed(() => {
  const map = new Map<string, { member: MemberItem; hourlyRate: number }>();
  for (const member of memberItems.value) {
    const employeeId = String(member?.employee_id || member?.user_rowid || '').trim();
    if (!employeeId) continue;
    map.set(employeeId, { member, hourlyRate: getMemberHourlyRate(member) });
  }
  return map;
});
function getHourUserId(item: Record<string, any>) {
  return String(item?.user_rowid || item?.employee_id || '').trim();
}
function getHourMemberRate(item: Record<string, any>) {
  return memberRateMap.value.get(getHourUserId(item)) || null;
}
function getHourRate(item: Record<string, any>) {
  return getHourMemberRate(item)?.hourlyRate || 0;
}
const dailyMap = computed(() => {
  const map = new Map<string, DayRecord>();
  for (const item of filteredHours.value) {
    const isoDate = toIsoDate(item?.work_date);
    if (!isoDate) continue;
    const hours = toNumber(item?.hours);
    const hourMemberRate = getHourMemberRate(item);
    const hourlyRate = hourMemberRate?.hourlyRate || 0;
    const current = map.get(isoDate) || { cost: 0, hours: 0, unpricedHours: 0, missingMemberHours: 0 };
    current.hours += hours;
    current.cost += hours * hourlyRate;
    if (hourlyRate <= 0) current.unpricedHours += hours;
    if (!hourMemberRate) current.missingMemberHours += hours;
    map.set(isoDate, current);
  }
  return map;
});
const calendarDays = computed(() => buildCalendarDays(currentMonth.value, dailyMap.value));
const monthlyLaborBudgetRows = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth() + 1;
  return costViewItems.value.filter((item) => {
    const projectId = String(item?.project_id || '').trim();
    return projectId === selectedProjectId.value && isLaborCostCategory(item?.category) && isBudgetInMonth(item, year, month);
  });
});
const monthlyBudgetUsedAmount = computed(() => {
  return monthlyLaborBudgetRows.value.reduce((sum, item) => sum + toNumber(item?.used_amount), 0);
});
const stats = computed(() => {
  const totalHours = filteredHours.value.reduce((sum, item) => sum + toNumber(item?.hours), 0);
  const totalCost = Array.from(dailyMap.value.values()).reduce((sum, item) => sum + item.cost, 0);
  const unpricedHours = Array.from(dailyMap.value.values()).reduce((sum, item) => sum + item.unpricedHours, 0);
  const missingMemberHours = Array.from(dailyMap.value.values()).reduce((sum, item) => sum + item.missingMemberHours, 0);
  return {
    totalCost,
    totalHours,
    budgetUsedAmount: monthlyBudgetUsedAmount.value,
    unpricedHours,
    missingMemberHours,
  };
});
const selectedDayHours = computed(() => {
  const date = selectedDay.value?.isoDate || '';
  if (!date) return [];
  return filteredHours.value
    .filter((item) => toIsoDate(item?.work_date) === date)
    .map((item) => {
      const hourMemberRate = getHourMemberRate(item);
      const hourlyRate = hourMemberRate?.hourlyRate || 0;
      const hours = toNumber(item?.hours);
      return { ...item, hourlyRate, costAmount: hours * hourlyRate, isMemberMissing: !hourMemberRate, isRateMissing: !!hourMemberRate && hourlyRate <= 0 };
    });
});
const selectedDayTitle = computed(() => selectedDay.value ? `${selectedDay.value.isoDate} 成本明细` : '成本明细');
const selectedDayCostTip = computed(() => {
  if (!selectedDay.value) return '';
  if (selectedDay.value.missingMemberHours > 0) return '当前日期存在未加入成员管理的工时，这部分成本按 0 计算。请先到成员管理添加成员并维护成本。';
  if (selectedDay.value.unpricedHours > 0) return '当前日期存在未配置小时成本/日成本的工时，这部分成本按 0 计算。请到成员管理维护成员成本。';
  return '当天成本 = 每条工时 × 对应团队成员小时成本；如果只维护日成本，则按日成本 / 8 折算小时成本。';
});
function changeMonth(step: number) { currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + step, 1); }
function openDayDetail(cell: DayCell) {
  if (!cell.hasRecord) return;
  selectedDay.value = cell;
}
function openTeamLedger() {
  router.push({ path: '/project/manage/member', query: selectedProjectId.value ? { project_id: selectedProjectId.value, tab: 'current' } : { tab: 'current' } });
}
watch(selectedProjectId, () => { loadCalendarData(); });
watch(monthText, (value) => {
  const exists = monthOptions.value.some((item) => item.value === value);
  if (!exists) currentMonth.value = getMonthStart(new Date(currentMonth.value));
}, { immediate: true });
onMounted(async () => {
  const routeProjectId = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id;
  if (routeProjectId) selectedProjectId.value = String(routeProjectId);
  await loadCalendarData();
});
</script>

<template>
  <Page auto-content-height class="cost-calendar-page">
    <ElCard shadow="never" class="calendar-filter-card">
      <div class="calendar-filter-row">
        <div class="calendar-filter-item">
          <span class="calendar-filter-label">选择项目：</span>
          <ProjectPicker v-model="selectedProjectId" placeholder="请选择项目" class="calendar-project-select" />
        </div>
      </div>
    </ElCard>

    <div class="calendar-stat-grid">
      <ElCard shadow="never" class="calendar-stat-card">
        <div class="calendar-stat-label">本月实际人工成本</div>
        <div class="calendar-stat-value success">{{ formatCurrency(stats.totalCost) }}</div>
        <div class="calendar-stat-icon green">￥</div>
      </ElCard>
      <ElCard shadow="never" class="calendar-stat-card">
        <div class="calendar-stat-label">预算已用金额</div>
        <div class="calendar-stat-value">{{ formatCurrency(stats.budgetUsedAmount) }}</div>
        <div class="calendar-stat-icon blue">￥</div>
      </ElCard>
      <ElCard shadow="never" class="calendar-stat-card">
        <div class="calendar-stat-label">本月总工时</div>
        <div class="calendar-stat-value">{{ formatHours(stats.totalHours) }}</div>
        <div class="calendar-stat-icon purple">🕒</div>
      </ElCard>
      <ElCard shadow="never" class="calendar-stat-card">
        <div class="calendar-stat-label">异常工时</div>
        <div class="calendar-stat-value">{{ formatHours(stats.unpricedHours) }}</div>
        <div class="calendar-stat-icon orange">!</div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="calendar-main-card" v-loading="loading">
      <template #header>
        <div class="calendar-toolbar">
          <div class="calendar-toolbar-left">
            <button class="month-nav-button" @click="changeMonth(-1)">‹</button>
            <div class="calendar-month-title">{{ formatMonthTitle(currentMonth) }}</div>
            <button class="month-nav-button" @click="changeMonth(1)">›</button>
          </div>
          <div class="calendar-toolbar-right">
            <span class="calendar-legend-dot" />
            <span>有出勤记录</span>
          </div>
        </div>
      </template>
      <div v-if="!selectedProjectId" class="calendar-empty-wrap">
        <ElEmpty description="请选择项目" />
      </div>
      <div v-else class="calendar-board">
        <div class="calendar-week-row">
          <div v-for="label in WEEK_LABELS" :key="label" class="calendar-week-cell">{{ label }}</div>
        </div>
        <div class="calendar-grid">
          <div v-for="cell in calendarDays" :key="cell.isoDate" :class="['calendar-day-cell', !cell.inCurrentMonth && 'muted', cell.hasRecord && 'active']" @click="openDayDetail(cell)">
            <div class="calendar-day-number">{{ cell.day }}</div>
            <div v-if="cell.hasRecord" class="calendar-day-content">
              <div class="calendar-day-cost">{{ formatCurrency(cell.cost) }}</div>
              <div class="calendar-day-hours">{{ formatHours(cell.hours) }}</div>
            </div>
          </div>
        </div>
      </div>
    </ElCard>

    <div class="calendar-page-tip">
      <span>当前项目：{{ selectedProjectName }}。成本按“人员工时 × 成员管理小时成本”统计；预算已用金额仅作参考。</span>
      <ElButton type="primary" link @click="openTeamLedger">去维护当前成员</ElButton>
    </div>

    <ElDialog :model-value="!!selectedDay" :title="selectedDayTitle" width="720px" destroy-on-close @close="selectedDay = null">
      <div v-if="selectedDay" class="calendar-detail">
        <div class="calendar-detail-summary">
          <div class="calendar-detail-item">
            <span>当天工时</span>
            <strong>{{ formatHours(selectedDay.hours) }}</strong>
          </div>
          <div class="calendar-detail-item">
            <span>当天人工成本</span>
            <strong class="success">{{ formatCurrency(selectedDay.cost) }}</strong>
          </div>
          <div class="calendar-detail-item">
            <span>未匹配/未配置工时</span>
            <strong>{{ formatHours(selectedDay.unpricedHours) }}</strong>
          </div>
        </div>
        <div class="calendar-detail-tip">{{ selectedDayCostTip }}</div>
        <div class="calendar-detail-section-title">当天工时成本明细</div>
        <div v-if="selectedDayHours.length" class="calendar-detail-list">
          <div v-for="item in selectedDayHours" :key="item.id || item.hours_code || item.user_rowid" class="calendar-detail-row calendar-detail-row--cost">
            <span>{{ item.user_name || item.user_rowid || '未命名人员' }}</span>
            <span>{{ formatHours(toNumber(item.hours)) }}</span>
            <span>{{ item.isMemberMissing ? '未加入台账' : item.isRateMissing ? '未配置单价' : formatCurrency(item.hourlyRate) + '/h' }}</span>
            <strong>{{ formatCurrency(item.costAmount) }}</strong>
          </div>
        </div>
        <ElEmpty v-else description="暂无当天工时明细" />
        <div class="calendar-detail-section-title">预算参考</div>
        <div v-if="monthlyLaborBudgetRows.length" class="calendar-detail-list">
          <div v-for="item in monthlyLaborBudgetRows" :key="item.id || item.budget_code" class="calendar-detail-row">
            <span>{{ item.category }} / {{ item.year }}{{ item.month ? '-' + pad(Number(item.month)) : '全年' }}</span>
            <strong>{{ formatCurrency(toNumber(item.used_amount)) }}</strong>
          </div>
        </div>
        <ElEmpty v-else description="未找到人工/人工成本预算参考记录" />
      </div>
    </ElDialog>
  </Page>
</template>

<style scoped>
.cost-calendar-page { min-height: 100%; background: #f3f5f9; }
.calendar-filter-card,.calendar-stat-card,.calendar-main-card { border: 1px solid #dbe3ef; border-radius: 22px; box-shadow: 0 6px 20px rgb(15 23 42 / 4%); }
.calendar-filter-card { margin-bottom: 16px; }
.calendar-filter-row { display: flex; align-items: center; gap: 16px; }
.calendar-filter-item { display: flex; align-items: center; gap: 14px; }
.calendar-filter-label { color: #0f172a; font-size: 16px; font-weight: 600; }
.calendar-project-select { width: 320px; }
.calendar-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.calendar-stat-card { position: relative; min-height: 112px; }
.calendar-stat-label { color: #64748b; font-size: 15px; }
.calendar-stat-value { margin-top: 12px; color: #0f172a; font-size: 20px; font-weight: 800; }
.calendar-stat-value.success { color: #059669; }
.calendar-stat-icon { position: absolute; top: 26px; right: 24px; display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 9999px; color: #0f172a; font-size: 22px; }
.calendar-stat-icon.green { background: #d9f7e6; color: #059669; }
.calendar-stat-icon.blue { background: #dbeafe; }
.calendar-stat-icon.purple { background: #ede9fe; color: #7c3aed; }
.calendar-stat-icon.orange { background: #ffedd5; color: #f97316; }
.calendar-main-card :deep(.el-card__header) { padding: 18px 24px; border-bottom: 1px solid #dbe3ef; }
.calendar-main-card :deep(.el-card__body) { padding: 0; }
.calendar-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.calendar-toolbar-left,.calendar-toolbar-right { display: flex; align-items: center; }
.calendar-toolbar-left { gap: 14px; }
.calendar-toolbar-right { gap: 8px; color: #64748b; font-size: 14px; }
.month-nav-button { width: 32px; height: 32px; color: #0f172a; font-size: 24px; line-height: 1; background: transparent; border: none; border-radius: 9999px; cursor: pointer; }
.month-nav-button:hover { background: #f1f5f9; }
.calendar-month-title { color: #0f172a; font-size: 18px; font-weight: 800; }
.calendar-legend-dot { width: 10px; height: 10px; background: #86efac; border-radius: 9999px; }
.calendar-empty-wrap { padding: 40px 0; }
.calendar-week-row,.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.calendar-week-cell { padding: 12px 8px; color: #334155; font-size: 14px; text-align: center; border-right: 1px solid #dbe3ef; border-bottom: 1px solid #dbe3ef; }
.calendar-week-cell:last-child { border-right: none; }
.calendar-day-cell { min-height: 102px; padding: 12px 10px; border-right: 1px solid #dbe3ef; border-bottom: 1px solid #dbe3ef; background: #fff; }
.calendar-day-cell:nth-child(7n) { border-right: none; }
.calendar-day-cell.muted { color: #94a3b8; }
.calendar-day-cell.active { background: #edf9f1; cursor: pointer; }
.calendar-day-cell.active:hover { background: #dcfce7; box-shadow: inset 0 0 0 1px #86efac; }
.calendar-day-number { color: #0f172a; font-size: 14px; }
.calendar-day-cell.muted .calendar-day-number { color: #94a3b8; }
.calendar-day-content { margin-top: 14px; line-height: 1.5; }
.calendar-day-cost { color: #059669; font-size: 15px; font-weight: 700; }
.calendar-day-hours { color: #0f172a; font-size: 15px; }
.calendar-page-tip { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; color: #64748b; font-size: 14px; }
.calendar-detail { color: #0f172a; }
.calendar-detail-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.calendar-detail-item { border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px 14px; background: #f8fafc; }
.calendar-detail-item span { display: block; color: #64748b; font-size: 13px; }
.calendar-detail-item strong { display: block; margin-top: 8px; color: #0f172a; font-size: 18px; }
.calendar-detail-item strong.success { color: #059669; }
.calendar-detail-tip { margin-top: 12px; border-radius: 12px; background: #fff7ed; padding: 10px 12px; color: #9a3412; font-size: 13px; line-height: 20px; }
.calendar-detail-section-title { margin-top: 18px; margin-bottom: 8px; color: #0f172a; font-size: 15px; font-weight: 700; }
.calendar-detail-list { border: 1px solid #dbe3ef; border-radius: 14px; overflow: hidden; }
.calendar-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #e5edf7; }
.calendar-detail-row:last-child { border-bottom: none; }
.calendar-detail-row span { color: #334155; }
.calendar-detail-row strong { color: #0f172a; }
.calendar-detail-row--cost { display: grid; grid-template-columns: minmax(0, 1fr) 80px 110px 100px; align-items: center; }
@media (max-width: 1200px) { .calendar-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) {
  .calendar-filter-row,.calendar-filter-item,.calendar-toolbar { align-items: flex-start; flex-direction: column; }
  .calendar-project-select { width: 100%; }
  .calendar-stat-grid { grid-template-columns: 1fr; }
  .calendar-day-cell { min-height: 84px; padding: 10px 8px; }
  .calendar-page-tip { align-items: flex-start; flex-direction: column; }
  .calendar-detail-summary { grid-template-columns: 1fr; }
}
</style>
