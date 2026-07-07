<template>
	<Page auto-content-height class="h-full job-management-page-shell">
		<div v-loading="pageLoading" class="job-management-page">
		<section class="job-management-page__sidebar">
			<div class="panel-card panel-card--sidebar">
				<div class="panel-card__header panel-card__header--compact">
					<div class="panel-card__title">部门级别</div>
				</div>

				<div class="panel-card__body panel-card__body--sidebar" v-loading="levelLoading">
					<div v-if="levelOptions.length" class="level-list">
						<button
							v-for="item in levelOptions"
							:key="item.value"
							type="button"
							class="level-list__item"
							:class="{ 'is-active': item.value === selectedLevelCode }"
							@click="handleLevelSelect(item)"
						>
							{{ item.label }}
						</button>
					</div>

					<el-empty v-else description="暂无部门级别数据" />
				</div>
			</div>
		</section>

		<section class="job-management-page__content">
			<div class="panel-card panel-card--main">
				<div class="panel-card__header">
					<div class="panel-card__title-wrap">
						<div class="panel-card__title">岗位管理</div>
						<div class="panel-card__subtitle">{{ selectedLevelLabel || '请选择左侧部门级别' }}</div>
					</div>

					<div class="panel-card__actions">
						<el-button type="primary" :icon="Plus" :disabled="!canOperate" @click="handleAddJob">新增</el-button>
						<el-button type="primary" plain :icon="Edit" :disabled="!canEdit" @click="handleEditJob">编辑</el-button>
						<el-button type="danger" plain :icon="Delete" :disabled="!canDelete" @click="handleDeleteJob">删除</el-button>
					</div>
				</div>

				<div v-if="selectedLevelCode" class="panel-card__body panel-card__body--table" v-loading="jobLoading">
					<el-table
						ref="jobTableRef"
						height="100%"
						:data="jobRows"
						border
						row-key="ID"
						highlight-current-row
						empty-text="当前级别暂无岗位"
						@current-change="handleCurrentChange"
					>
						<el-table-column prop="JobCode" min-width="150" show-overflow-tooltip>
							<template #header>
								<div class="job-table__header-label">编号</div>
							</template>
						</el-table-column>

						<el-table-column prop="JobName" min-width="180" show-overflow-tooltip>
							<template #header>
								<div class="job-table__header-cell">
									<span class="job-table__header-text">名称</span>
									<el-input
										v-model="filters.jobName"
										clearable
										placeholder="请输入名称"
										@change="handleSearch"
										@clear="handleSearch"
										@keyup.enter="handleSearch"
									/>
								</div>
							</template>
						</el-table-column>

						<el-table-column min-width="170" show-overflow-tooltip>
							<template #header>
								<div class="job-table__header-cell">
									<span class="job-table__header-text">类别</span>
									<el-select
										v-model="filters.jobType"
										clearable
										placeholder="全部"
										@change="handleSearch"
									>
										<el-option v-for="item in jobTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
									</el-select>
								</div>
							</template>

							<template #default="scope">
								{{ resolveJobTypeLabel(scope.row.JobType) || '-' }}
							</template>
						</el-table-column>

						<el-table-column prop="DepName" min-width="220" show-overflow-tooltip>
							<template #header>
								<div class="job-table__header-cell">
									<span class="job-table__header-text">所属部门名称</span>
									<el-select
										v-model="filters.depId"
										clearable
										filterable
										placeholder="全部"
										@change="handleSearch"
									>
										<el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
									</el-select>
								</div>
							</template>
						</el-table-column>

						<el-table-column prop="jobExpNum" label="职数" width="110" align="center" />
						<el-table-column prop="JobDuty" label="职责" min-width="320" show-overflow-tooltip />
					</el-table>

					<div class="pagination-wrap">
						<el-pagination
							v-model:current-page="pagination.pageNo"
							v-model:page-size="pagination.pageSize"
							:page-sizes="pageSizeOptions"
							:total="pagination.total"
							background
							layout="total, sizes, prev, pager, next, jumper"
							@current-change="handlePageChange"
							@size-change="handlePageSizeChange"
						/>
					</div>
				</div>

				<div v-else class="panel-card__empty">
					<el-empty description="请选择左侧部门级别后查看岗位列表" />
				</div>
			</div>
		</section>

		<el-dialog
			v-model="jobDialog.visible"
			:title="jobDialog.mode === 'add' ? '岗位新增' : '岗位编辑'"
			width="900px"
			destroy-on-close
			:close-on-click-modal="false"
		>
			<el-form ref="jobFormRef" :model="jobForm" :rules="jobRules" label-width="110px" class="job-form">
				<el-form-item label="岗位名称" prop="JobName">
					<el-input v-model="jobForm.JobName" maxlength="64" :disabled="isDialogFieldDisabled('JobName')" />
				</el-form-item>

				<el-form-item label="岗位编制" prop="jobExpNum">
					<el-input-number v-model="jobForm.jobExpNum" :min="0" :step="1" controls-position="right" class="job-form__number" :disabled="isDialogFieldDisabled('jobExpNum')" />
				</el-form-item>

				<el-form-item label="岗位所属" prop="JobType">
					<el-radio-group v-model="jobForm.JobType" :disabled="isDialogFieldDisabled('JobType')">
						<el-radio v-for="item in jobTypeOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
					</el-radio-group>
				</el-form-item>

				<el-form-item v-if="requiresDepartment" label="所属部门" prop="Depid">
					<el-select v-model="jobForm.Depid" filterable placeholder="请选择所属部门" class="job-form__select" :disabled="isDialogFieldDisabled('Depid')">
						<el-option v-for="item in departmentOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>

				<el-form-item label="岗位职责" prop="JobDuty">
					<el-input v-model="jobForm.JobDuty" type="textarea" :rows="6" maxlength="500" show-word-limit :disabled="isDialogFieldDisabled('JobDuty')" />
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="jobDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="jobDialog.saving" :disabled="submitDisabled" @click="handleDialogConfirm">保存</el-button>
				</div>
			</template>
		</el-dialog>
		</div>
	</Page>
