<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import dayjs from 'dayjs';
import {
  ElButton,
  ElEmpty,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus';

import {
  deleteAccountSet,
  getAccountSetPage,
} from '#/api/erp/finance/settings/accountset';
import { useAccountSetStore } from '#/store';
import {
  ACCOUNT_VERSION_TEXT,
  TAX_TYPE_TEXT,
} from '#/views/finance/settings/accountsets/data';
import AccountSetForm from '#/views/finance/settings/accountsets/modules/form.vue';

defineOptions({ name: 'FinanceAccountSetsSetting' });

const props = withDefaults(
  defineProps<{
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: AccountSetForm,
  destroyOnClose: true,
});

const loading = ref(false);
const deletingId = ref('');
const list = ref<any[]>([]);
const accountSetStore = useAccountSetStore();

const current = computed(() => {
  const storeId = (accountSetStore as any)?.currentId;
  if (storeId) {
    const matched = list.value.find(
      (item: any) =>
        item?.rowid === storeId || item?.account_set_id === storeId,
    );
    if (matched) return matched;
  }
  return (
    list.value.find(
      (item: any) => Number(item?.account_set_status ?? item?.current) === 1,
    ) ||
    list.value[0] ||
    null
  );
});

const accountSets = computed(() => list.value || []);

const summary = computed(() => ({
  total: accountSets.value.length,
  enabled: accountSets.value.filter(
    (item: any) => Number(item?.account_set_status ?? item?.current) === 1,
  ).length,
  currency: current.value?.recording_currency || 'CNY',
}));

function getItemId(item: any) {
  return String(item?.rowid || item?.account_set_id || '');
}

function getItemName(item: any) {
  return item?.account_name || '未命名帐套';
}

function fmtStartDate(v: any) {
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY年MM月') : (v ?? '-');
}

function fmtTaxType(v: any) {
  const k = v ?? '';
  return TAX_TYPE_TEXT[String(k)] ?? (k || '-');
}

function fmtAccountVersion(v: any) {
  const k = v ?? '';
  return ACCOUNT_VERSION_TEXT[String(k)] ?? (k || '-');
}

function isCurrent(item: any) {
  return current.value?.rowid === item?.rowid;
}

function pickAccountSet(item: any) {
  if (!item) return;
  accountSetStore.setCurrent(item as any);
}

async function fetchList() {
  loading.value = true;
  try {
    const res: any = await getAccountSetPage({ pageNo: 1, page: 0 });
    list.value = (res?.list || res?.items || []) as any[];
    if (current.value?.rowid) {
      accountSetStore.setCurrent(current.value as any);
    } else {
      accountSetStore.clear();
    }
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function openEdit(item: any) {
  const id = getItemId(item);
  if (!id) {
    ElMessage.error('缺少帐套ID，无法编辑');
    return;
  }
  formModalApi.setData({ id, type: 'edit' }).open();
}

function upsertListItem(item: any) {
  const id = getItemId(item);
  if (!id) return;

  const next = [...list.value];
  const index = next.findIndex((row: any) => getItemId(row) === id);
  if (index >= 0) {
    next[index] = { ...next[index], ...item };
  } else {
    next.unshift(item);
  }
  list.value = next;
}

async function handleFormSuccess(savedItem?: any) {
  const savedId = getItemId(savedItem);
  if (savedId) {
    upsertListItem(savedItem);
    accountSetStore.setCurrent(savedItem as any);
  }

  await fetchList();

  if (savedId && !list.value.some((item: any) => getItemId(item) === savedId)) {
    upsertListItem(savedItem);
    accountSetStore.setCurrent(savedItem as any);
  }

  window.setTimeout(() => {
    void fetchList();
  }, 500);

  ElMessage.success('帐套保存成功');
}

async function handleDelete(item: any) {
  const id = getItemId(item);
  if (!id) {
    ElMessage.error('缺少帐套ID，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除帐套“${getItemName(item)}”吗？删除后将不再显示，请谨慎操作。`,
      '删除帐套',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }

  deletingId.value = id;
  try {
    await deleteAccountSet(id);
    if (String((accountSetStore as any)?.currentId || '') === id) {
      accountSetStore.clear();
    }
    ElMessage.success('帐套删除成功');
    await fetchList();
  } catch (error: any) {
    ElMessage.error(error?.message || '帐套删除失败');
  } finally {
    deletingId.value = '';
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="finance-accountsets-setting-root">
    <FormModal @success="handleFormSuccess" />
    <Page v-if="!props.embedded" auto-content-height>
      <div class="accountsets-page">
        <div v-loading="loading" class="space-y-4">
          <div
            class="bg-card rounded-2xl border border-[var(--el-border-color-light)] p-5 shadow-sm"
          >
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <div
                  class="text-lg font-semibold text-[var(--el-text-color-primary)]"
                >
                  帐套管理
                </div>
                <div
                  class="mt-2 text-sm leading-6 text-[var(--el-text-color-secondary)]"
                >
                  支持展示多个帐套，并可在当前页面快速切换当前工作帐套。
                </div>
              </div>

              <div class="flex flex-col gap-3 lg:min-w-[360px] lg:items-end">
                <ElButton type="primary" @click="openCreate">
                  <IconifyIcon icon="mdi:plus" :size="16" class="mr-1" />
                  创建帐套
                </ElButton>
                <div class="grid w-full grid-cols-3 gap-3">
                  <div
                    class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                  >
                    <div class="text-xs text-[var(--el-text-color-secondary)]">
                      帐套总数
                    </div>
                    <div
                      class="mt-1 text-xl font-semibold text-[var(--el-text-color-primary)]"
                    >
                      {{ summary.total }}
                    </div>
                  </div>
                  <div
                    class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                  >
                    <div class="text-xs text-[var(--el-text-color-secondary)]">
                      当前启用
                    </div>
                    <div
                      class="mt-1 text-xl font-semibold text-[var(--el-color-primary)]"
                    >
                      {{ summary.enabled }}
                    </div>
                  </div>
                  <div
                    class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                  >
                    <div class="text-xs text-[var(--el-text-color-secondary)]">
                      本位币
                    </div>
                    <div
                      class="mt-1 text-xl font-semibold text-[var(--el-text-color-primary)]"
                    >
                      {{ summary.currency }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="current"
            class="overflow-hidden rounded-2xl border border-[var(--el-color-primary-light-5)] bg-[var(--el-color-primary-light-9)] p-5 shadow-sm"
          >
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <ElTag type="primary" effect="dark">当前帐套</ElTag>
                  <span
                    class="text-lg font-semibold text-[var(--el-text-color-primary)]"
                  >
                    {{ current.account_name || '未命名帐套' }}
                  </span>
                </div>
              </div>

              <div
                class="grid grid-cols-1 gap-3 text-sm text-[var(--el-text-color-regular)] sm:grid-cols-3"
              >
                <div class="rounded-xl bg-white/70 p-3">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    会计准则
                  </div>
                  <div class="mt-1 font-medium">
                    {{ fmtAccountVersion(current.account_version) }}
                  </div>
                </div>
                <div class="rounded-xl bg-white/70 p-3">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    纳税类型
                  </div>
                  <div class="mt-1 font-medium">
                    {{ fmtTaxType(current.tax_type) }}
                  </div>
                </div>
                <div class="rounded-xl bg-white/70 p-3">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    初始账期
                  </div>
                  <div class="mt-1 font-medium">
                    {{ fmtStartDate(current.start_date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="accountSets.length > 0"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <div
              v-for="item in accountSets"
              :key="item.rowid || item.account_set_id || item.account_name"
              class="cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200"
              :class="[
                isCurrent(item)
                  ? 'border-[var(--el-color-primary)] shadow-[0_8px_24px_rgba(64,158,255,0.18)]'
                  : 'border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary-light-5)] hover:shadow-sm',
              ]"
              @click="pickAccountSet(item)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div
                    class="truncate text-base font-semibold text-[var(--el-text-color-primary)]"
                  >
                    {{ item.account_name || '未命名帐套' }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <ElTag v-if="isCurrent(item)" type="primary" effect="plain">
                    当前
                  </ElTag>
                  <ElButton link type="primary" @click.stop="openEdit(item)">
                    编辑
                  </ElButton>
                  <ElButton
                    link
                    type="danger"
                    :loading="deletingId === getItemId(item)"
                    @click.stop="handleDelete(item)"
                  >
                    删除
                  </ElButton>
                  <IconifyIcon
                    icon="mdi:file-document-outline"
                    :size="18"
                    class="text-[var(--el-color-success)]"
                  />
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <ElTag type="success" effect="plain">
                  {{ fmtTaxType(item.tax_type) }}
                </ElTag>
                <ElTag effect="plain">
                  {{ item.recording_currency || 'CNY' }}
                </ElTag>
              </div>

              <div
                class="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--el-text-color-regular)]"
              >
                <div class="rounded-xl bg-[var(--el-fill-color-light)] p-3">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    会计准则
                  </div>
                  <div class="mt-1 font-medium">
                    {{ fmtAccountVersion(item.account_version) }}
                  </div>
                </div>
                <div class="rounded-xl bg-[var(--el-fill-color-light)] p-3">
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    初始账期
                  </div>
                  <div class="mt-1 font-medium">
                    {{ fmtStartDate(item.start_date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ElEmpty v-else description="暂无帐套数据，请先创建帐套">
            <ElButton type="primary" @click="openCreate">创建帐套</ElButton>
          </ElEmpty>
        </div>
      </div>
    </Page>

    <div v-else class="accountsets-page">
      <div v-loading="loading" class="space-y-4">
        <div
          class="bg-card rounded-2xl border border-[var(--el-border-color-light)] p-5 shadow-sm"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div>
              <div
                class="text-lg font-semibold text-[var(--el-text-color-primary)]"
              >
                帐套管理
              </div>
              <div
                class="mt-2 text-sm leading-6 text-[var(--el-text-color-secondary)]"
              >
                支持展示多个帐套，并可在当前页面快速切换当前工作帐套。
              </div>
            </div>

            <div class="flex flex-col gap-3 lg:min-w-[360px] lg:items-end">
              <ElButton type="primary" @click="openCreate">
                <IconifyIcon icon="mdi:plus" :size="16" class="mr-1" />
                创建帐套
              </ElButton>
              <div class="grid w-full grid-cols-3 gap-3">
                <div
                  class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                >
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    帐套总数
                  </div>
                  <div
                    class="mt-1 text-xl font-semibold text-[var(--el-text-color-primary)]"
                  >
                    {{ summary.total }}
                  </div>
                </div>
                <div
                  class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                >
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    当前启用
                  </div>
                  <div
                    class="mt-1 text-xl font-semibold text-[var(--el-color-primary)]"
                  >
                    {{ summary.enabled }}
                  </div>
                </div>
                <div
                  class="rounded-xl bg-[var(--el-fill-color-light)] p-3 text-center"
                >
                  <div class="text-xs text-[var(--el-text-color-secondary)]">
                    本位币
                  </div>
                  <div
                    class="mt-1 text-xl font-semibold text-[var(--el-text-color-primary)]"
                  >
                    {{ summary.currency }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="current"
          class="overflow-hidden rounded-2xl border border-[var(--el-color-primary-light-5)] bg-[var(--el-color-primary-light-9)] p-5 shadow-sm"
        >
          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <ElTag type="primary" effect="dark">当前帐套</ElTag>
                <span
                  class="text-lg font-semibold text-[var(--el-text-color-primary)]"
                >
                  {{ current.account_name || '未命名帐套' }}
                </span>
              </div>
            </div>

            <div
              class="grid grid-cols-1 gap-3 text-sm text-[var(--el-text-color-regular)] sm:grid-cols-3"
            >
              <div class="rounded-xl bg-white/70 p-3">
                <div class="text-xs text-[var(--el-text-color-secondary)]">
                  会计准则
                </div>
                <div class="mt-1 font-medium">
                  {{ fmtAccountVersion(current.account_version) }}
                </div>
              </div>
              <div class="rounded-xl bg-white/70 p-3">
                <div class="text-xs text-[var(--el-text-color-secondary)]">
                  纳税类型
                </div>
                <div class="mt-1 font-medium">
                  {{ fmtTaxType(current.tax_type) }}
                </div>
              </div>
              <div class="rounded-xl bg-white/70 p-3">
                <div class="text-xs text-[var(--el-text-color-secondary)]">
                  初始账期
                </div>
                <div class="mt-1 font-medium">
                  {{ fmtStartDate(current.start_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="accountSets.length > 0"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div
            v-for="item in accountSets"
            :key="item.rowid || item.account_set_id || item.account_name"
            class="cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200"
            :class="[
              isCurrent(item)
                ? 'border-[var(--el-color-primary)] shadow-[0_8px_24px_rgba(64,158,255,0.18)]'
                : 'border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary-light-5)] hover:shadow-sm',
            ]"
            @click="pickAccountSet(item)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div
                  class="truncate text-base font-semibold text-[var(--el-text-color-primary)]"
                >
                  {{ item.account_name || '未命名帐套' }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <ElTag v-if="isCurrent(item)" type="primary" effect="plain">
                  当前
                </ElTag>
                <ElButton link type="primary" @click.stop="openEdit(item)">
                  编辑
                </ElButton>
                <ElButton
                  link
                  type="danger"
                  :loading="deletingId === getItemId(item)"
                  @click.stop="handleDelete(item)"
                >
                  删除
                </ElButton>
                <IconifyIcon
                  icon="mdi:file-document-outline"
                  :size="18"
                  class="text-[var(--el-color-success)]"
                />
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <ElTag type="success" effect="plain">
                {{ fmtTaxType(item.tax_type) }}
              </ElTag>
              <ElTag effect="plain">
                {{ item.recording_currency || 'CNY' }}
              </ElTag>
            </div>

            <div
              class="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--el-text-color-regular)]"
            >
              <div class="rounded-xl bg-[var(--el-fill-color-light)] p-3">
                <div class="text-xs text-[var(--el-text-color-secondary)]">
                  会计准则
                </div>
                <div class="mt-1 font-medium">
                  {{ fmtAccountVersion(item.account_version) }}
                </div>
              </div>
              <div class="rounded-xl bg-[var(--el-fill-color-light)] p-3">
                <div class="text-xs text-[var(--el-text-color-secondary)]">
                  初始账期
                </div>
                <div class="mt-1 font-medium">
                  {{ fmtStartDate(item.start_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ElEmpty v-else description="暂无帐套数据，请先创建帐套">
          <ElButton type="primary" @click="openCreate">创建帐套</ElButton>
        </ElEmpty>
      </div>
    </div>
  </div>
</template>
