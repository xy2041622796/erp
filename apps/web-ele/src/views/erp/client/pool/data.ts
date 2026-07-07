export interface PoolSearchForm {
  customerCode: string;
  customerName: string;
  ownerUserName: string;
  poolReason: string;
  regionCode: string[];
  poolTimeRange: string[];
  lastFollowTimeRange: string[];
}

export interface PoolColumn {
  field: string;
  label: string;
  minWidth?: number;
  slot?: 'actions' | 'customerName' | 'datetime' | 'dealStatus';
}

export function createDefaultPoolSearchForm(): PoolSearchForm {
  return {
    customerCode: '',
    customerName: '',
    ownerUserName: '',
    poolReason: '',
    regionCode: [],
    poolTimeRange: [],
    lastFollowTimeRange: [],
  };
}

export const poolTableColumns: PoolColumn[] = [
  {
    field: 'customerName',
    label: '客户名称',
    minWidth: 180,
    slot: 'customerName',
  },
  {
    field: 'region',
    label: '地区',
    minWidth: 160,
  },
  {
    field: 'sourceChannel',
    label: '来源',
    minWidth: 140,
  },
  {
    field: 'beforeOwnerUserName',
    label: '原负责人',
    minWidth: 130,
  },
  {
    field: 'ownerUserName',
    label: '当前负责人',
    minWidth: 130,
  },
  {
    field: 'poolTime',
    label: '进入公海时间',
    minWidth: 170,
    slot: 'datetime',
      formatter: 'formatDateTime',
  },
  {
    field: 'lastFollowTime',
    label: '最近跟进时间',
    minWidth: 170,
    slot: 'datetime',
      formatter: 'formatDateTime',
  },
  {
    field: 'nextFollowTime',
    label: '下次跟进时间',
    minWidth: 170,
    slot: 'datetime',
      formatter: 'formatDateTime',
  },
  {
    field: 'poolReason',
    label: '公海原因',
    minWidth: 200,
  },
  {
    field: 'dealStatus',
    label: '成交状态',
    minWidth: 100,
    slot: 'dealStatus',
  },
];

export const poolLogOperateTypeMap: Record<string, string> = {
  AUTO_IN_POOL: '自动入公海',
  DISTRIBUTE: '分配',
  IN_POOL: '放入公海',
  OUT_POOL: '移出公海',
  RECEIVE: '领取',
  TRANSFER: '转移',
};

export function formatPoolOperateType(value?: string) {
  return (
    poolLogOperateTypeMap[String(value || '').trim()] || String(value || '-')
  );
}

export function formatPoolDealStatus(value?: boolean | number | string) {
  const normalized = String(value ?? '').trim();
  if (normalized === '1' || normalized.toLowerCase() === 'true') {
    return '已成交';
  }
  if (normalized === '0' || normalized.toLowerCase() === 'false') {
    return '未成交';
  }
  return '-';
}

export function formatPoolDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('zh-CN', {
    hour12: false,
  });
}
