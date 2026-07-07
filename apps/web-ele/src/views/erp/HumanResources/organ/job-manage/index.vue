<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  buildDeptTree,
  deleteOrganJob,
  getOrganDeptList,
  getOrganDictMap,
  getOrganJobList,
  saveOrganJob,
  type OrganDept,
  type OrganDictOption,
  type OrganJob,
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

defineOptions({ name: 'HrOrganJobManagePage' });

const loading = ref(false);
const saving = ref(false);
const deptTree = ref<OrganDept[]>([]);
const jobs = ref<OrganJob[]>([]);
const selectedDeptId = ref('');
const jobTypeOptions = ref<OrganDictOption[]>([]);
const activeJob = ref<OrganJob | null>(null);
const drawerVisible = ref(false);
const keyword = ref('');
const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const form = reactive<Record<string, any>>({
  ID: '',
  JobName: '',
  JobCode: '',
  JobType: '',
  JobDuty: '',
  Memo: '',
  Depid: '',
  DepID: '',
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}
function flatten(list: OrganDept[]): OrganDept[] {
  return list.flatMap((item) => [item, ...flatten(item.children || [])]);
}

const flatDepts = computed(() => flatten(deptTree.value));
const selectedDept = computed(() => flatDepts.value.find((item) => normalizeText(item.DepID) === normalizeText(selectedDeptId.value)) || null);
const deptJobs = computed(() => jobs.value.filter((item) => [item.Depid, item.DepID].map(normalizeText).includes(normalizeText(selectedDeptId.value))));
const filteredJobs = computed(() => {
  const term = keyword.value.trim();
  if (!term) return deptJobs.value;
  return deptJobs.value.filter((item) => [item.JobName, item.JobCode, item.JobDuty].some((field) => normalizeText(field).includes(term)));
});
const metrics = computed(() => [
  { label: '组织数量', value: flatDepts.value.length, tip: '组织岗位管理覆盖组织数' },
  { label: '当前部门岗位', value: deptJobs.value.length, tip: selectedDept.value?.DepName || '-' },
  { label: '检索结果', value: filteredJobs.value.length, tip: keyword.value || '未输入关键字' },
]);
const drawerSummary = computed(() => {
  const row = activeJob.value;
  if (!row) return [];
  return [
    { label: '岗位名称', value: row.JobName },
    { label: '岗位编码', value: row.JobCode },
    { label: '组织部门', value: row.DepName || selectedDept.value?.DepName },
    { label: '岗位类别', value: row.JobType },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const [deptList, dictMap, jobRes] = await Promise.all([
      getOrganDeptList(),
      getOrganDictMap(),
      getOrganJobList({ index: 1, page: 500 }),
    ]);
    deptTree.value = buildDeptTree(deptList || []);
    jobs.value = jobRes.list || [];
    jobTypeOptions.value = dictMap.jobType || [];
    if (!selectedDeptId.value) selectedDeptId.value = normalizeText(flatten(deptTree.value)[0]?.DepID);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '组织岗位数据加载失败');
  } finally {
    loading.value = false;
  }
}

function onSelectDept(node: OrganDept) {
  selectedDeptId.value = normalizeText(node.DepID);
}

function openCreate() {
  dialogMode.value = 'add';
  Object.assign(form, {
    ID: '',
    JobName: '',
    JobCode: '',
    JobType: '',
    JobDuty: '',
    Memo: '',
    Depid: selectedDeptId.value,
    DepID: selectedDeptId.value,
  });
  dialogVisible.value = true;
}

function openEdit(row: OrganJob) {
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...row,
    ID: row.ID || row.JobID || row.rowid || row.ROWID,
    Depid: row.Depid || row.DepID || selectedDeptId.value,
    DepID: row.DepID || row.Depid || selectedDeptId.value,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!normalizeText(form.JobName)) return ElMessage.warning('请输入岗位名称');
  saving.value = true;
  try {
    await saveOrganJob({
      ...form,
      Depid: form.Depid || selectedDeptId.value,
      DepID: form.DepID || selectedDeptId.value,
      DepName: selectedDept.value?.DepName,
    }, dialogMode.value);
    ElMessage.success('岗位关系保存成功');
    dialogVisible.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '岗位关系保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeRow(row: OrganJob) {
  try {
    await deleteOrganJob(row);
    ElMessage.success('岗位删除成功');
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '岗位删除失败');
  }
}

