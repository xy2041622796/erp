/**
 * 组织结构页面 API。
 * 统一使用 DataTable 访问部门、岗位、字典和岗位视图数据。
 */

import { DataTable, GetNewGUID, and, baseApiUrl, cond, or } from '#/api/qyapi'
import { requestClient } from '#/api/request'

const MODEL_ID = '2ED292CBED7B28C8541CF4F3E852A4A2'
const DB_NAME = 'QYVirtualPlat'
const ROOT_PARENT_ID = '000000'

const DEPARTMENT_TABLE = 'Base_DepartInfo'
const JOB_TABLE = 'Base_JobInfo'
const DEPARTMENT_JOB_USER_VIEW = 'view_dep_job_userDJ'
const USER_JOB_TABLE = 'Base_User_DJ'

const DEPARTMENT_TYPE_DICT = 'DepType'
const DEPARTMENT_TYPE_DICT_DB = '5F187802A3EE4434A055EED7A11CC01F'
const JOB_TYPE_DICT = 'ISExclusiveJob'
const JOB_TYPE_DICT_DB = 'DE84A2EB759942859BD288527832496B'
const USER_JOB_TYPE_DICT = 'pt_JobTypeUser'
const USER_JOB_TYPE_DICT_DB = 'D4D612DB354A56B302B84EEE8F6A5568'

const DEPARTMENT_CODE_TEMPLATE_ID = '5F320C95270EF5410F257C8FA4B90452'
const JOB_CODE_TEMPLATE_ID = 'E42081AAE5F196E37991D63D53C0B7BE'

export interface OrganizationDictOption {
  label: string
  value: string
  raw: any
}

export interface OrganizationDepartmentRecord {
  rowid: string
  DepID: string
  Prowid: string
  DepName: string
  DepShortName: string
  DepCode: string
  DepLevelCode: string
  DepLevel: number
  IsTrue: number
  EnterpriseID: string
  CSR: string
  zwSCR: string
  leaf: boolean
  children: OrganizationDepartmentRecord[]
  raw: any
}

export interface OrganizationDepartmentListResult {
  list: OrganizationDepartmentRecord[]
  dataTable: DataTable | null
}

export interface OrganizationJobRecord {
  ID: string
  rowid: string
  JobCode: string
  JobName: string
  jobExpNum: number
  JobDuty: string
  JobType: number
  Depid: string
  DepName: string
  DepLevelCode: string
  DepLevel: number
  IsExclusive: string
  raw: any
}

export interface OrganizationJobListRow {
  jobKey: string
  ID: string
  rowid: string
  JobId: string
  JobCode: string
  JobName: string
  JobType: number
  IsExclusive: string
  UserID: string
  UserName: string
  DepID: string
  DepName: string
  raw: any
}

export interface OrganizationDepartmentJobListResult {
  list: OrganizationJobListRow[]
  dataTable: DataTable | null
}

export interface OrganizationJobUserAssignmentRecord {
  rowid: string
  DJID: string
  JobID: string
  DepID: string
  DepName: string
  JobName: string
  Memo: string
  UserID: string
  UserName: string
  JobType: number
  IsWork: number
  JobRespon: string
  raw: any
}

export interface OrganizationPersonValueItem {
  UserId: string
  UserName: string
}

export interface SaveJobUserAssignmentsPayload {
  row: OrganizationJobListRow
  previousUsers: OrganizationPersonValueItem[]
  nextUsers: OrganizationPersonValueItem[]
}

export interface OrganizationJobUserSettingRecord {
  rowid: string
  UserID: string
  UserName: string
  JobType: string
  IsWork: number
  JobRespon: string
  Memo: string
  raw: any
}

export interface SaveJobUserSettingsPayload {
  rows: Array<{
    rowid: string
    JobType: string
    IsWork: number
    JobRespon: string
    Memo: string
  }>
}

export interface CreateDepartmentPayload {
  parentDepartment: OrganizationDepartmentRecord
  enterpriseId: string
  depName: string
  depShortName: string
  depCode: string
  isTrue: number
}

export interface UpdateDepartmentPayload {
  rowid: string
  depName: string
  depShortName: string
  depCode: string
  isTrue: number
}

export interface MoveDepartmentPayload {
  sourceDepartment: OrganizationDepartmentRecord
  targetParentDepartment: OrganizationDepartmentRecord
  departmentList: OrganizationDepartmentRecord[]
}

