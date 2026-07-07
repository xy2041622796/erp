<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Check,
  Clock,
  Download,
  Refresh,
  Search,
  Switch,
  User,
  View,
} from '@element-plus/icons-vue';

import { getStaffByIds } from '#/api/common/staff-selector';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import { applyMemberChange, listData as listMembers, listMemberChangeLogs, updateData as updateMember } from '#/api/erp/project/manage/member';
import ProjectPicker from '#/components/project-picker/ProjectPicker.vue';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';

import MemberChangeModal from './MemberChangeModal.vue';

import {
  ElButton,
  ElCard,
  ElCol,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElEmpty,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRow,
  ElSelect,
  ElSpace,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus';

type ChangeStatus = '待审批' | '审批中' | '已生效' | '已驳回';
type ChangeType = '加入' | '负责人变更' | '退出' | '报账员变更' | '角色变更';
type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info';
type MemberFormType = 'create' | 'edit';

interface RawChangeLog {
  id?: string;
  change_code?: string;
  project_id?: string;
  project_name?: string;
  change_type?: string;
  member_from?: string | null;
  member_to?: string | null;
  role_name?: string | null;
  role_from?: string | null;
  role_to?: string | null;
  operator_name?: string | null;
  createuser?: string | null;
  updateuser?: string | null;
  change_date?: string | null;
  status?: string | null;
  summary?: string | null;
  note?: string | null;
  member_to_name?: string | null;
}

interface DisplayRow {
  id: string;
  projectId: string;
  projectName: string;
  changeType: ChangeType;
  memberName: string;
  originalRole: string;
  nextRole: string;
  applyDate: string;
  status: ChangeStatus;
  operatorName: string;
  summary: string;
  note: string;
}

const route = useRoute();
const activeTab = ref<'current' | 'list' | 'log'>(getInitialTab());
const keyword = ref('');
const memberKeyword = ref('');
const selectedType = ref('全部类型');
const loading = ref(false);
const memberLoading = ref(false);
const rows = ref<DisplayRow[]>([]);
const memberRows = ref<Record<string, any>[]>([]);
const projectOptions = ref<Record<string, any>[]>([]);
const changeModalOpen = ref(false);
const detailOpen = ref(false);
const memberDialogOpen = ref(false);
const memberFormType = ref<MemberFormType>('create');
const currentDetail = ref<DisplayRow | null>(null);

const memberForm = reactive({
  id: '',
  project_id: '',
  employee_id: '',
  employee_name: '',
  role: 'member',
  join_date: '',
  work_hours: 0,
  cost_rate_hour: undefined as number | undefined,
  cost_rate_day: undefined as number | undefined,
  description: '',
});

const routeProjectId = computed(() => {
  const value = Array.isArray(route.query.project_id) ? route.query.project_id[0] : route.query.project_id;
  return String(value ?? '').trim();
});

const typeOptions = ['全部类型', '加入', '负责人变更', '退出', '报账员变更', '角色变更'];
const roleOptions = [
  { label: '负责人', value: 'manager' },
  { label: '组长', value: 'leader' },
  { label: '成员', value: 'member' },
  { label: '报账员', value: 'accountant' },
];

const ROLE_LABEL_MAP: Record<string, string> = {
  manager: '负责人',
  leader: '组长',
  member: '成员',
  accountant: '报账员',
  owner: '负责人',
  reporter: '报账员',
  '负责人': '负责人',
  '组长': '组长',
  '成员': '成员',
  '报账员': '报账员',
};

const stats = computed(() => ({
  current: memberRows.value.length,
  total: rows.value.length,
  pending: rows.value.filter((item) => item.status === '待审批').length,
  active: rows.value.filter((item) => item.status === '已生效').length,
}));

const filteredMembers = computed(() => {
  const text = memberKeyword.value.trim().toLowerCase();
  return memberRows.value.filter((row) => {
    if (!text) return true;
    return [row.project_name, row.employee_name, row.employee_id, row.role_label, row.description]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(text));
  });
});

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return rows.value
    .filter((row) => {
      const matchesKeyword =
        !text ||
        [row.id, row.projectName, row.memberName, row.summary, row.operatorName]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(text));
      const matchesType = selectedType.value === '全部类型' || row.changeType === selectedType.value;
      return matchesKeyword && matchesType;
    })
    .sort((a, b) => b.applyDate.localeCompare(a.applyDate));
});

