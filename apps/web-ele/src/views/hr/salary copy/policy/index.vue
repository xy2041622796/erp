<script lang="ts" setup>
import SalaryCrudPage from '../components/SalaryCrudPage.vue';

import { createSalaryPolicy, deleteSalaryPolicy, listSalaryPolicies, updateSalaryPolicy } from '#/api/erp/human-resources/salary/policy';

defineOptions({ name: 'HrSalaryPolicyPage' });

const yearOptions = ['2024', '2023', '2022'].map((item) => ({ label: `${item}年`, value: item }));
const regionOptions = ['北京', '上海', '深圳', '广州'].map((item) => ({ label: item, value: item }));
const policyTypeOptions = ['社保', '公积金', '个税'].map((item) => ({ label: item, value: item }));
const statusOptions = ['生效', '失效'].map((item) => ({ label: item, value: item }));

const columns = [
  { key: 'year', label: '年度', width: 90 },
  { key: 'region', label: '地区', width: 90, tag: true },
  { key: 'policyType', label: '类型', width: 110, tag: true },
  { key: 'title', label: '标题', width: 240 },
  { key: 'effectiveDate', label: '生效日期', width: 120 },
  { key: 'version', label: '版本', width: 120 },
  { key: 'updatedBy', label: '更新人', width: 120 },
  { key: 'status', label: '状态', width: 100, tag: true },
];

const fields = [
  { key: 'year', label: '年度', required: true },
  { key: 'region', label: '地区', type: 'select', required: true, options: regionOptions },
  { key: 'policyType', label: '类型', type: 'select', required: true, options: policyTypeOptions },
  { key: 'status', label: '状态', type: 'select', options: statusOptions },
  { key: 'title', label: '标题', required: true },
  { key: 'effectiveDate', label: '生效日期', type: 'date' },
  { key: 'version', label: '版本', placeholder: 'v2024.1' },
  { key: 'updatedBy', label: '更新人' },
  { key: 'updateDate', label: '更新时间', type: 'date' },
  { key: 'content', label: '内容', type: 'textarea' },
  { key: 'remark', label: '备注', type: 'textarea' },
];

const filters = [
  { key: 'year', label: '年度', type: 'select', options: yearOptions },
  { key: 'region', label: '地区', type: 'select', options: regionOptions },
  { key: 'policyType', label: '类型', type: 'select', options: policyTypeOptions },
];

const initialValues = {
  year: '2024',
  region: '北京',
  policyType: '社保',
  title: '',
  effectiveDate: '',
  version: '',
  content: '',
  updatedBy: '',
  updateDate: '',
  status: '生效',
  remark: '',
};
</script>

<template>
  <SalaryCrudPage
    title="政策更新"
    description="维护社保、公积金、个税等薪酬政策记录。"
    keyword-placeholder="标题 / 内容 / 更新人"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :initial-values="initialValues"
    :status-options="statusOptions"
    :list-api="listSalaryPolicies"
    :create-api="createSalaryPolicy"
    :update-api="updateSalaryPolicy"
    :delete-api="deleteSalaryPolicy"
  />
</template>
