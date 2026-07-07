import { createSalaryCrudApi } from './shared';

export namespace HrSalaryPolicyApi {
  export interface Policy {
    id?: string;
    year?: string;
    region?: string;
    policyType?: string;
    title?: string;
    effectiveDate?: string;
    version?: string;
    content?: string;
    updatedBy?: string;
    updateDate?: string;
    status?: string;
    remark?: string;
    policyCode?: string | null;
    [key: string]: any;
  }

  export interface QueryParams {
    year?: string;
    region?: string;
    policyType?: string;
    status?: string;
    q?: string;
  }
}

export const SALARY_POLICY_FORM_KEY = '297F7D094685F3B9BC4361AE4B594ADB';

const api = createSalaryCrudApi({
  formKey: SALARY_POLICY_FORM_KEY,
  dbName: 'LMBill',
  tableName: 'Bil_HR_Salary_Policies',
  keywordFields: ['policyCode', 'title', 'content', 'updatedBy', 'id'],
  defaultValues: { status: '生效' },
});

export const listSalaryPolicies = api.list as (params?: HrSalaryPolicyApi.QueryParams) => Promise<HrSalaryPolicyApi.Policy[]>;
export const createSalaryPolicy = api.create as (payload: HrSalaryPolicyApi.Policy) => Promise<HrSalaryPolicyApi.Policy>;
export const updateSalaryPolicy = api.update as (id: string, payload: HrSalaryPolicyApi.Policy) => Promise<HrSalaryPolicyApi.Policy>;
export const deleteSalaryPolicy = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
