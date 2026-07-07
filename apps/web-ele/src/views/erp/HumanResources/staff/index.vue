<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Plus } from '@element-plus/icons-vue';
import {
  deleteOrganStaff,
  getOrganDictMap,
  getOrganStaffList,
  saveOrganStaff,
  type OrganUser,
} from '#/api/erp/human-resources/organ';

import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElLink,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

interface DictOption {
  label: string;
  value: string;
}

const loading = ref(false);
const saving = ref(false);
const rows = ref<OrganUser[]>([]);
const keyword = ref('');
const currentPage = ref(1);
const page = ref(20);
const tableHeight = ref(360);
const dialogVisible = ref(false);
const dialogMode = ref<'add' | 'edit'>('add');
const form = ref<Partial<OrganUser>>({ UserName: '', LoginName: '' });
const genderOptions = ref<DictOption[]>([
  { label: '男', value: 'M' },
  { label: '女', value: 'F' },
]);

function text(v: unknown) {
  return String(v ?? '').trim();
}

function nameOf(r: any) {
  return text(r.UserName || r.Name);
}

function loginOf(r: any) {
  return text(r.LoginName || r.UserID);
}

function keyOf(r: any) {
  return text(r.ROWID || r.rowid || r.UserID || r.LoginName);
}

function formatDateYmd(value: unknown) {
  const raw = text(value);
  if (!raw) return '';
  const compact = raw.replace(/[^0-9]/g, '');
  if (compact.length >= 8) return compact.slice(0, 4) + '-' + compact.slice(4, 6) + '-' + compact.slice(6, 8);
  return raw;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '');
}

function normalizeHtmlBreaks(value: string) {
  return value
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/\r?\n/g, '<br>');
}

function htmlCell(value: unknown) {
  const raw = normalizeHtmlBreaks(text(value));
  if (!raw) return '';

  return raw
    .split(/<br\s*\/?>/gi)
    .map((line) => stripHtml(line).trim())
    .filter(Boolean)
    .map((line) => {
      const safe = escapeHtml(line);
      return `<a class="html-cell-link" href="javascript:void(0)" data-value="${safe}">${safe}</a>`;
    })
    .join('<br>');
}

function deptJobHtml(row: any) {
  const dep = text(row.DepName || row.depName || row.departmentName || row.DepartmentName);
  const job = text(row.JobName || row.user_jobs || row.jobName || row.JobNames);
  if (dep && job) return htmlCell(`${dep}；岗位(${job})`);
  return htmlCell(job || dep);
}

function handleHtmlCellClick(event: MouseEvent, row: OrganUser) {
  const target = event.target as HTMLElement | null;
  const link = target?.closest?.('.html-cell-link') as HTMLElement | null;
  if (!link) return;
  openEdit(row);
}

function isSex(value: string) {
  const current = text((form.value as any).Sex || (form.value as any).Gender);
  if (value === 'M') return ['M', 'm', '男', '1'].includes(current);
  return ['F', 'f', '女', '0'].includes(current);
}

function setSex(value: string) {
  (form.value as any).Sex = value;
}

function isMarital(value: string) {
  return text((form.value as any).MaritalStatus) === value;
}

function setMarital(value: string) {
  (form.value as any).MaritalStatus = value;
}

function isAccountPassed(value: number) {
  const current = (form.value as any).State ?? (form.value as any).flowstate;
  return Number(current) === value;
}

function setAccountPassed(value: number) {
  (form.value as any).State = value;
}

function staffPhotoUrl(row: any = form.value) {
  const fields = [
    'PhotoUrl',
    'photoUrl',
    'Photo',
    'photo',
    'PictureUrl',
    'pictureUrl',
    'ImageUrl',
    'imageUrl',
    'ImgUrl',
    'imgUrl',
    'Avatar',
    'avatar',
    'HeadImage',
    'headImage',
    'HeadImg',
    'headImg',
    'Portrait',
    'portrait',
    'PhotoPath',
    'photoPath',
  ];

  for (const field of fields) {
    const value = text(row?.[field]);
    if (value) return value;
  }
  return '';
}

const filtered = computed(() => rows.value.filter((r: any) => !keyword.value || nameOf(r).includes(keyword.value) || loginOf(r).includes(keyword.value)));
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * page.value, currentPage.value * page.value));

function updateTableHeight() {
  // 页面标题、查询栏、分页栏及上下留白约 210px；最小高度保证小屏可用
  tableHeight.value = Math.max(320, window.innerHeight - 210);
}

async function loadDicts() {
  const d = await getOrganDictMap();
  if (d.gender.length) genderOptions.value = d.gender;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getOrganStaffList(keyword.value);
    rows.value = res.list;
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  dialogMode.value = 'add';
  form.value = { UserName: '', LoginName: '', Sex: 'M', MaritalStatus: '未婚', State: 1 };
  dialogVisible.value = true;
}

