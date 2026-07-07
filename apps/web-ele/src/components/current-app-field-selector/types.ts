import type { FinanceBusinessSourceSystemApi } from '#/api/erp/finance/settings/basic_data/business_standardization';

export interface CurrentAppFieldSelectorOpenOptions {
  title?: string;
  appDesc?: string;
}

export interface CurrentAppFieldSelectionResult {
  database: FinanceBusinessSourceSystemApi.AppDatabaseRow | null;
  table: FinanceBusinessSourceSystemApi.AppTableRow | null;
  field: FinanceBusinessSourceSystemApi.TableFieldRow | null;
}
