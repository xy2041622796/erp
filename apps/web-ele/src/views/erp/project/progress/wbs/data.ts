import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const WBS_STATUS_OPTIONS = [
  { label: '待开始', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已暂停', value: 'paused' },
] as const;

export const progressWbsConfig: ProjectSubmoduleCrudConfig = {
  title: 'WBS分解',
  description: '按源项目 WBS 分解语义迁入，支持项目、任务、负责人、计划/实际日期、进度与状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    task_name: '',
    parent_task_id: '',
    assignee_id: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    progress: 0,
    status: 'pending',
    notes: '',
  },
  staffPickerFields: [
    {
      fieldName: 'assignee_id',
      placeholder: '请选择负责人',
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
      fieldName: 'assignee_id',
      label: '负责人ID',
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: '请输入负责人ID',
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: WBS_STATUS_OPTIONS.map((item) => ({ ...item })),
        clearable: true,
      },
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
    { fieldName: 'task_name', label: '任务名称', component: 'Input', rules: 'required' },
    { fieldName: 'parent_task_id', label: '父任务ID', component: 'Input' },
    {
      fieldName: 'assignee_id',
      label: '负责人',
      component: 'Slot',
    },
    {
      fieldName: 'planned_start_date', label: '计划开始', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'planned_end_date', label: '计划结束', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'actual_start_date', label: '实际开始', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'actual_end_date', label: '实际结束', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'progress', label: '进度(%)', component: 'InputNumber',
      componentProps: { min: 0, max: 100, precision: 0, class: '!w-full' },
    },
    {
      fieldName: 'status', label: '状态', component: 'Select', rules: 'required',
      componentProps: { options: WBS_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
    },
    {
      fieldName: 'notes', label: '备注', component: 'Textarea',
      componentProps: { rows: 4 }, formItemClass: 'col-span-2',
    },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目ID', field: 'project_id', minWidth: 160 },
    { title: '任务名称', field: 'task_name', minWidth: 180 },
    { title: '父任务ID', field: 'parent_task_id', minWidth: 120 },
    { title: '负责人ID', field: 'assignee_id', minWidth: 160 },
    { title: '计划开始', field: 'planned_start_date', minWidth: 120 },
    { title: '计划结束', field: 'planned_end_date', minWidth: 120 },
    { title: '进度', field: 'progress', minWidth: 100, align: 'center' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
