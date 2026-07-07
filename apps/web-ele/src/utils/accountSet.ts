export const ACCOUNT_SET_ID_STORAGE_KEY = 'erp:account-set-id';
export const ACCOUNT_SET_NAME_STORAGE_KEY = 'erp:account-set-name';
export const ACCOUNT_SET_USER_ID_STORAGE_KEY = 'erp:account-set-user-id';

export interface ResolvedAccountSet {
  id: string;
  name: null | string;
}

export function getStoredAccountSetId(): null | string {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCOUNT_SET_ID_STORAGE_KEY);
}

export function getStoredAccountSetName(): null | string {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCOUNT_SET_NAME_STORAGE_KEY);
}

export function getStoredAccountSetUserId(): null | string {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCOUNT_SET_USER_ID_STORAGE_KEY);
}

export function setStoredAccountSetUserId(userId: null | string) {
  if (typeof window === 'undefined') return;
  if (userId) {
    window.localStorage.setItem(ACCOUNT_SET_USER_ID_STORAGE_KEY, userId);
  } else {
    window.localStorage.removeItem(ACCOUNT_SET_USER_ID_STORAGE_KEY);
  }
}

function asId(v: unknown): null | string {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() ? v.trim() : null;
  if (typeof v === 'number') return String(v);
  return null;
}

function asName(v: unknown): null | string {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() ? v.trim() : null;
  if (typeof v === 'number') return String(v);
  return null;
}

function pickFromSource(source: any): null | ResolvedAccountSet {
  if (!source) return null;

  const directIdKeys = [
    'accountSetId',
    'account_set_id',
    'accountSetID',
    'account_setid',
    'currentAccountSetId',
    'current_account_set_id',
    'accountSetRowid',
    'account_set_rowid',
    'accSetId',
  ];
  const directNameKeys = [
    'accountSetName',
    'account_set_name',
    'currentAccountSetName',
    'current_account_set_name',
    'accSetName',
  ];

  for (const k of directIdKeys) {
    const id = asId(source?.[k]);
    if (!id) continue;
    const name =
      asName(source?.account_name) ||
      directNameKeys.map((x) => asName(source?.[x])).find(Boolean) ||
      null;
    return { id, name };
  }

  const objKeys = ['accountSet', 'account_set', 'currentAccountSet'];
  for (const k of objKeys) {
    const obj = source?.[k];
    const id = asId(obj?.rowid ?? obj?.id ?? obj?.accountSetId);
    if (!id) continue;
    const name = asName(obj?.account_name ?? obj?.name ?? obj?.accountSetName);
    return { id, name };
  }

  return null;
}

/**
 * 从登录用户信息中解析“当前账套”。
 * 兼容多种字段命名/嵌套：accountSetId、account_set_id、accountSet.rowid 等。
 */
export function resolveAccountSetFromUserInfo(
  userInfo: any,
): null | ResolvedAccountSet {
  const sources = [userInfo, userInfo?.userInfo, userInfo?.rawUserInfo];
  for (const source of sources) {
    const picked = pickFromSource(source);
    if (picked?.id) return picked;
  }
  return null;
}

export function setStoredAccountSet(
  accountSetId: null | string,
  accountSetName: null | string,
) {
  if (typeof window === 'undefined') return;

  if (accountSetId) {
    window.localStorage.setItem(ACCOUNT_SET_ID_STORAGE_KEY, accountSetId);
  } else {
    window.localStorage.removeItem(ACCOUNT_SET_ID_STORAGE_KEY);
  }

  if (accountSetName) {
    window.localStorage.setItem(ACCOUNT_SET_NAME_STORAGE_KEY, accountSetName);
  } else {
    window.localStorage.removeItem(ACCOUNT_SET_NAME_STORAGE_KEY);
  }
}
