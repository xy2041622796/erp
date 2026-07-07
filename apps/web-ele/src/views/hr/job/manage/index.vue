<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  buildDeptTree,
  deleteOrganJob,
  getOrganDeptList,
  getOrganDictMap,
  getOrganJobList,
  getOrganUserList,
  saveOrganJob,
  type OrganDept,
  type OrganDictOption,
  type OrganJob,
  type OrganUser,
} from '#/api/erp/human-resources/organ';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrDetailDrawer from '../../components/HrDetailDrawer.vue';
import HrListDetailPage from '../../components/HrListDetailPage.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';
import OrganizationTreePanel from '../../components/OrganizationTreePanel.vue';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrJobManagePage' });

const loading = ref(false);
const saving = ref(false);
const deptTree = ref<OrganDept[]>([]);
const selectedDeptId = ref('');
const keyword = ref('');
const jobs = ref<OrganJob[]>([]);
const drawerVisible = ref(false);
const detailUsers = ref<OrganUser[]>([]);
const detailRow = ref<OrganJob | null>(null);
const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const jobTypeOptions = ref<OrganDictOption[]>([]);
const headTypeOptions = ref<OrganDictOption[]>([]);
const exclusiveOptions = ref<OrganDictOption[]>([]);

const form = reactive<Record<string, any>>({
  ID: '',
  JobName: '',
  JobCode: '',
  Depid: '',
  DepID: '',
  DepName: '',
  JobType: '',
  HeadType: '',
  IsExclusiveJob: '',
  JobDuty: '',
  Memo: '',
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function flatten(list: OrganDept[]): OrganDept[] {
  return list.flatMap((item) => [item, ...flatten(item.children || [])]);
}

const flatDepts = computed(() => flatten(deptTree.value));
const selectedDept = computed(() => flatDepts.value.find((item) => normalizeText(item.DepID) === normalizeText(selectedDeptId.value)) || null);

const filteredJobs = computed(() => {
  return jobs.value.filter((item) => {
    const matchedDept = !selectedDeptId.value || [item.Depid, item.DepID].map(normalizeText).includes(normalizeText(selectedDeptId.value));
    const term = keyword.value.trim();
    const matchedKeyword = !term || [item.JobName, item.JobCode, item.DepName, item.JobDuty].some((field) => normalizeText(field).includes(term));
    return matchedDept && matchedKeyword;
  });
});

const metrics = computed(() => {
  const all = jobs.value;
  const selected = filteredJobs.value;
  return [
    { label: '岗位总数', value: all.length, tip: '已加载岗位主数据' },
    { label: '当前部门岗位', value: selected.length, tip: selectedDept.value?.DepName || '全部部门' },
    { label: '岗位类别', value: new Set(all.map((item) => normalizeText(item.JobType)).filter(Boolean)).size, tip: '字典项覆盖' },
  ];
});

const drawerSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return [];
  return [
    { label: '岗位名称', value: row.JobName },
    { label: '岗位编码', value: row.JobCode },
    { label: '所属部门', value: row.DepName || row.DepID || row.Depid },
    { label: '岗位类别', value: row.JobType },
    { label: '负责人类型', value: row.HeadType },
    { label: '专属岗位', value: row.IsExclusiveJob },
  ];
});

async function loadBaseData() {
  loading.value = true;
  try {
    const [deptList, dictMap, jobRes] = await Promise.all([
      getOrganDeptList(),
      getOrganDictMap(),
      getOrganJobList({ index: 1, page: 500 }),
    ]);
    deptTree.value = buildDeptTree(deptList || []);
    if (!selectedDeptId.value) selectedDeptId.value = normalizeText(flatten(deptTree.value)[0]?.DepID);
    jobTypeOptions.value = dictMap.jobType || [];
    headTypeOptions.value = dictMap.headType || [];
    exclusiveOptions.value = dictMap.isExclusiveJob || [];
    jobs.value = jobRes.list || [];
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '岗位数据加载失败');
  } finally {
    loading.value = false;
  }
}

function onSelectDept(node: OrganDept) {
  selectedDeptId.value = normalizeText(node.DepID);
}

function resetForm() {
  Object.assign(form, {
    ID: '',
    JobName: '',
    JobCode: '',
    Depid: selectedDeptId.value,
    DepID: selectedDeptId.value,
    DepName: selectedDept.value?.DepName || '',
    JobType: '',
    HeadType: '',
    IsExclusiveJob: '',
    JobDuty: '',
    Memo: '',
  });
}

function openCreate() {
  dialogMode.value = 'add';
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: OrganJob) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...row,
    ID: row.ID || row.JobID || row.rowid || row.ROWID,
    Depid: row.Depid || row.DepID,
    DepID: row.DepID || row.Depid,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!normalizeText(form.JobName)) return ElMessage.warning('请输入岗位名称');
  if (!normalizeText(form.Depid || form.DepID || selectedDeptId.value)) return ElMessage.warning('请选择所属部门');
  saving.value = true;
  try {
    await saveOrganJob(
      {
        ...form,
        Depid: form.Depid || form.DepID || selectedDeptId.value,
        DepID: form.DepID || form.Depid || selectedDeptId.value,
        DepName: selectedDept.value?.DepName || form.DepName,
      },
      dialogMode.value,
    );
    ElMessage.success('岗位保存成功');
    dialogVisible.value = false;
    await loadBaseData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '岗位保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeRow(row: OrganJob) {
  try {
    await deleteOrganJob(row);
    ElMessage.success('岗位删除成功');
    await loadBaseData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '岗位删除失败');
  }
}

