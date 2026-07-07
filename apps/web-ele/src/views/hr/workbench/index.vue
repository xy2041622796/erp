<script lang="ts" setup>
import { Page } from '@vben/common-ui';
import { useRouter } from 'vue-router';

import {
  Bell,
  Calendar,
  Checked,
  Collection,
  Compass,
  CreditCard,
  Document,
  DocumentChecked,
  Files,
  Flag,
  Histogram,
  Notebook,
  OfficeBuilding,
  Reading,
  User,
  Wallet,
} from '@element-plus/icons-vue';

import {
  ElCard,
  ElCol,
  ElProgress,
  ElRow,
  ElTag,
} from 'element-plus';

defineOptions({ name: 'HrWorkbench' });

const router = useRouter();

function goTo(path: string) {
  router.push(path);
}

type QuickService = {
  icon: unknown;
  label: string;
  bg: string;
  path: string;
  badge?: string;
};

type SummaryCard = {
  label: string;
  value: string;
  unit: string;
  tone: 'default' | 'success' | 'danger';
  icon: unknown;
  path: string;
};

type CalendarItem = {
  title: string;
  date: string;
  tone: 'danger' | 'info' | 'success';
  icon: unknown;
  path: string;
};

type TodoItem = {
  title: string;
  tag: string;
  time: string;
  tone: 'primary' | 'danger' | 'warning';
  path: string;
};

const quickServices: QuickService[] = [
  { icon: Calendar, label: '请假申请', bg: 'linear-gradient(135deg, #4f8cff 0%, #66a6ff 100%)', path: '/hr/attendance/leave-overtime' },
  { icon: Histogram, label: '加班申请', bg: 'linear-gradient(135deg, #5f6b7a 0%, #7b8797 100%)', path: '/hr/attendance/leave-overtime' },
  { icon: Document, label: '证明开具', bg: 'linear-gradient(135deg, #9254de 0%, #b37feb 100%)', path: '/hr/staff/certificate' },
  { icon: User, label: '我的档案', bg: 'linear-gradient(135deg, #6377ff 0%, #7d91ff 100%)', path: '/hr/staff/archive' },
  { icon: Wallet, label: '我的工资条', bg: 'linear-gradient(135deg, #20bf6b 0%, #4cd97b 100%)', path: '/hr/salary/wages', badge: '新' },
  { icon: Reading, label: '培训报名', bg: 'linear-gradient(135deg, #ff4d73 0%, #ff6b8b 100%)', path: '/hr/training/course' },
  { icon: Flag, label: '绩效自评', bg: 'linear-gradient(135deg, #ff9f1a 0%, #ffbf69 100%)', path: '/hr/performance/evaluation/review' },
];

const summaryCards: SummaryCard[] = [
  { label: '总人数', value: '28', unit: '人', tone: 'default', icon: OfficeBuilding, path: '/hr/staff' },
  { label: '本月入职', value: '+3', unit: '人', tone: 'success', icon: Checked, path: '/hr/onboarding/entry' },
  { label: '本月离职', value: '-1', unit: '人', tone: 'danger', icon: Bell, path: '/hr/onboarding/resignation' },
];

const attendanceMetrics = [
  { label: '应到', value: '28', className: 'is-default', path: '/hr/attendance/info' },
  { label: '实到', value: '26', className: 'is-success', path: '/hr/attendance/info' },
  { label: '迟到', value: '2', className: 'is-danger', path: '/hr/attendance/exception' },
  { label: '请假', value: '2', className: 'is-warning', path: '/hr/attendance/leave-overtime' },
];

const pendingTags = [
  { label: '待审批', value: '5', type: 'primary', path: '/hr/onboarding' },
  { label: '待面试', value: '3', type: 'warning', path: '/hr/recruitment' },
  { label: '待绩效面谈', value: '2', type: 'danger', path: '/hr/performance/evaluation/interview' },
];

const anniversaries = [
  { name: '王芳', note: '入职四周年', initial: '王', path: '/hr/staff/archive' },
  { name: '李明', note: '生日', initial: '李', path: '/hr/staff/archive' },
];

const calendarItems: CalendarItem[] = [
  { title: '圣诞节', date: '12-25', tone: 'danger', icon: Calendar, path: '/hr/attendance/schedule' },
  { title: '第四期团建活动', date: '12-28', tone: 'info', icon: Collection, path: '/hr/training/course' },
  { title: '元旦放假', date: '01-01', tone: 'danger', icon: Files, path: '/hr/attendance/schedule' },
  { title: '发薪日', date: '01-15', tone: 'success', icon: CreditCard, path: '/hr/salary/wages' },
];

