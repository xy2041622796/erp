import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const EQUIPMENT_STATUS_OPTIONS = [
  { label: '在库', value: '在库' },
  { label: '领用中', value: '领用中' },
  { label: '使用中', value: '使用中' },
  { label: '维修中', value: '维修中' },
  { label: '已报废', value: '已报废' },
] as const;

export const resourceEquipmentConfig: ProjectSubmoduleCrudConfig = {
  title: '设备管理',
  description: '维护 project_resource_equipment 设备台账，支持项目、设备编号、领用人、状态与备注维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    equipment_code: '',
    equipment_name: '',
    status: '在库',
    owner_user_rowid: '',
    owner_user_name: '',
    remark: '',
    description: '',
  },
  staffPickerFields: [
    {
      fieldName: 'owner_user_rowid',
      placeholder: '请选择领用人',
      relatedFields: {
        UserName: 'owner_user_name',
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
      fieldName: 'q',
      label: '关键词',
      component: 'Input',
      componentProps: { placeholder: '设备编号 / 设备名称 / 领用人', clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: EQUIPMENT_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'equipment_code',
      label: '设备编号',
      component: 'Input',
      componentProps: {
        readonly: false,
        placeholder: '可手动输入；留空时系统自动生成',
        clearable: true,
      },
      rules: 'required',
    },
    { fieldName: 'equipment_name', label: '设备名称', component: 'Input', rules: 'required' },
    {
      fieldName: 'project_id',
      label: '使用项目',
      component: 'Slot',
    },
    { fieldName: 'owner_user_rowid', label: '领用人', component: 'Slot' },
    { fieldName: 'owner_user_name', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: EQUIPMENT_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'remark', label: '备注', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
    { fieldName: 'description', label: '摘要', component: 'Textarea', componentProps: { rows: 3 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '设备编号', field: 'equipment_code', minWidth: 140 },
    { title: '设备名称', field: 'equipment_name', minWidth: 180 },
    { title: '项目', field: 'project_id', minWidth: 160 },
    { title: '领用人', field: 'owner_user_name', minWidth: 120 },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
