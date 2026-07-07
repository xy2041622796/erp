import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const MEMBER_ROLE_OPTIONS = [
  { label: '负责人', value: 'manager' },
  { label: '组长', value: 'leader' },
  { label: '成员', value: 'member' },
] as const;

export const manageMemberConfig: ProjectSubmoduleCrudConfig = {
  title: '项目成员',
  description: '按源项目成员变更语义迁入，支持项目、成员、角色、加入/离开日期与投入工时维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    employee_id: '',
    role: 'member',
    join_date: '',
    leave_date: '',
    work_hours: 0,
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
      componentProps: {
        clearable: true,
        placeholder: '请输入成员ID',
      },
    },
    {
      fieldName: 'status',
      label: '角色',
      component: 'Select',
      componentProps: {
        options: MEMBER_ROLE_OPTIONS.map((item) => ({ ...item })),
        placeholder: '请选择角色',
        clearable: true,
      },
    },
  ],
  formSchema: [
    {
      fieldName: 'id',
      component: 'Input',
      dependencies: { triggerFields: [''], show: () => false },
    },
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
      fieldName: 'employee_id',
      label: '成员',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'role',
      label: '角色',
      component: 'Select',
      componentProps: {
        options: MEMBER_ROLE_OPTIONS.map((item) => ({ ...item })),
        class: '!w-full',
      },
      rules: 'required',
    },
    {
      fieldName: 'join_date',
      label: '加入日期',
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
    },
    {
      fieldName: 'leave_date',
      label: '离开日期',
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
    },
    {
      fieldName: 'work_hours',
      label: '投入工时',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 1,
        class: '!w-full',
      },
    },
    {
      fieldName: 'description',
      label: '摘要',
      component: 'Textarea',
      componentProps: { rows: 4 },
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
    { title: '投入工时', field: 'work_hours', minWidth: 100, align: 'right' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
