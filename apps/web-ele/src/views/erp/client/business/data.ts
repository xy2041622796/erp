import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export const BUSINESS_STAGE_OPTIONS = [
  { label: '初步接触', value: 0 },
  { label: '需求确认', value: 1 },
  { label: '方案报价', value: 2 },
  { label: '商务谈判', value: 3 },
  { label: '赢单', value: 4 },
  { label: '输单', value: 5 },
];

export const BUSINESS_STATUS_OPTIONS = [
  { label: '跟进中', value: 0 },
  { label: '赢单', value: 1 },
  { label: '输单', value: 2 },
  { label: '关闭', value: 3 },
];

export const SUCCESS_RATE_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((item) => ({
  label: `${item}%`,
  value: item,
}));

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'businessCode',
      label: '商机编号',
      component: 'Input',
      componentProps: {
        placeholder: '请输入商机编号',
        allowClear: true,
      },
    },
    {
      fieldName: 'businessName',
      label: '商机名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入商机名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'customerName',
      label: '客户名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入客户名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'primaryContactName',
      label: '主联系人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入主联系人',
        allowClear: true,
      },
    },
    {
      fieldName: 'ownerUserName',
      label: '负责人',
      component: 'Input',
      componentProps: {
        placeholder: '请输入负责人',
        allowClear: true,
      },
    },
    {
      fieldName: 'businessStage',
      label: '商机阶段',
      component: 'Select',
      componentProps: {
        options: BUSINESS_STAGE_OPTIONS,
        placeholder: '请选择商机阶段',
        allowClear: true,
      },
    },
    {
      fieldName: 'businessStatus',
      label: '商机状态',
      component: 'Select',
      componentProps: {
        options: BUSINESS_STATUS_OPTIONS,
        placeholder: '请选择商机状态',
        allowClear: true,
      },
    },
    {
      fieldName: 'sourceLeadName',
      label: '来源线索',
      component: 'Input',
      componentProps: {
        placeholder: '请输入来源线索',
        allowClear: true,
      },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      type: 'seq',
      title: '序号',
      width: 60,
      fixed: 'left',
    },
    {
      field: 'businessCode',
      title: '商机编号',
      fixed: 'left',
      minWidth: 150,
    },
    {
      field: 'businessName',
      title: '商机名称',
      fixed: 'left',
      minWidth: 180,
      slots: { default: 'name' },
    },
    {
      field: 'customerName',
      title: '客户名称',
      minWidth: 180,
      slots: { default: 'customerName' },
    },
    {
      field: 'primaryContactName',
      title: '主联系人',
      minWidth: 130,
    },
    {
      field: 'sourceLeadName',
      title: '来源线索',
      minWidth: 180,
    },
    {
      field: 'amount',
      title: '商机金额（元）',
      minWidth: 140,
      formatter: ({ cellValue }: any) => formatAmount(cellValue),
    },
    {
      field: 'expectedSignDate',
      title: '预计成交日期',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatDateTime(cellValue),
    },
    {
      field: 'successRate',
      title: '成交概率',
      minWidth: 110,
      formatter: ({ cellValue }: any) => formatPercent(cellValue),
    },
    {
      field: 'ownerUserName',
      title: '负责人',
      minWidth: 120,
    },
    {
      field: 'departName',
      title: '所属部门',
      minWidth: 120,
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
      field: 'businessStage',
      title: '商机阶段',
      minWidth: 120,
      formatter: ({ cellValue }: any) => formatBusinessStage(cellValue),
    },
    {
      field: 'businessStatus',
      title: '商机状态',
      minWidth: 120,
      formatter: ({ cellValue }: any) => formatBusinessStatus(cellValue),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}

export function formatBusinessStage(value?: number | string) {
  return BUSINESS_STAGE_OPTIONS.find((item) => String(item.value) === String(value))?.label || '-';
}

export function formatBusinessStatus(value?: number | string) {
  return BUSINESS_STATUS_OPTIONS.find((item) => String(item.value) === String(value))?.label || '-';
}

export function formatPercent(value?: number | string) {
  if (value === undefined || value === null || value === '') return '-';
  return `${value}%`;
}

export function formatAmount(value?: number | string) {
  if (value === undefined || value === null || value === '') return '-';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return amount.toFixed(2);
}

export function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('zh-CN');
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN');
}

export function isBusinessReadonly(status?: number | string) {
  return Number(status || 0) !== 0;
}

export function canEditBusiness(status?: number | string) {
  return Number(status || 0) === 0;
}

export function canDeleteBusiness(status?: number | string) {
  return Number(status || 0) === 0;
}
