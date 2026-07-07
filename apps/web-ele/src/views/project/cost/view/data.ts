import type { ProjectSubmoduleCrudConfig } from '#/views/project/_shared/crud';

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

const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 7 }, (_, index) => {
  const year = CURRENT_YEAR - 3 + index;
  return { label: String(year), value: year };
});
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return { label: `${month}月`, value: month };
});

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
    year: CURRENT_YEAR,
    month: new Date().getMonth() + 1,
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
      component: 'Slot',
      rules: 'required',
    },
    { fieldName: 'project_name', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    {
      fieldName: 'category',
      label: '成本类别',
      component: 'Select',
      componentProps: { options: COST_CATEGORY_OPTIONS.map((item) => ({ ...item })), class: '!w-full' },
      rules: 'required',
    },
    { fieldName: 'budget_amount', label: '预算金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' }, rules: 'required' },
    { fieldName: 'used_amount', label: '已用金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, class: '!w-full' } },
    { fieldName: 'remaining_amount', label: '剩余金额', component: 'InputNumber', componentProps: { min: 0, precision: 2, readonly: true, controls: false, class: '!w-full' } },
    { fieldName: 'usage_rate', label: '使用率(%)', component: 'InputNumber', componentProps: { min: 0, max: 100, precision: 2, readonly: true, controls: false, class: '!w-full' } },
    { fieldName: 'manager_id', component: 'Input', dependencies: { triggerFields: [''], show: () => false } },
    { fieldName: 'manager_name', label: '负责人', component: 'Input' },
    { fieldName: 'year', label: '年度', component: 'Select', componentProps: { options: YEAR_OPTIONS, class: '!w-full' }, rules: 'required' },
    { fieldName: 'month', label: '月份', component: 'Select', componentProps: { options: MONTH_OPTIONS, clearable: true, class: '!w-full' } },
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
    { title: '项目名称', field: 'project_name', minWidth: 180 },
    { title: '类别', field: 'category', minWidth: 100, align: 'center' },
    { title: '年度', field: 'year', minWidth: 100, align: 'center' },
    { title: '月份', field: 'month', minWidth: 100, align: 'center' },
    { title: '预算金额', field: 'budget_amount', minWidth: 120, align: 'right' },
    { title: '已用金额', field: 'used_amount', minWidth: 120, align: 'right' },
    { title: '剩余金额', field: 'remaining_amount', minWidth: 120, align: 'right' },
    { title: '使用率(%)', field: 'usage_rate', minWidth: 120, align: 'right' },
    { title: '状态', field: 'status', minWidth: 100, align: 'center' },
    { title: '操作', field: 'actions', fixed: 'right', minWidth: 260, slots: { default: 'actions' } },
  ],
};
