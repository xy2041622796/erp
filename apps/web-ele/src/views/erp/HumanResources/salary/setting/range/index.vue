<script lang="ts" setup>
import SalaryCrudPage from '../../components/SalaryCrudPage.vue';

import { createSalaryRange, deleteSalaryRange, listSalaryRanges, updateSalaryRange } from '#/api/erp/human-resources/salary/setting-range';

defineOptions({ name: 'HrSalarySettingRangePage' });

const statusOptions = ['有效', '停用'].map((item) => ({ label: item, value: item }));

const columns = [
  { key: 'rangeCode', label: '区间编号', width: 150 },
  { key: 'jobLevel', label: '职级', width: 110 },
  { key: 'positionType', label: '岗位类型', width: 150 },
  { key: 'minSalary', label: '最低', width: 110 },
  { key: 'maxSalary', label: '最高', width: 110 },
  { key: 'midSalary', label: '中位', width: 110 },
  { key: 'updatedBy', label: '更新人', width: 120 },
  { key: 'updateDate', label: '更新日期', width: 130 },
  { key: 'status', label: '状态', width: 100, tag: true },
];

const fields = [
  { key: 'rangeCode', label: '区间编号', disabled: true, placeholder: '保存后自动生成' },
  { key: 'jobLevel', label: '职级', required: true, placeholder: '如 P5' },
  { key: 'positionType', label: '岗位类型', required: true, placeholder: '如 技术序列' },
  { key: 'minSalary', label: '最低薪资', type: 'number' },
  { key: 'maxSalary', label: '最高薪资', type: 'number' },
  { key: 'midSalary', label: '中位薪资', type: 'number' },
  { key: 'updatedBy', label: '更新人' },
  { key: 'updateDate', label: '更新日期', type: 'date' },
  { key: 'status', label: '状态', type: 'select', options: statusOptions },
];

const initialValues = {
  rangeCode: '',
  jobLevel: '',
  positionType: '',
  minSalary: '',
  maxSalary: '',
  midSalary: '',
  updatedBy: '',
  updateDate: '',
  status: '有效',
};
</script>

<template>
  <SalaryCrudPage
    title="薪资区间"
    description="维护职级、岗位类型与薪资上下限、中位值。"
    keyword-placeholder="区间编号 / 职级 / 岗位类型"
    :columns="columns"
    :fields="fields"
    :initial-values="initialValues"
    :status-options="statusOptions"
    :list-api="listSalaryRanges"
    :create-api="createSalaryRange"
    :update-api="updateSalaryRange"
    :delete-api="deleteSalaryRange"
  />
</template>
