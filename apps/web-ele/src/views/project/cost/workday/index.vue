<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import { listData, recalculateProjectWorkday } from '#/api/erp/project/cost/workday';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { getMonthValue, WORKDAY_STATUS_OPTIONS } from './data';

type WorkdayRow = Record<string, any>;

const loading = ref(false);
const recalculating = ref(false);
const rows = ref<WorkdayRow[]>([]);
const recalcDialogOpen = ref(false);
const filters = reactive({
  project_id: '',
  month_text: '',
  user_keyword: '',
  status: '',
});
const recalcForm = reactive({
  projectId: '',
  monthText: getMonthValue(),
  userRowid: '',
  force: false,
});

const filteredRows = computed(() => {
  const userText = filters.user_keyword.trim().toLowerCase();
  return rows.value.filter((row) => {
    const projectOk = !filters.project_id || String(row?.project_id || '') === filters.project_id;
    const monthOk = !filters.month_text || String(row?.month_text || '') === filters.month_text;
    const statusOk = !filters.status || String(row?.status || '') === filters.status;
    const userOk = !userText || [row?.user_rowid, row?.user_name].filter(Boolean).some((item) => String(item).toLowerCase().includes(userText));
    return projectOk && monthOk && statusOk && userOk;
  });
});

const summary = computed(() => {
  return filteredRows.value.reduce(
    (acc, row) => {
      acc.hours += toNumber(row?.hours_total);
      acc.workday += toNumber(row?.workday);
      acc.cost += toNumber(row?.cost_amount);
      if (String(row?.status || '') !== '已计算') acc.abnormal += 1;
      return acc;
    },
    { hours: 0, workday: 0, cost: 0, abnormal: 0 },
  );
});

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatNumber(value: unknown, digits = 2) {
  return Number(toNumber(value).toFixed(digits));
}

function formatMoney(value: unknown) {
  return `¥${formatNumber(value, 2)}`;
}

function getStatusType(status: unknown) {
  const text = String(status || '');
  if (text === '已计算') return 'success';
  if (text === '保留历史成本') return 'warning';
  if (text === 'inactive') return 'info';
  return 'danger';
}

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

async function loadRows() {
  loading.value = true;
  try {
    const res = await listData({ pageNo: 1, page: 1000, ...(filters.project_id ? { project_id: filters.project_id } : {}) });
    rows.value = getList(res);
  } finally {
    loading.value = false;
  }
}

function openRecalculateDialog() {
  recalcForm.projectId = filters.project_id;
  recalcForm.monthText = filters.month_text || getMonthValue();
  recalcForm.userRowid = filters.user_keyword.trim();
  recalcForm.force = false;
  recalcDialogOpen.value = true;
}

async function submitRecalculate() {
  if (!recalcForm.projectId) {
    ElMessage.warning('请选择项目');
    return;
  }
  recalculating.value = true;
  try {
    const result = await recalculateProjectWorkday({
      projectId: recalcForm.projectId,
      monthText: recalcForm.monthText,
      userRowid: recalcForm.userRowid,
      force: recalcForm.force,
    });
    ElMessage.success(`重新计算完成：新增 ${result?.added ?? 0} 条，更新 ${result?.updated ?? 0} 条`);
    recalcDialogOpen.value = false;
    await loadRows();
  } finally {
    recalculating.value = false;
  }
}

onMounted(() => {
  void loadRows();
});
</script>

