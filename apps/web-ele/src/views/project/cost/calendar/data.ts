import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

export const COST_CALENDAR_STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
] as const;

export const costCalendarConfig: ProjectSubmoduleCrudConfig = {
  title: '成本日历',
  description: '按源项目 project_cost_calendar 语义迁入，支持月份、人员、标准工日、状态维护。',
  primaryKey: 'id',
  defaultValues: {
    calendar_month: '',
    user_rowid: '',
    user_name: '',
    standard_days: 0,
    status: '启用',
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
      fieldName: 'calendar_month',
      label: '月份',
      component: 'Input',
      componentProps: { placeholder: '例如 2026-04', clearable: true },
    },
    {
      fieldName: 'user_rowid',
      label: '人员ID',
      component: 'Input',
      componentProps: { placeholder: '请输入人员ID', clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_CALENDAR_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'calendar_month', label: '月份', component: 'Input', componentProps: { placeholder: '例如 2026-04' }, rules: 'required' },
    { fieldName: 'user_rowid', label: '人员', component: 'Slot', rules: 'required' },
    { fieldName: 'user_name', label: '人员姓名', component: 'Input', componentProps: { readonly: true } },
    {
      fieldName: 'standard_days',
      label: '标准工日',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_CALENDAR_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '月份', field: 'calendar_month', minWidth: 120 },
    { title: '人员ID', field: 'user_rowid', minWidth: 160 },
    { title: '人员姓名', field: 'user_name', minWidth: 120 },
    { title: '标准工日', field: 'standard_days', minWidth: 100, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
