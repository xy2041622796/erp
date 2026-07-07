<script lang="ts" setup>
import type { Staff } from '#/api/common/staff-selector';
import type { CrmCustomerApi } from '#/api/erp/customer';
import type { ErpProjectApi } from '#/api/erp/contract/project';
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';

import { computed, ref } from 'vue';
import { useVbenForm, useVbenModal } from '@vben/common-ui';
import { downloadFileFromBlobPart, generateUUID } from '@vben/utils';


import { CustomerPicker } from '#/components/customer-selector';
import StaffPicker from '#/components/staff-selector/StaffPicker.vue';
import FileUpload from '#/components/upload/file-upload.vue';
import { getStaffList } from '#/api/common/staff-selector';
import { createCustomerAttachment, deleteCustomerAttachment, downloadCustomerAttachment, getCustomerAttachments, uploadCustomerAttachment } from '#/api/erp/customer';
import { createProject, getProject, updateProject } from '#/api/erp/contract/project';

import { useProjectFormSchema } from '../data';

import {
  ElButton,
  ElInput,
  ElLink,
  ElMessage,
  ElTable,
  ElTableColumn,
} from 'element-plus';

const ATTACH_OWNER_TYPE = '项目';
const emit = defineEmits(['success']);
const formData = ref<ErpProjectApi.Project>();
const formType = ref<'create' | 'edit' | 'detail'>('create');
const saving = ref(false);
const customerId = ref<string | undefined>();
const managerStaffId = ref<string | undefined>();
const managerName = ref('');
const managerDeptName = ref('');
const uploadKey = ref(0);
const attachments = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachments = ref<CrmCustomerApi.Attachment[]>([]);

function getCurrentDocId() { return String(formData.value?.rowid || '').trim() || undefined; }
async function loadAttachments(docId?: string | number) { if (!docId) { attachments.value = []; return; } try { attachments.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE); } catch (error) { console.error('加载项目附件失败:', error); attachments.value = []; } }
function formatAttachmentSize(size?: number) { if (!size || size <= 0) return '-'; if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`; return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`; }
function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment { const fileName = payload?.fileName || ''; return { file_name: fileName, file_path: payload?.filePath || '', file_size: payload?.fileSize || 0, file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '', owner_type: ATTACH_OWNER_TYPE }; }
async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) { const docId = getCurrentDocId(); const item = toAttachmentItem(payload); if (!docId) { draftAttachments.value.push(item); attachments.value.push(item); uploadKey.value++; return; } await createCustomerAttachment(docId, { fileName: item.file_name, file_path: item.file_path, fileSize: item.file_size, fileType: item.file_type, owner_type: ATTACH_OWNER_TYPE, pid: docId }); await loadAttachments(docId); uploadKey.value++; }
async function persistDraftAttachments(docId: string | number) { if (!draftAttachments.value.length) return; await Promise.all(draftAttachments.value.map((it) => createCustomerAttachment(docId, { fileName: it.file_name, file_path: it.file_path, fileSize: it.file_size, fileType: it.file_type, owner_type: ATTACH_OWNER_TYPE, pid: docId }))); draftAttachments.value = []; await loadAttachments(docId); }
async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) { if (!row.file_name || !row.file_path) { ElMessage.warning('附件信息不完整，无法下载'); return; } try { const blob = await downloadCustomerAttachment(row.file_name, row.file_path); downloadFileFromBlobPart({ fileName: row.file_name, source: blob }); } catch (error) { console.error('下载项目附件失败:', error); ElMessage.error('下载附件失败'); } }
async function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) { const docId = getCurrentDocId(); if (docId && row.id) { await deleteCustomerAttachment(row.id as any); ElMessage.success('删除附件成功'); await loadAttachments(docId); return; } attachments.value.splice(index, 1); draftAttachments.value = draftAttachments.value.filter((it) => !(it.file_name === row.file_name && it.file_path === row.file_path && it.file_size === row.file_size)); ElMessage.success('删除附件成功'); }

