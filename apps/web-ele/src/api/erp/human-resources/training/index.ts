import { and, cond, DataColumn, DataTable, or } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { newGuid, querySalaryTable, saveSalaryTable } from '#/api/erp/human-resources/salary/shared';

const DB_NAME = 'LMBill';
const FORM_ID = 'FE35A6353A0511F19FF2868C42717AB9';
const COURSE_TABLE = 'Bil_HR_Training_Course';
const EVALUATION_TABLE = 'Bil_HR_Training_Evaluation';
const GAP_ANALYSIS_TABLE = 'Bil_HR_Training_Gap_Analysis';
const PLAN_TABLE = 'Bil_HR_Training_Plan';

export type HrTrainingTable =
  | 'Bil_HR_Training_Course'
  | 'Bil_HR_Training_Evaluation'
  | 'Bil_HR_Training_Competency'
  | 'Bil_HR_Training_Gap_Analysis'
  | 'Bil_HR_Training_Plan'
  | 'Bil_HR_Training_Roadmap';

export interface HrTrainingQuery {
  keyword?: string;
  status?: string;
  index?: number;
  page?: number;
}

export interface TrainingCompetencyPayload {
  competencyCode?: string;
  competencyName?: string;
  description?: string;
  id?: string;
  requiredLevel?: string;
  rowid?: string;
  status?: string;
  targetJobName?: string;
  targetJobNameDepName?: string;
}

export interface TrainingPlanPayload {
  content?: string;
  description?: string;
  employeeName?: string;
  employeeNameDepName?: string;
  endTime?: string;
  id?: string | number;
  planCode?: string;
  planName?: string;
  startTime?: string;
  status?: string;
}

export interface TrainingGapAnalysisPayload {
  analysisSummary?: string;
  description?: string;
  employeeName?: string;
  gapCode?: string;
  gapLevel?: string;
  id?: string | number;
  status?: string;
  targetCompetency?: string;
}

function getItems(res: any) {
  const resultData = res?.data?.Result?.data || res?.data?.Result || res?.data;
  if (Array.isArray(resultData?.Items)) return resultData.Items as any[];
  if (Array.isArray(resultData?.items)) return resultData.items as any[];
  if (Array.isArray(resultData)) return resultData as any[];
  return [];
}

function setQueryFields(table: DataTable, names: string[]) {
  table.Fields = names.map((name) => {
    const column = new DataColumn();
    column.Name = name;
    return column;
  });
}

const TRAINING_TABLE_FIELDS: Record<HrTrainingTable, string[]> = {
  'Bil_HR_Training_Course': [
    'id', 'courseCode', 'courseName', 'category', 'trainerName', 'courseHours',
    'publishTime', 'status', 'remark', 'updateTime', 'lingma_sys_ent',
    'createuser', 'createtime', 'updateuser', 'wfid', 'flowstate', 'ReportID',
    'description', 'lingma_sys_is_delete', 'source_system', 'source_table',
    'source_id', 'migration_batch_no',
  ],
  'Bil_HR_Training_Evaluation': [
    'id', 'evaluationCode', 'courseName', 'employeeName', 'employeeNameId',
    'employeeNameDepId', 'employeeNameDepName', 'departmentName', 'score',
    'evaluateTime', 'status', 'summary', 'updateTime', 'lingma_sys_ent',
    'createuser', 'createtime', 'updateuser', 'wfid', 'flowstate', 'ReportID',
    'description', 'lingma_sys_is_delete', 'source_system', 'source_table',
    'source_id', 'migration_batch_no',
  ],
  'Bil_HR_Training_Competency': [
    'id', 'competencyCode', 'competencyName', 'status', 'requiredLevel',
    'targetJobName', 'targetJobNameDepName',
    'updateTime', 'lingma_sys_ent', 'createuser', 'createtime', 'updateuser',
    'wfid', 'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete',
    'source_system', 'source_table', 'source_id', 'migration_batch_no',
  ],
  'Bil_HR_Training_Gap_Analysis': [
    'id', 'gapCode', 'employeeName', 'targetCompetency', 'status', 'gapLevel',
    'analysisSummary', 'updateTime', 'lingma_sys_ent', 'createuser',
    'createtime', 'updateuser', 'wfid', 'flowstate', 'ReportID',
    'description', 'lingma_sys_is_delete', 'source_system', 'source_table',
    'source_id', 'migration_batch_no',
  ],
  'Bil_HR_Training_Plan': [
    'id', 'planCode', 'planName', 'employeeName', 'employeeNameId',
    'employeeNameDepId', 'employeeNameDepName', 'startTime', 'endTime',
    'status', 'content', 'updateTime', 'lingma_sys_ent', 'createuser',
    'createtime', 'updateuser', 'wfid', 'flowstate', 'ReportID',
    'description', 'lingma_sys_is_delete', 'source_system', 'source_table',
    'source_id', 'migration_batch_no',
  ],
  'Bil_HR_Training_Roadmap': [
    'id', 'roadmapCode', 'roadmapName', 'status', 'stageCount', 'updateTime',
    'lingma_sys_ent', 'createuser', 'createtime', 'updateuser', 'wfid',
    'flowstate', 'ReportID', 'description', 'lingma_sys_is_delete',
    'source_system', 'source_table', 'source_id', 'migration_batch_no',
  ],
};

