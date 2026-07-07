<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { ExcelSchemeDesigner } from '#/components/excel-scheme-designer';

import EmployeeFormDialog from '#/views/finance/cashier/settings/rank/modules/EmployeeFormDialog.vue';
import RankEmployeePanel from '#/views/finance/cashier/settings/rank/modules/RankEmployeePanel.vue';
import RankFormDialog from '#/views/finance/cashier/settings/rank/modules/RankFormDialog.vue';
import RankItemPanel from '#/views/finance/cashier/settings/rank/modules/RankItemPanel.vue';
import SchemePreviewDialog from '#/views/finance/cashier/settings/rank/modules/SchemePreviewDialog.vue';
import TemplateBindingDialog from '#/views/finance/cashier/settings/rank/modules/TemplateBindingDialog.vue';
import { useRankPage } from '#/views/finance/cashier/settings/rank/modules/useRankPage';

import { ElCol, ElDialog, ElRow } from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierHomeRankPage' });

const page = useRankPage();
const dynamicValueFieldTitle = '工资项值';
</script>

<template>
  <Page auto-content-height>
    <div class="rank-page">
      <el-row :gutter="16">
        <el-col :xs="24" :lg="6">
          <RankEmployeePanel v-model:rank-keyword="page.rankKeyword.value"
            v-model:employee-keyword="page.employeeKeyword.value" v-model:selected-rank-id="page.selectedRankId.value"
            :rank-loading="page.rankLoading.value" :employee-loading="page.employeeLoading.value"
            :rank-list="page.rankList.value" :employee-list="page.employeeList.value"
            :employee-count-map="page.employeeCountMap.value" @query-rank="page.loadRankList"
            @query-employee="page.loadEmployeeList" @create-rank="page.openRankCreate" @edit-rank="page.openRankEdit"
            @remove-rank="page.removeRank" @create-employee="page.openEmployeeCreate"
            @edit-employee="page.openEmployeeEdit" @remove-employee="page.removeEmployee" />
        </el-col>

        <el-col :xs="24" :lg="18">
          <RankItemPanel v-model:item-keyword="page.itemKeyword.value"
            :loading="page.itemLoading.value || page.itemMetaLoading.value" :list="page.filteredRankItemDraftList.value"
            :item-saving="page.itemSaving.value" :scheme-binding-loading="page.schemeBindingLoading.value"
            :scheme-solution-loading="page.schemeSolutionLoading.value"
            :import-template-loading="page.importTemplateLoading.value"
            :export-template-loading="page.exportTemplateLoading.value"
            :selected-rank-dynamic-start-col="page.selectedRankDynamicStartCol.value"
            @toggle-selected="page.handleRankItemSelectedChange" @bind-scheme="page.handleBindScheme"
            @sync-scheme="page.handleBindScheme" @open-preview="page.openSchemePreview" @open-designer="page.openDesigner"
            @open-template-binding="page.openTemplateBindingDialog"
            @download-import-template="page.handleDownloadImportTemplate"
            @download-export-template="page.handleDownloadExportTemplate" @save="page.saveRankItems" />
        </el-col>
      </el-row>

      <TemplateBindingDialog v-model="page.templateBindingVisible.value" :loading="page.templateBindingLoading.value"
        :saving="page.templateBindingSaving.value" :mode="page.templateBindingMode.value"
        :form="page.templateBindingForm" @submit="page.submitTemplateBinding" />

      <SchemePreviewDialog v-model="page.schemePreviewVisible.value" :loading="page.schemeSolutionLoading.value"
        :payload="page.schemePreviewPayload.value" :preview-json="page.schemePreviewJson.value"
        :dynamic-value-field-title="dynamicValueFieldTitle" @confirm="page.confirmGenerateScheme" />

      <RankFormDialog v-model="page.rankDialogVisible.value" :editing="!!page.rankEditingId.value" :form="page.rankForm"
        @submit="page.submitRank" />

      <EmployeeFormDialog v-model="page.employeeDialogVisible.value" :editing="!!page.employeeEditingId.value"
        :selected-rank="page.selectedRank.value" :form="page.employeeForm"
        @staff-change="page.handleEmployeeStaffChange" @submit="page.submitEmployee" />

      <el-dialog v-model="page.designerVisible.value" :title="`${page.currentSchemeName.value} - 方案设计器`" width="92vw"
        top="4vh" destroy-on-close>
        <div class="designer-wrap">
          <ExcelSchemeDesigner :scheme-name="page.currentSchemeName.value" />
        </div>
      </el-dialog>
    </div>
  </Page>
</template>

<style scoped>
.rank-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.designer-wrap {
  height: 76vh;
}
</style>
