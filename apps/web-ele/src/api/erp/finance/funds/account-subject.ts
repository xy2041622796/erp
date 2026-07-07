import { getAllSubjectList, type BilSubjectApi } from '../settings/project';
import { fetchFundsAccountList, type FundsAccount } from './settings';

export type FundsAccountSubject = {
  account: FundsAccount;
  subject_code: string;
  subject_name: string;
};

export async function fetchEnabledFundsAccountOptions() {
  const [cashAccounts, bankAccounts] = await Promise.all([
    fetchFundsAccountList({ kind: '现金', enableStatus: 1 }),
    fetchFundsAccountList({ kind: '银行存款', enableStatus: 1 }),
    fetchFundsAccountList({ kind: '其他货币资金' as any, enableStatus: 1 }),
  ]);

  return [...cashAccounts, ...bankAccounts].map((item) => {
    const kind = String(item.account_kind || '').trim();
    const name = String(item.account_name || '').trim();
    const code = String(item.account_code || '').trim();
    const subjectCode = String(item.subject_code || '').trim();
    const subjectName = String(item.subject_name || '').trim();
    const subjectText =
      subjectCode || subjectName
        ? ` / ${[subjectCode, subjectName].filter(Boolean).join(' ')}`
        : ' / 未绑定科目';

    return {
      ...item,
      id: String(item.id || item.rowid || '').trim(),
      display_name: `${[name, kind, code].filter(Boolean).join(' / ')}${subjectText}`,
    };
  });
}

export async function resolveFundsAccountSubject(
  accountId: unknown,
  actionText: string,
): Promise<FundsAccountSubject> {
  const id = String(accountId || '').trim();
  if (!id) {
    throw new Error(`${actionText}账户不能为空，请先选择资金账户`);
  }

  const accounts = await fetchEnabledFundsAccountOptions();
  const account = accounts.find(
    (item) =>
      String(item.id || '').trim() === id ||
      String(item.rowid || '').trim() === id,
  );

  if (!account) {
    throw new Error(`${actionText}账户未在资金账户中找到，请重新选择现金或银行账户`);
  }

  let subject_code = String(account.subject_code || '').trim();
  let subject_name = String(account.subject_name || '').trim();
  const subject_id = String(account.subject_id || '').trim();

  if ((!subject_code || !subject_name) && subject_id) {
    const subjectRes = await getAllSubjectList({
      pageNo: 1,
      page: 0,
      lingma_sys_is_delete: 0,
    } as any);
    const subjects = (subjectRes?.list || []) as BilSubjectApi.Subject[];
    const subject = subjects.find(
      (item: any) => String(item?.rowid || '').trim() === subject_id,
    );

    subject_code = String(subject?.subject_number || '').trim();
    subject_name = String(subject?.subject_name || '').trim();

    if (subject && Number(subject.is_leaf_subject ?? 0) !== 1) {
      const accountName = String(account.account_name || account.display_name || id);
      throw new Error(`${accountName} 绑定的会计科目不是末级科目，无法生成凭证`);
    }
  }

  if (!subject_code || !subject_name) {
    const accountName = String(account.account_name || account.display_name || id);
    throw new Error(`${accountName} 未绑定会计科目，无法生成凭证`);
  }

  return {
    account,
    subject_code,
    subject_name,
  };
}