export async function getTrainingList(tableName: HrTrainingTable, params: HrTrainingQuery = {}) {
  const table = new DataTable(FORM_ID, tableName, DB_NAME, 'id');
  setQueryFields(table, TRAINING_TABLE_FIELDS[tableName]);
  const filters: any[] = [];
  if (params.status && params.status !== 'all') filters.push(cond('status', 'equal', params.status));
  if (params.keyword) {
    filters.push(or(
      cond('courseName', 'contains', params.keyword),
      cond('employeeName', 'contains', params.keyword),
      cond('targetCompetency', 'contains', params.keyword),
      cond('competencyName', 'contains', params.keyword),
      cond('targetJobName', 'contains', params.keyword),
      cond('planName', 'contains', params.keyword),
      cond('roadmapName', 'contains', params.keyword),
    ) as any);
  }
  if (filters.length) table.Filter = and(...filters);
  const res = await requestClient.post(
    table.queryUrl,
    { Table: [table], PageParam: { index: params.index || 1, size: params.page || 20 } },
    { headers: table.getRequestHeader(), responseReturn: 'raw' },
  );
  table.execQueryResult(res);
  return { dataTable: table, list: table.items };
}

const COURSE_FIELDS = TRAINING_TABLE_FIELDS['Bil_HR_Training_Course'];
const EVALUATION_FIELDS = TRAINING_TABLE_FIELDS['Bil_HR_Training_Evaluation'];
const GAP_ANALYSIS_FIELDS = TRAINING_TABLE_FIELDS['Bil_HR_Training_Gap_Analysis'];
const PLAN_FIELDS = TRAINING_TABLE_FIELDS['Bil_HR_Training_Plan'];

export async function createTrainingCourse(payload: any) {
  const table = new DataTable(FORM_ID, COURSE_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, COURSE_FIELDS);
  const row = { id: newGuid(), ...payload };
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);
  return row;
}

export async function updateTrainingCourse(id: string, payload: any) {
  const table = new DataTable(FORM_ID, COURSE_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, COURSE_FIELDS);
  const patch = { id, ...payload };
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteTrainingCourse(id: string) {
  const table = new DataTable(FORM_ID, COURSE_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, COURSE_FIELDS);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function createTrainingEvaluation(payload: any) {
  const table = new DataTable(FORM_ID, EVALUATION_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, EVALUATION_FIELDS);
  const row = { id: newGuid(), ...payload };
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);
  return row;
}

export async function updateTrainingEvaluation(id: string, payload: any) {
  const table = new DataTable(FORM_ID, EVALUATION_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, EVALUATION_FIELDS);
  const patch = { id, ...payload };
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteTrainingEvaluation(id: string) {
  const table = new DataTable(FORM_ID, EVALUATION_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, EVALUATION_FIELDS);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

function createNumericId() {
  return Number(`${Date.now()}`.slice(-9));
}

function createPlanCode() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `PLAN-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Date.now()).slice(-5)}`;
}

function createGapCode() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `GAP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Date.now()).slice(-5)}`;
}

function mysqlDateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${[
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':')}`;
}

function toMysqlDateTime(value?: string) {
  if (!value) return '';
  const normalized = String(value).replace('T', ' ').replace(/\.\d{3}Z$/, '');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 00:00:00`;
  return normalized;
}

