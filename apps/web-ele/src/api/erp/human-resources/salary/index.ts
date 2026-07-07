export interface HrSalaryQuery {
  keyword?: string;
  status?: string;
  index?: number;
  page?: number;
}

function buildDeprecatedError() {
  return new Error(
    'Bil_Salary_Info / Bil_Salary_Detail 已进入废弃流程，旧迁移薪酬接口已停止前台使用，请改用薪酬子模块独立 API。',
  );
}

export async function getSalaryInfoList(_params: HrSalaryQuery = {}) {
  throw buildDeprecatedError();
}

export async function getSalaryDetailList(_params: HrSalaryQuery & { salaryId?: string } = {}) {
  throw buildDeprecatedError();
}

export async function getSalaryExtensionList(_tableName: string, _params: HrSalaryQuery = {}) {
  throw buildDeprecatedError();
}