function handleCustomerIdChange(v?: string) { customerId.value = v; formApi.setValues({ customer_id: v }, false); }
function handleManagerModelValueChange(v?: string) { managerStaffId.value = v; }
function handleManagerPicked(staff?: Staff) {
  if (!staff) {
    managerStaffId.value = undefined; managerName.value = ''; managerDeptName.value = '';
    formApi.setValues({ project_Manager: undefined, project_depart: undefined }, false);
    return;
  }
  managerStaffId.value = staff.ROWID; managerName.value = staff.UserName || ''; managerDeptName.value = staff.DepName || '';
  formApi.setValues({ project_Manager: staff.UserName || undefined, project_depart: staff.DepName || undefined }, false);
}
async function resolveManagerByName(name?: string) { const text = String(name ?? '').trim(); if (!text) return null; try { const rows = await getStaffList(undefined, text); const exact = rows.find((item) => String(item.UserName || '').trim() === text); return exact || rows[0] || null; } catch (error) { console.error('[project-form] resolve manager by name failed:', error); return null; } }
const getTitle = computed(() => formType.value === 'create' ? '新增项目' : formType.value === 'edit' ? '编辑项目' : '项目详情');
function normalizeDateString(value: any): string | undefined { if (value === null || value === undefined) return undefined; const str = String(value).trim(); if (!str || str === 'null' || str === 'undefined') return undefined; return str.includes('T') ? str.split('T')[0] : str; }
function generateProjectCode() { const d = new Date(); const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); return `XM${yyyy}${mm}${dd}${rand}`; }

const [Form, formApi] = useVbenForm({ commonConfig: { componentProps: { class: 'w-full' } }, wrapperClass: 'grid grid-cols-2 gap-x-6', layout: 'vertical', schema: useProjectFormSchema(), showDefaultActions: false });
let modalApiRef: any; function safeGetModalApi() { return modalApiRef; }

async function handleSave(submit: boolean) {
  const { valid } = await formApi.validate(); if (!valid) return;
  saving.value = true; const api = safeGetModalApi(); api?.lock?.();
  try {
    const values = (await formApi.getValues()) as any;
    const rowid = values.rowid || generateUUID();
    const payload: Record<string, any> = { ...values, rowid };
    formData.value = { ...(formData.value || {}), rowid } as any;
    delete payload.project_period; delete payload.attachment;
    payload.project_start_date = normalizeDateString(payload.project_start_date);
    payload.project_end_date = normalizeDateString(payload.project_end_date);
    payload.flowstate = submit ? 1 : 0;
    if (!values.rowid && !payload.project_code) payload.project_code = generateProjectCode();
    payload.project_Manager = managerName.value || payload.project_Manager;
    payload.project_depart = managerDeptName.value || payload.project_depart;
    if (values.rowid) await updateProject(payload as any); else await createProject(payload as any);
    await persistDraftAttachments(rowid);
    await api?.close?.(); emit('success'); ElMessage.success('操作成功');
  } finally { api?.unlock?.(); saving.value = false; }
}

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    try {
      const api = safeGetModalApi();
      if (!isOpen) {
        formData.value = undefined; formType.value = 'create'; customerId.value = undefined; managerStaffId.value = undefined; managerName.value = ''; managerDeptName.value = ''; attachments.value = []; draftAttachments.value = []; uploadKey.value++;
        await formApi.resetForm(); formApi.setDisabled(false); return;
      }
      const data = (api?.getData?.() as any) ?? undefined;
      formType.value = (data?.type as any) ?? 'create';
      formApi.setDisabled(formType.value === 'detail');
      if (!data || !data.rowid) {
        await formApi.setValues({ project_code: generateProjectCode() });
        customerId.value = undefined; managerStaffId.value = undefined; managerName.value = ''; managerDeptName.value = ''; attachments.value = []; draftAttachments.value = []; uploadKey.value++; return;
      }
      api?.lock?.();
      try {
        const detail = (await getProject(String(data.rowid))) as any;
        formData.value = detail;
        if (detail) {
          const values = { ...detail };
          values.project_start_date = normalizeDateString(detail.project_start_date);
          values.project_end_date = normalizeDateString(detail.project_end_date);
          if (values.project_start_date && values.project_end_date) values.project_period = [values.project_start_date, values.project_end_date];
          await formApi.setValues(values);
          customerId.value = values.customer_id ? String(values.customer_id) : undefined;
          managerName.value = String(values.project_Manager ?? '').trim();
          managerDeptName.value = String(values.project_depart ?? '').trim();
          managerStaffId.value = undefined;
          const matchedStaff = await resolveManagerByName(values.project_Manager);
          if (matchedStaff) { managerStaffId.value = matchedStaff.ROWID; managerName.value = matchedStaff.UserName || managerName.value; managerDeptName.value = matchedStaff.DepName || managerDeptName.value; }
          await loadAttachments(String(data.rowid)); draftAttachments.value = []; uploadKey.value++;
        }
      } finally { api?.unlock?.(); }
    } catch (error) { console.error('[project-form] onOpenChange failed:', error); }
  },
});
modalApiRef = modalApi;
async function handleCancel() { await safeGetModalApi()?.close?.(); }
</script>

