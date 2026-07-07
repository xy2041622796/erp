/**
 * 人员管理页 API。
 * 统一使用 DataTable 访问人员视图、权限视图、用户表和字典数据。
 * model_id: 2ED292CBED7B28C8541CF4F3E852A4A2
 */

import { DataTable, GetNewGUID, and, baseApiUrl, cond, or } from '#/api/qyapi'
import { requestClient } from '#/api/request'

const MODEL_ID = '2ED292CBED7B28C8541CF4F3E852A4A2'
const DB_NAME = 'QYVirtualPlat'

const USER_VIEW_TABLE = 'view_user_dj'
const USER_TABLE = 'Base_UserInfo'
const NAV_ROLE_VIEW_TABLE = 'view_topnav_user_role'

const SEX_DICT_TABLE = 'user_sex'
const SEX_DICT_DB = '6E11CD546200496387FAD367FC676D6A'
const MARRIAGE_DICT_TABLE = 'marriage'
const MARRIAGE_DICT_DB = '249AAC65C3250A1D1B8E82B3575EC73A'
const STATE_DICT_TABLE = 'isPass'
const STATE_DICT_DB = 'CB2849C51BD044FC88445B0165D71153'

const USER_CODE_TEMPLATE_ID = '39F61E990F279588467140E4C2176091'

export interface UserManagementDictOption {
  label: string
  value: string
  raw: any
}

export interface UserManagementPageQuery {
  keyword?: string
  pageNo?: number
  pageSize?: number
}

export interface UserManagementPageResult {
  list: UserManagementUserRecord[]
  total: number
  dataTable: DataTable | null
}

export interface UserManagementUserRecord {
  ID: string
  ROWID: string
  UserName: string
  LoginName: string
  Sex: string
  Age: number
  Birthday: string
  entInfoUserPhone: string
  user_jobs: string
  user_roles: string
  raw: any
}

export interface UserManagementNavRoleRecord {
  userid: string
  FunName: string
  UserName: string
  masterId: string
  raw: any
}

export interface UserManagementDetailRecord {
  ID: string
  ROWID: string
  EntId: string
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
  Age: number
  Birthday: string
  State: string
  NativePlace: string
  PermanentTenancy: string
  Address: string
  memo: string
  raw: any
}

export interface SaveUserManagementPayload {
  ID?: string
  EntId?: string
  UserName: string
  Sex: string
  Path: string
  LoginName: string
  LoginPass?: string
  IDCard: string
  mailbox: string
  entInfoUserPhone: string
  Nation: string
  MaritalStatus: string
  Age: number
  Birthday: string
  State: string
  NativePlace: string
  PermanentTenancy: string
  Address: string
  memo: string
}

export interface CreateUserManagementResult {
  id: string
  userId: string
  codeGenerated: boolean
  codeError?: string
}

export interface UploadUserPhotoResult {
  path: string
  raw: any
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeNumber(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function normalizeTextByKeys(source: any, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(source?.[key])
    if (value) {
      return value
    }
  }

  return ''
}

function pickFirstValue(source: any, keys: string[]) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
      return source[key]
    }
  }

  return ''
}

function getResultData(response: any) {
  return response.data?.Result?.data || response.data?.Result || response.data || {}
}

function getResultItems<T = any>(response: any): T[] {
  const result = response.data?.Result
  if (Array.isArray(result?.data?.Items)) {
    return result.data.Items
  }
  if (Array.isArray(result?.data)) {
    return result.data
  }
  if (Array.isArray(result?.Items)) {
    return result.Items
  }
  if (Array.isArray(result)) {
    return result
  }
  if (Array.isArray(response.data)) {
    return response.data
  }

  return []
}

function getResultCount(response: any) {
  const data = getResultData(response)
  const count = Number(data?.Count)
  return Number.isFinite(count) ? count : getResultItems(response).length
}

function unwrapCodeingValue(response: any) {
  const message = normalizeText(response?.data?.Message)
  if (message) {
    return message
  }

  const raw = response?.data
  if (typeof raw === 'string' || typeof raw === 'number') {
    return normalizeText(raw)
  }

  const result = raw?.Result ?? raw?.data ?? raw
  if (typeof result === 'string' || typeof result === 'number') {
    return normalizeText(result)
  }

  return normalizeText(result?.value || result?.Value || result?.code || result?.Code)
}

function unwrapUploadPath(response: any) {
  const result = response?.data?.Result ?? response?.data ?? response
  const candidate = Array.isArray(result) ? result[0] : result

  if (typeof candidate === 'string') {
    return normalizeText(candidate)
  }

  return normalizeText(
    candidate?.path ||
    candidate?.Path ||
    candidate?.filePath ||
    candidate?.FilePath ||
    candidate?.url ||
    candidate?.Url ||
    candidate?.src ||
    candidate?.Src ||
    candidate?.relativePath ||
    candidate?.RelativePath ||
    candidate?.savePath ||
    candidate?.SavePath
  )
}

