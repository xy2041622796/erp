<script lang="ts" setup>
import SalaryCrudPage from '../../components/SalaryCrudPage.vue';

import { createDualSign, deleteDualSign, listDualSigns, updateDualSign } from '#/api/erp/human-resources/salary/setting-dual-sign';

defineOptions({ name: 'HrSalarySettingDualSignPage' });

const statusOptions = ['待处理', '进行中', '已完成', '已驳回'].map((item) => ({ label: item, value: item }));
const signOptions = ['待签批', '已签批'].map((item) => ({ label: item, value: item }));

const columns = [
  { key: 'dualSignCode', label: '编号', width: 150 },
  { key: 'employee', label: '员工', width: 120 },
  { key: 'position', label: '岗位', width: 150 },
  { key: 'salaryChange', label: '薪资变动', width: 180 },
  { key: 'hrbpSign', label: 'HRBP', width: 110, tag: true },
  { key: 'hrbpDate', label: 'HRBP日期', width: 120 },
  { key: 'leaderSign', label: '领导', width: 110, tag: true },
  { key: 'leaderDate', label: '领导日期', width: 120 },
  { key: 'status', label: '状态', width: 110, tag: true },
];

const fields = [
  { key: 'dualSignCode', label: '编号', disabled: true, placeholder: '保存后自动生成' },
  { key: 'employee', label: '员工', required: true },
  { key: 'position', label: '岗位', required: true },
  { key: 'salaryChange', label: '变动说明', placeholder: '22K → 25K' },
  { key: 'hrbpSign', label: 'HRBP签批', type: 'select', options: signOptions },
  { key: 'hrbpDate', label: 'HRBP日期', type: 'date' },
  { key: 'leaderSign', label: '领导签批', type: 'select', options: signOptions },
  { key: 'leaderDate', label: '领导日期', type: 'date' },
  { key: 'status', label: '状态', type: 'select', options: statusOptions },
];

const initialValues = {
  dualSignCode: '',
  employee: '',
  position: '',
  salaryChange: '',
  hrbpSign: '待签批',
  hrbpDate: '',
  leaderSign: '待签批',
  leaderDate: '',
  status: '待处理',
};
</script>

<template>
  <SalaryCrudPage
    title="双签留痕"
    description="维护薪资变动 HRBP 与领导双签记录。"
    keyword-placeholder="编号 / 员工 / 岗位"
    :columns="columns"
    :fields="fields"
    :initial-values="initialValues"
    :status-options="statusOptions"
    :list-api="listDualSigns"
    :create-api="createDualSign"
    :update-api="updateDualSign"
    :delete-api="deleteDualSign"
  />
</template>
