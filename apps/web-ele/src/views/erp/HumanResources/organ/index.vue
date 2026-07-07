<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Delete,
  EditPen,
  Grid,
  Plus,
  Refresh,
  Search,
  Setting,
  User,
} from '@element-plus/icons-vue';

import {
  buildDeptTree,
  deleteOrganJob,
  deleteOrganJobUser,
  getAllOrganUsers,
  getOrganDeptList,
  getOrganDictMap,
  getOrganJobList,
  getOrganUserList,
  saveOrganJob,
  saveOrganJobUsers,
  type OrganDept,
  type OrganJob,
  type OrganUser,
} from '#/api/erp/human-resources/organ';

import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElLink,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTooltip,
  ElTree,
} from 'element-plus';

interface UserSettingRow extends OrganUser {
  checked?: boolean;
}

interface DictOption {
  label: string;
  value: string;
}


const deptTree = ref<OrganDept[]>([]);
const deptList = ref<OrganDept[]>([]);
const jobs = ref<OrganJob[]>([]);
const selectedDeptId = ref('');
const selectedDept = ref<OrganDept | null>(null);
const treeFilter = ref('');
const positionTypeFilter = ref('');
const positionNameFilter = ref('');
const staffFilter = ref('');
const currentPage = ref(1);
const page = ref(20);
const loading = ref(false);
const saving = ref(false);
const jobTypeOptions = ref<DictOption[]>([
  { label: '通用岗位', value: '通用岗位' },
  { label: '部门岗位', value: '部门岗位' },
]);
const headTypeOptions = ref<DictOption[]>([
  { label: '兼职', value: '兼职' },
  { label: '借调', value: '借调' },
  { label: '主职', value: '主职' },
]);
const isExclusiveJobOptions = ref<DictOption[]>([
  { label: '是', value: '1' },
  { label: '否', value: '0' },
]);

const jobDialogVisible = ref(false);
const jobDialogMode = ref<'add' | 'edit'>('add');
const jobForm = ref<Partial<OrganJob>>({ JobCode: 0, JobName: '', JobDuty: '', JobType: '通用岗位' });

const userDialogVisible = ref(false);
const currentJob = ref<OrganJob | null>(null);
const userRows = ref<UserSettingRow[]>([]);
const userKeyword = ref('');
const allUsers = ref<OrganUser[]>([]);

const defaultExpandedKeys = computed(() => deptTree.value.map((item) => item.DepID).filter(Boolean));

const filteredJobs = computed(() => {
  return jobs.value.filter((item) => {
    const matchedType = !positionTypeFilter.value || normalizeJobType(item) === positionTypeFilter.value;
    const matchedName = !positionNameFilter.value || normalizeJobName(item).includes(positionNameFilter.value);
    const matchedStaff = !staffFilter.value || getJobStaffText(item).includes(staffFilter.value);
    return matchedType && matchedName && matchedStaff;
  });
});

const pagedJobs = computed(() => {
  const start = (currentPage.value - 1) * page.value;
  return filteredJobs.value.slice(start, start + page.value);
});

watch(treeFilter, (value) => {
  treeRef.value?.filter(value);
});

const treeRef = ref<InstanceType<typeof ElTree>>();

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function mergeDictOptions(remote: DictOption[], fallback: DictOption[]) {
  return remote.length > 0 ? remote : fallback;
}

async function loadDictionaries() {
  const dictMap = await getOrganDictMap();
  jobTypeOptions.value = mergeDictOptions(dictMap.jobType, jobTypeOptions.value);
  headTypeOptions.value = mergeDictOptions(dictMap.headType, headTypeOptions.value);
  isExclusiveJobOptions.value = mergeDictOptions(dictMap.isExclusiveJob, isExclusiveJobOptions.value);
}

function getDeptId(row?: OrganDept | null) {
  return normalizeText(row?.DepID);
}

function getJobId(row?: Partial<OrganJob> | null) {
  return normalizeText(row?.JobID || row?.rowid || row?.ROWID);
}