</template>

<script setup lang="ts">
import { Page } from '@vben/common-ui'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Delete, Edit, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import {
	ElButton,
	ElDialog,
	ElEmpty,
	ElForm,
	ElFormItem,
	ElInput,
	ElInputNumber,
	ElMessage,
	ElMessageBox,
	ElOption,
	ElPagination,
	ElRadio,
	ElRadioGroup,
	ElSelect,
	ElTable,
	ElTableColumn,
	type FormInstance,
	type FormRules
} from 'element-plus'
import type { DataTable } from '#/api/qyapi'
import { useDataTableAuth } from '#/hooks/use-data-table-auth'
import {
	createJobManagementJob,
	deleteJobManagementJob,
	getJobDepartmentLevelOptions,
	getJobDepartmentOptions,
	getJobManagementPage,
	getJobTypeOptions,
	updateJobManagementJob,
	type JobManagementDepartmentOption,
	type JobManagementDictOption,
	type JobManagementRecord,
	type SaveJobManagementPayload
} from '#/api/erp/human-resources/job-management'

type JobDialogMode = 'add' | 'edit'

interface JobFormState {
	ID: string
	JobName: string
	jobExpNum: number
	JobType: string
	Depid: string
	JobDuty: string
}

const jobTableRef = ref<any>(null)
const jobFormRef = ref<FormInstance>()

const pageLoading = ref(false)
const levelLoading = ref(false)
const jobLoading = ref(false)
const pageDataTable = ref<DataTable | null>(null)

const levelOptions = ref<JobManagementDictOption[]>([])
const jobTypeOptions = ref<JobManagementDictOption[]>([])
const departmentOptions = ref<JobManagementDepartmentOption[]>([])
const jobRows = ref<JobManagementJobRecord[]>([])

