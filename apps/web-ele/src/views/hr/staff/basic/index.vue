<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';


import { getOrganDictMap, getOrganStaffList, saveOrganStaff, type OrganDictOption, type OrganUser } from '#/api/erp/human-resources/organ';

import HrAnalyticsPanel from '../../components/HrAnalyticsPanel.vue';
import HrPageIntro from '../../components/HrPageIntro.vue';

import {
  ElButton,
  ElCard,
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

defineOptions({ name: 'HrStaffBasicPage' });

const loading = ref(false);
const saving = ref(false);
const keyword = ref('');
const staffRows = ref<OrganUser[]>([]);
const genderOptions = ref<OrganDictOption[]>([]);
const selectedId = ref('');
const form = reactive<Record<string, any>>({
  ROWID: '',
  UserName: '',
  LoginName: '',
  Sex: '',
  Age: '',
  entInfoUserPhone: '',
  IDCard: '',
  NativePlace: '',
  Address: '',
  memo: '',
});

function text(v: unknown) {
  return String(v ?? '').trim();
}

const filteredRows = computed(() => {
  const term = keyword.value.trim();
  if (!term) return staffRows.value;
  return staffRows.value.filter((item: any) => [item.UserName, item.LoginName, item.DepName, item.JobName].some((field) => text(field).includes(term)));
});
const selectedRow = computed(() => filteredRows.value.find((item: any) => text(item.ROWID || item.rowid || item.UserID) === text(selectedId.value)) || filteredRows.value[0] || null);
const metrics = computed(() => [
  { label: '员工数量', value: staffRows.value.length, tip: '主数据总数' },
  { label: '当前检索结果', value: filteredRows.value.length, tip: keyword.value || '全部' },
  { label: '当前部门', value: selectedRow.value?.DepName || '-', tip: '所选员工部门' },
  { label: '当前岗位', value: selectedRow.value?.JobName || '-', tip: '所选员工岗位' },
]);

function syncForm(row: OrganUser | null) {
  Object.assign(form, {
    ROWID: row?.ROWID || row?.rowid || '',
    UserName: row?.UserName || '',
    LoginName: row?.LoginName || '',
    Sex: (row as any)?.Sex || (row as any)?.Gender || '',
    Age: (row as any)?.Age || '',
    entInfoUserPhone: (row as any)?.entInfoUserPhone || (row as any)?.Phone || '',
    IDCard: (row as any)?.IDCard || '',
    NativePlace: (row as any)?.NativePlace || '',
    Address: (row as any)?.Address || '',
    memo: (row as any)?.memo || '',
  });
}

async function loadData() {
  loading.value = true;
  try {
    const [staffRes, dictMap] = await Promise.all([
      getOrganStaffList(keyword.value),
      getOrganDictMap(),
    ]);
    staffRows.value = staffRes.list || [];
    genderOptions.value = dictMap.gender || [];
    if (!selectedId.value && staffRows.value.length) selectedId.value = text(staffRows.value[0]?.ROWID || staffRows.value[0]?.rowid || staffRows.value[0]?.UserID);
    syncForm(selectedRow.value);
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!text(form.ROWID)) return ElMessage.warning('请先选择员工');
  if (!text(form.UserName)) return ElMessage.warning('姓名不能为空');
  saving.value = true;
  try {
    await saveOrganStaff({ ...selectedRow.value, ...form }, 'edit');
    ElMessage.success('员工基础信息已保存');
    await loadData();
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '员工基础信息保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <Page auto-content-height>
    <div class="hr-staff-basic-page">
      <HrPageIntro
        title="员工基础信息"
        description="将员工基础信息从迁移占位页替换为可编辑表单，支持查看和维护人员主数据。"
        :tags="['Sprint2', 'HR-STAFF-02']"
      >
        <template #actions>
          <ElButton @click="loadData">刷新</ElButton>
          <ElButton type="primary" :loading="saving" @click="submit">保存当前员工</ElButton>
        </template>
      </HrPageIntro>
      <HrAnalyticsPanel :metrics="metrics" />
      <div class="page-grid">
        <ElCard shadow="never" header="员工列表">
          <ElInput v-model="keyword" clearable placeholder="姓名/登录名/部门/岗位" class="mb-12" @keyup.enter="loadData" />
          <ElTable v-loading="loading" border :data="filteredRows" size="small" highlight-current-row @current-change="(row: any) => { selectedId = text(row?.ROWID || row?.rowid || row?.UserID); syncForm(row); }">
            <ElTableColumn prop="UserName" label="姓名" min-width="100" />
            <ElTableColumn prop="DepName" label="部门" min-width="120" />
            <ElTableColumn prop="JobName" label="岗位" min-width="120" />
          </ElTable>
        </ElCard>
        <ElCard shadow="never">
          <template #header>
            <div class="header-line">
              <span>基础信息表单</span>
              <ElTag type="info">{{ selectedRow?.UserName || '未选员工' }}</ElTag>
            </div>
          </template>
          <ElForm label-width="100px">
            <div class="form-grid">
              <ElFormItem label="姓名" required>
                <ElInput v-model="form.UserName" />
              </ElFormItem>
              <ElFormItem label="登录名">
                <ElInput v-model="form.LoginName" disabled />
              </ElFormItem>
              <ElFormItem label="性别">
                <ElSelect v-model="form.Sex" class="w-full">
                  <ElOption v-for="item in genderOptions" :key="item.value" :label="item.label" :value="item.value" />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="年龄">
                <ElInput v-model="form.Age" />
              </ElFormItem>
              <ElFormItem label="手机号">
                <ElInput v-model="form.entInfoUserPhone" />
              </ElFormItem>
              <ElFormItem label="身份证号">
                <ElInput v-model="form.IDCard" />
              </ElFormItem>
              <ElFormItem label="籍贯">
                <ElInput v-model="form.NativePlace" />
              </ElFormItem>
              <ElFormItem label="家庭地址">
                <ElInput v-model="form.Address" />
              </ElFormItem>
              <ElFormItem label="备注" class="span-2">
                <ElInput v-model="form.memo" type="textarea" :rows="4" />
              </ElFormItem>
            </div>
          </ElForm>
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.hr-staff-basic-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
}
.header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.form-grid {
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
.mb-12 {
  margin-bottom: 12px;
}
@media (max-width: 1200px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
</style>
