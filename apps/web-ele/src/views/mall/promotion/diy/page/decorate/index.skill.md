# DIY 页面装修 skill

- 页面入口：`src/views/mall/promotion/diy/page/decorate/index.vue`
- 页面能力：根据路由 `id` 加载单个 DIY 页面属性，使用 `DiyEditor` 编辑页面装修内容，并保存页面属性。
- 使用数据或接口：
  - `#/api/mall/promotion/diy/page#getDiyPageProperty(id)`：读取页面装修属性。
  - `#/api/mall/promotion/diy/page#updateDiyPageProperty(data)`：保存页面装修属性。
  - `#/views/mall/promotion/components/diy-editor/index.vue`：装修编辑器组件。
  - `#/views/mall/promotion/components/diy-editor/util#PAGE_LIBS`：页面组件库。
- 复用说明：为避免 Rollup chunk 循环依赖，页面直接引入 `diy-editor/index.vue` 与 `diy-editor/util`，不要通过 `components/index.ts` 聚合导入 `DiyEditor`。
