<script lang="ts" setup>
import type { AssetChangeRecord } from '#/api/erp/finance/assets/check-ledger';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';

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

import {
  createAssetChange,
  fetchAssetChange,
  updateAssetChange,
} from '#/api/erp/finance/assets/check-ledger';
import { fetchAssetSimpleList } from '#/api/erp/finance/assets/manage';
import { getLocalDate, getLocalMonth } from '#/views/finance/assets/utils';

const props = defineProps<{
  data?: AssetChangeRecord | null;
  modelValue: boolean;
}>();

const emit = defineEmits<{
  success: [row: AssetChangeRecord];
  'update:modelValue': [value: boolean];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const assetOptions = ref<AssetRecord[]>([]);
const editForm = reactive<AssetChangeRecord>({
  id: '',
  asset_id: '',
  asset_code: '',
  asset_name: '',
  change_type: '',
  change_date: '',
  change_period: '',
  change_reason: '',
  before_value: 0,
  change_amount: 0,
  after_value: 0,
  before_depreciation_month: 0,
  after_depreciation_month: 0,
  before_residual_rate: 0,
  after_residual_rate: 0,
  voucher_generated: 0,
  voucher_no: '',
  voucher_date: '',
  remark: '',
});

const dialogTitle = computed(() =>
  editForm.id ? '编辑资产台账' : '新增资产台账',
);

function getCurrentMonth() {
  return getLocalMonth();
}

function getToday() {
  return getLocalDate();
}

function resetForm() {
  Object.assign(editForm, {
    id: '',
    asset_id: '',
    asset_code: '',
    asset_name: '',
    change_type: '',
    change_date: getToday(),
    change_period: getCurrentMonth(),
    change_reason: '',
    before_value: 0,
    change_amount: 0,
    after_value: 0,
    before_depreciation_month: 0,
    after_depreciation_month: 0,
    before_residual_rate: 0,
    after_residual_rate: 0,
    voucher_generated: 0,
    voucher_no: '',
    voucher_date: '',
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
  editForm.before_value = Number(item?.purchase_price || 0);
  editForm.after_value = Number(item?.purchase_price || 0);
  editForm.before_depreciation_month = Number(item?.depreciation_month || 0);
  editForm.after_depreciation_month = Number(item?.depreciation_month || 0);
  editForm.before_residual_rate = Number(item?.residual_rate || 0);
  editForm.after_residual_rate = Number(item?.residual_rate || 0);
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
    const data = { ...editForm };
    const saved = data.id
      ? await updateAssetChange(data)
      : await createAssetChange(data);
    const latest = (await fetchAssetChange(saved.id)) || saved.row;
    ElMessage.success('保存成功');
    emit('success', latest);
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
        <ElFormItem label="变更类型" required>
          <ElInput
            v-model="editForm.change_type"
            placeholder="原值调整/折旧调整/部门调拨"
          />
        </ElFormItem>
        <ElFormItem label="变更日期" required>
          <ElDatePicker
            v-model="(editForm as any).change_date"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更期间">
          <ElDatePicker
            v-model="(editForm as any).change_period"
            type="month"
            value-format="YYYY-MM"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更前金额">
          <ElInputNumber
            v-model="(editForm as any).before_value"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更金额">
          <ElInputNumber
            v-model="(editForm as any).change_amount"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更后金额">
          <ElInputNumber
            v-model="(editForm as any).after_value"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更前折旧期">
          <ElInputNumber
            v-model="(editForm as any).before_depreciation_month"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更后折旧期">
          <ElInputNumber
            v-model="(editForm as any).after_depreciation_month"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更前残值率">
          <ElInputNumber
            v-model="(editForm as any).before_residual_rate"
            :controls="false"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="变更后残值率">
          <ElInputNumber
            v-model="(editForm as any).after_residual_rate"
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
        <ElFormItem class="col-span-2" label="变更原因">
          <ElInput v-model="editForm.change_reason" type="textarea" :rows="2" />
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
