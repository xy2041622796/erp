<template>
	<Page auto-content-height class="h-full organization-structure-page-shell">
		<div v-loading="pageLoading" class="organization-structure-page">
		<section class="organization-structure-page__sidebar">
			<div class="panel-card panel-card--sidebar">
				<div class="panel-card__toolbar">
					<el-button type="primary" :icon="Plus" circle :disabled="!canAddDepartment" @click="handleAddDepartment" />
					<el-button type="primary" plain :icon="Edit" circle :disabled="!canEditDepartment" @click="handleEditDepartment" />
					<el-button type="danger" plain :icon="Delete" circle :disabled="!canDeleteDepartment" @click="handleDeleteDepartment" />
				</div>

				<div class="panel-card__body panel-card__body--tree" v-loading="departmentLoading || departmentMoveSaving">
					<el-tree
						ref="departmentTreeRef"
						:data="departmentTreeData"
						node-key="DepID"
						draggable
						highlight-current
						:expand-on-click-node="false"
						:default-expanded-keys="expandedDepartmentKeys"
						:allow-drag="allowDepartmentNodeDrag"
						:allow-drop="allowDepartmentNodeDrop"
						@node-click="handleDepartmentNodeClick"
						@node-drop="handleDepartmentNodeDrop"
					>
						<template #default="slotProps">
							<div v-if="slotProps?.data" class="department-node">
								<el-icon class="department-node__icon">
									<OfficeBuilding v-if="isRootDepartment(slotProps.data)" />
									<User v-else />
								</el-icon>
								<span class="department-node__label">{{ formatDepartmentLabel(slotProps.data) }}</span>
							</div>
						</template>
					</el-tree>

					<el-empty v-if="!departmentLoading && !departmentTreeData.length" description="暂无部门数据" />
				</div>
			</div>
		</section>

		<section class="organization-structure-page__content">
			<div class="panel-card panel-card--main">
				<div class="panel-card__header">
					<div class="panel-card__title-wrap">
						<div class="panel-card__title">岗位人员配置</div>
						<div class="panel-card__subtitle">{{ currentDepartment ? currentDepartment.DepName : '请选择左侧部门' }}</div>
					</div>

					<div class="panel-card__actions">
						<el-button type="primary" :icon="Plus" :disabled="!canAddJob" @click="handleAddJob">专属岗位</el-button>
						<el-button type="danger" plain :icon="Delete" :disabled="!canDeleteJob" @click="handleDeleteJob">专属岗位</el-button>
					</div>
				</div>

				<div v-if="currentDepartment" class="panel-card__body panel-card__body--table" v-loading="jobLoading">
					<el-table
						ref="jobTableRef"
						height="100%"
						:data="jobRows"
						border
						row-key="jobKey"
						highlight-current-row
						empty-text="当前部门暂无岗位"
						@current-change="handleJobCurrentChange"
					>
						<el-table-column type="index" label="#" width="70" align="center" />
						<el-table-column label="岗位类型" min-width="140" show-overflow-tooltip>
							<template #default="scope">
								{{ scope?.row ? (resolveJobTypeLabel(scope.row.IsExclusive) || '-') : '-' }}
							</template>
						</el-table-column>
						<el-table-column prop="JobName" label="岗位名称" min-width="220" show-overflow-tooltip />
						<el-table-column label="人员" min-width="420">
							<template #default="scope">
								<div v-if="scope?.row" class="job-person-cell">
									<PersonSelector
										:value="jobUserValueMap[scope.row.jobKey] || []"
										:max="0"
										:disabled="jobUserSavingKey === scope.row.jobKey"
										placeholder="暂无人员"
										@confirm="handleJobUsersConfirm(scope.row, $event)"
									/>
								</div>
							</template>
						</el-table-column>
						<el-table-column label="操作" width="120" align="center">
							<template #default="scope">
								<el-button v-if="scope?.row" link type="primary" :disabled="jobUserSettingsDialog.loading || jobUserSavingKey === scope.row.jobKey || !canOpenJobUserSettings(scope.row)" @click="handleOpenJobUserSettings(scope.row)">
									人员设置
								</el-button>
							</template>
						</el-table-column>
					</el-table>
				</div>

				<div v-else class="panel-card__empty">
					<el-empty description="请选择左侧部门后查看岗位与人员" />
				</div>
			</div>
		</section>

		<el-dialog
			v-model="departmentDialog.visible"
			:title="departmentDialog.mode === 'add' ? '新增部门' : '部门编辑'"
			width="900px"
			destroy-on-close
			:close-on-click-modal="false"
		>
			<el-form
				ref="departmentFormRef"
				:model="departmentForm"
				:rules="departmentRules"
				label-width="110px"
				class="department-form"
			>
				<el-form-item label="部门名称" prop="DepName">
					<el-input v-model="departmentForm.DepName" maxlength="64" :disabled="isDepartmentFieldDisabled('DepName')" />
				</el-form-item>

				<el-form-item label="部门代字" prop="DepShortName">
					<el-input v-model="departmentForm.DepShortName" maxlength="32" :disabled="isDepartmentFieldDisabled('DepShortName')" />
				</el-form-item>

				<el-form-item label="部门排序" prop="DepCode">
					<el-input v-model="departmentForm.DepCode" maxlength="16" :disabled="isDepartmentFieldDisabled('DepCode')" />
				</el-form-item>

				<el-form-item label="部门类型" required>
					<div class="department-form__type-list">
						<el-checkbox :model-value="departmentForm.IsTrue === 0" :disabled="isDepartmentFieldDisabled('IsTrue')" @change="handleDepartmentTypeChange(0, $event)">
							{{ nonEntityDepartmentLabel }}
						</el-checkbox>
						<el-checkbox :model-value="departmentForm.IsTrue === 1" :disabled="isDepartmentFieldDisabled('IsTrue')" @change="handleDepartmentTypeChange(1, $event)">
							{{ entityDepartmentLabel }}
						</el-checkbox>
					</div>
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="departmentDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="departmentDialog.saving" :disabled="departmentDialogSubmitDisabled" @click="handleDepartmentDialogConfirm">保存</el-button>
				</div>
			</template>
		</el-dialog>

		<el-dialog
			v-model="jobDialog.visible"
			title="岗位新增"
			width="900px"
			destroy-on-close
			:close-on-click-modal="false"
		>
			<el-form
				ref="jobFormRef"
				:model="jobForm"
				:rules="jobRules"
				label-width="110px"
				class="job-form"
			>
				<el-form-item label="岗位名称" prop="JobName">
					<el-input v-model="jobForm.JobName" maxlength="64" />
				</el-form-item>

				<el-form-item label="岗位编制">
					<el-input-number v-model="jobForm.jobExpNum" :min="0" :step="1" controls-position="right" class="job-form__number" />
				</el-form-item>

				<el-form-item label="岗位职责">
					<el-input v-model="jobForm.JobDuty" type="textarea" :rows="6" maxlength="500" show-word-limit />
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="jobDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="jobDialog.saving" @click="handleJobDialogConfirm">保存</el-button>
				</div>
			</template>
		</el-dialog>

		<el-dialog
			v-model="jobUserSettingsDialog.visible"
			title="人员设置"
			width="1280px"
			destroy-on-close
			append-to-body
			:close-on-click-modal="false"
			@closed="resetJobUserSettingsState"
		>
			<div v-loading="jobUserSettingsDialog.loading" class="job-user-settings-dialog">
				<el-table
					:data="jobUserSettingsRows"
					height="420"
					border
					row-key="rowid"
					empty-text="暂无人员信息"
					class="job-user-settings-table"
				>
					<el-table-column type="index" label="#" width="60" align="center" />
					<el-table-column prop="UserName" label="用户姓名" min-width="140" show-overflow-tooltip />
					<el-table-column label="用户岗位类型" min-width="210">
						<template #default="scope">
							<el-radio-group v-model="scope.row.JobType" class="job-user-settings__radio-group">
								<el-radio v-for="item in userJobTypeOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
							</el-radio-group>
						</template>
					</el-table-column>
					<el-table-column label="主持工作" width="120" align="center">
						<template #default="scope">
							<el-checkbox v-model="scope.row.IsWork" :true-value="1" :false-value="0" />
						</template>
					</el-table-column>
					<el-table-column label="工作职责" min-width="360">
						<template #default="scope">
							<el-input v-model="scope.row.JobRespon" maxlength="500" show-word-limit />
						</template>
					</el-table-column>
					<el-table-column label="备注" min-width="300">
						<template #default="scope">
							<el-input v-model="scope.row.Memo" maxlength="500" show-word-limit />
						</template>
					</el-table-column>
				</el-table>

				<div class="job-user-settings-dialog__summary">
					<div class="job-user-settings-dialog__summary-label">总职责：</div>
					<div class="job-user-settings-dialog__summary-content">{{ currentJobDuty || '-' }}</div>
				</div>
			</div>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="jobUserSettingsDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="jobUserSettingsDialog.saving" @click="handleSaveJobUserSettings">保存</el-button>
				</div>
			</template>
		</el-dialog>
		</div>
	</Page>
