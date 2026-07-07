import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceIndicatorApi {
  export interface Indicator {
    id?: string;
    indicatorCode?: string;
    indicatorName?: string;
    indicatorType?: string;
    measurementUnit?: string;
    status?: string;
    definition?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_CONFIG_INDICATOR_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_CONFIG_INDICATOR_FORM_KEY,
  tableName: 'Bil_HR_Performance_Config_Indicator',
  keywordFields: ['indicatorCode', 'indicatorName', 'indicatorType', 'id'],
  defaultStatus: '启用',
  useLingmaSysEnt: true,
});

export const listPerformanceConfigIndicators = api.list as (params?: HrPerformanceIndicatorApi.QueryParams) => Promise<HrPerformanceIndicatorApi.Indicator[]>;
export const createPerformanceConfigIndicator = api.create as (payload: HrPerformanceIndicatorApi.Indicator) => Promise<HrPerformanceIndicatorApi.Indicator>;
export const updatePerformanceConfigIndicator = api.update as (id: string, payload: HrPerformanceIndicatorApi.Indicator) => Promise<HrPerformanceIndicatorApi.Indicator>;
export const deletePerformanceConfigIndicator = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
