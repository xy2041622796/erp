import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const COST_WORKDAY_STATUS_OPTIONS = [
  { label: '已计算', value: '已计算' },
  { label: '已确认', value: '已确认' },
  { label: '需重算', value: '需重算' },
] as const;

export const costWorkdayConfig: ProjectSubmoduleCrudConfig = {
  title: '成本工日',
  description: '按源项目 project_cost_workday 语义迁入，支持项目、人员、月份、工日、成本与状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    user_rowid: '',
    user_name: '',
    month_text: '',
    workday: 0,
    status: '已计算',
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
    {
      fieldName: 'user_rowid',
      label: '人员ID',
      component: 'Input',
      componentProps: { placeholder: '请输入人员ID', clearable: true },
    },
    {
      fieldName: 'month_text',
      label: '月份',
      component: 'Input',
      componentProps: { placeholder: '例如 2026-04', clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_WORKDAY_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'project_id',
      label: '项目',
      component: 'ApiSelect',
      componentProps: {
        api: getProjectManageSimpleList,
        labelField: 'project_name',
        valueField: 'rowid',
        class: '!w-full',
        placeholder: '请选择项目',
      },
      rules: 'required',
    },
    { fieldName: 'user_rowid', label: '人员', component: 'Slot', rules: 'required' },
    { fieldName: 'user_name', label: '人员姓名', component: 'Input', componentProps: { readonly: true } },
    { fieldName: 'month_text', label: '月份', component: 'Input', componentProps: { placeholder: '例如 2026-04' }, rules: 'required' },
    { fieldName: 'workday', label: '工日', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_WORKDAY_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目ID', field: 'project_id', minWidth: 160 },
    { title: '人员ID', field: 'user_rowid', minWidth: 160 },
    { title: '人员姓名', field: 'user_name', minWidth: 120 },
    { title: '月份', field: 'month_text', minWidth: 120 },
    { title: '工日', field: 'workday', minWidth: 100, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
