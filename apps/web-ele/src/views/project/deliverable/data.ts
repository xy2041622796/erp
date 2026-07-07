import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const DELIVERABLE_STATUS_OPTIONS = [
  { label: '待上传', value: '待上传' },
  { label: '已上传', value: '已上传' },
  { label: '已确认', value: '已确认' },
  { label: '已退回', value: '已退回' },
] as const;

export const deliverableConfig: ProjectSubmoduleCrudConfig = {
  title: '附件',
  description: '成果汇交附件表，基于 project_deliverables 存储项目附件、文件地址、上传时间和状态。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    deliverable_code: '',
    deliverable_name: '',
    file_url: '',
    submit_date: '',
    status: '已上传',
    remark: '',
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
      componentProps: { placeholder: '附件编号 / 附件名称', clearable: true },
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
    { fieldName: 'deliverable_code', label: '附件编号', component: 'Input', rules: 'required' },
    { fieldName: 'deliverable_name', label: '附件名称', component: 'Input', rules: 'required' },
    { fieldName: 'file_url', label: '附件地址', component: 'Input', componentProps: { placeholder: '请输入或粘贴附件地址' }, rules: 'required' },
    {
      fieldName: 'submit_date',
      label: '上传时间',
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
    { fieldName: 'remark', label: '备注', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目', field: 'project_id', minWidth: 160 },
    { title: '附件编号', field: 'deliverable_code', minWidth: 140 },
    { title: '附件名称', field: 'deliverable_name', minWidth: 180 },
    { title: '附件地址', field: 'file_url', minWidth: 220, showOverflow: 'tooltip' },
    { title: '上传时间', field: 'submit_date', minWidth: 120 },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
