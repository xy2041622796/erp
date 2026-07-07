import { DataTable } from '#/api/qyapi';

import { createLocalCode, createSalaryCrudApi, newGuid, querySalaryTable, saveSalaryTable } from './shared';

export namespace HrSalaryRangeApi {
  export interface Range {
    id?: string;
    rangeCode?: string | null;
    jobLevel?: string;
    positionType?: string;
    minSalary?: number | string | null;
    maxSalary?: number | string | null;
    midSalary?: number | string | null;
    updatedBy?: string | null;
    updateDate?: string | null;
    status?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const SALARY_RANGE_FORM_KEY = '3CE4BF058069E4295F816529833268C8';
const DB_NAME = 'LMBill';
const TABLE_NAME = 'Bil_HR_Salary_Ranges';
const PK = 'id';
const QUERY_FIELDS = ['id', 'rangeCode', 'jobLevel', 'positionType', 'minSalary', 'maxSalary', 'midSalary', 'updatedBy', 'updateDate', 'status', 'updated_at'];

const api = createSalaryCrudApi({
  formKey: SALARY_RANGE_FORM_KEY,
  dbName: DB_NAME,
  tableName: TABLE_NAME,
  keywordFields: ['rangeCode', 'jobLevel', 'positionType', 'id'],
  queryFields: QUERY_FIELDS,
  defaultValues: { status: '有效' },
});

function normalize(payload: HrSalaryRangeApi.Range) {
  return {
    ...payload,
    rangeCode: payload.rangeCode || null,
    minSalary: payload.minSalary === '' ? null : payload.minSalary,
    maxSalary: payload.maxSalary === '' ? null : payload.maxSalary,
    midSalary: payload.midSalary === '' ? null : payload.midSalary,
    updateDate: payload.updateDate || null,
    updatedBy: payload.updatedBy || null,
  };
}

export const listSalaryRanges = api.list as (params?: HrSalaryRangeApi.QueryParams) => Promise<HrSalaryRangeApi.Range[]>;

export async function createSalaryRange(payload: HrSalaryRangeApi.Range) {
  const table = new DataTable(SALARY_RANGE_FORM_KEY, TABLE_NAME, DB_NAME, PK);
  await querySalaryTable(table, QUERY_FIELDS);
  const id = payload.id || newGuid();
  const row: any = { id, ...normalize(payload), rangeCode: payload.rangeCode || createLocalCode('XZQJ'), status: payload.status || '有效' };
  const res = await saveSalaryTable(table, [row], [], []);
  if (!res.success) throw new Error(res.error);

  return row as HrSalaryRangeApi.Range;
}

export const updateSalaryRange = ((id: string, payload: HrSalaryRangeApi.Range) => api.update(id, normalize(payload))) as (id: string, payload: HrSalaryRangeApi.Range) => Promise<HrSalaryRangeApi.Range>;
export const deleteSalaryRange = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
