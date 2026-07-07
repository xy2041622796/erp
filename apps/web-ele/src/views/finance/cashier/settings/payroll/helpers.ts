import { categoryOptions } from '#/views/finance/cashier/settings/payroll/constants';
import type {
  PageDataState,
  PayrollOverviewCard,
  QueryFormState,
  SalaryItemTemplate,
  SalaryItemTemplateCandidate,
} from '#/views/finance/cashier/settings/payroll/types';

export function getErrorMessage(error: any, fallback: string) {
  return String(error?.message || fallback);
}

export function buildValueSet(list: any[], field: string) {
  return new Set(
    (list || [])
      .map((item) => String(item?.[field] || '').trim())
      .filter(Boolean),
  );
}

export function buildCommonItemTemplateCandidates(
  templates: SalaryItemTemplate[],
  existingItemCodeSet: Set<string>,
  existingItemNameSet: Set<string>,
): SalaryItemTemplateCandidate[] {
  return templates.map((item) => {
    const codeExists = existingItemCodeSet.has(String(item.item_code || '').trim());
    const nameExists = existingItemNameSet.has(String(item.item_name || '').trim());
    const exists = codeExists || nameExists;
    const existsReason = codeExists && nameExists ? '编码、名称已存在' : codeExists ? '编码已存在' : nameExists ? '名称已存在' : '';
    return {
      ...item,
      exists,
      existsReason,
      statusText: exists ? '已存在' : '可创建',
    };
  });
}

export function filterCreatableTemplateCandidates<T extends { exists: boolean }>(list: T[]) {
  return list.filter((item) => !item.exists);
}

export function buildEffectiveTotal(pageData: PageDataState) {
  return Math.max(Number(pageData.total || 0), pageData.list.length);
}

export function buildPagedList(pageData: PageDataState, queryForm: QueryFormState) {
  const list = Array.isArray(pageData.list) ? pageData.list : [];
  if (list.length <= queryForm.page) {
    return list;
  }
  const start = (queryForm.pageNo - 1) * queryForm.page;
  return list.slice(start, start + queryForm.page);
}

export function buildOverviewCards(list: any[]): PayrollOverviewCard[] {
  return categoryOptions.map((category) => {
    const categoryItems = (list || []).filter((item) => item.item_category === category.value);
    const enabled = categoryItems.filter((item) => Number(item.is_enabled) === 1).length;
    return {
      key: category.value,
      label: category.label,
      total: categoryItems.length,
      enabled,
    };
  });
}
