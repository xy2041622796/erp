# 全局在线咨询悬浮入口

## 入口
- 全局组件：`src/components/online-consult/OnlineConsultFloat.vue`
- 二维码资源：`src/assets/imgs/contact-scan-qrcode.png`

## 当前状态
- 已临时关闭：`src/app.vue` 中已移除 `OnlineConsultFloat` 的 import 与模板挂载。
- 组件文件和二维码资源保留，后续可重新挂载启用。

## 能力
- 启用后可在应用根节点全局展示右侧悬浮咨询入口，所有路由页面均可见。
- 展示逻辑为 hover / focus：鼠标移入或键盘聚焦“在线咨询”竖向按钮时展示联系面板。
- 默认收起态只展示较小的蓝色“在线咨询”竖条，减少页面遮挡。
- 联系面板内容与官网首次版本保持一致：咨询电话 `027-83616665`，扫码咨询二维码使用 `contact-scan-qrcode.png`。

## 数据与接口
- 当前无后端接口调用。
- 联系电话为静态文本。
- 二维码图片从官网项目资源同步到 web-ele 本项目内。

## 重新启用方式
- 在 `src/app.vue` 中重新引入：`import OnlineConsultFloat from '#/components/online-consult/OnlineConsultFloat.vue';`
- 在 `ElConfigProvider` 内 `RouterView` 后追加：`<OnlineConsultFloat />`。