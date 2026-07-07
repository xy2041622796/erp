import type { AssetChangeRecord } from '#/api/erp/finance/assets/check-ledger';
import type { AssetRecord } from '#/api/erp/finance/assets/manage';
import type { BilSubjectApi } from '#/api/erp/finance/settings/project';

import { createAssetChange } from '#/api/erp/finance/assets/check-ledger';
import { getSubjectList } from '#/api/erp/finance/settings/project';
import { moneyNumber } from '#/utils/finance/decimal-money';
import { getLocalDate, getLocalMonth } from '#/views/finance/assets/utils';

type VoucherSubject = {
  code: string;
  name: string;
};

type VoucherDraftEntry = {
  credit?: number;
  debit?: number;
  subject: string;
  summary: string;
};

type AssetChangeVoucherDraft = {
  attachmentsCount: number;
  date: number;
  entries: VoucherDraftEntry[];
  note: string;
  returnPath: string;
  rowIds: string[];
  source: 'asset-change';
  voucherWord: string;
};

function normalizeText(...values: unknown[]) {
  return values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

function getAssetBucket(asset?: AssetRecord | null) {
  const explicitType = String(asset?.asset_amortization_type || '').trim();
  if (
    explicitType === 'fixed' ||
    explicitType === 'intangible' ||
    explicitType === 'deferred'
  ) {
    return explicitType;
  }

  const text = normalizeText(
    asset?.asset_property,
    asset?.asset_category_name,
    asset?.asset_category_code,
    asset?.asset_account_code,
    asset?.asset_name,
  );
  if (text.includes('无形') || text.includes('1701')) return 'intangible';
  if (text.includes('长期待摊') || text.includes('待摊') || text.includes('1801')) {
    return 'deferred';
  }
  return 'fixed';
}

async function loadSubjectByKeywords(
  keywords: string[],
  fallback: VoucherSubject,
) {
  for (const keyword of keywords) {
    const res = await getSubjectList({
      keyword,
      lingma_sys_is_delete: 0,
      subject_state: 1,
    });
    const subjects = (res?.list || []) as BilSubjectApi.Subject[];
    const leafSubjects = subjects.filter(
      (item) => Number(item.is_leaf_subject ?? 1) === 1,
    );
    const targets = leafSubjects.length > 0 ? leafSubjects : subjects;
    const matched =
      targets.find((item) =>
        String(item.subject_number || '').startsWith(keyword),
      ) ||
      targets.find((item) =>
        String(item.subject_name || '').includes(keyword),
      ) ||
      targets[0];
    if (matched?.subject_number || matched?.subject_name) {
      return {
        code: String(matched.subject_number || fallback.code),
        name: String(matched.subject_name || fallback.name),
      };
    }
  }
  return fallback;
}

async function getAssetSubject(asset?: AssetRecord | null) {
  const code = String(asset?.asset_account_code || '').trim();
  const name = String(asset?.asset_account_name || '').trim();
  if (code || name) return { code, name: name || '资产科目' };

  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') {
    return await loadSubjectByKeywords(['1701', '无形资产'], {
      code: '1701',
      name: '无形资产',
    });
  }
  if (bucket === 'deferred') {
    return await loadSubjectByKeywords(['1801', '长期待摊费用'], {
      code: '1801',
      name: '长期待摊费用',
    });
  }
  return await loadSubjectByKeywords(['1601', '固定资产'], {
    code: '1601',
    name: '固定资产',
  });
}

async function getAccumulatedSubject(asset?: AssetRecord | null) {
  const code = String(
    asset?.accumulated_depreciation_subject_code || '',
  ).trim();
  const name = String(
    asset?.accumulated_depreciation_subject_name || '',
  ).trim();
  if (code || name) return { code, name: name || '累计折旧/摊销' };

  const bucket = getAssetBucket(asset);
  if (bucket === 'intangible') {
    return await loadSubjectByKeywords(['1702', '累计摊销'], {
      code: '1702',
      name: '累计摊销',
    });
  }
  return await loadSubjectByKeywords(['1602', '累计折旧'], {
    code: '1602',
    name: '累计折旧',
  });
}