<template>
  <Page auto-content-height class="project-workday-page">
    <div class="workday-stat-grid">
      <ElCard shadow="never" class="workday-stat-card">
        <div class="workday-stat-label">汇总工时</div>
        <div class="workday-stat-value">{{ formatNumber(summary.hours, 1) }}h</div>
      </ElCard>
      <ElCard shadow="never" class="workday-stat-card">
        <div class="workday-stat-label">汇总工日</div>
        <div class="workday-stat-value">{{ formatNumber(summary.workday, 2) }}</div>
      </ElCard>
      <ElCard shadow="never" class="workday-stat-card">
        <div class="workday-stat-label">人工成本</div>
        <div class="workday-stat-value success">{{ formatMoney(summary.cost) }}</div>
      </ElCard>
      <ElCard shadow="never" class="workday-stat-card">
        <div class="workday-stat-label">异常记录</div>
        <div class="workday-stat-value warning">{{ summary.abnormal }}</div>
      </ElCard>
    </div>

    <ElCard shadow="never" class="workday-main-card">
      <div class="workday-toolbar">
        <ProjectPicker v-model="filters.project_id" class="workday-project-picker" placeholder="请选择项目" />
        <ElInput v-model="filters.month_text" clearable placeholder="月份：YYYY-MM" class="workday-month-input" />
        <ElInput v-model="filters.user_keyword" clearable placeholder="人员编码/姓名" class="workday-user-input" />
        <ElSelect v-model="filters.status" class="workday-status-select" placeholder="状态">
          <ElOption v-for="item in WORKDAY_STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
        <ElButton @click="loadRows">刷新</ElButton>
        <ElButton type="primary" @click="openRecalculateDialog">重新计算</ElButton>
      </div>

      <ElTable v-loading="loading" :data="filteredRows" border stripe height="560">
        <ElTableColumn type="index" label="#" width="60" fixed="left" align="center" />
        <ElTableColumn prop="project_id" label="项目ID" min-width="160" show-overflow-tooltip />
        <ElTableColumn prop="month_text" label="月份" width="110" />
        <ElTableColumn prop="user_name" label="人员" min-width="130" show-overflow-tooltip />
        <ElTableColumn prop="user_rowid" label="人员编码" min-width="150" show-overflow-tooltip />
        <ElTableColumn prop="hours_total" label="汇总工时" width="110" align="right">
          <template #default="{ row }">{{ formatNumber(row.hours_total, 1) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="workday" label="工日" width="100" align="right">
          <template #default="{ row }">{{ formatNumber(row.workday, 2) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="hour_cost_rate" label="小时成本" width="110" align="right">
          <template #default="{ row }">{{ formatMoney(row.hour_cost_rate) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="cost_amount" label="人工成本" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.cost_amount) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="130" align="center">
          <template #default="{ row }"><ElTag :type="getStatusType(row.status)">{{ row.status || '-' }}</ElTag></template>
        </ElTableColumn>
        <ElTableColumn prop="remark" label="备注" min-width="260" show-overflow-tooltip />
        <template #empty><ElEmpty description="暂无工日数据" /></template>
      </ElTable>
    </ElCard>

    <ElDialog v-model="recalcDialogOpen" title="重新计算工日与人工成本" width="560px" destroy-on-close>
      <ElForm label-width="110px">
        <ElFormItem label="项目">
          <ProjectPicker v-model="recalcForm.projectId" class="!w-full" placeholder="请选择项目" />
        </ElFormItem>
        <ElFormItem label="月份">
          <ElInput v-model="recalcForm.monthText" clearable placeholder="YYYY-MM；不填则重算全部月份" />
        </ElFormItem>
        <ElFormItem label="人员编码">
          <ElInput v-model="recalcForm.userRowid" clearable placeholder="不填则重算全部人员" />
        </ElFormItem>
        <ElFormItem label="强制重算">
          <ElSwitch v-model="recalcForm.force" active-text="按当前成员成本重算" inactive-text="保留历史成本" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="recalcDialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="recalculating" @click="submitRecalculate">开始计算</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.project-workday-page { min-height: 100%; background: #f3f5f9; }
.workday-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.workday-stat-card,.workday-main-card { border: 1px solid #dbe3ef; border-radius: 18px; }
.workday-stat-label { color: #64748b; font-size: 14px; }
.workday-stat-value { margin-top: 10px; color: #0f172a; font-size: 22px; font-weight: 800; }
.workday-stat-value.success { color: #059669; }
.workday-stat-value.warning { color: #f97316; }
.workday-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.workday-project-picker { width: 320px; }
.workday-month-input { width: 150px; }
.workday-user-input { width: 180px; }
.workday-status-select { width: 170px; }
@media (max-width: 1200px) { .workday-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workday-toolbar { align-items: stretch; flex-wrap: wrap; } }
@media (max-width: 768px) { .workday-stat-grid { grid-template-columns: 1fr; } .workday-project-picker,.workday-month-input,.workday-user-input,.workday-status-select { width: 100%; } }
</style>
