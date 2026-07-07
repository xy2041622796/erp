import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const ISSUE_TYPE_OPTIONS = [
  { label: '缺陷', value: 'bug' },
  { label: '需求', value: 'feature' },
  { label: '改进', value: 'improvement' },
  { label: '任务', value: 'task' },
] as const;

export const ISSUE_PRIORITY_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '普通', value: 'normal' },
  { label: '高', value: 'high' },
  { label: '严重', value: 'critical' },
] as const;

export const ISSUE_STATUS_OPTIONS = [
  { label: '待处理', value: 'open' },
  { label: '处理中', value: 'in_progress' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
] as const;

export const issueConfig: ProjectSubmoduleCrudConfig = {
  title: '问题跟踪',
  description: '按源项目问题跟踪语义迁入，支持项目、问题类型、优先级、状态、责任人与到期/解决时间维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    title: '',
    type: 'bug',
    priority: 'normal',
    status: 'open',
    reporter_id: '',
    assignee_id: '',
    due_date: '',
    resolved_at: '',
    description: '',
    resolution: '',
  },
  staffPickerFields: [
    {
      fieldName: 'reporter_id',
      placeholder: '请选择提出人',
    },
    {
      fieldName: 'assignee_id',
      placeholder: '请选择处理人',
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
      fieldName: 'priority',
      label: '优先级',
      component: 'Select',
      componentProps: { options: ISSUE_PRIORITY_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: ISSUE_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
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
    { fieldName: 'title', label: '标题', component: 'Input', rules: 'required' },
    {
      fieldName: 'type', label: '类型', component: 'Select',
      componentProps: { options: ISSUE_TYPE_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'priority', label: '优先级', component: 'Select',
      componentProps: { options: ISSUE_PRIORITY_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'status', label: '状态', component: 'Select',
      componentProps: { options: ISSUE_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'reporter_id',
      label: '提出人',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'assignee_id',
      label: '处理人',
      component: 'Slot',
    },
    {
      fieldName: 'due_date', label: '到期日期', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'resolved_at', label: '解决时间', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    { fieldName: 'description', label: '描述', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
    { fieldName: 'resolution', label: '解决方案', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '标题', field: 'title', minWidth: 220 },
    { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'cell_project' } },
    { title: '类型', field: 'type', minWidth: 100, align: 'center' },
    { title: '优先级', field: 'priority', minWidth: 100, align: 'center' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
