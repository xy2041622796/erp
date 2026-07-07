import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceTemplateApi {
  export interface Template {
    id?: string;
    templateCode?: string;
    templateName?: string;
    assessmentType?: string;
    versionNo?: string;
    status?: string;
    description?: string;
    updateTime?: string;
    lingma_sys_ent?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    status?: string;
  }
}

export const PERFORMANCE_CONFIG_TEMPLATE_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_CONFIG_TEMPLATE_FORM_KEY,
  tableName: 'Bil_HR_Performance_Config_Template',
  keywordFields: ['templateCode', 'templateName', 'assessmentType', 'id'],
  defaultStatus: '启用',
  useLingmaSysEnt: true,
});

export const listPerformanceConfigTemplates = api.list as (params?: HrPerformanceTemplateApi.QueryParams) => Promise<HrPerformanceTemplateApi.Template[]>;
export const createPerformanceConfigTemplate = api.create as (payload: HrPerformanceTemplateApi.Template) => Promise<HrPerformanceTemplateApi.Template>;
export const updatePerformanceConfigTemplate = api.update as (id: string, payload: HrPerformanceTemplateApi.Template) => Promise<HrPerformanceTemplateApi.Template>;
export const deletePerformanceConfigTemplate = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
