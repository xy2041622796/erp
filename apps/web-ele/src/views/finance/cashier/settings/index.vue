<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { ElButton, ElCard, ElCol, ElRow } from 'element-plus';

defineOptions({ name: 'ErpFinanceCashierBasicSettingsPage' });

const router = useRouter();

const sections = [
  {
    title: '主数据与规则',
    desc: '把工资主数据、公式、薪酬规则收敛到基础设置里统一维护。',
    cards: [
      {
        title: '职级与工资项配置',
        desc: '按职级设置人员与工资项范围，是工资配置的基础入口。',
        path: '/erp/finance/cashier/settings/rank',
        buttonText: '进入职级配置',
      },
      {
        title: '工资项目元数据',
        desc: '维护工资项、分类、录入模式、显示规则、生效期。',
        path: '/erp/finance/cashier/settings/payroll',
        buttonText: '进入工资项目',
      },
      {
        title: '工资公式设计',
        desc: '配置应发、税前扣除、应税收入、扣减合计、实发工资等公式。',
        path: '/erp/finance/cashier/settings/payroll-formula',
        buttonText: '进入公式设计',
      },
      {
        title: '纳税维护中心',
        desc: '维护个税规则、应税来源、起征点、税档税率和速算扣除数。',
        path: '/erp/finance/cashier/settings/tax-rule',
        buttonText: '进入纳税维护',
      },
      {
        title: '月度结算规则维护',
        desc: '参数化维护考勤扣款、加班工资、病假折算、月计薪天数和归集工资项。',
        path: '/erp/finance/cashier/settings/attendance-settlement-rule',
        buttonText: '进入月结算规则',
      },
    ],
  },
  {
    title: '按职级绑定规则',
    desc: '把五险一金规则、纳税规则按职级映射到实际工资业务上，作为基础设置的第二层。',
    cards: [
      {
        title: '五险一金总体维护',
        desc: '按职级绑定社保规则与公积金规则，是五险一金按职级命中的入口页。',
        path: '/erp/finance/cashier/settings/rank-contribution-rule',
        buttonText: '进入五险一金维护',
      },
      {
        title: '职级纳税规则维护',
        desc: '按职级绑定个税规则，是不同职级适用不同纳税规则的入口页。',
        path: '/erp/finance/cashier/settings/rank-tax-rule',
        buttonText: '进入职级纳税维护',
      },
    ],
  },
];

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <Page auto-content-height>
    <div class="basic-settings-page">
      <el-card shadow="never" class="hero-card">
        <div class="hero-title">基础设置</div>
        <div class="hero-desc">
          把工资模块里零散的维护页统一收敛到一个基础设置入口下管理。首页只保留基础设置与工资业务两个主入口，减少页面分散和维护心智负担。
        </div>
        <div class="hero-actions">
          <el-button type="primary" @click="go('/erp/finance/cashier/settings/rank')">先配职级与工资项</el-button>
          <el-button @click="go('/erp/finance/cashier/settings/payroll')">再配工资项目</el-button>
          <el-button @click="go('/erp/finance/cashier/settings/tax-rule')">再配纳税维护</el-button>
          <el-button @click="go('/erp/finance/cashier/settings/rank-contribution-rule')">再配五险一金维护</el-button>
          <el-button @click="go('/erp/finance/cashier/settings/rank-tax-rule')">再配职级纳税规则</el-button>
          <el-button @click="go('/erp/finance/cashier/settings/attendance-settlement-rule')">再配月度结算规则</el-button>
        </div>
      </el-card>

      <div v-for="section in sections" :key="section.title" class="section-block">
        <div class="section-head">
          <div class="section-title">{{ section.title }}</div>
          <div class="section-desc">{{ section.desc }}</div>
        </div>

        <el-row :gutter="16">
          <el-col v-for="card in section.cards" :key="card.path" :xs="24" :sm="12" :lg="8">
            <el-card shadow="hover" class="nav-card">
              <div class="nav-card-title">{{ card.title }}</div>
              <div class="nav-card-desc">{{ card.desc }}</div>
              <div class="nav-card-actions">
                <el-button type="primary" @click="go(card.path)">{{ card.buttonText }}</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.basic-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.nav-card {
  border-radius: 12px;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
}

.hero-desc {
  color: var(--el-text-color-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
}

.section-desc,
.nav-card-desc {
  color: var(--el-text-color-secondary);
}

.nav-card {
  min-height: 180px;
}

.nav-card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}

.nav-card-desc {
  line-height: 1.7;
  min-height: 52px;
}

.nav-card-actions {
  margin-top: 20px;
}
</style>