const selectedLevelCode = ref('')
const selectedLevelLabel = ref('')
const currentJobId = ref('')

const pageSizeOptions = [20, 50, 100]

const pagination = reactive({
	pageNo: 1,
	pageSize: 20,
	total: 0
})

const filters = reactive({
	jobName: '',
	jobType: '',
	depId: ''
})

const jobDialog = reactive({
	visible: false,
	mode: 'add' as JobDialogMode,
	saving: false
})

const jobForm = reactive<JobFormState>({
	ID: '',
	JobName: '',
	jobExpNum: 0,
	JobType: '',
	Depid: '',
	JobDuty: ''
})

let jobListRequestId = 0

const { canAdd, canEditRow, canDeleteRow, canEditField } = useDataTableAuth(pageDataTable)

const currentJobRow = computed(() => jobRows.value.find((item) => normalizeText(item.ID) === currentJobId.value) || null)
const canOperate = computed(() => Boolean(selectedLevelCode.value) && canAdd())
const canEdit = computed(() => Boolean(selectedLevelCode.value && currentJobRow.value) && canEditRow(currentJobId.value))
const canDelete = computed(() => Boolean(selectedLevelCode.value && currentJobRow.value) && canDeleteRow(currentJobId.value))
const jobTypeLabelMap = computed(() => new Map(jobTypeOptions.value.map((item) => [normalizeText(item.value), normalizeText(item.label)])))
const exclusiveJobTypeValue = computed(() => findJobTypeValueByLabel('专属岗位'))
const generalJobTypeValue = computed(() => findJobTypeValueByLabel('通用岗位'))
const requiresDepartment = computed(() => normalizeText(jobForm.JobType) !== '' && normalizeText(jobForm.JobType) === exclusiveJobTypeValue.value)
const submitDisabled = computed(() => jobDialog.mode === 'add' ? !canOperate.value : !canEditRow(jobForm.ID))

const jobRules: FormRules<JobFormState> = {
	JobName: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
	JobType: [{ required: true, message: '请选择岗位所属', trigger: 'change' }],
	Depid: [{
		validator: (_rule, value, callback) => {
			if (!requiresDepartment.value) {
				callback()
				return
			}

			if (!normalizeText(value)) {
				callback(new Error('请选择所属部门'))
				return
			}

			callback()
		},
		trigger: 'change'
	}]
}

watch(() => jobForm.JobType, (nextValue) => {
	if (!normalizeText(nextValue) || normalizeText(nextValue) !== exclusiveJobTypeValue.value) {
		jobForm.Depid = ''
	}

	nextTick(() => {
		jobFormRef.value?.clearValidate?.(['Depid'])
	})
})

function normalizeText(value: unknown) {
	return String(value ?? '').trim()
}

function normalizeNumber(value: unknown) {
	const next = Number(value)
	return Number.isFinite(next) ? next : 0
}

function findJobTypeValueByLabel(label: string) {
	return normalizeText(jobTypeOptions.value.find((item) => normalizeText(item.label) === label)?.value)
}

function ensureJobTypeDictionaryReady() {
	const missingLabels: string[] = []
	if (!generalJobTypeValue.value) {
		missingLabels.push('通用岗位')
	}
	if (!exclusiveJobTypeValue.value) {
		missingLabels.push('专属岗位')
	}

	if (missingLabels.length > 0) {
		throw new Error(`岗位类别字典缺少：${missingLabels.join('、')}`)
	}
}

function resolveJobTypeLabel(value: unknown) {
	const normalizedValue = normalizeText(value)
	return jobTypeLabelMap.value.get(normalizedValue) || normalizedValue
}

function resetJobForm() {
	jobForm.ID = ''
	jobForm.JobName = ''
	jobForm.jobExpNum = 0
	jobForm.JobType = ''
	jobForm.Depid = ''
	jobForm.JobDuty = ''
}

