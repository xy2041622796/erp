import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/erp/finance/cashier/settings/payroll',
    component: () => import('#/views/finance/cashier/settings/payroll/index.vue'),
    name: 'ErpFinanceCashierSettingsPayroll',
    meta: {
      title: '工资项目元数据',
      icon: 'ep:money',
      hideInMenu: true,
      description: '维护工资项目、分类、录入模式、显示规则、生效期等工资主数据。',
    },
  },
  {
    path: '/erp/finance/cashier/payroll',
    redirect: '/erp/finance/cashier/settings/payroll',
    name: 'ErpFinanceCashierPayrollRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '工资项目元数据',
      description: '兼容旧地址，自动跳转到基础设置下的工资项目元数据页面。',
    },
  },
  {
    path: '/erp/finance/payroll',
    redirect: '/erp/finance/cashier/settings/payroll',
    name: 'ErpFinancePayrollRedirect',
    meta: {
      hideInMenu: true,
      hideInTab: true,
      title: '工资项目元数据',
      description: '兼容旧地址，自动跳转到基础设置下的工资项目元数据页面。',
    },
  },
];

export default routes;
