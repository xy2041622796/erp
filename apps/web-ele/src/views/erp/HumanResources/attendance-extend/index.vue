<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { getAttendanceExtendList, type HrAttendanceExtendTable } from '#/api/erp/human-resources/attendance-extend';

import {
  ElButton,
  ElCard,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const loading = ref(false);
const keyword = ref('');
const tableName = ref<HrAttendanceExtendTable>('Bil_HR_Attendance_Records');
const rows = ref<any[]>([]);

const tableOptions = [
  { label: '考勤记录', value: 'Bil_HR_Attendance_Records' },
  { label: '请假/加班', value: 'Bil_HR_Attendance_Leave_Overtime' },
  { label: '请假申请', value: 'Bil_HR_Attendance_Leave_Applications' },
  { label: '节假日', value: 'Bil_HR_Attendance_Holidays' },
  { label: '排班规则', value: 'Bil_HR_Attendance_Schedule_Rules' },
] as const;

async function loadData() {
  loading.value = true;
  try {
    const res = await getAttendanceExtendList(tableName.value, { keyword: keyword.value });
    rows.value = res.list || [];
  } catch (error: any) {
    ElMessage.warning(error?.message || '考勤扩展数据暂未接通，请先执行迁移脚本或配置接口 FormKey');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-sub-page">
      <div class="title-row">
        <div>
          <h2>考勤扩展</h2>
          <p>承接 siweiOA 考勤记录、请假加班、节假日和排班规则。</p>
        </div>
      </div>

      <ElCard shadow="never">
        <div class="filter-row">
          <ElSelect v-model="tableName" class="table-select" @change="loadData">
            <ElOption v-for="item in tableOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="keyword" clearable placeholder="编号/员工/规则/节假日" @keyup.enter="loadData" />
          <ElButton type="primary" @click="loadData">查询</ElButton>
        </div>

        <ElTable v-loading="loading" border :data="rows" size="small">
          <ElTableColumn label="编号/名称" min-width="170">
            <template #default="{ row = {}} = {}">{{ row.attendance_code || row.apply_no || row.rule_code || row.name || row.rowid || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="员工/部门" min-width="150">
            <template #default="{ row = {}} = {}">{{ row.user_rowid || row.employee_id || row.dep_id || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="日期/时间" min-width="180">
            <template #default="{ row = {}} = {}">{{ row.attendance_date || row.start_at || row.start_date || row.startDate || row.start_time || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="结束/签退" min-width="180">
            <template #default="{ row = {}} = {}">{{ row.check_out_at || row.end_at || row.end_date || row.endDate || row.end_time || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="时长/天数" min-width="120">
            <template #default="{ row = {}} = {}">{{ row.work_minutes || row.duration_minutes || row.days || row.flex_minutes || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" min-width="100">
            <template #default="{ row = {}} = {}">{{ row.status || '-' }}</template>
          </ElTableColumn>
          <ElTableColumn label="说明" min-width="220">
            <template #default="{ row = {}} = {}">{{ row.reason || row.remark || row.description || '-' }}</template>
          </ElTableColumn>
        </ElTable>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.hr-sub-page { padding: 16px; }
.title-row { margin-bottom: 16px; padding: 18px; background: #fff; border-radius: 8px; }
.title-row h2 { margin: 0; font-size: 20px; }
.title-row p { margin: 8px 0 0; color: #909399; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; }
.table-select { width: 180px; }
.filter-row .el-input { width: 260px; }
</style>
