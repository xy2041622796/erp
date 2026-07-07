<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { ElCard, ElTag } from 'element-plus';
import { useRouter } from 'vue-router';

defineOptions({ name: 'HrOrganizationIndexPage' });

const router = useRouter();

const subModules = [
  { title: '组织架构', path: '/hr/organization/orgChart', desc: '部门树维护、部门新增/编辑/删除、拖拽移动、岗位人员配置。' },
  { title: '人员管理', path: '/hr/organization/usermanagement', desc: '人员列表查询、新增/编辑/删除、照片上传、角色与权限查看。' },
  { title: '岗位管理', path: '/hr/organization/jobManage', desc: '按部门级别筛选岗位列表，维护岗位信息和定编人数。' },
];

function handleClick(path: string) {
  router.push(path);
}
</script>

<template>
  <Page auto-content-height>
    <div class="organization-entry">
      <h1>组织管理</h1>
      <p>选择以下子模块进入对应功能：</p>

      <div class="module-grid">
        <ElCard v-for="item in subModules" :key="item.path" shadow="hover" class="module-card" @click="handleClick(item.path)">
          <div class="module-title">
            <span>{{ item.title }}</span>
            <ElTag size="small" type="primary">入口</ElTag>
          </div>
          <div class="module-desc">{{ item.desc }}</div>
        </ElCard>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.organization-entry { padding: 24px; color: var(--el-text-color-primary); }
.organization-entry h1 { margin: 0 0 8px; font-size: 22px; font-weight: 600; }
.organization-entry p { margin: 0 0 20px; color: var(--el-text-color-secondary); }
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.module-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.module-card:hover {
  transform: translateY(-2px);
}
.module-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 8px;
}
.module-desc {
  color: #606266;
  line-height: 24px;
}
</style>
