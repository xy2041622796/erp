import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceReviewApi {
  export interface Review {
    id?: string;
    reviewCode?: string;
    employeeName?: string;
    employeeNameId?: string;
    employeeNameDepId?: string;
    employeeNameDepName?: string;
    periodText?: string;
    score?: string | number;
    status?: string;
    comment?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_EVALUATION_REVIEW_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_EVALUATION_REVIEW_FORM_KEY,
  tableName: 'Bil_HR_Performance_Evaluation_Review',
  keywordFields: ['reviewCode', 'employeeName', 'periodText', 'id'],
  defaultStatus: '待评价',
  useLingmaSysEnt: true,
});

export const listPerformanceEvaluationReviews = api.list as (params?: HrPerformanceReviewApi.QueryParams) => Promise<HrPerformanceReviewApi.Review[]>;
export const createPerformanceEvaluationReview = api.create as (payload: HrPerformanceReviewApi.Review) => Promise<HrPerformanceReviewApi.Review>;
export const updatePerformanceEvaluationReview = api.update as (id: string, payload: HrPerformanceReviewApi.Review) => Promise<HrPerformanceReviewApi.Review>;
export const deletePerformanceEvaluationReview = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
