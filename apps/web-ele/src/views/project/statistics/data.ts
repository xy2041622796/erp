import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

export const STATISTICS_STATUS_OPTIONS = [
  { label: '已生成', value: '已生成' },
  { label: '已发布', value: '已发布' },
  { label: '已归档', value: '已归档' },
] as const;

export const statisticsConfig: ProjectSubmoduleCrudConfig = {
  title: '项目统计',
  description: '',
  // description: '',
  primaryKey: 'id',
  defaultValues: {
    report_code: '',
    report_name: '',
    period_text: '',
    project_count: 0,
    issue_count: 0,
    work_hours: 0,
    cost_amount: 0,
    status: '已生成',
    description: '',
  },
  searchSchema: [
    {
      fieldName: 'q',
      label: '关键词',
      component: 'Input',
      componentProps: { placeholder: '报告编号 / 报告名称 / 周期', clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: STATISTICS_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'report_code', label: '报告编号', component: 'Input', rules: 'required' },
    { fieldName: 'report_name', label: '报告名称', component: 'Input', rules: 'required' },
    { fieldName: 'period_text', label: '统计周期', component: 'Input', rules: 'required' },
    { fieldName: 'project_count', label: '项目数', component: 'InputNumber', componentProps: { min: 0, precision: 0, class: '!w-full' } },
    { fieldName: 'issue_count', label: '问题数', component: 'InputNumber', componentProps: { min: 0, precision: 0, class: '!w-full' } },
    { fieldName: 'work_hours', label: '工时', component: 'InputNumber', componentProps: { min: 0, precision: 1, class: '!w-full' } },
    { fieldName: 'cost_amount', label: '成本金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: STATISTICS_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '报告编号', field: 'report_code', minWidth: 140 },
    { title: '报告名称', field: 'report_name', minWidth: 180 },
    { title: '统计周期', field: 'period_text', minWidth: 140 },
    { title: '项目数', field: 'project_count', minWidth: 100, align: 'right' },
    { title: '问题数', field: 'issue_count', minWidth: 100, align: 'right' },
    { title: '工时', field: 'work_hours', minWidth: 100, align: 'right' },
    { title: '成本金额', field: 'cost_amount', minWidth: 120, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 260, slots: { default: 'actions' } },
  ],
};
