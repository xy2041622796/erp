# ERP 工作台天气卡片

## 页面入口
- 文件：`src/views/erp/workbench/index.vue`
- 路由：`/erp/workbench`
- 页面名：`ErpWorkbench`

## 能力说明
- 首页顶部天气卡片使用当前访问 IP 自动定位城市，再按经纬度获取实时天气。
- 加载中显示“定位中 / 加载中”，失败时显示“未知位置 / 获取失败”。
- 为规避 `ipwho.is` 免费版浏览器 CORS 限制，已移除该接口，改用支持前端直连的公开定位接口并设置 fallback。
- IP 定位接口返回英文城市名时，会通过经纬度反查中文地名后展示，例如 `Changhua` 显示为中文地名。

## 使用接口
- IP 定位主接口：`https://get.geojs.io/v1/ip/geo.json`
  - 使用字段：`city`、`region`、`country`、`latitude`、`longitude`
- IP 定位备用接口：`https://ipapi.co/json/`
  - 使用字段：`city`、`region`、`country_name`、`latitude`、`longitude`
- 中文地名反查：`https://api.bigdatacloud.net/data/reverse-geocode-client`
  - 查询参数：`latitude`、`longitude`、`localityLanguage=zh`
  - 使用字段：`city`、`locality`、`principalSubdivision`、`countryName`
- 实时天气：`https://api.open-meteo.com/v1/forecast`
  - 查询参数：`latitude`、`longitude`、`current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`、`wind_speed_unit=kmh`、`timezone=auto`
  - 使用字段：`current.temperature_2m`、`current.relative_humidity_2m`、`current.wind_speed_10m`、`current.weather_code`

## 编排注意
- 所有接口均为前端直接调用的公开免费接口，无需 API Key。
- `fetchJsonWithTimeout` 对外部接口设置超时，避免页面等待过久。
- `resolveIpLocation` 会先尝试 GeoJS，失败后自动尝试 ipapi。
- `resolveChineseLocationName` 会按经纬度反查中文地名，失败时回退使用定位接口原始城市名。
- 天气状态通过 Open-Meteo weather_code 映射为中文描述。
- 如部署环境统一禁止前端访问第三方公网接口，应改为后端代理。