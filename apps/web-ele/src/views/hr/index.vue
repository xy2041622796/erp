<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { ElCard, ElTag } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();

const modules = [
  { title: '人员管理', path: '/hr/staff', status: '已存在', desc: '复用现有 LMBill 人员页面，后续补充 siweiOA 员工档案字段。' },
  { title: '组织管理', path: '/hr/organization', status: '已存在', desc: '复用现有组织架构页面。' },
  { title: '岗位管理', path: '/hr/job', status: '已存在', desc: '复用现有岗位页面。' },
  { title: '考勤管理', path: '/hr/attendance', status: '已存在', desc: '复用现有考勤页面，第二批补充 siweiOA 考勤扩展。' },
  { title: '薪酬管理', path: '/hr/salary', status: '第一批新增', desc: '承接 salary_calculations、salary_records 和薪酬设置表。' },
  { title: '绩效管理', path: '/hr/performance', status: '第一批新增', desc: '承接绩效指标、模板、年度/月度计划、评价、结果、面谈。' },
  { title: '培训成长', path: '/hr/training', status: '第一批新增', desc: '承接课程、胜任力、差距分析、培养计划、成长路线和评估。' },
];

function handleModuleClick(path: string) {
  router.push(path);
}
</script>

<template>
  <Page auto-content-height>
    <div class="hr-home">
      <div class="page-header">
        <div>
          <h1>人力资源</h1>
          <p>siweiOA 人力资源模块迁移到 LMBill ERP 的统一入口</p>
        </div>
        <ElTag type="primary">HumanResources</ElTag>
      </div>

      <div class="module-grid">
        <ElCard v-for="item in modules" :key="item.path" shadow="hover" class="module-card" @click="handleModuleClick(item.path)">
          <div class="module-title">
            <span>{{ item.title }}</span>
            <ElTag size="small" :type="item.status === '已存在' ? 'success' : 'warning'">{{ item.status }}</ElTag>
          </div>
          <div class="module-desc">{{ item.desc }}</div>
          <div class="module-path">src/views/erp/HumanResources/{{ item.path }}</div>
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.hr-home {
  padding: 16px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
}
.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.page-header p {
  margin: 8px 0 0;
  color: #909399;
}
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.module-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}
.module-desc {
  min-height: 48px;
  margin-top: 12px;
  color: #606266;
  line-height: 24px;
}
.module-path {
  margin-top: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