function normalizeJobName(row: Partial<OrganJob>) {
  return normalizeText(row.JobName || (row as any).Name || (row as any).岗位名称);
}

function normalizeJobType(row: Partial<OrganJob>) {
  return normalizeText(row.JobType || row.HeadType || (row.DepID ? '部门岗位' : '通用岗位')) || '通用岗位';
}

function getJobStaffText(row: Partial<OrganJob>) {
  return normalizeText((row as any).UserName || (row as any).StaffNames || (row as any).人员);
}

function getJobCode(row: Partial<OrganJob>) {
  return normalizeText(row.JobCode || (row as any).Code || (row as any).岗位编号 || 0);
}

function getRowKey(row: Partial<OrganJob>) {
  return getJobId(row) || normalizeJobName(row);
}

function filterNode(value: string, data: OrganDept) {
  if (!value) return true;
  return normalizeText(data.DepName).includes(value);
}

async function loadDeptTree() {
  const list = await getOrganDeptList();
  deptList.value = list;
  deptTree.value = buildDeptTree(list);
  if (!selectedDept.value && deptTree.value[0]) {
    selectedDept.value = deptTree.value[0];
    selectedDeptId.value = getDeptId(deptTree.value[0]);
  }
}

async function loadJobs() {
  loading.value = true;
  try {
    const res = await getOrganJobList({ deptId: selectedDeptId.value });
    jobs.value = res.list;
  } finally {
    loading.value = false;
  }
}

async function initPage() {
  await loadDictionaries();
  await loadDeptTree();
  await loadJobs();
}

function handleNodeClick(data: OrganDept) {
  selectedDeptId.value = getDeptId(data);
  selectedDept.value = data;
  currentPage.value = 1;
  loadJobs();
}

function resetFilters() {
  positionTypeFilter.value = '';
  positionNameFilter.value = '';
  staffFilter.value = '';
  treeFilter.value = '';
  currentPage.value = 1;
}

function openAddJob() {
  jobDialogMode.value = 'add';
  jobForm.value = {
    JobCode: 0,
    JobName: '',
    JobDuty: '',
    JobType: selectedDeptId.value ? '部门岗位' : '通用岗位',
    IsExclusiveJob: '1',
    DepID: selectedDeptId.value || undefined,
    DepName: selectedDept.value?.DepName,
  };
  jobDialogVisible.value = true;
}

function openEditJob(row: OrganJob) {
  jobDialogMode.value = 'edit';
  jobForm.value = {
    ...row,
    JobCode: getJobCode(row),
    JobName: normalizeJobName(row),
    JobDuty: normalizeText(row.JobDuty),
    JobType: normalizeJobType(row),
    IsExclusiveJob: normalizeText((row as any).ISExclusiveJob || (row as any).IsExclusiveJob || (row as any).isExclusiveJob),
  };
  jobDialogVisible.value = true;
}

async function submitJob() {
  if (!normalizeJobName(jobForm.value)) {
    ElMessage.warning('请输入岗位名称');
    return;
  }
  saving.value = true;
  try {
    await saveOrganJob(jobForm.value, jobDialogMode.value);
    ElMessage.success('保存成功');
    jobDialogVisible.value = false;
    await loadJobs();
  } finally {
    saving.value = false;
  }
}

async function handleDeleteJob(row: OrganJob) {
  await deleteOrganJob(row);
  ElMessage.success('删除成功');
  await loadJobs();
}

async function openUserSetting(row: OrganJob) {
  currentJob.value = row;
  userDialogVisible.value = true;
  const jobId = getJobId(row);
  userRows.value = (await getOrganUserList(jobId)).map((item) => ({
    ...item,
    checked: true,
    HeadType: normalizeText(item.HeadType) || '主职',
    IsCharge: item.IsCharge === true || item.IsCharge === 1 || item.IsCharge === '1',
    WorkDuty: normalizeText(item.WorkDuty || item.JobDuty),
    Remark: normalizeText(item.Remark),
  }));
}

