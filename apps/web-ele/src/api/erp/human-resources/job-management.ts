/**
 * 岗位管理页面 API。
 * 统一使用 datatable 访问岗位、部门和字典数据。
 */

import { DataTable, GetNewGUID, and, baseApiUrl, cond } from '#/api/qyapi'
import { requestClient } from '#/api/request'

const MODEL_ID = '2ED292CBED7B28C8541CF4F3E852A4A2'
const DB_NAME = 'QYVirtualPlat'

const JOB_TABLE = 'Base_JobInfo'
const DEPARTMENT_TABLE = 'Base_DepartInfo'

const DEPARTMENT_LEVEL_DICT = 'pt_depRank'
const DEPARTMENT_LEVEL_DICT_DB = '73DF4A3A4551560A6F73E7400C054BFA'
const JOB_TYPE_DICT = 'ISExclusiveJob'
const JOB_TYPE_DICT_DB = 'DE84A2EB759942859BD288527832496B'

const JOB_CODE_TEMPLATE_ID = 'E42081AAE5F196E37991D63D53C0B7BE'

export interface JobManagementDictOption {
  label: string
  value: string
  raw: any
}

export interface JobManagementDepartmentOption {
  label: string
  value: string
  depName: string
  raw: any
}

export interface JobManagementJobRecord {
  ID: string
  rowid: string
  JobCode: string
  JobName: string
  JobType: string
  Depid: string
  DepName: string
  jobExpNum: number
  JobDuty: string
  DepLevelCode: string
  DepLevel: string
  raw: any
}

export interface JobManagementPageQuery {
  depLevelCode: string
  pageNo?: number
  pageSize?: number
  jobName?: string
  jobType?: string
  depId?: string
}

export interface JobManagementPageResult {
  list: JobManagementJobRecord[]
  total: number
  dataTable: DataTable | null
}

export interface SaveJobManagementPayload {
  depLevelCode: string
  depLevel: string
  jobName: string
  jobExpNum: number
  jobDuty: string
  jobType: string
  depId?: string
  depName?: string
}

