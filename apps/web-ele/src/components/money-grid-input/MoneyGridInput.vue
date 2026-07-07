<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import { ElButton, ElDialog, ElInput, ElMessage } from 'element-plus';

import { clampMoney, moneyNumber, moneyText, toDecimal } from '#/utils/finance/decimal-money';

defineOptions({ name: 'MoneyGridInput' });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue?: null | number;
    /** 是否显示大写（默认通过 tooltip 展示） */
    showUpperText?: boolean;
  }>(),
  {
    modelValue: undefined,
    disabled: false,
    showUpperText: false,
  },
);

const emit = defineEmits<{
  change: [value: number | undefined];
  /** 键盘导航 */
  navigate: [direction: 'down' | 'left' | 'right' | 'up'];
  'update:modelValue': [value: number | undefined];
  /** 大写金额变化 */
  'upper-change': [upper: string];
}>();

const positions = [
  '亿',
  '千',
  '百',
  '十',
  '万',
  '千',
  '百',
  '十',
  '元',
  '角',
  '分',
] as const;

// 最大只能到“亿”位：±999,999,999.99
const MAX_AMOUNT = 999_999_999.99;

function clampToMoney(v: number) {
  if (!Number.isFinite(v)) return undefined;
  return moneyNumber(clampMoney(v, -MAX_AMOUNT, MAX_AMOUNT));
}

function parseMoney(text: string): number | undefined {
  const s = String(text ?? '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return clampToMoney(n);
}

function moneyToCents(v?: number) {
  const n = toDecimal(v ?? 0);
  if (!n.isFinite() || n.isZero()) return 0;
  return n.abs().mul(100).toDecimalPlaces(0).toNumber();
}

function removeNegativeSign(text: string) {
  return String(text ?? '').replace(/^[-−]s*/, '');
}

function digitsFromCents(cents: number) {
  const s = String(Math.max(0, Math.trunc(cents))).padStart(11, '0');
  const arr = s.split('');

  let first = arr.findIndex((x, idx) => idx <= 8 && x !== '0');
  if (first < 0) first = 9;
  for (let i = 0; i < first; i++) arr[i] = '';

  if (cents === 0) return Array.from({ length: 11 }, () => '');
  return arr;
}

const editing = ref(false);
const rootRef = ref<HTMLElement>();
const inputRef = ref<HTMLInputElement>();
const draft = ref('');

const calcOpen = ref(false);
const calcExpr = ref('');
const calcResult = ref<number | undefined>(undefined);

const numericValue = computed(() => {
  const n = Number(props.modelValue as any);
  return Number.isFinite(n) ? n : undefined;
});

const displayText = computed(() => {
  const n = numericValue.value;
  if (n === undefined || n === 0) return '';
  return removeNegativeSign(moneyText(clampToMoney(n)));
});

const isNegative = computed(() => (numericValue.value ?? 0) < 0);

watch(
  () => props.modelValue,
  () => {
    if (!editing.value) draft.value = displayText.value;
  },
  { immediate: true },
);

function emitMoneyValue(v?: number, options?: { change?: boolean }) {
  const next = v === undefined ? undefined : clampToMoney(v);
  emit('update:modelValue', next);
  if (options?.change) emit('change', next);
  emit('upper-change', toRmbUpper(next));
}

function commitValue(v?: number) {
  emitMoneyValue(v, { change: true });
}

function handleInput() {
  const s = String(draft.value ?? '').trim();
  if (!s) {
    emitMoneyValue(undefined);
    return;
  }
  if (!isPlainSignedNumber(s)) return;
  const v = parseMoney(s);
  if (v === undefined) return;
  emitMoneyValue(v);
}

function enterEdit() {
  if (props.disabled) return;
  editing.value = true;
  draft.value = displayText.value;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select?.();
  });
}

function cancelEdit() {
  draft.value = displayText.value;
  editing.value = false;
}

function isPlainSignedNumber(text: string) {
  return /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(String(text ?? '').trim());
}

/**
 * 提交草稿
 * @returns true 表示提交成功且未打开计算器；false 表示未提交/被阻止/打开了计算器
 */
function commitDraft(): boolean {
  const s = String(draft.value ?? '').trim();
  if (!s) {
    commitValue(undefined);
    editing.value = false;
    return true;
  }

  // 仅当不是“纯数字/带正负号数字”且包含运算符时，才进入计算器
  if (!isPlainSignedNumber(s) && /[+\-*/]/.test(s)) {
    calcExpr.value = s;
    calcPreview();
    calcOpen.value = true;
    return false;
  }

  const v = parseMoney(s);
  if (v === undefined) {
    ElMessage.error('金额格式不正确');
    return false;
  }

  if (Math.abs(v) >= MAX_AMOUNT) {
    ElMessage.warning(`金额不能超过 ±${MAX_AMOUNT.toFixed(2)}`);
  }

  commitValue(v);
  draft.value = moneyText(v);
  editing.value = false;
  return true;
}

