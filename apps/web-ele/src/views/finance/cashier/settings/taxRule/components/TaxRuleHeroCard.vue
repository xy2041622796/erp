<script lang="ts" setup>
import { ElButton, ElCard, ElTag } from 'element-plus';

defineProps<{
  activeRulesCount: number;
  editing: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  goHome: [];
  beginEdit: [];
  cancelEdit: [];
  resetCurrentCategory: [];
  saveAllRules: [];
  goWages: [];
}>();
</script>

<template>
  <el-card shadow="never" class="hero-card">
    <div class="hero-top">
      <div>
        <div class="hero-title">薪酬规则中心</div>
        <div class="hero-desc">
          当前页面统一维护工资模块的个税、社保、公积金三类规则。保存后会写入当前浏览器本地配置，工资录入页按最新规则自动计算个人社保、个人公积金、个人所得税，以及公司承担金额。
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="emit('goHome')">返回工资中心</el-button>
        <el-button v-if="!editing" @click="emit('beginEdit')">开始维护规则</el-button>
        <el-button v-if="editing" @click="emit('cancelEdit')">取消编辑</el-button>
        <el-button v-if="editing" @click="emit('resetCurrentCategory')">恢复当前页默认</el-button>
        <el-button v-if="editing" type="primary" :loading="saving" @click="emit('saveAllRules')">保存全部规则</el-button>
        <el-button type="primary" plain @click="emit('goWages')">去录工资验证</el-button>
      </div>
    </div>
    <div class="hero-tags">
      <el-tag type="success">规则总数 {{ activeRulesCount }}</el-tag>
      <el-tag>{{ editing ? '当前状态：编辑中' : '当前状态：查看中' }}</el-tag>
      <el-tag type="warning">保存范围：当前浏览器本地</el-tag>
    </div>
  </el-card>
</template>

<style scoped>
.hero-card { border-radius: 12px; }
.hero-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.hero-title { font-size:24px; font-weight:700; margin-bottom:10px; }
.hero-desc { color:var(--el-text-color-secondary); line-height:1.8; }
.hero-actions { display:flex; gap:8px; flex-wrap:wrap; }
.hero-tags { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
</style>