</template>

<script setup lang="ts">
import { Page } from '@vben/common-ui'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { Delete, Edit, OfficeBuilding, Plus, User } from '@element-plus/icons-vue'
import {
	ElButton,
	ElCheckbox,
	ElDialog,
	ElEmpty,
	ElForm,
	ElFormItem,
	ElIcon,
	ElInput,
	ElInputNumber,
	ElMessage,
	ElMessageBox,
	ElRadio,
	ElRadioGroup,
	ElTable,
	ElTableColumn,
	ElTree,
	type FormInstance,
	type FormRules
} from 'element-plus'
import type { DataTable } from '#/api/qyapi'
import PersonSelector from '#/views/hr/components/person-selector/index.vue'
import { useDataTableAuth } from '#/hooks/use-data-table-auth'
import { type PersonSelectorValueItem } from '#/api/common/person-selector'
import {
	ROOT_PARENT_ID,
	createDepartment,
	createJob,
	deleteDepartment,
	deleteJob,
	getDepartmentList,
	getDepartmentTypeOptions,
	getDepartmentJobList,
	getJobDutyByRowid,
	getJobByIdentity,
	getJobTypeOptions,
	getJobUserSettings,
	getUserJobTypeOptions,
	moveDepartment,
	saveJobUserAssignments,
	saveJobUserSettings,
	splitCommaText,
	updateDepartment,
	type OrganizationDepartmentRecord,
	type OrganizationDictOption,
	type OrganizationJobUserSettingRecord,
	type OrganizationJobListRow
} from '#/api/erp/human-resources/organization-structure'
import { useUserStore } from '@vben/stores'

type DepartmentDialogMode = 'add' | 'edit'

interface DepartmentFormState {
	DepName: string
	DepShortName: string
	DepCode: string
	IsTrue: number
}

interface JobFormState {
	JobName: string
	jobExpNum: number
	JobDuty: string
}

interface JobUserSettingsRowState {
	rowid: string
	UserID: string
	UserName: string
	JobType: string
	IsWork: number
	JobRespon: string
	Memo: string
}

const departmentTreeRef = ref<any>(null)
const jobTableRef = ref<any>(null)
const departmentFormRef = ref<FormInstance>()
const jobFormRef = ref<FormInstance>()

const userStore = useUserStore()

const pageLoading = ref(false)
const departmentLoading = ref(false)
const departmentMoveSaving = ref(false)
const jobLoading = ref(false)
const departmentDataTable = ref<DataTable | null>(null)
const jobDataTable = ref<DataTable | null>(null)

const flatDepartmentList = ref<OrganizationDepartmentRecord[]>([])
const departmentTreeData = ref<OrganizationDepartmentRecord[]>([])
const selectedDepartmentId = ref('')
const expandedDepartmentKeys = ref<string[]>([])
const jobRows = ref<OrganizationJobListRow[]>([])
const currentJobKey = ref('')
const departmentTypeOptions = ref<OrganizationDictOption[]>([])
const jobTypeOptions = ref<OrganizationDictOption[]>([])

const departmentRecordMap = reactive<Record<string, OrganizationDepartmentRecord>>({})
const jobUserValueMap = reactive<Record<string, PersonSelectorValueItem[]>>({})
const jobUserSettingsRows = ref<JobUserSettingsRowState[]>([])
const jobUserSettingsSnapshot = ref<JobUserSettingsRowState[]>([])
const currentJobDuty = ref('')
const userJobTypeOptions = ref<OrganizationDictOption[]>([])

const departmentDialog = reactive({
	visible: false,
	mode: 'add' as DepartmentDialogMode,
	saving: false
})

const jobDialog = reactive({
	visible: false,
	saving: false
})

const jobUserSettingsDialog = reactive({
	visible: false,
	loading: false,
	saving: false,
	jobKey: ''
})

const departmentForm = reactive<DepartmentFormState>({
	DepName: '',
	DepShortName: '',
	DepCode: '',
	IsTrue: 1
})

const jobForm = reactive<JobFormState>({
	JobName: '',
	jobExpNum: 0,
	JobDuty: ''
})

let jobListRequestId = 0
const jobUserSavingKey = ref('')
const MAX_DEPARTMENT_LEVEL = 4

const {
	canAdd: canAddDepartmentData,
	canEditRow: canEditDepartmentRow,
	canDeleteRow: canDeleteDepartmentRow,
	canEditField: canEditDepartmentField
} = useDataTableAuth(departmentDataTable)
const {
	canAdd: canAddJobData,
	canEditRow: canEditJobRow,
	canDeleteRow: canDeleteJobRow
} = useDataTableAuth(jobDataTable)

