<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { ErpProjectManageApi } from '#/api/erp/project/manage';
import type { ProjectManageAttachment } from '#/api/erp/project/manage/attachment';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { useVbenForm, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, generateUUID } from '@vben/utils';


import { getStaffById, getStaffList } from '#/api/common/staff-selector';
import {
  createProjectManage,
  getProjectManage,
  updateProjectManage,
} from '#/api/erp/project/manage';
import {
  createProjectManageAttachment,
  deleteProjectManageAttachment,
  downloadProjectManageAttachment,
  getProjectManageAttachments,
  PROJECT_MANAGE_ATTACH_OWNER_TYPE,
  uploadProjectManageAttachment,
} from '#/api/erp/project/manage/attachment';
import { applyMemberChange } from '#/api/erp/project/manage/member';
import { getCurrentUserBoundDeptInfo } from '#/api/system/dept';
import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import FileUpload from '#/components/upload/file-upload.vue';

import { useProjectManageFormSchema } from '../data';

import {
  ElButton,
  ElInput,
  ElLink,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = PROJECT_MANAGE_ATTACH_OWNER_TYPE;

const emit = defineEmits(['success']);

const formData = ref<ErpProjectManageApi.Project>();
const userStore = useUserStore();
const formType = ref<'create' | 'edit' | 'detail'>('create');
const saving = ref(false);
const customerId = ref<string | undefined>();
const managerStaffId = ref<string | undefined>();
const managerName = ref('');
const managerDeptName = ref('');
const uploadKey = ref(0);
const attachments = ref<ProjectManageAttachment[]>([]);
const draftAttachments = ref<ProjectManageAttachment[]>([]);
const attachmentRows = computed(() => attachments.value as any[]);

function getCurrentDocId() {
  return String(formData.value?.rowid || '').trim() || undefined;
}

function normalizeDateString(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'undefined') return undefined;
  return str.includes('T') ? str.split('T')[0] : str;
}

function normalizeNullableString(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str || undefined;
}

function normalizeProgress(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, Math.round(num)));
}

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentUserInfo() {
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    userId: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    userName: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
}

async function applyCurrentUserDefaults() {
  const currentUser = getCurrentUserInfo();
  const deptInfo = await getCurrentUserBoundDeptInfo().catch(() => ({ deptId: '', deptName: '' }));
  managerStaffId.value = currentUser.userId || undefined;
  managerName.value = currentUser.userName || '';
  managerDeptName.value = String(deptInfo?.deptName || '').trim();
  await formApi.setValues({
    project_code: generateProjectCode(),
    project_status: 0,
    progress: 0,
    priority: 'normal',
    project_Manager: currentUser.userName || undefined,
    project_depart: String(deptInfo?.deptName || '').trim() || undefined,
    project_manager_id: currentUser.userId || undefined,
    project_depart_id: String(deptInfo?.deptId || '').trim() || undefined,
  });
}

async function loadAttachments(docId?: string | number) {
  if (!docId) {
    attachments.value = [];
    return;
  }
  try {
    attachments.value = await getProjectManageAttachments(docId);
  } catch (error) {
    console.error('加载项目附件失败:', error);
    attachments.value = [];
  }
}