function openEdit(row: OrganUser) {
  dialogMode.value = 'edit';
  form.value = { ...row };
  dialogVisible.value = true;
}

async function submit() {
  if (!nameOf(form.value)) return ElMessage.warning('请输入姓名');
  saving.value = true;
  try {
    await saveOrganStaff(form.value, dialogMode.value);
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}

async function remove(row: OrganUser) {
  await deleteOrganStaff(row);
  ElMessage.success('删除成功');
  await loadData();
}

onMounted(async () => {
  updateTableHeight();
  window.addEventListener('resize', updateTableHeight);
  await loadDicts();
  await loadData();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableHeight);
});
</script>

<template>
  <Page auto-content-height class="hr-page">
    <div class="staff-page">
      <div class="title-row">
        <span>人员管理</span>
        <ElButton :icon="Plus" type="primary" @click="openAdd">新建</ElButton>
      </div>
      <div class="filter-row">
        <ElInput v-model="keyword" clearable placeholder="姓名/登录名" @keyup.enter="loadData" />
        <ElButton type="primary" @click="loadData">查询</ElButton>
      </div>

      <ElTable v-loading="loading" border :data="paged" :height="tableHeight" :row-key="keyOf" size="small">
        <ElTableColumn align="center" label="序号" type="index" width="60" />
        <ElTableColumn label="姓名" width="90">
          <template #default="{ row = {}} = {}">{{ nameOf(row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="登录名" width="120">
          <template #default="{ row = {}} = {}">{{ loginOf(row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="性别" width="70">
          <template #default="{ row = {}} = {}">{{ row.Sex || row.Gender || '男' }}</template>
        </ElTableColumn>
        <ElTableColumn label="年龄" width="60">
          <template #default="{ row = {}} = {}">{{ row.Age || '' }}</template>
        </ElTableColumn>
        <ElTableColumn label="出生日期" width="130">
          <template #default="{ row = {}} = {}">{{ formatDateYmd(row.Birthday || row.BirthDate || '') }}</template>
        </ElTableColumn>
        <ElTableColumn label="手机号" width="150">
          <template #default="{ row = {}} = {}">{{ row.entInfoUserPhone || row.Phone || row.Mobile || '' }}</template>
        </ElTableColumn>
        <ElTableColumn label="部门/岗位" min-width="360">
          <template #default="{ row = {}} = {}">
            <div class="html-cell" @click="handleHtmlCellClick($event, row)" v-html="deptJobHtml(row)"></div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="担任角色" min-width="520">
          <template #default="{ row = {}} = {}">
            <div class="html-cell" @click="handleHtmlCellClick($event, row)" v-html="htmlCell(row.RoleNames || row.Roles || '')"></div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="权限查看" width="260">
          <template #default="{ row = {}} = {}">
            <div class="html-cell" @click="handleHtmlCellClick($event, row)" v-html="htmlCell(row.AuthNames || row.PermissionNames || '')"></div>
          </template>
        </ElTableColumn>
        <ElTableColumn align="center" fixed="right" label="操作" width="140">
          <template #default="{ row = {}} = {}">
            <ElLink type="primary" @click="openEdit(row)">编辑</ElLink>
            <ElLink class="ml" type="danger" @click="remove(row)">删除</ElLink>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="pager">
        <ElPagination v-model:current-page="currentPage" v-model:page-size="page" background layout="prev, pager, next" :total="filtered.length" />
        <span>1页中的1页（{{ filtered.length }}项）</span>
      </div>
    </div>

    <ElDialog v-model="dialogVisible" :title="dialogMode === 'add' ? '人员新增' : '人员编辑'" width="1000px" class="staff-edit-dialog" destroy-on-close>
      <ElForm :model="form" class="staff-edit-form" label-position="right" label-width="86px">
        <div class="edit-layout">
          <div class="edit-fields">
            <div class="edit-grid">
              <ElFormItem label="姓名" required>
                <ElInput v-model="form.UserName" />
              </ElFormItem>

              <ElFormItem label="性别" required>
                <div class="check-line">
                  <ElCheckbox :model-value="isSex('M')" @change="setSex('M')">男</ElCheckbox>
                  <ElCheckbox :model-value="isSex('F')" @change="setSex('F')">女</ElCheckbox>
                </div>
              </ElFormItem>

              <ElFormItem label="登录名" required>
                <ElInput v-model="form.LoginName" />
              </ElFormItem>

              <ElFormItem label="密码" required>
                <ElInput v-model="(form as any).LoginPass" show-password type="password" />
              </ElFormItem>

              <ElFormItem label="身份证号" required>
                <ElInput v-model="(form as any).IDCard" />
              </ElFormItem>

              <ElFormItem label="民族" required>
                <ElSelect v-model="(form as any).Nation" class="w-full" filterable allow-create default-first-option>
                  <ElOption label="汉族" value="汉族" />
                  <ElOption label="回族" value="回族" />
                  <ElOption label="满族" value="满族" />
                  <ElOption label="蒙古族" value="蒙古族" />
                  <ElOption label="壮族" value="壮族" />
                </ElSelect>
              </ElFormItem>

              <ElFormItem label="婚姻状况">
                <div class="check-line">
                  <ElCheckbox :model-value="isMarital('已婚')" @change="setMarital('已婚')">已婚</ElCheckbox>
                  <ElCheckbox :model-value="isMarital('未婚')" @change="setMarital('未婚')">未婚</ElCheckbox>
                </div>
              </ElFormItem>

              <ElFormItem label="年龄">
                <ElInput v-model="(form as any).Age" />
              </ElFormItem>

              <ElFormItem label="账号状态" required>
                <div class="check-line">
                  <ElCheckbox :model-value="isAccountPassed(0)" @change="setAccountPassed(0)">未通过</ElCheckbox>
                  <ElCheckbox :model-value="isAccountPassed(1)" @change="setAccountPassed(1)">已通过</ElCheckbox>
                </div>
              </ElFormItem>

              <ElFormItem label="籍贯" class="span-right">
                <ElInput v-model="(form as any).NativePlace" />
              </ElFormItem>
            </div>

            <ElFormItem label="户口地" class="wide-item">
              <ElInput v-model="(form as any).PermanentTenancy" />
            </ElFormItem>

            <ElFormItem label="家庭地址" class="wide-item">
              <ElInput v-model="(form as any).Address" />
            </ElFormItem>

            <ElFormItem label="备注" class="wide-item">
              <ElInput v-model="(form as any).memo" :rows="3" type="textarea" />
            </ElFormItem>
          </div>

          <div class="photo-box">
            <img v-if="staffPhotoUrl()" class="staff-photo" :src="staffPhotoUrl()" alt="人员图片" />
            <div v-else class="photo-placeholder">
              <div class="photo-icon">▧</div>
              <div>暂无图片</div>
            </div>
          </div>
        </div>
      </ElForm>

      <template #footer>
        <div class="dialog-footer-bar">
          <ElButton class="footer-btn" @click="dialogVisible = false">取消</ElButton>
          <ElButton class="footer-btn" :loading="saving" type="primary" @click="submit">保存</ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>

