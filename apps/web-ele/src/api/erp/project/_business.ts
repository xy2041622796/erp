import QB, { cond, DataTable } from '#/api/qyapi';
import { requestClient } from '#/api/request';
import { createProjectDataTable, getProjectAccountSetId } from './_account-set';

const DB_NAME = 'LMBill';
const PROJECT_MODEL_ID = '9b5g1c4d3e6f7a8b9c0d1e2f3a4b5c6d';
const PROJECT_TABLE = 'Bil_Project_Info';
const PROJECT_PK = 'rowid';
const PROJECT_MEMBER_FORM_ID = '0c6h2d5e4f7a8b9c0d1e2f3a4b5c6d7e';
const PROJECT_MEMBER_TABLE = 'project_members';
const PROJECT_MEMBER_PK = 'id';
const PROJECT_MEMBER_ENT = 'NewApp';
function appendAccountSetId<T extends Record<string, any>>(row: T): T {
  const accountSetId = getProjectAccountSetId();
  if (!accountSetId || row.account_set_id) return row;
  return { ...row, account_set_id: accountSetId };
}

const PROJECT_HEALTH_RULES = {
  redProgressVariance: -20,
  redCostUsageRate: 110,
  yellowDeliverableDoneRate: 80,
};

function generateId() {
  return QB.GetNewGUID();
}

function createTable(formKey: string, tableName: string, primaryKey = 'id') {
  return createProjectDataTable(formKey, tableName, DB_NAME, primaryKey);
}

function createProjectTable() {
  return createProjectDataTable(PROJECT_MODEL_ID, PROJECT_TABLE, DB_NAME, PROJECT_PK);
}

function createProjectMemberTable() {
  return createTable(PROJECT_MEMBER_FORM_ID, PROJECT_MEMBER_TABLE, PROJECT_MEMBER_PK);
}

function removeNilFields(row: Record<string, any>) {
  const next: Record<string, any> = {};
  for (const [key, value] of Object.entries(row || {})) {
    if (value === undefined || value === null) continue;
    if (key === 'member_code' && String(value).trim() === '') continue;
    next[key] = value;
  }
  return next;
}

function normalizeProjectMemberRow(row: Record<string, any>, omitNil = false) {
  const source = omitNil ? removeNilFields(row || {}) : { ...(row || {}) };
  return {
    ...appendAccountSetId(source),
    lingma_sys_ent: source?.lingma_sys_ent || PROJECT_MEMBER_ENT,
    lingma_sys_is_delete: Number(source?.lingma_sys_is_delete ?? 0),
  };
}

async function saveProjectMemberTable(adds: any[] = [], updates: any[] = [], deletes: any[] = []) {
  const table = createProjectMemberTable();
  return await saveTable(
    table,
    adds.map((row) => normalizeProjectMemberRow(row, true)),
    updates.map((row) => normalizeProjectMemberRow(row)),
    deletes,
  );
}

