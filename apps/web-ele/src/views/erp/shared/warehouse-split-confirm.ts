import { h, ref } from 'vue';

import { ElCheckbox, ElMessageBox } from 'element-plus';

import type { WarehouseSplitGroup } from '#/api/erp/shared/warehouse-split-generate';

const SKIP_KEY = 'erp:warehouse-split:skip-confirm';

function getSkip() {
  return localStorage.getItem(SKIP_KEY) === '1';
}

function setSkip(v: boolean) {
  localStorage.setItem(SKIP_KEY, v ? '1' : '0');
}

export async function confirmWarehouseSplit(groups: WarehouseSplitGroup[]) {
  if (getSkip()) return true;

  const checked = ref(false);
  const count = groups.length;

  const rows = groups.map((g) =>
    h('div', { style: 'margin-top: 6px;' }, `▢ ${g.warehouseName}（${g.productCount}个产品）`),
  );

  await ElMessageBox({
    title: '按仓库拆分生成单据',
    message: h('div', [
      h(
        'div',
        `当前选中的订单包含以下仓库的产品，将自动拆分为${count}个单据：`,
      ),
      ...rows,
      h('div', { style: 'margin-top: 12px;' }, '是否确认生成？'),
      h('div', { style: 'margin-top: 12px;' }, [
        h(ElCheckbox, {
          modelValue: checked.value,
          'onUpdate:modelValue': (v: any) => {
            checked.value = Boolean(v);
          },
          label: '后续操作不再显示此提示（自动拆分生成单据）',
        }),
      ]),
    ]),
    showCancelButton: true,
    confirmButtonText: '确认生成',
    cancelButtonText: '取消',
    closeOnClickModal: false,
    closeOnPressEscape: false,
  });

  if (checked.value) setSkip(true);
  return true;
}

export function clearWarehouseSplitConfirmPreference() {
  setSkip(false);
}
