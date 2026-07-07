import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

export interface PoolSearchForm {
  leadCode: string;
  leadName: string;
  customerName: string;
  contactName: string;
  ownerUserName: string;
  poolReason: string;
  poolTimeRange: string[];
  lastFollowTimeRange: string[];
}

export function createDefaultPoolSearchForm(): PoolSearchForm {
  return {
    leadCode: '',
    leadName: '',
    customerName: '',
    contactName: '',
    ownerUserName: '',
    poolReason: '',
    poolTimeRange: [],
    lastFollowTimeRange: [],
  };
}

export function useGridFormSchema(): VbenFormSchema[] {
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
      fieldName: 'ownerUserName',
      label: '原负责人',
      component: 'Input',
      componentProps: { placeholder: '请输入原负责人', allowClear: true },
    },
    {
      fieldName: 'poolReason',
      label: '公海原因',
      component: 'Input',
      componentProps: { placeholder: '请输入公海原因', allowClear: true },
    },
  ];
}

export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    { type: 'checkbox', width: 50, fixed: 'left' },
    { type: 'seq', title: '序号', width: 60, fixed: 'left' },
    { field: 'customerName', title: '客户名称', minWidth: 180, fixed: 'left' },
    { field: 'sourceChannel', title: '来源', minWidth: 140 },
    { field: 'leadCode', title: '线索编号', minWidth: 160 },
    { field: 'leadName', title: '线索名称', minWidth: 180, slots: { default: 'leadName' } },
    { field: 'contactName', title: '联系人', minWidth: 130 },
    { field: 'beforeOwnerUserName', title: '原负责人', minWidth: 130 },
    { field: 'ownerUserName', title: '当前负责人', minWidth: 130 },
    {
      field: 'poolTime',
      title: '进入公海时间',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatPoolDateTime(cellValue),
    },
    {
      field: 'lastFollowTime',
      title: '最近跟进时间',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatPoolDateTime(cellValue),
    },
    {
      field: 'nextFollowTime',
      title: '下次跟进时间',
      minWidth: 170,
      formatter: ({ cellValue }: any) => formatPoolDateTime(cellValue),
    },
    { field: 'poolReason', title: '公海原因', minWidth: 220 },
    {
      field: 'leadStatus',
      title: '状态',
      minWidth: 120,
      formatter: ({ cellValue }: any) => formatPoolLeadStatus(cellValue),
    },
    { title: '操作', width: 260, fixed: 'right', slots: { default: 'actions' } },
  ];
}

export const poolLogOperateTypeMap: Record<string, string> = {
  CONVERT_TO_CUSTOMER: '转正式客户',
  DISTRIBUTE: '分配',
  IN_POOL: '进入公海',
  OUT_POOL: '移出公海',
  RECEIVE: '领取',
  TRANSFER: '转移',
};

export function formatPoolOperateType(value?: string) {
  return poolLogOperateTypeMap[String(value || '').trim()] || String(value || '-');
}

export function formatPoolLeadStatus(value?: boolean | number | string) {
  const normalized = Number(value || 0);
  if (normalized === 2) return '已转客户';
  if (normalized === 3) return '已作废';
  return '跟进中';
}

export function formatPoolDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
}