const weekSchedules = [
  { label: '12-20 项目周例会', path: '/hr/project-hours' },
  { label: '12-22 月度考核截止', path: '/hr/performance/evaluation' },
  { label: '12-25 圣诞节', path: '/hr/attendance/schedule' },
];



const todoItems: TodoItem[] = [
  { title: '李四的转正申请待审批', tag: '员工管理', time: '10分钟前', tone: 'primary', path: '/hr/onboarding/entry' },
  { title: '王五的离职手续待办理', tag: '人事异动', time: '30分钟前', tone: 'warning', path: '/hr/onboarding/resignation' },
  { title: '新员工入职培训反馈确认', tag: '培训管理', time: '1小时前', tone: 'danger', path: '/hr/training/evaluation' },
];

const courses = [
  { title: '新员工入职培训', value: 8, total: 10, path: '/hr/training/course' },
  { title: '项目管理实战课', value: 9, total: 20, path: '/hr/training/course' },
  { title: '沟通技巧提升', value: 8, total: 8, path: '/hr/training/course' },
];

const recommendations = [
  { title: '高效时间管理', meta: '内训 · 4小时', path: '/hr/training/learning-path/plan' },
  { title: '销售力协作指南', meta: '系列课 · 3讲', path: '/hr/training/learning-path/roadmap' },
  { title: '职场沟通艺术', meta: '外训 · 6小时', path: '/hr/training/course' },
];

function summaryCardClass(tone: SummaryCard['tone']) {
  return {
    default: 'summary-card is-default',
    success: 'summary-card is-success',
    danger: 'summary-card is-danger',
  }[tone];
}

function calendarClass(tone: CalendarItem['tone']) {
  return {
    danger: 'calendar-item is-danger',
    info: 'calendar-item is-info',
    success: 'calendar-item is-success',
  }[tone];
}

function todoTagType(tone: TodoItem['tone']) {
  return {
    primary: 'primary',
    warning: 'warning',
    danger: 'danger',
  }[tone];
}

