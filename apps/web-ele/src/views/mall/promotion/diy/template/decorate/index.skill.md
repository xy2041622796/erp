# DIY 模板装修 skill

- 页面入口：`src/views/mall/promotion/diy/template/decorate/index.vue`
- 页面能力：根据路由 `id` 加载 DIY 模板属性，支持基础设置、首页、我的等模板项切换编辑，缓存各模板项编辑数据，并统一保存模板属性和页面属性。
- 使用数据或接口：
  - `#/api/mall/promotion/diy/template#getDiyTemplateProperty(id)`：读取模板装修属性。
  - `#/api/mall/promotion/diy/template#updateDiyTemplateProperty(data)`：保存模板基础属性。
  - `#/api/mall/promotion/diy/page#updateDiyPageProperty(data)`：保存模板内页面属性。
  - `#/views/mall/promotion/components/diy-editor/index.vue`：装修编辑器组件。
  - `#/views/mall/promotion/components/diy-editor/util#PAGE_LIBS`：页面组件库与类型。
- 复用说明：为避免 Rollup chunk 循环依赖，页面直接引入 `diy-editor/index.vue` 与 `diy-editor/util`，不要通过 `components/index.ts` 聚合导入 `DiyEditor`。