function buildAndFilter(filters: any[]) {
  const validFilters = filters.filter(Boolean)
  if (validFilters.length === 0) {
    return null
  }
  if (validFilters.length === 1) {
    return validFilters[0]
  }
  return and(...validFilters)
}

function createTable(tableName: string, dbName = DB_NAME, primaryKey = 'ID') {
  return new DataTable(MODEL_ID, tableName, dbName, primaryKey)
}

function createUserViewTable() {
  const table = createTable(USER_VIEW_TABLE, DB_NAME, 'ID')
  table.Type = '数据库视图'
  table.Fields = [
    { Name: 'ID' },
    { Name: 'ROWID' },
    { Name: 'UserName' },
    { Name: 'LoginName' },
    { Name: 'Sex' },
    { Name: 'Age' },
    { Name: 'Birthday' },
    { Name: 'entInfoUserPhone' },
    { Name: 'user_jobs' },
    { Name: 'user_roles' }
  ]
  return table
}

function createUserTable() {
  const table = createTable(USER_TABLE, DB_NAME, 'ID')
  table.Fields = [
    { Name: 'ID' },
    { Name: 'ROWID' },
    { Name: 'EntId' },
    { Name: 'UserName' },
    { Name: 'Sex' },
    { Name: 'Path' },
    { Name: 'LoginName' },
    { Name: 'LoginPass' },
    { Name: 'IDCard' },
    { Name: 'mailbox' },
    { Name: 'entInfoUserPhone' },
    { Name: 'Nation' },
    { Name: 'MaritalStatus' },
    { Name: 'Age' },
    { Name: 'Birthday' },
    { Name: 'State' },
    { Name: 'NativePlace' },
    { Name: 'PermanentTenancy' },
    { Name: 'Address' },
    { Name: 'memo' }
  ]
  return table
}

function createNavRoleViewTable() {
  const table = createTable(NAV_ROLE_VIEW_TABLE, DB_NAME, 'userid')
  table.Type = '数据库视图'

  return table
}

function createDictTable(tableName: string, dbName: string) {
  const table = createTable(tableName, dbName, 'val')
  table.Type = '字典'
  table.Fields = [
    { Name: 'val' },
    { Name: 'txt' }
  ]
  return table
}

async function queryPage(table: DataTable, pageNo = 1, pageSize = 20) {
  const response = await requestClient.post(table.queryUrl, {
    Table: [table],
    PageParam: {
      index: pageNo,
      size: pageSize
    }
  }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)

  return {
    list: getResultItems(response),
    total: getResultCount(response),
    dataTable: table
  }
}

async function queryAllRecords(table: DataTable) {
  const response = await requestClient.post(table.queryUrl, {
    Table: [table]
  }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response)
}