const departmentRules: FormRules<DepartmentFormState> = {
	DepName: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
	DepShortName: [
		{ required: true, message: '请输入部门代字', trigger: 'blur' },
		{
			validator: (_rule, value, callback) => {
				const normalizedValue = normalizeText(value)
				if (!normalizedValue) {
					callback()
					return
				}

				if (!/^[A-Za-z0-9]+$/.test(normalizedValue)) {
					callback(new Error('部门简称仅允许字母和数字组合'))
					return
				}

				callback()
			},
			trigger: 'blur'
		}
	],
	DepCode: [{ required: true, message: '请输入部门排序', trigger: 'blur' }]
}

const jobRules: FormRules<JobFormState> = {
	JobName: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
}

const currentDepartment = computed(() => departmentRecordMap[selectedDepartmentId.value] || null)
const currentJobRow = computed(() => jobRows.value.find((item) => item.jobKey === currentJobKey.value) || null)
const currentJobUserSettingsRow = computed(() => jobRows.value.find((item) => item.jobKey === jobUserSettingsDialog.jobKey) || null)
const rootDepartmentIds = computed(() => departmentTreeData.value.map((item) => normalizeText(item.DepID)).filter(Boolean))
const departmentTypeLabelMap = computed(() => new Map(departmentTypeOptions.value.map((item) => [normalizeText(item.value), normalizeText(item.label)])))
const jobTypeLabelMap = computed(() => new Map(jobTypeOptions.value.map((item) => [normalizeText(item.value), normalizeText(item.label)])))
const entityDepartmentLabel = computed(() => departmentTypeLabelMap.value.get('1') || '实体部门')
const nonEntityDepartmentLabel = computed(() => departmentTypeLabelMap.value.get('0') || '非实体部门')
const canAddDepartment = computed(() => canAddDepartmentData() && (!currentDepartment.value || normalizeNumber(currentDepartment.value?.DepLevel) < MAX_DEPARTMENT_LEVEL))
const canEditDepartment = computed(() => canDepartmentRowEdit(currentDepartment.value))
const canDeleteDepartment = computed(() => Boolean(currentDepartment.value) && normalizeText(currentDepartment.value?.DepLevelCode) !== '0' && canDepartmentRowDelete(currentDepartment.value))
const canAddJob = computed(() => Boolean(currentDepartment.value) && canAddJobData())
const canDeleteJob = computed(() => Boolean(currentDepartment.value && isExclusiveJob(currentJobRow.value) && canJobRowDelete(currentJobRow.value)))
const departmentDialogSubmitDisabled = computed(() => departmentDialog.mode === 'add' ? !canAddDepartmentData() : !canEditDepartment.value)

function normalizeText(value: unknown) {
	return String(value ?? '').trim()
}

function normalizeNumber(value: unknown) {
	const next = Number(value)
	return Number.isFinite(next) ? next : 0
}

function canDepartmentRowEdit(record: OrganizationDepartmentRecord | null | undefined) {
	if (!record) {
		return false
	}

	if (record.rowid && canEditDepartmentRow(record.rowid)) {
		return true
	}

	return Boolean(departmentDataTable.value?.authCheck?.getRowAuth(record.raw, null, 'allowEdit'))
}

function canDepartmentRowDelete(record: OrganizationDepartmentRecord | null | undefined) {
	if (!record) {
		return false
	}

	if (record.rowid && canDeleteDepartmentRow(record.rowid)) {
		return true
	}

	return Boolean(departmentDataTable.value?.authCheck?.getRowAuth(record.raw, null, 'allowDelete'))
}

function isDepartmentFieldDisabled(fieldName: string) {
	if (departmentDialog.mode !== 'edit') {
		return false
	}

	const record = currentDepartment.value
	if (!record || !fieldName) {
		return true
	}

	if (record.rowid && canEditDepartmentField(record.rowid, fieldName)) {
		return false
	}

	const canEdit = departmentDataTable.value?.authCheck?.getRowAuth(record.raw, fieldName, 'isEdit') ?? false
	return !canEdit
}

function canJobRowEdit(record: OrganizationJobListRow | null | undefined) {
	if (!record) {
		return false
	}

	if (record.rowid && canEditJobRow(record.rowid)) {
		return true
	}

	return Boolean(jobDataTable.value?.authCheck?.getRowAuth(record.raw, null, 'allowEdit'))
}

function canJobRowDelete(record: OrganizationJobListRow | null | undefined) {
	if (!record) {
		return false
	}

	if (record.rowid && canDeleteJobRow(record.rowid)) {
		return true
	}

	return Boolean(jobDataTable.value?.authCheck?.getRowAuth(record.raw, null, 'allowDelete'))
}

function canOpenJobUserSettings(record: OrganizationJobListRow | null | undefined) {
	return canJobRowEdit(record)
}

function clonePersonValueList(list: PersonSelectorValueItem[]) {
	return (Array.isArray(list) ? list : []).map((item) => ({
		UserId: normalizeText(item.UserId),
		UserName: normalizeText(item.UserName)
	})).filter((item) => item.UserId)
}

function isSamePersonValueList(left: PersonSelectorValueItem[], right: PersonSelectorValueItem[]) {
	const leftIds = Array.from(new Set(clonePersonValueList(left).map((item) => item.UserId))).sort()
	const rightIds = Array.from(new Set(clonePersonValueList(right).map((item) => item.UserId))).sort()

	if (leftIds.length !== rightIds.length) {
		return false
	}

	return leftIds.every((item, index) => item === rightIds[index])
}

function cloneJobUserSettingsRows(list: JobUserSettingsRowState[]) {
	return (Array.isArray(list) ? list : []).map((item) => ({
		rowid: normalizeText(item.rowid),
		UserID: normalizeText(item.UserID),
		UserName: normalizeText(item.UserName),
		JobType: normalizeText(item.JobType),
		IsWork: normalizeNumber(item.IsWork),
		JobRespon: normalizeText(item.JobRespon),
		Memo: normalizeText(item.Memo)
	}))
}

function createJobUserSettingsRow(item: OrganizationJobUserSettingRecord): JobUserSettingsRowState {
	return {
		rowid: normalizeText(item.rowid),
		UserID: normalizeText(item.UserID),
		UserName: normalizeText(item.UserName),
		JobType: normalizeText(item.JobType),
		IsWork: normalizeNumber(item.IsWork),
		JobRespon: normalizeText(item.JobRespon),
		Memo: normalizeText(item.Memo)
	}
}

function getChangedJobUserSettingsRows() {
	const snapshotMap = new Map(jobUserSettingsSnapshot.value.map((item) => [normalizeText(item.rowid), item]))

	return cloneJobUserSettingsRows(jobUserSettingsRows.value).filter((item) => {
		const snapshot = snapshotMap.get(item.rowid)
		if (!snapshot) {
			return false
		}

		return (
			normalizeText(snapshot.JobType) !== normalizeText(item.JobType)
			|| normalizeNumber(snapshot.IsWork) !== normalizeNumber(item.IsWork)
			|| normalizeText(snapshot.JobRespon) !== normalizeText(item.JobRespon)
			|| normalizeText(snapshot.Memo) !== normalizeText(item.Memo)
		)
	})
}

