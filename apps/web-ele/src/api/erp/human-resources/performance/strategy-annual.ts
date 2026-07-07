import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceStrategyAnnualApi {
  export interface Annual {
    id?: string;
    indicatorCode?: string;
    indicatorName?: string;
    departmentName?: string;
    year?: string;
    targetValue?: string;
    weight?: string;
    status?: string;
    remark?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
    year?: string;
  }
}

export const PERFORMANCE_STRATEGY_ANNUAL_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_STRATEGY_ANNUAL_FORM_KEY,
  tableName: 'Bil_HR_Performance_Strategy_Annual',
  keywordFields: ['indicatorCode', 'indicatorName', 'departmentName', 'year', 'id'],
  defaultStatus: '草稿',
  useLingmaSysEnt: true,
  extraFilterKeys: ['year'],
});

export const listPerformanceStrategyAnnuals = api.list as (params?: HrPerformanceStrategyAnnualApi.QueryParams) => Promise<HrPerformanceStrategyAnnualApi.Annual[]>;
export const createPerformanceStrategyAnnual = api.create as (payload: HrPerformanceStrategyAnnualApi.Annual) => Promise<HrPerformanceStrategyAnnualApi.Annual>;
export const updatePerformanceStrategyAnnual = api.update as (id: string, payload: HrPerformanceStrategyAnnualApi.Annual) => Promise<HrPerformanceStrategyAnnualApi.Annual>;
export const deletePerformanceStrategyAnnual = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
