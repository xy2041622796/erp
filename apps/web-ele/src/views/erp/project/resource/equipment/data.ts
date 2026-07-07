import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const EQUIPMENT_STATUS_OPTIONS = [
  { label: '在库', value: '在库' },
  { label: '使用中', value: '使用中' },
  { label: '维修中', value: '维修中' },
  { label: '已报废', value: '已报废' },
] as const;

export const resourceEquipmentConfig: ProjectSubmoduleCrudConfig = {
  title: '资源设备',
  description: '按源项目 project_resource_equipment 语义迁入，支持项目、设备编码、设备名称、状态维护。',
  primaryKey: 'id',
  defaultValues: {
    project_id: '',
    equipment_code: '',
    equipment_name: '',
    status: '在库',
    quantity: 1,
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
      componentProps: { placeholder: '设备编码 / 设备名称', clearable: true },
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
    { fieldName: 'equipment_code', label: '设备编码', component: 'Input', rules: 'required' },
    { fieldName: 'equipment_name', label: '设备名称', component: 'Input', rules: 'required' },
    {
      fieldName: 'quantity',
      label: '数量',
      component: 'InputNumber',
      componentProps: { min: 0, precision: 0, class: '!w-full' },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: EQUIPMENT_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'description', label: '说明', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '设备编号', field: 'equipment_code', minWidth: 140 },
    { title: '设备名称', field: 'equipment_name', minWidth: 180 },
    { title: '项目', field: 'project_id', minWidth: 180, slots: { default: 'cell_project' } },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