function formatAttachmentSize(size?: number) {
  if (!size || size <= 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function toAttachmentItem(payload: FileUploadSuccessPayload): ProjectManageAttachment {
  const fileName = payload?.fileName || '';
  return {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
    owner_type: ATTACH_OWNER_TYPE,
  };
}

async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) {
  const docId = getCurrentDocId();
  const item = toAttachmentItem(payload);
  if (!docId) {
    draftAttachments.value.push(item);
    attachments.value.push(item);
    uploadKey.value++;
    return;
  }
  await createProjectManageAttachment(docId, {
    fileName: item.file_name,
    file_path: item.file_path,
    fileSize: item.file_size,
    fileType: item.file_type,
    owner_type: ATTACH_OWNER_TYPE,
    pid: docId,
  });
  await loadAttachments(docId);
  uploadKey.value++;
}

async function persistDraftAttachments(docId: string | number) {
  if (!draftAttachments.value.length) return;
  await Promise.all(
    draftAttachments.value.map((it) =>
      createProjectManageAttachment(docId, {
        fileName: it.file_name,
        file_path: it.file_path,
        fileSize: it.file_size,
        fileType: it.file_type,
        owner_type: ATTACH_OWNER_TYPE,
        pid: docId,
      }),
    ),
  );
  draftAttachments.value = [];
  await loadAttachments(docId);
}

async function syncCreatedProjectManager(payload: Record<string, any>) {
  const projectId = String(payload?.rowid || '').trim();
  const managerId = String(payload?.project_manager_id || '').trim();
  if (!projectId || !managerId) return true;

  try {
    await applyMemberChange({
      project_id: projectId,
      change_type: 'manager_change',
      member_to: managerId,
      member_to_name: String(payload?.project_Manager || '').trim(),
      role_to: 'manager',
      change_date: normalizeDateString(payload?.project_start_date) || getTodayYmd(),
      summary: '项目建档同步负责人',
      note: '项目建档保存时自动将负责人同步为项目成员。',
    });
    return true;
  } catch (error) {
    console.error('[project-manage-form] sync created project manager failed:', error);
    ElMessage.warning('项目已保存，但负责人同步到项目成员失败，请在成员变更中手动处理');
    return false;
  }
}

async function handleDownloadAttachment(row: ProjectManageAttachment) {
  if (!row.file_name || !row.file_path) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  try {
    const blob = await downloadProjectManageAttachment(row.file_name, row.file_path);
    downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
  } catch (error) {
    console.error('下载项目附件失败:', error);
    ElMessage.error('下载附件失败');
  }
}

async function handleDeleteAttachment(row: ProjectManageAttachment, index: number) {
  const docId = getCurrentDocId();
  if (docId && row.id) {
    await deleteProjectManageAttachment(row.id as any);
    ElMessage.success('删除附件成功');
    await loadAttachments(docId);
    return;
  }
  attachments.value.splice(index, 1);
  draftAttachments.value = draftAttachments.value.filter(
    (it) =>
      !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size),
  );
  ElMessage.success('删除附件成功');
}

function clearManagerFields() {
  managerStaffId.value = undefined;
  managerName.value = '';
  managerDeptName.value = '';
  formApi.setValues(
    {
      project_Manager: undefined,
      project_depart: undefined,
      project_manager_id: undefined,
      project_depart_id: undefined,
    },
    false,
  );
}

function normalizePickerValue(value?: string | number | Array<string | number>) {
  if (Array.isArray(value)) return value.length ? String(value[0]) : undefined;
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function normalizePickedStaff(value?: Staff | Staff[]) {
  return Array.isArray(value) ? value[0] : value;
}

function handleCustomerIdChange(v?: string | number | Array<string | number>) {
  const next = normalizePickerValue(v);
  customerId.value = next;
  formApi.setValues({ customer_id: next }, false);
}

function handleManagerModelValueChange(v?: string | number | Array<string | number>) {
  const next = normalizePickerValue(v);
  managerStaffId.value = next;
  if (!next) {
    clearManagerFields();
  }
}

function handleManagerPicked(value?: Staff | Staff[]) {
  const staff = normalizePickedStaff(value);
  if (!staff) {
    clearManagerFields();
    return;
  }
  managerStaffId.value = staff.ROWID;
  managerName.value = staff.UserName || '';
  managerDeptName.value = staff.DepName || '';
  formApi.setValues(
    {
      project_Manager: staff.UserName || undefined,
      project_depart: staff.DepName || undefined,
      project_manager_id: staff.ROWID || undefined,
      project_depart_id: staff.DepID || undefined,
    },
    false,
  );
}

async function resolveManagerByName(name?: string) {
  const text = String(name ?? '').trim();
  if (!text) return null;
  try {
    const rows = await getStaffList(undefined, text);
    const exact = rows.find((item) => String(item.UserName || '').trim() === text);
    return exact || rows[0] || null;
  } catch (error) {
    console.error('[project-manage-form] resolve manager by name failed:', error);
    return null;
  }
}

const getTitle = computed(() =>
  formType.value === 'create' ? '新增项目' : formType.value === 'edit' ? '编辑项目' : '项目详情',
);

function generateProjectCode() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `XM${yyyy}${mm}${dd}${rand}`;
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' } },
  wrapperClass: 'grid grid-cols-2 gap-x-6',
  layout: 'vertical',
  schema: useProjectManageFormSchema(),
  showDefaultActions: false,
});

