<template>
	<Page auto-content-height class="h-full user-management-page-shell">
		<div class="user-management-page">
		<el-card class="table-card" shadow="never">
			<template #header>
				<div class="card-header">
					<span>人员管理</span>
					<div class="card-header__actions">
						<el-input
							v-model="query.keyword"
							placeholder="搜索姓名、登录名、手机号、部门/岗位"
							clearable
							class="search-input"
							@keyup.enter="handleSearch"
						>
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
						<el-button @click="handleResetSearch">
							<el-icon><RefreshRight /></el-icon>
							重置
						</el-button>
						<el-button type="primary" @click="handleSearch">
							<el-icon><Search /></el-icon>
							查询
						</el-button>
						<el-button type="primary" :disabled="createDisabled" @click="handleCreate">
							<el-icon><Plus /></el-icon>
							新建
						</el-button>
					</div>
				</div>
			</template>

			<div class="table-scroll-area">
			<el-table v-loading="loading" :data="tableData" border stripe row-key="ID" height="100%" style="width: 100%">
				<el-table-column prop="UserName" label="姓名" min-width="120" show-overflow-tooltip />
				<el-table-column prop="LoginName" label="登录名" min-width="120" show-overflow-tooltip />
				<el-table-column label="性别" width="64" align="center">
					<template #default="scope">
						{{ getDictLabel(sexOptions, scope.row.Sex) || scope.row.Sex || '-' }}
					</template>
				</el-table-column>
				<el-table-column label="年龄" width="64" align="center">
					<template #default="scope">
						{{ scope.row.Age > 0 ? scope.row.Age : '-' }}
					</template>
				</el-table-column>
				<el-table-column label="出生日期" width="130">
					<template #default="scope">
						{{ formatDate(scope.row.Birthday) }}
					</template>
				</el-table-column>
				<el-table-column prop="entInfoUserPhone" label="手机号" min-width="140" show-overflow-tooltip />
				<el-table-column prop="user_jobs" label="部门/岗位" min-width="280" show-overflow-tooltip />
				<el-table-column label="担任角色" min-width="420">
					<template #default="scope">
						<div v-if="scope?.row && (getRoleDisplayRows(scope.row.user_roles).length)" class="role-cell">
							<div
								v-for="(item, index) in getRoleDisplayRows(scope.row.user_roles)"
								:key="`${scope.row.ID}-role-${index}`"
								class="role-cell__row"
							>
								<template v-if="item.appName">
									<span class="role-cell__app">{{ item.appName }} -> </span>
									<span class="role-cell__list">
										<span
											v-for="(line, lineIndex) in item.lines"
											:key="`${scope.row.ID}-role-${index}-line-${lineIndex}`"
											class="role-cell__line"
										>
											{{ line }}
										</span>
									</span>
								</template>
								<span v-else>{{ item.lines[0] }}</span>
							</div>
						</div>
						<span v-else>-</span>
					</template>
				</el-table-column>
				<el-table-column label="权限查看" min-width="140">
					<template #default="scope">
						<div v-if="scope?.row && (getUserNavRoles(scope.row).length)" class="permission-links">
							<el-button
								v-for="item in getUserNavRoles(scope.row)"
								:key="`${scope.row.ROWID || scope.row.ID}-${item.FunName}-${item.masterId}`"
								type="primary"
								link
								class="permission-links__button"
								@click="scope?.row && (handleOpenPermissionDialog(scope.row, item))"
							>
								{{ item.FunName || '-' }}
							</el-button>
						</div>
						<span v-else>-</span>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="120" fixed="right">
					<template #default="scope">
						<el-button type="primary" link :disabled="!scope?.row || !canEditRow(scope.row.ID)" @click="scope?.row && (handleEdit(scope.row))">编辑</el-button>
						<el-button type="danger" link :disabled="!scope?.row || !canDeleteRow(scope.row.ID)" @click="scope?.row && (handleDelete(scope.row))">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
			</div>

			<div class="pagination-wrapper">
				<el-pagination
					v-model:current-page="pagination.pageNo"
					v-model:page-size="pagination.pageSize"
					:page-sizes="[10, 20, 50, 100]"
					:total="pagination.total"
					layout="total, sizes, prev, pager, next, jumper"
					background
					@size-change="handleSizeChange"
					@current-change="handleCurrentChange"
				/>
			</div>
		</el-card>

		<el-dialog
			v-model="editorDialog.visible"
			:title="editorDialog.mode === 'add' ? '人员新增' : '人员编辑'"
			width="1080px"
			destroy-on-close
		>
			<div v-loading="editorDialog.loading" class="user-editor">
				<el-form ref="formRef" :model="formData" :rules="formRules" label-width="92px" status-icon>
					<div class="user-editor__layout">
						<div class="user-editor__main">
							<div class="user-editor__grid">
								<el-form-item label="姓名" prop="UserName">
									<el-input v-model="formData.UserName" placeholder="请输入姓名" :disabled="isDialogFieldDisabled('UserName')" />
								</el-form-item>
								<el-form-item label="性别" prop="Sex">
									<div class="option-checks">
										<el-checkbox
											v-for="item in sexOptions"
											:key="`sex-${item.value}`"
											:model-value="formData.Sex === item.value"
											:disabled="isDialogFieldDisabled('Sex')"
											@change="(checked) => handleSingleCheckChange('Sex', item.value, checked)"
										>
											{{ item.label }}
										</el-checkbox>
									</div>
								</el-form-item>
								<el-form-item label="登录名" prop="LoginName">
									<el-input v-model="formData.LoginName" placeholder="请输入登录名" :disabled="isDialogFieldDisabled('LoginName')" />
								</el-form-item>
								<el-form-item label="密码" prop="LoginPass">
									<el-input
										v-if="editorDialog.mode === 'add'"
										v-model="formData.LoginPass"
										placeholder="请输入密码"
										show-password
									/>
									<el-input v-else model-value="****" disabled />
								</el-form-item>
								<el-form-item label="身份证号" prop="IDCard">
									<el-input v-model="formData.IDCard" placeholder="请输入身份证号" maxlength="18" :disabled="isDialogFieldDisabled('IDCard')" />
								</el-form-item>
								<el-form-item label="民族" prop="Nation">
									<el-input v-model="formData.Nation" placeholder="请输入民族" :disabled="isDialogFieldDisabled('Nation')" />
								</el-form-item>
								<el-form-item label="出生日期">
									<el-input :model-value="formatDate(formData.Birthday)" placeholder="根据身份证自动生成" readonly />
								</el-form-item>
								<el-form-item label="年龄">
									<el-input :model-value="formData.Age" placeholder="根据身份证自动生成" readonly />
								</el-form-item>
								<el-form-item label="邮箱" prop="mailbox">
									<el-input v-model="formData.mailbox" placeholder="请输入邮箱" :disabled="isDialogFieldDisabled('mailbox')" />
								</el-form-item>
								<el-form-item label="手机号" prop="entInfoUserPhone">
									<el-input v-model="formData.entInfoUserPhone" placeholder="请输入手机号" :disabled="isDialogFieldDisabled('entInfoUserPhone')" />
								</el-form-item>
								<el-form-item label="婚姻状况" prop="MaritalStatus" class="user-editor__span-2">
									<div class="option-checks">
										<el-checkbox
											v-for="item in marriageOptions"
											:key="`marital-${item.value}`"
											:model-value="formData.MaritalStatus === item.value"
											:disabled="isDialogFieldDisabled('MaritalStatus')"
											@change="(checked) => handleSingleCheckChange('MaritalStatus', item.value, checked)"
										>
											{{ item.label }}
										</el-checkbox>
									</div>
								</el-form-item>
								<el-form-item label="账号状态" prop="State" class="user-editor__span-2">
									<div class="option-checks">
										<el-checkbox
											v-for="item in stateOptions"
											:key="`state-${item.value}`"
											:model-value="formData.State === item.value"
											:disabled="isDialogFieldDisabled('State')"
											@change="(checked) => handleSingleCheckChange('State', item.value, checked)"
										>
											{{ item.label }}
										</el-checkbox>
									</div>
								</el-form-item>
								<el-form-item label="籍贯" prop="NativePlace" class="user-editor__span-2">
									<el-input v-model="formData.NativePlace" placeholder="请输入籍贯" :disabled="isDialogFieldDisabled('NativePlace')" />
								</el-form-item>
								<el-form-item label="户口地" prop="PermanentTenancy" class="user-editor__span-2">
									<el-input v-model="formData.PermanentTenancy" placeholder="请输入户口地" :disabled="isDialogFieldDisabled('PermanentTenancy')" />
								</el-form-item>
								<el-form-item label="家庭地址" prop="Address" class="user-editor__span-2">
									<el-input v-model="formData.Address" placeholder="请输入家庭地址" :disabled="isDialogFieldDisabled('Address')" />
								</el-form-item>
								<el-form-item label="备注" prop="memo" class="user-editor__span-2">
									<el-input v-model="formData.memo" type="textarea" :rows="3" placeholder="请输入备注" :disabled="isDialogFieldDisabled('memo')" />
								</el-form-item>
							</div>
						</div>

						<div class="user-editor__aside">
							<div class="photo-panel">
								<div class="photo-panel__title">照片</div>
								<div class="photo-panel__preview">
									<img v-if="resolvedPhotoPath" :src="resolvedPhotoPath" alt="用户照片" class="photo-panel__image" />
									<div v-else class="photo-panel__placeholder">暂无图片</div>
								</div>
								<el-upload
									:show-file-list="false"
									accept="image/*"
									:http-request="handlePhotoUpload"
								>
									<el-button type="primary" :loading="photoUploading">
										<el-icon><UploadFilled /></el-icon>
										上传照片
									</el-button>
								</el-upload>
								<div class="photo-panel__path" :title="formData.Path">
									{{ formData.Path || '未上传照片' }}
								</div>
							</div>
						</div>
					</div>
				</el-form>
			</div>

			<template #footer>
				<div class="dialog-footer">
					<el-button @click="editorDialog.visible = false">取消</el-button>
					<el-button type="primary" :loading="editorDialog.submitting" :disabled="submitDisabled" @click="handleSubmit">
						保存
					</el-button>
				</div>
			</template>
		</el-dialog>

		<el-dialog v-model="permissionDialog.visible" :title="permissionDialog.title" width="1280px" destroy-on-close>
			<UserAppAuthView
				:sys-id="permissionDialog.sysId"
				:user-id="permissionDialog.userId"
				:user-name="permissionDialog.userName"
				:app-name="permissionDialog.appName"
				embedded
				:show-header="false"
			/>
			<template #footer>
				<div class="dialog-footer">
					<el-button type="primary" @click="permissionDialog.visible = false">关闭</el-button>
				</div>
			</template>
		</el-dialog>
		</div>
	</Page>
