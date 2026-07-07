<script setup lang="ts">
import type { Staff } from '#/api/common/staff-selector';
import type { CrmLeadParticipantApi } from '#/api/erp/customer/lead/participant';

import { computed, ref, watch } from 'vue';


import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import {
  createLeadParticipant,
  deleteLeadParticipant,
  getLeadParticipantList,
} from '#/api/erp/customer/lead/participant';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElEmpty,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

const props = defineProps<{
  leadId?: number | string;
  leadCode?: string;
  leadName?: string;
  readonly?: boolean;
  allowCreate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const loading = ref(false);
const list = ref<CrmLeadParticipantApi.ParticipantRel[]>([]);
const addDialogVisible = ref(false);
const pickerValue = ref<string | undefined>();
const selectedStaff = ref<Staff | null>(null);

const ready = computed(
  () =>
    !!String(props.leadId || '').trim() ||
    !!String(props.leadCode || '').trim() ||
    !!String(props.leadName || '').trim(),
);
const latestParticipant = computed(() => list.value[0] || null);
const latestJoinTime = computed(() => formatDateTime(latestParticipant.value?.createtime));
const latestDepartment = computed(() => latestParticipant.value?.departName || '-');
const latestName = computed(() => latestParticipant.value?.participantUserName || '-');
const canCreate = computed(
  () => !props.readonly && props.allowCreate !== false && !!String(props.leadId || '').trim(),
);
const selectedDeptName = computed(
  () => String(selectedStaff.value?.DepName || selectedStaff.value?.DepartmentName || '').trim(),
);
const selectedUserName = computed(() => String(selectedStaff.value?.UserName || '').trim());

function formatRoleType(value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '参与人';
  if (normalized === 'PARTICIPANT') return '参与人';
  if (normalized === 'OWNER') return '负责人';
  if (normalized === 'ASSISTANT') return '协同人';
  return normalized;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function resetAddForm() {
  pickerValue.value = undefined;
  selectedStaff.value = null;
}

function openAddDialog() {
  if (!canCreate.value) return;
  resetAddForm();
  addDialogVisible.value = true;
}

async function loadList() {
  if (!ready.value) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    list.value = await getLeadParticipantList({
      leadId: props.leadId,
      leadCode: props.leadCode,
      leadName: props.leadName,
    });
    emit('updated');
  } catch (error) {
    console.error('加载参与人失败:', error);
    ElMessage.error('加载参与人失败');
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function handlePicked(value?: Staff | Staff[]) {
  const row = Array.isArray(value) ? value[0] : value;
  selectedStaff.value = row || null;
  pickerValue.value = row?.ROWID || undefined;
}

async function handleAdd() {
  if (!String(props.leadId || '').trim()) return ElMessage.warning('请先保存线索');
  if (!selectedStaff.value?.ROWID || !selectedStaff.value?.UserName)
    return ElMessage.warning('请选择参与人');
  try {
    await createLeadParticipant({
      leadId: props.leadId,
      leadCode: props.leadCode,
      leadName: props.leadName,
      participantUserId: selectedStaff.value.ROWID,
      participantUserName: selectedStaff.value.UserName,
      departId: selectedStaff.value.DepID,
      departName: selectedStaff.value.DepName,
      roleType: 'PARTICIPANT',
    });
    ElMessage.success('新增参与人成功');
    addDialogVisible.value = false;
    resetAddForm();
    await loadList();
  } catch (error: any) {
    console.error('新增参与人失败:', error);
    ElMessage.error(error?.message || '新增参与人失败');
  }
}

async function handleDelete(row: CrmLeadParticipantApi.ParticipantRel) {
  try {
    await deleteLeadParticipant(String(row.rowid || row.id || ''));
    ElMessage.success('删除参与人成功');
    await loadList();
  } catch (error) {
    console.error('删除参与人失败:', error);
    ElMessage.error('删除参与人失败');
  }
}

watch(
  () => [props.leadId, props.leadCode, props.leadName, props.allowCreate, props.readonly],
  () => {
    loadList();
  },
  { immediate: true },
);

defineExpose({ reload: loadList, openCreate: openAddDialog });
</script>

<template>
  <div class="participant-panel">
    <ElCard shadow="never" class="participant-card">
      <template #header>
        <div class="card-header-row">
          <div>
            <div class="card-title">参与人列表</div>
            <div class="count-text">共 {{ list.length }} 人</div>
          </div>
          <ElButton v-if="canCreate" type="primary" @click="openAddDialog">新增参与人</ElButton>
        </div>
      </template>

      <div v-loading="loading">
        <ElEmpty v-if="!ready" description="缺少线索标识，暂无法展示参与人" />
        <template v-else>
          <div class="participant-summary">
            <div class="summary-item">
              <span>最近新增</span>
              <strong>{{ latestName }}</strong>
            </div>
            <div class="summary-item">
              <span>所属部门</span>
              <strong>{{ latestDepartment }}</strong>
            </div>
            <div class="summary-item">
              <span>加入时间</span>
              <strong>{{ latestJoinTime }}</strong>
            </div>
          </div>

          <ElEmpty v-if="list.length === 0" description="暂无参与人" />
          <ElTable v-else :data="list" stripe style="width: 100%">
            <ElTableColumn type="index" width="60" label="序号" />
            <ElTableColumn prop="participantUserName" label="参与人" min-width="140" />
            <ElTableColumn prop="departName" label="部门" min-width="140" />
            <ElTableColumn label="角色" min-width="120">
              <template #default="{ row }">
                <ElTag size="small" effect="plain">{{ formatRoleType(row.roleType) }}</ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="加入时间" min-width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createtime) }}
              </template>
            </ElTableColumn>
            <ElTableColumn prop="leadCode" label="线索编号" min-width="160" />
            <ElTableColumn prop="leadName" label="线索名称" min-width="180" show-overflow-tooltip />
            <ElTableColumn prop="remark" label="备注" min-width="180" show-overflow-tooltip />
            <ElTableColumn label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <ElButton text type="danger" :disabled="!canCreate" @click="handleDelete(row)">删除</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </template>
      </div>
    </ElCard>

    <ElDialog
      v-model="addDialogVisible"
      title="新增参与人"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
      @closed="resetAddForm"
    >
      <div class="add-dialog-body">
        <div class="dialog-field">
          <span class="dialog-label">参与人</span>
          <StaffPicker
            :model-value="pickerValue"
            placeholder="请选择参与人"
            @update:data="handlePicked"
          />
        </div>
        <div class="dialog-grid">
          <div class="dialog-card">
            <span>已选人员</span>
            <strong>{{ selectedUserName || '-' }}</strong>
          </div>
          <div class="dialog-card">
            <span>所属部门</span>
            <strong>{{ selectedDeptName || '-' }}</strong>
          </div>
        </div>
      </div>
      <template #footer>
        <ElButton @click="addDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleAdd">确定新增</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.participant-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.participant-card {
  border-radius: 14px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.count-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.participant-summary,
.dialog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.participant-summary {
  margin-bottom: 16px;
}

.summary-item,
.dialog-card {
  border-radius: 12px;
  padding: 14px;
  background: var(--el-fill-color-light);
}

.summary-item span,
.dialog-card span,
.dialog-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-item strong,
.dialog-card strong {
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.add-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog-field :deep(.staff-picker),
.dialog-field :deep(.el-select),
.dialog-field :deep(.el-input) {
  width: 100%;
}

.dialog-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .card-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .participant-summary,
  .dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