<style scoped>
.hr-page :deep(.page-content) {
  padding: 0;
}
.staff-page {
  background: #fff;
}
.title-row {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #e5e7eb;
}
.filter-row {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #e5e7eb;
}
.filter-row .el-input {
  width: 220px;
}
.pager {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: #909399;
  font-size: 12px;
}
.ml {
  margin-left: 14px;
}
.html-cell {
  line-height: 24px;
  white-space: normal;
  word-break: break-all;
}
.html-cell :deep(.html-cell-link) {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: none;
}
.html-cell :deep(.html-cell-link:hover) {
  text-decoration: underline;
}
.staff-edit-dialog :deep(.el-dialog__header) {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eef0f3;
  margin-right: 0;
}
.staff-edit-dialog :deep(.el-dialog__title) {
  padding-left: 8px;
  border-left: 3px solid var(--el-color-primary);
  font-size: 16px;
  font-weight: 600;
}
.staff-edit-dialog :deep(.el-dialog__body) {
  padding: 18px 16px 0;
}
.staff-edit-dialog :deep(.el-dialog__footer) {
  padding: 0 16px 18px;
}
.staff-edit-form :deep(.el-form-item) {
  margin-bottom: 10px;
}
.staff-edit-form :deep(.el-form-item__label) {
  color: #606266;
}
.edit-layout {
  display: grid;
  grid-template-columns: 1fr 310px;
  column-gap: 18px;
}
.edit-fields {
  min-width: 0;
}
.edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 28px;
}
.edit-grid :deep(.el-input),
.wide-item :deep(.el-input),
.wide-item :deep(.el-textarea),
.edit-grid :deep(.el-select) {
  width: 100%;
}
.check-line {
  height: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.photo-box {
  height: 184px;
  background: #fafafa;
  border-left: 1px solid #eef0f3;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.staff-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.photo-placeholder {
  color: #c7c7c7;
  font-size: 28px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}
.photo-icon {
  font-size: 76px;
  line-height: 72px;
  opacity: 0.7;
}
.dialog-footer-bar {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
}
.footer-btn {
  width: 100px;
}
</style>