</template>

<script setup lang="ts">
import { Page } from '@vben/common-ui'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { Plus, RefreshRight, Search, UploadFilled } from '@element-plus/icons-vue'
import {
	ElButton,
	ElCard,
	ElCheckbox,
	ElDialog,
	ElForm,
	ElFormItem,
	ElIcon,
	ElInput,
	ElMessage,
	ElMessageBox,
	ElPagination,
	ElTable,
	ElTableColumn,
	ElUpload,
	type FormInstance,
	type FormRules,
	type UploadRequestOptions
} from 'element-plus'
import type { DataTable } from '#/api/qyapi'
import { useDataTableAuth } from '#/hooks/use-data-table-auth'
import { useUserStore } from '@vben/stores'
import UserAppAuthView from '#/views/hr/components/user-app-auth-view.vue'
import {
	createUserManagementUser,
	deleteUserManagementUser,
	getMarriageOptions,
	getUserManagementDetail,
	getUserManagementNavRoles,
	getUserManagementPage,
	getUserSexOptions,
	uploadUserPhoto,
	updateUserManagementUser,
	getUserStateOptions,
	type SaveUserManagementPayload,
	type UserManagementDictOption,
	type UserManagementNavRoleRecord,
	type UserManagementUserRecord
} from '#/api/erp/human-resources/user-management'

