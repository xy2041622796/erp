<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Plus, Search } from '@element-plus/icons-vue';
import { deleteOrganJob, getOrganDictMap, getOrganJobList, saveOrganJob, type OrganJob } from '#/api/erp/human-resources/organ';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

interface DictOption { label: string; value: string; raw?: Record<string, any> }

const loading = ref(false);
const saving = ref(false);
const jobs = ref<OrganJob[]>([]);
const levelFilter = ref('');
const nameFilter = ref('');
const typeFilter = ref('');
const deptFilter = ref('');
const dutyFilter = ref('');
const exclusiveFilter = ref('');
const currentPage = ref(1);
const page = ref(20);
const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const form = ref<Partial<OrganJob>>({ JobName: '', JobType: '', JobDuty: '', jobExpNum: 0, jonActNum: 0 });
const jobTypeOptions = ref<DictOption[]>([{ label: '通用岗位', value: '通用岗位' }, { label: '部门岗位', value: '部门岗位' }]);
const deptLevelOptions = ref<DictOption[]>([]);
const isExclusiveOptions = ref<DictOption[]>([]);

function text(v: unknown) { return String(v ?? '').trim(); }
function jobId(row: Partial<OrganJob>) { return text(row.ID || row.JobID || row.rowid || row.ROWID); }
function jobName(row: Partial<OrganJob>) { return text(row.JobName || (row as any).Name); }
function jobType(row: Partial<OrganJob>) { return text(row.JobType || (row.Depid || row.DepID ? '部门岗位' : '通用岗位')) || '通用岗位'; }
function deptName(row: Partial<OrganJob>) { return text(row.DepName); }
function deptLevel(row: Partial<OrganJob>) { return text(row.DepLevel); }
function deptLevelCode(row: Partial<OrganJob>) { return text(row.DepLevelCode); }
function jobDuty(row: Partial<OrganJob>) { return text(row.JobDuty || (row as any).Duty); }
function jobCount(row: Partial<OrganJob>) { return text(row.jobExpNum ?? (row as any).JobCount ?? row.JobCode ?? 0); }
function actCount(row: Partial<OrganJob>) { return text(row.jonActNum ?? 0); }
function isExclusiveText(row: Partial<OrganJob>) {
  const value = text(row.IsExclusiveJob);
  return isExclusiveOptions.value.find((item) => item.value === value)?.label || value;
}
function keyOf(row: Partial<OrganJob>) { return jobId(row) || text(row.rowid || row.ROWID || jobName(row)); }

const filtered = computed(() => jobs.value.filter((row) => {
  return (!levelFilter.value || deptLevelCode(row) === levelFilter.value || deptLevel(row) === levelFilter.value)
    && (!nameFilter.value || jobName(row).includes(nameFilter.value))
    && (!typeFilter.value || jobType(row) === typeFilter.value)
    && (!deptFilter.value || deptName(row).includes(deptFilter.value))
    && (!exclusiveFilter.value || text(row.IsExclusiveJob) === exclusiveFilter.value)
    && (!dutyFilter.value || jobDuty(row).includes(dutyFilter.value));
}));
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * page.value, currentPage.value * page.value));

