import type { ExtendedModalApi, ModalApiOptions, ModalProps } from './modal';

import {
  defineComponent,
  h,
  inject,
  nextTick,
  provide,
  reactive,
  ref,
} from 'vue';

import { useStore } from '@vben-core/shared/store';

import { ModalApi } from './modal-api';
import VbenModal from './modal.vue';

// 注：此文件实现 `useVbenModal`，为项目提供统一的 Modal 调用方式。
// 主要功能：
// - 支持外部注入已连接的 Modal 组件（connectedComponent，用于在父组件中包裹真实 Modal）
// - 支持直接创建 Modal 组件并返回 `Modal` 组件与 `modalApi`（用于外部渲染/控制）

// 注入 key：用于父子组件通过 provide/inject 传递 modal api 与配置
const USER_MODAL_INJECT_KEY = Symbol('VBEN_MODAL_INJECT');

// 全局默认 Modal 配置，可通过 `setDefaultModalProps` 修改
const DEFAULT_MODAL_PROPS: Partial<ModalProps> = {};

/**
 * 设置默认的 Modal props（全局生效）
 * @param props 默认 Modal 属性
 */
export function setDefaultModalProps(props: Partial<ModalProps>) {
  Object.assign(DEFAULT_MODAL_PROPS, props);
}

/**
 * useVbenModal
 * - 当传入 `connectedComponent` 时，表示父组件会包裹一个已存在的组件（通常用于页面内嵌 modal），
 *   会返回一个包装组件 `VbenParentModal` 和一个延迟注入的 `extendedApi`，父组件会通过 provide 将真实 modal api 注入。
 * - 当不传入 `connectedComponent` 时，会创建一个可直接渲染的 `VbenModal` 组件，并返回该组件与 `modalApi`，
 *   通过 `modalApi` 可以调用 `open/close/setData` 等方法控制弹窗。
 */
export function useVbenModal<TParentModalProps extends ModalProps = ModalProps>(
  options: ModalApiOptions = {},
) {
  // 如果用户传入了 connectedComponent，说明我们要把外部组件当成 Modal 的宿主
  const { connectedComponent } = options;
  if (connectedComponent) {
    // extendedApi 使用 reactive 包裹，最终会被父级通过 provide 填充真实的 ModalApi
    const extendedApi = reactive({});
    const isModalReady = ref(true);

    // 父级包裹组件：在渲染时提供注入数据（extendApi/options/reCreateModal）
    const Modal = defineComponent(
      (props: TParentModalProps, { attrs, slots }) => {
        provide(USER_MODAL_INJECT_KEY, {
          // extendApi 会把真实的 ModalApi 原型赋给 reactive extendedApi
          extendApi(api: ExtendedModalApi) {
            // 不能直接用赋值或 Object.assign，否则会丢失原型方法
            Object.setPrototypeOf(extendedApi, api);
          },
          options,
          // 当外部 modal 需要销毁重建时，通知父组件重创建
          async reCreateModal() {
            isModalReady.value = false;
            await nextTick();
            isModalReady.value = true;
          },
        });

        // 检查 props/slots 是否与 Modal 的内部 state 冲突，避免误用
        checkProps(extendedApi as ExtendedModalApi, {
          ...props,
          ...attrs,
          ...slots,
        });

        // 渲染真实的 connectedComponent（或占位 div）
        return () =>
          h(
            isModalReady.value ? connectedComponent : 'div',
            {
              ...props,
              ...attrs,
            },
            slots,
          );
      },
      {
        name: 'VbenParentModal',
        inheritAttrs: false,
      },
    );

    // 返回父级包装组件 + 延迟注入的 API（父组件会把真实 api 注入 extendedApi）
    return [Modal, extendedApi as ExtendedModalApi] as const;
  }

  // 非 connectedComponent 情况：尝试从 inject 中获取父级提供的数据（如果存在）
  const injectData = inject<any>(USER_MODAL_INJECT_KEY, {});

  // 合并默认配置、注入配置与调用时传入的 options
  const mergedOptions = {
    ...DEFAULT_MODAL_PROPS,
    ...injectData.options,
    ...options,
  } as ModalApiOptions;

  // 将 onOpenChange 同步到注入的配置上（如果存在）
  mergedOptions.onOpenChange = (isOpen: boolean) => {
    options.onOpenChange?.(isOpen);
    injectData.options?.onOpenChange?.(isOpen);
  };

  // 包装 onClosed：在 destroyOnClose 时，如果父级提供了 reCreateModal，则触发重建
  const onClosed = mergedOptions.onClosed;
  mergedOptions.onClosed = () => {
    onClosed?.();
    if (mergedOptions.destroyOnClose) {
      injectData.reCreateModal?.();
    }
  };

  // 创建真实 ModalApi
  const api = new ModalApi(mergedOptions);

  // extendedApi 暴露给调用者，包含 api 方法与 store
  const extendedApi: ExtendedModalApi = api as never;

  // 为 extendedApi 添加 useStore 方法，便于组件内使用 store
  extendedApi.useStore = (selector) => {
    return useStore(api.store, selector);
  };

  // 定义一个可直接渲染的 Modal 组件，内部把 modalApi 传入 VbenModal
  const Modal = defineComponent(
    (props: ModalProps, { attrs, slots }) => {
      return () =>
        h(
          VbenModal,
          {
            ...props,
            ...attrs,
            modalApi: extendedApi,
          },
          slots,
        );
    },
    {
      name: 'VbenModal',
      inheritAttrs: false,
    },
  );

  // 如果存在注入点，则把 extendedApi 传回给注入者
  injectData.extendApi?.(extendedApi);

  return [Modal, extendedApi] as const;
}

/**
 * 校验 connectedComponent 场景下用户传入的 props/slots，防止与 Modal 内部 state 字段冲突
 * - 如果 attrs 包含与 Modal store state 同名的字段（除了 class），打印警告
 */
async function checkProps(api: ExtendedModalApi, attrs: Record<string, any>) {
  if (!attrs || Object.keys(attrs).length === 0) {
    return;
  }
  await nextTick();

  const state = api?.store?.state;

  if (!state) {
    return;
  }

  const stateKeys = new Set(Object.keys(state));

  for (const attr of Object.keys(attrs)) {
    if (stateKeys.has(attr) && !['class'].includes(attr)) {
      // connectedComponent存在时，不要传入Modal的props，会造成复杂度提升，如果你需要修改Modal的props，请使用 useModal 或者api
      console.warn(
        `[Vben Modal]: When 'connectedComponent' exists, do not set props or slots '${attr}', which will increase complexity. If you need to modify the props of Modal, please use useVbenModal or api.`,
      );
    }
  }
}