interface UserFormState {
	ID: string
	UserName: string
	Sex: string
	Path: string
	LoginName: string
	LoginPass: string
	IDCard: string
	mailbox: string
	entInfoUserPhone: string
	Nation: string
	MaritalStatus: string
	Age: string
	Birthday: string
	State: string
	NativePlace: string
	PermanentTenancy: string
	Address: string
	memo: string
}

interface RoleDisplayRow {
	appName: string
	lines: string[]
}

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const photoUploading = ref(false)
const pageDataTable = ref<DataTable | null>(null)
const tableData = ref<UserManagementUserRecord[]>([])
const sexOptions = ref<UserManagementDictOption[]>([])
const marriageOptions = ref<UserManagementDictOption[]>([])
const stateOptions = ref<UserManagementDictOption[]>([])
const userNavRoleMap = ref<Record<string, UserManagementNavRoleRecord[]>>({})

const { canAdd, canEditRow, canDeleteRow, canEditField } = useDataTableAuth(pageDataTable)

const query = reactive({
	keyword: ''
})

const pagination = reactive({
	pageNo: 1,
	pageSize: 20,
	total: 0
})

const editorDialog = reactive({
	visible: false,
	mode: 'add' as 'add' | 'edit',
	loading: false,
	submitting: false
})

const permissionDialog = reactive({
	visible: false,
	title: '权限查看',
	sysId: '',
	userId: '',
	userName: '',
	appName: ''
})

