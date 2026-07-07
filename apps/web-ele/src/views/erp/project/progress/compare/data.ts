import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const COMPARE_STATUS_OPTIONS = [
  { label: '待分析', value: '待分析' },
  { label: '分析中', value: '分析中' },
  { label: '已完成', value: '已完成' },
] as const;

export const progressCompareConfig: ProjectSubmoduleCrudConfig = {
  title: '进度对比',
  description: '维护 project_progress_compare 进度对比数据，项目关联 Bil_Project_Info.rowid。',
  primaryKey: 'id',
  defaultValues: {
    compare_code: '',
    project_id: '',
    progress_id: '',
    period_text: '',
    planned_progress: 0,
    actual_progress: 0,
    variance_progress: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    status: '待分析',
    variance_reason: '',
    suggestion: '',
  },
  searchSchema: [
    {
      fieldName: 'q',
      label: '关键词',
      component: 'Input',
      componentProps: { placeholder: '对比编号 / 项目ID / 周期', clearable: true },
    },
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
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COMPARE_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'compare_code', label: '对比编号', component: 'Input', rules: 'required' },
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
    { fieldName: 'progress_id', label: '进度ID', component: 'Input' },
    { fieldName: 'period_text', label: '周期', component: 'Input', rules: 'required' },
    { fieldName: 'planned_progress', label: '计划进度(%)', component: 'InputNumber', componentProps: { min: 0, max: 100, precision: 0, class: '!w-full' } },
    { fieldName: 'actual_progress', label: '实际进度(%)', component: 'InputNumber', componentProps: { min: 0, max: 100, precision: 0, class: '!w-full' } },
    { fieldName: 'variance_progress', label: '偏差(%)', component: 'InputNumber', componentProps: { precision: 0, class: '!w-full' } },
    {
      fieldName: 'planned_start_date',
      label: '计划开始',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'planned_end_date',
      label: '计划结束',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'actual_start_date',
      label: '实际开始',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'actual_end_date',
      label: '实际结束',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COMPARE_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'variance_reason', label: '偏差原因', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
    { fieldName: 'suggestion', label: '处理建议', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '对比编号', field: 'compare_code', minWidth: 140 },
    { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'cell_project' } },
    { title: '进度任务', field: 'progress_id', minWidth: 180, slots: { default: 'cell_progress' } },
    { title: '周期', field: 'period_text', minWidth: 140 },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