function getInitialTab() {
  const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab;
  if (tab === 'list' || tab === 'log') return tab;
  return 'current';
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMoney(value: unknown) {
  const num = toNumber(value);
  return num > 0 ? `¥${Number(num.toFixed(2))}` : '-';
}

function getEffectiveHourCost(row: Record<string, any>) {
  const hour = toNumber(row?.cost_rate_hour);
  if (hour > 0) return hour;
  const day = toNumber(row?.cost_rate_day);
  return day > 0 ? Number((day / 8).toFixed(2)) : 0;
}

function mapChangeType(value?: string | null, roleName?: string | null): ChangeType {
  const v = String(value || '').toLowerCase();
  if (v === 'join' || v === '加入') return '加入';
  if (v === 'leave' || v === '退出') return '退出';
  if (v === 'manager_change' || v === '负责人变更') return '负责人变更';
  if (v === 'accountant_change' || v === '报账员变更') return '报账员变更';
  if (v === 'role_change' || v === '角色变更') return '角色变更';
  if (roleName && /负责人/.test(roleName)) return '负责人变更';
  if (roleName && /报账员/.test(roleName)) return '报账员变更';
  return '角色变更';
}

function mapStatus(value?: string | null): ChangeStatus {
  const v = String(value || '');
  if (v === '待审批') return '待审批';
  if (v === '审批中') return '审批中';
  if (v === '已驳回') return '已驳回';
  return '已生效';
}

function getTypeTagType(type: ChangeType): TagType {
  if (type === '加入') return 'success';
  if (type === '退出') return 'danger';
  if (type === '负责人变更') return 'warning';
  if (type === '报账员变更') return 'warning';
  return 'primary';
}

function getStatusTagType(status: ChangeStatus): TagType {
  if (status === '已生效') return 'success';
  if (status === '已驳回') return 'danger';
  if (status === '审批中') return 'primary';
  return 'warning';
}

function getMappedName(map: Map<string, string>, id?: string | null, fallback?: string | null) {
  const key = String(id || '').trim();
  const fallbackText = String(fallback || '').trim();
  if (key && map.has(key)) return map.get(key) || key;
  return fallbackText || key || '-';
}

function mapRoleLabel(value?: string | null) {
  const key = String(value || '').trim();
  if (!key) return '-';
  return ROLE_LABEL_MAP[key] || key;
}

function buildMemberName(item: RawChangeLog, staffMap: Map<string, string>) {
  const from = String(item.member_from || '').trim();
  const to = String(item.member_to || '').trim();
  const fromName = from ? getMappedName(staffMap, from) : '';
  const toName = to ? getMappedName(staffMap, to, item.member_to_name) : '';
  if (fromName && toName) return `${fromName} → ${toName}`;
  return toName || fromName || '-';
}

function buildSummary(
  item: RawChangeLog,
  type: ChangeType,
  memberName: string,
  originalRole: string,
  nextRole: string,
) {
  if (item.summary) return item.summary;
  if (type === '加入') return `${memberName} 加入项目组${nextRole !== '-' ? `（角色：${nextRole}）` : ''}`;
  if (type === '退出') return `${memberName} 退出项目组${originalRole !== '-' ? `（原角色：${originalRole}）` : ''}`;
  return `${type}：${memberName}`;
}

function buildOperatorName(item: RawChangeLog, staffMap: Map<string, string>) {
  const operatorName = String(item.operator_name || '').trim();
  if (operatorName) return operatorName;
  const userId = String(item.createuser || item.updateuser || '').trim();
  if (!userId) return '-';
  return staffMap.get(userId) || userId;
}

function normalizeRow(
  item: RawChangeLog,
  index: number,
  projectMap: Map<string, string>,
  staffMap: Map<string, string>,
): DisplayRow {
  const changeType = mapChangeType(item.change_type, item.role_name);
  const status = mapStatus(item.status);
  const memberName = buildMemberName(item, staffMap);
  const originalRole = mapRoleLabel(item.role_from);
  const nextRole = mapRoleLabel(item.role_to || item.role_name);
  return {
    id: item.change_code || item.id || `MC-${index + 1}`,
    projectId: item.project_id || '',
    projectName: getMappedName(projectMap, item.project_id, item.project_name),
    changeType,
    memberName,
    originalRole,
    nextRole,
    applyDate: formatDate(item.change_date),
    status,
    operatorName: buildOperatorName(item, staffMap),
    summary: buildSummary(item, changeType, memberName, originalRole, nextRole),
    note: item.note || '',
  };
}

function getList(res: any) {
  return Array.isArray(res?.list) ? res.list : Array.isArray(res?.data?.list) ? res.data.list : [];
}

function getTotal(res: any) {
  return Number(res?.total ?? res?.data?.total ?? getList(res).length ?? 0) || 0;
}

async function fetchMembersByPages(projectId = '', page = 500, maxRows = 5000) {
  const rows: Record<string, any>[] = [];
  const params = { pageNo: 1, page, ...(projectId ? { project_id: projectId } : {}) };
  const firstRes = await listMembers(params);
  rows.push(...getList(firstRes));
  const total = getTotal(firstRes);
  const totalPages = Math.ceil(total / page);
  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    if (rows.length >= maxRows) break;
    const res = await listMembers({ ...params, pageNo });
    rows.push(...getList(res));
  }
  return rows.slice(0, maxRows);
}

