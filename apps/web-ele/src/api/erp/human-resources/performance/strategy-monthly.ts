import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceStrategyMonthlyApi {
  export interface Monthly {
    id?: string;
    planCode?: string;
    planName?: string;
    departmentName?: string;
    monthText?: string;
    ownerName?: string;
    ownerNameId?: string;
    ownerNameDepId?: string;
    ownerNameDepName?: string;
    status?: string;
    content?: string;
    completionRate?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_STRATEGY_MONTHLY_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_STRATEGY_MONTHLY_FORM_KEY,
  tableName: 'Bil_HR_Performance_Strategy_Monthly',
  keywordFields: ['planCode', 'planName', 'departmentName', 'monthText', 'id'],
  defaultStatus: '草稿',
  useLingmaSysEnt: true,
});

export const listPerformanceStrategyMonthlies = api.list as (params?: HrPerformanceStrategyMonthlyApi.QueryParams) => Promise<HrPerformanceStrategyMonthlyApi.Monthly[]>;
export const createPerformanceStrategyMonthly = api.create as (payload: HrPerformanceStrategyMonthlyApi.Monthly) => Promise<HrPerformanceStrategyMonthlyApi.Monthly>;
export const updatePerformanceStrategyMonthly = api.update as (id: string, payload: HrPerformanceStrategyMonthlyApi.Monthly) => Promise<HrPerformanceStrategyMonthlyApi.Monthly>;
export const deletePerformanceStrategyMonthly = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
