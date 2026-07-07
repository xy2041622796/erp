import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/finance/cashier/settings/payroll-formula',
    component: () => import('#/views/finance/cashier/settings/payrollFormula/index.vue'),
    name: 'ErpFinanceCashierSettingsPayrollFormula',
    meta: {
      title: '公式表设计',
      icon: 'ep:edit-pen',
      hideInMenu: true,
      description: '配置工资公式、计算顺序和模板，支撑应发、扣减、实发等自动计算。',
    },
  },
  {
    path: '/erp/finance/cashier/payroll-formula',
    redirect: '/erp/finance/cashier/settings/payroll-formula',
    name: 'ErpFinanceCashierPayrollFormulaRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '公式表设计',
      description: '兼容旧地址，自动跳转到基础设置下的公式表设计页面。',
    },
  },
];

export default routes;
