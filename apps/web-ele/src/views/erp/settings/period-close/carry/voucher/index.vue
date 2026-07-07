<script lang="ts" setup>
import type { PeriodCheckItem, PeriodCheckResult } from '#/api/erp/finance/period-check';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElIcon,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import { ArrowLeft, Check, DocumentAdd, Refresh } from '@element-plus/icons-vue';

import {
  createPeriodCheckVoucher,
  getPeriodCheckPreview,
} from '#/api/erp/finance/period-check';

defineOptions({ name: 'ErpPeriodCloseCarryVoucher' });

const route = useRoute();
const router = useRouter();

const form = reactive({
  companyName: String(route.query.companyName || '中信科技开发有限公司'),
  closeDate: String(route.query.closeDate || '2026-05-31'),
  period: String(route.query.period || '2026-05'),
});

const loading = ref(false);
const saving = ref(false);
const preview = ref<PeriodCheckResult | null>(null);
const createdCodes = ref<string[]>([]);

const targetKey = computed(() => String(route.query.key || '').trim());
const isBatch = computed(() => targetKey.value === 'batch');
const rows = computed<PeriodCheckItem[]>(() => {
  const list = preview.value?.items || [];
  if (isBatch.value) return list.filter((item) => Number(item.amount || 0) > 0);
  return list.filter((item) => item.key === targetKey.value);
});
const totalAmount = computed(() => rows.value.reduce((sum, item) => sum + Number(item.amount || 0), 0));

function backToCarry(extraQuery: Record<string, string> = {}) {
  router.replace({
    path: '/erp/settings/period-close/carry',
    query: {
      closeDate: form.closeDate,
      companyName: form.companyName,
      period: form.period,
      ...extraQuery,
    },
  });
}

async function loadPreview() {
  loading.value = true;
  try {
    preview.value = await getPeriodCheckPreview({
      companyName: form.companyName,
      period: form.period,
      voucherDate: form.closeDate,
    });
    if (!rows.value.length) {
      ElMessage.warning('未找到需要生成的结转凭证项目');
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '加载结转凭证数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleGenerate() {
  const readyRows = rows.value.filter((item) => Number(item.amount || 0) > 0);
  if (!readyRows.length) {
    ElMessage.success('当前无需生成结转凭证');
    backToCarry();
    return;
  }

  saving.value = true;
  createdCodes.value = [];
  try {
    for (const item of readyRows) {
      const res: any = await createPeriodCheckVoucher({
        amount: item.amount,
        companyName: form.companyName,
        key: item.key,
        period: form.period,
        voucherDate: form.closeDate,
      });
      const code = String(res?.voucher_code || res?.business_code || '').trim();
      if (code) createdCodes.value.push(code);
    }
    ElMessage.success(createdCodes.value.length ? `结转凭证生成完成：${createdCodes.value.join('、')}` : '结转凭证生成完成');
    backToCarry({ voucherCreated: '1' });
  } catch (error: any) {
    ElMessage.error(error?.message || '生成结转凭证失败');
  } finally {
    saving.value = false;
  }
}

onMounted(loadPreview);
</script>

<template>
  <Page auto-content-height>
    <div v-loading="loading" class="period-voucher-create-page">
      <div class="voucher-head">
        <ElButton text @click="backToCarry()">
          <ElIcon><ArrowLeft /></ElIcon>
          返回期间结转
        </ElButton>
        <div class="title-block">
          <h1>生成结转凭证</h1>
          <p>从期间结转进入独立凭证生成页，生成完成后自动返回结转与结账页面。</p>
        </div>
        <ElButton :icon="Refresh" :loading="loading" plain @click="loadPreview">刷新</ElButton>
      </div>

      <section class="info-card">
        <ElDescriptions :column="4" border>
          <ElDescriptionsItem label="公司">{{ form.companyName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="期间">{{ form.period }}</ElDescriptionsItem>
          <ElDescriptionsItem label="凭证日期">{{ form.closeDate }}</ElDescriptionsItem>
          <ElDescriptionsItem label="生成方式">{{ isBatch ? '批量生成' : '单张生成' }}</ElDescriptionsItem>
        </ElDescriptions>
      </section>

      <section class="table-card">
        <div class="panel-title">
          <span>待生成项目</span>
          <strong>合计：￥{{ totalAmount.toFixed(2) }}</strong>
        </div>
        <ElTable :data="rows" border>
          <ElTableColumn prop="label" label="项目名称" min-width="180" />
          <ElTableColumn label="借方科目" min-width="150">
            <template #default="{ row }">{{ row.voucherTemplate?.debit }}</template>
          </ElTableColumn>
          <ElTableColumn label="贷方科目" min-width="150">
            <template #default="{ row }">{{ row.voucherTemplate?.credit }}</template>
          </ElTableColumn>
          <ElTableColumn label="金额" width="140" align="right">
            <template #default="{ row }">{{ Number(row.amount || 0).toFixed(2) }}</template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="110">
            <template #default="{ row }">
              <ElTag :type="Number(row.amount || 0) > 0 ? 'warning' : 'success'" effect="plain">
                {{ Number(row.amount || 0) > 0 ? '待生成' : '无需生成' }}
              </ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </section>

      <div class="footer-actions">
        <ElButton size="large" @click="backToCarry()">
          <ElIcon><ArrowLeft /></ElIcon>
          取消并返回
        </ElButton>
        <ElButton
          size="large"
          type="primary"
          :icon="DocumentAdd"
          :disabled="!rows.length"
          :loading="saving"
          @click="handleGenerate"
        >
          生成凭证并返回
        </ElButton>
      </div>

      <div v-if="createdCodes.length" class="created-tip">
        <ElIcon><Check /></ElIcon>
        已生成：{{ createdCodes.join('、') }}
      </div>
    </div>
  </Page>
</template>

<style scoped>
.period-voucher-create-page {
  min-height: 100%;
  padding: 22px 26px;
  background: #f7faff;
  color: #172033;
}

.voucher-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.title-block {
  flex: 1;
}

.title-block h1 {
  margin: 0;
  color: #101828;
  font-size: 28px;
  font-weight: 700;
}

.title-block p {
  margin: 8px 0 0;
  color: #667085;
}

.info-card,
.table-card,
.footer-actions,
.created-tip {
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
}

.info-card,
.table-card {
  margin-bottom: 14px;
  padding: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #101828;
  font-size: 18px;
  font-weight: 700;
}

.panel-title strong {
  color: #149654;
  font-size: 16px;
}

.footer-actions {
  display: flex;
  justify-content: space-between;
  padding: 16px 18px;
}

.created-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 12px 16px;
  color: #149654;
}

@media (max-width: 900px) {
  .voucher-head,
  .footer-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
