<script lang="ts" setup>
import type { FileUploadSuccessPayload } from '#/components/upload/file-upload.vue';
import type { CrmCustomerApi } from '#/api/erp/customer';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlobPart } from '@vben/utils';
import { Plus, RefreshRight, Search } from '@element-plus/icons-vue';

import FileUpload from '#/components/upload/file-upload.vue';

import {
  auditTempExpense,
  createTempExpense,
  getTempExpenseList,
} from '#/api/erp/finance/project/temp-audit';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import { getSimpleUserList } from '#/api/system/user';
import {
  createCustomerAttachment,
  downloadCustomerAttachment,
  getCustomerAttachments,
  uploadCustomerAttachment,
} from '#/api/erp/customer';
import { useDataTablePermission } from '#/views/erp/shared/useDataTablePermission';

import {
  ElButton,
  ElCard,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'FinanceProjectTempAuditPage' });

type TempExpenseRow = Record<string, any> & {
  id?: string;
  project_name?: string;
  expense_type?: string;
  amount?: number;
  reason?: string;
  applicant_name?: string;
  department_name?: string;
  status?: string | number;
  attachments?: string | string[];
  created_at?: string;
};

const loading = ref(false);
const total = ref(0);
const tableData = ref<TempExpenseRow[]>([]);
const createVisible = ref(false);
const detailVisible = ref(false);
const detailMode = ref<'view' | 'audit'>('view');
const detailRow = ref<TempExpenseRow | null>(null);
const auditRemark = ref('');
const submitting = ref(false);
const projectOptions = ref<any[]>([]);
const userOptions = ref<any[]>([]);
const uploadKey = ref(0);
const attachmentRows = ref<CrmCustomerApi.Attachment[]>([]);
const draftAttachmentRows = ref<CrmCustomerApi.Attachment[]>([]);
const ATTACH_OWNER_TYPE = '临时费用审核';
const queryForm = reactive({
  keyword: '',
  status: 'all',
});
const createForm = reactive({
  project_id: '',
  project_name: '',
  expense_type: '',
  amount: 0,
  reason: '',
});
const attachments = ref<string[]>([]);

const { dataTable, hasPermission } = useDataTablePermission();

onMounted(async () => {
  await Promise.all([handleQuery(), loadProjectOptions(), loadUserOptions()]);
});

function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString();
}

function formatDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '--';
  if (text.includes('T')) return text.split('T')[0];
  if (text.includes(' ')) return text.split(' ')[0];
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function getStatusMeta(status: unknown) {
  const value = String(status ?? '');
  if (value === '20' || value === 'approved') return { label: '已通过', type: 'success' as const };
  if (value === '-10' || value === 'rejected') return { label: '已驳回', type: 'danger' as const };
  return { label: '待审核', type: 'warning' as const };
}

function parseAttachments(value: unknown) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.attachments)) return parsed.attachments;
    return [text];
  } catch {
    return [text];
  }
}

async function loadProjectOptions() {
  try {
    const list = await getProjectManageSimpleList();
    projectOptions.value = Array.isArray(list) ? list : [];
  } catch (error: any) {
    projectOptions.value = [];
    ElMessage.error(error?.message || '加载项目选项失败');
  }
}

function handleProjectChange(projectId: string) {
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === String(projectId || ''));
  createForm.project_id = String(projectId || '');
  createForm.project_name = String(matched?.project_name || '').trim();
}

async function loadUserOptions() {
  try {
    const list = await getSimpleUserList();
    userOptions.value = Array.isArray(list) ? list : [];
  } catch {
    userOptions.value = [];
  }
}

function getProjectName(row: Record<string, any> | null | undefined) {
  const projectId = String(row?.project_id || '').trim();
  const projectName = String(row?.project_name || '').trim();
  const matched = projectOptions.value.find((item) => String(item?.rowid || '') === projectId);
  return String(matched?.project_name || projectName || projectId || '--');
}

function getUserName(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '--';
  const matched = userOptions.value.find((item) => {
    return [item?.ID, item?.ROWID, item?.LoginName, item?.UserName, item?.id, item?.username]
      .map((v) => String(v || '').trim())
      .includes(text);
  });
  return String(matched?.UserName || text);
}

function getAuditRemark(row: Record<string, any> | null | undefined) {
  return String(row?.audit_remark || row?.auditRemark || row?.remark || '').trim() || '--';
}

function formatAttachmentSize(size: unknown) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(2) + ' MB';
  if (value >= 1024) return (value / 1024).toFixed(2) + ' KB';
  return value + ' B';
}