function resetJobUserSettingsState() {
	jobUserSettingsDialog.jobKey = ''
	jobUserSettingsRows.value = []
	jobUserSettingsSnapshot.value = []
	currentJobDuty.value = ''
}

function clearReactiveRecord(target: Record<string, any>) {
	Object.keys(target).forEach((key) => {
		delete target[key]
	})
}

function compareDepartment(left: OrganizationDepartmentRecord, right: OrganizationDepartmentRecord) {
	const orderDiff = normalizeNumber(left.DepCode) - normalizeNumber(right.DepCode)
	if (orderDiff !== 0) {
		return orderDiff
	}

	return normalizeText(left.DepName).localeCompare(normalizeText(right.DepName), 'zh-CN')
}

function buildDepartmentTree(records: OrganizationDepartmentRecord[]) {
	const clonedList = records
		.map((item) => ({
			...item,
			children: [] as OrganizationDepartmentRecord[],
			leaf: true
		}))
		.sort(compareDepartment)

	const nodeMap = new Map<string, OrganizationDepartmentRecord>()
	clonedList.forEach((item) => {
		if (item.DepID) {
			nodeMap.set(item.DepID, item)
		}
	})

	const roots: OrganizationDepartmentRecord[] = []
	clonedList.forEach((item) => {
		const parentId = normalizeText(item.Prowid)
		if (parentId && parentId !== ROOT_PARENT_ID && nodeMap.has(parentId)) {
			const parentNode = nodeMap.get(parentId) as OrganizationDepartmentRecord
			parentNode.children.push(item)
			parentNode.leaf = false
			return
		}

		roots.push(item)
	})

	const sortChildren = (nodes: OrganizationDepartmentRecord[]) => {
		nodes.sort(compareDepartment)
		nodes.forEach((item) => {
			if (item.children.length > 0) {
				item.leaf = false
				sortChildren(item.children)
			} else {
				item.leaf = true
			}
		})
	}

	sortChildren(roots)
	return roots
}

function cacheDepartmentTree(nodes: OrganizationDepartmentRecord[]) {
	clearReactiveRecord(departmentRecordMap)

	const walk = (list: OrganizationDepartmentRecord[]) => {
		list.forEach((item) => {
			if (item.DepID) {
				departmentRecordMap[item.DepID] = item
			}

			if (item.children.length > 0) {
				walk(item.children)
			}
		})
	}

	walk(nodes)
}

function buildExpandedDepartmentKeys(depId: string) {
	const keys = rootDepartmentIds.value.slice()
	let current = depId ? departmentRecordMap[depId] || null : null

	while (current) {
		const currentId = normalizeText(current.DepID)
		if (currentId) {
			keys.push(currentId)
		}

		const parentId = normalizeText(current.Prowid)
		if (!parentId || parentId === ROOT_PARENT_ID) {
			break
		}

		current = departmentRecordMap[parentId] || null
	}

	return Array.from(new Set(keys))
}

function getDepartmentActualDepth(depId: string) {
	const normalizedDepId = normalizeText(depId)
	if (!normalizedDepId) {
		return 0
	}

	let depth = 0
	let current = departmentRecordMap[normalizedDepId] || null
	const visited = new Set<string>()

	while (current) {
		const currentId = normalizeText(current.DepID)
		if (!currentId || visited.has(currentId)) {
			break
		}

		visited.add(currentId)
		const parentId = normalizeText(current.Prowid)
		if (!parentId || parentId === ROOT_PARENT_ID || !departmentRecordMap[parentId]) {
			break
		}

		depth += 1
		current = departmentRecordMap[parentId] || null
	}

	return depth
}

function getDepartmentSubtreeMaxRelativeDepth(record: OrganizationDepartmentRecord | null | undefined): number {
	if (!record || record.children.length === 0) {
		return 0
	}

	return Math.max(...record.children.map((item) => 1 + getDepartmentSubtreeMaxRelativeDepth(item)))
}

function isDepartmentAncestorOrSelf(ancestorDepId: string, targetDepId: string) {
	const normalizedAncestorDepId = normalizeText(ancestorDepId)
	const normalizedTargetDepId = normalizeText(targetDepId)
	if (!normalizedAncestorDepId || !normalizedTargetDepId) {
		return false
	}

	if (normalizedAncestorDepId === normalizedTargetDepId) {
		return true
	}

	let current = departmentRecordMap[normalizedTargetDepId] || null
	const visited = new Set<string>()

	while (current) {
		const currentId = normalizeText(current.DepID)
		if (!currentId || visited.has(currentId)) {
			break
		}

		if (currentId === normalizedAncestorDepId) {
			return true
		}

		visited.add(currentId)
		const parentId = normalizeText(current.Prowid)
		if (!parentId || parentId === ROOT_PARENT_ID) {
			break
		}

		current = departmentRecordMap[parentId] || null
	}

	return false
}

function resetDepartmentForm() {
	departmentForm.DepName = ''
	departmentForm.DepShortName = ''
	departmentForm.DepCode = ''
	departmentForm.IsTrue = 1
}

function resetJobForm() {
	jobForm.JobName = ''
	jobForm.jobExpNum = 0
	jobForm.JobDuty = ''
}

function clearJobUserValueMap() {
	clearReactiveRecord(jobUserValueMap)
}

function assignFallbackJobUsers(rows: OrganizationJobListRow[]) {
	clearJobUserValueMap()
	rows.forEach((item) => {
		jobUserValueMap[item.jobKey] = splitCommaText(item.UserID).map((userId) => ({
			UserId: userId,
			UserName: userId
		}))
	})
}

function resetJobListState() {
	jobRows.value = []
	currentJobKey.value = ''
	clearJobUserValueMap()
}

function isRootDepartment(data: OrganizationDepartmentRecord) {
	return normalizeText(data.DepLevelCode) === '0'
}