function handleClick() {
  enterEdit();
}

function handleBlur() {
  if (!editing.value) return;
  commitDraft();
}

function handleKeydown(e: KeyboardEvent) {
  if (props.disabled) return;

  if (e.key === 'Tab') {
    e.preventDefault();
    const ok = commitDraft();
    if (ok) emit('navigate', e.shiftKey ? 'left' : 'right');
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    emit('navigate', 'left');
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    emit('navigate', 'right');
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    emit('navigate', 'up');
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    emit('navigate', 'down');
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    const ok = commitDraft();
    if (ok) emit('navigate', 'right');
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    cancelEdit();
    return;
  }

  const allowCtrl = e.ctrlKey || e.metaKey || e.altKey;
  if (allowCtrl) return;

  const allowed = /^[0-9+\-*/().\s]$/;
  if (e.key.length === 1 && !allowed.test(e.key)) {
    e.preventDefault();
  }
}

const cents = computed(() => moneyToCents(numericValue.value ?? undefined));
const digits = computed(() => digitsFromCents(cents.value));
const negativeSignIndex = computed(() => -1);
const upper = computed(() => toRmbUpper(numericValue.value ?? undefined));

function isAllowedExpr(expr: string) {
  return /^[0-9+\-*/().\s]+$/.test(expr);
}

type Op = '*' | '+' | '-' | '/';

function precedence(op: Op) {
  return op === '*' || op === '/' ? 2 : 1;
}

function applyOp(a: number, b: number, op: Op) {
  switch (op) {
    case '*': {
      return a * b;
    }
    case '+': {
      return a + b;
    }
    case '-': {
      return a - b;
    }
    case '/': {
      return b === 0 ? Number.NaN : a / b;
    }
  }
}

function tokenize(expr: string): string[] {
  const s = expr.replaceAll(/\s+/g, '');
  if (!s) return [];

  const tokens: string[] = [];
  let i = 0;
  const isOp = (c: string) => ['*', '+', '-', '/'].includes(c);

  while (i < s.length) {
    const c = s[i]!;
    if (
      (c >= '0' && c <= '9') ||
      c === '.' ||
      ((c === '-' || c === '+') &&
        (i === 0 || s[i - 1] === '(' || isOp(s[i - 1]!)))
    ) {
      let j = i + 1;
      while (j < s.length) {
        const cj = s[j]!;
        if ((cj >= '0' && cj <= '9') || cj === '.') j++;
        else break;
      }
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    if (isOp(c) || c === '(' || c === ')') {
      tokens.push(c);
      i++;
      continue;
    }

    tokens.push('#');
    break;
  }

  return tokens;
}

function evalExpression(expr: string): number {
  if (!isAllowedExpr(expr)) return Number.NaN;

  const tokens = tokenize(expr);
  if (tokens.length === 0 || tokens.includes('#')) return Number.NaN;

  const values: number[] = [];
  const ops: Array<'(' | Op> = [];

  const doApply = () => {
    const op = ops.pop();
    if (!op || op === '(') return;
    const b = values.pop();
    const a = values.pop();
    if (a === undefined || b === undefined) {
      values.push(Number.NaN);
      return;
    }
    values.push(applyOp(a, b, op));
  };

  for (const t of tokens) {
    switch (t) {
      case '(': {
        ops.push('(');

        break;
      }
      case ')': {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') doApply();
        if (ops[ops.length - 1] === '(') ops.pop();

        break;
      }
      case '*':
      case '+':
      case '-':
      case '/': {
        const op = t as Op;
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          const top = ops[ops.length - 1] as Op;
          if (precedence(top) >= precedence(op)) doApply();
          else break;
        }
        ops.push(op);

        break;
      }
      default: {
        const num = Number(t);
        values.push(Number.isFinite(num) ? num : Number.NaN);
      }
    }
  }

  while (ops.length > 0) doApply();
  const res = values.pop();
  return Number.isFinite(res as any) ? (res as number) : Number.NaN;
}

function calcPreview() {
  const r = evalExpression(calcExpr.value);
  calcResult.value = Number.isFinite(r) ? clampToMoney(r) : undefined;
}

function calcCancel() {
  calcOpen.value = false;
  nextTick(() => inputRef.value?.focus());
}

function calcConfirm() {
  const r = evalExpression(calcExpr.value);
  if (!Number.isFinite(r)) {
    ElMessage.error('表达式不合法');
    return;
  }

  const v = clampToMoney(r);
  if (v === undefined) {
    ElMessage.error('计算结果不合法');
    return;
  }

  if (Math.abs(v) >= MAX_AMOUNT) {
    ElMessage.warning(`金额不能超过 ±${MAX_AMOUNT.toFixed(2)}`);
  }

  commitValue(v);
  draft.value = moneyText(v);
  calcOpen.value = false;
  editing.value = false;

  nextTick(() => emit('navigate', 'right'));
}

function focus() {
  enterEdit();
}

defineExpose({ focus });