async function searchUsers() {
  allUsers.value = await getAllOrganUsers(userKeyword.value);
}

function addUserToJob(user: OrganUser) {
  const userId = normalizeText(user.UserID || user.ROWID || user.rowid || user.LoginName);
  if (!userId) return;
  if (userRows.value.some((item) => normalizeText(item.UserID || item.ROWID) === userId)) {
    ElMessage.warning('该用户已在岗位人员中');
    return;
  }
  userRows.value.push({
    UserID: userId,
    UserName: user.UserName,
    LoginName: user.LoginName,
    HeadType: '主职',
    IsCharge: false,
    WorkDuty: '',
    Remark: '',
    checked: true,
  });
}

async function removeUserRow(row: UserSettingRow) {
  if (row.rowid || row.ROWID) {
    await deleteOrganJobUser(row);
    ElMessage.success('删除成功');
  }
  userRows.value = userRows.value.filter((item) => item !== row);
}

async function submitUserSetting() {
  if (!currentJob.value) return;
  saving.value = true;
  try {
    const jobId = getJobId(currentJob.value);
    const rows = userRows.value
      .filter((item) => item.checked !== false)
      .map((item) => ({
        rowid: normalizeText(item.rowid || item.ROWID) || undefined,
        UserID: normalizeText(item.UserID || item.ROWID || item.LoginName),
        DepID: selectedDeptId.value || currentJob.value?.DepID,
        JobID: jobId,
        HeadType: normalizeText(item.HeadType) || '主职',
        IsCharge: item.IsCharge ? 1 : 0,
        WorkDuty: normalizeText(item.WorkDuty),
        Remark: normalizeText(item.Remark),
      }))
      .filter((item) => item.UserID);

    await saveOrganJobUsers(rows);
    ElMessage.success('人员设置保存成功');
    userDialogVisible.value = false;
    await loadJobs();
  } finally {
    saving.value = false;
  }
}

onMounted(initPage);
</script>

