<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { AssetDepreciationRecord } from '#/api/erp/finance/assets/summary';

import { computed, reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
} from 'element-plus';

import { fetchAssetSimpleList } from '#/api/erp/finance/assets/manage';
import { saveAssetDepreciation } from '#/api/erp/finance/assets/summary';

const props = defineProps<{
  data?: AssetDepreciationRecord | null;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  success: [data: AssetDepreciationRecord];
  'update:modelValue': [value: boolean];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const assetOptions = ref<AssetRecord[]>([]);
const editForm = reactive<AssetDepreciationRecord>({
  id: '',
  asset_id: '',
  asset_code: '',
  asset_name: '',
  depreciation_period: '',
  depreciation_date: '',
  depreciation_method: '平均年限法',
  original_value: 0,
  opening_accumulated_depreciation: 0,
  current_depreciation: 0,
  accumulated_depreciation: 0,
  net_asset_value: 0,
  residual_value: 0,
  depreciation_month: 0,
  depreciated_months: 0,
  remaining_months: 0,
  voucher_generated: 0,
  voucher_no: '',
  voucher_date: '',
  depreciation_status: 0,
  remark: '',
});

const dialogTitle = computed(() =>
  editForm.id ? '编辑折旧记录' : '新增折旧记录',
);

function resetForm() {
  Object.assign(editForm, {
    id: '',
    asset_id: '',
    asset_code: '',
    asset_name: '',
    depreciation_period: '',
    depreciation_date: '',
    depreciation_method: '平均年限法',
    original_value: 0,
    opening_accumulated_depreciation: 0,
    current_depreciation: 0,
    accumulated_depreciation: 0,
    net_asset_value: 0,
    residual_value: 0,
    depreciation_month: 0,
    depreciated_months: 0,
    remaining_months: 0,
    voucher_generated: 0,
    voucher_no: '',
    voucher_date: '',
    depreciation_status: 0,
    remark: '',
    lingma_sys_key: '',
  });
}

async function loadAssetOptions() {
  assetOptions.value = await fetchAssetSimpleList();
}

function onAssetChange(id: string) {
  const item = assetOptions.value.find(
    (x) => String(x.id || x.rowid || '') === String(id || ''),
  );
  editForm.asset_id = String(item?.id || item?.rowid || '') || '';
  editForm.asset_code = String(item?.asset_code || '');
  editForm.asset_name = String(item?.asset_name || '');
  editForm.depreciation_method = String(
    item?.depreciation_method || '平均年限法',
  );
  editForm.original_value = Number(item?.purchase_price || 0);
  editForm.opening_accumulated_depreciation = Number(
    item?.opening_accumulated_depreciation || 0,
  );
  editForm.accumulated_depreciation = Number(
    item?.accumulated_depreciation || 0,
  );
  editForm.net_asset_value = Number(item?.net_asset_value || 0);
  editForm.depreciation_month = Number(item?.depreciation_month || 0);
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    await loadAssetOptions();
    resetForm();
    if (props.data) {
      Object.assign(editForm, props.data, {
        id: String(props.data.id || props.data.rowid || ''),
      });
    }
  },
  { immediate: true },
);

async function onSave() {
  try {
    const savedData = { ...editForm };
    const res = await saveAssetDepreciation(savedData);
    ElMessage.success('保存成功');
    emit('success', { ...savedData, id: savedData.id || res.id });
    showDialog.value = false;
  } catch (error: any) {
    console.error(error);
    ElMessage.error(error?.message || '保存失败');
  }
}
</script>

<template>
  <ElDialog
    v-model="showDialog"
    :title="dialogTitle"
    width="min(57.5rem, 92vw)"
    destroy-on-close
  >
    <ElForm label-width="120px">
      <div class="grid grid-cols-2 gap-x-4">
        <ElFormItem label="资产">
          <ElSelect
            v-model="editForm.asset_id"
            class="w-full"
            filterable
            @change="onAssetChange"
          >
            <ElOption
              v-for="item in assetOptions"
              :key="String(item.id || item.rowid || '')"
              :label="`${item.asset_code || ''} ${item.asset_name || ''}`"
              :value="String(item.id || item.rowid || '')"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="折旧期间" required>
          <ElDatePicker
            v-model="(editForm as any).depreciation_period"
            type="month"
            value-format="YYYY-MM"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="计提日期">
          <ElDatePicker
            v-model="(editForm as any).depreciation_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="折旧方法">
          <ElInput v-model="editForm.depreciation_method" />
        </ElFormItem>
        <ElFormItem label="资产原值">
          <ElInputNumber
            v-model="(editForm as any).original_value"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="期初累计折旧">
          <ElInputNumber
            v-model="(editForm as any).opening_accumulated_depreciation"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="本期折旧">
          <ElInputNumber
            v-model="(editForm as any).current_depreciation"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="累计折旧">
          <ElInputNumber
            v-model="(editForm as any).accumulated_depreciation"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="资产净值">
          <ElInputNumber
            v-model="(editForm as any).net_asset_value"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="预计残值">
          <ElInputNumber
            v-model="(editForm as any).residual_value"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="折旧期限(月)">
          <ElInputNumber
            v-model="(editForm as any).depreciation_month"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="已折旧月数">
          <ElInputNumber
            v-model="(editForm as any).depreciated_months"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="剩余月数">
          <ElInputNumber
            v-model="(editForm as any).remaining_months"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="凭证号">
          <ElInput v-model="editForm.voucher_no" />
        </ElFormItem>
        <ElFormItem label="凭证日期">
          <ElDatePicker
            v-model="(editForm as any).voucher_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="已生成凭证">
          <ElSwitch
            v-model="(editForm as any).voucher_generated"
            :active-value="1"
            :inactive-value="0"
          />
        </ElFormItem>
        <ElFormItem label="折旧状态">
          <ElSelect v-model="editForm.depreciation_status" class="w-full">
            <ElOption :value="0" label="未计提" />
            <ElOption :value="1" label="已计提" />
            <ElOption :value="2" label="已冲回" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem class="col-span-2" label="备注">
          <ElInput v-model="editForm.remark" type="textarea" :rows="3" />
        </ElFormItem>
      </div>
    </ElForm>
    <template #footer>
      <ElButton @click="showDialog = false">取消</ElButton>
      <ElButton type="primary" @click="onSave">保存</ElButton>
    </template>
  </ElDialog>
</template>
