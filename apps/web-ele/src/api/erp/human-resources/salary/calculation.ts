export namespace HrSalaryCalculationApi {
  export interface Calculation {
    id?: string;
    calc_code?: string | null;
    salary_year?: string;
    salary_month?: string;
    user_rowid?: string;
    user_dj_rowid?: string;
    dep_id?: string;
    job_rowid?: string;
    base_salary?: number | string;
    bonus?: number | string;
    allowance?: number | string;
    deduction?: number | string;
    tax?: number | string;
    actual_salary?: number | string;
    status?: string;
    remark?: string | null;
    userName?: string;
    departmentName?: string;
    jobName?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    year?: string;
    month?: string;
    q?: string;
    status?: string;
  }
}

function buildDeprecatedError() {
  return new Error(
    '旧薪资核算接口已停止前台使用，请改用 lmbill 库中的 Bil_Salary_Info / Bil_Salary_Detail 新核算模型。',
  );
}

export async function listSalaryCalculations(_params: HrSalaryCalculationApi.QueryParams = {}) {
  throw buildDeprecatedError();
}

export async function createSalaryCalculation(_payload: HrSalaryCalculationApi.Calculation) {
  throw buildDeprecatedError();
}

export async function updateSalaryCalculation(_id: string, _payload: HrSalaryCalculationApi.Calculation) {
  throw buildDeprecatedError();
}

export async function deleteSalaryCalculation(_id: string) {
  throw buildDeprecatedError();
}
