<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { queryHrMigratedTable } from '#/api/erp/human-resources/migration';
import { getOrganStaffList, type OrganUser } from '#/api/erp/human-resources/organ';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrListDetailPage from '../../components/HrListDetailPage.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';

import {
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElInput,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrStaffCertificatePage' });

const loading = ref(false);
const keyword = ref('');
const staffRows = ref<OrganUser[]>([]);
const certificateRows = ref<any[]>([]);
const selectedId = ref('');

function text(v: unknown) {
  return String(v ?? '').trim();
}

function pickValue(row: any, fields: string[]) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '-';
}

const filteredStaff = computed(() => {
  const term = keyword.value.trim();
  if (!term) return staffRows.value;
  return staffRows.value.filter((item: any) => [item.UserName, item.LoginName, item.DepName, item.JobName].some((field) => text(field).includes(term)));
});
const selectedStaff = computed(() => filteredStaff.value.find((item: any) => text(item.ROWID || item.rowid || item.UserID) === text(selectedId.value)) || filteredStaff.value[0] || null);
const filteredCertificates = computed(() => {
  const staff = selectedStaff.value;
  if (!staff) return certificateRows.value;
  const keys = [staff.UserName, staff.LoginName, staff.UserID].map(text).filter(Boolean);
  return certificateRows.value.filter((row) => {
    const fields = [pickValue(row, ['employeeName', 'employee_name', 'name']), pickValue(row, ['employeeCode', 'employee_code', 'code', 'loginName'])].map(text);
    return keys.some((key) => fields.some((field) => field.includes(key) || key.includes(field)));
  });
});
const expiredCount = computed(() => filteredCertificates.value.filter((row) => text(pickValue(row, ['status', 'state'])).includes('过期')).length);
const metrics = computed(() => [
  { label: '证照记录', value: certificateRows.value.length, tip: '证照迁移表总数' },
  { label: '当前人员证照', value: filteredCertificates.value.length, tip: selectedStaff.value?.UserName || '未选人员' },
  { label: '即将到期/过期', value: expiredCount.value, tip: '按状态字段粗略统计' },
  { label: '当前部门', value: selectedStaff.value?.DepName || '-', tip: '证照归属人员部门' },
]);

async function loadData() {
  loading.value = true;
  try {
    const [staffRes, certificateRes] = await Promise.all([
      getOrganStaffList(keyword.value),
      queryHrMigratedTable('Bil_HR_Employee_Certificates', { index: 1, page: 500, searchFields: ['employeeName', 'employee_name', 'employeeCode', 'employee_code', 'certificateName', 'certificate_name', 'status'] }),
    ]);
    staffRows.value = staffRes.list || [];
    certificateRows.value = certificateRes.list || [];
    if (!selectedId.value && staffRows.value.length) selectedId.value = text(staffRows.value[0]?.ROWID || staffRows.value[0]?.rowid || staffRows.value[0]?.UserID);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-staff-certificate-page">
      <HrPageIntro
        title="员工证照"
        description="按员工查看证照迁移数据，形成正式的证照管理入口，替代原通用占位页。"
        :tags="['Sprint2', 'HR-STAFF-03']"
      />
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="320px">
        <template #aside>
          <ElCard shadow="never" header="员工列表">
            <ElInput v-model="keyword" clearable placeholder="姓名/登录名/部门/岗位" class="mb-12" @keyup.enter="loadData" />
            <ElTable v-loading="loading" border :data="filteredStaff" size="small" highlight-current-row @current-change="(row: any) => selectedId = text(row?.ROWID || row?.rowid || row?.UserID)">
              <ElTableColumn prop="UserName" label="姓名" min-width="100" />
              <ElTableColumn prop="DepName" label="部门" min-width="120" />
              <ElTableColumn prop="JobName" label="岗位" min-width="120" />
            </ElTable>
          </ElCard>
        </template>
        <div class="page-main-column">
          <ElCard shadow="never">
            <template #header>
              <div class="header-line">
                <span>证照摘要</span>
                <ElTag type="info">{{ selectedStaff?.UserName || '未选员工' }}</ElTag>
              </div>
            </template>
            <ElDescriptions border :column="2">
              <ElDescriptionsItem label="姓名">{{ selectedStaff?.UserName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="登录名">{{ selectedStaff?.LoginName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="部门">{{ selectedStaff?.DepName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="岗位">{{ selectedStaff?.JobName || '-' }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
          <ElCard shadow="never" header="证照列表">
            <ElTable border :data="filteredCertificates" size="small" v-loading="loading">
              <ElTableColumn label="证照名称" min-width="160">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['certificateName', 'certificate_name', 'name']) }}</template>
              </ElTableColumn>
              <ElTableColumn label="证照编号" min-width="140">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['certificateCode', 'certificate_code', 'code']) }}</template>
              </ElTableColumn>
              <ElTableColumn label="签发日期" min-width="140">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['issueDate', 'issue_date', 'beginDate']) }}</template>
              </ElTableColumn>
              <ElTableColumn label="到期日期" min-width="140">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['expireDate', 'expire_date', 'endDate']) }}</template>
              </ElTableColumn>
              <ElTableColumn label="状态" min-width="120">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state']) }}</template>
              </ElTableColumn>
              <ElTableColumn label="备注" min-width="220">
                <template #default="{ row = {}} = {}">{{ pickValue(row, ['remark', 'description']) }}</template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </div>
      </HrListDetailPage>
    </div>
  </Page>
</template>

<style scoped>
.hr-staff-certificate-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-main-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>