function buildTrainingPlanPayload(data: TrainingPlanPayload, id?: string | number) {
  const payload: Record<string, any> = {
    ...(id !== undefined ? { id } : {}),
    planCode: data.planCode || createPlanCode(),
    planName: data.planName || '',
    employeeName: data.employeeName || '',
    employeeNameDepName: data.employeeNameDepName || '',
    status: data.status || '草稿',
    content: data.content || '',
    description: data.description || '',
    updateTime: mysqlDateTime(),
    lingma_sys_is_delete: 0,
  };
  const startTime = toMysqlDateTime(data.startTime);
  const endTime = toMysqlDateTime(data.endTime);
  if (startTime) payload.startTime = startTime;
  if (endTime) payload.endTime = endTime;
  return payload;
}

export async function createTrainingPlan(data: TrainingPlanPayload) {
  const table = new DataTable(FORM_ID, PLAN_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, PLAN_FIELDS);
  const row = buildTrainingPlanPayload(data, data.id || createNumericId());
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);
  return row;
}

export async function updateTrainingPlan(id: string | number, data: TrainingPlanPayload) {
  const table = new DataTable(FORM_ID, PLAN_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, PLAN_FIELDS);
  const patch = buildTrainingPlanPayload(data, id);
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteTrainingPlan(id: string | number) {
  const table = new DataTable(FORM_ID, PLAN_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, PLAN_FIELDS);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

function buildTrainingGapPayload(data: TrainingGapAnalysisPayload, id?: string | number) {
  return {
    ...(id !== undefined ? { id } : {}),
    gapCode: data.gapCode || createGapCode(),
    employeeName: data.employeeName || '',
    targetCompetency: data.targetCompetency || '',
    gapLevel: data.gapLevel || '中',
    status: data.status || '待分析',
    analysisSummary: data.analysisSummary || '',
    description: data.description || data.analysisSummary || '',
    updateTime: mysqlDateTime(),
    lingma_sys_is_delete: 0,
  };
}

export async function createTrainingGapAnalysis(data: TrainingGapAnalysisPayload) {
  const table = new DataTable(FORM_ID, GAP_ANALYSIS_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, GAP_ANALYSIS_FIELDS);
  const row = buildTrainingGapPayload(data, data.id || createNumericId());
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);
  return row;
}

export async function updateTrainingGapAnalysis(id: string | number, data: TrainingGapAnalysisPayload) {
  const table = new DataTable(FORM_ID, GAP_ANALYSIS_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, GAP_ANALYSIS_FIELDS);
  const patch = buildTrainingGapPayload(data, id);
  const res = await saveSalaryTable(table, [], [patch], []);
  if (!res.success) throw new Error(res.error);
  return patch;
}

export async function deleteTrainingGapAnalysis(id: string | number) {
  const table = new DataTable(FORM_ID, GAP_ANALYSIS_TABLE, DB_NAME, 'id');
  await querySalaryTable(table, GAP_ANALYSIS_FIELDS);
  const res = await saveSalaryTable(table, [], [], [{ id }]);
  if (!res.success) throw new Error(res.error);
  return true;
}

export async function createTrainingCompetency(data: TrainingCompetencyPayload) {
  const table = new DataTable(FORM_ID, 'Bil_HR_Training_Competency', DB_NAME, 'id');
  const payload = {
    id: data.id || createNumericId(),
    competencyCode: data.competencyCode || '',
    competencyName: data.competencyName || '',
    targetJobName: data.targetJobName || '',
    targetJobNameDepName: data.targetJobNameDepName || '',
    requiredLevel: data.requiredLevel || 'L3',
    status: data.status || '启用',
    description: data.description || '',
    updateTime: mysqlDateTime(),
    lingma_sys_is_delete: 0,
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([payload], [], []), {
    headers: table.getRequestHeader(),
  });
}

export async function updateTrainingCompetency(data: TrainingCompetencyPayload) {
  const table = new DataTable(FORM_ID, 'Bil_HR_Training_Competency', DB_NAME, 'id');
  const payload = {
    id: data.id,
    competencyCode: data.competencyCode || '',
    competencyName: data.competencyName || '',
    targetJobName: data.targetJobName || '',
    targetJobNameDepName: data.targetJobNameDepName || '',
    requiredLevel: data.requiredLevel || 'L3',
    status: data.status || '启用',
    description: data.description || '',
    updateTime: mysqlDateTime(),
  };
  return requestClient.post(table.saveUrl, table.getSaveParam([], [payload], []), {
    headers: table.getRequestHeader(),
  });
}

export async function deleteTrainingCompetency(id: string | number) {
  const table = new DataTable(FORM_ID, 'Bil_HR_Training_Competency', DB_NAME, 'id');
  return requestClient.post(table.saveUrl, table.getSaveParam([], [], [{ id }]), {
    headers: table.getRequestHeader(),
  });
}
