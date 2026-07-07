import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

export const QUALITY_PROCESS_STATUS_OPTIONS = [
  { label: '待检查', value: '待检查' },
  { label: '检查中', value: '检查中' },
  { label: '已通过', value: '已通过' },
  { label: '需整改', value: '需整改' },
] as const;

export const qualityProcessConfig: ProjectSubmoduleCrudConfig = {
  title: '过程检查',
  description: '按源项目 project_quality_process 语义迁入，支持项目、检查编号、检查人、检查日期、问题摘要与状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    check_code: '',
    checker_name: '',
    check_date: '',
    issue_summary: '',
    result_detail: '',
    status: '待检查',
    description: '',
  },
  searchSchema: [
    { fieldName: 'check_code', label: '检查编号', component: 'Input', componentProps: { clearable: true, placeholder: '请输入检查编号' } },
    { fieldName: 'checker_name', label: '检查人', component: 'Input', componentProps: { clearable: true, placeholder: '请输入检查人' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: QUALITY_PROCESS_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
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
    {
      fieldName: 'check_code',
      label: '检查编号',
      component: 'Input',
      componentProps: { readonly: true, placeholder: '系统自动生成' },
    },
    { fieldName: 'checker_name', label: '检查人', component: 'Input', rules: 'required' },
    {
      fieldName: 'check_date',
      label: '检查日期',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: QUALITY_PROCESS_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'issue_summary', label: '问题摘要', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'result_detail', label: '检查结论', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目ID', field: 'project_id', minWidth: 160 },
    { title: '检查编号', field: 'check_code', minWidth: 140 },
    { title: '检查人', field: 'checker_name', minWidth: 120 },
    { title: '检查日期', field: 'check_date', minWidth: 120, slots: { default: 'dateCell' } },
    { title: '问题摘要', field: 'issue_summary', minWidth: 220 },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 280, slots: { default: 'actions' } },
  ],
};