function isDialogFieldDisabled(fieldName: string) {
	if (jobDialog.mode !== 'edit') {
		return false
	}

	return !canEditField(jobForm.ID, fieldName)
}

function getSelectedDepartmentOption() {
	return departmentOptions.value.find((item) => normalizeText(item.value) === normalizeText(jobForm.Depid)) || null
}

function clearJobList() {
	jobRows.value = []
	pagination.total = 0
	currentJobId.value = ''
	departmentOptions.value = []
	filters.depId = ''
	selectedLevelLabel.value = ''
	selectedLevelCode.value = ''
	jobTableRef.value?.setCurrentRow?.(null)
}

async function initializePage() {
	pageLoading.value = true
	levelLoading.value = true

	try {
		const [levels, jobTypes] = await Promise.all([
			getJobDepartmentLevelOptions(),
			getJobTypeOptions()
		])

		levelOptions.value = levels
		jobTypeOptions.value = jobTypes
	} catch (error) {
		console.error('初始化岗位管理页面失败:', error)
		ElMessage.error('初始化岗位管理页面失败')
	} finally {
		levelLoading.value = false
		pageLoading.value = false
	}
}

async function loadDepartmentOptions() {
	const levelCode = normalizeText(selectedLevelCode.value)
	if (!levelCode) {
		departmentOptions.value = []
		filters.depId = ''
		return
	}

	departmentOptions.value = await getJobDepartmentOptions(levelCode)
	if (!departmentOptions.value.some((item) => normalizeText(item.value) === normalizeText(filters.depId))) {
		filters.depId = ''
	}
	if (!departmentOptions.value.some((item) => normalizeText(item.value) === normalizeText(jobForm.Depid))) {
		jobForm.Depid = ''
	}
}

async function loadJobList() {
	const levelCode = normalizeText(selectedLevelCode.value)
	if (!levelCode) {
		jobRows.value = []
		pagination.total = 0
		currentJobId.value = ''
		pageDataTable.value = null
		return
	}

	const requestId = ++jobListRequestId
	jobLoading.value = true

	try {
		const result = await getJobManagementPage({
			depLevelCode: levelCode,
			pageNo: pagination.pageNo,
			pageSize: pagination.pageSize,
			jobName: filters.jobName,
			jobType: filters.jobType,
			depId: filters.depId
		})

		if (requestId !== jobListRequestId) {
			return
		}

		pageDataTable.value = result.dataTable || null
		jobRows.value = result.list
		pagination.total = result.total
		currentJobId.value = jobRows.value.some((item) => normalizeText(item.ID) === currentJobId.value) ? currentJobId.value : ''

		await nextTick()
		const currentRow = jobRows.value.find((item) => normalizeText(item.ID) === currentJobId.value) || null
		jobTableRef.value?.setCurrentRow?.(currentRow)
	} catch (error) {
		if (requestId !== jobListRequestId) {
			return
		}

		console.error('加载岗位列表失败:', error)
		ElMessage.error('加载岗位列表失败')
		pageDataTable.value = null
	} finally {
		if (requestId === jobListRequestId) {
			jobLoading.value = false
		}
	}
}

async function handleLevelSelect(item: JobManagementDictOption) {
	const nextLevelCode = normalizeText(item.value)
	if (!nextLevelCode) {
		return
	}

	selectedLevelCode.value = nextLevelCode
	selectedLevelLabel.value = normalizeText(item.label)
	currentJobId.value = ''
	pagination.pageNo = 1
	filters.depId = ''

	try {
		await loadDepartmentOptions()
		await loadJobList()
	} catch (error) {
		console.error('切换部门级别失败:', error)
		ElMessage.error('切换部门级别失败')
	}
}

function handleCurrentChange(row: JobManagementJobRecord | null) {
	currentJobId.value = normalizeText(row?.ID)
}