let modalApiRef: any;
function safeGetModalApi() {
  return modalApiRef;
}

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) return;

  saving.value = true;
  const api = safeGetModalApi();
  api?.lock?.();
  try {
    const values = (await formApi.getValues()) as any;
    const isCreate = !values.rowid;
    const rowid = values.rowid || generateUUID();
    const payload: Record<string, any> = {
      ...values,
      rowid,
      project_code: values.project_code || generateProjectCode(),
      project_status: Number(values.project_status ?? 0),
      progress: normalizeProgress(values.progress),
      priority: normalizeNullableString(values.priority) || 'normal',
      project_Manager: managerName.value || values.project_Manager,
      project_depart: managerDeptName.value || values.project_depart,
      project_manager_id: managerStaffId.value || values.project_manager_id,
      project_depart_id: normalizeNullableString(values.project_depart_id),
      project_start_date: normalizeDateString(values.project_start_date),
      project_end_date: normalizeDateString(values.project_end_date),
      actual_end_date: normalizeDateString(values.actual_end_date),
      location: normalizeNullableString(values.location),
      contract_id: normalizeNullableString(values.contract_id),
      flowstate: Number(values.flowstate ?? 0),
      lingma_sys_is_delete: 0,
    };

    formData.value = { ...(formData.value || {}), ...payload } as any;

    delete payload.project_period;
    delete payload.attachment;

    if (isCreate) {
      await createProjectManage(payload as any);
      await syncCreatedProjectManager(payload);
    } else {
      await updateProjectManage(payload as any);
    }

    await persistDraftAttachments(rowid);
    await api?.close?.();
    emit('success');
    ElMessage.success('操作成功');
  } finally {
    api?.unlock?.();
    saving.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    try {
      const api = safeGetModalApi();
      if (!isOpen) {
        formData.value = undefined;
        formType.value = 'create';
        customerId.value = undefined;
        clearManagerFields();
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        await formApi.resetForm();
        formApi.setDisabled(false);
        return;
      }

      const data = (api?.getData?.() as any) ?? undefined;
      formType.value = (data?.type as any) ?? 'create';
      formApi.setDisabled(formType.value === 'detail');

      if (!data || !data.rowid) {
        customerId.value = undefined;
        clearManagerFields();
        await applyCurrentUserDefaults();
        attachments.value = [];
        draftAttachments.value = [];
        uploadKey.value++;
        return;
      }

      api?.lock?.();
      try {
        const detail = (await getProjectManage(String(data.rowid))) as any;
        formData.value = detail;
        if (detail) {
          const values = { ...detail };
          values.project_start_date = normalizeDateString(detail.project_start_date);
          values.project_end_date = normalizeDateString(detail.project_end_date);
          values.actual_end_date = normalizeDateString(detail.actual_end_date);
          values.progress = normalizeProgress(detail.progress);
          values.priority = normalizeNullableString(detail.priority) || 'normal';
          values.location = normalizeNullableString(detail.location);
          values.contract_id = normalizeNullableString(detail.contract_id);
          values.project_manager_id = normalizeNullableString(detail.project_manager_id);
          values.project_depart_id = normalizeNullableString(detail.project_depart_id);
          if (values.project_start_date && values.project_end_date) {
            values.project_period = [values.project_start_date, values.project_end_date];
          }
          await formApi.setValues(values);
          customerId.value = values.customer_id ? String(values.customer_id) : undefined;
          managerStaffId.value = values.project_manager_id || undefined;
          managerName.value = String(values.project_Manager ?? '').trim();
          managerDeptName.value = String(values.project_depart ?? '').trim();

          let matchedStaff: Staff | null = null;
          if (values.project_manager_id) {
            matchedStaff = await getStaffById(String(values.project_manager_id));
          }
          if (!matchedStaff && values.project_Manager) {
            matchedStaff = await resolveManagerByName(values.project_Manager);
          }
          if (matchedStaff) {
            managerStaffId.value = matchedStaff.ROWID;
            managerName.value = matchedStaff.UserName || managerName.value;
            managerDeptName.value = matchedStaff.DepName || managerDeptName.value;
            await formApi.setValues(
              {
                project_Manager: matchedStaff.UserName || undefined,
                project_depart: matchedStaff.DepName || values.project_depart || undefined,
                project_manager_id: matchedStaff.ROWID || values.project_manager_id || undefined,
                project_depart_id: matchedStaff.DepID || values.project_depart_id || undefined,
              },
              false,
            );
          }
          await loadAttachments(String(data.rowid));
          draftAttachments.value = [];
          uploadKey.value++;
        }
      } finally {
        api?.unlock?.();
      }
    } catch (error) {
      console.error('[project-manage-form] onOpenChange failed:', error);
    }
  },
});