const now = new Date();
const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月`;
</script>

<template>
  <Page>
    <div class="hr-workbench-page">
      <ElRow :gutter="16">
        <ElCol :xl="17" :lg="16" :md="24" :sm="24" :xs="24">
          <div class="left-panel">
            <ElCard shadow="never" class="panel-card">
              <template #header>
                <div class="panel-title">
                  <span class="title-badge is-blue">云</span>
                  <span>我的快捷服务</span>
                </div>
              </template>
              <div class="quick-grid">
                <div v-for="item in quickServices" :key="item.label" class="quick-item clickable" @click="goTo(item.path)">
                  <span v-if="item.badge" class="quick-badge">{{ item.badge }}</span>
                  <div class="quick-icon" :style="{ background: item.bg }">
                    <component :is="item.icon" />
                  </div>
                  <div class="quick-label">{{ item.label }}</div>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="panel-card">
              <template #header>
                <div class="panel-title">
                  <span class="title-badge is-purple">团</span>
                  <span>我的团队概览</span>
                </div>
              </template>

              <div class="summary-grid">
                <div v-for="item in summaryCards" :key="item.label" :class="[summaryCardClass(item.tone), 'clickable']" @click="goTo(item.path)">
                  <div class="summary-top">
                    <span>{{ item.label }}</span>
                    <component :is="item.icon" class="summary-icon" />
                  </div>
                  <div class="summary-value-row">
                    <span class="summary-value">{{ item.value }}</span>
                    <span class="summary-unit">{{ item.unit }}</span>
                  </div>
                </div>
              </div>

              <div class="attendance-card">
                <div class="sub-header">
                  <span>今日考勤</span>
                  <ElTag size="small" type="success" effect="light">正常</ElTag>
                </div>
                <div class="attendance-grid">
                  <div v-for="item in attendanceMetrics" :key="item.label" class="attendance-item clickable" @click="goTo(item.path)">
                    <div class="attendance-value" :class="item.className">{{ item.value }}</div>
                    <div class="attendance-label">{{ item.label }}</div>
                  </div>
                </div>
              </div>

              <div class="bottom-overview">
                <div class="pending-wrap">
                  <div v-for="item in pendingTags" :key="item.label" class="pending-item clickable" @click="goTo(item.path)">
                    <span class="pending-label">{{ item.label }}</span>
                    <ElTag :type="item.type as any" effect="light" round>{{ item.value }}</ElTag>
                  </div>
                </div>
                <div class="anniversary-card">
                  <div class="anniversary-title">今日纪念</div>
                  <div v-for="item in anniversaries" :key="item.name" class="anniversary-item clickable" @click="goTo(item.path)">
                    <div class="anniversary-avatar">{{ item.initial }}</div>
                    <div>
                      <div class="anniversary-name">{{ item.name }}</div>
                      <div class="anniversary-note">{{ item.note }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="panel-card todo-card">
              <template #header>
                <div class="panel-title">
                  <span class="title-badge is-gray">办</span>
                  <span>待办与通知</span>
                </div>
              </template>
              <div class="todo-list">
                <div v-for="item in todoItems" :key="item.title" class="todo-list-item clickable" @click="goTo(item.path)">
                  <div class="todo-icon-wrap">
                    <DocumentChecked class="todo-icon" />
                  </div>
                  <div class="todo-content">
                    <div class="todo-title">{{ item.title }}</div>
                    <div class="todo-meta">
                      <ElTag :type="todoTagType(item.tone) as any" size="small" effect="light">{{ item.tag }}</ElTag>
                      <span>{{ item.time }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ElCard>
          </div>
        </ElCol>

        <ElCol :xl="7" :lg="8" :md="24" :sm="24" :xs="24">
          <div class="right-panel">
            <ElCard shadow="never" class="panel-card side-card">
              <template #header>
                <div class="panel-title-between">
                  <div class="panel-title">
                    <span class="title-badge is-green">历</span>
                    <span>智能人事日历</span>
                  </div>
                  <span class="side-date">{{ currentDate }}</span>
                </div>
              </template>
              <div class="calendar-list">
                <div v-for="item in calendarItems" :key="item.title" :class="[calendarClass(item.tone), 'clickable']" @click="goTo(item.path)">
                  <div class="calendar-main">
                    <component :is="item.icon" class="calendar-icon" />
                    <span>{{ item.title }}</span>
                  </div>
                  <div class="calendar-date">{{ item.date }}</div>
                </div>
              </div>
              <div class="schedule-card">
                <div class="schedule-title">未来7天日程</div>
                <div v-for="item in weekSchedules" :key="item.label" class="schedule-item clickable" @click="goTo(item.path)">
                  <span class="schedule-dot"></span>
                  <span>{{ item.label }}</span>
                </div>
              </div>
            </ElCard>

            <ElCard shadow="never" class="panel-card side-card">
              <template #header>
                <div class="panel-title">
                  <span class="title-badge is-pink">学</span>
                  <span>学习与发展</span>
                </div>
              </template>

              <div class="section-title">我的课程</div>
              <div class="course-list">
                <div v-for="item in courses" :key="item.title" class="course-item clickable" @click="goTo(item.path)">
                  <div class="course-row">
                    <span>{{ item.title }}</span>
                    <span>{{ item.value }}/{{ item.total }}</span>
                  </div>
                  <ElProgress :percentage="Math.round((item.value / item.total) * 100)" :stroke-width="8" :show-text="false" />
                </div>
              </div>

              <div class="section-title recommend-title">推荐学习</div>
              <div class="recommend-list">
                <div v-for="item in recommendations" :key="item.title" class="recommend-item clickable" @click="goTo(item.path)">
                  <div class="recommend-left">
                    <div class="recommend-icon">
                      <Notebook />
                    </div>
                    <div>
                      <div class="recommend-name">{{ item.title }}</div>
                      <div class="recommend-meta">{{ item.meta }}</div>
                    </div>
                  </div>
                  <span class="recommend-arrow">›</span>
                </div>
              </div>
            </ElCard>
          </div>
        </ElCol>
      </ElRow>
    </div>
  </Page>
</template>

<style scoped>
.hr-workbench-page {
  min-height: calc(100vh - 120px);
  margin: -16px;
  padding: 16px;
  background: #f3f6fb;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-card {
  border: none;
  border-radius: 18px;
  box-shadow: 0 2px 10px rgb(15 23 42 / 5%);
}

:deep(.panel-card .el-card__header) {
  padding: 18px 20px 0;
  border-bottom: none;
}

:deep(.panel-card .el-card__body) {
  padding: 18px 20px 20px;
}

.panel-title,
.panel-title-between {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}

.panel-title-between {
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.title-badge.is-blue { background: #e8f1ff; color: #3b82f6; }
.title-badge.is-purple { background: #f2eaff; color: #8b5cf6; }
.title-badge.is-gray { background: #f3f4f6; color: #6b7280; }
.title-badge.is-green { background: #e9fbf4; color: #10b981; }
.title-badge.is-pink { background: #ffeaf1; color: #ec4899; }

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.clickable {
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
}

.quick-item {
  position: relative;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  background: #f8fafc;
}

.quick-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  line-height: 18px;
}

.quick-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #fff;
}

.quick-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.quick-label {
  margin-top: 10px;
  font-size: 13px;
  color: #374151;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  border-radius: 16px;
  padding: 18px;
}

.summary-card.is-default { background: #f8fafc; }
.summary-card.is-success { background: #eaf8f2; }
.summary-card.is-danger { background: #fdeef0; }

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #6b7280;
  font-size: 13px;
}

.summary-icon {
  width: 16px;
  height: 16px;
}

.summary-value-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-top: 14px;
}

.summary-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: #111827;
}

.summary-unit {
  padding-bottom: 2px;
  color: #9ca3af;
}

.attendance-card {
  margin-top: 16px;
  border-radius: 16px;
  padding: 16px 18px;
  background: #f8fafc;
}

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.attendance-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.attendance-item { text-align: center; }

.attendance-value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.attendance-value.is-default { color: #374151; }
.attendance-value.is-success { color: #10b981; }
.attendance-value.is-danger { color: #ef4444; }
.attendance-value.is-warning { color: #f59e0b; }

.attendance-label {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.bottom-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  margin-top: 16px;
}

.pending-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: flex-start;
}

.pending-item {
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 14px;
  padding: 12px 14px;
  background: #f8fafc;
}

.pending-label { color: #475569; }

.anniversary-card {
  border-radius: 16px;
  padding: 16px;
  background: #fff7e8;
}

.anniversary-title {
  margin-bottom: 12px;
  color: #d97706;
  font-weight: 700;
}

.anniversary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.anniversary-item + .anniversary-item { margin-top: 12px; }

.anniversary-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f59e0b;
  color: #fff;
  font-weight: 700;
}

.anniversary-name {
  color: #374151;
  font-weight: 600;
}

.anniversary-note {
  margin-top: 4px;
  color: #d97706;
  font-size: 12px;
}

.todo-tabs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.todo-tab {
  position: relative;
  padding-bottom: 6px;
  color: #9ca3af;
  font-size: 13px;
}

.todo-tab em {
  margin-left: 4px;
  font-style: normal;
}

.todo-tab.is-active {
  color: #2563eb;
  font-weight: 700;
}

.todo-tab.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 999px;
  background: #2563eb;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 16px;
  padding: 16px;
  background: #f8fafc;
}

.todo-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #eef4ff;
  color: #3b82f6;
}

.todo-icon {
  width: 18px;
  height: 18px;
}

.todo-content {
  min-width: 0;
  flex: 1;
}

.todo-title {
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.side-date {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
}

.calendar-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-item {
  border-radius: 14px;
  padding: 14px 16px;
}

.calendar-item.is-danger { background: #fdecec; color: #e11d48; }
.calendar-item.is-info { background: #eaf3ff; color: #3b82f6; }
.calendar-item.is-success { background: #eafaf1; color: #10b981; }

.calendar-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.calendar-icon {
  width: 16px;
  height: 16px;
}

.calendar-date {
  margin-top: 6px;
  padding-left: 24px;
  font-size: 12px;
  opacity: 0.85;
}

.schedule-card {
  margin-top: 14px;
  border-radius: 16px;
  padding: 16px;
  background: #f8fafc;
}

.schedule-title,
.section-title {
  color: #475569;
  font-size: 14px;
  font-weight: 700;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
}

.schedule-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #475569;
  font-size: 13px;
}

.recommend-title {
  margin-top: 18px;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 14px;
  padding: 12px 14px;
  background: #f8fafc;
}

.recommend-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recommend-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #ffe7ef;
  color: #ec4899;
}

.recommend-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.recommend-name {
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.recommend-meta {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.recommend-arrow {
  color: #cbd5e1;
  font-size: 20px;
}

@media (max-width: 1200px) {
  .quick-grid,
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bottom-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hr-workbench-page {
    margin: -12px;
    padding: 12px;
  }

  .quick-grid,
  .summary-grid,
  .attendance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel-title-between {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