function toAttachmentItem(payload: FileUploadSuccessPayload): CrmCustomerApi.Attachment {
  const fileName = payload?.fileName || '';
  return {
    file_name: fileName,
    file_path: payload?.filePath || '',
    file_size: payload?.fileSize || 0,
    file_type: fileName.includes('.') ? fileName.split('.').pop() || '' : '',
    owner_type: ATTACH_OWNER_TYPE,
  };
}

async function loadAttachmentRows(docId?: string | number) {
  if (!docId) {
    attachmentRows.value = [];
    return;
  }
  try {
    attachmentRows.value = await getCustomerAttachments(docId, ATTACH_OWNER_TYPE);
  } catch {
    attachmentRows.value = [];
  }
}

async function persistDraftAttachmentRows(docId: string) {
  for (const item of draftAttachmentRows.value) {
    await createCustomerAttachment(docId, {
      fileName: item.file_name,
      file_path: item.file_path,
      fileSize: item.file_size,
      fileType: item.file_type,
      owner_type: ATTACH_OWNER_TYPE,
      pid: docId,
    });
  }
  draftAttachmentRows.value = [];
  await loadAttachmentRows(docId);
}

async function handleAttachmentUploadSuccess(payload: FileUploadSuccessPayload) {
  const item = toAttachmentItem(payload);
  draftAttachmentRows.value.push(item);
  attachmentRows.value.push(item);
  attachments.value = attachmentRows.value.map((row) => String(row.file_name || '').trim()).filter(Boolean);
  uploadKey.value++;
}

async function handleDownloadAttachment(row: CrmCustomerApi.Attachment) {
  if (!row.file_name || !row.file_path) {
    ElMessage.warning('附件信息不完整，无法下载');
    return;
  }
  const blob = await downloadCustomerAttachment(row.file_name, row.file_path);
  downloadFileFromBlobPart({ fileName: row.file_name, source: blob });
}

function handleDeleteAttachment(row: CrmCustomerApi.Attachment, index: number) {
  attachmentRows.value.splice(index, 1);
  draftAttachmentRows.value = draftAttachmentRows.value.filter((item) => !(item.file_name === row.file_name && item.file_path === row.file_path));
  attachments.value = attachmentRows.value.map((item) => String(item.file_name || '').trim()).filter(Boolean);
}