async function loadMembers() {
  memberLoading.value = true;
  try {
    const list = await fetchMembersByPages(routeProjectId.value);
    memberRows.value = list.map((row) => ({
      ...row,
      role_label: mapRoleLabel(row?.role),
      effective_hour_cost: getEffectiveHourCost(row),
    }));
  } finally {
    memberLoading.value = false;
  }
}

async function loadChangeLogs() {
  loading.value = true;
  try {
    const res = await listMemberChangeLogs({
      pageNo: 1,
      page: 500,
      ...(routeProjectId.value ? { project_id: routeProjectId.value } : {}),
    });
    const list = getList(res);
    const projectIds = Array.from(new Set(list.map((item: RawChangeLog) => String(item.project_id || '').trim()).filter(Boolean)));
    const staffIds = Array.from(
      new Set(
        list
          .flatMap((item: RawChangeLog) => [item.member_from, item.member_to, item.createuser, item.updateuser])
          .map((id: unknown) => String(id || '').trim())
          .filter(Boolean),
      ),
    );

    const [projectList, staffList] = await Promise.all([
      projectIds.length ? getProjectManageSimpleList() : Promise.resolve([]),
      staffIds.length ? getStaffByIds(staffIds) : Promise.resolve([]),
    ]);

    const projectMap = new Map<string, string>();
    for (const project of Array.isArray(projectList) ? projectList : []) {
      const id = String((project as any)?.rowid || '').trim();
      if (!id) continue;
      projectMap.set(id, String((project as any)?.project_name || (project as any)?.project_code || id));
    }

    const staffMap = new Map<string, string>();
    for (const staff of Array.isArray(staffList) ? staffList : []) {
      const id = String((staff as any)?.ROWID || '').trim();
      if (!id) continue;
      staffMap.set(id, String((staff as any)?.UserName || (staff as any)?.LoginName || id));
    }

    rows.value = list.map((item: RawChangeLog, index: number) => normalizeRow(item, index, projectMap, staffMap));
  } finally {
    loading.value = false;
  }
}

async function reloadAll() {
  await Promise.all([loadMembers(), loadChangeLogs()]);
}

function resetMemberForm() {
  memberForm.id = '';
  memberForm.project_id = routeProjectId.value || '';
  memberForm.employee_id = '';
  memberForm.employee_name = '';
  memberForm.role = 'member';
  memberForm.join_date = todayText();
  memberForm.work_hours = 0;
  memberForm.cost_rate_hour = undefined;
  memberForm.cost_rate_day = undefined;
  memberForm.description = '';
}

function openCreateMember() {
  memberFormType.value = 'create';
  resetMemberForm();
  memberDialogOpen.value = true;
}

