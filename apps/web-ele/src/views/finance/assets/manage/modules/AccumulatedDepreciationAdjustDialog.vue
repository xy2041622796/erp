<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import { computed, reactive, ref, watch } from 'vue';
import { ElButton, ElDatePicker, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElMessage } from 'element-plus';
import { saveAsset } from '#/api/erp/finance/assets/manage';
import { createAssetChangeWithVoucher } from '#/views/finance/assets/manage/modules/assetChangeVoucher';
import { moneyNumber, subMoney } from '#/utils/finance/decimal-money';
import { getLocalDate, getLocalMonth } from '#/views/finance/assets/utils';
const props = defineProps<{ data?: AssetRecord | null; modelValue: boolean }>();
const emit = defineEmits<{ success: [row: AssetRecord]; 'update:modelValue': [value: boolean] }>();
const showDialog = computed({ get: () => props.modelValue, set: (value: boolean) => emit('update:modelValue', value) });
const saving = ref(false);
const editForm = reactive({ change_date: '', change_period: '', change_reason: '', new_value: 0 });
const oldValue = computed(() => moneyNumber((props.data as any)?.accumulated_depreciation || 0));
function resetForm(){ Object.assign(editForm,{ change_date:getLocalDate(), change_period:getLocalMonth(), change_reason:'', new_value:oldValue.value }); }
function getAssetKey(row?: AssetRecord | null){ return String(row?.id || row?.rowid || '').trim(); }
function moneyText(value?: number | string){ return moneyNumber(value as any).toLocaleString('zh-CN',{maximumFractionDigits:2,minimumFractionDigits:2}); }
watch(() => props.modelValue, (open) => { if(open) resetForm(); }, { immediate: true });
async function onSave(){ const row=props.data; const id=getAssetKey(row); if(!row||!id) return ElMessage.warning('未找到资产主键，无法保存'); if(!editForm.change_date) return ElMessage.warning('请选择变更日期'); saving.value=true; try{ const next: AssetRecord={ ...row, id, accumulated_depreciation: editForm.new_value, net_asset_value: moneyNumber(subMoney(row.purchase_price, editForm.new_value)), }; await saveAsset(next); await createAssetChangeWithVoucher({
      asset: next,
      change: { asset_id:id, asset_code:String(row.asset_code||''), asset_name:String(row.asset_name||''), before_value: row.purchase_price, after_value: next.purchase_price, change_amount: moneyNumber(editForm.new_value - oldValue.value), before_depreciation_month: row.depreciation_month, after_depreciation_month: next.depreciation_month, before_residual_rate: row.residual_rate, after_residual_rate: next.residual_rate, change_date:editForm.change_date, change_period:editForm.change_period, change_reason:editForm.change_reason, change_type:'累计折旧调整', voucher_generated:0 }
    }); ElMessage.success('保存成功'); emit('success',next); showDialog.value=false; } catch(error:any){ console.error(error); ElMessage.error(error?.message||'保存失败'); } finally{ saving.value=false; } }
</script>
<template><ElDialog v-model="showDialog" title="累计折旧调整" width="min(60rem, 96vw)" destroy-on-close><ElForm class="asset-adjust-form" label-position="left" label-width="130px"><section class="adjust-section"><h3>基本信息</h3><div class="info-grid"><ElFormItem label="资产编号："><span>{{ data?.asset_code || '-' }}</span></ElFormItem><ElFormItem label="资产类别："><span>{{ data?.asset_category_name || '-' }}</span></ElFormItem><ElFormItem label="资产名称："><span>{{ data?.asset_name || '-' }}</span></ElFormItem><ElFormItem label="资产型号："><span>{{ data?.model || '-' }}</span></ElFormItem><ElFormItem label="所属部门："><span>{{ data?.using_department || '-' }}</span></ElFormItem></div></section><section class="adjust-section"><h3>变更内容</h3><div class="form-grid"><ElFormItem label="原累计折旧："><span>{{ moneyText(oldValue) }}</span></ElFormItem><ElFormItem label="调整后累计折旧：" required><ElInputNumber v-model="editForm.new_value" :controls="false" class="w-full" /></ElFormItem><ElFormItem label="变更日期：" required><ElDatePicker v-model="editForm.change_date" type="date" value-format="YYYY-MM-DD" class="w-full" /></ElFormItem><ElFormItem label="变更期间："><ElDatePicker v-model="editForm.change_period" type="month" value-format="YYYY-MM" class="w-full" /></ElFormItem><ElFormItem class="span-2" label="变更原因："><ElInput v-model="editForm.change_reason" type="textarea" :rows="3" placeholder="请输入变更原因" /></ElFormItem></div></section></ElForm><template #footer><ElButton type="primary" :loading="saving" @click="onSave">保存</ElButton><ElButton @click="showDialog = false">取消</ElButton></template></ElDialog></template>
<style scoped>.asset-adjust-form{color:var(--el-text-color-primary)}.adjust-section{padding:18px 24px;border-bottom:1px solid var(--el-border-color-light)}.adjust-section h3{margin:0 0 18px;font-size:16px;font-weight:600}.info-grid,.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:60px;row-gap:8px}.info-grid :deep(.el-form-item),.form-grid :deep(.el-form-item){margin-bottom:0}.span-2{grid-column:span 2}@media (max-width:760px){.info-grid,.form-grid{grid-template-columns:1fr}.span-2{grid-column:span 1}}</style>