function handleSearch() {
	if (!selectedLevelCode.value) {
		return
	}

	pagination.pageNo = 1
	void loadJobList()
}

function handlePageChange(pageNo: number) {
	pagination.pageNo = pageNo
	void loadJobList()
}

function handlePageSizeChange(pageSize: number) {
	pagination.pageSize = pageSize
	pagination.pageNo = 1
	void loadJobList()
}

function handleAddJob() {
	if (!selectedLevelCode.value || !canOperate.value) {
		ElMessage.warning('请先选择部门级别')
		return
	}

	try {
		ensureJobTypeDictionaryReady()
	} catch (error: any) {
		ElMessage.error(error.message || '岗位类别字典缺失')
		return
	}

	jobDialog.mode = 'add'
	jobDialog.visible = true
	resetJobForm()

	nextTick(() => {
		jobFormRef.value?.clearValidate?.()
	})
}

function handleEditJob() {
	if (!currentJobRow.value || !canEdit.value) {
		ElMessage.warning('请先选择需要编辑的岗位')
		return
	}

	try {
		ensureJobTypeDictionaryReady()
	} catch (error: any) {
		ElMessage.error(error.message || '岗位类别字典缺失')
		return
	}

	jobDialog.mode = 'edit'
	jobDialog.visible = true
	jobForm.ID = normalizeText(currentJobRow.value.ID)
	jobForm.JobName = normalizeText(currentJobRow.value.JobName)
	jobForm.jobExpNum = normalizeNumber(currentJobRow.value.jobExpNum)
	jobForm.JobType = normalizeText(currentJobRow.value.JobType)
	jobForm.Depid = normalizeText(currentJobRow.value.Depid)
	jobForm.JobDuty = normalizeText(currentJobRow.value.JobDuty)

	nextTick(() => {
		jobFormRef.value?.clearValidate?.()
	})
}

async function handleDeleteJob() {
	if (!currentJobRow.value || !canDelete.value) {
		ElMessage.warning('请先选择需要删除的岗位')
		return
	}

	try {
		await ElMessageBox.confirm(`确定删除岗位“${currentJobRow.value.JobName || ''}”吗？`, '删除确认', {
			type: 'warning'
		})
	} catch {
		return
	}

	try {
		await deleteJobManagementJob(currentJobRow.value.ID)
		if (jobRows.value.length === 1 && pagination.pageNo > 1) {
			pagination.pageNo -= 1
		}
		currentJobId.value = ''
		await loadJobList()
		ElMessage.success('岗位删除成功')
	} catch (error) {
		console.error('删除岗位失败:', error)
		ElMessage.error('删除岗位失败')
	}
}

async function handleDialogConfirm() {
	if (!jobFormRef.value || !selectedLevelCode.value || submitDisabled.value) {
		return
	}

	try {
		ensureJobTypeDictionaryReady()
		await jobFormRef.value.validate()
	} catch (error: any) {
		if (error instanceof Error) {
			ElMessage.warning(error.message)
		}
		return
	}

	const selectedDepartment = getSelectedDepartmentOption()
	const payload = {
		depLevelCode: selectedLevelCode.value,
		depLevel: selectedLevelLabel.value,
		jobName: jobForm.JobName,
		jobExpNum: jobForm.jobExpNum,
		jobDuty: jobForm.JobDuty,
		jobType: jobForm.JobType,
		depId: requiresDepartment.value ? normalizeText(jobForm.Depid) : '',
		depName: requiresDepartment.value ? normalizeText(selectedDepartment?.label) : ''
	}

	jobDialog.saving = true
	try {
		if (jobDialog.mode === 'add') {
			const result = await createJobManagementJob(payload)
			currentJobId.value = normalizeText(result.ID)
			ElMessage.success('岗位新增成功')
		} else {
			await updateJobManagementJob({
				ID: jobForm.ID,
				...payload
			})
			currentJobId.value = normalizeText(jobForm.ID)
			ElMessage.success('岗位保存成功')
		}

		jobDialog.visible = false
		await loadJobList()
	} catch (error) {
		console.error('保存岗位失败:', error)
		ElMessage.error('保存岗位失败')
	} finally {
		jobDialog.saving = false
	}
}

