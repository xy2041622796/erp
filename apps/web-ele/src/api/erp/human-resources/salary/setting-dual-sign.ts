import { createSalaryCrudApi } from './shared';

export namespace HrSalaryDualSignApi {
  export interface DualSign {
    id?: string;
    dualSignCode?: string | null;
    employee?: string;
    position?: string;
    salaryChange?: string | null;
    hrbpSign?: string;
    hrbpDate?: string | null;
    leaderSign?: string;
    leaderDate?: string | null;
    status?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const DUAL_SIGN_FORM_KEY = '242CA8665E90FB8406ADAF8BC56F9927';
const QUERY_FIELDS = ['id', 'dualSignCode', 'employee', 'position', 'salaryChange', 'hrbpSign', 'hrbpDate', 'leaderSign', 'leaderDate', 'status', 'updated_at'];

const api = createSalaryCrudApi({
  formKey: DUAL_SIGN_FORM_KEY,
  dbName: 'LMBill',
  tableName: 'Bil_HR_Salary_Dual_Sign',
  keywordFields: ['dualSignCode', 'employee', 'position'],
  queryFields: QUERY_FIELDS,
  defaultValues: { hrbpSign: '待签批', leaderSign: '待签批', status: '待处理' },
});

export const listDualSigns = api.list as (params?: HrSalaryDualSignApi.QueryParams) => Promise<HrSalaryDualSignApi.DualSign[]>;
export const createDualSign = api.create as (payload: HrSalaryDualSignApi.DualSign) => Promise<HrSalaryDualSignApi.DualSign>;
export const updateDualSign = api.update as (id: string, payload: HrSalaryDualSignApi.DualSign) => Promise<HrSalaryDualSignApi.DualSign>;
export const deleteDualSign = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
