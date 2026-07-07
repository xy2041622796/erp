import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export interface ProjectSubmoduleStaffPickerField {
  fieldName: string;
  multiple?: boolean;
  placeholder?: string;
  relatedFields?: Record<string, string>;
}

export interface ProjectSubmoduleCrudConfig {
  title: string;
  description: string;
  primaryKey: string;
  searchSchema: VbenFormSchema[];
  formSchema: VbenFormSchema[];
  columns: VxeTableGridOptions['columns'];
  defaultValues: Record<string, any>;
  staffPickerFields?: ProjectSubmoduleStaffPickerField[];
}

export interface ProjectSubmoduleCrudApi {
  listData: (params?: Record<string, any>) => Promise<any>;
  getDetail: (id: string) => Promise<any>;
  createData: (data: Record<string, any>) => Promise<any>;
  updateData: (data: Record<string, any>) => Promise<any>;
  deleteData: (id: string) => Promise<any>;
}

export function formatYmd(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  const str = String(value);
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
}

export function normalizeDateString(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const str = String(value).trim();
  if (!str || str === 'null' || str === 'undefined') return undefined;
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
}

export function normalizeDateFields(values: Record<string, any>, fields: string[]) {
  const next = { ...(values || {}) };
  for (const field of fields) {
    if (field in next) {
      next[field] = normalizeDateString(next[field]);
    }
  }
  return next;
}
