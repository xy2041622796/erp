<script lang="ts" setup>
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { BilSubjectOpeningApi } from '#/api/erp/finance/settings/initial';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElTabPane, ElTabs } from 'element-plus';

import { fetchAssetList } from '#/api/erp/finance/assets/manage';
import { getSubjectOpeningList } from '#/api/erp/finance/settings/initial';
import { resolveAccountSetActivationMonth } from '#/views/finance/assets/utils';
import AssetChangeVoucherPage from '#/views/finance/assets/manage/change-voucher/index.vue';
import AssetDepreciationVoucherPage from '#/views/finance/assets/manage/depreciation-voucher/index.vue';
import AssetInitializationPage from '#/views/finance/assets/manage/initialization/index.vue';
import AssetListPage from '#/views/finance/assets/manage/list/index.vue';

defineOptions({ name: 'FinanceAssetManageTabs' });
const route = useRoute();
const router = useRouter();

type AssetManageTabName =
  | 'list'
  | 'initialization'
  | 'changeVoucher'
  | 'depreciationVoucher';

function normalizeTab(value: unknown): AssetManageTabName {
  const text = String(value || '').trim();
  if (text === 'initialization') return 'initialization';
  if (text === 'changeVoucher' || text === 'change-voucher') return 'changeVoucher';
  if (text === 'depreciationVoucher' || text === 'depreciation-voucher') return 'depreciationVoucher';
  return 'list';
}

const activeTab = ref<AssetManageTabName>(normalizeTab(route.query.tab || route.query.activeTab));

const tabs = [
  {
    name: 'initialization',
    label: '资产初始化',
    component: AssetInitializationPage,
  },
  {
    name: 'list',
    label: '资产列表',
    component: AssetListPage,
  },
  {
    name: 'changeVoucher',
    label: '变更记录及生成凭证',
    component: AssetChangeVoucherPage,
  },
  {
    name: 'depreciationVoucher',
    label: '计提折旧及生成凭证',
    component: AssetDepreciationVoucherPage,
  },
] as const;

const currentTabComponent = computed(
  () => tabs.find((item) => item.name === activeTab.value)?.component || AssetListPage,
);

const openingBalanceLoading = ref(false);
const openingAssetRows = ref<AssetRecord[]>([]);
const openingSubjectRows = ref<BilSubjectOpeningApi.SubjectOpening[]>([]);
const openingActivationMonth = ref('');

type OpeningBalanceItem = {
  cardTotal: number;
  diff: number;
  hasOpening: boolean;
  label: string;
  locked: boolean;
  status: '平衡' | '不平衡';
  subjectCode: string;
  subjectName: string;
  subjectTotal: number;
};

