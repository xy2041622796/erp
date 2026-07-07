import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const HOURS_STATUS_OPTIONS = [
  { label: '已填报', value: '已填报' },
  { label: '已确认', value: '已确认' },
  { label: '已退回', value: '已退回' },
] as const;

export const resourceHoursConfig: ProjectSubmoduleCrudConfig = {
  title: '资源工时',
  description: '按源项目 project_resource_hours 语义迁入，支持项目、人员、日期、工时、状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    user_rowid: '',
    user_name: '',
    work_date: '',
    hours: 0,
    status: '已填报',
    description: '',
  },
  staffPickerFields: [
    {
      fieldName: 'user_rowid',
      placeholder: '请选择人员',
      relatedFields: {
        UserName: 'user_name',
      },
    },
  ],
  searchSchema: [
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        api: getProjectManageSimpleList,
        labelField: 'project_name',
        valueField: 'rowid',
        clearable: true,
        placeholder: '请选择项目',
      },
    },
    { fieldName: 'user_rowid', label: '人员', component: 'Input', componentProps: { clearable: true, placeholder: '请输入人员ID' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: HOURS_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'Slot',
      rules: 'required',
    },
    { fieldName: 'user_rowid', label: '人员', component: 'Slot', rules: 'required' },
    { fieldName: 'user_name', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'work_date',
      label: '工作日期',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'hours',
      label: '工时',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 1, class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: HOURS_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目ID', field: 'project_id', minWidth: 160 },
    { title: '人员ID', field: 'user_rowid', minWidth: 160 },
    { title: '人员姓名', field: 'user_name', minWidth: 120 },
    { title: '工作日期', field: 'work_date', minWidth: 120 },
    { title: '工时', field: 'hours', minWidth: 100, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 260, slots: { default: 'actions' } },
  ],
};
