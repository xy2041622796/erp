export const WORKDAY_STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '已计算', value: '已计算' },
  { label: '未加入成员管理', value: '未加入成员管理' },
  { label: '未配置单价', value: '未配置单价' },
  { label: '保留历史成本', value: '保留历史成本' },
  { label: 'inactive', value: 'inactive' },
] as const;

export function getMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
