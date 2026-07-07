<script lang="ts" setup>

import type { QuickStartCard } from '../types';

import { useRouter } from 'vue-router';

import { ElAlert, ElButton, ElCard } from 'element-plus';

defineProps<{
  quickStartCards: QuickStartCard[];
}>();

const emit = defineEmits<{
  openTemplates: [];
  create: [];
}>();

const router = useRouter();

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <el-card shadow="never" class="guide-card">
    <template #header>
      <div class="card-header">
        <span>工资公式设置</span>
        <div class="header-actions">
          <el-button @click="emit('openTemplates')">常用公式</el-button>
          <el-button type="primary" @click="emit('create')">新增公式</el-button>
        </div>
      </div>
    </template>
    <div class="quick-start-grid">
      <div v-for="item in quickStartCards" :key="item.title" class="quick-start-item">
        <div class="quick-start-title">{{ item.title }}</div>
        <div class="quick-start-desc">{{ item.desc }}</div>
      </div>
    </div>

    <el-alert
      class="compat-alert"
      type="info"
      :closable="false"
      show-icon
      title="本页已兼容 tax-rule 的规则链路：纳税维护中心维护税档，五险一金总体维护页维护五险一金比例，本页维护社保基数、公积金基数、应税收入、扣减合计、实发工资等公式来源。"
    />

    <div class="compat-grid">
      <div class="compat-item">
        <div class="compat-title">建议在本页优先维护的结果项</div>
        <div class="compat-desc">应发合计、社保基数、公积金基数、税前扣除合计、应税收入、扣减合计、实发工资。</div>
      </div>
      <div class="compat-item">
        <div class="compat-title">建议在规则页维护的内容</div>
        <div class="compat-desc">个税税档、起征点、五险一金公司/个人缴纳比例，以及按职级绑定的五险一金规则。</div>
      </div>
      <div class="compat-item">
        <div class="compat-title">相关页面跳转</div>
        <div class="compat-actions">
          <el-button link type="primary" @click="go('/erp/finance/cashier/settings/tax-rule')">纳税维护中心</el-button>
          <el-button link type="primary" @click="go('/erp/finance/cashier/settings/rank-contribution-rule')">五险一金总体维护</el-button>
          <el-button link type="primary" @click="go('/erp/finance/cashier/settings/rank-tax-rule')">职级纳税规则维护</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.guide-card { border-radius: 10px; }
.card-header,.header-actions{display:flex;align-items:center;gap:12px}
.card-header{justify-content:space-between}
.quick-start-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.quick-start-item,.compat-item{border:1px solid var(--el-border-color-lighter);border-radius:10px;padding:12px;background:var(--el-fill-color-blank)}
.quick-start-title,.compat-title{font-size:14px;font-weight:600;margin-bottom:4px}
.quick-start-desc,.compat-desc{color:var(--el-text-color-secondary);line-height:1.6}
.compat-alert{margin-top:14px}
.compat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.compat-actions{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
</style>