function toRmbUpper(value?: null | number) {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw) || raw === 0) return '';

  const sign = raw < 0 ? '负' : '';
  const n = Math.abs(raw);
  const v = moneyNumber(n);
  const [intPart, decPart] = v.toFixed(2).split('.');

  const cnNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const cnIntRadice = ['', '拾', '佰', '仟'];
  const cnIntUnits = ['', '万', '亿'];
  const cnDecUnits = ['角', '分'];

  let integer = Number.parseInt(intPart as string, 10);
  if (integer === 0) return `${sign}零元整`;

  let chineseStr = '';
  let unitPos = 0;

  while (integer > 0) {
    const section = integer % 10_000;
    if (section !== 0) {
      let sectionStr = '';
      let sectionZero = false;
      for (let i = 0; i < 4; i++) {
        const digit = (section / 10 ** i) % 10;
        if (digit === 0) {
          sectionZero = true;
        } else {
          if (sectionZero) sectionStr = cnNums[0] + sectionStr;
          sectionZero = false;
          sectionStr =
            cnNums[Math.trunc(digit)]! + cnIntRadice[i]! + sectionStr;
        }
      }
      sectionStr = sectionStr.replaceAll(/零+/g, '零').replaceAll(/零$/g, '');
      chineseStr = sectionStr + cnIntUnits[unitPos] + chineseStr;
    }
    unitPos++;
    integer = Math.floor(integer / 10_000);
  }

  chineseStr = chineseStr
    .replaceAll(/零+/g, '零')
    .replaceAll(/零(万|亿)/g, '$1')
    .replaceAll(/零$/g, '');
  chineseStr = `${sign + chineseStr}元`;

  const jiao = Number(decPart?.[0] ?? '0');
  const fen = Number(decPart?.[1] ?? '0');
  if (jiao === 0 && fen === 0) {
    chineseStr += '整';
  } else {
    if (jiao > 0) chineseStr += cnNums[jiao]! + cnDecUnits[0]!;
    if (fen > 0) chineseStr += cnNums[fen]! + cnDecUnits[1]!;
  }

  return chineseStr;
}
</script>

<template>
  <div ref="rootRef" class="money-grid-input w-full">
    <div
      class="relative flex h-[42px] w-full select-none overflow-hidden border"
      :class="[
        disabled
          ? 'cursor-not-allowed bg-white'
          : 'cursor-text bg-white',
        editing
          ? 'border-[var(--el-color-primary)] shadow-[0_0_0_1px_var(--el-color-primary)]'
          : 'border-[var(--el-border-color)]',
        isNegative ? 'money-grid-input--negative' : '',
      ]"
      :title="upper"
      @click="handleClick"
    >
      <input
        ref="inputRef"
        class="absolute inset-0 z-10 h-full w-full bg-white px-1 text-right text-[22px] font-semibold"
        :class="[
          editing ? 'opacity-100' : 'pointer-events-none opacity-0',
          isNegative ? 'text-red-600' : '',
        ]"
        :disabled="disabled"
        inputmode="decimal"
        v-model="draft"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />

      <div
        class="relative z-0 flex w-full bg-white"
        :class="editing ? 'opacity-0' : 'opacity-100'"
      >

        <div
          v-for="(p, idx) in positions"
          :key="p + idx"
          class="relative flex h-full flex-1 items-center justify-center border-r text-[12px]"
          :class="[
            idx === positions.length - 1
              ? 'border-r-0'
              : 'border-r-[var(--el-border-color)]',
            idx === 8 ? 'border-r-[var(--el-color-primary)]' : '',
          ]"
        >
          <span class="font-semibold" :class="isNegative ? 'text-red-600' : ''">{{ digits[idx] }}</span>
          <span
            v-if="idx === negativeSignIndex"
            class="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-[62%] text-center text-[22px] font-black leading-none text-red-600"
          >−</span>
        </div>
      </div>
    </div>

    <div
      v-if="showUpperText && upper"
      class="text-muted-foreground mt-1 text-[12px]"
    >
      {{ upper }}
    </div>


    <ElDialog v-model="calcOpen" title="金额计算" width="520px" append-to-body>
      <div class="space-y-3">
        <ElInput
          v-model="calcExpr"
          placeholder="请输入表达式，如：1000/3+20"
          @input="calcPreview"
          @keyup.enter="calcConfirm"
          clearable
        />
        <div class="text-sm">
          <span class="text-muted-foreground">结果：</span>
          <span class="font-medium">{{
            calcResult !== undefined ? calcResult.toFixed(2) : '--'
          }}</span>
        </div>
        <div class="text-muted-foreground text-xs">
          仅支持数字、小数点、括号与 + - * / 运算。最大金额不超过“亿”位（±{{
            MAX_AMOUNT.toFixed(2)
          }}）。
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="calcCancel">取消</ElButton>
          <ElButton type="primary" @click="calcConfirm">确定</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>


<style scoped>
.money-grid-input--negative {
  color: var(--el-color-danger);
}
</style>