async function handleQuery() {
  loading.value = true;
  try {
    const res = await getTempExpenseList({
      pageNo: 1,
      page: 0,
      keyword: queryForm.keyword,
      status: queryForm.status,
    });
    dataTable.value = res.dataTable;
    tableData.value = Array.isArray(res.list) ? res.list : [];
    total.value = Number(res.total || 0);
  } catch (error: any) {
    ElMessage.error(error?.message || '加载临时费用审核数据失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.status = 'all';
  handleQuery();
}

function openCreateDialog() {
  createForm.project_id = '';
  createForm.project_name = '';
  createForm.expense_type = '';
  createForm.amount = 0;
  createForm.reason = '';
  attachments.value = [];
  attachmentRows.value = [];
  draftAttachmentRows.value = [];
  uploadKey.value++;
  createVisible.value = true;
}

async function handleCreate() {
  if (!createForm.project_id || !createForm.project_name || !createForm.expense_type || !createForm.amount || !createForm.reason) {
    ElMessage.warning('请先补全临时费用申请信息');
    return;
  }
  submitting.value = true;
  try {
    const expenseId = crypto.randomUUID();
    await createTempExpense({
      rowid: expenseId,
      project_id: createForm.project_id,
      project_name: createForm.project_name,
      expense_type: createForm.expense_type,
      amount: createForm.amount,
      reason: createForm.reason,
      attachments: attachments.value,
      status: 'pending',
    });
    await persistDraftAttachmentRows(expenseId);
    ElMessage.success('临时费用申请已提交');
    createVisible.value = false;
    await handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.message || '提交临时费用申请失败');
  } finally {
    submitting.value = false;
  }
}

async function openDetail(row: TempExpenseRow) {
  detailMode.value = 'view';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachmentRows(row?.id || row?.rowid);
  detailVisible.value = true;
}

async function openAudit(row: TempExpenseRow) {
  detailMode.value = 'audit';
  detailRow.value = row;
  auditRemark.value = '';
  await loadAttachmentRows(row?.id || row?.rowid);
  detailVisible.value = true;
}

async function handleAudit(approved: boolean) {
  if (!detailRow.value?.id) return;
  submitting.value = true;
  try {
    await auditTempExpense(detailRow.value.id, approved, auditRemark.value);
    ElMessage.success(approved ? '已通过临时费用申请' : '已驳回临时费用申请');
    detailVisible.value = false;
    await handleQuery();
  } catch (error: any) {
    ElMessage.error(error?.message || '审核失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Page auto-content-height>
    <div class="project-temp-audit-page">
      <div class="project-temp-audit-page__header">
        <div>
          <div class="project-temp-audit-page__title">临时费用审核</div>
          <div class="project-temp-audit-page__subtitle">保留源项目“申请上传 + 审核查看 + 状态筛选”的工作台结构，当前项目映射到费用登记表实现。</div>
        </div>
        <div class="project-temp-audit-page__header-actions">
          <el-button :icon="RefreshRight" @click="handleQuery">刷新</el-button>
          <el-button v-if="hasPermission('data:add')" type="primary" :icon="Plus" @click="openCreateDialog">
            新建申请
          </el-button>
        </div>
      </div>

      <el-card shadow="never">
        <el-form :model="queryForm" inline>
          <el-form-item>
            <el-input v-model="queryForm.keyword" placeholder="搜索项目 / 费用类型 / 原因" clearable>
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-select v-model="queryForm.status" style="width: 160px">
              <el-option label="全部状态" value="all" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleQuery">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>临时费用申请列表</span>
            <span class="card-header__extra">共 {{ total }} 条</span>
          </div>
        </template>
        <el-table v-loading="loading" :data="tableData" border stripe height="520">
          <el-table-column prop="project_name" label="项目名称" min-width="180">
            <template #default="{ row }">{{ getProjectName(row) }}</template>
          </el-table-column>
          <el-table-column prop="expense_type" label="费用类型" min-width="140" />
          <el-table-column label="申请金额" min-width="140" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="reason" label="申请原因" min-width="220" show-overflow-tooltip />
          <el-table-column label="附件" width="100" align="center">
            <template #default="{ row }">
              <el-tag>{{ parseAttachments(row.attachments).length }} 个</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="applicant_name" label="申请人" min-width="140">
            <template #default="{ row }">
              <div>
                <div>{{ getUserName(row.applicant_name || row.createuser || row.user_id) }}</div>
                <div class="minor-text">{{ row.department_name || '--' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="提交日期" min-width="140">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusMeta(row.status).type">{{ getStatusMeta(row.status).label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="140">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">查看</el-button>
              <el-button v-if="getStatusMeta(row.status).label === '待审核'" link type="warning" @click="openAudit(row)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog v-model="createVisible" title="新建临时费用申请" width="620px">
        <el-form :model="createForm" label-width="100px">
          <el-form-item label="项目名称" required>
            <el-select v-model="createForm.project_id" filterable placeholder="请选择项目" style="width: 100%" @change="handleProjectChange">
              <el-option
                v-for="item in projectOptions"
                :key="item.rowid"
                :label="item.project_name || item.project_code || item.rowid"
                :value="item.rowid"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="费用类型" required><el-input v-model="createForm.expense_type" /></el-form-item>
          <el-form-item label="申请金额" required><el-input-number v-model="createForm.amount" :min="0" :precision="2" style="width: 100%" /></el-form-item>
          <el-form-item label="申请原因" required><el-input v-model="createForm.reason" type="textarea" :rows="3" /></el-form-item>
          <el-form-item label="附件上传">
            <FileUpload
              :key="uploadKey"
              :model-value="[]"
              :api="uploadCustomerAttachment"
              :limit="9"
              :file-size="50"
              :file-type="['doc','docx','xls','xlsx','ppt','pptx','pdf','txt','png','jpg','jpeg','gif','bmp','zip','rar','7z']"
              :is-show-tip="false"
              :show-file-list="false"
              @success="handleAttachmentUploadSuccess"
            />
            <span class="minor-text">你可以上传 9 个附件，每个最大 50MB</span>
            <div v-if="attachmentRows.length" class="attachment-list">
              <el-tag v-for="(item, index) in attachmentRows" :key="item.file_path || item.file_name" closable @close="handleDeleteAttachment(item, index)">
                {{ item.file_name }}
              </el-tag>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleCreate">提交申请</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="detailVisible"
        :title="detailMode === 'audit' ? '临时费用审核' : '临时费用详情'"
        width="760px"
        :class="['temp-audit-detail-dialog', detailMode === 'audit' ? 'audit-dialog--top' : '']"
        :top="detailMode === 'audit' ? '4vh' : '8vh'"
      >
        <div v-if="detailRow" class="temp-audit-detail">
          <div class="temp-audit-detail__hero">
            <div class="temp-audit-detail__hero-main">
              <div class="temp-audit-detail__label">申请金额</div>
              <div class="temp-audit-detail__amount">¥{{ formatMoney(detailRow.amount) }}</div>
              <div class="temp-audit-detail__project">{{ getProjectName(detailRow) }}</div>
            </div>
            <el-tag :type="getStatusMeta(detailRow.status).type" size="large">
              {{ getStatusMeta(detailRow.status).label }}
            </el-tag>
          </div>

          <div class="temp-audit-detail__grid">
            <div class="detail-info-card">
              <div class="detail-info-card__label">费用类型</div>
              <div class="detail-info-card__value">{{ detailRow.expense_type || '--' }}</div>
            </div>
            <div class="detail-info-card">
              <div class="detail-info-card__label">申请人</div>
              <div class="detail-info-card__value">{{ getUserName(detailRow.applicant_name || detailRow.createuser || detailRow.user_id) }}</div>
              <div class="detail-info-card__sub">{{ detailRow.department_name || '暂无部门' }}</div>
            </div>
            <div class="detail-info-card">
              <div class="detail-info-card__label">提交日期</div>
              <div class="detail-info-card__value">{{ formatDate(detailRow.created_at) }}</div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section__title">申请原因</div>
            <div class="detail-section__content">{{ detailRow.reason || '--' }}</div>
          </div>

          <div class="detail-section">
            <div class="detail-section__title">附件</div>
            <div class="detail-attachment-list">
              <el-tag v-for="item in attachmentRows" :key="item.file_path || item.file_name" effect="plain" @click="handleDownloadAttachment(item)">
                {{ item.file_name }}（{{ formatAttachmentSize(item.file_size) }}）
              </el-tag>
              <template v-if="!attachmentRows.length">
                <el-tag v-for="item in parseAttachments(detailRow.attachments)" :key="item" effect="plain">
                  {{ item }}
                </el-tag>
              </template>
              <span v-if="!attachmentRows.length && !parseAttachments(detailRow.attachments).length" class="minor-text">无附件</span>
            </div>
          </div>

          <div v-if="detailMode === 'view'" class="detail-section">
            <div class="detail-section__title">审批意见</div>
            <div class="detail-section__content">{{ getAuditRemark(detailRow) }}</div>
          </div>

          <div v-if="detailMode === 'audit' && getStatusMeta(detailRow?.status).label === '待审核'" class="detail-section detail-section--audit">
            <div class="detail-section__title">审批意见</div>
            <el-input v-model="auditRemark" type="textarea" :rows="4" placeholder="请输入审核意见，可选" />
          </div>
        </div>
        <template #footer>
          <el-button @click="detailVisible = false">关闭</el-button>
          <template v-if="detailMode === 'audit' && getStatusMeta(detailRow?.status).label === '待审核'">
            <el-button type="danger" :loading="submitting" @click="handleAudit(false)">驳回</el-button>
            <el-button type="primary" :loading="submitting" @click="handleAudit(true)">通过</el-button>
          </template>
        </template>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.project-temp-audit-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.project-temp-audit-page__header,
.project-temp-audit-page__header-actions,
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.project-temp-audit-page__title {
  font-size: 20px;
  font-weight: 600;
}
.project-temp-audit-page__subtitle,
.card-header__extra,
.minor-text {
  color: var(--el-text-color-secondary);
}
.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.temp-audit-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.temp-audit-detail__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-fill-color-blank));
}
.temp-audit-detail__label,
.detail-info-card__label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.temp-audit-detail__amount {
  margin-top: 4px;
  color: var(--el-color-primary);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.temp-audit-detail__project {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 500;
}
.temp-audit-detail__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.detail-info-card,
.detail-section {
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}
.detail-info-card__value {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 16px;
  font-weight: 600;
}
.detail-info-card__sub {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.detail-section__title {
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}
.detail-section__content {
  min-height: 52px;
  color: var(--el-text-color-regular);
  line-height: 1.7;
  white-space: pre-wrap;
}
.detail-attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}
.detail-section--audit {
  background: var(--el-color-warning-light-9);
}
:global(.audit-dialog--top.el-dialog) {
  margin-top: 4vh !important;
}
@media (max-width: 768px) {
  .temp-audit-detail__hero,
  .temp-audit-detail__grid {
    grid-template-columns: 1fr;
  }
  .temp-audit-detail__hero {
    flex-direction: column;
  }
}
</style>
