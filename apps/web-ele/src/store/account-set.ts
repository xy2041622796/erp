import type { BilAccountSetApi } from '#/api/erp/finance/settings/accountset';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import { getAccountSetPage } from '#/api/erp/finance/settings/accountset';
import {
  getStoredAccountSetId,
  getStoredAccountSetName,
  getStoredAccountSetUserId,
  resolveAccountSetFromUserInfo,
  setStoredAccountSet,
  setStoredAccountSetUserId,
} from '#/utils/accountSet';

export const useAccountSetStore = defineStore('accountSet', () => {
  const currentId = ref<null | string>(getStoredAccountSetId());
  const currentName = ref<null | string>(getStoredAccountSetName());
  const currentStartDate = ref<any>(null);

  const displayName = computed(
    () => currentName.value || currentId.value || '请选择账套',
  );

  function setCurrent(accountSet: null | Partial<BilAccountSetApi.AccountSet>) {
    const rawId = accountSet?.rowid || accountSet?.account_set_id;
    const id = rawId ? String(rawId) : null;
    const name = accountSet?.account_name
      ? String(accountSet.account_name)
      : null;
    const startDate = (accountSet as any)?.start_date ?? null;

    currentId.value = id;
    currentName.value = name;
    currentStartDate.value = startDate;
    setStoredAccountSet(id, name);
  }

  function clear() {
    setCurrent(null);
  }

  function $reset() {
    currentId.value = null;
    currentName.value = null;
    currentStartDate.value = null;
    setStoredAccountSet(null, null);
    setStoredAccountSetUserId(null);
  }

  function initFromUserInfo(userInfo: any) {
    const userId = userInfo?.id ? String(userInfo.id) : null;
    const storedUserId = getStoredAccountSetUserId();

    if (userId && storedUserId && storedUserId !== userId) {
      // 不同用户登录时，清掉上一个用户残留的账套选择
      currentId.value = null;
      currentName.value = null;
      currentStartDate.value = null;
      setStoredAccountSet(null, null);
    }

    if (userId) {
      setStoredAccountSetUserId(userId);
    }

    if (currentId.value) return;
    const resolved = resolveAccountSetFromUserInfo(userInfo);
    if (!resolved?.id) return;
    currentId.value = resolved.id;
    currentName.value = resolved.name;
    currentStartDate.value = null;
    setStoredAccountSet(resolved.id, resolved.name);
  }

  function isBackendCurrent(row: any) {
    const v =
      row?.account_set_status ??
      row?.is_current ??
      row?.current_flag ??
      row?.current;
    return Number(v) === 1;
  }

  async function ensureCurrentLoaded(userInfo?: any) {
    initFromUserInfo(userInfo);

    const res: any = await getAccountSetPage({ pageNo: 1, page: 0 });
    const list = (res?.list || res?.items || []) as BilAccountSetApi.AccountSet[];

    if (list.length === 0) {
      clear();
      return null;
    }

    if (currentId.value) {
      const matched = list.find(
        (x: any) => String(x?.rowid) === String(currentId.value),
      );
      if (matched?.rowid) {
        setCurrent(matched);
        return matched;
      }
    }

    const backendCurrent = list.find((x: any) => isBackendCurrent(x));
    const defaultAccountSet = backendCurrent || list[0] || null;
    if (defaultAccountSet?.rowid) {
      setCurrent(defaultAccountSet);
      return defaultAccountSet;
    }

    clear();
    return null;
  }

  return {
    $reset,
    clear,
    currentId,
    currentName,
    currentStartDate,
    displayName,
    ensureCurrentLoaded,
    initFromUserInfo,
    setCurrent,
  };
});