<template>
  <Page auto-content-height class="organ-page">
    <div class="organ-layout">
      <aside class="organ-sidebar">
        <div class="sidebar-toolbar">
          <ElTooltip content="刷新组织" placement="bottom">
            <ElButton :icon="Refresh" type="primary" @click="initPage" />
          </ElTooltip>
          <ElTooltip content="新增专属岗位" placement="bottom">
            <ElButton :icon="Plus" type="primary" @click="openAddJob" />
          </ElTooltip>
          <ElButton :icon="EditPen" type="primary" @click="selectedDept && ElMessage.info(`当前组织：${selectedDept.DepName}`)" />
          <ElButton :icon="Delete" type="primary" @click="ElMessage.info('组织删除需接入部门删除权限后启用')" />
          <ElButton :icon="Grid" text />
        </div>

        <ElInput v-model="treeFilter" class="tree-search" clearable placeholder="搜索组织" size="small" :prefix-icon="Search" />

        <ElTree
          ref="treeRef"
          class="organ-tree"
          :current-node-key="selectedDeptId"
          :data="deptTree"
          :default-expanded-keys="defaultExpandedKeys"
          :expand-on-click-node="false"
          :filter-node-method="filterNode"
          highlight-current
          node-key="DepID"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data } = {}">
            <span class="tree-node" :class="{ 'is-current': data.DepID === selectedDeptId }">
              <ElIcon><User /></ElIcon>
              <span>{{ node.label || data.DepName }}</span>
            </span>
          </template>
        </ElTree>
      </aside>

      <main class="organ-main">
        <div class="card-header">
          <span>岗位人员配置</span>
          <div class="header-actions">
            <ElButton :icon="Plus" type="primary" @click="openAddJob">专属岗位</ElButton>
            <ElButton :icon="Delete" type="primary">专属岗位</ElButton>
          </div>
        </div>

        <div class="filter-row">
          <div class="filter-index">#</div>
          <ElSelect v-model="positionTypeFilter" clearable placeholder="岗位类型" size="small">
            <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="positionNameFilter" clearable placeholder="岗位名称" size="small" />
          <ElInput v-model="staffFilter" clearable placeholder="人员" size="small" />
          <ElButton :icon="Refresh" size="small" text @click="resetFilters" />
        </div>

        <ElTable v-loading="loading" border class="position-table" :data="pagedJobs" height="390" :row-key="getRowKey" size="small">
          <ElTableColumn align="center" label="#" type="index" width="52" />
          <ElTableColumn label="岗位类型" width="120">
            <template #default="{ row = {}} = {}">{{ normalizeJobType(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="岗位名称" width="180">
            <template #default="{ row = {}} = {}">{{ normalizeJobName(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="人员" min-width="360">
            <template #default="{ row = {}} = {}">
              <ElInput :model-value="getJobStaffText(row)" readonly size="small" />
            </template>
          </ElTableColumn>
          <ElTableColumn align="center" fixed="right" label="操作" width="220">
            <template #default="{ row = {}} = {}">
              <ElLink :underline="false" type="primary" @click="openUserSetting(row)">
                <ElIcon><Setting /></ElIcon>
                <span>人员设置</span>
              </ElLink>
              <ElLink class="delete-link" :underline="false" type="primary" @click="openEditJob(row)">编辑</ElLink>
              <ElLink class="delete-link" :underline="false" type="danger" @click="handleDeleteJob(row)">删除</ElLink>
            </template>
          </ElTableColumn>
        </ElTable>

        <div class="table-footer">
          <ElPagination v-model:current-page="currentPage" v-model:page-size="page" background layout="prev, pager, next" :total="filteredJobs.length" />
          <span>1页中的1页（{{ filteredJobs.length }}项）</span>
        </div>
      </main>
    </div>

    <ElDialog v-model="jobDialogVisible" :title="jobDialogMode === 'add' ? '专属岗位新增' : '专属岗位编辑'" width="900px">
      <ElForm label-width="115px" :model="jobForm">
        <ElFormItem label="岗位名称" required>
          <ElInput v-model="jobForm.JobName" />
        </ElFormItem>
        <ElFormItem label="岗位编制">
          <ElInput v-model="jobForm.JobCode" />
        </ElFormItem>
        <ElFormItem label="岗位类型">
          <ElSelect v-model="jobForm.JobType" class="w-full" clearable>
            <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="是否专属岗位">
          <ElSelect v-model="jobForm.IsExclusiveJob" class="w-full" clearable>
            <ElOption v-for="item in isExclusiveJobOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="岗位职责">
          <ElInput v-model="jobForm.JobDuty" :rows="6" type="textarea" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="jobDialogVisible = false">取消</ElButton>
        <ElButton :loading="saving" type="primary" @click="submitJob">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="userDialogVisible" fullscreen title="人员设置">
      <div class="user-setting-toolbar">
        <ElInput v-model="userKeyword" clearable placeholder="输入姓名/账号搜索人员" :prefix-icon="Search" />
        <ElButton type="primary" @click="searchUsers">搜索人员</ElButton>
        <ElButton :loading="saving" type="primary" @click="submitUserSetting">保存</ElButton>
      </div>

      <div v-if="allUsers.length" class="candidate-users">
        <ElLink v-for="user in allUsers" :key="user.ROWID || user.UserID || user.LoginName" type="primary" @click="addUserToJob(user)">
          {{ user.UserName || user.LoginName }}
        </ElLink>
      </div>

      <ElTable border :data="userRows" height="540" row-key="rowid" size="small">
        <ElTableColumn align="center" label="#" type="index" width="52" />
        <ElTableColumn label="用户姓名" width="135">
          <template #default="{ row = {}} = {}">{{ row.UserName || row.LoginName || row.UserID }}</template>
        </ElTableColumn>
        <ElTableColumn label="用户岗位类型" width="220">
          <template #default="{ row = {}} = {}">
            <ElCheckbox
              v-for="item in headTypeOptions"
              :key="item.value"
              v-model="row.HeadType"
              false-label=""
              :true-label="item.value"
            >
              {{ item.label }}
            </ElCheckbox>
          </template>
        </ElTableColumn>
        <ElTableColumn align="center" label="主持工作" width="135">
          <template #default="{ row = {}} = {}"><ElCheckbox v-model="row.IsCharge" /></template>
        </ElTableColumn>
        <ElTableColumn label="工作职责" min-width="360">
          <template #default="{ row = {}} = {}"><ElInput v-model="row.WorkDuty" clearable size="small" /></template>
        </ElTableColumn>
        <ElTableColumn label="备注" min-width="280">
          <template #default="{ row = {}} = {}"><ElInput v-model="row.Remark" clearable size="small" /></template>
        </ElTableColumn>
        <ElTableColumn align="center" label="操作" width="90">
          <template #default="{ row = {}} = {}"><ElLink type="danger" @click="removeUserRow(row)">删除</ElLink></template>
        </ElTableColumn>
      </ElTable>
      <div class="dialog-bottom">总职责：<b>{{ currentJob?.JobDuty || '企业管理' }}</b></div>
    </ElDialog>
  </Page>