function getDepartmentMoveError(
	sourceDepartment: OrganizationDepartmentRecord | null | undefined,
	targetParentDepartment: OrganizationDepartmentRecord | null | undefined,
	dropType: string
) {
	if (departmentLoading.value || departmentMoveSaving.value) {
		return '部门树正在处理中，请稍后再试'
	}

	if (dropType !== 'inner') {
		return '仅支持拖动到目标部门内部'
	}

	if (!sourceDepartment?.DepID || !targetParentDepartment?.DepID) {
		return '拖拽节点信息不完整'
	}

	if (isRootDepartment(sourceDepartment)) {
		return '根节点不允许拖动'
	}

	const sourceDepId = normalizeText(sourceDepartment.DepID)
	const targetParentDepId = normalizeText(targetParentDepartment.DepID)
	if (sourceDepId === targetParentDepId) {
		return '不能拖动到自己下面'
	}

	if (normalizeText(sourceDepartment.Prowid) === targetParentDepId) {
		return '当前拖拽不会改变父级关系'
	}

	if (isDepartmentAncestorOrSelf(sourceDepId, targetParentDepId)) {
		return '不能拖动到自己的子节点下面'
	}

	const targetDepth = getDepartmentActualDepth(targetParentDepId)
	const subtreeMaxRelativeDepth = getDepartmentSubtreeMaxRelativeDepth(sourceDepartment)
	if (targetDepth + 1 + subtreeMaxRelativeDepth > MAX_DEPARTMENT_LEVEL) {
		return `拖动后部门层级不能超过 ${MAX_DEPARTMENT_LEVEL} 级`
	}

	return ''
}

function allowDepartmentNodeDrag(draggingNode: any) {
	const sourceDepartment = draggingNode?.data as OrganizationDepartmentRecord | undefined
	return Boolean(sourceDepartment?.DepID) && !departmentLoading.value && !departmentMoveSaving.value && !isRootDepartment(sourceDepartment)
}

function allowDepartmentNodeDrop(draggingNode: any, dropNode: any, dropType: string) {
	const sourceDepartment = draggingNode?.data as OrganizationDepartmentRecord | undefined
	const targetParentDepartment = dropNode?.data as OrganizationDepartmentRecord | undefined
	return !getDepartmentMoveError(sourceDepartment, targetParentDepartment, dropType)
}

function formatDepartmentLabel(data: OrganizationDepartmentRecord) {
	if (isRootDepartment(data)) {
		return normalizeText(data.DepName) || normalizeText(data.DepID)
	}

	if (normalizeNumber(data.IsTrue) === 0) {
		return `${normalizeText(data.DepName) || normalizeText(data.DepID)} (非实体)`
	}

	return normalizeText(data.DepName) || normalizeText(data.DepID)
}

function resolveJobTypeLabel(value: unknown) {
	const normalizedValue = normalizeText(value)
	return jobTypeLabelMap.value.get(normalizedValue) || normalizedValue
}

function isExclusiveJob(row: OrganizationJobListRow | null | undefined) {
	return normalizeNumber(row?.JobType ?? row?.raw?.JobType ?? row?.IsExclusive) === 1
}

function handleDepartmentTypeChange(nextValue: number, checked: string | number | boolean) {
	if (checked) {
		departmentForm.IsTrue = nextValue
	}
}

async function loadDepartmentTypeDict() {
	try {
		departmentTypeOptions.value = await getDepartmentTypeOptions()
	} catch (error) {
		console.error('加载部门类型字典失败:', error)
		ElMessage.error('加载部门类型字典失败')
	}
}

async function loadJobTypeDict() {
	try {
		jobTypeOptions.value = await getJobTypeOptions()
	} catch (error) {
		console.error('加载岗位类型字典失败:', error)
		ElMessage.error('加载岗位类型字典失败')
	}
}

async function loadUserJobTypeDict() {
	if (userJobTypeOptions.value.length > 0) {
		return
	}

	try {
		userJobTypeOptions.value = await getUserJobTypeOptions()
	} catch (error) {
		console.error('加载用户岗位类型字典失败:', error)
		ElMessage.error('加载用户岗位类型字典失败')
	}
}

async function loadDepartmentTree(targetSelectedDepId = selectedDepartmentId.value) {
	departmentLoading.value = true

	try {
		const result = await getDepartmentList()
		departmentDataTable.value = result.dataTable || null
		const records = result.list || []
		flatDepartmentList.value = records
		departmentTreeData.value = buildDepartmentTree(records)
		cacheDepartmentTree(departmentTreeData.value)

		const nextSelectedDepId = targetSelectedDepId && departmentRecordMap[targetSelectedDepId]
			? targetSelectedDepId
			: ''

		selectedDepartmentId.value = nextSelectedDepId
		expandedDepartmentKeys.value = buildExpandedDepartmentKeys(nextSelectedDepId)

		await nextTick()
		if (nextSelectedDepId) {
			departmentTreeRef.value?.setCurrentKey?.(nextSelectedDepId)
		}
	} catch (error) {
		departmentDataTable.value = null
		throw error
	} finally {
		departmentLoading.value = false
	}
}

async function resolveJobUsers(rows: OrganizationJobListRow[], requestId: number) {
	clearJobUserValueMap()

	// 从视图行构建映射
	const globalUserMap = new Map<string, PersonSelectorValueItem>()
	rows.forEach((item) => {
		const ids = splitCommaText(item.UserID)
		const names = splitCommaText(item.UserName)
		ids.forEach((id, index) => {
			const normalizedId = normalizeText(id)
			if (normalizedId && !globalUserMap.has(normalizedId)) {
				globalUserMap.set(normalizedId, {
					UserId: normalizedId,
					UserName: normalizeText(names[index]) || normalizedId
				})
			}
		})
	})

	if (requestId !== jobListRequestId) return

	// 对视图 UserID 为空的岗位，从 Base_User_DJ 直接取人员
	const depId = normalizeText(selectedDepartmentId.value)
	const rowsWithoutUsers = rows.filter((item) => splitCommaText(item.UserID).length === 0)
	if (depId && rowsWithoutUsers.length > 0) {
		const fallbackResults = await Promise.allSettled(
			rowsWithoutUsers.map((item) => {
				const jid = normalizeText(item.JobId || item.ID || item.raw?.ID || item.rowid)
				return jid ? getJobUserSettings({ depId, jobId: jid }) : Promise.resolve([])
			})
		)
		if (requestId !== jobListRequestId) return
		for (let i = 0; i < fallbackResults.length; i++) {
			const result = fallbackResults[i]
			if (result.status === "fulfilled") {
				const row = rowsWithoutUsers[i]
				const seen = new Set<string>()
				row._fallbackUsers = result.value.filter((u) => {
					const uid = normalizeText(u.UserID)
					if (!uid || seen.has(uid)) return false
					seen.add(uid)
					return true
				}).map((u) => ({
					UserId: normalizeText(u.UserID),
					UserName: normalizeText(u.UserName) || normalizeText(u.UserID)
				}))
			}
		}
	}

	rows.forEach((item) => {
		const viewIds = splitCommaText(item.UserID)
		if (viewIds.length > 0) {
			jobUserValueMap[item.jobKey] = viewIds.map((userId) => {
				const normalizedId = normalizeText(userId)
				return globalUserMap.get(normalizedId) || {
					UserId: normalizedId,
					UserName: normalizedId
				}
			})
		} else {
			jobUserValueMap[item.jobKey] = (item as any)._fallbackUsers || []
		}
	})
}

