<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import {
  buildDeptTree,
  getAllOrganUsers,
  getOrganDeptList,
  getOrganDictMap,
  getOrganJobList,
  getOrganStaffList,
  saveOrganStaff,
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

defineOptions({ name: 'HrOrganUserManagementPage' });

const loading = ref(false);
const saving = ref(false);
const deptTree = ref<OrganDept[]>([]);
const users = ref<OrganUser[]>([]);
const allUsers = ref<OrganUser[]>([]);
const jobs = ref<OrganJob[]>([]);
const headTypeOptions = ref<OrganDictOption[]>([]);
const selectedDeptId = ref('');
const keyword = ref('');
const dialogVisible = ref(false);
const drawerVisible = ref(false);
const currentRow = ref<OrganUser | null>(null);
const form = reactive<Record<string, any>>({
  ROWID: '',
  UserID: '',
  UserName: '',
  LoginName: '',
  DepID: '',
  DepName: '',
  JobID: '',
  JobName: '',
  HeadType: '',
  WorkDuty: '',
  Remark: '',
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}
function flatten(list: OrganDept[]): OrganDept[] {
  return list.flatMap((item) => [item, ...flatten(item.children || [])]);
}

const flatDepts = computed(() => flatten(deptTree.value));
const selectedDept = computed(() => flatDepts.value.find((item) => normalizeText(item.DepID) === normalizeText(selectedDeptId.value)) || null);
const filteredUsers = computed(() => {
  const term = keyword.value.trim();
  return users.value.filter((item: any) => {
    const matchedDept = !selectedDeptId.value || [item.DepID, item.Depid].map(normalizeText).includes(normalizeText(selectedDeptId.value));
    const matchedKeyword = !term || [item.UserName, item.LoginName, item.JobName, item.RoleNames].some((field) => normalizeText(field).includes(term));
    return matchedDept && matchedKeyword;
  });
});
const deptJobs = computed(() => jobs.value.filter((item) => [item.Depid, item.DepID].map(normalizeText).includes(normalizeText(selectedDeptId.value))));
const metrics = computed(() => [
  { label: '组织人数', value: filteredUsers.value.length, tip: selectedDept.value?.DepName || '全部组织' },
  { label: '组织岗位', value: deptJobs.value.length, tip: '当前组织可选岗位' },
  { label: '用户池', value: allUsers.value.length, tip: '原始用户主数据' },
  { label: '角色透视', value: new Set(filteredUsers.value.map((item: any) => normalizeText(item.RoleNames)).filter(Boolean)).size, tip: '当前结果角色种类' },
]);
const drawerSummary = computed(() => {
  const row = currentRow.value;
  if (!row) return [];
  return [
    { label: '姓名', value: row.UserName },
    { label: '登录名', value: row.LoginName },
    { label: '部门', value: row.DepName },
    { label: '岗位', value: row.JobName },
    { label: '角色', value: (row as any).RoleNames },
  ];
});

async function loadData() {
  loading.value = true;
  try {
    const [deptList, staffRes, userPool, jobRes, dictMap] = await Promise.all([
      getOrganDeptList(),
      getOrganStaffList(''),
      getAllOrganUsers(''),
      getOrganJobList({ index: 1, page: 500 }),
      getOrganDictMap(),
    ]);
    deptTree.value = buildDeptTree(deptList || []);
    users.value = staffRes.list || [];
    allUsers.value = userPool || [];
    jobs.value = jobRes.list || [];
    headTypeOptions.value = dictMap.headType || [];
    if (!selectedDeptId.value) selectedDeptId.value = normalizeText(flatten(deptTree.value)[0]?.DepID);
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '组织用户数据加载失败');
  } finally {
    loading.value = false;
  }
}

function onSelectDept(node: OrganDept) {
  selectedDeptId.value = normalizeText(node.DepID);
}

function openDetail(row: OrganUser) {
  currentRow.value = row;
  drawerVisible.value = true;
}

function openEdit(row: OrganUser) {
  currentRow.value = row;
  Object.assign(form, {
    ...row,
    ROWID: row.ROWID || row.rowid,
    UserID: row.UserID || row.LoginName,
    DepID: row.DepID || row.Depid || selectedDeptId.value,
    JobID: row.JobID || '',
    JobName: row.JobName || '',
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!normalizeText(form.ROWID || form.UserID)) return ElMessage.warning('当前用户缺少主键，无法保存');
  saving.value = true;
  try {
    await saveOrganStaff({
      ...form,
      DepID: form.DepID || selectedDeptId.value,
      DepName: flatDepts.value.find((item) => normalizeText(item.DepID) === normalizeText(form.DepID || selectedDeptId.value))?.DepName,
      JobName: jobs.value.find((item) => normalizeText(item.ID || item.JobID || item.rowid) === normalizeText(form.JobID))?.JobName || form.JobName,
    }, 'edit');
    ElMessage.success('组织用户信息保存成功');
    dialogVisible.value = false;
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '组织用户信息保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-organ-user-management-page">
      <HrPageIntro
        title="组织用户管理"
        description="以组织树 + 用户列表的方式替换占位页，支持人员按组织归属查看，并维护岗位与负责人类型。"
        :tags="['Sprint1', 'HR-BASE-04', 'HR-ORG-04']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <HrListDetailPage aside-width="300px">
        <template #aside>
          <OrganizationTreePanel
            title="组织树"
            :nodes="deptTree"
            :active-id="selectedDeptId"
            count-text="按组织查看用户归属"
            @select="onSelectDept"
            @reload="loadData"
          />
        </template>
        <div class="main-column">
          <ElCard shadow="never">
            <div class="toolbar">
              <div class="toolbar__left">
                <ElInput v-model="keyword" clearable placeholder="姓名/登录名/岗位/角色" class="toolbar__input" />
              </div>
              <div class="toolbar__right">
                <ElTag type="info">{{ selectedDept?.DepName || '未选组织' }}</ElTag>
                <ElTag>{{ filteredUsers.length }} 人</ElTag>
              </div>
            </div>
            <ElTable v-loading="loading" border :data="filteredUsers" size="small">
              <ElTableColumn prop="UserName" label="姓名" min-width="120" />
              <ElTableColumn prop="LoginName" label="登录名" min-width="140" />
              <ElTableColumn prop="DepName" label="部门" min-width="150" />
              <ElTableColumn prop="JobName" label="岗位" min-width="140" />
              <ElTableColumn prop="RoleNames" label="角色" min-width="200" show-overflow-tooltip />
              <ElTableColumn prop="AuthNames" label="权限查看" min-width="220" show-overflow-tooltip />
              <ElTableColumn label="操作" width="200" fixed="right">
                <template #default="{ row = {}} = {}">
                  <ElButton link type="primary" @click="openDetail(row)">详情</ElButton>
                  <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>
          </ElCard>
        </div>
      </HrListDetailPage>
      <ElDialog v-model="dialogVisible" title="编辑组织用户" width="720px">
        <ElForm label-width="100px">
          <div class="dialog-grid">
            <ElFormItem label="姓名">
              <ElInput v-model="form.UserName" disabled />
            </ElFormItem>
            <ElFormItem label="登录名">
              <ElInput v-model="form.LoginName" disabled />
            </ElFormItem>
            <ElFormItem label="所属组织">
              <ElSelect v-model="form.DepID" filterable class="w-full">
                <ElOption v-for="item in flatDepts" :key="item.DepID" :label="item.DepName" :value="item.DepID" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="所属岗位">
              <ElSelect v-model="form.JobID" filterable clearable class="w-full">
                <ElOption
                  v-for="item in deptJobs.length ? deptJobs : jobs"
                  :key="item.ID || item.JobID || item.rowid"
                  :label="item.JobName"
                  :value="item.ID || item.JobID || item.rowid"
                />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="负责人类型">
              <ElSelect v-model="form.HeadType" filterable clearable class="w-full">
                <ElOption v-for="item in headTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem label="岗位职责">
              <ElInput v-model="form.WorkDuty" />
            </ElFormItem>
            <ElFormItem label="备注" class="span-2">
              <ElInput v-model="form.Remark" type="textarea" :rows="3" />
            </ElFormItem>
          </div>
        </ElForm>
        <template #footer>
          <ElButton @click="dialogVisible = false">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">保存</ElButton>
        </template>
      </ElDialog>
      <HrDetailDrawer v-model="drawerVisible" title="组织用户详情" :summary="drawerSummary">
        <ElCard shadow="never">
          <div class="detail-grid">
            <div>
              <div class="detail-label">权限查看</div>
              <div class="detail-value">{{ (currentRow as any)?.AuthNames || '-' }}</div>
            </div>
            <div>
              <div class="detail-label">岗位职责</div>
              <div class="detail-value">{{ (currentRow as any)?.WorkDuty || '-' }}</div>
            </div>
            <div>
              <div class="detail-label">备注</div>
              <div class="detail-value">{{ (currentRow as any)?.Remark || '-' }}</div>
            </div>
          </div>
        </ElCard>
      </HrDetailDrawer>
    </div>
  </Page>
</template>

<style scoped>
.hr-organ-user-management-page {
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
  width: 300px;
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
.detail-grid {
  display: grid;
  gap: 12px;
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