const formData = reactive<UserFormState>(createDefaultFormData())

const formRules: FormRules<UserFormState> = {
	UserName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
	Sex: [{ required: true, message: '请选择性别', trigger: 'change' }],
	LoginName: [{ required: true, message: '请输入登录名', trigger: 'blur' }],
	LoginPass: [{ validator: validatePasswordRule, trigger: 'blur' }],
	IDCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
	mailbox: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
	Nation: [{ required: true, message: '请输入民族', trigger: 'blur' }],
	MaritalStatus: [{ required: true, message: '请选择婚姻状况', trigger: 'change' }],
	State: [{ required: true, message: '请选择账号状态', trigger: 'change' }]
}

const resolvedPhotoPath = computed(() => normalizeText(formData.Path))
const createDisabled = computed(() => !canAdd())
const submitDisabled = computed(() => editorDialog.mode === 'add' ? !canAdd() : !canEditRow(formData.ID))

function createDefaultFormData(): UserFormState {
	return {
		ID: '',
		UserName: '',
		Sex: 'M',
		Path: '',
		LoginName: '',
		LoginPass: '',
		IDCard: '',
		mailbox: '',
		entInfoUserPhone: '',
		Nation: '',
		MaritalStatus: '0',
		Age: '',
		Birthday: '',
		State: '1',
		NativePlace: '',
		PermanentTenancy: '',
		Address: '',
		memo: ''
	}
}

function resetFormData() {
	Object.assign(formData, createDefaultFormData())
}

function isDialogFieldDisabled(fieldName: string) {
	if (editorDialog.mode !== 'edit') {
		return false
	}

	return !canEditField(formData.ID, fieldName)
}

function normalizeText(value: unknown) {
	return String(value ?? '').trim()
}

function formatDate(value: unknown) {
	const text = normalizeText(value)
	if (!text) {
		return '-'
	}

	const matched = text.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/)
	if (matched) {
		return `${matched[1]}-${matched[2]}-${matched[3]}`
	}

	const date = new Date(text)
	if (Number.isNaN(date.getTime())) {
		return text
	}

	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}

