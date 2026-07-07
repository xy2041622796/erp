<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/cost/view';
import { getProjectManageSimpleList } from '#/api/erp/project/manage';
import ProjectSubmoduleCrudPage from '#/views/erp/project/_shared/ProjectSubmoduleCrudPage.vue';

import { costViewConfig } from './data';

const apis = { listData, getDetail, createData, updateData, deleteData };
const normalizers = {
  async beforeSubmit(values: Record<string, any>) {
    const budgetAmount = Number(values.budget_amount || 0);
    const usedAmount = Number(values.used_amount || 0);
    const normalizedBudget = Number.isFinite(budgetAmount) ? budgetAmount : 0;
    const normalizedUsed = Number.isFinite(usedAmount) ? usedAmount : 0;
    let projectName = values.project_name;

    if (!projectName && values.project_id) {
      const projects = await getProjectManageSimpleList();
      const selected = projects.find((item) => item?.rowid === values.project_id);
      projectName = selected?.project_name || projectName;
    }

    return {
      ...values,
      project_name: projectName,
      budget_amount: normalizedBudget,
      used_amount: normalizedUsed,
      remaining_amount: normalizedBudget > 0 ? Math.max(0, normalizedBudget - normalizedUsed) : 0,
      usage_rate: normalizedBudget > 0 ? Number(((normalizedUsed / normalizedBudget) * 100).toFixed(2)) : 0,
    };
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="costViewConfig" :apis="apis" :normalizers="normalizers" />
</template>
