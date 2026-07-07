import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const DELIVERABLE_STATUS_OPTIONS = [
  { label: '待汇交', value: '待汇交' },
  { label: '汇交中', value: '汇交中' },
  { label: '已汇交', value: '已汇交' },
  { label: '已退回', value: '已退回' },
] as const;

export const deliverableConfig: ProjectSubmoduleCrudConfig = {
  title: '成果交付',
  description: '按源项目 project_deliverables 语义迁入，支持项目、成果编码、成果名称、提交日期、状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    deliverable_code: '',
    deliverable_name: '',
    submit_date: '',
    status: '待汇交',
    description: '',
  },
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
      fieldName: 'q',
      label: '关键词',
      component: 'Input',
      componentProps: { placeholder: '成果编码 / 成果名称', clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: DELIVERABLE_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
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
    { fieldName: 'deliverable_code', label: '成果编码', component: 'Input', rules: 'required' },
    { fieldName: 'deliverable_name', label: '成果名称', component: 'Input', rules: 'required' },
    {
      fieldName: 'submit_date',
      label: '提交日期',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: DELIVERABLE_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '成果编号', field: 'deliverable_code', minWidth: 140 },
    { title: '成果名称', field: 'deliverable_name', minWidth: 200 },
    { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'cell_project' } },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
