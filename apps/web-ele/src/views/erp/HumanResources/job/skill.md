# 岗位管理页面

- 页面入口：`src/views/erp/HumanResources/job/index.vue`
- 菜单组件路径：`erp/HumanResources/job/index`
- 页面能力：岗位管理列表、部门级别筛选、是否专属筛选、新增编辑删除岗位。
- 查询区位置：岗位名称、岗位类别、所属部门名称、是否专属、岗位职责搜索条件位于表格上方、工具栏下方，避免搜索栏落到表格底部。
- 表格布局：顶部工具栏只保留“新建”；“编辑/删除”放到每一行最后一列“操作”中，并使用 Element Plus 固定列 `fixed="right"`，横向滚动时保持可见。
- 固定列显示：岗位表格设置 `class="job-table"`、`:scrollbar-always-on="true"`，并为右侧固定列补充背景和层级样式，确保“操作”列在右侧可见。
- 表格高度：岗位列表表格高度使用 `calc(100vh - 196px)`，占满页面剩余主要空间，减少底部大面积空白。
- 长文本显示：`岗位职责` 列使用单行省略显示，开启 `show-overflow-tooltip`，鼠标悬浮可查看完整职责内容。
- 接口来源：`src/api/erp/human-resources/organ/index.ts`。
- 请求头规则：岗位管理 3 个 `POST /api/DataOperation/GetData` 请求需按项目统一方式传递请求头，即通过 `DataTable.getRequestHeader()` 生成请求头，由 `JOB_FORM_ID=0B6978A5A04184588BF67CA269F48E38` 注入为 `x-FormKey`，同时带 `x-StepId`；`Authorization`、`Accept-Language` 等通用头由 `requestClient` 拦截器统一追加。
- 部门级别联动规则：左侧部门级别来源于字典 `pt_depRank`；点击某一级别时，取该字典项的 `val` 作为主表请求条件，右侧岗位列表重新请求 `Base_JobInfo`，过滤条件为 `DepLevelCode = pt_depRank.val`。
- 岗位主表请求形态：`Base_JobInfo` 请求需携带 `lmKey=AQZVMDAwMjggMEI2OTc4QTVBMDQxODQ1ODhCRjY3Q0EyNjlGNDhFMzgaUVlWaXJ0dWFsUGxhdEBCYXNlX0pvYkluZm8BaeCDRw.96foEt6seuSBckIEjGWrAQ`、`isGetData=true`、`_CurrentRow=null`、`_SelectRows=[]`，以匹配抓包请求。
- 返回解析：兼容 `Result.data.Items` 与 `Result.data.items` 两种大小写结构。
- 当前页面加载收敛为 3 个请求：
  1. 岗位主表 `Base_JobInfo`：`POST /api/DataOperation/GetData`，使用 `DbName=QYVirtualPlat`、`DbId=EBEFF17BBB6443B185D6FB32FF69F0BB`，字段包含 `ID`、`rowid`、`JobCode`、`JobName`、`JobType`、`JobLevel`、`Depid`、`DepName`、`DepLevelCode`、`DepLevel`、`jobExpNum`、`jonActNum`、`JobDuty`、`JobQualifications`、`Memo`，分页参数使用 `{ index, size }`，Filter 动态注入 `DepLevelCode = 当前部门级别.val`，默认值为 `0`。
  2. 部门级别字典 `pt_depRank`：`POST /api/DataOperation/GetData`，字段包含 `rowid`、`val`、`txt`、`ordIdx`，用于左侧部门级别筛选和表单部门级别下拉。
  3. 是否专属字典 `ISExclusiveJob`：`POST /api/DataOperation/GetData`，字段包含 `rowid`、`val`、`txt`、`ordIdx`、`exVal_4`，用于是否专属筛选和表单下拉。
- 岗位主表 CRUD 仍复用 `DataTable` 保存接口，主键已按本页请求适配为 `ID`；保存时优先使用 `ID`，兼容 `JobID`、`rowid`、`ROWID`。
- 页面不再额外请求部门列表；所属部门 ID/名称直接使用 `Base_JobInfo` 返回字段编辑。
