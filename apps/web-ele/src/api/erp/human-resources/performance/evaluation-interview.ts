import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceInterviewApi {
  export interface Interview {
    id?: string;
    interviewCode?: string;
    employeeName?: string;
    employeeNameId?: string;
    employeeNameDepId?: string;
    employeeNameDepName?: string;
    interviewerName?: string;
    interviewerNameId?: string;
    interviewerNameDepId?: string;
    interviewerNameDepName?: string;
    interviewTime?: string;
    status?: string;
    summary?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_EVALUATION_INTERVIEW_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_EVALUATION_INTERVIEW_FORM_KEY,
  tableName: 'Bil_HR_Performance_Evaluation_Interview',
  keywordFields: ['interviewCode', 'employeeName', 'interviewerName', 'id'],
  defaultStatus: '待面谈',
  useLingmaSysEnt: true,
  datetimeFields: ['interviewTime'],
});

export const listPerformanceEvaluationInterviews = api.list as (params?: HrPerformanceInterviewApi.QueryParams) => Promise<HrPerformanceInterviewApi.Interview[]>;
export const createPerformanceEvaluationInterview = api.create as (payload: HrPerformanceInterviewApi.Interview) => Promise<HrPerformanceInterviewApi.Interview>;
export const updatePerformanceEvaluationInterview = api.update as (id: string, payload: HrPerformanceInterviewApi.Interview) => Promise<HrPerformanceInterviewApi.Interview>;
export const deletePerformanceEvaluationInterview = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