async function saveTable(table: DataTable, added: any[] = [], changed: any[] = [], deleted: any[] = []) {
  const response = await requestClient.post(table.saveUrl, table.getSaveParam(added, changed, deleted), {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  return response.data?.Result || response.data
}

async function getCodeString(seed: string, templateId: string) {
  const response = await requestClient.get(`${baseApiUrl}Codeing/GetCodeString/${seed}/${templateId}`, {
    responseReturn: 'raw'
  } as any)

  return unwrapCodeingValue(response)
}

function normalizeDictOption(item: any): UserManagementDictOption {
  return {
    label: normalizeTextByKeys(item, ['txt', 'Text', 'label', 'Label']),
    value: normalizeTextByKeys(item, ['val', 'Value', 'value']),
    raw: item
  }
}

function normalizeUserRecord(item: any): UserManagementUserRecord {
  return {
    ID: normalizeTextByKeys(item, ['ID', 'Id', 'id']),
    ROWID: normalizeTextByKeys(item, ['ROWID', 'RowID', 'rowid', 'rowId']),
    UserName: normalizeTextByKeys(item, ['UserName', 'username']),
    LoginName: normalizeTextByKeys(item, ['LoginName', 'loginName']),
    Sex: normalizeTextByKeys(item, ['Sex', 'sex']),
    Age: normalizeNumber(pickFirstValue(item, ['Age', 'age'])),
    Birthday: normalizeTextByKeys(item, ['Birthday', 'birthday']),
    entInfoUserPhone: normalizeTextByKeys(item, ['entInfoUserPhone', 'Phone', 'phone']),
    user_jobs: normalizeTextByKeys(item, ['user_jobs', 'UserJobs']),
    user_roles: normalizeTextByKeys(item, ['user_roles', 'UserRoles']),
    raw: item
  }
}

function normalizeUserDetailRecord(item: any): UserManagementDetailRecord {
  return {
    ID: normalizeTextByKeys(item, ['ID', 'Id', 'id']),
    ROWID: normalizeTextByKeys(item, ['ROWID', 'RowID', 'rowid', 'rowId']),
    EntId: normalizeTextByKeys(item, ['EntId', 'entId']),
    UserName: normalizeTextByKeys(item, ['UserName', 'username']),
    Sex: normalizeTextByKeys(item, ['Sex', 'sex']) || 'M',
    Path: normalizeTextByKeys(item, ['Path', 'path']),
    LoginName: normalizeTextByKeys(item, ['LoginName', 'loginName']),
    LoginPass: normalizeTextByKeys(item, ['LoginPass', 'loginPass']),
    IDCard: normalizeTextByKeys(item, ['IDCard', 'IdCard', 'idCard']),
    mailbox: normalizeTextByKeys(item, ['mailbox', 'Mailbox', 'email', 'Email']),
    entInfoUserPhone: normalizeTextByKeys(item, ['entInfoUserPhone', 'Phone', 'phone']),
    Nation: normalizeTextByKeys(item, ['Nation', 'nation']),
    MaritalStatus: normalizeTextByKeys(item, ['MaritalStatus', 'maritalStatus']) || '0',
    Age: normalizeNumber(pickFirstValue(item, ['Age', 'age'])),
    Birthday: normalizeTextByKeys(item, ['Birthday', 'birthday']),
    State: normalizeTextByKeys(item, ['State', 'state']) || '1',
    NativePlace: normalizeTextByKeys(item, ['NativePlace', 'nativePlace']),
    PermanentTenancy: normalizeTextByKeys(item, ['PermanentTenancy', 'permanentTenancy']),
    Address: normalizeTextByKeys(item, ['Address', 'address']),
    memo: normalizeTextByKeys(item, ['memo', 'Memo']),
    raw: item
  }
}

function normalizeNavRoleRecord(item: any): UserManagementNavRoleRecord {
  return {
    userid: normalizeTextByKeys(item, ['userid', 'UserId', 'userId', 'ID']),
    FunName: normalizeTextByKeys(item, ['FunName', 'funName', 'Name']),
    UserName: normalizeTextByKeys(item, ['UserName', 'userName', 'Name']),
    masterId: normalizeTextByKeys(item, ['masterId', 'MasterId', 'masterid']),
    raw: item
  }
}

function buildSavePayload(payload: SaveUserManagementPayload) {
  return {
    ID: normalizeText(payload.ID),
    EntId: normalizeText(payload.EntId),
    UserName: normalizeText(payload.UserName),
    Sex: normalizeText(payload.Sex) || 'M',
    Path: normalizeText(payload.Path),
    LoginName: normalizeText(payload.LoginName),
    LoginPass: normalizeText(payload.LoginPass),
    IDCard: normalizeText(payload.IDCard),
    mailbox: normalizeText(payload.mailbox),
    entInfoUserPhone: normalizeText(payload.entInfoUserPhone),
    Nation: normalizeText(payload.Nation),
    MaritalStatus: normalizeText(payload.MaritalStatus) || '0',
    Age: normalizeNumber(payload.Age),
    Birthday: normalizeText(payload.Birthday),
    State: normalizeText(payload.State) || '1',
    NativePlace: normalizeText(payload.NativePlace),
    PermanentTenancy: normalizeText(payload.PermanentTenancy),
    Address: normalizeText(payload.Address),
    memo: normalizeText(payload.memo)
  }
}

/**
 * 获取人员分页列表。
 */
export async function getUserManagementPage(params: UserManagementPageQuery = {}) {
  const table = createUserViewTable()
  const keyword = normalizeText(params.keyword)
  const filters: any[] = []

  if (keyword) {
    filters.push(or(
      cond('UserName', 'contains', keyword),
      cond('LoginName', 'contains', keyword),
      cond('entInfoUserPhone', 'contains', keyword),
      cond('user_jobs', 'contains', keyword)
    ))
  }

  table.Filter = buildAndFilter(filters)

  const result = await queryPage(table, params.pageNo || 1, params.pageSize || 20)

  return {
    list: result.list.map((item) => normalizeUserRecord(item)),
    total: result.total,
    dataTable: result.dataTable || null
  } as UserManagementPageResult
}

/**
 * 获取当前页人员对应的权限查看列表。
 */
export async function getUserManagementNavRoles() {
  const table = createNavRoleViewTable()

  const result = await queryAllRecords(table)
  return result.map((item) => normalizeNavRoleRecord(item))
}

/**
 * 按 ID 读取用户明细。
 */
export async function getUserManagementDetail(id: string) {
  const userId = normalizeText(id)
  if (!userId) {
    return null
  }

  const table = createUserTable()
  table.Filter = cond('ID', 'equal', userId)

  const result = await queryPage(table, 1, 1)
  const first = result.list[0]
  return first ? normalizeUserDetailRecord(first) : null
}

/**
 * 获取性别字典选项。
 */
export async function getUserSexOptions() {
  const table = createDictTable(SEX_DICT_TABLE, SEX_DICT_DB)
  const result = await queryAllRecords(table)
  return result.map((item) => normalizeDictOption(item))
}

/**
 * 获取婚姻状况字典选项。
 */
export async function getMarriageOptions() {
  const table = createDictTable(MARRIAGE_DICT_TABLE, MARRIAGE_DICT_DB)
  const result = await queryAllRecords(table)
  return result.map((item) => normalizeDictOption(item))
}

/**
 * 获取账号状态字典选项。
 */
export async function getUserStateOptions() {
  const table = createDictTable(STATE_DICT_TABLE, STATE_DICT_DB)
  const result = await queryAllRecords(table)
  return result.map((item) => normalizeDictOption(item))
}

/**
 * 上传用户照片并返回路径。
 */
export async function uploadUserPhoto(file: File): Promise<UploadUserPhotoResult> {
  const table = createUserTable()
  const formData = new FormData()
  formData.append('files', file)
  formData.append('customPath', '')
  formData.append('appType', 'wwwroot')
  formData.append('isReplace', 'false')
  formData.append('newName', '')
  formData.append('isCrossEnt', 'false')

  const response = await requestClient.post(`${baseApiUrl}File/UploadFile`, formData, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  return {
    path: unwrapUploadPath(response),
    raw: response.data?.Result || response.data
  }
}

/**
 * 新增用户，成功后尝试生成用户编码并回填 ROWID。
 */
export async function createUserManagementUser(payload: SaveUserManagementPayload): Promise<CreateUserManagementResult> {
  const table = createUserTable()
  const id = normalizeText(payload.ID) || GetNewGUID()
  const savePayload = buildSavePayload({
    ...payload,
    ID: id
  })

  await saveTable(table, [{ ...savePayload, ROWID: id }], [], [])

  try {
    const userId = await getCodeString(id, USER_CODE_TEMPLATE_ID)
    if (!userId) {
      throw new Error('用户编码生成失败')
    }

    await saveTable(table, [], [{ ID: id, ROWID: userId }], [])

    return {
      id,
      userId,
      codeGenerated: true
    }
  } catch (error: any) {
    return {
      id,
      userId: '',
      codeGenerated: false,
      codeError: error instanceof Error ? error.message : normalizeText(error?.message) || '用户编码生成失败'
    }
  }
}

/**
 * 更新用户基础信息。
 */
export async function updateUserManagementUser(payload: SaveUserManagementPayload) {
  const id = normalizeText(payload.ID)
  if (!id) {
    throw new Error('缺少用户 ID，无法保存')
  }

  const table = createUserTable()
  const savePayload = buildSavePayload(payload)
  const changedPayload = {
    ID: id,
    UserName: savePayload.UserName,
    Sex: savePayload.Sex,
    Path: savePayload.Path,
    LoginName: savePayload.LoginName,
    IDCard: savePayload.IDCard,
    mailbox: savePayload.mailbox,
    entInfoUserPhone: savePayload.entInfoUserPhone,
    Nation: savePayload.Nation,
    MaritalStatus: savePayload.MaritalStatus,
    Age: savePayload.Age,
    Birthday: savePayload.Birthday,
    State: savePayload.State,
    NativePlace: savePayload.NativePlace,
    PermanentTenancy: savePayload.PermanentTenancy,
    Address: savePayload.Address,
    memo: savePayload.memo
  }

  return saveTable(table, [], [changedPayload], [])
}

/**
 * 删除用户。
 */
export async function deleteUserManagementUser(id: string) {
  const userId = normalizeText(id)
  if (!userId) {
    throw new Error('缺少用户 ID，无法删除')
  }

  const table = createUserTable()
  return saveTable(table, [], [], [{ ID: userId }])
}

export default {
  getUserManagementPage,
  getUserManagementNavRoles,
  getUserManagementDetail,
  getUserSexOptions,
  getMarriageOptions,
  getUserStateOptions,
  uploadUserPhoto,
  createUserManagementUser,
  updateUserManagementUser,
  deleteUserManagementUser
}