async function loadJobList(depId = selectedDepartmentId.value) {
	const requestId = ++jobListRequestId
	if (!depId) {
		jobDataTable.value = null
		resetJobListState()
		return
	}

	jobLoading.value = true
	try {
		const result = await getDepartmentJobList(depId)
		if (requestId !== jobListRequestId) {
			return
		}

		jobDataTable.value = result.dataTable || null
		const rows = result.list || []

		jobRows.value = rows
		currentJobKey.value = rows.some((item) => item.jobKey === currentJobKey.value) ? currentJobKey.value : ''

		try {
			await resolveJobUsers(rows, requestId)
		} catch (error) {
			console.error('解析岗位人员失败:', error)
			assignFallbackJobUsers(rows)
		}

		await nextTick()
		if (currentJobKey.value) {
			const matchedRow = rows.find((item) => item.jobKey === currentJobKey.value) || null
			jobTableRef.value?.setCurrentRow?.(matchedRow)
		}
	} catch (error) {
		if (requestId !== jobListRequestId) {
			return
		}
		console.error('加载岗位列表失败:', error)
		ElMessage.error('加载岗位列表失败')
		jobDataTable.value = null
		resetJobListState()
	} finally {
		if (requestId === jobListRequestId) {
			jobLoading.value = false
		}
	}
}

async function initializePage() {
	pageLoading.value = true
	try {
		await Promise.allSettled([
			loadDepartmentTree(''),
			loadDepartmentTypeDict(),
			loadJobTypeDict()
		])
	} finally {
		pageLoading.value = false
	}
}

function getCurrentEnterpriseId() {
	return normalizeText((userStore.userInfo as any)?.EntId || (userStore.userInfo as any)?.rawUserInfo?.EntId || (userStore.userInfo as any)?.id)
}

function assertDepartmentUniqueness() {
	const depName = normalizeText(departmentForm.DepName).toLowerCase()
	const depShortName = normalizeText(departmentForm.DepShortName).toLowerCase()
	const currentRowid = departmentDialog.mode === 'edit' ? normalizeText(currentDepartment.value?.rowid) : ''
	const parentDepId = departmentDialog.mode === 'add'
		? normalizeText(currentDepartment.value?.DepID || ROOT_PARENT_ID)
		: normalizeText(currentDepartment.value?.Prowid || ROOT_PARENT_ID)

	const siblingList = flatDepartmentList.value.filter((item) => {
		return normalizeText(item.Prowid) === parentDepId && normalizeText(item.rowid) !== currentRowid
	})

	if (siblingList.some((item) => normalizeText(item.DepName).toLowerCase() === depName)) {
		throw new Error('同级部门名称不能重复')
	}

	if (siblingList.some((item) => normalizeText(item.DepShortName).toLowerCase() === depShortName)) {
		throw new Error('同级部门简称不能重复')
	}
}

async function handleDepartmentNodeDrop(draggingNode: any, dropNode: any, dropType: string) {
	const sourceDepartment = draggingNode?.data as OrganizationDepartmentRecord | undefined
	const targetParentDepartment = dropNode?.data as OrganizationDepartmentRecord | undefined
	const errorMessage = getDepartmentMoveError(sourceDepartment, targetParentDepartment, dropType)
	const rollbackSelectedDepId = selectedDepartmentId.value
	const movedDepId = normalizeText(sourceDepartment?.DepID)

	if (errorMessage) {
		ElMessage.warning(errorMessage)
		await loadDepartmentTree(rollbackSelectedDepId)
		if (rollbackSelectedDepId) {
			await loadJobList(rollbackSelectedDepId)
		}
		return
	}

	if (!sourceDepartment || !targetParentDepartment || !movedDepId) {
		ElMessage.error('拖拽节点信息不完整，无法保存')
		await loadDepartmentTree(rollbackSelectedDepId)
		if (rollbackSelectedDepId) {
			await loadJobList(rollbackSelectedDepId)
		}
		return
	}

	departmentMoveSaving.value = true
	try {
		const result = await moveDepartment({
			sourceDepartment,
			targetParentDepartment,
			departmentList: flatDepartmentList.value
		})

		await loadDepartmentTree(movedDepId)
		await loadJobList(movedDepId)

		if (result.changedCount === 0) {
			ElMessage.info('部门位置未发生变化')
			return
		}

		ElMessage.success(`部门移动成功，共更新 ${result.changedCount} 条记录`)
	} catch (error: any) {
		console.error('部门移动失败:', error)
		ElMessage.error(error instanceof Error ? error.message : '部门移动失败')
		await loadDepartmentTree(rollbackSelectedDepId)
		if (rollbackSelectedDepId) {
			await loadJobList(rollbackSelectedDepId)
		}
	} finally {
		departmentMoveSaving.value = false
	}
}

function handleDepartmentNodeClick(data: OrganizationDepartmentRecord) {
	selectedDepartmentId.value = normalizeText(data.DepID)
	expandedDepartmentKeys.value = buildExpandedDepartmentKeys(selectedDepartmentId.value)
	currentJobKey.value = ''
	void loadJobList(selectedDepartmentId.value)
}

function handleJobCurrentChange(row: OrganizationJobListRow | null) {
	currentJobKey.value = normalizeText(row?.jobKey)
}

async function handleJobUsersConfirm(row: OrganizationJobListRow, value: PersonSelectorValueItem[]) {
	const jobKey = normalizeText(row.jobKey)
	if (!jobKey || jobUserSavingKey.value) {
		return
	}

	const currentDepartmentValue = currentDepartment.value
	const previousUsers = clonePersonValueList(jobUserValueMap[jobKey] || [])
	const nextUsers = clonePersonValueList(value)

	if (isSamePersonValueList(previousUsers, nextUsers)) {
		return
	}

	jobUserSavingKey.value = jobKey
	try {
		const result = await saveJobUserAssignments({
			row: {
				...row,
				DepID: normalizeText(row.DepID) || normalizeText(currentDepartmentValue?.DepID),
				DepName: normalizeText(row.DepName) || normalizeText(currentDepartmentValue?.DepName)
			},
			previousUsers,
			nextUsers
		})

		await loadJobList(selectedDepartmentId.value)

		if (result.addedCount === 0 && result.deletedCount === 0) {
			ElMessage.info('人员未发生变化')
			return
		}

		ElMessage.success(`人员保存成功，新增 ${result.addedCount} 条，删除 ${result.deletedCount} 条`)
	} catch (error: any) {
		console.error('保存岗位人员失败:', error)
		ElMessage.error(error instanceof Error ? error.message : '保存岗位人员失败')
	} finally {
		jobUserSavingKey.value = ''
	}
}