</template>

<style scoped>
.organ-page :deep(.page-content) { padding: 0; }

.organ-layout { display: flex; min-height: calc(100vh - 112px); overflow: hidden; background: #fff; border-top: 1px solid var(--el-border-color-lighter); }
.organ-sidebar { width: 258px; min-width: 258px; background: #f8fafc; border-right: 1px solid var(--el-border-color-lighter); }
.sidebar-toolbar { display: flex; gap: 8px; align-items: center; height: 52px; padding: 9px 22px; background: #fff; }
.sidebar-toolbar .el-button { width: 24px; height: 24px; padding: 0; }
.tree-search { margin: 0 12px 8px; width: calc(100% - 24px); }
.organ-tree { --el-tree-node-content-height: 30px; height: calc(100vh - 180px); overflow: auto; background: transparent; color: #303133; font-size: 13px; }
.tree-node { display: inline-flex; gap: 8px; align-items: center; width: 100%; }
.tree-node .el-icon { color: #1e9fff; font-size: 18px; }
.organ-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { color: #fff; background: #1677ff; }
.organ-tree :deep(.el-tree-node.is-current .el-icon) { color: #fff; }
.organ-main { flex: 1; min-width: 0; background: #fff; }
.card-header { display: flex; align-items: center; justify-content: space-between; height: 32px; padding: 4px 20px; font-size: 13px; color: #303133; border-bottom: 1px solid var(--el-border-color-lighter); }
.header-actions { display: flex; gap: 8px; }
.header-actions .el-button { height: 24px; padding: 0 10px; }
.filter-row { display: grid; grid-template-columns: 52px 120px 180px minmax(360px, 1fr) 160px; align-items: center; height: 32px; border-bottom: 1px solid var(--el-border-color-lighter); }
.filter-index { text-align: center; color: #606266; }
.filter-row > * { margin: 0 2px; }
.position-table :deep(.el-table__header th) { height: 34px; font-weight: 600; color: #303133; background: #fafafa; }
.position-table :deep(.el-table__cell) { height: 32px; padding: 2px 0; }
.position-table :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #e5e7eb inset; }
.delete-link { margin-left: 12px; }
.table-footer { display: flex; align-items: center; justify-content: space-between; height: 42px; padding: 0 12px; color: #909399; font-size: 12px; }
.user-setting-toolbar { display: flex; gap: 12px; align-items: center; padding: 8px 0 12px; }
.user-setting-toolbar .el-input { width: 320px; }
.candidate-users { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0 12px; }
.dialog-bottom { padding: 12px 28px; color: #606266; }
</style>
