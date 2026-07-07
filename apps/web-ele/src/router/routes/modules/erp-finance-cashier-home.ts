import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/finance/cashier/settings',
    component: () => import('#/views/finance/cashier/settings/index.vue'),
    name: 'ErpFinanceCashierBasicSettings',
    meta: {
      title: '基础设置',
      icon: 'ep:setting',
      hideInMenu: true,
      description: '工资模块基础维护统一入口，集中管理职级、工资项目、公式、纳税规则与按职级绑定规则。',
    },
  },
  {
    path: '/erp/finance/cashier/settings/rank',
    component: () => import('#/views/finance/cashier/settings/rank/index.vue'),
    name: 'ErpFinanceCashierSettingsRank',
    meta: {
      title: '职级与工资项配置',
      icon: 'ep:management',
      hideInMenu: true,
      description: '维护职级与工资项目的适用关系，作为工资基础配置的起点页面。',
    },
  },
  {
    path: '/erp/finance/cashier/settings/tax-rule',
    component: () => import('#/views/finance/cashier/settings/taxRule/index.vue'),
    name: 'ErpFinanceCashierSettingsTaxRule',
    meta: {
      title: '纳税维护中心',
      icon: 'ep:tickets',
      hideInMenu: true,
      description: '维护个税规则、起征点、税档税率和速算扣除数，作为工资税务基础规则中心。',
    },
  },
  {
    path: '/erp/finance/cashier/settings/rank-contribution-rule',
    component: () => import('#/views/finance/cashier/settings/rankContributionRule/index.vue'),
    name: 'ErpFinanceCashierSettingsRankContributionRule',
    meta: {
      title: '五险一金总体维护',
      icon: 'ep:files',
      hideInMenu: true,
      description: '按职级维护社保和公积金规则绑定关系，用于工资计算命中五险一金规则。',
    },
  },
  {
    path: '/erp/finance/cashier/settings/rank-tax-rule',
    component: () => import('#/views/finance/cashier/settings/rankTaxRule/index.vue'),
    name: 'ErpFinanceCashierSettingsRankTaxRule',
    meta: {
      title: '职级纳税规则维护',
      icon: 'ep:coin',
      hideInMenu: true,
      description: '按职级绑定个税规则，支持不同职级命中不同纳税规则。',
    },
  },
  {
    path: '/erp/finance/cashier/settings/attendance-settlement-rule',
    component: () => import('#/views/finance/cashier/settings/attendanceSettlementRule/index.vue'),
    name: 'ErpFinanceCashierSettingsAttendanceSettlementRule',
    meta: {
      title: '月度结算规则维护',
      icon: 'ep:calendar',
      hideInMenu: true,
      description: '维护考勤扣款、加班工资、病假折算等月度工资汇总参数。',
    },
  },
  {
    path: '/erp/finance/cashier/home/rank',
    redirect: '/erp/finance/cashier/settings/rank',
    name: 'ErpFinanceCashierHomeRankRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '职级与工资项配置',
      description: '兼容旧地址，自动跳转到基础设置下的职级与工资项配置页面。',
    },
  },
  {
    path: '/erp/finance/cashier/tax-rule',
    redirect: '/erp/finance/cashier/settings/tax-rule',
    name: 'ErpFinanceCashierTaxRuleRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '纳税维护中心',
      description: '兼容旧地址，自动跳转到基础设置下的纳税维护中心页面。',
    },
  },
  {
    path: '/erp/finance/cashier/rank-contribution-rule',
    redirect: '/erp/finance/cashier/settings/rank-contribution-rule',
    name: 'ErpFinanceCashierRankContributionRuleRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '五险一金总体维护',
      description: '兼容旧地址，自动跳转到基础设置下的五险一金总体维护页面。',
    },
  },
  {
    path: '/erp/finance/cashier/rank-tax-rule',
    redirect: '/erp/finance/cashier/settings/rank-tax-rule',
    name: 'ErpFinanceCashierRankTaxRuleRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '职级纳税规则维护',
      description: '兼容旧地址，自动跳转到基础设置下的职级纳税规则维护页面。',
    },
  },
  {
    path: '/erp/finance/cashier/attendance-settlement-rule',
    redirect: '/erp/finance/cashier/settings/attendance-settlement-rule',
    name: 'ErpFinanceCashierAttendanceSettlementRuleRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '月度结算规则维护',
      description: '兼容旧地址，自动跳转到基础设置下的月度结算规则维护页面。',
    },
  },
  {
    path: '/erp/finance/cashier/wages',
    component: () => import('#/views/finance/cashier/wages/index.vue'),
    name: 'ErpFinanceCashierWages',
    meta: {
      title: '工资表录入',
      icon: 'ep:edit',
      hideInMenu: true,
      description: '进行工资表录入、调整和计算，是工资业务处理页面。',
    },
  },
  {
    path: '/erp/finance/cashier/salary-slip',
    component: () => import('#/views/finance/cashier/salarySlip/index.vue'),
    name: 'ErpFinanceCashierSalarySlip',
    meta: {
      title: '工资条',
      icon: 'ep:document',
      hideInMenu: true,
      description: '查看和管理工资条展示内容及发放结果。',
    },
  },
];

export default routes;