function openEditMember(row: Record<string, any>) {
  memberFormType.value = 'edit';
  memberForm.id = String(row?.id || '');
  memberForm.project_id = String(row?.project_id || routeProjectId.value || '');
  memberForm.employee_id = String(row?.employee_id || '');
  memberForm.employee_name = String(row?.employee_name || '');
  memberForm.role = String(row?.role || 'member');
  memberForm.join_date = formatDate(row?.join_date) === '-' ? '' : formatDate(row?.join_date);
  memberForm.work_hours = toNumber(row?.work_hours);
  memberForm.cost_rate_hour = toNumber(row?.cost_rate_hour) > 0 ? toNumber(row?.cost_rate_hour) : undefined;
  memberForm.cost_rate_day = toNumber(row?.cost_rate_day) > 0 ? toNumber(row?.cost_rate_day) : undefined;
  memberForm.description = String(row?.description || '');
  memberDialogOpen.value = true;
}

function handlePickedMember(value?: Staff | Staff[]) {
  const staff = Array.isArray(value) ? value[0] : value;
  memberForm.employee_id = staff?.ROWID || '';
  memberForm.employee_name = staff?.UserName || '';
}

function validateMemberCost() {
  const hour = toNumber(memberForm.cost_rate_hour);
  const day = toNumber(memberForm.cost_rate_day);
  if (hour > 0 && day > 0) {
    ElMessage.warning('小时成本和日成本只能填写一个');
    return false;
  }
  if (hour <= 0 && day <= 0) {
    ElMessage.warning('请填写小时成本或日成本');
    return false;
  }
  return true;
}

async function submitMember() {
  if (!String(memberForm.project_id || '').trim()) {
    ElMessage.warning('请选择项目');
    return;
  }
  if (!String(memberForm.employee_id || '').trim()) {
    ElMessage.warning('请选择成员');
    return;
  }
  if (!String(memberForm.role || '').trim()) {
    ElMessage.warning('请选择角色');
    return;
  }
  if (!validateMemberCost()) return;
  if (memberFormType.value === 'create') {
    await applyMemberChange({
      project_id: memberForm.project_id,
      change_type: 'join',
      member_to: memberForm.employee_id,
      member_to_name: memberForm.employee_name,
      role_to: memberForm.role,
      change_date: memberForm.join_date || todayText(),
      work_hours: memberForm.work_hours,
      cost_rate_hour: memberForm.cost_rate_hour,
      cost_rate_day: memberForm.cost_rate_day,
      description: memberForm.description,
      summary: `${memberForm.employee_name || memberForm.employee_id} 加入项目组`,
    });
  } else {
    await updateMember({
      id: memberForm.id,
      project_id: memberForm.project_id,
      employee_id: memberForm.employee_id,
      role: memberForm.role,
      join_date: memberForm.join_date,
      work_hours: memberForm.work_hours,
      cost_rate_hour: toNumber(memberForm.cost_rate_hour) > 0 ? memberForm.cost_rate_hour : null,
      cost_rate_day: toNumber(memberForm.cost_rate_day) > 0 ? memberForm.cost_rate_day : null,
      description: memberForm.description,
    });
  }
  memberDialogOpen.value = false;
  ElMessage.success('操作成功');
  await reloadAll();
}

async function exitMember(row: Record<string, any>) {
  await ElMessageBox.confirm(`确认让 ${row?.employee_name || row?.employee_id || '该成员'} 退出当前项目吗？退出后当前成员台账将删除该成员。`, '退出成员', { type: 'warning' });
  await applyMemberChange({
    project_id: row?.project_id,
    change_type: 'leave',
    member_to: row?.employee_id,
    member_to_name: row?.employee_name,
    role_from: row?.role,
    change_date: todayText(),
    summary: `${row?.employee_name || row?.employee_id || '成员'} 退出项目组`,
  });
  ElMessage.success('成员已退出');
  await reloadAll();
}

function openMemberChange() {
  changeModalOpen.value = true;
}

function openDetail(row: DisplayRow) {
  currentDetail.value = row;
  detailOpen.value = true;
}

async function handleMemberChangeSuccess() {
  await reloadAll();
}

onMounted(() => {
  void reloadAll();
});
</script>

