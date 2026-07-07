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
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrStaffArchivePage' });

const loading = ref(false);
const keyword = ref('');
const activeTab = ref('archive');
const staffRows = ref<OrganUser[]>([]);
const archiveRows = ref<any[]>([]);
const certificateRows = ref<any[]>([]);
const selectedStaffId = ref('');

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
  return staffRows.value.filter((item: any) => [item.UserName, item.LoginName, item.JobName, item.DepName].some((field) => text(field).includes(term)));
});
const selectedStaff = computed(() => filteredStaff.value.find((item: any) => text(item.ROWID || item.rowid || item.UserID) === text(selectedStaffId.value)) || filteredStaff.value[0] || null);
const matchedArchives = computed(() => {
  const staff = selectedStaff.value;
  if (!staff) return [];
  const keys = [staff.UserName, staff.LoginName, staff.UserID].map(text).filter(Boolean);
  return archiveRows.value.filter((row) => {
    const fields = [pickValue(row, ['employeeName', 'employee_name', 'name']), pickValue(row, ['employeeCode', 'employee_code', 'code', 'loginName'])].map(text);
    return keys.some((key) => fields.some((field) => field.includes(key) || key.includes(field)));
  });
});
const matchedCertificates = computed(() => {
  const staff = selectedStaff.value;
  if (!staff) return [];
  const keys = [staff.UserName, staff.LoginName, staff.UserID].map(text).filter(Boolean);
  return certificateRows.value.filter((row) => {
    const fields = [pickValue(row, ['employeeName', 'employee_name', 'name']), pickValue(row, ['employeeCode', 'employee_code', 'code', 'loginName'])].map(text);
    return keys.some((key) => fields.some((field) => field.includes(key) || key.includes(field)));
  });
});
const metrics = computed(() => [
  { label: '员工主档', value: staffRows.value.length, tip: '基础人员总数' },
  { label: '档案记录', value: archiveRows.value.length, tip: '迁移档案表' },
  { label: '证照记录', value: certificateRows.value.length, tip: '迁移证照表' },
  { label: '当前人员档案', value: matchedArchives.value.length, tip: selectedStaff.value?.UserName || '未选人员' },
]);

async function loadData() {
  loading.value = true;
  try {
    const [staffRes, archiveRes, certificateRes] = await Promise.all([
      getOrganStaffList(keyword.value),
      queryHrMigratedTable('Bil_HR_Employee_Archives', { index: 1, page: 500, searchFields: ['employeeName', 'employee_name', 'employeeCode', 'employee_code', 'remark'] }),
      queryHrMigratedTable('Bil_HR_Employee_Certificates', { index: 1, page: 500, searchFields: ['employeeName', 'employee_name', 'employeeCode', 'employee_code', 'certificateName', 'certificate_name'] }),
    ]);
    staffRows.value = staffRes.list || [];
    archiveRows.value = archiveRes.list || [];
    certificateRows.value = certificateRes.list || [];
    if (!selectedStaffId.value && staffRows.value.length) selectedStaffId.value = text(staffRows.value[0]?.ROWID || staffRows.value[0]?.rowid || staffRows.value[0]?.UserID);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-staff-archive-page">
      <HrPageIntro
        title="员工档案"
        description="以员工主档为中心查看档案和证照迁移数据，替换原先的通用迁移占位页。"
        :tags="['Sprint2', 'HR-STAFF-01']"
      />
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="320px">
        <template #aside>
          <ElCard shadow="never" header="员工列表">
            <ElInput v-model="keyword" clearable placeholder="姓名/登录名/岗位/部门" class="mb-12" @keyup.enter="loadData" />
            <ElTable v-loading="loading" border :data="filteredStaff" size="small" highlight-current-row @current-change="(row: any) => selectedStaffId = text(row?.ROWID || row?.rowid || row?.UserID)">
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
                <span>人员档案摘要</span>
                <ElTag type="info">{{ selectedStaff?.UserName || '未选人员' }}</ElTag>
              </div>
            </template>
            <ElDescriptions border :column="2">
              <ElDescriptionsItem label="姓名">{{ selectedStaff?.UserName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="登录名">{{ selectedStaff?.LoginName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="部门">{{ selectedStaff?.DepName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="岗位">{{ selectedStaff?.JobName || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="角色">{{ (selectedStaff as any)?.RoleNames || '-' }}</ElDescriptionsItem>
              <ElDescriptionsItem label="权限查看">{{ (selectedStaff as any)?.AuthNames || '-' }}</ElDescriptionsItem>
            </ElDescriptions>
          </ElCard>
          <ElCard shadow="never">
            <ElTabs v-model="activeTab">
              <ElTabPane label="员工档案" name="archive">
                <ElTable border :data="matchedArchives" size="small" v-loading="loading">
                  <ElTableColumn label="档案编号" min-width="150">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['archiveCode', 'archive_code', 'code', 'rowid']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="员工姓名" min-width="140">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['employeeName', 'employee_name', 'name']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="档案类型" min-width="120">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['archiveType', 'archive_type', 'type']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="状态" min-width="120">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="备注" min-width="220">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['remark', 'description', 'summary']) }}</template>
                  </ElTableColumn>
                </ElTable>
              </ElTabPane>
              <ElTabPane label="关联证照" name="certificate">
                <ElTable border :data="matchedCertificates" size="small" v-loading="loading">
                  <ElTableColumn label="证照名称" min-width="160">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['certificateName', 'certificate_name', 'name']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="证照编号" min-width="140">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['certificateCode', 'certificate_code', 'code']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="到期日期" min-width="140">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['expireDate', 'expire_date', 'endDate']) }}</template>
                  </ElTableColumn>
                  <ElTableColumn label="状态" min-width="120">
                    <template #default="{ row = {}} = {}">{{ pickValue(row, ['status', 'state']) }}</template>
                  </ElTableColumn>
                </ElTable>
              </ElTabPane>
            </ElTabs>
          </ElCard>
        </div>
      </HrListDetailPage>
    </div>
  </Page>
</template>

<style scoped>
.hr-staff-archive-page {
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