function toAmount(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: unknown) {
  const amount = toAmount(value);
  return amount.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function normalizeMonth(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const matched = text.match(/^(\d{4})[-/]?(\d{1,2})/);
  if (!matched) return '';
  return matched[1] + '-' + String(Number(matched[2])).padStart(2, '0');
}

function getAssetBusinessMonth(row: AssetRecord) {
  return normalizeMonth(row.begin_date || row.purchase_date || row.entry_period);
}

function isOpeningAsset(row: AssetRecord) {
  const month = getAssetBusinessMonth(row);
  return Number(row.asset_status || 1) === 1 && (!month || month < openingActivationMonth.value);
}

function assetText(row: AssetRecord) {
  return [
    row.asset_amortization_type,
    row.asset_property,
    row.asset_category_name,
    row.asset_category_code,
    row.asset_account_code,
    row.asset_name,
  ].join(' ');
}

function isIntangibleAsset(row: AssetRecord) {
  const type = String(row.asset_amortization_type || '').trim();
  if (type === 'intangible') return true;
  if (type === 'fixed' || type === 'deferred') return false;
  return assetText(row).includes('无形') || assetText(row).includes('1701');
}

function isFixedAsset(row: AssetRecord) {
  const type = String(row.asset_amortization_type || '').trim();
  if (type === 'fixed') return true;
  if (type === 'intangible' || type === 'deferred') return false;
  const text = assetText(row);
  if (text.includes('无形') || text.includes('长期待摊') || text.includes('待摊')) return false;
  return text.includes('固定资产') || text.includes('1601');
}

function getSubjectOpeningTotal(subjectCode: string) {
  const rows = openingSubjectRows.value.filter((row) =>
    String(row.subject_code || '').trim().startsWith(subjectCode),
  );
  const leafRows = rows.filter((row) => Number(row.is_leaf_subject ?? 1) === 1);
  const targets = leafRows.length > 0 ? leafRows : rows;
  return targets.reduce((sum, row) => sum + toAmount(row.beginning_balance), 0);
}

function buildOpeningBalanceItem(
  label: string,
  subjectCode: string,
  subjectName: string,
  predicate: (row: AssetRecord) => boolean,
): OpeningBalanceItem {
  const cardTotal = openingAssetRows.value
    .filter((row) => isOpeningAsset(row) && predicate(row))
    .reduce((sum, row) => sum + toAmount(row.purchase_price), 0);
  const subjectTotal = getSubjectOpeningTotal(subjectCode);
  const diff = Number((cardTotal - subjectTotal).toFixed(2));
  const hasOpening = Math.abs(subjectTotal) >= 0.005;
  const status = Math.abs(diff) < 0.005 ? '平衡' : '不平衡';
  return {
    cardTotal,
    diff,
    hasOpening,
    label,
    locked: (hasOpening || Math.abs(cardTotal) >= 0.005) && status === '平衡',
    status,
    subjectCode,
    subjectName,
    subjectTotal,
  };
}

const openingBalanceItems = computed(() => [
  buildOpeningBalanceItem('固定资产', '1601', '固定资产', isFixedAsset),
  buildOpeningBalanceItem('无形资产', '1701', '无形资产', isIntangibleAsset),
]);

const hasOpeningBalanceDiff = computed(() =>
  openingBalanceItems.value.some(
    (item) => (item.hasOpening || Math.abs(item.cardTotal) >= 0.005) && item.status !== '平衡',
  ),
);

const openingBalanceStatus = computed(() =>
  hasOpeningBalanceDiff.value ? '不平衡' : '平衡',
);

const openingBalanceStampText = computed(() =>
  openingBalanceStatus.value === '平衡' ? '平' : '不平',
);

const openingBalanceStampTitle = computed(() =>
  openingBalanceItems.value
    .map(
      (item) =>
        item.label + '：卡片 ' + formatMoney(item.cardTotal) + ' / ' + item.subjectCode + ' ' + formatMoney(item.subjectTotal) + ' / 差额 ' + formatMoney(item.diff),
    )
    .join('；'),
);

async function loadOpeningBalance() {
  openingBalanceLoading.value = true;
  try {
    openingActivationMonth.value = await resolveAccountSetActivationMonth();
    const [assets, fixedOpening, intangibleOpening] = await Promise.all([
      fetchAssetList({ assetStatus: 1 }),
      getSubjectOpeningList({ keyword: '1601' }),
      getSubjectOpeningList({ keyword: '1701' }),
    ]);
    openingAssetRows.value = assets || [];
    openingSubjectRows.value = [
      ...((fixedOpening.list || []) as BilSubjectOpeningApi.SubjectOpening[]),
      ...((intangibleOpening.list || []) as BilSubjectOpeningApi.SubjectOpening[]),
    ];
  } catch (error) {
    console.error(error);
  } finally {
    openingBalanceLoading.value = false;
  }
}

function onAssetBalanceRefresh() {
  loadOpeningBalance();
}

watch(
  () => [route.query.tab, route.query.activeTab],
  () => {
    const next = normalizeTab(route.query.tab || route.query.activeTab);
    if (next !== activeTab.value) activeTab.value = next;
  },
);

watch(activeTab, (tab) => {
  const normalized = normalizeTab(route.query.tab || route.query.activeTab);
  if (normalized === tab && route.query.tab) return;
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab,
      moduleScope: route.query.moduleScope || 'finance',
    },
  });
});

onMounted(() => {
  loadOpeningBalance();
  window.addEventListener('finance-asset-change-saved', onAssetBalanceRefresh);
});

onBeforeUnmount(() => {
  window.removeEventListener('finance-asset-change-saved', onAssetBalanceRefresh);
});
</script>

<template>
  <Page auto-content-height class="h-full">
    <div class="asset-manage-tabs h-full">
      <div class="asset-manage-tabs__header">
        <ElTabs
          v-model="activeTab"
          class="asset-manage-tabs__nav"
          :class="{
            'asset-manage-tabs__nav--with-stamp': openingBalanceStatus !== '平衡',
          }"
        >
          <ElTabPane
            v-for="item in tabs"
            :key="item.name"
            :label="item.label"
            :name="item.name"
          />
        </ElTabs>
        <div
          v-if="openingBalanceStatus !== '平衡'"
          class="asset-balance-stamp"
          :class="{
            'asset-balance-stamp--warn': openingBalanceStatus !== '平衡',
            'is-loading': openingBalanceLoading,
          }"
          :title="openingBalanceStampTitle"
        >
          {{ openingBalanceStampText }}
        </div>
      </div>
      <div class="asset-manage-tabs__content">
        <component :is="currentTabComponent" />
      </div>
    </div>
  </Page>
</template>

<style scoped>
.asset-manage-tabs {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.asset-manage-tabs__nav {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
}

.asset-manage-tabs__nav--with-stamp {
  padding-right: 112px;
}

.asset-manage-tabs__nav :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.asset-manage-tabs__header {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 46px;
  border: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}

.asset-balance-stamp {
  position: absolute;
  top: 8px;
  right: 24px;
  z-index: 2;
  min-width: 58px;
  padding: 4px 10px;
  border: 2px solid currentColor;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  letter-spacing: 2px;
  background: rgb(255 255 255 / 72%);
  transform: rotate(-8deg);
  user-select: none;
}

.asset-balance-stamp--warn {
  color: #f43f5e;
}

.asset-balance-stamp.is-loading {
  opacity: 0.45;
}

.asset-manage-tabs__content {
  min-height: 0;
  flex: 1;
  margin-top: 0;
  padding-top: 0;
}

.asset-manage-tabs__content :deep(.vben-page),
.asset-manage-tabs__content :deep(.vben-page-content),
.asset-manage-tabs__content :deep(.vben-page-wrapper),
.asset-manage-tabs__content :deep(.vben-page-body) {
  padding: 0 !important;
  margin: 0 !important;
}
</style>