modalApiRef = modalApi;

async function handleCancel() {
  await safeGetModalApi()?.close?.();
}
</script>

<template>
  <Modal :title="getTitle" class="!w-[80vw]" :footer="false">
    <div class="px-6 pb-4">
      <Form>
        <template #customer_id>
          <CustomerPicker
            :model-value="customerId"
            :disabled="formType === 'detail'"
            placeholder="请选择客户"
            @update:model-value="handleCustomerIdChange"
          />
        </template>
        <template #project_Manager>
          <StaffPicker
            :model-value="managerStaffId"
            :disabled="formType === 'detail'"
            placeholder="请选择负责人"
            @update:model-value="handleManagerModelValueChange"
            @update:data="handleManagerPicked"
          />
        </template>
        <template #project_depart>
          <ElInput
            :model-value="managerDeptName"
            :disabled="formType === 'detail'"
            readonly
            placeholder="选择负责人后自动带出"
            class="!w-full"
          />
        </template>
      </Form>

      <div class="mt-6">
        <h4>附件</h4>
        <ElTable v-if="attachments.length > 0" :data="attachmentRows" :style="{ width: '100%' }" size="small">
          <ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
          <ElTableColumn label="文件大小" min-width="120">
            <template #default="{ row }">
              {{ formatAttachmentSize(row.file_size) }}
            </template>
          </ElTableColumn>
          <ElTableColumn prop="file_type" label="文件类型" min-width="100" />
          <ElTableColumn label="操作" width="140" fixed="right">
            <template #default="{ row, $index }">
              <ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink>
              <ElLink
                v-if="formType !== 'detail'"
                class="ml-2"
                type="danger"
                @click="handleDeleteAttachment(row, $index)"
              >
                删除
              </ElLink>
            </template>
          </ElTableColumn>
        </ElTable>
        <div v-else class="py-8 text-center text-[#999]">暂无附件</div>
        <div v-if="formType !== 'detail'" class="mt-2">
          <FileUpload
            :key="uploadKey"
            :model-value="[]"
            :api="uploadProjectManageAttachment"
            :limit="9"
            :file-size="50"
            :file-type="['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'zip', 'rar', '7z']"
            :is-show-tip="false"
            :show-file-list="false"
            @success="handleAttachmentUploadSuccess"
          />
          <span class="text-xs text-[#999]">你可以上传 9 个附件，每个最大 50MB</span>
        </div>
      </div>

      <div v-if="formType !== 'detail'" class="mt-6 flex items-center gap-3">
        <ElButton type="primary" :loading="saving" @click="handleSave">保存</ElButton>
        <ElButton :disabled="saving" @click="handleCancel">取消</ElButton>
      </div>
      <div v-else class="mt-6 flex items-center gap-3">
        <ElButton @click="handleCancel">关闭</ElButton>
      </div>
    </div>
  </Modal>
</template>