async function loadDicts() {
  const dicts = await getOrganDictMap();
  if (dicts.deptLevel.length) deptLevelOptions.value = dicts.deptLevel;
  if (dicts.isExclusiveJob.length) isExclusiveOptions.value = dicts.isExclusiveJob;
}
async function loadData() {
  loading.value = true;
  try {
    const res = await getOrganJobList({ depLevelCode: levelFilter.value, index: currentPage.value, page: page.value });
    jobs.value = res.list;
  } finally { loading.value = false; }
}
async function selectLevel(value: string) {
  levelFilter.value = value;
  currentPage.value = 1;
  await loadData();
}
function openAdd() {
  dialogMode.value = 'add';
  form.value = { JobName: '', JobType: jobTypeOptions.value[0]?.value, JobDuty: '', jobExpNum: 0, jonActNum: 0, DepLevelCode: levelFilter.value };
  dialogVisible.value = true;
}
function openEdit(row: OrganJob) {
  dialogMode.value = 'edit';
  form.value = { ...row, ID: jobId(row), JobName: jobName(row), JobType: jobType(row), JobDuty: jobDuty(row), jobExpNum: Number(jobCount(row) || 0), jonActNum: Number(actCount(row) || 0) };
  dialogVisible.value = true;
}
async function submit() {
  if (!jobName(form.value)) return ElMessage.warning('请输入岗位名称');
  saving.value = true;
  try {
    await saveOrganJob(form.value, dialogMode.value);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    await loadData();
  } finally { saving.value = false; }
}
async function remove(row: OrganJob) { await deleteOrganJob(row); ElMessage.success('删除成功'); await loadData(); }
onMounted(async () => { await loadDicts(); await loadData(); });
</script>
<template>
  <Page auto-content-height class="hr-page">
    <div class="job-layout">
      <aside class="level-panel">
        <div class="panel-title">部门级别</div>
        <ElSelect v-model="levelFilter" clearable class="level-select" size="small" @change="selectLevel">
          <ElOption v-for="item in deptLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
        </ElSelect>
        <div v-for="item in deptLevelOptions" :key="item.value" class="level-item"
          :class="{ active: levelFilter === item.value }" @click="selectLevel(item.value)">{{ item.label }}</div>
      </aside>
      <main class="table-panel">
        <div class="toolbar">
          <ElButton :icon="Plus" type="primary" @click="openAdd">新建</ElButton>
        </div>
        <div class="filter-row">
          <ElInput v-model="nameFilter" clearable placeholder="岗位名称" :prefix-icon="Search" size="small" />
          <ElSelect v-model="typeFilter" clearable placeholder="岗位类别" size="small">
            <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="deptFilter" clearable placeholder="所属部门名称" size="small" />
          <ElSelect v-model="exclusiveFilter" clearable placeholder="是否专属" size="small">
            <ElOption v-for="item in isExclusiveOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
          <ElInput v-model="dutyFilter" clearable placeholder="岗位职责" size="small" />
        </div>
        <ElTable v-loading="loading" border class="job-table" :data="paged" height="calc(100vh - 196px)"
          :row-key="keyOf" size="small" :scrollbar-always-on="true">
          <ElTableColumn label="岗位编号" width="140" prop="JobCode" />
          <ElTableColumn label="岗位名称" min-width="180"><template #default="{ row = {}} = {}">{{ jobName(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="岗位类别" width="120"><template #default="{ row = {}} = {}">{{ jobType(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="部门级别" width="120"><template #default="{ row = {}} = {}">{{ deptLevel(row) || deptLevelCode(row)
              }}</template></ElTableColumn>
          <ElTableColumn label="所属部门名称" width="180"><template #default="{ row = {}} = {}">{{ deptName(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="预计人数" width="100"><template #default="{ row = {}} = {}">{{ jobCount(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="实际人数" width="100"><template #default="{ row = {}} = {}">{{ actCount(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="是否专属" width="110"><template #default="{ row = {}} = {}">{{ isExclusiveText(row) }}</template>
          </ElTableColumn>
          <ElTableColumn label="岗位职责" min-width="360" show-overflow-tooltip><template #default="{ row = {}} = {}"><span
                class="ellipsis-text">{{ jobDuty(row) }}</span></template></ElTableColumn>
          <ElTableColumn align="center" fixed="right" label="操作" width="160">
            <template #default="{ row = {}} = {}">
              <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="remove(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
        <div class="pager">
          <ElPagination v-model:current-page="currentPage" v-model:page-size="page" background
            layout="prev, pager, next" :total="filtered.length" /><span>{{ filtered.length ? '1页中的1页' : '0页中的0页' }}（{{
              filtered.length }}项）</span>
        </div>
      </main>
    </div>
    <ElDialog v-model="dialogVisible" :title="dialogMode === 'add' ? '岗位新增' : '岗位编辑'" width="760px">
      <ElForm :model="form" label-width="110px">
        <ElFormItem label="岗位编号">
          <ElInput v-model="form.JobCode" />
        </ElFormItem>
        <ElFormItem label="岗位名称" required>
          <ElInput v-model="form.JobName" />
        </ElFormItem>
        <ElFormItem label="岗位类别">
          <ElSelect v-model="form.JobType" class="w-full">
            <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="部门级别">
          <ElSelect v-model="form.DepLevelCode" clearable class="w-full">
            <ElOption v-for="item in deptLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="所属部门ID">
          <ElInput v-model="form.Depid" />
        </ElFormItem>
        <ElFormItem label="所属部门名称">
          <ElInput v-model="form.DepName" />
        </ElFormItem>
        <ElFormItem label="预计人数">
          <ElInput v-model="form.jobExpNum" />
        </ElFormItem>
        <ElFormItem label="实际人数">
          <ElInput v-model="form.jonActNum" />
        </ElFormItem>
        <ElFormItem label="是否专属">
          <ElSelect v-model="form.IsExclusiveJob" clearable class="w-full">
            <ElOption v-for="item in isExclusiveOptions" :key="item.value" :label="item.label" :value="item.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="岗位资质">
          <ElInput v-model="form.JobQualifications" :rows="3" type="textarea" />
        </ElFormItem>
        <ElFormItem label="岗位职责">
          <ElInput v-model="form.JobDuty" :rows="5" type="textarea" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.Memo" :rows="3" type="textarea" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton :loading="saving" type="primary" @click="submit">保存</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
<style
  scoped>
  .hr-page :deep(.page-content) {
    padding: 0
  }

  .job-layout {
    display: flex;
    background: #fff
  }

  .level-panel {
    width: 290px;
    border-right: 1px solid #e5e7eb;
    min-height: calc(100vh - 114px)
  }

  .panel-title {
    height: 34px;
    line-height: 34px;
    text-align: center;
    font-weight: 600
  }

  .level-select {
    width: calc(100% - 24px);
    margin: 0 12px 8px
  }

  .level-item {
    height: 32px;
    line-height: 32px;
    padding: 0 12px;
    border-top: 1px solid #edf0f2;
    cursor: pointer
  }

  .level-item.active {
    background: #eaf3ff;
    border-color: #409eff
  }

  .table-panel {
    flex: 1;
    min-width: 0
  }

  .toolbar {
    height: 42px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding: 0 12px
  }

  .filter-row {
    display: grid;
    grid-template-columns: 200px 120px 180px 120px 1fr;
    gap: 4px;
    padding: 6px 8px;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    background: #fff
  }

  .pager {
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    color: #909399;
    font-size: 12px
  }

  .job-table {
    width: 100%
  }

  .job-table :deep(.el-table-fixed-column--right),
  .job-table :deep(.el-table__fixed-right) {
    z-index: 5;
    background: #fff
  }

  .job-table :deep(.el-table__fixed-right-patch) {
    background: #fff
  }

  .ellipsis-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap
  }
</style>