async function openDetail(row: OrganJob) {
  detailRow.value = row;
  drawerVisible.value = true;
  try {
    detailUsers.value = await getOrganUserList(normalizeText(row.ID || row.JobID));
  } catch (error) {
    console.error(error);
    detailUsers.value = [];
  }
}

onMounted(loadBaseData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-job-manage-page">
      <HrPageIntro
        title="岗位管理"
        description="将 siweiOA 岗位管理页替换为 ERP 原生岗位主数据页面，支持按组织查看岗位、维护岗位类别和岗位职责。"
        :tags="['Sprint1', 'HR-BASE-03', 'HR-JOB-01']"
      >
        <template #actions>
          <ElButton @click="loadBaseData">刷新</ElButton>
          <ElButton type="primary" @click="openCreate">新增岗位</ElButton>
        </template>
      </HrPageIntro>

      <HrAnalyticsPanel :metrics="metrics" />

      <HrListDetailPage aside-width="300px">
        <template #aside>
          <OrganizationTreePanel
            title="组织树"
            :nodes="deptTree"
            :active-id="selectedDeptId"
            count-text="按组织定位岗位主数据"
            @select="onSelectDept"
            @reload="loadBaseData"
          />
        </template>

        <div class="page-main-column">
          <ElCard shadow="never">
            <div class="toolbar">
              <div class="toolbar__left">
                <ElInput v-model="keyword" clearable placeholder="搜索岗位名称/编码/职责" class="toolbar__input" />
                <ElSelect v-model="form.JobType" placeholder="岗位类别筛选（编辑时使用）" class="toolbar__select" disabled>
                  <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </ElSelect>
              </div>
              <div class="toolbar__right">
                <ElTag type="info">当前部门：{{ selectedDept?.DepName || '全部部门' }}</ElTag>
                <ElTag>{{ filteredJobs.length }} 条</ElTag>
              </div>
            </div>

            <ElTable v-loading="loading" border :data="filteredJobs" size="small">
              <ElTableColumn prop="JobCode" label="岗位编码" width="150" />
              <ElTableColumn prop="JobName" label="岗位名称" min-width="180" />
              <ElTableColumn prop="DepName" label="所属部门" min-width="160" />
              <ElTableColumn prop="JobType" label="岗位类别" width="120" />
              <ElTableColumn prop="HeadType" label="负责人类型" width="120" />
              <ElTableColumn prop="IsExclusiveJob" label="专属岗位" width="100" />
              <ElTableColumn prop="JobDuty" label="岗位职责" min-width="220" show-overflow-tooltip />
              <ElTableColumn label="操作" width="220" fixed="right">
                <template #default="{ row = {}} = {}">
                  <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                  <ElButton link type="danger" @click="removeRow(row)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </div>
      </HrListDetailPage>

      <ElDialog v-model="dialogVisible" :title="dialogMode === 'add' ? '新增岗位' : '编辑岗位'" width="720px">
        <ElForm label-width="110px">
          <div class="dialog-grid">
            <ElFormItem label="岗位名称" required>
              <ElInput v-model="form.JobName" />
            </ElFormItem>
            <ElFormItem label="岗位编码">
              <ElInput v-model="form.JobCode" />
            </ElFormItem>
            <ElFormItem label="所属部门" required>
              <ElSelect v-model="form.Depid" filterable class="w-full">
                <ElOption v-for="item in flatDepts" :key="item.DepID" :label="item.DepName" :value="item.DepID" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="岗位类别">
              <ElSelect v-model="form.JobType" filterable class="w-full">
                <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="负责人类型">
              <ElSelect v-model="form.HeadType" filterable class="w-full">
                <ElOption v-for="item in headTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="专属岗位">
              <ElSelect v-model="form.IsExclusiveJob" filterable class="w-full">
                <ElOption v-for="item in exclusiveOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="岗位职责" class="span-2">
              <ElInput v-model="form.JobDuty" type="textarea" :rows="3" />
            </ElFormItem>
            <ElFormItem label="备注" class="span-2">
              <ElInput v-model="form.Memo" type="textarea" :rows="3" />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">保存</ElButton>
        </template>
      </ElDialog>

      <HrDetailDrawer v-model="drawerVisible" title="岗位详情" :summary="drawerSummary">
        <ElCard shadow="never" header="关联人员">
          <ElTable border size="small" :data="detailUsers">
            <ElTableColumn prop="UserName" label="姓名" min-width="120" />
            <ElTableColumn prop="LoginName" label="登录名" min-width="140" />
            <ElTableColumn prop="DepName" label="部门" min-width="160" />
            <ElTableColumn prop="JobName" label="岗位" min-width="140" />
          </ElTable>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-job-manage-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-main-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar__left,
.toolbar__right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.toolbar__input {
  width: 280px;
}
.toolbar__select {
  width: 220px;
}
.dialog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}
.span-2 {
  grid-column: 1 / span 2;
}
.w-full {
  width: 100%;
}
</style>
