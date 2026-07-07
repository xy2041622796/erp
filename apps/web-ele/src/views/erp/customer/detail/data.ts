import type { VbenFormSchema } from '#/adapter/form';
import type { DescriptionItemSchema } from '#/components/description';

import { h } from 'vue';

import { DICT_TYPE } from '@vben/constants';
import { useUserStore } from '@vben/stores';

import { getSimpleUserList } from '#/api/system/user';
import { DictTag } from '#/components/dict-tag';

export function useDistributeFormSchema(): VbenFormSchema[] {
  const userStore = useUserStore();
  return [
    {
      component: 'Input',
      fieldName: 'id',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'ownerUserId',
      label: '负责人',
      component: 'ApiSelect',
      componentProps: {
        api: getSimpleUserList,
        labelField: 'nickname',
        valueField: 'id',
      },
      defaultValue: userStore.userInfo?.id,
      rules: 'required',
    },
  ];
}

export function useDetailSchema(): DescriptionItemSchema[] {
  return [
    {
      field: 'dealStatus',
      label: '成交状态',
      render: (val) => (val ? '已成交' : '未成交'),
    },
    {
      field: 'isPool',
      label: '公海状态',
      render: (val) => (Number(val || 0) === 1 ? '公海中' : '非公海'),
    },
    {
      field: 'sourceLeadName',
      label: '来源线索',
    },
    {
      field: 'lastFollowContent',
      label: '最近跟进摘要',
    },
  ];
}

export function useDetailBaseSchema(): DescriptionItemSchema[] {
  return [
    {
      field: 'customerCode',
      label: '客户/供应商编号',
    },
    {
      field: 'name',
      label: '名称',
    },
    {
      field: 'ownerUserName',
      label: '负责人',
    },
    {
      field: 'departName',
      label: '归属部门',
    },
    {
      field: 'dealStatus',
      label: '成交状态',
      render: (val) => (val ? '已成交' : '未成交'),
    },
    {
      field: 'isPool',
      label: '公海状态',
      render: (val) => (Number(val || 0) === 1 ? '公海中' : '非公海'),
    },
    {
      field: 'poolTime',
      label: '进入公海时间',
      formatter: 'formatDateTime',
    },
    {
      field: 'poolReason',
      label: '公海原因',
    },
    {
      field: 'sourceLeadName',
      label: '来源线索',
    },
    {
      field: 'lastFollowTime',
      label: '最近跟进时间',
      formatter: 'formatDateTime',
    },
    {
      field: 'nextFollowTime',
      label: '下次跟进时间',
      formatter: 'formatDateTime',
    },
    {
      field: 'lastFollowContent',
      label: '最近跟进摘要',
    },
    {
      field: 'companyType',
      label: '主体类型',
      render: (val) =>
        h(DictTag, {
          type: DICT_TYPE.CRM_CUSTOMER_SOURCE,
          value: val,
        }),
    },
  ];
}
