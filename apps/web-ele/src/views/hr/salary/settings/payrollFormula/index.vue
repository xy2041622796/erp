<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import PayrollFormulaEditDialog from './components/PayrollFormulaEditDialog.vue';
import PayrollFormulaTableCard from './components/PayrollFormulaTableCard.vue';
import PayrollFormulaTemplateDialog from './components/PayrollFormulaTemplateDialog.vue';
import { usePayrollFormulaPage } from './usePayrollFormulaPage';

defineOptions({ name: 'ErpFinanceCashierPayrollFormulaPage' });

const {
  loading,
  templateLoading,
  templateDialogVisible,
  dialogVisible,
  editDialogRef,
  targetItemOptions,
  selectedFormulaPreset,
  selectedSourceFields,
  selectedSourceFieldLimit,
  showAdvanced,
  currentAccountSetId,
  queryForm,
  pageData,
  editForm,
  rules,
  currentPresetTip,
  generatedFormulaExpr,
  selectedTargetLabel,
  selectedSourceFieldLabels,
  availableSourceFieldOptions,
  commonFormulaTemplateCandidates,
  canSubmit,
  dialogTitle,
  formulaPresetOptions,
  roundModeOptions,
  handleSearch,
  handleReset,
  handleOpenTemplateDialog,
  handleCreate,
  handleEdit,
  handleDelete,
  handlePresetChange,
  handleGenerateTemplate,
  handleGenerateAllTemplates,
  handleSubmit,
  handleSizeChange,
  handleCurrentChange,
} = usePayrollFormulaPage();
</script>

<template>
  <Page auto-content-height>
    <div class="salary-formula-page">
      <PayrollFormulaTableCard
        :loading="loading"
        :list="pageData.list"
        :total="pageData.total"
        :page-no="queryForm.pageNo"
        :page-size="queryForm.page"
        :target-item-options="targetItemOptions"
        :query-form="queryForm"
        @open-templates="handleOpenTemplateDialog"
        @create="handleCreate"
        @search="handleSearch"
        @reset="handleReset"
        @edit="handleEdit"
        @delete="handleDelete"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />

      <PayrollFormulaTemplateDialog
        v-model:visible="templateDialogVisible"
        :loading="templateLoading"
        :current-account-set-id="currentAccountSetId"
        :candidates="commonFormulaTemplateCandidates"
        @generate="handleGenerateTemplate"
        @generate-all="handleGenerateAllTemplates"
      />

      <PayrollFormulaEditDialog
        ref="editDialogRef"
        v-model:visible="dialogVisible"
        v-model:selected-formula-preset="selectedFormulaPreset"
        v-model:selected-source-fields="selectedSourceFields"
        v-model:show-advanced="showAdvanced"
        :title="dialogTitle"
        :can-submit="canSubmit"
        :edit-form="editForm"
        :rules="rules"
        :target-item-options="targetItemOptions"
        :available-source-field-options="availableSourceFieldOptions"
        :formula-preset-options="formulaPresetOptions"
        :round-mode-options="roundModeOptions"
        :selected-source-field-limit="selectedSourceFieldLimit"
        :current-preset-tip="currentPresetTip"
        :selected-target-label="selectedTargetLabel"
        :selected-source-field-labels="selectedSourceFieldLabels"
        :generated-formula-expr="generatedFormulaExpr"
        @preset-change="handlePresetChange"
        @submit="handleSubmit"
      />
    </div>
  </Page>
</template>

<style scoped>
.salary-formula-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
