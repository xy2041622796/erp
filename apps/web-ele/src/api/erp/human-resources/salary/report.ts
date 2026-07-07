import { createSalaryCrudApi, newGuid } from './shared';

export namespace HrSalaryReportApi {
  export interface Report {
    id?: string;
    reportId?: string;
    reportName?: string;
    reportType?: string;
    year?: string;
    month?: string;
    period?: string;
    generateDate?: string;
    generator?: string;
    downloadCount?: number | string;
    status?: string;
    fileUrl?: string;
    remark?: string;
    [key: string]: any;
  }

  export interface QueryParams {
    year?: string;
    month?: string;
    reportType?: string;
    q?: string;
  }
}

export const SALARY_REPORT_FORM_KEY = '9019507A49A07E78BED7689356E064C7';

const api = createSalaryCrudApi({
  formKey: SALARY_REPORT_FORM_KEY,
  dbName: 'LMBill',
  tableName: 'Bil_HR_Salary_Reports',
  keywordFields: ['reportId', 'reportName', 'generator', 'id'],
  defaultValues: { status: '已生成', downloadCount: 0 },
});

export const listSalaryReports = api.list as (params?: HrSalaryReportApi.QueryParams) => Promise<HrSalaryReportApi.Report[]>;

export async function createSalaryReport(payload: HrSalaryReportApi.Report) {
  const reportId = payload.reportId || `RPT-${newGuid().slice(0, 8)}`;
  const period = payload.period || (payload.year && payload.month ? `${payload.year}-${payload.month}` : payload.year || '');
  return api.create({ ...payload, reportId, period, downloadCount: Number(payload.downloadCount || 0) }) as Promise<HrSalaryReportApi.Report>;
}

export const updateSalaryReport = api.update as (id: string, payload: HrSalaryReportApi.Report) => Promise<HrSalaryReportApi.Report>;
export const deleteSalaryReport = api.remove as (id: string) => Promise<boolean>;
export const PrimaryKeyFields = api.PrimaryKeyFields;
