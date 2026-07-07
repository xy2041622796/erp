import { createSalaryCrudApi } from './shared';

export namespace HrSalaryBenchmarkApi {
  export interface Benchmark {
    id?: string;
    benchmarkCode?: string | null;
    position?: string;
    industry?: string;
    region?: string;
    marketMin?: number | string | null;
    marketMax?: number | string | null;
    marketMid?: number | string | null;
    ourSalary?: number | string | null;
    percentile?: number | string | null;
    [key: string]: any;
  }

  export interface QueryParams {
    q?: string;
    industry?: string;
    region?: string;
  }
}

export const SALARY_BENCHMARK_FORM_KEY = 'FA2E997D0084F95B9B331B90DE24F506';
const QUERY_FIELDS = ['id', 'benchmarkCode', 'position', 'industry', 'region', 'marketMin', 'marketMax', 'marketMid', 'ourSalary', 'percentile', 'updated_at'];

const api = createSalaryCrudApi({
  formKey: SALARY_BENCHMARK_FORM_KEY,
  dbName: 'LMBill',
  tableName: 'Bil_HR_Salary_Benchmarks',
  keywordFields: ['benchmarkCode', 'position', 'industry', 'region'],
  queryFields: QUERY_FIELDS,
});

function normalize(payload: HrSalaryBenchmarkApi.Benchmark) {
  return {
    ...payload,
    benchmarkCode: payload.benchmarkCode || null,
    marketMin: payload.marketMin === '' ? null : payload.marketMin,
    marketMax: payload.marketMax === '' ? null : payload.marketMax,
    marketMid: payload.marketMid === '' ? null : payload.marketMid,
    ourSalary: payload.ourSalary === '' ? null : payload.ourSalary,
    percentile: payload.percentile === '' ? null : payload.percentile,
  };
}

export const listSalaryBenchmarks = api.list as (params?: HrSalaryBenchmarkApi.QueryParams) => Promise<HrSalaryBenchmarkApi.Benchmark[]>;
export const createSalaryBenchmark = ((payload: HrSalaryBenchmarkApi.Benchmark) => api.create(normalize(payload))) as (payload: HrSalaryBenchmarkApi.Benchmark) => Promise<HrSalaryBenchmarkApi.Benchmark>;
export const updateSalaryBenchmark = ((id: string, payload: HrSalaryBenchmarkApi.Benchmark) => api.update(id, normalize(payload))) as (id: string, payload: HrSalaryBenchmarkApi.Benchmark) => Promise<HrSalaryBenchmarkApi.Benchmark>;
export const deleteSalaryBenchmark = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