async function queryTable(table: DataTable, pageNo = 1, page = 0) {
  const queryParam: any = {
    Table: [table],
    PageParam: {
      page: page,
      index: pageNo,
    },
  };

  const resQuery = await requestClient.post(table.queryUrl, queryParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
  table.execQueryResult(resQuery);
  const resultData = resQuery.data?.Result?.data || resQuery.data?.Result || resQuery.data;
  const items = Array.isArray(resultData?.Items) ? resultData.Items : [];
  const total = Number(resultData?.Count || items.length || 0);
  return { table, items, total, raw: resQuery };
}

async function saveTable(table: DataTable, adds: any[] = [], updates: any[] = [], deletes: any[] = []) {
  const saveParam = table.getSaveParam(adds, updates, deletes);
  return await requestClient.post(table.saveUrl, saveParam, {
    headers: table.getRequestHeader(),
    responseReturn: 'raw',
  });
}

function toNumber(value: any, fallback = 0) {
  const num = Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
}

function clampProgress(value: any) {
  return Math.min(100, Math.max(0, Math.round(toNumber(value, 0))));
}

function normalizeDateOnly(value: any) {
  if (!value) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.includes('T') ? text.split('T')[0] : text.slice(0, 10);
}

function normalizeMemberCostRates(change: Record<string, any>) {
  const hour = toNumber(change?.cost_rate_hour, 0);
  const day = toNumber(change?.cost_rate_day, 0);
  if (hour > 0 && day > 0) throw new Error('小时成本和日成本只能填写一个');
  if (hour <= 0 && day <= 0) throw new Error('加入成员时请填写小时成本或日成本');
  return {
    cost_rate_hour: hour > 0 ? hour : null,
    cost_rate_day: day > 0 ? day : null,
  };
}

function getMonthText(value: any) {
  const date = normalizeDateOnly(value);
  return date ? date.slice(0, 7) : '';
}

type WorkdayRecalculateInput = string | {
  projectId: string;
  monthText?: string;
  userRowid?: string;
  force?: boolean;
};

function normalizeWorkdayRecalculateInput(input: WorkdayRecalculateInput, legacyMonthText?: string) {
  if (typeof input === 'string') {
    return {
      projectId: String(input || '').trim(),
      monthText: String(legacyMonthText || '').trim(),
      userRowid: '',
      force: false,
    };
  }
  return {
    projectId: String(input?.projectId || '').trim(),
    monthText: String(input?.monthText || '').trim(),
    userRowid: String(input?.userRowid || '').trim(),
    force: Boolean(input?.force),
  };
}

function getProjectMemberHourlyRate(member?: Record<string, any> | null) {
  if (!member) return 0;
  const hour = toNumber(member?.cost_rate_hour, 0);
  if (hour > 0) return hour;
  const day = toNumber(member?.cost_rate_day, 0);
  return day > 0 ? Number((day / 8).toFixed(2)) : 0;
}

function buildProjectMemberRateMap(rows: any[]) {
  const map = new Map<string, { member: any; hourlyRate: number }>();
  for (const row of rows || []) {
    const employeeId = String(row?.employee_id || '').trim();
    if (!employeeId) continue;
    map.set(employeeId, { member: row, hourlyRate: getProjectMemberHourlyRate(row) });
  }
  return map;
}

async function updateProjectFields(projectId: string, fields: Record<string, any>) {
  const rowid = String(projectId || '').trim();
  if (!rowid) return null;
  const projectTable = createProjectTable();
  projectTable.Filter = cond(PROJECT_PK, 'equal', rowid);
  await queryTable(projectTable, 1, 1);
  return await saveTable(projectTable, [], [{ ...fields, rowid }], []);
}

function getLeafWbsRows(rows: any[]) {
  const parentTaskIds = new Set(
    rows
      .map((item: any) => String(item?.parent_task_id || '').trim())
      .filter(Boolean),
  );
  const leafRows = rows.filter((item: any) => !parentTaskIds.has(String(item?.id || '').trim()));
  return leafRows.length ? leafRows : rows;
}

export async function recalculateProjectProgress(projectId: string) {
  const pid = String(projectId || '').trim();
  if (!pid) return null;

  const wbsTable = createTable('2e8j4f7a6b9c0d1e2f3a4b5c6d7e8f9g', 'project_progress', 'id');
  wbsTable.Filter = cond('project_id', 'equal', pid);
  const { items } = await queryTable(wbsTable, 1, 0);
  if (!items.length) {
    await updateProjectFields(pid, { progress: 0, project_status: 0 });
    return { progress: 0, status: 0, total: 0, leafTotal: 0 };
  }

  const progressSource = getLeafWbsRows(items);
  const progress = clampProgress(
    progressSource.reduce((sum: number, item: any) => sum + clampProgress(item?.progress), 0) / progressSource.length,
  );
  const statuses: string[] = progressSource.map((item: any) => String(item?.status || '').toLowerCase());
  let project_status: number | undefined;
  if (progressSource.every((item: any) => String(item?.status || '').toLowerCase() === 'completed' && clampProgress(item?.progress) >= 100)) {
    project_status = 2;
  } else if (statuses.some((status) => status === 'in_progress')) {
    project_status = 1;
  } else if (statuses.some((status) => status === 'paused')) {
    project_status = 3;
  } else if (statuses.every((status) => status === 'pending')) {
    project_status = 0;
  }

  await updateProjectFields(pid, {
    progress,
    ...(project_status === undefined ? {} : { project_status }),
  });
  return { progress, status: project_status, total: items.length, leafTotal: progressSource.length };
}

export async function syncReportProgressToProject(report: Record<string, any>) {
  const projectId = String(report?.project_id || '').trim();
  if (!projectId) throw new Error('缺少 project_id，无法同步项目进度');
  const wbsTable = createTable('2e8j4f7a6b9c0d1e2f3a4b5c6d7e8f9g', 'project_progress', 'id');
  wbsTable.Filter = cond('project_id', 'equal', projectId);
  const { items: wbsRows } = await queryTable(wbsTable, 1, 1);
  if (wbsRows.length) throw new Error('已有 WBS 时以 WBS 汇总进度为准');
  const progress = clampProgress(report?.progress_percent);
  await updateProjectFields(projectId, { progress });
  return { project_id: projectId, progress };
}

export function normalizeProgressComparePayload(payload: Record<string, any>) {
  const planned = toNumber(payload?.planned_progress, 0);
  const actual = toNumber(payload?.actual_progress, 0);
  return {
    ...payload,
    planned_progress: planned,
    actual_progress: actual,
    variance_progress: Number((actual - planned).toFixed(2)),
  };
}

export function normalizeBudgetPayload(payload: Record<string, any>) {
  const budget = toNumber(payload?.budget_amount, 0);
  const used = toNumber(payload?.used_amount, 0);
  return {
    ...payload,
    budget_amount: budget,
    used_amount: used,
    remaining_amount: budget > 0 ? Math.max(0, Number((budget - used).toFixed(2))) : 0,
    usage_rate: budget > 0 ? Number(((used / budget) * 100).toFixed(2)) : 0,
  };
}

export async function recalculateProjectWorkday(input: WorkdayRecalculateInput, legacyMonthText?: string) {
  const options = normalizeWorkdayRecalculateInput(input, legacyMonthText);
  const pid = options.projectId;
  if (!pid) return null;

  const hoursTable = createTable('0m6r2b5c4d7e8f9g0h1i2j3k4l5m6n7o', 'project_resource_hours', 'id');
  hoursTable.Filter = cond('project_id', 'equal', pid);
  const { items: hourRows } = await queryTable(hoursTable, 1, 0);

  const memberTable = createProjectMemberTable();
  memberTable.Filter = cond('project_id', 'equal', pid);
  const { items: memberRows } = await queryTable(memberTable, 1, 0);
  const memberRateMap = buildProjectMemberRateMap(memberRows);

  const groups = new Map<string, any>();
  for (const row of hourRows) {
    const month = getMonthText(row?.work_date);
    if (!month || (options.monthText && month !== options.monthText)) continue;
    const userId = String(row?.user_rowid || '').trim();
    if (!userId || (options.userRowid && userId !== options.userRowid)) continue;
    const key = `${month}::${userId}`;
    const old = groups.get(key) || {
      project_id: pid,
      month_text: month,
      user_rowid: userId,
      user_name: row?.user_name || '',
      hours_total: 0,
    };
    old.hours_total += toNumber(row?.hours, 0);
    if (!old.user_name && row?.user_name) old.user_name = row.user_name;
    groups.set(key, old);
  }

  const workdayTable = createTable('0m6r2b5c4d7e8f9g0h1i2j3k4l5m6n7o', 'project_cost_workday', 'id');
  workdayTable.Filter = cond('project_id', 'equal', pid);
  const { items: existing } = await queryTable(workdayTable, 1, 0);
  const existingMap = new Map<string, any>(existing.map((row: any) => [`${row?.month_text || ''}::${row?.user_rowid || ''}`, row]));

  const adds: any[] = [];
  const updates: any[] = [];
  for (const group of groups.values()) {
    const key = `${group.month_text}::${group.user_rowid}`;
    const old: any = existingMap.get(key);
    const memberRate = memberRateMap.get(group.user_rowid);
    const hoursTotal = Number(toNumber(group.hours_total, 0).toFixed(2));
    const workday = Number((hoursTotal / 8).toFixed(2));
    let hourCostRate = memberRate?.hourlyRate || 0;
    let costAmount = Number((hoursTotal * hourCostRate).toFixed(2));
    let status = '已计算';
    let remark = '由资源工时和成员成本单价自动汇总生成';

    if (!memberRate) {
      status = '未加入成员管理';
      remark = '当前人员有工时，但未在成员管理中维护，成本按 0 计算';
      hourCostRate = 0;
      costAmount = 0;
    } else if (hourCostRate <= 0) {
      status = '未配置单价';
      remark = '当前人员未配置小时成本或日成本，成本按 0 计算';
      hourCostRate = 0;
      costAmount = 0;
    }

    if (!options.force && old?.id && toNumber(old?.cost_amount, 0) > 0 && costAmount <= 0) {
      hourCostRate = toNumber(old?.hour_cost_rate, 0);
      costAmount = toNumber(old?.cost_amount, 0);
      status = '保留历史成本';
      remark = '当前成员或单价缺失，已保留历史计算成本；强制重算会按当前台账重新计算';
    }

    const next = {
      project_id: pid,
      month_text: group.month_text,
      user_rowid: group.user_rowid,
      user_name: group.user_name,
      hours_total: hoursTotal,
      workday,
      hour_cost_rate: Number(hourCostRate.toFixed(2)),
      cost_amount: Number(costAmount.toFixed(2)),
      status,
      remark,
    };
    if (old?.id) updates.push({ ...next, id: old.id });
    else adds.push({ ...next, id: generateId(), workday_code: `WD-${pid.slice(-6)}-${group.month_text}-${group.user_rowid.slice(-6)}` });
  }

  for (const row of existing) {
    const rowMonth = String(row?.month_text || '').trim();
    const rowUser = String(row?.user_rowid || '').trim();
    if (options.monthText && rowMonth !== options.monthText) continue;
    if (options.userRowid && rowUser !== options.userRowid) continue;
    const key = `${rowMonth}::${rowUser}`;
    if (!groups.has(key) && row?.id && (toNumber(row?.workday, 0) !== 0 || toNumber(row?.hours_total, 0) !== 0)) {
      updates.push({
        id: row.id,
        project_id: pid,
        month_text: rowMonth,
        user_rowid: row?.user_rowid,
        user_name: row?.user_name,
        hours_total: 0,
        workday: 0,
        hour_cost_rate: options.force ? 0 : toNumber(row?.hour_cost_rate, 0),
        cost_amount: options.force ? 0 : toNumber(row?.cost_amount, 0),
        status: options.force ? 'inactive' : '保留历史成本',
        remark: options.force ? '对应工时已清空，工日和成本自动置 0' : '对应工时已清空，保留历史成本；强制重算会清零成本',
      });
    }
  }

  if (adds.length || updates.length) {
    await saveTable(workdayTable, adds, updates, []);
  }
  return { added: adds.length, updated: updates.length, total: groups.size, projectId: pid, monthText: options.monthText, userRowid: options.userRowid, force: options.force };
}

function isQualityAbnormal(record: Record<string, any>) {
  const text = [record?.status, record?.issue_summary, record?.result_summary, record?.rectify_requirement, record?.acceptance_opinion, record?.description]
    .map((item) => String(item || '').toLowerCase())
    .join(' ');
  return ['failed', 'fail', 'abnormal', 'rectify', '不合格', '需整改', '异常', '未通过'].some((word) => text.includes(word));
}

function isIssueClosed(status: any) {
  return ['closed', 'resolved', 'done', 'completed', '已关闭', '已解决', '完成'].includes(String(status || '').toLowerCase());
}

export async function generateIssueFromQualityRecord(record: Record<string, any>, sourceType: 'process' | 'final', issueInput: Record<string, any> = {}) {
  const projectId = String(record?.project_id || '').trim();
  if (!projectId) throw new Error('缺少 project_id，无法生成问题');
  const reporterId = String(issueInput?.reporter_id || '').trim();
  if (!reporterId) throw new Error('缺少 reporter_id，无法生成项目问题');
  if (!isQualityAbnormal(record)) throw new Error('当前质量记录未识别为异常，不生成问题');

  const sourceLabel = sourceType === 'final' ? '最终质量' : '过程质量';
  const checkCode = String(record?.check_code || record?.id || '').trim();
  const summary = String(record?.issue_summary || record?.result_summary || record?.description || '质量异常').trim();
  const title = `[${sourceLabel}] ${checkCode ? `${checkCode} - ` : ''}${summary}`.slice(0, 180);
  const description = [
    `来源：${sourceLabel}`,
    checkCode ? `检查编号：${checkCode}` : '',
    record?.status ? `状态：${record.status}` : '',
    record?.issue_summary ? `问题摘要：${record.issue_summary}` : '',
    record?.result_summary ? `结果摘要：${record.result_summary}` : '',
    record?.rectify_requirement ? `整改要求：${record.rectify_requirement}` : '',
    record?.acceptance_opinion ? `验收意见：${record.acceptance_opinion}` : '',
    record?.description ? `说明：${record.description}` : '',
  ].filter(Boolean).join('\n');

  const issueTable = createTable('8k4p0f3a2b5c6d7e8f9g0h1i2j3k4l5m', 'project_issues', 'id');
  issueTable.Filter = cond('project_id', 'equal', projectId);
  const { items } = await queryTable(issueTable, 1, 0);
  const finalTitle = String(issueInput?.title || title).trim();
  const existed = items.find((item: any) => String(item?.title || '') === finalTitle && !isIssueClosed(item?.status));
  if (existed) return { created: false, issue: existed };

  const issue = {
    id: generateId(),
    project_id: projectId,
    title: String(issueInput?.title || title).trim(),
    description: String(issueInput?.description || description).trim(),
    type: String(issueInput?.type || 'improvement').trim(),
    priority: String(issueInput?.priority || 'high').trim(),
    status: String(issueInput?.status || 'open').trim(),
    reporter_id: reporterId,
    ...(String(issueInput?.assignee_id || '').trim() ? { assignee_id: String(issueInput.assignee_id).trim() } : {}),
  };
  await saveTable(issueTable, [issue], [], []);
  return { created: true, issue };
}

function isWbsCompleted(row: Record<string, any>) {
  return String(row?.status || '').toLowerCase() === 'completed' && clampProgress(row?.progress) >= 100;
}

function isDeliverableFinished(status: any) {
  return ['completed', 'accepted', 'archived', '已完成', '已验收', '已归档'].includes(String(status || '').toLowerCase());
}

function isHighOpenIssue(row: Record<string, any>) {
  return ['high', 'critical', '高', '严重', '紧急'].includes(String(row?.priority || '').toLowerCase()) && !isIssueClosed(row?.status);
}

export async function checkProjectCompletionConditions(projectId: string) {
  const pid = String(projectId || '').trim();
  if (!pid) throw new Error('缺少 project_id，无法检查项目完成条件');

  const wbsTable = createTable('2e8j4f7a6b9c0d1e2f3a4b5c6d7e8f9g', 'project_progress', 'id');
  wbsTable.Filter = cond('project_id', 'equal', pid);
  const { items: wbsRows } = await queryTable(wbsTable, 1, 0);

  const deliverableTable = createTable('2o8t4d7e6f9g0h1i2j3k4l5m6n7o8p9q', 'project_deliverables', 'id');
  deliverableTable.Filter = cond('project_id', 'equal', pid);
  const { items: deliverableRows } = await queryTable(deliverableTable, 1, 0);

  const issueTable = createTable('8k4p0f3a2b5c6d7e8f9g0h1i2j3k4l5m', 'project_issues', 'id');
  issueTable.Filter = cond('project_id', 'equal', pid);
  const { items: issueRows } = await queryTable(issueTable, 1, 0);

  const finalQualityTable = createTable('7j3o9e2f1a4b5c6d7e8f9g0h1i2j3k4l', 'project_quality_final', 'id');
  finalQualityTable.Filter = cond('project_id', 'equal', pid);
  const { items: finalQualityRows } = await queryTable(finalQualityTable, 1, 0);

  const blockers: string[] = [];
  const completionWbsRows = getLeafWbsRows(wbsRows);
  if (!wbsRows.length) blockers.push('未找到 WBS 任务');
  else if (!completionWbsRows.every((row: any) => isWbsCompleted(row))) blockers.push('存在未完成或进度未达 100% 的叶子 WBS 任务');

  if (!deliverableRows.length) blockers.push('未找到项目成果记录');
  else if (!deliverableRows.every((row: any) => isDeliverableFinished(row?.status))) blockers.push('存在未完成/未验收/未归档的成果记录');

  const highOpenIssues = issueRows.filter((row: any) => isHighOpenIssue(row));
  if (highOpenIssues.length) blockers.push(`存在 ${highOpenIssues.length} 个 high/critical 未关闭问题`);

  const abnormalFinalQuality = finalQualityRows.filter((row: any) => isQualityAbnormal(row));
  if (abnormalFinalQuality.length) blockers.push(`存在 ${abnormalFinalQuality.length} 条最终质量未通过或异常记录`);

  const canComplete = blockers.length === 0;
  return {
    canComplete,
    blockers,
    summary: canComplete ? '项目满足完成条件' : `项目暂不满足完成条件：${blockers.join('；')}`,
  };
}

export async function calculateProjectHealth(projectId: string) {
  const pid = String(projectId || '').trim();
  if (!pid) throw new Error('缺少 project_id，无法计算项目健康度');

  const compareTable = createTable('4g0l6b9c8d1e2f3a4b5c6d7e8f9g0h1i', 'project_progress_compare', 'id');
  compareTable.Filter = cond('project_id', 'equal', pid);
  const { items: compareRows } = await queryTable(compareTable, 1, 0);

  const budgetTable = createTable('1p7u3e6f5g8h9i0j1k2l3m4n5o6p7q8r', 'project_budgets', 'id');
  budgetTable.Filter = cond('project_id', 'equal', pid);
  const { items: budgetRows } = await queryTable(budgetTable, 1, 0);

  const deliverableTable = createTable('2o8t4d7e6f9g0h1i2j3k4l5m6n7o8p9q', 'project_deliverables', 'id');
  deliverableTable.Filter = cond('project_id', 'equal', pid);
  const { items: deliverableRows } = await queryTable(deliverableTable, 1, 0);

  const minVarianceProgress = compareRows.length
    ? Math.min(...compareRows.map((row: any) => toNumber(row?.variance_progress, 0)))
    : 0;
  const budgetAmount = budgetRows.reduce((sum: number, row: any) => sum + toNumber(row?.budget_amount, 0), 0);
  const usedAmount = budgetRows.reduce((sum: number, row: any) => sum + toNumber(row?.used_amount, 0), 0);
  const costUsageRate = budgetAmount > 0 ? Number(((usedAmount / budgetAmount) * 100).toFixed(2)) : 0;
  const doneDeliverableCount = deliverableRows.filter((row: any) => isDeliverableFinished(row?.status)).length;
  const deliverableDoneRate = deliverableRows.length ? Number(((doneDeliverableCount / deliverableRows.length) * 100).toFixed(2)) : 0;

  const reasons: string[] = [];
  let level: 'green' | 'yellow' | 'red' = 'green';

  if (minVarianceProgress <= PROJECT_HEALTH_RULES.redProgressVariance) {
    level = 'red';
    reasons.push(`进度负偏差 ${minVarianceProgress}% ≤ ${PROJECT_HEALTH_RULES.redProgressVariance}%`);
  }
  if (costUsageRate >= PROJECT_HEALTH_RULES.redCostUsageRate) {
    level = 'red';
    reasons.push(`成本使用率 ${costUsageRate}% ≥ ${PROJECT_HEALTH_RULES.redCostUsageRate}%`);
  }
  if (deliverableDoneRate < PROJECT_HEALTH_RULES.yellowDeliverableDoneRate) {
    if (level !== 'red') level = 'yellow';
    reasons.push(`成果完成率 ${deliverableDoneRate}% < ${PROJECT_HEALTH_RULES.yellowDeliverableDoneRate}%`);
  }

  return {
    level,
    reasons,
    metrics: {
      minVarianceProgress,
      costUsageRate,
      budgetAmount,
      usedAmount,
      deliverableDoneRate,
      deliverableTotal: deliverableRows.length,
      deliverableDone: doneDeliverableCount,
    },
  };
}

export async function applyMemberChange(change: Record<string, any>) {
  const projectId = String(change?.project_id || '').trim();
  if (!projectId) throw new Error('缺少 project_id，无法执行成员变更');

  const changeType = String(change?.change_type || '').trim();
  const changeDate = normalizeDateOnly(change?.change_date) || normalizeDateOnly(new Date().toISOString());
  const memberId = String(change?.member_to || change?.employee_id || '').trim();
  const memberFrom = String(change?.member_from || '').trim();
  const roleTo = String(change?.role_to || change?.role || 'member').trim();

  const memberTable = createProjectMemberTable();
  memberTable.Filter = cond('project_id', 'equal', projectId);
  const { items } = await queryTable(memberTable, 1, 0);
  const target = items.find((item: any) => String(item?.employee_id || '') === memberId);
  const joinCostRates = changeType === 'join' && memberId ? normalizeMemberCostRates(change) : null;
  if (changeType === 'leave' && memberId && !target?.id) throw new Error('未找到当前项目成员，无法退出');

  const logTable = createTable(PROJECT_MEMBER_FORM_ID, 'project_member_change_logs', 'id');
  const logRow = {
    change_code: change?.change_code,
    project_id: projectId,
    project_name: change?.project_name,
    change_type: changeType,
    member_from: memberFrom || change?.member_from,
    member_to: memberId || change?.member_to,
    role_name: change?.role_name,
    role_from: change?.role_from,
    role_to: roleTo,
    operator_name: change?.operator_name,
    change_date: changeDate,
    status: change?.status || '已生效',
    summary: change?.summary,
    note: change?.note,
    description: change?.description,
    lingma_sys_is_delete: Number(change?.lingma_sys_is_delete ?? 0),
  };
  await saveTable(logTable, [appendAccountSetId(logRow)], [], []);

  if (changeType === 'join' && memberId) {
    const costRates = joinCostRates || { cost_rate_hour: null, cost_rate_day: null };
    const nextMember = {
      project_id: projectId,
      employee_id: memberId,
      role: roleTo,
      join_date: changeDate,
      leave_date: null,
      work_hours: toNumber(change?.work_hours, 0),
      description: change?.description,
      ...costRates,
    };
    if (target?.id) {
      await saveProjectMemberTable([], [{ ...nextMember, id: target.id, join_date: target.join_date || changeDate }], []);
    } else {
      await saveProjectMemberTable([nextMember], [], []);
    }
  }

  if (changeType === 'manager_change' && memberId) {
    if (target?.id) {
      await saveProjectMemberTable([], [{ id: target.id, project_id: projectId, employee_id: memberId, role: 'manager', join_date: target.join_date || changeDate, leave_date: null }], []);
    } else {
      await saveProjectMemberTable([{ project_id: projectId, employee_id: memberId, role: 'manager', join_date: changeDate, leave_date: null }], [], []);
    }
  }

  if (changeType === 'leave' && memberId && target?.id) {
    await saveProjectMemberTable([], [], [{ id: target.id }]);
  }

  if (changeType === 'role_change' && memberId && target?.id) {
    await saveProjectMemberTable([], [{ id: target.id, role: roleTo }], []);
  }

  if (changeType === 'manager_change') {
    const managerDowngrades = items
      .filter((item: any) => String(item?.role || '').trim() === 'manager' && String(item?.employee_id || '').trim() !== memberId && item?.id)
      .map((item: any) => ({ id: item.id, project_id: projectId, employee_id: item.employee_id, role: 'member' }));
    if (managerDowngrades.length) await saveProjectMemberTable([], managerDowngrades, []);
    const projectFields: Record<string, any> = { project_manager_id: memberId || null };
    const memberToName = String(change?.member_to_name || '').trim();
    if (memberToName) projectFields.project_Manager = memberToName;
    await updateProjectFields(projectId, projectFields);
  }

  if (memberId && (changeType === 'join' || changeType === 'leave')) {
    await recalculateProjectWorkday({ projectId, userRowid: memberId, force: changeType === 'join' });
  }

  const refreshedTable = createProjectMemberTable();
  refreshedTable.Filter = cond('project_id', 'equal', projectId);
  const { items: refreshed } = await queryTable(refreshedTable, 1, 0);
  return refreshed;
}
