<script lang="ts" setup>
import SalaryCrudPage from '../components/SalaryCrudPage.vue';

import { createSalaryReport, deleteSalaryReport, listSalaryReports, updateSalaryReport } from '#/api/erp/human-resources/salary/report';

defineOptions({ name: 'HrSalaryReportPage' });

const yearOptions = ['2024', '2023'].map((item) => ({ label: `${item}年`, value: item }));
const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((item) => ({ label: `${Number(item)}月`, value: item }));
const reportTypeOptions = ['工资表', '个税表', '社保表', '分析报表'].map((item) => ({ label: item, value: item }));
const statusOptions = ['已生成', '草稿', '已归档'].map((item) => ({ label: item, value: item }));

const columns = [
  { key: 'reportId', label: '报表编号', width: 150 },
  { key: 'reportName', label: '报表名称', width: 260 },
  { key: 'reportType', label: '类型', width: 120, tag: true },
  { key: 'period', label: '周期', width: 110 },
  { key: 'generateDate', label: '生成日期', width: 130 },
  { key: 'generator', label: '生成人', width: 120 },
  { key: 'downloadCount', label: '下载次数', width: 110 },
  { key: 'status', label: '状态', width: 110, tag: true },
];

const fields = [
  { key: 'reportId', label: '报表编号', placeholder: '可不填，系统自动生成' },
  { key: 'reportName', label: '报表名称', required: true },
  { key: 'reportType', label: '报表类型', type: 'select', options: reportTypeOptions },
  { key: 'year', label: '年度', type: 'select', options: yearOptions },
  { key: 'month', label: '月份', type: 'select', options: monthOptions },
  { key: 'generateDate', label: '生成日期', type: 'date', required: true },
  { key: 'generator', label: '生成人' },
  { key: 'downloadCount', label: '下载次数', type: 'number' },
  { key: 'status', label: '状态', type: 'select', options: statusOptions },
  { key: 'remark', label: '备注', type: 'textarea' },
];

const filters = [
  { key: 'year', label: '年度', type: 'select', options: yearOptions },
  { key: 'month', label: '月份', type: 'select', options: monthOptions },
  { key: 'reportType', label: '类型', type: 'select', options: reportTypeOptions },
];

const initialValues = {
  reportId: '',
  reportName: '',
  reportType: '工资表',
  year: '2024',
  month: '01',
  generateDate: '',
  generator: '',
  downloadCount: 0,
  status: '已生成',
  remark: '',
};
</script>

<template>
  <SalaryCrudPage
    title="薪酬报表"
    description="维护工资表、个税表、社保表和分析报表记录。"
    keyword-placeholder="报表名 / 编号 / 生成人"
    :columns="columns"
    :fields="fields"
    :filters="filters"
    :initial-values="initialValues"
    :status-options="statusOptions"
    :list-api="listSalaryReports"
    :create-api="createSalaryReport"
    :update-api="updateSalaryReport"
    :delete-api="deleteSalaryReport"
  />
</template>