function openDetail(row: OrganJob) {
  activeJob.value = row;
  drawerVisible.value = true;
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-organ-job-manage-page">
      <HrPageIntro
        title="组织岗位管理"
        description="以左树右表的组织岗位维护页面替换原占位页，聚焦组织与岗位关系的维护。"
        :tags="['Sprint1', 'HR-BASE-03', 'HR-ORG-02']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
          <ElButton type="primary" @click="openCreate">当前组织新增岗位</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="300px">
        <template #aside>
          <OrganizationTreePanel
            title="组织目录"
            :nodes="deptTree"
            :active-id="selectedDeptId"
            count-text="选择组织后维护岗位归属"
            @select="onSelectDept"
            @reload="loadData"
          />
        </template>
        <div class="main-column">
          <ElCard shadow="never">
            <div class="toolbar">
              <div class="toolbar__left">
                <ElInput v-model="keyword" clearable placeholder="搜索岗位名称/编码/职责" class="toolbar__input" />
              </div>
              <div class="toolbar__right">
                <ElTag type="info">{{ selectedDept?.DepName || '未选组织' }}</ElTag>
                <ElTag>{{ filteredJobs.length }} 个岗位</ElTag>
              </div>
            </div>
            <ElTable v-loading="loading" border :data="filteredJobs" size="small">
              <ElTableColumn prop="JobCode" label="岗位编码" width="140" />
              <ElTableColumn prop="JobName" label="岗位名称" min-width="160" />
              <ElTableColumn prop="JobType" label="岗位类别" width="120" />
              <ElTableColumn prop="JobDuty" label="岗位职责" min-width="220" show-overflow-tooltip />
              <ElTableColumn label="操作" width="220" fixed="right">
                <template #default="{ row = {}} = {}">
                  <ElButton link type="primary" @click="openDetail(row)">查看</ElButton>
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                  <ElButton link type="danger" @click="removeRow(row)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </div>
      </HrListDetailPage>
      <ElDialog v-model="dialogVisible" :title="dialogMode === 'add' ? '新增组织岗位' : '编辑组织岗位'" width="720px">
        <ElForm label-width="100px">
          <ElFormItem label="所属组织">
            <ElSelect v-model="form.Depid" filterable class="w-full">
              <ElOption v-for="item in flatDepts" :key="item.DepID" :label="item.DepName" :value="item.DepID" />
            </ElSelect>
          </ElFormItem>
          <div class="dialog-grid">
            <ElFormItem label="岗位名称" required>
              <ElInput v-model="form.JobName" />
            </ElFormItem>
            <ElFormItem label="岗位编码">
              <ElInput v-model="form.JobCode" />
            </ElFormItem>
            <ElFormItem label="岗位类别">
              <ElSelect v-model="form.JobType" filterable class="w-full">
                <ElOption v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="岗位职责">
              <ElInput v-model="form.JobDuty" />
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
      <HrDetailDrawer v-model="drawerVisible" title="岗位关系详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <div class="detail-block">
            <div class="detail-label">岗位职责</div>
            <div class="detail-value">{{ activeJob?.JobDuty || '-' }}</div>
          </div>
          <div class="detail-block">
            <div class="detail-label">备注</div>
            <div class="detail-value">{{ activeJob?.Memo || '-' }}</div>
          </div>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-organ-job-manage-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.main-column {
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
.detail-block + .detail-block {
  margin-top: 12px;
}
.detail-label {
  color: #909399;
  font-size: 12px;
}
.detail-value {
  margin-top: 6px;
  line-height: 1.6;
}
</style>
