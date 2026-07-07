import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue';

type ScrollRoot = HTMLElement | { $el?: HTMLElement } | undefined;

type HorizontalWheelScrollOptions = {
  /**
   * 横向滚动容器选择器，默认适配 Element Plus Table。
   */
  selectors?: string[];
  /**
   * 是否启用，默认启用。
   */
  enabled?: boolean;
  /**
   * 是否允许普通纵向滚轮转横向滚动。
   *
   * - auto：默认。存在纵向可滚动空间时不抢占普通滚轮；无纵向空间时允许转横向。
   * - always：普通滚轮始终优先转横向。
   * - never：普通纵向滚轮不转横向，只响应 Shift + 滚轮或触控板横向手势。
   */
  verticalWheelToHorizontal?: 'always' | 'auto' | 'never';
};

const DEFAULT_SELECTORS = [
  '.el-table__body-wrapper .el-scrollbar__wrap',
  '.el-scrollbar__wrap',
  '.el-table__body-wrapper',
];

function getRootElement(root: ScrollRoot) {
  if (!root) return null;
  if (root instanceof HTMLElement) return root;
  return root.$el || null;
}

function findHorizontalScrollWrap(
  root: ScrollRoot,
  selectors: string[],
) {
  const rootEl = getRootElement(root);
  if (!rootEl) return null;

  const candidates = selectors.flatMap((selector) => [
    ...rootEl.querySelectorAll<HTMLElement>(selector),
  ]);

  return candidates.find((item) => item.scrollWidth > item.clientWidth + 2) || null;
}

function canScrollVertically(el: HTMLElement, deltaY: number) {
  const maxScrollTop = el.scrollHeight - el.clientHeight;
  if (maxScrollTop <= 2) return false;
  if (deltaY > 0) return el.scrollTop < maxScrollTop - 1;
  if (deltaY < 0) return el.scrollTop > 1;
  return false;
}

/**
 * 大表格横向滚轮 hook。
 *
 * 默认策略：
 * - 触控板横向手势或 Shift + 滚轮：横向滚动。
 * - 普通上下滚轮：当表格还能纵向滚动时保留纵向滚动；没有纵向空间时转横向。
 */
export function useHorizontalWheelScroll(
  rootRef: Ref<ScrollRoot>,
  options: HorizontalWheelScrollOptions = {},
) {
  let boundEl: HTMLElement | null = null;
  const selectors = options.selectors?.length
    ? options.selectors
    : DEFAULT_SELECTORS;
  const verticalWheelToHorizontal = options.verticalWheelToHorizontal ?? 'auto';

  function handleWheel(event: WheelEvent) {
    if (options.enabled === false) return;

    const wrap = findHorizontalScrollWrap(rootRef.value, selectors);
    if (!wrap) return;

    const maxScrollLeft = wrap.scrollWidth - wrap.clientWidth;
    if (maxScrollLeft <= 0) return;

    const isHorizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const isShiftWheel = event.shiftKey && Math.abs(event.deltaY) > 0;
    const shouldConvertVerticalWheel =
      verticalWheelToHorizontal === 'always' ||
      (verticalWheelToHorizontal === 'auto' && !canScrollVertically(wrap, event.deltaY));

    if (!isHorizontalGesture && !isShiftWheel && !shouldConvertVerticalWheel) {
      return;
    }

    const delta = isHorizontalGesture ? event.deltaX : event.deltaY;
    if (!delta) return;

    const nextScrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, wrap.scrollLeft + delta),
    );
    if (nextScrollLeft === wrap.scrollLeft) return;

    event.preventDefault();
    wrap.scrollLeft = nextScrollLeft;
  }

  function bind() {
    boundEl?.removeEventListener('wheel', handleWheel);
    boundEl = getRootElement(rootRef.value);
    boundEl?.addEventListener('wheel', handleWheel, { passive: false });
  }

  function unbind() {
    boundEl?.removeEventListener('wheel', handleWheel);
    boundEl = null;
  }

  onMounted(async () => {
    await nextTick();
    bind();
  });

  onBeforeUnmount(unbind);

  return {
    bind,
    unbind,
  };
}
