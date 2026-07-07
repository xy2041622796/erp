export type TaxRuleTab = 'contribution' | 'tax';

export type QuickLinkItem = {
  title: string;
  desc: string;
  path: string;
  buttonText: string;
};

export type ContributionRuleKind = 'fund' | 'social';

export type ContributionDialogForm = {
  ruleType: ContributionRuleKind;
  code: string;
  title: string;
  description: string;
  baseItemCodesText: string;
  personalRate: number;
  companyRate: number;
  minBase: number;
  maxBaseText: string;
  roundMode: 'ROUND' | 'FLOOR' | 'CEIL';
};
