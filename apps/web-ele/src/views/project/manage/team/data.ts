import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const TEAM_ROLE_OPTIONS = [
  { label: '负责人', value: 'manager' },
  { label: '组长', value: 'leader' },
  { label: '成员', value: 'member' },
  { label: '报账员', value: 'accountant' },
] as const;

export const projectTeamConfig: ProjectSubmoduleCrudConfig = {
  title: '团队成员',
  description: '维护项目团队成员台账、角色、投入工时和人工成本单价。成本日历按成员工时 × 小时成本统计当天人工成本。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    employee_id: '',
    role: 'member',
    join_date: '',
    leave_date: '',
    work_hours: 0,
    cost_rate_hour: 0,
    cost_rate_day: 0,
    description: '',
  },
  staffPickerFields: [
    {
      fieldName: 'employee_id',
      placeholder: '请选择成员',
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
      fieldName: 'employee_id',
      label: '成员ID',
      component: 'Input',
      componentProps: { clearable: true, placeholder: '请输入成员ID' },
    },
    {
      fieldName: 'role',
      label: '角色',
      component: 'Select',
      componentProps: { options: TEAM_ROLE_OPTIONS.map((item) => ({ ...item })), clearable: true },
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
    { fieldName: 'employee_id', label: '成员', component: 'Slot', rules: 'required' },
    {
      fieldName: 'role',
      label: '角色',
      component: 'Select',
      componentProps: { options: TEAM_ROLE_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    {
      fieldName: 'join_date',
      label: '加入日期',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'leave_date',
      label: '离开日期',
      component: 'DatePicker',
      componentProps: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD', class: '!w-full' },
    },
    {
      fieldName: 'work_hours',
      label: '计划投入工时',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 1, class: '!w-full' },
    },
    {
      fieldName: 'cost_rate_hour',
      label: '小时成本',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, class: '!w-full', placeholder: '例如 80' },
    },
    {
      fieldName: 'cost_rate_day',
      label: '日成本',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 2, class: '!w-full', placeholder: '例如 640' },
    },
    {
      fieldName: 'description',
      label: '成本备注',
      component: 'Textarea',
      componentProps: { rows: 3, placeholder: '可填写单价来源、审批依据等' },
      formItemClass: 'col-span-2',
    },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目', field: 'project_name', minWidth: 180 },
    { title: '成员', field: 'employee_name', minWidth: 160 },
    { title: '角色', field: 'role_label', minWidth: 100, align: 'center' },
    { title: '加入日期', field: 'join_date', minWidth: 120 },
    { title: '离开日期', field: 'leave_date', minWidth: 120 },
    { title: '计划投入工时', field: 'work_hours', minWidth: 120, align: 'right' },
    { title: '小时成本', field: 'cost_rate_hour', minWidth: 110, align: 'right' },
    { title: '日成本', field: 'cost_rate_day', minWidth: 110, align: 'right' },
    { title: '折算小时成本', field: 'effective_hour_cost', minWidth: 130, align: 'right' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
