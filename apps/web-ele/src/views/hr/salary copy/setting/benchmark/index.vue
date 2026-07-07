<script lang="ts" setup>
import SalaryCrudPage from '../../components/SalaryCrudPage.vue';

import { createSalaryBenchmark, deleteSalaryBenchmark, listSalaryBenchmarks, updateSalaryBenchmark } from '#/api/erp/human-resources/salary/setting-benchmark';

defineOptions({ name: 'HrSalarySettingBenchmarkPage' });

const columns = [
  { key: 'benchmarkCode', label: '编号', width: 150 },
  { key: 'position', label: '岗位', width: 160 },
  { key: 'industry', label: '行业', width: 140 },
  { key: 'region', label: '地区', width: 120, tag: true },
  { key: 'marketMin', label: '市场最低', width: 120 },
  { key: 'marketMax', label: '市场最高', width: 120 },
  { key: 'marketMid', label: '市场中位', width: 120 },
  { key: 'ourSalary', label: '我方薪资', width: 120 },
  { key: 'percentile', label: '分位', width: 100 },
];

const fields = [
  { key: 'benchmarkCode', label: '编号', disabled: true, placeholder: '保存后自动生成' },
  { key: 'position', label: '岗位', required: true },
  { key: 'industry', label: '行业' },
  { key: 'region', label: '地区' },
  { key: 'marketMin', label: '市场最低', type: 'number' },
  { key: 'marketMax', label: '市场最高', type: 'number' },
  { key: 'marketMid', label: '市场中位', type: 'number' },
  { key: 'ourSalary', label: '我方薪资', type: 'number' },
  { key: 'percentile', label: '分位(0-100)', type: 'number' },
];

const initialValues = {
  benchmarkCode: '',
  position: '',
  industry: '',
  region: '',
  marketMin: '',
  marketMax: '',
  marketMid: '',
  ourSalary: '',
  percentile: '',
};
</script>

<template>
  <SalaryCrudPage
    title="薪酬对标"
    description="维护岗位、行业、地区市场薪酬区间与我方薪资分位。"
    keyword-placeholder="编号 / 岗位 / 行业 / 地区"
    :columns="columns"
    :fields="fields"
    :initial-values="initialValues"
    :list-api="listSalaryBenchmarks"
    :create-api="createSalaryBenchmark"
    :update-api="updateSalaryBenchmark"
    :delete-api="deleteSalaryBenchmark"
  />
</template>
