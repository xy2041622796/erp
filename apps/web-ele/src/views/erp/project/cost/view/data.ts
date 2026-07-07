import type { ProjectSubmoduleCrudConfig } from '#/views/erp/project/_shared/crud';

import { getProjectManageSimpleList } from '#/api/erp/project/manage';

export const COST_VIEW_STATUS_OPTIONS = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
] as const;

export const COST_CATEGORY_OPTIONS = [
  { label: '人工', value: '人工' },
  { label: '设备', value: '设备' },
  { label: '材料', value: '材料' },
  { label: '外协', value: '外协' },
  { label: '其他', value: '其他' },
] as const;

export const costViewConfig: ProjectSubmoduleCrudConfig = {
  title: '成本视图',
  description: '维护 project_budgets 成本数据，项目关联 Bil_Project_Info.rowid。',
  primaryKey: 'id',
  defaultValues: {
    budget_code: '',
    project_id: '',
    project_name: '',
    category: '人工',
    budget_amount: 0,
    used_amount: 0,
    remaining_amount: 0,
    usage_rate: 0,
    manager_id: '',
    manager_name: '',
    year: '',
    month: '',
    status: 'active',
    remark: '',
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
      fieldName: 'category',
      label: '类别',
      component: 'Select',
      componentProps: { options: COST_CATEGORY_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_VIEW_STATUS_OPTIONS.map((item) => ({ ...item })), clearable: true },
    },
  ],
  formSchema: [
    { fieldName: 'id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'budget_code', label: '预算编号', component: 'Input' },
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
    { fieldName: 'project_name', label: '项目名称', component: 'Input' },
    {
      fieldName: 'category',
      label: '成本类别',
      component: 'Select',
      componentProps: { options: COST_CATEGORY_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'budget_amount', label: '预算金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' }, rules: 'required' },
    { fieldName: 'used_amount', label: '已用金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    { fieldName: 'remaining_amount', label: '剩余金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    { fieldName: 'usage_rate', label: '使用率(%)', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    { fieldName: 'manager_id', label: '负责人ID', component: 'Input' },
    { fieldName: 'manager_name', label: '负责人', component: 'Input' },
    { fieldName: 'year', label: '年度', component: 'Input', componentProps: { placeholder: '例如 2026' }, rules: 'required' },
    { fieldName: 'month', label: '月份', component: 'Input', componentProps: { placeholder: '例如 04' } },
    {
      fieldName: 'status',
      label: '状态',
      component: 'Select',
      componentProps: { options: COST_VIEW_STATUS_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'remark', label: '备注', component: 'Textarea', componentProps: { rows: 4 }, formItemClass: 'col-span-2' },
  ],
  columns: [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    { title: '项目ID', field: 'project_id', minWidth: 160 },
    { title: '项目名称', field: 'project_name', minWidth: 200 },
    { title: '类别', field: 'category', minWidth: 120 },
    { title: '预算金额', field: 'budget_amount', minWidth: 120, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 180, slots: { default: 'actions' } },
  ],
};
