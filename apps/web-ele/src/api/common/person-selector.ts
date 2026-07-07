import type { Staff } from '#/api/common/staff-selector';

import { getStaffByIds } from '#/api/common/staff-selector';

export interface PersonSelectorValueItem {
  UserId: string;
  UserName: string;
}

export async function getUsersByIds(ids: string[]): Promise<PersonSelectorValueItem[]> {
  const normalizedIds = Array.from(new Set((ids || []).map((item) => String(item || '').trim()).filter(Boolean)));
  if (normalizedIds.length === 0) return [];

  const rows = await getStaffByIds(normalizedIds);
  return (rows as Staff[]).map((item: any) => ({
    UserId: String(item.ROWID || item.rowid || item.ID || item.UserID || '').trim(),
    UserName: String(item.UserName || item.LoginName || item.ROWID || '').trim(),
  })).filter((item) => item.UserId);
}
