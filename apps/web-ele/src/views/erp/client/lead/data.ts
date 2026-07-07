import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export interface AreaOption {
  label: string;
  value: string;
  children?: AreaOption[];
}

export const leadStatusOptions = [
  { label: '新建', value: 0 },
  { label: '跟进中', value: 1 },
  { label: '已转客户', value: 2 },
  { label: '已作废', value: 3 },
];

export const intentLevelOptions = [
  { label: '低', value: 1 },
  { label: '中', value: 2 },
  { label: '高', value: 3 },
];

export const sourceChannelOptions = [
  { label: '官网', value: '官网' },
  { label: '转介绍', value: '转介绍' },
  { label: '活动', value: '活动' },
  { label: '销售录入', value: '销售录入' },
  { label: '其他', value: '其他' },
];

export function useGridFormSchema(
  areaOptions: AreaOption[] = [],
): VbenFormSchema[] {
  return [
    {
      fieldName: 'leadCode',
      label: '线索编号',
      component: 'Input',
      componentProps: { placeholder: '请输入线索编号', allowClear: true },
    },
    {
      fieldName: 'leadName',
      label: '线索名称',
      component: 'Input',
      componentProps: { placeholder: '请输入线索名称', allowClear: true },
    },
    {
      fieldName: 'customerName',
      label: '客户名称',
      component: 'Input',
      componentProps: { placeholder: '请输入客户名称', allowClear: true },
    },
    {
      fieldName: 'contactName',
      label: '联系人',
      component: 'Input',
      componentProps: { placeholder: '请输入联系人', allowClear: true },
    },
    {
      fieldName: 'mobile',
      label: '手机号',
      component: 'Input',
      componentProps: { placeholder: '请输入手机号', allowClear: true },
    },
    {
      fieldName: 'regionCode',
      label: '地区',
      component: 'ApiCascader',
      componentProps: {
        options: areaOptions,
        props: {
          checkStrictly: false,
          emitPath: true,
          value: 'value',
          label: 'label',
          children: 'children',
        },
        clearable: true,
        filterable: true,
        placeholder: '请选择省/市/区',
      },
    },
    {
      fieldName: 'sourceChannel',
      label: '来源',
      component: 'Select',
      componentProps: {
        placeholder: '请选择来源',
        allowClear: true,
        options: sourceChannelOptions,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    { field: 'leadCode', title: '线索编号', minWidth: 150, fixed: 'left' },
    {
      field: 'leadName',
      title: '线索名称',
      minWidth: 180,
      fixed: 'left',
      slots: { default: 'name' },
    },
    { field: 'customerName', title: '客户名称', minWidth: 180 },
    { field: 'contactName', title: '联系人', minWidth: 120 },
    { field: 'mobile', title: '手机号', minWidth: 130 },
    { field: 'region', title: '地区', minWidth: 160 },
    {
      field: 'sourceChannel',
      title: '来源',
      minWidth: 120,
      formatter: ({ cellValue }: any) => formatSourceChannel(cellValue),
    },
    { field: 'ownerUserName', title: '负责人', minWidth: 120 },
    {
      field: 'intentLevel',
      title: '意向等级',
      minWidth: 100,
      formatter: ({ cellValue }: any) => formatIntentLevel(cellValue),
    },
    {
      field: 'lastFollowTime',
      title: '最近跟进时间',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatDateTime(cellValue),
    },
    {
      field: 'nextFollowTime',
      title: '下次跟进时间',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatDateTime(cellValue),
    },
    {
      field: 'lastFollowContent',
      title: '最近跟进摘要',
      minWidth: 220,
      showOverflow: 'tooltip',
    },
    {
      field: 'leadStatus',
      title: '状态',
      minWidth: 120,
      formatter: ({ cellValue }: any) => formatLeadStatus(cellValue),
    },
    {
      title: '操作',
      width: 360,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function formatLeadStatus(value?: number | string) {
  const matched = leadStatusOptions.find(
    (item) => Number(item.value) === Number(value),
  );
  return matched?.label || '-';
}

export function formatIntentLevel(value?: number | string) {
  const matched = intentLevelOptions.find(
    (item) => Number(item.value) === Number(value),
  );
  return matched?.label || '-';
}

export function formatSourceChannel(value?: string) {
  const normalized = String(value || '').trim();
  const matched = sourceChannelOptions.find(
    (item) => String(item.value) === normalized,
  );
  return matched?.label || normalized || '-';
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}
