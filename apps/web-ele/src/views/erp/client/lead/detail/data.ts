import { formatDateTime, formatIntentLevel, formatLeadStatus } from '../data';

export function useLeadDetailGroups() {
  return [
    {
      title: '基本信息',
      items: [
        { label: '线索编号', field: 'leadCode' },
        { label: '线索名称', field: 'leadName' },
        { label: '联系人', field: 'contactName' },
        { label: '手机号', field: 'mobile' },
        { label: '联系电话', field: 'phone' },
        { label: '邮箱', field: 'email' },
        { label: '地区', field: 'region' },
        { label: '地区编码', field: 'regionCode' },
        { label: '详细地址', field: 'address' },
      ],
    },
    {
      title: '状态信息',
      items: [
        { label: '状态', field: 'leadStatus', formatter: formatLeadStatus },
        { label: '来源', field: 'sourceChannel' },
        { label: '意向等级', field: 'intentLevel', formatter: formatIntentLevel },
        { label: '创建时间', field: 'createtime', formatter: formatDateTime },
        { label: '更新时间', field: 'updatetime', formatter: formatDateTime },
      ],
    },
    {
      title: '归属信息',
      items: [
        { label: '负责人', field: 'ownerUserName' },
        { label: '负责人ID', field: 'ownerUserId' },
        { label: '部门', field: 'departName' },
        { label: '部门ID', field: 'departId' },
      ],
    },
    {
      title: '跟进摘要',
      items: [
        { label: '最近跟进时间', field: 'lastFollowTime', formatter: formatDateTime },
        { label: '下次跟进时间', field: 'nextFollowTime', formatter: formatDateTime },
        { label: '最近跟进摘要', field: 'lastFollowContent' },
        { label: '备注', field: 'description' },
      ],
    },
    {
      title: '转化结果',
      items: [
        { label: '转化时间', field: 'convertTime', formatter: formatDateTime },
        { label: '客户ID', field: 'customerId' },
        { label: '客户编号', field: 'customerCode' },
        { label: '客户名称', field: 'customerName' },
        { label: '联系人ID', field: 'contactId' },
        { label: '商机ID', field: 'businessId' },
      ],
    },
  ];
}