async function handleOpenJobUserSettings(row: OrganizationJobListRow) {
	if (!canOpenJobUserSettings(row)) {
		return
	}

	let depId = normalizeText(row.raw?.DepID || row.DepID || selectedDepartmentId.value)
	let jobId = normalizeText(row.raw?.JobId || row.raw?.JobID || row.JobId || row.ID || row.raw?.ID || row.rowid || row.raw?.rowid)
	let jobRowid = normalizeText(row.raw?.rowid || row.raw?.JobId || row.raw?.JobID || row.JobId || row.ID || row.raw?.ID || row.rowid)

	// 常规字段取不到时，通过 jobKey 回查数据库拿真实主键
	if (!jobId || !jobRowid) {
		try {
			// 先从同 jobKey 的其他行取（列表去重不彻底时同一岗位可能有多行）
			const sibling = jobRows.value.find((r) => r.jobKey === row.jobKey && r !== row && normalizeText(r.ID || r.JobId || r.rowid))
			if (sibling) {
				jobId = jobId || normalizeText(sibling.JobId || sibling.ID || sibling.rowid)
				jobRowid = jobRowid || normalizeText(sibling.rowid || sibling.JobId || sibling.ID)
				depId = depId || normalizeText(sibling.DepID || selectedDepartmentId.value)
			}

			const resolved = await getJobByIdentity(row)
			if (resolved) {
				jobId = jobId || normalizeText(resolved.ID || resolved.rowid || resolved.JobCode)
				jobRowid = jobRowid || normalizeText(resolved.rowid || resolved.ID || resolved.JobCode)
				depId = depId || normalizeText(resolved.Depid || resolved.DepID)
			}
		} catch (e) {
			console.warn('回查岗位记录失败:', e)
		}
	}

	if (!depId || !jobId || !jobRowid) {
		ElMessage.error('当前岗位缺少人员设置所需主键信息')
		return
	}

	jobUserSettingsDialog.visible = true
	jobUserSettingsDialog.loading = true
	jobUserSettingsDialog.jobKey = normalizeText(row.jobKey)
	resetJobUserSettingsState()
	jobUserSettingsDialog.jobKey = normalizeText(row.jobKey)

	try {
		await loadUserJobTypeDict()
		const [dbRows, jobDuty] = await Promise.all([

			getJobUserSettings({ depId, jobId }),
			getJobDutyByRowid(jobRowid)
		])


		// 永远以 jobUserValueMap（与输入框同一数据源）为准，dbRows 只补额外字段
		const viewUsers = jobUserValueMap[row.jobKey] || []
		const dbMap = new Map(dbRows.map((r) => [normalizeText(r.UserID), r]))

		let settingRows
		if (viewUsers.length > 0) {
			settingRows = viewUsers.map((u) => {
				const uid = normalizeText(u.UserId)
				const db = dbMap.get(uid) || dbRows.find((r) => normalizeText(r.rowid) === uid)
				return createJobUserSettingsRow({
					rowid: db?.rowid || uid,
					UserID: uid,
					UserName: normalizeText(db?.UserName) || normalizeText(u.UserName) || uid,
					JobType: db?.JobType || '',
					IsWork: db?.IsWork ?? 1,
					JobRespon: db?.JobRespon || '',
					Memo: db?.Memo || '',
					raw: db?.raw || {}
				})
			})
		} else {
			settingRows = dbRows.map((item) => createJobUserSettingsRow(item))
		}

		jobUserSettingsRows.value = settingRows
		jobUserSettingsSnapshot.value = cloneJobUserSettingsRows(jobUserSettingsRows.value)
		currentJobDuty.value = normalizeText(jobDuty)
	} catch (error) {
		console.error('加载人员设置信息失败:', error)
		ElMessage.error('加载人员设置信息失败')
	} finally {
		jobUserSettingsDialog.loading = false
	}
}

async function handleSaveJobUserSettings() {
	const changedRows = getChangedJobUserSettingsRows()
	if (changedRows.length === 0) {
		ElMessage.info('人员信息未发生变化')
		jobUserSettingsDialog.visible = false
		return
	}

	jobUserSettingsDialog.saving = true
	try {
		const result = await saveJobUserSettings({ rows: changedRows })
		jobUserSettingsSnapshot.value = cloneJobUserSettingsRows(jobUserSettingsRows.value)
		jobUserSettingsDialog.visible = false
		resetJobUserSettingsState()
		ElMessage.success(`人员设置保存成功，共更新 ${result.changedCount} 条记录`)
	} catch (error) {
		console.error('保存人员设置失败:', error)
		ElMessage.error('保存人员设置失败')
	} finally {
		jobUserSettingsDialog.saving = false
	}
}

function handleAddDepartment() {
	if (!canAddDepartment.value) {
		return
	}

	if (currentDepartment.value && normalizeNumber(currentDepartment.value.DepLevel) >= MAX_DEPARTMENT_LEVEL) {
		ElMessage.warning('部门级别到 4 后不允许再添加子级部门')
		return
	}

	departmentDialog.mode = 'add'
	departmentDialog.visible = true
	resetDepartmentForm()
	nextTick(() => departmentFormRef.value?.clearValidate())
}

function handleEditDepartment() {
	if (!currentDepartment.value || !canEditDepartment.value) {
		ElMessage.warning('请先选择需要编辑的部门')
		return
	}

	departmentDialog.mode = 'edit'
	departmentDialog.visible = true
	departmentForm.DepName = normalizeText(currentDepartment.value.DepName)
	departmentForm.DepShortName = normalizeText(currentDepartment.value.DepShortName)
	departmentForm.DepCode = normalizeText(currentDepartment.value.DepCode)
	departmentForm.IsTrue = normalizeNumber(currentDepartment.value.IsTrue)
	nextTick(() => departmentFormRef.value?.clearValidate())
}

async function handleDeleteDepartment() {
	if (!currentDepartment.value || !canDeleteDepartment.value) {
		ElMessage.warning('请先选择需要删除的部门')
		return
	}

	if (normalizeText(currentDepartment.value.DepLevelCode) === '0') {
		ElMessage.warning('顶级部门不可删除')
		return
	}

	if (currentDepartment.value.children.length > 0) {
		ElMessage.warning('当前部门存在子级部门，不能删除')
		return
	}

	try {
		await ElMessageBox.confirm(`确定删除部门“${currentDepartment.value.DepName || ''}”吗？`, '删除确认', {
			type: 'warning'
		})
	} catch {
		return
	}

	try {
		await deleteDepartment(currentDepartment.value.rowid)
		selectedDepartmentId.value = ''
		resetJobListState()
		await loadDepartmentTree('')
		ElMessage.success('部门删除成功')
	} catch (error) {
		console.error('删除部门失败:', error)
		ElMessage.error('删除部门失败')
	}
}

