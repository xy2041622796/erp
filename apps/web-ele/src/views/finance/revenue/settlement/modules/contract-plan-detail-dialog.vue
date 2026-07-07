<script lang="ts" setup>
import { ref } from 'vue';


import { getContract, getContractPlanList } from '#/api/erp/contract/contract';
import { formatDateOnly } from '#/utils/date';

import { ElDialog, ElTable, ElTableColumn, ElTag } from 'element-plus';

const visible = ref(false);
const loading = ref(false);
const contractName = ref('');
const currentPlanId = ref('');
const plans = ref<any[]>([]);

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatAmount(v: any) {
  return toNumber(v, 0).toFixed(2);
}

function getPeriodLabel(row: any) {
  const text = String(row?.plan_period ?? '').trim();
  if (!text) return '--';
  return text.includes('期') ? text : `第${text}期`;
}

function formatPlanDate(v: any) {
  if (!v) return '--';
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return formatDateOnly(n);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return formatDateOnly(d.getTime());
  return String(v);
}

async function open(contractId: string, activePlanId?: string) {
  const cid = String(contractId || '').trim();
  if (!cid) return;

  visible.value = true;
  loading.value = true;
  currentPlanId.value = String(activePlanId || '').trim();
  try {
    const [contract, planRows] = await Promise.all([
      getContract(cid),
      getContractPlanList(cid),
    ]);
    contractName.value =
      (contract as any)?.contract_name || (contract as any)?.contract_no || cid;
    plans.value = [...(planRows || [])].sort(
      (a: any, b: any) => Number(a?.plan_period || 0) - Number(b?.plan_period || 0),
    );
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="`${contractName || '合同'} - 收款计划详情`"
    width="900px"
    destroy-on-close
  >
    <ElTable v-loading="loading" :data="plans" border style="width: 100%">
      <ElTableColumn label="期次" width="180">
        <template #default="{ row }">
          <div class="flex items-center gap-2 whitespace-nowrap">
            <span>{{ getPeriodLabel(row) }}</span>
            <ElTag
              v-if="String(row?.rowid || '') === currentPlanId"
              type="success"
              size="small"
            >
              当前关联
            </ElTag>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="计划日期" min-width="140">
        <template #default="{ row }">
          <span>{{ formatPlanDate(row?.plan_date) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="计划金额" min-width="120">
        <template #default="{ row }">
          <span>{{ formatAmount(row?.plan_amount) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="是否逾期" min-width="100">
        <template #default="{ row }">
          <ElTag :type="Number(row?.is_overdue || 0) === 1 ? 'danger' : 'success'" size="small">
            {{ Number(row?.is_overdue || 0) === 1 ? '逾期' : '正常' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="remark" label="备注" min-width="220" show-overflow-tooltip />
    </ElTable>
  </ElDialog>
</template>