<template>
  <Modal :title="getTitle" class="!w-[80vw]" :footer="false">
    <div class="px-6 pb-4">
      <Form>
        <template #customer_id><CustomerPicker :model-value="customerId" :disabled="formType === 'detail'" placeholder="请选择客户" @update:model-value="handleCustomerIdChange" /></template>
        <template #project_Manager><StaffPicker :model-value="managerStaffId" :disabled="formType === 'detail'" placeholder="请选择负责人" @update:model-value="handleManagerModelValueChange" @update:data="handleManagerPicked" /></template>
        <template #project_depart><ElInput :model-value="managerDeptName" :disabled="formType === 'detail'" readonly placeholder="选择负责人后自动带出" class="!w-full" /></template>
      </Form>

      <div class="mt-6"><h4>附件</h4><ElTable v-if="attachments.length > 0" :data="attachments" style="width: 100%" size="small"><ElTableColumn prop="file_name" label="文件名" min-width="220" show-overflow-tooltip /><ElTableColumn label="文件大小" min-width="120"><template #default="{ row }">{{ formatAttachmentSize(row.file_size) }}</template></ElTableColumn><ElTableColumn prop="file_type" label="文件类型" min-width="100" /><ElTableColumn label="操作" width="140" fixed="right"><template #default="{ row, $index }"><ElLink type="primary" @click="handleDownloadAttachment(row)">下载</ElLink><ElLink v-if="formType !== 'detail'" class="ml-2" type="danger" @click="handleDeleteAttachment(row, $index)">删除</ElLink></template></ElTableColumn></ElTable><div v-else class="py-8 text-center text-[#999]">暂无附件</div><div v-if="formType !== 'detail'" class="mt-2"><FileUpload :key="uploadKey" :model-value="[]" :api="uploadCustomerAttachment" :limit="9" :file-size="50" :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']" :is-show-tip="false" :show-file-list="false" @success="handleAttachmentUploadSuccess" /><span class="text-xs text-[#999]">你可以上传 9 个附件，每个最大 50MB</span></div></div>

      <div class="mt-6 flex items-center gap-3" v-if="formType !== 'detail'"><ElButton type="primary" :loading="saving" @click="handleSave(true)">保存并提交</ElButton><ElButton :loading="saving" @click="handleSave(false)">保存草稿</ElButton><ElButton :disabled="saving" @click="handleCancel">取消</ElButton></div>
      <div class="mt-6 flex items-center gap-3" v-else><ElButton @click="handleCancel">关闭</ElButton></div>
    </div>
  </Modal>
</template>
