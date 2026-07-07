<script lang="ts" setup>
import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import { ElCard, ElTag } from 'element-plus';


defineOptions({ name: 'HrSalaryCalculationWorkbenchPage' });

type StageItem = {
  title: string;
  owner: string;
  status: '已完成' | '进行中' | '待建设';
  description: string;
};

const stageItems = computed<StageItem[]>(() => [
  {
    title: '核算口径维护',
    owner: 'HR',
    status: '进行中',
    description: '由人资维护核算周期、核算口径、人员范围和审核规则，逐步替代旧库 salary_calculations 直连。',
  },
  {
    title: '月度核算确认',
    owner: 'HR',
    status: '待建设',
    description: '后续将在 HR 域内承接核算结果确认、复核和审批，不再把财务工资表作为直接耦合对象。',
  },
  {
    title: '政策与区间联动',
    owner: 'HR',
    status: '已完成',
    description: '薪酬政策、报表、区间、对标、双签等配置类模块已切换到 LMBill.Bil_HR_Salary_*。',
  },
  {
    title: '旧库核算表下线',
    owner: 'HR',
    status: '进行中',
    description: '前台已停止通过该页面读写 siweiOA.salary_calculations，后续将在完成新核算模型后彻底下线旧接口。',
  },
]);
</script>

<template>
  <Page auto-content-height>
    <div class="salary-calculation-workbench">
      <div class="hero-card">
        <div>
          <h2>薪资核算</h2>
          <p>
            本页面已调整为 HR 域薪资核算工作台，负责承接核算口径、月度确认、审核收口等流程说明。
            旧表 <code>siweiOA.salary_calculations</code> 已进入退出流程，前台不再通过该页面直接维护旧核算记录。
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
          <div class="summary-label">收口阶段</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-number">1</div>
          <div class="summary-label">旧库依赖退出中</div>
        </ElCard>
        <ElCard shadow="never">
          <div class="summary-number">0</div>
          <div class="summary-label">财务直接关联</div>
        </ElCard>
      </div>

      <div class="stage-grid">
        <ElCard v-for="item in stageItems" :key="item.title" shadow="never" class="stage-card">
          <div class="stage-card__head">
            <div>
              <div class="stage-card__title">{{ item.title }}</div>
              <div class="stage-card__owner">归属：{{ item.owner }}</div>
            </div>
            <ElTag
              :type="item.status === '已完成' ? 'success' : item.status === '进行中' ? 'warning' : 'info'"
              effect="plain"
            >
              {{ item.status }}
            </ElTag>
          </div>
          <div class="stage-card__desc">{{ item.description }}</div>
        </ElCard>
      </div>

      <ElCard shadow="never" class="notice-card">
        <template #header>
          <div class="notice-title">当前落地说明</div>
        </template>
        <ul class="notice-list">
          <li>本页面已停止通过旧 API 读取 <code>siweiOA.salary_calculations</code>。</li>
          <li>当前优先保证薪酬配置、制度和工作台边界清晰，后续再补新的 HR 核算模型。</li>
          <li>工资不再与财务模块直接关联，薪资核算在 HR 域内独立收口。</li>
        </ul>
      </ElCard>
    </div>
  </Page>
</template>

<style scoped>
.salary-calculation-workbench {
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

.stage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stage-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.stage-card__title {
  font-size: 16px;
  font-weight: 600;
}

.stage-card__owner {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.stage-card__desc {
  margin-top: 12px;
  color: #606266;
  line-height: 1.7;
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