function formatDateByParts(year: number, month: number, day: number) {
	return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`
}

function getDictLabel(options: UserManagementDictOption[], value: string) {
	const normalizedValue = normalizeText(value)
	return options.find((item) => normalizeText(item.value) === normalizedValue)?.label || ''
}

function getUserNavRoles(row: UserManagementUserRecord) {
	const rowid = normalizeText(row.ROWID)
	const id = normalizeText(row.ID)
	return userNavRoleMap.value[rowid] || userNavRoleMap.value[id] || []
}

function getRoleDisplayRows(source: string): RoleDisplayRow[] {
	const text = normalizeText(source)
	if (!text) {
		return []
	}

	return text
		.split(/<br\s*\/?>/i)
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => {
			const splitIndex = item.indexOf('->')
			if (splitIndex < 0) {
				return {
					appName: '',
					lines: [item]
				}
			}

			const appName = item.slice(0, splitIndex).trim()
			const roleListText = item.slice(splitIndex + 2).trim()
			const roles = roleListText.split('|').map((role) => role.trim()).filter(Boolean)

			if (!appName || roles.length === 0) {
				return {
					appName: '',
					lines: [item]
				}
			}

			return {
				appName,
				lines: roles.length > 3
					? [roles.slice(0, 3).join('|'), roles.slice(3).join('|')].filter(Boolean)
					: [roles.join('|')]
			}
		})
}

function validatePasswordRule(_rule: any, value: string, callback: (error?: Error) => void) {
	if (editorDialog.mode === 'add' && !normalizeText(value)) {
		callback(new Error('请输入密码'))
		return
	}

	callback()
}

function handleSingleCheckChange(field: 'Sex' | 'MaritalStatus' | 'State', value: string, checked: unknown) {
	formData[field] = checked ? value : ''
	void nextTick(() => formRef.value?.validateField(field).catch(() => undefined))
}

function getCurrentEntId() {
	return normalizeText((userStore.userInfo as any)?.EntId || (userStore.userInfo as any)?.rawUserInfo?.EntId || (userStore.userInfo as any)?.id)
}

function validateIdCard(idCard: string) {
	const normalizedIdCard = normalizeText(idCard).toUpperCase()
	if (!/^\d{15}$|^\d{17}[\dX]$/.test(normalizedIdCard)) {
		throw new Error('身份证号格式不正确')
	}

	if (normalizedIdCard.length === 18) {
		const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
		const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
		const sum = normalizedIdCard
			.slice(0, 17)
			.split('')
			.reduce((total, current, index) => total + Number(current) * weights[index], 0)
		const code = codes[sum % 11]
		if (code !== normalizedIdCard[17]) {
			throw new Error('身份证号校验失败')
		}
	}

	return normalizedIdCard
}

function parseBirthdayFromIdCard(idCard: string) {
	const normalizedIdCard = validateIdCard(idCard)
	const birthdayText = normalizedIdCard.length === 18
		? normalizedIdCard.slice(6, 14)
		: `19${normalizedIdCard.slice(6, 12)}`

	const year = Number(birthdayText.slice(0, 4))
	const month = Number(birthdayText.slice(4, 6))
	const day = Number(birthdayText.slice(6, 8))
	const birthday = new Date(year, month - 1, day)

	if (
		Number.isNaN(birthday.getTime()) ||
		birthday.getFullYear() !== year ||
		birthday.getMonth() + 1 !== month ||
		birthday.getDate() !== day
	) {
		throw new Error('身份证号中的出生日期无效')
	}

	return birthday
}

function deriveIdCardInfo(idCard: string) {
	const birthday = parseBirthdayFromIdCard(idCard)
	const now = new Date()
	let age = now.getFullYear() - birthday.getFullYear()
	const currentMonthDay = (now.getMonth() + 1) * 100 + now.getDate()
	const birthdayMonthDay = (birthday.getMonth() + 1) * 100 + birthday.getDate()
	if (currentMonthDay < birthdayMonthDay) {
		age -= 1
	}

	if (age < 0 || age > 150) {
		throw new Error('身份证号中的年龄无效')
	}

	return {
		birthday: formatDateByParts(birthday.getFullYear(), birthday.getMonth() + 1, birthday.getDate()),
		age
	}
}

async function loadDictionaries() {
	const [sexList, marriageList, stateList] = await Promise.all([
		getUserSexOptions(),
		getMarriageOptions(),
		getUserStateOptions()
	])

	sexOptions.value = sexList
	marriageOptions.value = marriageList
	stateOptions.value = stateList
}

async function fetchTableData() {
	loading.value = true
	try {
		const result = await getUserManagementPage({
			keyword: query.keyword,
			pageNo: pagination.pageNo,
			pageSize: pagination.pageSize
		})

		pageDataTable.value = result.dataTable || null
		tableData.value = result.list || []
		pagination.total = result.total || 0

		const navRoleList = await getUserManagementNavRoles()
		const nextMap: Record<string, UserManagementNavRoleRecord[]> = {}
		navRoleList.forEach((item) => {
			const userId = normalizeText(item.userid)
			if (!userId) {
				return
			}
			if (!nextMap[userId]) {
				nextMap[userId] = []
			}
			nextMap[userId].push(item)
		})
		userNavRoleMap.value = nextMap
	} catch (error) {
		console.error('加载人员列表失败:', error)
		ElMessage.error('加载人员列表失败')
		pageDataTable.value = null
		tableData.value = []
		pagination.total = 0
		userNavRoleMap.value = {}
	} finally {
		loading.value = false
	}
}

async function initializePage() {
	try {
		await loadDictionaries()
	} catch (error) {
		console.error('加载字典失败:', error)
		ElMessage.error('加载字典失败')
	}

	await fetchTableData()
}

function handleSearch() {
	pagination.pageNo = 1
	void fetchTableData()
}

function handleResetSearch() {
	query.keyword = ''
	pagination.pageNo = 1
	void fetchTableData()
}

function handleSizeChange(size: number) {
	pagination.pageSize = size
	pagination.pageNo = 1
	void fetchTableData()
}

function handleCurrentChange(page: number) {
	pagination.pageNo = page
	void fetchTableData()
}

function handleCreate() {
	if (createDisabled.value) {
		return
	}

	editorDialog.mode = 'add'
	editorDialog.visible = true
	editorDialog.loading = false
	resetFormData()
	void nextTick(() => formRef.value?.clearValidate())
}

async function handleEdit(row: UserManagementUserRecord) {
	if (!canEditRow(row.ID)) {
		return
	}

	const userId = normalizeText(row.ID)
	if (!userId) {
		ElMessage.error('当前记录缺少 ID，无法编辑')
		return
	}

	editorDialog.mode = 'edit'
	editorDialog.visible = true
	editorDialog.loading = true
	resetFormData()

	try {
		const detail = await getUserManagementDetail(userId)
		if (!detail) {
			throw new Error('未找到用户详情')
		}

		Object.assign(formData, {
			ID: detail.ID,
			UserName: detail.UserName,
			Sex: detail.Sex || 'M',
			Path: detail.Path,
			LoginName: detail.LoginName,
			LoginPass: '',
			IDCard: detail.IDCard,
			mailbox: detail.mailbox,
			entInfoUserPhone: detail.entInfoUserPhone,
			Nation: detail.Nation,
			MaritalStatus: detail.MaritalStatus || '0',
			Age: detail.Age > 0 ? String(detail.Age) : '',
			Birthday: detail.Birthday,
			State: detail.State || '1',
			NativePlace: detail.NativePlace,
			PermanentTenancy: detail.PermanentTenancy,
			Address: detail.Address,
			memo: detail.memo
		})
		await nextTick()
		formRef.value?.clearValidate()
	} catch (error: any) {
		console.error('加载用户详情失败:', error)
		ElMessage.error(error instanceof Error ? error.message : '加载用户详情失败')
		editorDialog.visible = false
	} finally {
		editorDialog.loading = false
	}
}

async function handlePhotoUpload(options: UploadRequestOptions) {
	photoUploading.value = true
	try {
		const result = await uploadUserPhoto(options.file as File)
		if (!normalizeText(result.path)) {
			throw new Error('上传成功但未返回照片路径')
		}

		formData.Path = result.path
		options.onSuccess?.(result.raw as any)
		ElMessage.success('照片上传成功')
	} catch (error: any) {
		console.error('照片上传失败:', error)
		const uploadError = error instanceof Error ? error : new Error('照片上传失败')
		options.onError?.(uploadError as any)
		ElMessage.error(error instanceof Error ? error.message : '照片上传失败')
	} finally {
		photoUploading.value = false
	}
}

function buildSavePayload(): SaveUserManagementPayload {
	const idCardInfo = deriveIdCardInfo(formData.IDCard)
	formData.Birthday = idCardInfo.birthday
	formData.Age = String(idCardInfo.age)

	return {
		ID: normalizeText(formData.ID),
		EntId: getCurrentEntId(),
		UserName: normalizeText(formData.UserName),
		Sex: normalizeText(formData.Sex) || 'M',
		Path: normalizeText(formData.Path),
		LoginName: normalizeText(formData.LoginName),
		LoginPass: normalizeText(formData.LoginPass),
		IDCard: normalizeText(formData.IDCard),
		mailbox: normalizeText(formData.mailbox),
		entInfoUserPhone: normalizeText(formData.entInfoUserPhone),
		Nation: normalizeText(formData.Nation),
		MaritalStatus: normalizeText(formData.MaritalStatus) || '0',
		Age: Number(formData.Age) || 0,
		Birthday: normalizeText(formData.Birthday),
		State: normalizeText(formData.State) || '1',
		NativePlace: normalizeText(formData.NativePlace),
		PermanentTenancy: normalizeText(formData.PermanentTenancy),
		Address: normalizeText(formData.Address),
		memo: normalizeText(formData.memo)
	}
}

async function handleSubmit() {
	if (submitDisabled.value) {
		return
	}

	if (!formRef.value) {
		return
	}

	const valid = await formRef.value.validate().catch(() => false)
	if (!valid) {
		return
	}

	let payload: SaveUserManagementPayload
	try {
		payload = buildSavePayload()
	} catch (error: any) {
		ElMessage.warning(error instanceof Error ? error.message : '身份证号校验失败')
		return
	}

	if (editorDialog.mode === 'add' && !normalizeText(payload.EntId)) {
		ElMessage.error('当前用户缺少 EntId，无法新增人员')
		return
	}

	editorDialog.submitting = true
	try {
		if (editorDialog.mode === 'add') {
			const result = await createUserManagementUser(payload)
			editorDialog.visible = false
			await fetchTableData()
			if (result.codeGenerated) {
				ElMessage.success('新增人员成功')
			} else {
				ElMessage.warning(result.codeError || '编码生成失败，请人工处理')
			}
			return
		}

		await updateUserManagementUser(payload)
		editorDialog.visible = false
		await fetchTableData()
		ElMessage.success('保存人员成功')
	} catch (error: any) {
		console.error('保存人员失败:', error)
		ElMessage.error(error instanceof Error ? error.message : '保存人员失败')
	} finally {
		editorDialog.submitting = false
	}
}

async function handleDelete(row: UserManagementUserRecord) {
	if (!canDeleteRow(row.ID)) {
		return
	}

	const userId = normalizeText(row.ID)
	if (!userId) {
		ElMessage.error('当前记录缺少 ID，无法删除')
		return
	}

	try {
		await ElMessageBox.confirm(`确定删除人员“${row.UserName || ''}”吗？`, '删除确认', {
			type: 'warning',
			confirmButtonText: '确定',
			cancelButtonText: '取消'
		})
	} catch {
		return
	}

	try {
		await deleteUserManagementUser(userId)
		if (tableData.value.length === 1 && pagination.pageNo > 1) {
			pagination.pageNo -= 1
		}
		await fetchTableData()
		ElMessage.success('删除人员成功')
	} catch (error: any) {
		console.error('删除人员失败:', error)
		ElMessage.error(error instanceof Error ? error.message : '删除人员失败')
	}
}

function handleOpenPermissionDialog(row: UserManagementUserRecord, item: UserManagementNavRoleRecord) {
	const sysId = normalizeText(item.masterId)
	const userId = normalizeText(item.userid)
	const userName = normalizeText(row.UserName) || normalizeText(item.UserName) || '当前用户'
	const appName = normalizeText(item.FunName) || '当前应用'

	if (!sysId || !userId) {
		ElMessage.warning('当前权限记录缺少 sysId 或 userId，无法查看详情')
		return
	}

	permissionDialog.title = `${userName}在${appName}中的权限`
	permissionDialog.sysId = sysId
	permissionDialog.userId = userId
	permissionDialog.userName = userName
	permissionDialog.appName = appName
	permissionDialog.visible = true
}

onMounted(() => {
	void initializePage()
})
</script>

<style scoped lang="scss">
.user-management-page-shell {
	:deep(.page-content),
	:deep(.vben-page-content),
	:deep(.ant-page-content) {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}
}

.user-management-page {
	height: calc(100vh - 112px);
	max-height: calc(100vh - 112px);
	min-height: 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.card-header__actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.search-input {
		width: 320px;
	}

	.table-card {
		display: flex;
		flex: 1;
		flex-direction: column;
		height: 100%;
		min-height: 0;

		:deep(.el-card__header) {
			flex: 0 0 auto;
		}

		:deep(.el-card__body) {
			display: flex;
			flex: 1;
			flex-direction: column;
			min-height: 0;
			overflow: hidden;
		}
	}

	.table-scroll-area {
		flex: 1;
		min-height: 0;
	}

	.pagination-wrapper {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		flex: 0 0 44px;
		min-height: 44px;
		padding-top: 8px;
		background: var(--el-bg-color);
	}
}

.role-cell {
	display: flex;
	flex-direction: column;
	gap: 6px;
	line-height: 1.5;
	white-space: normal;
	word-break: break-all;
}

.role-cell__row {
	display: flex;
	align-items: flex-start;
	gap: 4px;
}

.role-cell__app {
	flex: none;
	color: #303133;
	font-weight: 500;
}

.role-cell__list {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.role-cell__line {
	display: block;
}

.permission-links {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	line-height: 1.4;
	width: 100%;
	min-width: 0;
}

.permission-links__button {
	margin-left: 0;
	padding: 0;
	min-height: auto;
	width: 100%;
	max-width: 100%;
	white-space: normal;
	text-align: left;
	justify-content: flex-start;
	word-break: break-all;
	line-height: 1.5;
}

.user-editor {
	min-height: 360px;
}

.user-editor__layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 280px;
	gap: 20px;
	align-items: start;
}

.user-editor__grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	column-gap: 18px;
	row-gap: 2px;
}

.user-editor__span-2 {
	grid-column: 1 / -1;
}

.user-editor__aside {
	position: sticky;
	top: 0;
}

.photo-panel {
	padding: 16px;
	border: 1px solid var(--el-border-color);
	border-radius: 8px;
	background: linear-gradient(180deg, #fafcff 0%, #f5f7fa 100%);
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.photo-panel__title {
	font-size: 14px;
	font-weight: 600;
	color: #303133;
}

.photo-panel__preview {
	width: 100%;
	height: 220px;
	border-radius: 8px;
	background: #ffffff;
	border: 1px dashed #dcdfe6;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.photo-panel__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.photo-panel__placeholder {
	color: #909399;
	font-size: 14px;
	letter-spacing: 1px;
}

.photo-panel__path {
	font-size: 12px;
	line-height: 1.5;
	color: #606266;
	word-break: break-all;
}

.option-checks {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
	min-height: 32px;
	align-items: center;
}

.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

.permission-dialog__body {
	padding: 8px 4px;
	line-height: 1.7;
	color: #606266;
}

.permission-dialog__name {
	font-weight: 600;
	color: #303133;
	margin-bottom: 8px;
}

.permission-dialog__tip {
	color: #909399;
}

@media (max-width: 1080px) {
	.user-management-page {
		.card-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.search-input {
			width: 100%;
		}
	}

	.user-editor__layout {
		grid-template-columns: 1fr;
	}

	.user-editor__grid {
		grid-template-columns: 1fr;
	}

	.user-editor__span-2 {
		grid-column: auto;
	}
}
</style>
