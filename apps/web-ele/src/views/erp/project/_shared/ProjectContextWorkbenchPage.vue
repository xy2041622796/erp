<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';


import { getProjectManageSimpleList } from '#/api/erp/project/manage';

import {
  ElButton,
  ElCard,
  ElOption,
  ElSelect,
  ElSkeleton,
  ElTag,
} from 'element-plus';

export interface ProjectContextMetric {
  label: string;
  description?: string;
  path: string;
  type?: 'danger' | 'info' | 'primary' | 'success' | 'warning';
  loader: (project: Record<string, any>) => Promise<number>;
}

export interface ProjectContextEntry {
  title: string;
  description: string;
  path: string;
  tag?: string;
  primaryActionText?: string;
}

const props = defineProps<{
  title: string;
  description: string;
  metrics: ProjectContextMetric[];
  entries: ProjectContextEntry[];
}>();

const router = useRouter();
const projects = ref<Record<string, any>[]>([]);
const selectedProjectId = ref<string>();
const loadingProjects = ref(false);
const loadingMetrics = ref(false);
const metricValues = ref<Record<string, number>>({});

const selectedProject = computed(() =>
  projects.value.find((item) => String(item.rowid) === String(selectedProjectId.value)),
);

function getProjectLabel(project: Record<string, any>) {
  const name = String(project?.project_name ?? '').trim();
  const code = String(project?.project_code ?? '').trim();
  if (name && code) return `${name}（${code}）`;
  return name || code || String(project?.rowid ?? '');
}

function go(path: string) {
  router.push(path);
}

async function loadProjects() {
  loadingProjects.value = true;
  try {
    const rows = await getProjectManageSimpleList();
    projects.value = Array.isArray(rows) ? rows : [];
    if (!selectedProjectId.value && projects.value.length > 0) {
      selectedProjectId.value = String(projects.value[0]?.rowid ?? '');
    }
  } finally {
    loadingProjects.value = false;
  }
}

async function loadMetrics() {
  if (!selectedProject.value) {
    metricValues.value = {};
    return;
  }
  loadingMetrics.value = true;
  try {
    const pairs = await Promise.all(
      props.metrics.map(async (metric) => {
        try {
          const value = await metric.loader(selectedProject.value as Record<string, any>);
          return [metric.label, Number(value || 0)] as const;
        } catch (error) {
          console.error(`[project-context] load metric failed: ${metric.label}`, error);
          return [metric.label, 0] as const;
        }
      }),
    );
    metricValues.value = Object.fromEntries(pairs);
  } finally {
    loadingMetrics.value = false;
  }
}

watch(selectedProjectId, () => {
  loadMetrics();
});

onMounted(async () => {
  await loadProjects();
  await loadMetrics();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mb-5 rounded-xl bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="text-xl font-semibold">{{ props.title }}</div>
          <div class="mt-2 text-sm text-gray-500">{{ props.description }}</div>
        </div>
        <div class="flex min-w-[320px] items-center gap-2">
          <ElSelect
            v-model="selectedProjectId"
            :loading="loadingProjects"
            filterable
            clearable
            placeholder="请选择项目"
            class="!w-full"
          >
            <ElOption
              v-for="project in projects"
              :key="project.rowid"
              :label="getProjectLabel(project)"
              :value="String(project.rowid)"
            />
          </ElSelect>
          <ElButton :loading="loadingMetrics" @click="loadMetrics">刷新</ElButton>
        </div>
      </div>
    </div>

    <div v-if="!selectedProject" class="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      请先选择一个项目。
    </div>

    <template v-else>
      <ElSkeleton :loading="loadingMetrics" animated>
        <template #default>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ElCard
              v-for="metric in props.metrics"
              :key="metric.label"
              shadow="hover"
              class="cursor-pointer rounded-xl"
              @click="go(metric.path)"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm text-gray-500">{{ metric.label }}</div>
                  <div class="mt-2 text-3xl font-semibold">{{ metricValues[metric.label] ?? 0 }}</div>
                  <div v-if="metric.description" class="mt-2 text-xs text-gray-400">
                    {{ metric.description }}
                  </div>
                </div>
                <ElTag :type="metric.type || 'info'">查看</ElTag>
              </div>
            </ElCard>
          </div>
        </template>
      </ElSkeleton>

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ElCard
          v-for="entry in props.entries"
          :key="entry.path"
          shadow="hover"
          class="rounded-xl"
        >
          <div class="flex min-h-[150px] flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-base font-semibold">{{ entry.title }}</div>
                <ElTag v-if="entry.tag" size="small" type="info">{{ entry.tag }}</ElTag>
              </div>
              <div class="mt-3 text-sm leading-6 text-gray-500">{{ entry.description }}</div>
            </div>
            <div class="mt-5">
              <ElButton type="primary" @click="go(entry.path)">
                {{ entry.primaryActionText || '进入' }}
              </ElButton>
            </div>
          </div>
        </ElCard>
      </div>
    </template>
  </Page>
</template>
