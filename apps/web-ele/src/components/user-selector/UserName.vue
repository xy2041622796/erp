<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { SystemUserApi } from '#/api/system/user';
import { getUser, getUserByRowid } from '#/api/system/user';

defineOptions({ name: 'UserName' });

const props = withDefaults(
  defineProps<{
    id?: string | number | null;
    placeholder?: string;
  }>(),
  {
    id: undefined,
    placeholder: '--',
  },
);

// cache in module scope to share across instances
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const label = ref<string>('');

const idKey = computed(() => {
  const v = props.id;
  const s = v === 0 ? '0' : String(v ?? '').trim();
  return s || '';
});

function pickUserName(u: any, fallback: string) {
  return (
    u?.UserName ||
    u?.username ||
    u?.name ||
    u?.LoginName ||
    u?.ROWID ||
    u?.ID ||
    fallback
  );
}

function isUsableName(name: any, id: string) {
  const s = String(name ?? '').trim();
  if (!s) return false;
  // 如果返回的“名字”其实就是 ID/ROWID，则视为不可用，继续尝试 ROWID 查询
  return s !== id;
}

async function resolveUserName(id: string) {
  if (!id) {
    label.value = '';
    return;
  }

  const cached = cache.get(id);
  if (cached) {
    label.value = cached;
    return;
  }

  const existing = inflight.get(id);
  if (existing) {
    label.value = await existing;
    return;
  }

  const task = (async () => {
    try {
      // 1) 优先按 ID(pkField=ID) 查
      const res: any = await getUser(id);
      const u: SystemUserApi.User =
        (res as any)?.list || (res as any)?.data || res;
      const name1 = pickUserName(u, id);
      if (isUsableName(name1, id)) {
        cache.set(id, name1);
        return name1;
      }

      // 2) 回退：按 ROWID 查（兼容业务字段直接存 ROWID）
      const res2: any = await getUserByRowid(id);
      const u2: SystemUserApi.User =
        (res2 as any)?.list || (res2 as any)?.data || res2;
      const name2 = pickUserName(u2, id);
      cache.set(id, name2);
      return name2;
    } catch {
      cache.set(id, id);
      return id;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, task);
  label.value = await task;
}

watch(
  idKey,
  (v) => {
    if (!v) {
      label.value = '';
      return;
    }
    void resolveUserName(v);
  },
  { immediate: true },
);

const display = computed(
  () => label.value || (idKey.value ? idKey.value : props.placeholder),
);
</script>

<template>
  <span>{{ display }}</span>
</template>