<template>
  <Page auto-content-height>
    <div class="member-change-page">
      <ElRow :gutter="16" class="stat-row">
        <ElCol :xs="24" :sm="12" :lg="6">
          <ElCard shadow="never" class="stat-card"><div class="stat-content"><div><div class="stat-label">当前成员</div><div class="stat-value">{{ stats.current }}</div></div><div class="stat-icon stat-icon-blue"><ElIcon size="24"><User /></ElIcon></div></div></ElCard>
        </ElCol>
        <ElCol :xs="24" :sm="12" :lg="6">
          <ElCard shadow="never" class="stat-card"><div class="stat-content"><div><div class="stat-label">变更记录</div><div class="stat-value">{{ stats.total }}</div></div><div class="stat-icon stat-icon-blue"><ElIcon size="24"><Switch /></ElIcon></div></div></ElCard>
        </ElCol>
        <ElCol :xs="24" :sm="12" :lg="6">
          <ElCard shadow="never" class="stat-card"><div class="stat-content"><div><div class="stat-label">待审批</div><div class="stat-value stat-warning">{{ stats.pending }}</div></div><div class="stat-icon stat-icon-warning"><ElIcon size="24"><Clock /></ElIcon></div></div></ElCard>
        </ElCol>
        <ElCol :xs="24" :sm="12" :lg="6">
          <ElCard shadow="never" class="stat-card"><div class="stat-content"><div><div class="stat-label">已生效</div><div class="stat-value stat-success">{{ stats.active }}</div></div><div class="stat-icon stat-icon-success"><ElIcon size="24"><Check /></ElIcon></div></div></ElCard>
        </ElCol>
      </ElRow>

      <ElCard shadow="never" class="content-card">
        <ElTabs v-model="activeTab">
          <ElTabPane label="当前成员" name="current">
            <div class="filter-bar current-member-toolbar">
              <ElInput v-model="memberKeyword" :prefix-icon="Search" clearable placeholder="搜索项目、成员、角色、备注" class="filter-keyword" />
              <div class="filter-count">共 {{ filteredMembers.length }} 名成员</div>
              <ElSpace class="toolbar-actions">
                <ElButton :icon="Refresh" @click="reloadAll">刷新</ElButton>
                <ElButton type="primary" @click="openCreateMember">新增成员</ElButton>
              </ElSpace>
            </div>
            <ElTable v-loading="memberLoading" :data="filteredMembers" border stripe height="520" class="change-table">
              <ElTableColumn type="index" label="序号" width="70" fixed="left" align="center" />
              <ElTableColumn prop="project_name" label="项目名称" min-width="220" show-overflow-tooltip />
              <ElTableColumn prop="employee_name" label="成员" min-width="160" show-overflow-tooltip />
              <ElTableColumn prop="role_label" label="角色" min-width="100" align="center" />
              <ElTableColumn prop="join_date" label="加入日期" min-width="120"><template #default="{ row }">{{ formatDate(row.join_date) }}</template></ElTableColumn>
              <ElTableColumn prop="work_hours" label="计划工时" min-width="110" align="right" />
              <ElTableColumn prop="cost_rate_hour" label="小时成本" min-width="110" align="right"><template #default="{ row }">{{ formatMoney(row.cost_rate_hour) }}</template></ElTableColumn>
              <ElTableColumn prop="cost_rate_day" label="日成本" min-width="110" align="right"><template #default="{ row }">{{ formatMoney(row.cost_rate_day) }}</template></ElTableColumn>
              <ElTableColumn prop="effective_hour_cost" label="折算小时成本" min-width="130" align="right"><template #default="{ row }">{{ formatMoney(row.effective_hour_cost) }}</template></ElTableColumn>
              <ElTableColumn label="操作" width="150" fixed="right" align="center">
                <template #default="{ row }">
                  <ElButton link type="primary" @click="openEditMember(row)">编辑</ElButton>
                  <ElButton link type="danger" @click="exitMember(row)">退出</ElButton>
                </template>
              </ElTableColumn>
              <template #empty><ElEmpty description="暂无当前成员" /></template>
            </ElTable>
          </ElTabPane>

          <ElTabPane label="成员变更" name="list">
            <div class="list-toolbar">
              <ElSpace>
                <ElButton :icon="Refresh" @click="reloadAll">刷新</ElButton>
                <ElButton :icon="Download">导出</ElButton>
                <ElButton type="primary" @click="openMemberChange">发起变更</ElButton>
              </ElSpace>
            </div>
            <div class="filter-bar">
              <ElInput v-model="keyword" :prefix-icon="Search" clearable placeholder="搜索项目、成员、摘要、操作人" class="filter-keyword" />
              <ElSelect v-model="selectedType" class="filter-type"><ElOption v-for="item in typeOptions" :key="item" :label="item" :value="item" /></ElSelect>
              <div class="filter-count">共 {{ filteredRows.length }} 条记录</div>
            </div>
            <ElTable v-loading="loading" :data="filteredRows" border stripe height="520" class="change-table">
              <ElTableColumn type="index" label="序号" width="70" fixed="left" align="center" />
              <ElTableColumn prop="projectName" label="项目名称" min-width="220" show-overflow-tooltip />
              <ElTableColumn prop="changeType" label="变更类型" min-width="120" align="center"><template #default="{ row }"><ElTag :type="getTypeTagType(row.changeType)">{{ row.changeType }}</ElTag></template></ElTableColumn>
              <ElTableColumn prop="memberName" label="变更成员" min-width="160" show-overflow-tooltip />
              <ElTableColumn prop="originalRole" label="原角色" min-width="110" />
              <ElTableColumn prop="nextRole" label="新角色" min-width="110" />
              <ElTableColumn prop="applyDate" label="申请时间" min-width="120" />
              <ElTableColumn prop="status" label="状态" min-width="110" align="center"><template #default="{ row }"><ElTag :type="getStatusTagType(row.status)">{{ row.status }}</ElTag></template></ElTableColumn>
              <ElTableColumn label="操作" width="90" fixed="right" align="center"><template #default="{ row }"><ElButton link type="primary" :icon="View" @click="openDetail(row)">查看</ElButton></template></ElTableColumn>
              <template #empty><ElEmpty description="暂无接口数据" /></template>
            </ElTable>
          </ElTabPane>

          <ElTabPane label="变更日志" name="log">
            <div v-loading="loading" class="timeline-wrap">
              <ElEmpty v-if="!loading && filteredRows.length === 0" description="暂无接口数据" />
              <ElTimeline v-else>
                <ElTimelineItem v-for="row in filteredRows" :key="`log-${row.id}`" :timestamp="row.applyDate" placement="top" type="primary">
                  <ElCard shadow="never" class="timeline-card"><div class="timeline-title">{{ row.summary }}</div><div class="timeline-meta">{{ row.projectName }}</div><div class="timeline-meta">操作人：{{ row.operatorName || '-' }}</div></ElCard>
                </ElTimelineItem>
              </ElTimeline>
            </div>
          </ElTabPane>
        </ElTabs>
      </ElCard>

      <MemberChangeModal v-model="changeModalOpen" :project-id="routeProjectId" @success="handleMemberChangeSuccess" />

      <ElDialog v-model="memberDialogOpen" :title="memberFormType === 'create' ? '新增成员' : '编辑成员'" width="720px" destroy-on-close>
        <div class="member-form-grid">
          <label>项目</label>
          <ProjectPicker v-model="memberForm.project_id" class="!w-full" placeholder="请选择项目" :disabled="memberFormType === 'edit'" />
          <label>成员</label>
          <StaffPicker v-if="memberFormType === 'create'" v-model="memberForm.employee_id" placeholder="请选择成员" @update:data="handlePickedMember" />
          <ElInput v-else v-model="memberForm.employee_name" disabled />
          <label>角色</label>
          <ElSelect v-model="memberForm.role" class="!w-full"><ElOption v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" /></ElSelect>
          <label>加入日期</label>
          <ElDatePicker v-model="memberForm.join_date" type="date" value-format="YYYY-MM-DD" class="!w-full" />
          <label>计划投入工时</label>
          <ElInputNumber v-model="memberForm.work_hours" :min="0" :precision="1" class="!w-full" />
          <label>小时成本</label>
          <ElInputNumber v-model="memberForm.cost_rate_hour" :min="0" :precision="2" class="!w-full" placeholder="小时成本和日成本二选一" />
          <label>日成本</label>
          <ElInputNumber v-model="memberForm.cost_rate_day" :min="0" :precision="2" class="!w-full" placeholder="小时成本和日成本二选一" />
          <label>成本备注</label>
          <ElInput v-model="memberForm.description" type="textarea" :rows="3" placeholder="可填写单价来源、审批依据等" />
        </div>
        <template #footer>
          <ElButton @click="memberDialogOpen = false">取消</ElButton>
          <ElButton type="primary" @click="submitMember">保存</ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="detailOpen" title="成员变更详情" width="720px" destroy-on-close>
        <ElDescriptions v-if="currentDetail" :column="2" border>
          <ElDescriptionsItem label="项目名称" :span="2">{{ currentDetail.projectName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="变更类型"><ElTag :type="getTypeTagType(currentDetail.changeType)">{{ currentDetail.changeType }}</ElTag></ElDescriptionsItem>
          <ElDescriptionsItem label="状态"><ElTag :type="getStatusTagType(currentDetail.status)">{{ currentDetail.status }}</ElTag></ElDescriptionsItem>
          <ElDescriptionsItem label="变更成员" :span="2">{{ currentDetail.memberName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="原角色">{{ currentDetail.originalRole }}</ElDescriptionsItem>
          <ElDescriptionsItem label="新角色">{{ currentDetail.nextRole }}</ElDescriptionsItem>
          <ElDescriptionsItem label="申请时间">{{ currentDetail.applyDate }}</ElDescriptionsItem>
          <ElDescriptionsItem label="操作人">{{ currentDetail.operatorName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="摘要" :span="2">{{ currentDetail.summary || '-' }}</ElDescriptionsItem>
          <ElDescriptionsItem label="备注" :span="2">{{ currentDetail.note || '-' }}</ElDescriptionsItem>
        </ElDescriptions>
        <template #footer><ElButton @click="detailOpen = false">关闭</ElButton></template>
      </ElDialog>
    </div>
  </Page>
</template>

<style scoped>
.member-change-page { padding: 16px; }
.stat-card,.content-card { border: 1px solid var(--el-border-color-light); border-radius: 8px; }
.list-toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.stat-row { margin-top: 16px; }
.stat-card { margin-bottom: 16px; }
.stat-content { display: flex; align-items: center; justify-content: space-between; }
.stat-label { color: var(--el-text-color-secondary); font-size: 14px; }
.stat-value { margin-top: 8px; color: var(--el-text-color-primary); font-size: 24px; font-weight: 600; line-height: 1; }
.stat-warning { color: var(--el-color-warning); }
.stat-success { color: var(--el-color-success); }
.stat-icon { display: flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 50%; }
.stat-icon-blue { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.stat-icon-warning { color: var(--el-color-warning); background: var(--el-color-warning-light-9); }
.stat-icon-success { color: var(--el-color-success); background: var(--el-color-success-light-9); }
.content-card { margin-top: 0; }
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.current-member-toolbar { justify-content: space-between; }
.toolbar-actions { flex-shrink: 0; }
.filter-keyword { flex: 1; }
.filter-type { width: 180px; }
.filter-count { flex-shrink: 0; color: var(--el-text-color-secondary); font-size: 14px; }
.change-table { width: 100%; }
.timeline-wrap { min-height: 360px; padding: 8px 4px 0; }
.timeline-card { border-radius: 8px; }
.timeline-title { color: var(--el-text-color-primary); font-size: 15px; font-weight: 600; }
.timeline-meta { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 13px; }
.member-form-grid { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 14px 16px; align-items: center; }
.member-form-grid label { color: var(--el-text-color-regular); font-weight: 600; text-align: right; }
@media (max-width: 768px) {
  .filter-bar { align-items: stretch; flex-direction: column; }
  .filter-type { width: 100%; }
  .toolbar-actions { justify-content: flex-end; }
  .member-form-grid { grid-template-columns: 1fr; }
  .member-form-grid label { text-align: left; }
}
</style>
