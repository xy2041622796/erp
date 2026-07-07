import type { QuickLinkItem } from './types';

export const quickLinks: QuickLinkItem[] = [
  {
    title: '工资中心',
    desc: '返回工资模块汇总页，统一查看配置入口与业务入口。',
    path: '/erp/finance/cashier/home',
    buttonText: '返回汇总页',
  },
  {
    title: '工资项目元数据',
    desc: '维护个人社保、个人公积金、个人所得税等工资项目，并绑定对应规则编码。',
    path: '/erp/finance/cashier/settings/payroll',
    buttonText: '去配工资项目',
  },
  {
    title: '工资公式设计',
    desc: '配置税前扣除合计、应税收入、扣减合计、实发工资等普通公式。',
    path: '/erp/finance/cashier/settings/payroll-formula',
    buttonText: '去配工资公式',
  },
  {
    title: '工资表录入',
    desc: '录入工资时验证五险一金、个税、扣减合计、实发工资是否已自动联动。',
    path: '/erp/finance/cashier/wages',
    buttonText: '去录工资验证',
  },
];

export const processLinks = [
  '普通公式先算应发合计 / 税前扣除合计 / 应税收入',
  '社保规则回填个人社保与公司社保',
  '公积金规则回填个人公积金与公司公积金',
  '个税规则按最新税档计算 personal_income_tax',
  '再次回算扣减合计与实发工资',
];
