import {
  createData as createMemberData,
  deleteData as deleteMemberData,
  getDetail as getMemberDetail,
  listData as listMemberData,
  updateData as updateMemberData,
} from '#/api/erp/project/manage/member';

function toNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function getEffectiveHourCost(row: Record<string, any> = {}) {
  const hour = toNumber(row.cost_rate_hour);
  if (hour > 0) return hour;
  const day = toNumber(row.cost_rate_day);
  return day > 0 ? Number((day / 8).toFixed(2)) : 0;
}

function normalizeRate(value: unknown) {
  const num = toNumber(value);
  return num > 0 ? num : undefined;
}

function validateRateChoice(payload: Record<string, any> = {}) {
  const hour = normalizeRate(payload.cost_rate_hour);
  const day = normalizeRate(payload.cost_rate_day);
  if (hour && day) throw new Error('小时成本和日成本只能填写一个');
  if (!hour && !day) throw new Error('请填写小时成本或日成本');
  return { hour, day };
}

function decodeTeamRow(row: Record<string, any> = {}) {
  return {
    ...row,
    cost_rate_hour: normalizeRate(row.cost_rate_hour) ?? 0,
    cost_rate_day: normalizeRate(row.cost_rate_day) ?? 0,
    effective_hour_cost: getEffectiveHourCost(row),
  };
}

function encodeTeamPayload(payload: Record<string, any> = {}) {
  const { hour, day } = validateRateChoice(payload);
  const next: Record<string, any> = {
    ...payload,
    cost_rate_hour: hour ?? null,
    cost_rate_day: day ?? null,
  };
  delete next.effective_hour_cost;
  delete next.cost_note;
  return next;
}

export const listData = async (params: Record<string, any> = {}) => {
  const res = await listMemberData(params);
  const rows = Array.isArray(res?.list) ? res.list : [];
  rows.forEach((row: Record<string, any>, index: number) => {
    rows[index] = decodeTeamRow(row);
  });
  return res;
};

export const getDetail = async (id: string) => decodeTeamRow(await getMemberDetail(id));
export const createData = (payload: Record<string, any>) => createMemberData(encodeTeamPayload(payload));
export const updateData = (payload: Record<string, any>) => updateMemberData(encodeTeamPayload(payload));
export const deleteData = deleteMemberData;
