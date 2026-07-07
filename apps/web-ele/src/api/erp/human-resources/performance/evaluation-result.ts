import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceResultApi {
  export interface Result {
    id?: string;
    resultCode?: string;
    employeeName?: string;
    employeeNameId?: string;
    employeeNameDepId?: string;
    employeeNameDepName?: string;
    periodText?: string;
    grade?: string;
    finalScore?: string | number;
    status?: string;
    remark?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_EVALUATION_RESULT_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_EVALUATION_RESULT_FORM_KEY,
  tableName: 'Bil_HR_Performance_Evaluation_Result',
  keywordFields: ['resultCode', 'employeeName', 'periodText', 'grade', 'id'],
  defaultStatus: '待确认',
  useLingmaSysEnt: true,
});

export const listPerformanceEvaluationResults = api.list as (params?: HrPerformanceResultApi.QueryParams) => Promise<HrPerformanceResultApi.Result[]>;
export const createPerformanceEvaluationResult = api.create as (payload: HrPerformanceResultApi.Result) => Promise<HrPerformanceResultApi.Result>;
export const updatePerformanceEvaluationResult = api.update as (id: string, payload: HrPerformanceResultApi.Result) => Promise<HrPerformanceResultApi.Result>;
export const deletePerformanceEvaluationResult = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
