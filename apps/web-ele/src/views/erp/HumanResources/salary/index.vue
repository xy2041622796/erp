<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import { ElCard, ElTag } from 'element-plus';


defineOptions({ name: 'HrSalaryWorkbenchPage' });

type ModuleCard = {
  title: string;
  scope: string;
  status: '已切换' | '待切换';
  description: string;
  target: string;
};

const moduleCards = computed<ModuleCard[]>(() => [
  {
    title: '薪资核算',
    scope: 'HR',
    status: '待切换',
    description: '用于月度薪资核算、审核与确认。当前仍在迁移收口阶段，将逐步脱离旧表与财务直接耦合。',
    target: 'salary/calculation',
  },
  {
    title: '薪酬政策',
    scope: 'HR',
    status: '已切换',
    description: '维护薪酬政策、适用区域、版本和生效状态，作为人资侧制度配置入口。',
    target: 'salary/policy',
  },
  {
    title: '薪酬报表',
    scope: 'HR',
    status: '已切换',
    description: '维护薪酬报表配置和查询条件，用于人资内部分析与归档。',
    target: 'salary/report',
  },
  {
    title: '薪酬设置',
    scope: 'HR',
    status: '已切换',
    description: '维护薪资区间、对标、双签等基础配置，不再通过旧迁移表承接。',
    target: 'salary/setting',
  },
]);
</script>

<template>
  <Page auto-content-height>
    <div class="salary-workbench">
      <div class="hero-card">
        <div>
          <h2>薪酬管理</h2>
          <p>
            该模块已调整为人资域工作台，负责薪酬制度、核算、审核与配置管理。
            工资不再与财务模块直接关联，旧迁移表 `Bil_Salary_Info / Bil_Salary_Detail` 正在退出前台使用。
          </p>
        </div>
      </div>

      <div class="summary-grid">
        <ElCard shadow="never">
          <div class="summary-number">HR</div>
          <div class="summary-label">归属域</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-number">4</div>
          <div class="summary-label">工作台入口</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-number">2</div>
          <div class="summary-label">已切换模块</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-number">1</div>
          <div class="summary-label">待收口核心模块</div>
        </ElCard>
      </div>

      <div class="module-grid">
        <ElCard v-for="item in moduleCards" :key="item.title" shadow="never" class="module-card">
          <div class="module-card__head">
            <div>
              <div class="module-card__title">{{ item.title }}</div>
              <div class="module-card__scope">归属：{{ item.scope }}</div>
            </div>
            <ElTag :type="item.status === '已切换' ? 'success' : 'warning'" effect="plain">
              {{ item.status }}
            </ElTag>
          </div>
          <div class="module-card__desc">{{ item.description }}</div>
          <div class="module-card__target">入口目录：{{ item.target }}</div>
        </ElCard>
      </div>

      <ElCard shadow="never" class="notice-card">
        <template #header>
          <div class="notice-title">当前落地说明</div>
        </template>
        <ul class="notice-list">
          <li>财务期末检查已去掉工资直接关联，不再通过工资表生成期末业务判断。</li>
          <li>薪酬父级页已停止展示旧迁移批次/明细数据，避免继续放大旧表依赖。</li>
          <li>后续将继续把历史迁移接口下线，并逐步废弃 `Bil_Salary_Info / Bil_Salary_Detail`。</li>
        </ul>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.salary-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.hero-card {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.hero-card h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.hero-card p {
  margin: 10px 0 0;
  color: #606266;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-number {
  font-size: 24px;
  font-weight: 700;
}

.summary-label {
  margin-top: 4px;
  color: #909399;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.module-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.module-card__title {
  font-size: 16px;
  font-weight: 600;
}

.module-card__scope {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.module-card__desc {
  margin-top: 12px;
  color: #606266;
  line-height: 1.7;
}

.module-card__target {
  margin-top: 12px;
  color: #909399;
  font-size: 12px;
}

.notice-card :deep(.el-card__body) {
  padding-top: 8px;
}

.notice-title {
  font-weight: 600;
}

.notice-list {
  margin: 0;
  padding-left: 18px;
  color: #606266;
  line-height: 1.9;
}
</style>
