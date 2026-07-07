import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const REPORT_TYPE_OPTIONS = [
  { label: '日报', value: '日报' },
  { label: '周报', value: '周报' },
] as const;

export const REPORT_STATUS_OPTIONS = [
  { label: '草稿', value: '草稿' },
  { label: '已提交', value: '已提交' },
  { label: '已归档', value: '已归档' },
] as const;

export const progressReportConfig: ProjectSubmoduleCrudConfig = {
  title: '进度报告',
  description: '按源项目日报/周报语义迁入，支持报告编号、项目、填报人、日期、进度与工作内容维护。',
  primaryKey: 'id',
  defaultValues: {
    report_code: '',
    project_id: '',
    report_type: '日报',
    reporter_id: '',
    reporter_name: '',
    report_date: '',
    week_text: '',
    progress_percent: 0,
    status: '草稿',
    today_work: '',
    next_work: '',
    issue_text: '',
    coordination_text: '',
  },
  staffPickerFields: [
    {
      fieldName: 'reporter_id',
      placeholder: '请选择填报人',
      relatedFields: {
        UserName: 'reporter_name',
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
      fieldName: 'reporter_id',
      label: '填报人ID',
      component: 'Input',
      componentProps: {
        clearable: true,
        placeholder: '请输入填报人ID',
      },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: REPORT_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'report_code', label: '报告编号', component: 'Input', rules: 'required' },
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
    {
      fieldName: 'report_type', label: '类型', component: 'Select', rules: 'required',
      componentProps: { options: REPORT_TYPE_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
    },
    {
      fieldName: 'reporter_id',
      label: '填报人',
      component: 'Slot',
      rules: 'required',
    },
    { fieldName: 'reporter_name', label: '填报人姓名', component: 'Input', componentProps: { readonly: true } },
    {
      fieldName: 'report_date', label: '日期', component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    { fieldName: 'week_text', label: '周次描述', component: 'Input' },
    {
      fieldName: 'progress_percent', label: '进度(%)', component: 'InputNumber',
      componentProps: { min: 0, max: 100, precision: 0, class: '!w-full' },
    },
    {
      fieldName: 'status', label: '状态', component: 'Select',
      componentProps: { options: REPORT_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'today_work', label: '完成工作', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'next_work', label: '下一步计划', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'issue_text', label: '问题', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'coordination_text', label: '需协调事项', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '报告编号', field: 'report_code', minWidth: 140 },
    { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'cell_project' } },
    { title: '类型', field: 'report_type', minWidth: 100, align: 'center' },
    { title: '填报人', field: 'reporter_id', minWidth: 180, slots: { default: 'cell_reporter' } },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
