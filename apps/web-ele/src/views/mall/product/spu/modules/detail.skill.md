# 商品详情页 skill

- 页面入口：`src/views/mall/product/spu/modules/detail.vue`
- 页面能力：展示商品 SPU 基本信息、配送信息、轮播图、SKU 信息、商品详情，并支持返回列表与进入编辑页。
- 使用数据：
  - `#/api/mall/product/spu`：读取商品详情 `getSpu(id)`。
  - `#/api/mall/product/category`：读取商品分类精简列表 `getCategorySimpleList()`，用于分类名称回显。
  - `#/api/mall/product/brand`：读取品牌精简列表 `getSimpleBrandList()`，用于品牌名称回显。
  - `@vben/hooks` 字典：读取配送方式字典 `TRADE_DELIVERY_TYPE`。
- 复用说明：如后续新增商品详情相关入口，优先复用本页面的分类、品牌、配送字典加载逻辑与价格格式化逻辑。