async function handleDepartmentDialogConfirm() {
	if (!departmentFormRef.value || departmentDialogSubmitDisabled.value) {
		return
	}

	try {
		await departmentFormRef.value.validate()
		assertDepartmentUniqueness()
	} catch (error: any) {
		if (error instanceof Error) {
			ElMessage.warning(error.message)
		}
		return
	}

	const enterpriseId = getCurrentEnterpriseId()
	if (departmentDialog.mode === 'add' && !enterpriseId) {
		ElMessage.error('当前用户缺少 EntId，无法新增部门')
		return
	}

	departmentDialog.saving = true
	try {
		let targetSelectedDepId = selectedDepartmentId.value

		if (departmentDialog.mode === 'add') {
			const parentDepartment = currentDepartment.value || ({ DepID: ROOT_PARENT_ID, DepLevel: 0, DepLevelCode: '0', CSR: '', zwSCR: '' } as OrganizationDepartmentRecord)
			const result = await createDepartment({
				parentDepartment,
				enterpriseId,
				depName: departmentForm.DepName,
				depShortName: departmentForm.DepShortName,
				depCode: departmentForm.DepCode,
				isTrue: departmentForm.IsTrue
			})
			targetSelectedDepId = normalizeText(result.depId)
		} else {
			await updateDepartment({
				rowid: normalizeText(currentDepartment.value?.rowid),
				depName: departmentForm.DepName,
				depShortName: departmentForm.DepShortName,
				depCode: departmentForm.DepCode,
				isTrue: departmentForm.IsTrue
			})
		}

		departmentDialog.visible = false
		await loadDepartmentTree(targetSelectedDepId)
		if (targetSelectedDepId) {
			await loadJobList(targetSelectedDepId)
		}
		ElMessage.success(departmentDialog.mode === 'add' ? '部门新增成功' : '部门保存成功')
	} catch (error) {
		console.error('保存部门失败:', error)
		ElMessage.error('保存部门失败')
	} finally {
		departmentDialog.saving = false
	}
}

function handleAddJob() {
	if (!currentDepartment.value || !canAddJob.value) {
		ElMessage.warning('请先选择所属部门')
		return
	}

	jobDialog.visible = true
	resetJobForm()
	nextTick(() => jobFormRef.value?.clearValidate())
}

async function handleJobDialogConfirm() {
	if (!jobFormRef.value || !currentDepartment.value || !canAddJob.value) {
		return
	}

	try {
		await jobFormRef.value.validate()
	} catch {
		return
	}

	jobDialog.saving = true
	try {
		await createJob({
			department: currentDepartment.value,
			jobName: jobForm.JobName,
			jobExpNum: jobForm.jobExpNum,
			jobDuty: jobForm.JobDuty
		})

		jobDialog.visible = false
		await loadJobList(selectedDepartmentId.value)
		ElMessage.success('岗位新增成功')
	} catch (error) {
		console.error('新增岗位失败:', error)
		ElMessage.error('新增岗位失败')
	} finally {
		jobDialog.saving = false
	}
}

async function handleDeleteJob() {
	if (!currentJobRow.value || !canDeleteJob.value) {
		ElMessage.warning('请先选择需要删除的岗位')
		return
	}

	if (!isExclusiveJob(currentJobRow.value)) {
		ElMessage.warning('只能删除专属岗位')
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
		await deleteJob(currentJobRow.value)
		currentJobKey.value = ''
		await loadJobList(selectedDepartmentId.value)
		ElMessage.success('岗位删除成功')
	} catch (error) {
		console.error('删除岗位失败:', error)
		ElMessage.error('删除岗位失败')
	}
}

onMounted(() => {
	void initializePage()
})
</script>

<style scoped lang="scss">
.organization-structure-page-shell {
	:deep(.page-content),
	:deep(.vben-page-content),
	:deep(.ant-page-content) {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}
}

.organization-structure-page {
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

	:deep(.el-tree) {
		background: transparent;
	}

	:deep(.el-tree-node__content) {
		height: 44px;
		border-radius: 6px;
	}

	:deep(.el-tree-node.is-current > .el-tree-node__content) {
		background: #1f6feb;
		color: #fff;
	}

	:deep(.el-tree-node.is-current .department-node__icon) {
		color: #fff;
	}
}

.organization-structure-page__sidebar {
	width: 350px;
	min-width: 320px;
	flex: 0 0 auto;
}

.organization-structure-page__content {
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
	min-height: 0;
}

.panel-card__toolbar {
	display: flex;
	gap: 12px;
	padding: 12px 16px;
	border-bottom: 1px solid #ebeef5;
}

.panel-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 20px;
	border-bottom: 1px solid #ebeef5;
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

.panel-card__body--tree {
	padding: 12px;
	overflow: auto;
}

.panel-card__body--table {
	display: flex;
	flex: 1;
	min-height: 0;
	padding: 16px 20px;
	overflow: hidden;
}

.panel-card__body--table > .el-table {
	flex: 1;
	min-height: 0;
}

.panel-card__empty {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
}

.department-node {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.department-node__icon {
	color: #1e9fff;
	font-size: 18px;
	flex: 0 0 auto;
}

.department-node__label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.department-form,
.job-form {
	padding: 12px 24px 0;
}

.department-form__type-list {
	display: flex;
	gap: 16px;
	align-items: center;
}

.job-form__number {
	width: 100%;
}

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

.job-person-cell {
	width: 100%;

	:deep(.el-input) {
		width: 100%;
	}

	:deep(.el-input.is-disabled .el-input__wrapper) {
		background: #fff;
		box-shadow: 0 0 0 1px var(--el-border-color) inset;
		cursor: default;
	}

	:deep(.el-input.is-disabled .el-input__inner) {
		-webkit-text-fill-color: var(--el-text-color-primary);
		color: var(--el-text-color-primary);
		cursor: default;
	}
}

.job-user-link {
	color: #409eff;
	cursor: default;
}

.job-user-settings-dialog {
	min-height: 420px;
}

.job-user-settings-table {
	:deep(.el-radio-group) {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 10px;
	}

	:deep(.el-table__cell) {
		padding: 8px 0;
	}

	:deep(.el-radio) {
		margin-right: 0;
		white-space: nowrap;
	}

	:deep(.el-input__wrapper) {
		min-height: 34px;
	}
}

.job-user-settings__radio-group {
	padding: 2px 0;
}

.job-user-settings-dialog__summary {
	display: flex;
	gap: 12px;
	margin-top: 16px;
	padding: 16px;
	border: 1px solid #ebeef5;
	border-radius: 8px;
	background: #fafbfd;
}

.job-user-settings-dialog__summary-label {
	flex: 0 0 auto;
	font-weight: 600;
	color: #303133;
}

.job-user-settings-dialog__summary-content {
	color: #606266;
	white-space: pre-wrap;
	word-break: break-word;
	line-height: 1.7;
}

@media (max-width: 1200px) {
	.organization-structure-page {
		flex-direction: column;
	}

	.organization-structure-page__sidebar {
		width: 100%;
		min-width: 0;
		height: 320px;
	}

	.panel-card__header {
		flex-direction: column;
		align-items: stretch;
	}

	.panel-card__actions {
		justify-content: flex-end;
	}
}
</style>
