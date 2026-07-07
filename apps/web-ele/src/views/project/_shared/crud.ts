import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { useUserStore } from '@vben/stores';

export interface ProjectSubmoduleStaffPickerField {
  fieldName: string;
  multiple?: boolean;
  placeholder?: string;
  relatedFields?: Record<string, string>;
}

export interface ProjectSubmoduleCustomSelectField {
  fieldName: string;
  projectField?: string;
  placeholder?: string;
  emptyText?: string;
  labelField?: string;
  valueField?: string;
  relatedFields?: Record<string, string>;
  loader: (projectId: string, values?: Record<string, any>) => Promise<any[]>;
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
  customSelectFields?: ProjectSubmoduleCustomSelectField[];
  treeConfig?: VxeTableGridOptions['treeConfig'];
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

export function getCurrentUserSimple() {
  const userStore = useUserStore();
  const info: any = userStore.userInfo || {};
  const raw: any = info.rawUserInfo || {};
  return {
    id: String(info.id || raw.ROWID || raw.rowid || '').trim(),
    name: String(info.nickname || raw.UserName || raw.userName || info.username || '').trim(),
  };
}

export function formatTodayYmd(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatCurrentMonth(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

const CODE_PREFIX_MAP: Record<string, string> = {
  project_code: 'XM',
  compare_code: 'PKDB',
  report_code: 'BG',
  check_code: 'JC',
  deliverable_code: 'CG',
  equipment_code: 'SB',
  budget_code: 'YS',
};

const READONLY_NAME_FIELDS = new Set([
  'reporter_name',
  'checker_name',
  'user_name',
  'assignee_name',
  'employee_name',
  'owner_user_name',
  'project_Manager',
]);

export function buildSystemCode(fieldName: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const prefix = CODE_PREFIX_MAP[fieldName] || 'BH';
  return `${prefix}-${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
}

export function inferCreateDefaultValues(
  baseValues: Record<string, any> = {},
  formSchema: VbenFormSchema[] = [],
) {
  const next = { ...(baseValues || {}) };
  const fieldNames = new Set((formSchema || []).map((item: any) => String(item?.fieldName || '').trim()).filter(Boolean));
  const currentUser = getCurrentUserSimple();
  const today = formatTodayYmd();
  const currentMonth = formatCurrentMonth();

  for (const fieldName of fieldNames) {
    if (/(^|_)code$/i.test(fieldName) && !String(next[fieldName] || '').trim()) {
      next[fieldName] = buildSystemCode(fieldName);
    }
  }

  const fillPairs: Array<[string, string?]> = [
    ['reporter_id', 'reporter_name'],
    ['checker_id', 'checker_name'],
    ['user_rowid', 'user_name'],
    ['assignee_id', 'assignee_name'],
    ['project_manager_id', 'project_Manager'],
  ];
  for (const [idField, nameField] of fillPairs) {
    if (fieldNames.has(idField) && !String(next[idField] || '').trim()) {
      next[idField] = currentUser.id;
    }
    if (nameField && fieldNames.has(nameField) && !String(next[nameField] || '').trim()) {
      next[nameField] = currentUser.name;
    }
  }

  if (fieldNames.has('project_Manager') && !String(next.project_Manager || '').trim()) {
    next.project_Manager = currentUser.name;
  }

  const currentDateFields = ['report_date', 'check_date', 'work_date', 'submit_date'];
  for (const fieldName of currentDateFields) {
    if (fieldNames.has(fieldName) && !String(next[fieldName] || '').trim()) {
      next[fieldName] = today;
    }
  }
  if (fieldNames.has('calendar_month') && !String(next.calendar_month || '').trim()) {
    next.calendar_month = currentMonth;
  }
  if (fieldNames.has('month_text') && !String(next.month_text || '').trim()) {
    next.month_text = currentMonth;
  }

  return next;
}

export function inferReadonlyFormSchema(formSchema: VbenFormSchema[] = []) {
  return (formSchema || []).map((item: any) => {
    const fieldName = String(item?.fieldName || '').trim();
    const componentProps = { ...(item?.componentProps || {}) };
    if (/(^|_)code$/i.test(fieldName) && componentProps.readonly !== false) {
      componentProps.readonly = true;
      if (!componentProps.placeholder) {
        componentProps.placeholder = '系统自动生成';
      }
    }
    if (READONLY_NAME_FIELDS.has(fieldName) && item?.component === 'Input') {
      componentProps.readonly = true;
    }
    return {
      ...item,
      componentProps,
    };
  });
}