onMounted(() => {
	void initializePage()
})
</script>

<style scoped lang="scss">
.job-management-page-shell {
	:deep(.page-content),
	:deep(.vben-page-content),
	:deep(.ant-page-content) {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}
}

.job-management-page {
	height: calc(100vh - 112px);
	max-height: calc(100vh - 112px);
	min-height: 0;
	overflow: hidden;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	display: flex;
	gap: 16px;
	height: 100%;
	min-height: 0;
	padding: 16px;
	background: #f5f7fb;
}

.job-management-page__sidebar {
	width: 320px;
	min-width: 280px;
	flex: 0 0 auto;
}

.job-management-page__content {
	flex: 1;
	min-width: 0;
}

.panel-card {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: #fff;
	border: 1px solid #e4e7ed;
	border-radius: 10px;
	overflow: hidden;
}

.panel-card--main {
	height: 100%;
	min-height: 0;
}

.panel-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 20px;
	border-bottom: 1px solid #ebeef5;
}

.panel-card__header--compact {
	justify-content: flex-start;
	padding: 14px 18px;
}

.panel-card__title-wrap {
	min-width: 0;
}

.panel-card__title {
	font-size: 18px;
	font-weight: 600;
	color: #1f2937;
}

.panel-card__subtitle {
	margin-top: 4px;
	font-size: 13px;
	color: #6b7280;
}

.panel-card__actions {
	display: flex;
	gap: 12px;
}

.panel-card__body {
	flex: 1;
	min-height: 0;
}

.panel-card__body--sidebar {
	overflow: auto;
	padding: 12px;
}

.panel-card__body--table {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 12px;
	min-height: 0;
	overflow: hidden;
	padding: 16px 20px;
}

.panel-card__body--table > .el-table {
	flex: 1;
	min-height: 0;
}

.pagination-wrap {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex: 0 0 44px;
	min-height: 44px;
	padding-top: 8px;
	background: var(--el-bg-color);
}

.panel-card__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.level-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.level-list__item {
	width: 100%;
	padding: 14px 16px;
	border: 1px solid #dcdfe6;
	border-radius: 8px;
	background: #fff;
	color: #303133;
	font-size: 14px;
	text-align: left;
	cursor: pointer;
	transition: all 0.2s ease;
}

.level-list__item:hover {
	border-color: #409eff;
	color: #409eff;
}

.level-list__item.is-active {
	border-color: #409eff;
	background: #ecf5ff;
	color: #409eff;
	font-weight: 600;
}

.job-table__header-label {
	font-weight: 600;
	color: #303133;
}

.job-table__header-cell {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 6px 0;
}

.job-table__header-text {
	font-weight: 600;
	line-height: 1;
	color: #303133;
}

.pagination-wrap {
	display: flex;
	justify-content: flex-end;
	padding-top: 4px;
}

.job-form__number,
.job-form__select {
	width: 100%;
}

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

@media (max-width: 1200px) {
	.job-management-page {
		flex-direction: column;
	}

	.job-management-page__sidebar {
		width: 100%;
		min-width: 0;
	}

	.panel-card--sidebar {
		height: auto;
	}

	.level-list {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.level-list__item {
		width: calc(50% - 4px);
	}

	.panel-card__actions {
		flex-wrap: wrap;
	}
	}

@media (max-width: 768px) {
	.job-management-page {
		padding: 12px;
	}

	.panel-card__header,
	.panel-card__body--table {
		padding-left: 12px;
		padding-right: 12px;
	}

	.level-list__item {
		width: 100%;
	}
	}
</style>
