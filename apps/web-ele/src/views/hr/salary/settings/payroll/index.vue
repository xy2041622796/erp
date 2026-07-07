<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import PayrollCommonItemDialog from './components/PayrollCommonItemDialog.vue';
import PayrollEditDialog from './components/PayrollEditDialog.vue';
import PayrollTableCard from './components/PayrollTableCard.vue';
import { usePayrollPage } from './usePayrollPage';

defineOptions({ name: 'ErpFinanceCashierPayrollPage' });

const {
  loading,
  submitLoading,
  commonItemLoading,
  commonItemDialogVisible,
  commonItemInitLoading,
  dialogVisible,
  editDialogRef,
  queryForm,
  editForm,
  rules,
  dialogTitle,
  commonItemTemplateCandidates,
  effectiveTotal,
  pagedList,
  categoryOptions,
  directionOptions,
  inputModeOptions,
  dataTypeOptions,
  unitOptions,
  defaultSourceOptions,
  displayOptions,
  permissionOptions,
  visibleScopeOptions,
  editableScopeOptions,
  handleSearch,
  handleReset,
  handleOpenCommonItemDialog,
  handleCreate,
  handleEdit,
  handleDelete,
  handleCreateCommonItem,
  handleCreateAllCommonItems,
  handleSubmit,
  handleCategoryChange,
  handleNameBlur,
  handleSizeChange,
  handleCurrentChange,
} = usePayrollPage();
</script>

<template>
  <Page auto-content-height>
    <div class="salary-meta-page">
      <PayrollTableCard
        :loading="loading"
        :list="pagedList"
        :total="effectiveTotal"
        :page-no="queryForm.pageNo"
        :page-size="queryForm.page"
        :common-item-init-loading="commonItemInitLoading"
        :query-form="queryForm"
        :category-options="categoryOptions"
        :direction-options="directionOptions"
        :input-mode-options="inputModeOptions"
        :data-type-options="dataTypeOptions"
        :unit-options="unitOptions"
        :display-options="displayOptions"
        :visible-scope-options="visibleScopeOptions"
        :editable-scope-options="editableScopeOptions"
        @open-common-items="handleOpenCommonItemDialog"
        @search="handleSearch"
        @reset="handleReset"
        @create="handleCreate"
        @edit="handleEdit"
        @delete="handleDelete"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />

      <PayrollCommonItemDialog
        v-model:visible="commonItemDialogVisible"
        :candidates="commonItemTemplateCandidates"
        :loading="commonItemLoading"
        :category-options="categoryOptions"
        :direction-options="directionOptions"
        :input-mode-options="inputModeOptions"
        @create-item="handleCreateCommonItem"
        @create-all="handleCreateAllCommonItems"
      />

      <PayrollEditDialog
        ref="editDialogRef"
        v-model:visible="dialogVisible"
        :title="dialogTitle"
        :submit-loading="submitLoading"
        :edit-form="editForm"
        :rules="rules"
        :category-options="categoryOptions"
        :direction-options="directionOptions"
        :input-mode-options="inputModeOptions"
        :data-type-options="dataTypeOptions"
        :unit-options="unitOptions"
        :default-source-options="defaultSourceOptions"
        :display-options="displayOptions"
        :permission-options="permissionOptions"
        :visible-scope-options="visibleScopeOptions"
        :editable-scope-options="editableScopeOptions"
        @category-change="handleCategoryChange"
        @name-blur="handleNameBlur"
        @submit="handleSubmit"
      />
    </div>
  </Page>
</template>

<style scoped>
.salary-meta-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
