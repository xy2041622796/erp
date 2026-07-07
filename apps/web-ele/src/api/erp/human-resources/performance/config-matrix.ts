import { createPerformanceCrudApi } from './shared';

export namespace HrPerformanceMatrixApi {
  export interface Matrix {
    id?: string;
    matrixCode?: string;
    evaluatorRole?: string;
    evaluateeRole?: string;
    weight?: string | number;
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

export const PERFORMANCE_CONFIG_MATRIX_FORM_KEY = 'FE34FD7C3A0511F19FF2868C42717AB9';

const api = createPerformanceCrudApi({
  formKey: PERFORMANCE_CONFIG_MATRIX_FORM_KEY,
  tableName: 'Bil_HR_Performance_Config_Matrix',
  keywordFields: ['matrixCode', 'evaluatorRole', 'evaluateeRole', 'id'],
  defaultStatus: '启用',
  useLingmaSysEnt: true,
});

export const listPerformanceConfigMatrixes = api.list as (params?: HrPerformanceMatrixApi.QueryParams) => Promise<HrPerformanceMatrixApi.Matrix[]>;
export const createPerformanceConfigMatrix = api.create as (payload: HrPerformanceMatrixApi.Matrix) => Promise<HrPerformanceMatrixApi.Matrix>;
export const updatePerformanceConfigMatrix = api.update as (id: string, payload: HrPerformanceMatrixApi.Matrix) => Promise<HrPerformanceMatrixApi.Matrix>;
export const deletePerformanceConfigMatrix = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