async function getDepreciationExpenseSubject(asset?: AssetRecord | null) {
  const code = String(asset?.depreciation_fee_subject_code || '').trim();
  const name = String(asset?.depreciation_fee_subject_name || '').trim();
  if (code || name) return { code, name: name || '折旧/摊销费用' };

  return await loadSubjectByKeywords(['折旧费', '摊销费', '管理费用'], {
    code: '6602',
    name: '管理费用',
  });
}

async function getChangeCounterSubject(asset?: AssetRecord | null) {
  return await loadSubjectByKeywords(['1606', '固定资产清理', '资产处置损益'], {
    code: '1606',
    name: '固定资产清理',
  });
}

function isDepreciationChange(record: AssetChangeRecord) {
  const text = normalizeText(record.change_type, record.change_reason, record.remark);
  return text.includes('折旧') || text.includes('摊销') || text.includes('累计');
}

function getVoucherDateTimestamp(record: AssetChangeRecord) {
  const date = String(record.change_date || '').slice(0, 10);
  const timestamp = date ? new Date(`${date} 00:00:00`).getTime() : NaN;
  if (Number.isFinite(timestamp)) return timestamp;
  const period = String(record.change_period || getLocalMonth()).slice(0, 7);
  return new Date(`${period}-01 00:00:00`).getTime();
}

function getChangeRecordKey(row: AssetChangeRecord) {
  return String(row.id || row.rowid || '').trim();
}

function dispatchAssetChangeSaved(row: AssetChangeRecord) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('finance-asset-change-saved', { detail: row }),
  );
}

function dispatchAssetChangeVoucherDraft(draft: AssetChangeVoucherDraft) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('finance-asset-change-voucher-draft', { detail: draft }),
  );
}

async function buildVoucherEntries(
  record: AssetChangeRecord,
  asset?: AssetRecord | null,
) {
  const amount = moneyNumber(record.change_amount || 0);
  const value = Math.abs(amount);
  const summary = [
    record.change_type || '资产变更',
    [asset?.using_department, record.asset_name || record.asset_code]
      .filter(Boolean)
      .join(' '),
  ]
    .filter(Boolean)
    .join('_');
  let debitSubject: VoucherSubject;
  let creditSubject: VoucherSubject;

  if (isDepreciationChange(record)) {
    const accumulatedSubject = await getAccumulatedSubject(asset);
    const expenseSubject = await getDepreciationExpenseSubject(asset);
    debitSubject = amount >= 0 ? expenseSubject : accumulatedSubject;
    creditSubject = amount >= 0 ? accumulatedSubject : expenseSubject;
  } else {
    const assetSubject = await getAssetSubject(asset);
    const counterSubject = await getChangeCounterSubject(asset);
    debitSubject = amount >= 0 ? assetSubject : counterSubject;
    creditSubject = amount >= 0 ? counterSubject : assetSubject;
  }

  return [
    {
      debit: value > 0 ? value : undefined,
      subject: debitSubject.code,
      summary,
    },
    {
      credit: value > 0 ? value : undefined,
      subject: creditSubject.code,
      summary,
    },
  ] as VoucherDraftEntry[];
}

export async function createAssetChangeWithVoucher(params: {
  asset?: AssetRecord | null;
  change: AssetChangeRecord;
}) {
  const change = {
    ...params.change,
    change_date: params.change.change_date || getLocalDate(),
    change_period: params.change.change_period || getLocalMonth(),
  };
  const saved = await createAssetChange(change);
  const savedRow = saved.row;
  dispatchAssetChangeSaved(savedRow);

  const rowId = getChangeRecordKey(savedRow);
  const entries = await buildVoucherEntries(savedRow, params.asset);
  dispatchAssetChangeVoucherDraft({
    attachmentsCount: 0,
    date: getVoucherDateTimestamp(savedRow),
    entries,
    note: `${String(savedRow.change_period || '').slice(0, 7)}资产变更凭证：${savedRow.asset_name || savedRow.asset_code || ''}`,
    returnPath: '/finance/assets/manage?tab=list',
    rowIds: rowId ? [rowId] : [],
    source: 'asset-change',
    voucherWord: '记',
  });

  return savedRow as AssetChangeRecord;
}