export interface UpdateJobManagementPayload extends SaveJobManagementPayload {
  ID: string
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

function createTable(tableName: string, dbName = DB_NAME, primaryKey = 'rowid') {
  return new DataTable(MODEL_ID, tableName, dbName, primaryKey)
}

function createJobTable(primaryKey = 'ID') {
  return createTable(JOB_TABLE, DB_NAME, primaryKey)
}

function createDepartmentTable(primaryKey = 'DepID') {
  return createTable(DEPARTMENT_TABLE, DB_NAME, primaryKey)
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

function normalizeDictOption(item: any): JobManagementDictOption {
  return {
    label: normalizeTextByKeys(item, ['txt', 'Text', 'label', 'Label']),
    value: normalizeTextByKeys(item, ['val', 'Value', 'value']),
    raw: item
  }
}

function normalizeDepartmentOption(item: any): JobManagementDepartmentOption {
  const label = normalizeTextByKeys(item, ['zwSCR', 'ZwSCR', 'zwscr']) || normalizeTextByKeys(item, ['DepName', 'depName'])

  return {
    label,
    value: normalizeTextByKeys(item, ['DepID', 'DepId', 'depid']),
    depName: normalizeTextByKeys(item, ['DepName', 'depName']),
    raw: item
  }
}

function normalizeJobRecord(item: any): JobManagementJobRecord {
  return {
    ID: normalizeTextByKeys(item, ['ID', 'Id', 'id']),
    rowid: normalizeTextByKeys(item, ['rowid', 'ROWID', 'RowID', 'rowId']),
    JobCode: normalizeTextByKeys(item, ['JobCode', 'jobCode']),
    JobName: normalizeTextByKeys(item, ['JobName', 'jobName']),
    JobType: normalizeText(pickFirstValue(item, ['JobType', 'jobType', 'IsExclusive', 'isExclusive'])),
    Depid: normalizeTextByKeys(item, ['Depid', 'DepID', 'DepId', 'depid']),
    DepName: normalizeTextByKeys(item, ['DepName', 'depName']),
    jobExpNum: normalizeNumber(pickFirstValue(item, ['jobExpNum', 'JobExpNum'])),
    JobDuty: normalizeTextByKeys(item, ['JobDuty', 'jobDuty']),
    DepLevelCode: normalizeTextByKeys(item, ['DepLevelCode', 'depLevelCode']),
    DepLevel: normalizeText(pickFirstValue(item, ['DepLevel', 'depLevel'])),
    raw: item
  }
}

function compareDictOption(left: JobManagementDictOption, right: JobManagementDictOption) {
  const leftValue = Number(left.value)
  const rightValue = Number(right.value)
  const leftIsNumber = Number.isFinite(leftValue)
  const rightIsNumber = Number.isFinite(rightValue)

  if (leftIsNumber && rightIsNumber && leftValue !== rightValue) {
    return leftValue - rightValue
  }

  return normalizeText(left.label).localeCompare(normalizeText(right.label), 'zh-CN')
}

function compareDepartmentOption(left: JobManagementDepartmentOption, right: JobManagementDepartmentOption) {
  return normalizeText(left.label).localeCompare(normalizeText(right.label), 'zh-CN')
}

function createJobSaveRecord(payload: SaveJobManagementPayload, id: string) {
  return {
    ID: normalizeText(id),
    JobName: normalizeText(payload.jobName),
    jobExpNum: normalizeNumber(payload.jobExpNum),
    JobDuty: normalizeText(payload.jobDuty),
    JobType: normalizeText(payload.jobType),
    Depid: normalizeText(payload.depId),
    DepName: normalizeText(payload.depName),
    DepLevelCode: normalizeText(payload.depLevelCode),
    DepLevel: normalizeText(payload.depLevel)
  }
}

/**
 * 获取左侧部门级别列表。
 */
export async function getDepartmentLevelOptions() {
  const table = createDictTable(DEPARTMENT_LEVEL_DICT, DEPARTMENT_LEVEL_DICT_DB)
  const response = await requestClient.post(table.queryUrl, {
    Table: [table]
  }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response)
    .map((item: any) => normalizeDictOption(item))
    .sort(compareDictOption)
}

/**
 * 获取岗位类别字典。
 */
export async function getJobTypeOptions() {
  const table = createDictTable(JOB_TYPE_DICT, JOB_TYPE_DICT_DB)
  const response = await requestClient.post(table.queryUrl, {
    Table: [table]
  }, {
    headers: table.getRequestHeader(), responseReturn: 'raw'
  })

  table.execQueryResult(response)
  return getResultItems(response)
    .map((item: any) => normalizeDictOption(item))
    .sort(compareDictOption)
}

/**
 * 按当前部门级别获取所属部门选项，显示完整部门路径 zwSCR。
 */
export async function getDepartmentOptionsByLevel(depLevelCode: string) {
  const normalizedLevelCode = normalizeText(depLevelCode)
  if (!normalizedLevelCode) {
    return [] as JobManagementDepartmentOption[]
  }

  const table = createDepartmentTable('DepID')
  table.Filter = cond('DepLevelCode', 'equal', normalizedLevelCode)
  let list = await queryAllRecords(table)

  // 按级别查不到时，回退到查全部部门
  if (list.length === 0) {
    const allTable = createDepartmentTable('DepID')
    list = await queryAllRecords(allTable)
  }

  return list
    .map((item) => normalizeDepartmentOption(item))
    .filter((item) => item.value)
    .sort(compareDepartmentOption)
}

/**
 * 按部门级别分页查询岗位列表。
 */
export async function queryJobPage(params: JobManagementPageQuery): Promise<JobManagementPageResult> {
  const depLevelCode = normalizeText(params.depLevelCode)
  if (!depLevelCode) {
    return {
      list: [],
      total: 0,
      dataTable: null
    }
  }

  const table = createJobTable('ID')
  table.Filter = buildAndFilter([
    cond('DepLevelCode', 'equal', depLevelCode),
    normalizeText(params.jobName) ? cond('JobName', 'contains', normalizeText(params.jobName)) : null,
    normalizeText(params.jobType) ? cond('JobType', 'equal', normalizeText(params.jobType)) : null,
    normalizeText(params.depId) ? cond('Depid', 'equal', normalizeText(params.depId)) : null
  ])

  const result = await queryPage(table, normalizeNumber(params.pageNo) || 1, normalizeNumber(params.pageSize) || 20)
  return {
    list: result.list.map((item) => normalizeJobRecord(item)),
    total: result.total,
    dataTable: result.dataTable || null
  }
}

/**
 * 新增岗位，先写入种子记录，再通过编码接口回写 JobCode 和 rowid。
 */
export async function createJob(payload: SaveJobManagementPayload) {
  const seedId = GetNewGUID()
  const table = createJobTable('ID')

  await saveTable(table, [createJobSaveRecord(payload, seedId)], [], [])

  const jobCode = await getCodeString(seedId, JOB_CODE_TEMPLATE_ID)
  if (!jobCode) {
    throw new Error('岗位编码生成失败')
  }

  await saveTable(table, [], [{
    ID: seedId,
    JobCode: jobCode,
    rowid: jobCode
  }], [])

  return {
    ID: seedId,
    JobCode: jobCode
  }
}

/**
 * 更新岗位基础信息。
 */
export async function updateJob(payload: UpdateJobManagementPayload) {
  const id = normalizeText(payload.ID)
  if (!id) {
    throw new Error('缺少岗位主键')
  }

  const table = createJobTable('ID')
  await saveTable(table, [], [createJobSaveRecord(payload, id)], [])
}

/**
 * 按 ID 删除岗位。
 */
export async function deleteJob(id: string) {
  const normalizedId = normalizeText(id)
  if (!normalizedId) {
    throw new Error('缺少岗位主键')
  }

  const table = createJobTable('ID')
  await saveTable(table, [], [], [{ ID: normalizedId }])
}


// 兼容迁移页面命名：src/views/hr/**/jobManage/index.vue
export type JobManagementRecord = JobManagementJobRecord
export const getJobDepartmentLevelOptions = getDepartmentLevelOptions
export const getJobDepartmentOptions = getDepartmentOptionsByLevel
export const getJobManagementPage = queryJobPage
export const createJobManagementJob = createJob
export const updateJobManagementJob = updateJob
export const deleteJobManagementJob = deleteJob

export default {
  getDepartmentLevelOptions,
  getJobTypeOptions,
  getDepartmentOptionsByLevel,
  queryJobPage,
  createJob,
  updateJob,
  deleteJob
}