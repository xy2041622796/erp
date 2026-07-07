import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { z } from '#/adapter/form';
import { getCustomerSimpleList } from '#/api/erp/customer';

export const PROJECT_STATUS_OPTIONS = [
  { label: '未开始', value: 0 },
  { label: '进行中', value: 1 },
  { label: '已完成', value: 2 },
  { label: '已暂停', value: 3 },
] as const;

export const PROJECT_PRIORITY_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '普通', value: 'normal' },
  { label: '高', value: 'high' },
  { label: '紧急', value: 'urgent' },
] as const;

export function mapStatusLabel(value: unknown) {
  const n = Number(value);
  if (n === 0) return '未开始';
  if (n === 1) return '进行中';
  if (n === 2) return '已完成';
  if (n === 3) return '已暂停';
  return value ?? '-';
}

export function mapPriorityLabel(value: unknown) {
  const str = String(value ?? '').trim();
  if (str === 'low') return '低';
  if (str === 'normal') return '普通';
  if (str === 'high') return '高';
  if (str === 'urgent') return '紧急';
  return str || '-';
}

export function useProjectManageFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'rowid',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'project_manager_id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'project_depart_id',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'project_type',
      label: '项目类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '自营项目', value: '自营项目' },
          { label: '分包项目', value: '分包项目' },
        ],
      },
      formItemClass: 'col-span-2',
      rules: z.string().optional().default('自营项目'),
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'project_name',
      label: '项目名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        placeholder: '请输入项目名称',
      },
    },
    {
      fieldName: 'project_code',
      label: '项目编号',
      component: 'Input',
      componentProps: {
        placeholder: '系统自动生成',
        readonly: true,
      },
    },
    {
      fieldName: 'project_Manager',
      label: '负责人',
      component: 'Slot',
      rules: 'required',
    },
    {
      fieldName: 'project_depart',
      label: '部门',
      component: 'Slot',
    },
    {
      fieldName: 'project_group',
      label: '项目组',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目组',
      },
    },
    {
      fieldName: 'project_period',
      label: '项目期限',
      component: 'DatePicker',
      rules: 'required',
      componentProps: {
        type: 'daterange',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        placeholder: ['开始日期', '结束日期'],
        class: '!w-full',
      },
      dependencies: {
        triggerFields: ['project_period'],
        trigger(values, form) {
          const range = values.project_period as any;
          if (Array.isArray(range) && range.length === 2) {
            form.setFieldValue('project_start_date', range[0]);
            form.setFieldValue('project_end_date', range[1]);
          }
        },
      },
    },
    {
      fieldName: 'project_start_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'project_end_date',
      component: 'Input',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'actual_end_date',
      label: '实际结束日期',
      component: 'DatePicker',
      componentProps: {
        type: 'date',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        class: '!w-full',
      },
    },
    {
      fieldName: 'project_participant',
      label: '参与人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入参与人',
      },
    },
    {
      fieldName: 'project_amount',
      label: '项目金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        precision: 2,
        placeholder: '0',
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).optional().default(0),
    },
    {
      fieldName: 'progress',
      label: '进度(%)',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        max: 100,
        precision: 0,
        placeholder: '0-100',
        controlsPosition: 'right',
        class: '!w-full',
      },
      rules: z.number().min(0).max(100).optional().default(0),
    },
    {
      fieldName: 'priority',
      label: '优先级',
      component: 'Select',
      componentProps: {
        options: PROJECT_PRIORITY_OPTIONS.map((item) => ({ ...item })),
        placeholder: '请选择优先级',
        allowClear: true,
        class: '!w-full',
      },
      rules: z.string().optional().default('normal'),
    },
    {
      fieldName: 'location',
      label: '项目地点',
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目地点',
      },
    },
    {
      fieldName: 'contract_id',
      label: '合同ID',
      component: 'Input',
      componentProps: {
        placeholder: '请输入合同ID',
      },
    },
    {
      fieldName: 'project_status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: PROJECT_STATUS_OPTIONS.map((item) => ({ ...item })),
        placeholder: '请选择',
        allowClear: true,
        class: '!w-full',
      },
      rules: z.number().optional().default(0),
    },
    {
      fieldName: 'project_description',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入内容',
        rows: 4,
      },
      formItemClass: 'col-span-2',
    },
  ];
}

export function useProjectManageGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'q',
      label: '关键词',
      component: 'Input',
      componentProps: {
        placeholder: '项目名称 / 编号 / 负责人 / 部门',
        clearable: true,
      },
    },
    {
      fieldName: 'customer_id',
      label: '客户',
      component: 'ApiSelect',
      componentProps: {
        api: getCustomerSimpleList,
        labelField: 'name',
        valueField: 'id',
        placeholder: '请选择客户',
        clearable: true,
      },
    },
    {
      fieldName: 'project_manager_id',
      label: '负责人ID',
      component: 'Input',
      componentProps: {
        placeholder: '请输入负责人ID',
        clearable: true,
      },
    },
    {
      fieldName: 'priority',
      label: '优先级',
      component: 'Select',
      componentProps: {
        options: PROJECT_PRIORITY_OPTIONS.map((item) => ({ ...item })),
        placeholder: '请选择优先级',
        clearable: true,
      },
    },
    {
      fieldName: 'contract_id',
      label: '合同ID',
      component: 'Input',
      componentProps: {
        placeholder: '请输入合同ID',
        clearable: true,
      },
    },
    {
      fieldName: 'project_status',
      label: '状态',
      component: 'Select',
      componentProps: {
        options: PROJECT_STATUS_OPTIONS.map((item) => ({ ...item })),
        placeholder: '请选择状态',
        clearable: true,
      },
    },
  ];
}

export function useProjectManageGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { title: '#', type: 'seq', width: 60, fixed: 'left' },
    {
      title: '项目名称/编号',
      field: 'project_name',
      minWidth: 220,
      fixed: 'left',
      slots: { default: 'name_code' },
    },
    {
      title: '客户',
      field: 'customer_id',
      minWidth: 180,
      slots: { default: 'customer_name' },
    },
    {
      title: '负责人/部门',
      field: 'project_Manager',
      minWidth: 180,
      slots: { default: 'manager_dept' },
    },
    { title: '项目组', field: 'project_group', minWidth: 140 },
    {
      title: '项目期限',
      field: 'project_end_date',
      minWidth: 200,
      slots: { default: 'period' },
    },
    {
      title: '进度',
      field: 'progress',
      minWidth: 100,
      align: 'center',
      slots: { default: 'cell_progress' },
    },
    {
      title: '优先级',
      field: 'priority',
      minWidth: 100,
      align: 'center',
      slots: { default: 'cell_priority' },
    },
    {
      title: '项目地点',
      field: 'location',
      minWidth: 160,
      slots: { default: 'cell_location' },
    },
    {
      title: '金额',
      field: 'project_amount',
      minWidth: 120,
      align: 'right',
      slots: { default: 'cell_project_amount' },
    },
    {
      title: '状态',
      field: 'project_status',
      minWidth: 120,
      align: 'center',
      slots: { default: 'cell_project_status' },
    },
    {
      title: '操作',
      field: 'actions',
      fixed: 'right',
      minWidth: 180,
      slots: { default: 'actions' },
    },
  ];
}
