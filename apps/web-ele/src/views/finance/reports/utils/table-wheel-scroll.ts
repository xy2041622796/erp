export { useHorizontalWheelScroll } from '#/hooks/use-horizontal-wheel-scroll';

/**
 * @deprecated 横向滚轮请统一使用 `useHorizontalWheelScroll`。
 *
 * 旧的 `createTableHorizontalWheelHandler` 已迁移到通用 hook，避免在页面中分散维护 wheel / scrollLeft 逻辑。
 */
export function createTableHorizontalWheelHandler() {
  throw new Error('createTableHorizontalWheelHandler 已废弃，请使用 useHorizontalWheelScroll');
}