export interface CreateJobPayload {
  department: OrganizationDepartmentRecord
  jobName: string
  jobExpNum: number
  jobDuty: string
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

function createTable(tableName: string, dbName = DB_NAME, primaryKey = 'rowid') {
  return new DataTable(MODEL_ID, tableName, dbName, primaryKey)
}

function createDepartmentTable(primaryKey = 'rowid') {
  return createTable(DEPARTMENT_TABLE, DB_NAME, primaryKey)
}

function createJobTable(primaryKey = 'rowid') {
  return createTable(JOB_TABLE, DB_NAME, primaryKey)
}

function createDepartmentJobUserViewTable() {
  const table = createTable(DEPARTMENT_JOB_USER_VIEW, DB_NAME, 'rowid')
  table.Type = '数据库视图'
  return table
}

function createUserJobTable(primaryKey = 'rowid') {
  return createTable(USER_JOB_TABLE, DB_NAME, primaryKey)
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

function splitCommaText(value: unknown) {
  return normalizeText(value)
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function mergeCommaText(...values: unknown[]) {
  return Array.from(new Set(values.flatMap((item) => splitCommaText(item)))).join(',')
}

function joinPath(...parts: unknown[]) {
  return parts
    .map((item) => normalizeText(item).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function normalizeDepartmentRecord(item: any): OrganizationDepartmentRecord {
  return {
    rowid: normalizeTextByKeys(item, ['rowid', 'ROWID', 'RowID', 'rowId']),
    DepID: normalizeTextByKeys(item, ['DepID', 'DepId', 'depid']),
    Prowid: normalizeTextByKeys(item, ['Prowid', 'PRowid', 'prowid']),
    DepName: normalizeTextByKeys(item, ['DepName', 'depName']),
    DepShortName: normalizeTextByKeys(item, ['DepShortName', 'depShortName']),
    DepCode: normalizeTextByKeys(item, ['DepCode', 'depCode']),
    DepLevelCode: normalizeTextByKeys(item, ['DepLevelCode', 'depLevelCode']),
    DepLevel: normalizeNumber(pickFirstValue(item, ['DepLevel', 'depLevel', 'DepLevelCode', 'depLevelCode'])),
    IsTrue: normalizeNumber(pickFirstValue(item, ['IsTrue', 'isTrue'])),
    EnterpriseID: normalizeTextByKeys(item, ['EnterpriseID', 'enterpriseId']),
    CSR: normalizeTextByKeys(item, ['CSR', 'csr']),
    zwSCR: normalizeTextByKeys(item, ['zwSCR', 'ZwSCR', 'zwscr']),
    leaf: true,
    children: [],
    raw: item
  }
}

function normalizeJobRecord(item: any): OrganizationJobRecord {
  return {
    ID: normalizeTextByKeys(item, ['ID', 'Id', 'id']),
    rowid: normalizeTextByKeys(item, ['rowid', 'ROWID', 'RowID', 'rowId']),
    JobCode: normalizeTextByKeys(item, ['JobCode', 'jobCode']),
    JobName: normalizeTextByKeys(item, ['JobName', 'jobName']),
    jobExpNum: normalizeNumber(pickFirstValue(item, ['jobExpNum', 'JobExpNum'])),
    JobDuty: normalizeTextByKeys(item, ['JobDuty', 'jobDuty']),
    JobType: normalizeNumber(pickFirstValue(item, ['JobType', 'jobType', 'IsExclusive', 'isExclusive'])),
    Depid: normalizeTextByKeys(item, ['Depid', 'DepID', 'depid']),
    DepName: normalizeTextByKeys(item, ['DepName', 'depName']),
    DepLevelCode: normalizeTextByKeys(item, ['DepLevelCode', 'depLevelCode']),
    DepLevel: normalizeNumber(pickFirstValue(item, ['DepLevel', 'depLevel', 'DepLevelCode', 'depLevelCode'])),
    IsExclusive: normalizeTextByKeys(item, ['IsExclusive', 'isExclusive', 'JobType', 'jobType']),
    raw: item
  }
}

function normalizeJobListRow(item: any): OrganizationJobListRow {
  const normalized = normalizeJobRecord(item)
  return {
    jobKey: normalized.ID || normalized.JobCode || normalized.rowid || GetNewGUID(),
    ID: normalized.ID,
    rowid: normalized.rowid,
    JobId: normalizeTextByKeys(item, ['JobId', 'JobID', 'jobId']),
    JobCode: normalized.JobCode,
    JobName: normalized.JobName,
    JobType: normalized.JobType,
    IsExclusive: normalized.IsExclusive,
    UserID: normalizeTextByKeys(item, ['UserID', 'UserId', 'userId']),
    UserName: normalizeTextByKeys(item, ['UserName', 'userName']),
    DepID: normalizeTextByKeys(item, ['DepID', 'Depid', 'depid']),
    DepName: normalizeTextByKeys(item, ['DepName', 'depName']),
    raw: item
  }
}

function normalizeJobUserAssignmentRecord(item: any): OrganizationJobUserAssignmentRecord {
  return {
    rowid: normalizeTextByKeys(item, ['rowid', 'ROWID', 'RowID', 'rowId']),
    DJID: normalizeTextByKeys(item, ['DJID', 'DjId', 'djId']),
    JobID: normalizeTextByKeys(item, ['JobID', 'JobId', 'jobId']),
    DepID: normalizeTextByKeys(item, ['DepID', 'DepId', 'depid']),
    DepName: normalizeTextByKeys(item, ['DepName', 'depName']),
    JobName: normalizeTextByKeys(item, ['JobName', 'jobName']),
    Memo: normalizeTextByKeys(item, ['Memo', 'memo']),
    UserID: normalizeTextByKeys(item, ['UserID', 'UserId', 'userId']),
    UserName: normalizeTextByKeys(item, ['UserName', 'userName']),
    JobType: normalizeNumber(pickFirstValue(item, ['JobType', 'jobType'])),
    IsWork: normalizeNumber(pickFirstValue(item, ['IsWork', 'isWork'])),
    JobRespon: normalizeTextByKeys(item, ['JobRespon', 'jobRespon']),
    raw: item
  }
}

function normalizeJobUserSettingRecord(item: any): OrganizationJobUserSettingRecord {
  return {
    rowid: normalizeTextByKeys(item, ['rowid', 'ROWID', 'RowID', 'rowId']),
    UserID: normalizeTextByKeys(item, ['UserID', 'UserId', 'userId']),
    UserName: normalizeTextByKeys(item, ['UserName', 'userName']),
    JobType: normalizeTextByKeys(item, ['JobType', 'jobType']),
    IsWork: normalizeNumber(pickFirstValue(item, ['IsWork', 'isWork'])),
    JobRespon: normalizeTextByKeys(item, ['JobRespon', 'jobRespon']),
    Memo: normalizeTextByKeys(item, ['Memo', 'memo']),
    raw: item
  }
}

function normalizePersonValueList(list: unknown) {
  if (!Array.isArray(list)) {
    return [] as OrganizationPersonValueItem[]
  }

  const personMap = new Map<string, OrganizationPersonValueItem>()

  list.forEach((item) => {
    const userId = normalizeText((item as any)?.UserId ?? (item as any)?.UserID)
    if (!userId || personMap.has(userId)) {
      return
    }

    personMap.set(userId, {
      UserId: userId,
      UserName: normalizeText((item as any)?.UserName) || userId
    })
  })

  return Array.from(personMap.values())
}

function normalizeDictOption(item: any): OrganizationDictOption {
  return {
    label: normalizeTextByKeys(item, ['txt', 'Text', 'label', 'Label']),
    value: normalizeTextByKeys(item, ['val', 'Value', 'value']),
    raw: item
  }
}

function sortDepartmentRecords(records: OrganizationDepartmentRecord[]) {
  return records.slice().sort((left, right) => {
    const leftOrder = normalizeNumber(left.DepCode)
    const rightOrder = normalizeNumber(right.DepCode)
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return normalizeText(left.DepName).localeCompare(normalizeText(right.DepName), 'zh-CN')
  })
}

function buildDepartmentMap(records: OrganizationDepartmentRecord[]) {
  const departmentMap = new Map<string, OrganizationDepartmentRecord>()

  records.forEach((item) => {
    const depId = normalizeText(item.DepID)
    if (!depId) {
      return
    }

    departmentMap.set(depId, item)
  })

  return departmentMap
}

function buildDepartmentChildrenMap(records: OrganizationDepartmentRecord[]) {
  const childrenMap = new Map<string, OrganizationDepartmentRecord[]>()

  records.forEach((item) => {
    const parentId = normalizeText(item.Prowid)
    const siblingList = childrenMap.get(parentId) || []
    siblingList.push(item)
    childrenMap.set(parentId, siblingList)
  })

  return childrenMap
}

function buildMoveDepartmentChangedRows(payload: MoveDepartmentPayload) {
  const records = Array.isArray(payload.departmentList) ? payload.departmentList : []
  const departmentMap = buildDepartmentMap(records)
  const childrenMap = buildDepartmentChildrenMap(records)
  const sourceDepId = normalizeText(payload.sourceDepartment.DepID)
  const targetParentDepId = normalizeText(payload.targetParentDepartment.DepID)
  const sourceDepartment = departmentMap.get(sourceDepId) || payload.sourceDepartment
  const targetParentDepartment = departmentMap.get(targetParentDepId) || payload.targetParentDepartment

  if (!sourceDepId || !targetParentDepId) {
    throw new Error('缺少部门移动所需的 DepID')
  }

  const changedRows: Array<Record<string, string>> = []
  const visited = new Set<string>()

  const walk = (record: OrganizationDepartmentRecord, parentCsr: string, parentZwScr: string, isSource = false) => {
    const depId = normalizeText(record.DepID)
    const rowid = normalizeText(record.rowid)
    if (!depId || visited.has(depId)) {
      return
    }

    if (!rowid) {
      throw new Error(`部门 ${depId} 缺少 rowid，无法保存移动结果`)
    }

    visited.add(depId)

    const nextCsr = joinPath(parentCsr, depId)
    const nextZwScr = joinPath(parentZwScr, record.DepName)
    const changedRow: Record<string, string> = {
      rowid,
      CSR: nextCsr,
      zwSCR: nextZwScr
    }

    if (isSource) {
      changedRow.Prowid = targetParentDepId
    }

    changedRows.push(changedRow)

    const childList = childrenMap.get(depId) || []
    childList.forEach((child) => {
      walk(child, nextCsr, nextZwScr)
    })
  }

  walk(
    sourceDepartment,
    normalizeText(targetParentDepartment.CSR),
    normalizeText(targetParentDepartment.zwSCR),
    true
  )

  return changedRows
}

function mergeJobRows(rows: OrganizationJobListRow[]) {
  const rowMap = new Map<string, OrganizationJobListRow>()

  rows.forEach((row) => {
    const current = rowMap.get(row.jobKey)
    if (!current) {
      rowMap.set(row.jobKey, { ...row })
      return
    }

    current.ID = current.ID || row.ID
    current.rowid = current.rowid || row.rowid
    current.JobId = current.JobId || row.JobId
    current.JobCode = current.JobCode || row.JobCode
    current.JobName = current.JobName || row.JobName
    current.JobType = normalizeNumber(current.JobType) || normalizeNumber(row.JobType)
    current.IsExclusive = current.IsExclusive || row.IsExclusive
    current.DepID = current.DepID || row.DepID
    current.DepName = current.DepName || row.DepName
    current.UserID = mergeCommaText(current.UserID, row.UserID)
    current.UserName = mergeCommaText(current.UserName, row.UserName)
  })

  return Array.from(rowMap.values())
}

async function getUserJobAssignmentsByJobId(jobId: string) {
  const normalizedJobId = normalizeText(jobId)
  if (!normalizedJobId) {
    return [] as OrganizationJobUserAssignmentRecord[]
  }

  const table = createUserJobTable('rowid')
  table.Filter = cond('JobID', 'equal', normalizedJobId)
  const list = await queryAllRecords(table)

  return list.map((item) => normalizeJobUserAssignmentRecord(item))
}

async function getJobByRowid(rowid: string) {
  const normalizedRowid = normalizeText(rowid)
  if (!normalizedRowid) {
    return null
  }

  const table = createJobTable('rowid')
  table.Filter = cond('rowid', 'equal', normalizedRowid)
  const list = await queryAllRecords(table)
  return list.map((item) => normalizeJobRecord(item))[0] || null
}

async function getMainJobAssignmentsByUserIds(userIds: string[]) {
  const normalizedIds = Array.from(new Set(userIds.map((item) => normalizeText(item)).filter(Boolean)))
  if (normalizedIds.length === 0) {
    return [] as OrganizationJobUserAssignmentRecord[]
  }

  const table = createUserJobTable('rowid')
  table.Filter = and(
    cond('UserID', 'in', normalizedIds),
    cond('JobType', 'equal', 0)
  )

  const list = await queryAllRecords(table)
  return list.map((item) => normalizeJobUserAssignmentRecord(item))
}

async function getCodeString(seed: string, templateId: string) {
  const response = await requestClient.get(`${baseApiUrl}Codeing/GetCodeString/${seed}/${templateId}`, {
    responseReturn: 'raw'
  } as any)

  return response.data.message || response.data.Message || '';
}

async function getDepartmentByRowid(rowid: string) {
  const normalizedRowid = normalizeText(rowid)
  if (!normalizedRowid) {
    return null
  }

  const table = createDepartmentTable('rowid')
  table.Filter = cond('rowid', 'equal', normalizedRowid)
  const list = await queryAllRecords(table)

  return list.map((item) => normalizeDepartmentRecord(item))[0] || null
}

async function getJobByIdentity(row: OrganizationJobListRow) {
  const normalizedId = normalizeText(row.ID)
  const normalizedRowid = normalizeText(row.rowid)
  const normalizedJobCode = normalizeText(row.JobCode)
  const normalizedJobName = normalizeText(row.JobName)
  const normalizedDepId = normalizeText(row.DepID)

  const findOne = async (filter: any) => {
    const table = createJobTable('rowid')
    table.Filter = filter
    const list = await queryAllRecords(table)
    return list.map((item) => normalizeJobRecord(item))[0] || null
  }

  if (normalizedId) {
    const matchedById = await findOne(cond('ID', 'equal', normalizedId))
    if (matchedById) {
      return matchedById
    }
  }

  if (normalizedRowid) {
    const matchedByRowid = await findOne(cond('rowid', 'equal', normalizedRowid))
    if (matchedByRowid) {
      return matchedByRowid
    }
  }

  if (normalizedJobCode) {
    const matchedByCode = await findOne(or(
      cond('JobCode', 'equal', normalizedJobCode),
      cond('rowid', 'equal', normalizedJobCode)
    ))
    if (matchedByCode) {
      return matchedByCode
    }
  }

  if (normalizedJobName && normalizedDepId) {
    return findOne(and(
      cond('Depid', 'equal', normalizedDepId),
      cond('JobName', 'equal', normalizedJobName)
    ))
  }

  return null
}

/**
 * 获取全部部门记录，并按排序字段和名称稳定排序。
 */
export async function getDepartmentList() {
  const table = createDepartmentTable('rowid')
  const list = await queryAllRecords(table)
  return {
    list: sortDepartmentRecords(list.map((item) => normalizeDepartmentRecord(item))),
    dataTable: table
  } as OrganizationDepartmentListResult
}

/**
 * 通过 DepID 获取单个部门。
 */
export async function getDepartmentById(depId: string) {
  const normalizedDepId = normalizeText(depId)
  if (!normalizedDepId) {
    return null
  }

  const table = createDepartmentTable('rowid')
  table.Filter = cond('DepID', 'equal', normalizedDepId)
  const list = await queryAllRecords(table)

  return list.map((item) => normalizeDepartmentRecord(item))[0] || null
}

/**
 * 获取部门类型字典，供新增和编辑弹窗使用。
 */
export async function getDepartmentTypeOptions() {
  const table = createDictTable(DEPARTMENT_TYPE_DICT, DEPARTMENT_TYPE_DICT_DB)
  const response = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response).map((item: any) => normalizeDictOption(item))
}

/**
 * 获取岗位类型字典，供右侧列表展示岗位类型文本。
 */
export async function getJobTypeOptions() {
  const table = createDictTable(JOB_TYPE_DICT, JOB_TYPE_DICT_DB)
  const response = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response).map((item: any) => normalizeDictOption(item))
}

/**
 * 获取人员岗位类型字典，供人员设置弹层编辑使用。
 */
export async function getUserJobTypeOptions() {
  const table = createDictTable(USER_JOB_TYPE_DICT, USER_JOB_TYPE_DICT_DB)
  const response = await requestClient.post(table.queryUrl, { Table: [table] }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response).map((item: any) => normalizeDictOption(item))
}

/**
 * 查询当前部门下的岗位及岗位人员视图数据。
 */
export async function getDepartmentJobList(depId: string) {
  const normalizedDepId = normalizeText(depId)
  if (!normalizedDepId) {
    return {
      list: [] as OrganizationJobListRow[],
      dataTable: null
    } as OrganizationDepartmentJobListResult
  }

  // 视图关联人员数据（优先，原来就靠它查）
  const viewTable = createDepartmentJobUserViewTable()
  viewTable.Filter = cond('DepID', 'equal', normalizedDepId)
  let viewList = await queryAllRecords(viewTable)

  // 岗位表直接查，补充视图可能漏掉的无人员新岗位
  const jobTable = createJobTable('ID')
  jobTable.Filter = cond('Depid', 'equal', normalizedDepId)
  const jobResponse = await requestClient.post(jobTable.queryUrl, {
    Table: [jobTable],
    PageParam: { page: 9999, index: 1 }
  }, {
    headers: jobTable.getRequestHeader(), responseReturn: 'raw'
  })
  jobTable.execQueryResult(jobResponse)
  const jobList = getResultItems(jobResponse)

  // 如果视图为空，从 Base_User_DJ 表直接查询人员数据
  if (viewList.length === 0 && jobList.length > 0) {
    const userJobTable = createUserJobTable('rowid')
    userJobTable.Filter = or(
      cond('DepID', 'equal', normalizedDepId),
      cond('DepID', 'isnull', null),
      cond('DepID', 'equal', '')
    )
    const userJobResponse = await requestClient.post(userJobTable.queryUrl, {
      Table: [userJobTable],
      PageParam: { page: 9999, index: 1 }
    }, {
      headers: userJobTable.getRequestHeader(), responseReturn: 'raw'
    })
    userJobTable.execQueryResult(userJobResponse)
    const userJobList = getResultItems(userJobResponse)

    // 将人员数据合并到岗位数据中
    const jobUserMap = new Map<string, string[]>()
    userJobList.forEach((uj: any) => {
      const jobId = normalizeText(uj.JobID || uj.JobId)
      const userId = normalizeText(uj.UserID)
      if (jobId && userId) {
        if (!jobUserMap.has(jobId)) jobUserMap.set(jobId, [])
        if (!jobUserMap.get(jobId)!.includes(userId)) {
          jobUserMap.get(jobId)!.push(userId)
        }
      }
    })

    // 为每个岗位生成包含人员数据的视图行
    viewList = jobList.map((job: any) => ({
      ...job,
      JobId: normalizeText(job.ID || job.rowid),
      UserID: (jobUserMap.get(normalizeText(job.ID || job.rowid)) || []).join(','),
    }))
  }

  // 合并：视图中有数据的岗位优先取视图行，无人员的岗位用岗位表补充
  const viewKeySet = new Set(viewList.map((v: any) => normalizeText(v.JobId || v.JobID || v.ID || v.rowid)))
  const extraJobs = jobList.filter((j: any) => !viewKeySet.has(normalizeText(j.ID || j.rowid)))
  const allRows = [
    ...viewList.map((item) => normalizeJobListRow(item)),
    ...extraJobs.map((item) => normalizeJobListRow(item)),
  ]

  return {
    list: mergeJobRows(allRows),
    dataTable: viewTable
  } as OrganizationDepartmentJobListResult
}

/**
 * 查询人员设置弹层的岗位人员明细。
 */
export async function getJobUserSettings(params: { depId: string; jobId: string }) {
  const depId = normalizeText(params.depId)
  const jobId = normalizeText(params.jobId)
  if (!depId || !jobId) {
    return [] as OrganizationJobUserSettingRecord[]
  }

  const table = createUserJobTable('rowid')
  table.Filter = and(
    cond('DepID', 'equal', depId),
    cond('JobID', 'equal', jobId)
  )

  const list = await queryAllRecords(table)
  // 按 UserID 去重，保留每条 UserID 的第一条记录
  const seen = new Set<string>()
  return list.map((item) => normalizeJobUserSettingRecord(item)).filter((item) => {
    const uid = normalizeText(item.UserID)
    if (!uid || seen.has(uid)) return false
    seen.add(uid)
    return true
  })
}

/**
 * 查询岗位总职责，按 Base_JobInfo.rowid 读取 JobDuty。
 */
export async function getJobDutyByRowid(jobRowid: string) {
  const record = await getJobByRowid(jobRowid)
  return normalizeText(record?.JobDuty)
}

/**
 * 新增部门，新增成功后再调用编码接口补齐 DepID 和 CSR。
 */
export async function createDepartment(payload: CreateDepartmentPayload) {
  const parentDepartment = payload.parentDepartment
  const rowid = GetNewGUID()
  const parentLevel = normalizeNumber(parentDepartment.DepLevel || parentDepartment.DepLevelCode)
  const nextLevel = parentLevel + 1
  const departmentTable = createDepartmentTable('rowid')

  await saveTable(departmentTable, [{
    rowid,
    DepName: normalizeText(payload.depName),
    DepShortName: normalizeText(payload.depShortName),
    DepCode: normalizeText(payload.depCode),
    DepLevelCode: String(nextLevel),
    DepLevel: nextLevel,
    IsTrue: normalizeNumber(payload.isTrue),
    EnterpriseID: normalizeText(payload.enterpriseId),
    DepType: 'F',
    Prowid: normalizeText(parentDepartment.DepID),
    zwSCR: joinPath(parentDepartment.zwSCR, payload.depName)
  }], [], [])

  const depId = await getCodeString(rowid, DEPARTMENT_CODE_TEMPLATE_ID)
  if (!depId) {
    throw new Error('部门编码生成失败')
  }

  await saveTable(departmentTable, [], [{
    rowid,
    DepID: depId,
    CSR: joinPath(parentDepartment.CSR, depId)
  }], [])

  return {
    rowid,
    depId,
    record: await getDepartmentByRowid(rowid)
  }
}

/**
 * 更新部门基础信息。
 */
export async function updateDepartment(payload: UpdateDepartmentPayload) {
  const table = createDepartmentTable('rowid')

  await saveTable(table, [], [{
    rowid: normalizeText(payload.rowid),
    DepName: normalizeText(payload.depName),
    DepShortName: normalizeText(payload.depShortName),
    DepCode: normalizeText(payload.depCode),
    IsTrue: normalizeNumber(payload.isTrue)
  }], [])
}

export async function moveDepartment(payload: MoveDepartmentPayload) {
  const changedRows = buildMoveDepartmentChangedRows(payload)
  if (changedRows.length === 0) {
    return {
      changedCount: 0
    }
  }

  const table = createDepartmentTable('rowid')
  await saveTable(table, [], changedRows, [])

  return {
    changedCount: changedRows.length
  }
}

/**
 * 删除部门记录。
 */
export async function deleteDepartment(rowid: string) {
  const normalizedRowid = normalizeText(rowid)
  if (!normalizedRowid) {
    throw new Error('缺少部门主键')
  }

  const table = createDepartmentTable('rowid')
  await saveTable(table, [], [], [{ rowid: normalizedRowid }])
}

/**
 * 新增岗位，先新增种子记录，再通过编码接口回写 JobCode 和 rowid。
 */
export async function createJob(payload: CreateJobPayload) {
  const seedId = GetNewGUID()
  const department = payload.department
  const saveTableInstance = createJobTable('ID')

  await saveTable(saveTableInstance, [{
    ID: seedId,
    JobName: normalizeText(payload.jobName),
    jobExpNum: normalizeNumber(payload.jobExpNum),
    JobDuty: normalizeText(payload.jobDuty),
    JobType: 1,
    DepLevelCode: normalizeText(department.DepLevelCode),
    DepLevel: normalizeNumber(department.DepLevel || department.DepLevelCode),
    Depid: normalizeText(department.DepID),
    DepName: normalizeText(department.DepName)
  }], [], [])

  const jobCode = await getCodeString(seedId, JOB_CODE_TEMPLATE_ID)
  if (!jobCode) {
    throw new Error('岗位编码生成失败')
  }

  await saveTable(saveTableInstance, [], [{
    ID: seedId,
    JobCode: jobCode,
    rowid: jobCode
  }], [])

  return {
    seedId,
    jobCode
  }
}

/**
 * 删除岗位记录，优先使用视图中的 ID，缺失时再回表解析。
 */
export async function deleteJob(row: OrganizationJobListRow) {
  const matchedJob = normalizeText(row.ID) ? normalizeJobRecord(row) : await getJobByIdentity(row)
  const jobType = normalizeNumber(matchedJob?.JobType ?? row.JobType ?? matchedJob?.raw?.JobType ?? row.raw?.JobType)
  if (jobType !== 1) {
    throw new Error('只能删除专属岗位')
  }

  const targetId = normalizeText(matchedJob?.ID)
  if (!targetId) {
    throw new Error('未找到可删除的岗位主键')
  }

  const table = createJobTable('ID')
  await saveTable(table, [], [], [{ ID: targetId }])
}

/**
 * 保存岗位人员关系：以当前列表行的旧值为基准，拆分出新增和删除后写入 Base_User_DJ。
 */
export async function saveJobUserAssignments(payload: SaveJobUserAssignmentsPayload) {
  const row = payload.row
  const jobId = normalizeText(row.JobId || row.raw?.JobId || row.raw?.JobID || row.ID || row.raw?.ID || row.rowid || row.raw?.rowid)
  if (!jobId) {
    throw new Error('当前岗位缺少 JobId，无法保存人员关系')
  }

  const previousUsers = normalizePersonValueList(payload.previousUsers)
  const nextUsers = normalizePersonValueList(payload.nextUsers)
  const previousUserIdSet = new Set(previousUsers.map((item) => item.UserId))
  const nextUserIdSet = new Set(nextUsers.map((item) => item.UserId))

  const addedUsers = nextUsers.filter((item) => !previousUserIdSet.has(item.UserId))
  const removedUserIdSet = new Set(previousUsers.filter((item) => !nextUserIdSet.has(item.UserId)).map((item) => item.UserId))

  const existingAssignments = await getUserJobAssignmentsByJobId(jobId)
  const deletedRecords = existingAssignments
    .filter((item) => removedUserIdSet.has(normalizeText(item.UserID)) || removedUserIdSet.has(normalizeText(item.rowid)))
    .map((item) => ({ rowid: item.rowid }))

  const mainAssignments = await getMainJobAssignmentsByUserIds(addedUsers.map((item) => item.UserId))
  const mainAssignmentUserIdSet = new Set(mainAssignments.map((item) => item.UserID).filter(Boolean))
  const depId = normalizeText(row.DepID)
  const depName = normalizeText(row.DepName)
  const jobName = normalizeText(row.JobName)
  const addedRecords = addedUsers.map((item) => ({
    DJID: jobId,
    JobID: jobId,
    DepID: depId,
    DepName: depName,
    JobName: jobName,
    Memo: '',
    UserID: item.UserId,
    UserName: item.UserName,
    JobType: mainAssignmentUserIdSet.has(item.UserId) ? 2 : 0,
    IsWork: 1
  }))

  if (addedRecords.length === 0 && deletedRecords.length === 0) {
    return {
      addedCount: 0,
      deletedCount: 0
    }
  }

  const table = createUserJobTable('rowid')
  const result = await saveTable(table, addedRecords, [], deletedRecords)

  const serverAdded = Number(Array.isArray(result?.mapListAdd) ? result.mapListAdd.length : (result?.addedCount ?? result?.AddedCount ?? result?.insertCount ?? result?.InsertCount))
  const serverDeleted = Number(Array.isArray(result?.mapListDelete) ? result.mapListDelete.length : (result?.deletedCount ?? result?.DeletedCount ?? result?.deleteCount ?? result?.DeleteCount))

  return {
    addedCount: Number.isFinite(serverAdded) ? serverAdded : addedRecords.length,
    deletedCount: Number.isFinite(serverDeleted) ? serverDeleted : deletedRecords.length
  }
}
export async function saveJobUserSettings(payload: SaveJobUserSettingsPayload) {
  const changedRows = (Array.isArray(payload.rows) ? payload.rows : [])
    .map((item) => ({
      rowid: normalizeText(item.rowid),
      JobType: normalizeText(item.JobType),
      IsWork: normalizeNumber(item.IsWork),
      JobRespon: normalizeText(item.JobRespon),
      Memo: normalizeText(item.Memo)
    }))
    .filter((item) => item.rowid)

  if (changedRows.length === 0) {
    return {
      changedCount: 0
    }
  }

  const table = createUserJobTable('rowid')
  const result = await saveTable(table, [], changedRows, [])

  const serverChanged = Number(result?.changedCount ?? result?.ChangedCount ?? result?.updateCount ?? result?.UpdateCount)

  return {
    changedCount: Number.isFinite(serverChanged) ? serverChanged : changedRows.length
  }
}

export {
  ROOT_PARENT_ID,
  getJobByIdentity,
  splitCommaText
}

export default {
  ROOT_PARENT_ID,
  getDepartmentList,
  getDepartmentById,
  getDepartmentTypeOptions,
  getJobTypeOptions,
  getUserJobTypeOptions,
  getDepartmentJobList,
  getJobUserSettings,
  getJobDutyByRowid,
  createDepartment,
  updateDepartment,
  moveDepartment,
  deleteDepartment,
  createJob,
  deleteJob,
  saveJobUserAssignments,
  saveJobUserSettings,
  splitCommaText
}
