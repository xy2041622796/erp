<script lang="ts" setup>
import { createData, deleteData, getDetail, listData, updateData } from '#/api/erp/project/issue';
import ProjectSubmoduleCrudPage from '#/views/project/_shared/ProjectSubmoduleCrudPage.vue';
import { normalizeDateFields } from '#/views/project/_shared/crud';

import {
  issueConfig,
  mapIssuePriorityLabel,
  mapIssueStatusLabel,
  mapIssueTypeLabel,
} from './data';


const apis = { listData, getDetail, createData, updateData, deleteData };
function getIssueTypeTagClass(value: unknown) {
  return `issue-tag issue-tag--type-${String(value ?? '').trim() || 'unknown'}`;
}

function getIssuePriorityTagClass(value: unknown) {
  return `issue-tag issue-tag--priority-${String(value ?? '').trim() || 'unknown'}`;
}

function getIssueStatusTagClass(value: unknown) {
  return `issue-tag issue-tag--status-${String(value ?? '').trim() || 'unknown'}`;
}

const normalizers = {
  afterLoad(values: Record<string, any>) {
    return normalizeDateFields(values, ['due_date', 'resolved_at']);
  },
  beforeSubmit(values: Record<string, any>) {
    return normalizeDateFields(values, ['due_date', 'resolved_at']);
  },
};
</script>

<template>
  <ProjectSubmoduleCrudPage :config="issueConfig" :apis="apis" :normalizers="normalizers">
    <template #cell_issue_type="{ row }">
      <span :class="getIssueTypeTagClass(row.type)">
        <span class="issue-tag-dot"></span>
        {{ mapIssueTypeLabel(row.type) }}
      </span>
    </template>

    <template #cell_issue_priority="{ row }">
      <span :class="getIssuePriorityTagClass(row.priority)">
        <span class="issue-tag-dot"></span>
        {{ mapIssuePriorityLabel(row.priority) }}
      </span>
    </template>

    <template #cell_issue_status="{ row }">
      <span :class="getIssueStatusTagClass(row.status)">
        <span class="issue-tag-dot"></span>
        {{ mapIssueStatusLabel(row.status) }}
      </span>
    </template>
  </ProjectSubmoduleCrudPage>
</template>


<style scoped>
.issue-tag {
  --issue-tag-color: #64748b;
  --issue-tag-bg: #f8fafc;
  --issue-tag-border: #e2e8f0;
  display: inline-flex;
  min-width: 70px;
  height: 26px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--issue-tag-border);
  border-radius: 999px;
  background: var(--issue-tag-bg);
  color: var(--issue-tag-color);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.issue-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--issue-tag-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--issue-tag-color) 14%, transparent);
}

.issue-tag--type-bug {
  --issue-tag-color: #e11d48;
  --issue-tag-bg: #fff1f2;
  --issue-tag-border: #fecdd3;
}

.issue-tag--type-feature {
  --issue-tag-color: #2563eb;
  --issue-tag-bg: #eff6ff;
  --issue-tag-border: #bfdbfe;
}

.issue-tag--type-improvement {
  --issue-tag-color: #7c3aed;
  --issue-tag-bg: #f5f3ff;
  --issue-tag-border: #ddd6fe;
}

.issue-tag--type-task {
  --issue-tag-color: #059669;
  --issue-tag-bg: #ecfdf5;
  --issue-tag-border: #a7f3d0;
}

.issue-tag--priority-low {
  --issue-tag-color: #64748b;
  --issue-tag-bg: #f8fafc;
  --issue-tag-border: #cbd5e1;
}

.issue-tag--priority-normal {
  --issue-tag-color: #0284c7;
  --issue-tag-bg: #f0f9ff;
  --issue-tag-border: #bae6fd;
}

.issue-tag--priority-high {
  --issue-tag-color: #d97706;
  --issue-tag-bg: #fffbeb;
  --issue-tag-border: #fde68a;
}

.issue-tag--priority-critical {
  --issue-tag-color: #dc2626;
  --issue-tag-bg: #fef2f2;
  --issue-tag-border: #fecaca;
}

.issue-tag--status-open {
  --issue-tag-color: #ea580c;
  --issue-tag-bg: #fff7ed;
  --issue-tag-border: #fed7aa;
}

.issue-tag--status-in_progress {
  --issue-tag-color: #4f46e5;
  --issue-tag-bg: #eef2ff;
  --issue-tag-border: #c7d2fe;
}

.issue-tag--status-resolved {
  --issue-tag-color: #16a34a;
  --issue-tag-bg: #f0fdf4;
  --issue-tag-border: #bbf7d0;
}

.issue-tag--status-closed {
  --issue-tag-color: #475569;
  --issue-tag-bg: #f8fafc;
  --issue-tag-border: #cbd5e1;
}

.issue-tag--type-unknown,
.issue-tag--priority-unknown,
.issue-tag--status-unknown {
  --issue-tag-color: #64748b;
  --issue-tag-bg: #f8fafc;
  --issue-tag-border: #e2e8f0;
}
</style>
