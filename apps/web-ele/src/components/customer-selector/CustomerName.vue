<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { CrmCustomerApi } from '#/api/erp/customer';
import { getCustomer } from '#/api/erp/customer';

defineOptions({ name: 'CustomerName' });

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

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const label = ref<string>('');

const idKey = computed(() => {
  const v = props.id;
  const s = v === 0 ? '0' : String(v ?? '').trim();
  return s || '';
});

async function resolveCustomerName(id: string) {
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
      const c = (await getCustomer(id)) as any as CrmCustomerApi.Customer;
      const name = (c as any)?.customerName || (c as any)?.name || id;
      cache.set(id, name);
      return name;
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
    void resolveCustomerName(v);
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
