<script lang="ts" setup>
import type { BilAccountSetApi } from '#/api/erp/finance/settings/accountset';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import dayjs from 'dayjs';

import { getAccountSetPage } from '#/api/erp/finance/settings/accountset';
import { useAccountSetStore } from '#/store';
import AccountSetForm from '#/views/finance/settings/accountsets/modules/form.vue';

import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'AccountSetDropdown' });

const emit = defineEmits<{
  (e: 'success', accountSet: BilAccountSetApi.AccountSet): void;
}>();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: AccountSetForm,
  destroyOnClose: true,
});

const loading = ref(false);
const list = ref<BilAccountSetApi.AccountSet[]>([]);
const accountSetStore = useAccountSetStore();

const triggerText = computed(() => `账套：${accountSetStore.displayName}`);
const startDateText = computed(() => {
  const v: any = accountSetStore.currentStartDate;
  if (!v) return '';
  const d = dayjs(v);
  return d.isValid() ? d.format('YYYY-MM') : String(v);
});
const displayStartDateText = computed(() => {
  if (!accountSetStore.currentId) return '';
  return startDateText.value || '-';
});

function isBackendCurrent(row: any) {
  const v =
    row?.account_set_status ??
    row?.is_current ??
    row?.current_flag ??
    row?.current;
  return Number(v) === 1;
}

function getAccountSetId(row: any) {
  return String(row?.rowid || row?.account_set_id || '').trim();
}

function isCurrentAccountSet(row: any) {
  const rowId = getAccountSetId(row);
  return Boolean(
    rowId && String(rowId) === String(accountSetStore.currentId || ''),
  );
}

async function fetchList() {
  loading.value = true;
  try {
    const res: any = await getAccountSetPage({ pageNo: 1, page: 0 });
    list.value = (res?.list || res?.items || []) as any[];
    if (accountSetStore.currentId && !accountSetStore.currentName) {
      const matched = list.value.find(
        (x: any) => getAccountSetId(x) === String(accountSetStore.currentId),
      );
      if (getAccountSetId(matched)) {
        accountSetStore.setCurrent(matched);
      }
    }

    if (!accountSetStore.currentId) {
      const backendCurrent = list.value.find((x: any) => isBackendCurrent(x));
      const defaultAccountSet = backendCurrent || list.value[0];
      if (getAccountSetId(defaultAccountSet)) {
        accountSetStore.setCurrent(defaultAccountSet);
      }
    }
  } catch (error) {
    console.error('加载账套列表失败', error);
  } finally {
    loading.value = false;
  }
}

async function handleVisibleChange(visible: boolean) {
  if (!visible) return;
  if (list.value.length > 0) return;
  await fetchList();
}

async function handleFormSuccess() {
  await fetchList();
}

function openCreate() {
  formModalApi.setData({ type: 'create' }).open();
}

function handleCommand(command: any) {
  if (command === '__create__') return openCreate();
  const row = command as BilAccountSetApi.AccountSet;
  if (!getAccountSetId(row)) return;
  accountSetStore.setCurrent(row);
  emit('success', row);
}

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="inline-flex items-center">
    <FormModal @success="handleFormSuccess" />
    <ElDropdown
      trigger="click"
      @visible-change="handleVisibleChange"
      @command="handleCommand"
    >
      <div
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
      >
        <span class="max-w-[180px] truncate">{{ triggerText }}</span>
        <span
          v-if="displayStartDateText"
          class="shrink-0 text-xs text-gray-500"
        >
          启用：{{ displayStartDateText }}
        </span>
        <IconifyIcon icon="mdi:chevron-down" :size="16" class="text-gray-500" />
      </div>
      <template #dropdown>
        <ElDropdownMenu class="min-w-[260px]">
          <ElDropdownItem v-if="loading" disabled>加载中...</ElDropdownItem>
          <ElDropdownItem v-else-if="list.length === 0" disabled>
            暂无账套
          </ElDropdownItem>
          <template v-else>
            <ElDropdownItem
              v-for="row in list"
              :key="getAccountSetId(row)"
              :command="row"
              class="flex items-center justify-between"
            >
              <span class="max-w-[180px] truncate">{{
                row.account_name || '-'
              }}</span>
              <ElTag
                v-if="isCurrentAccountSet(row)"
                size="small"
                type="success"
                effect="plain"
              >
                已选
              </ElTag>
              <ElTag
                v-else-if="isBackendCurrent(row)"
                size="small"
                type="info"
                effect="plain"
              >
                当前
              </ElTag>
            </ElDropdownItem>
            <ElDropdownItem divided command="__create__">
              <div class="flex items-center gap-2">
                <IconifyIcon
                  icon="mdi:plus"
                  :size="16"
                  class="text-[#37B24D]"
                />
                <span>新增账套</span>
              </div>
            </ElDropdownItem>
          </template>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </div>
</template>
