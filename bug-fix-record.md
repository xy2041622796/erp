﻿# Bug 修复记录

> 记录日期：2026-06-25 ~ 2026-07-06涉及模块：组织架构、考勤管理、招聘管理、培训管理、绩效管理、薪酬管理、入离职管理

---

## 2026-06-25（4项）

### 1. 通用岗位在部门管理不显示

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/erp/human-resources/organization-structure.ts` — `getDepartmentJobList` |
| 复现步骤 | 1. 先创建了通用岗位（Depid 为空）→ 2. 打开部门管理（组织架构图）→ 3. 左侧选一个部门 |
| 现象 | 右侧岗位列表只显示专属岗位，通用岗位不显示 |
| 原因 | 岗位表查询条件只有 `Depid = 当前部门ID`，通用岗位的 `Depid` 为 NULL 或空字符串，被过滤掉 |
| 修复 | 筛选条件改为 `or(Depid = 当前部门ID, Depid IS NULL, Depid = '')`，同时查出专属岗位和通用岗位 |

### 2. 考勤管理搜索框只能按编号搜索

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 涉及页面 | 考勤信息（`hr/attendance/info`）、异常预警（`hr/attendance/exception`）、请假加班（`hr/attendance/leave-overtime`） |
| 复现步骤 | 1. 打开考勤信息页面 → 2. 在搜索框输入人员姓名或部门名称 → 3. 点击查询 |
| 现象 | 搜索框提示"可输入考勤编号/人员/部门/岗位"，但输入人员姓名或部门名称搜不到任何结果 |
| 原因 | `listAttendanceRecords` 和 `listLeaveOvertime` 的关键词过滤逻辑只匹配了编号字段，没有覆盖人员姓名、部门名称、岗位名称 |
| 修复 | 让关键词同时匹配所有提示字段：人员姓名、部门名称、岗位名称、编号 |

### 3. 岗位管理「所属部门」下拉没数据

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/api/erp/human-resources/job-management.ts` — `getDepartmentOptionsByLevel` |
| 复现步骤 | 1. 打开岗位管理页面 → 2. 选左侧部门级别 → 3. 点新增 → 4. 选择"专属岗位" → 5. 点开「所属部门」下拉 |
| 现象 | 下拉列表为空，选不了部门 |
| 原因 | 按 `DepLevelCode` 过滤部门，如果部门表里该字段为空或跟字典对不上，查询结果就是空 |
| 修复 | 按级别查不到时，回退到查全部部门 |

### 4. 部门管理新增岗位后列表不显示

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/erp/human-resources/organization-structure.ts` — `getDepartmentJobList` |
| 复现步骤 | 1. 打开组织架构图 → 2. 左侧选一个部门 → 3. 点「专属岗位」新增 → 4. 填名称点保存 |
| 现象 | 提示保存成功，但右侧表格看不到刚加的岗位 |
| 原因 | 列表查询只用了数据库视图 `view_dep_job_userDJ`（岗位表 JOIN 人员表）。新岗位还没分配人员，视图中不存在，所以查不到 |
| 修复 | 同时查视图和岗位表 `Base_JobInfo`，以视图为主、岗位表补充无人员的岗位，两边结果合并去重 |

---

## 2026-06-26（3个Bug + 1个连带修复）

### Bug #1 — 异常处理弹窗保存时 payload 不完整（处理方式、处理结果、异常日期丢失）

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/attendance/exception/index.vue`、apps/web-ele/src/api/erp/human-resources/attendance/index.ts` |
| 复现步骤 | 1. 打开异常预警页面 → 2. 找一条异常记录点「处理」→ 3. 选择处理方式（如"调休"）、处理结果（如"有效"）、修改异常日期 → 4. 点提交处理 → 5. 关闭弹窗 → 6. 再次点同一条记录的「处理」 |
| 现象 | 处理方式回到默认值"补卡"，处理结果回到默认值"有效"，异常日期回到修改前的值 |
| 原因 | `submitHandle()` 只向后端发送了 `status` 和 `remark`，没有发送 `handleWay` / `handleResult` / `description` / `attendance_date`。同时 `updateAttendanceRecord` 的字段白名单里没有 `description` |
| 修复 | 将 `{handleWay, handleResult, description}` 序列化为 JSON 存入考勤记录表的 `description` 字段，打开弹窗时解析回填。`description` 加入 API 字段白名单。`attendance_date` 单独传入 payload |

### Bug #2 — 排班规则的「适用岗位」和「周设置」保存后丢失

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/attendance/schedule/index.vue`、apps/web-ele/src/api/erp/human-resources/attendance/index.ts` |
| 复现步骤 | 1. 打开排班规则页面 → 2. 点新增规则 → 3. 在"适用岗位"多选几个岗位（如技术总监、实习生）→ 4. 在"周设置"选周一~周五 → 5. 填名称保存 → 6. 关闭弹窗 → 7. 点同一条规则的「编辑」 |
| 现象 | "适用岗位"变回空，"周设置"回到周一~周五默认值 |
| 原因 | 适用部门有独立关联表 `Bil_HR_Attendance_Schedule_Rule_Depts`，时间段有关联表 `Bil_HR_Attendance_Schedule_Rule_Segments`，但适用岗位和周设置没有任何数据库表/列来存储。API 的 `createScheduleRule` 和 `updateScheduleRule` 都没处理这两个字段 |
| 修复 | 将 `{jobs, weekDays}` 序列化为 JSON 存入规则主表的 `description` 字段。编辑时从 `description` 解析回填 |

### Bug #3 — 已删除的部门和岗位仍出现在下拉框

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/api/erp/human-resources/attendance/index.ts` — `listBaseDepartInfo`、`listBaseJobInfo` |
| 复现步骤 | 1. 在组织架构里删除一个部门（软删除，`lingma_sys_is_delete` 标记为 1）→ 2. 打开排班规则页面 → 3. 点新增规则 → 4. 点开「适用部门」下拉 |
| 现象 | 刚刚删除的部门仍出现在下拉列表里。同理，删除的岗位也会出现在「适用岗位」下拉 |
| 原因 | `listBaseDepartInfo` 和 `listBaseJobInfo` 没有过滤 `lingma_sys_is_delete = 0`，但同文件里的 `queryOrgTable` 函数开头就加了这条过滤 |
| 修复 | 两个函数各加一行 `table.Filter = cond('lingma_sys_is_delete', 'equal', 0)` |

### 连带修复 — 异常列表「处理状态」始终显示「待处理」

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/views/hr/attendance/exception/index.vue` |
| 复现步骤 | 1. 对一条异常记录完成处理（填了处理方式和结果并保存）→ 2. 回到异常列表看该记录 |
| 现象 | 该记录的"处理状态"列仍显示"待处理" |
| 原因 | 模板中判断处理状态的逻辑只有 `row.status === '正常'` 才算已处理。但处理弹窗不改 `status`，只往 `description` 里写处理信息 |
| 修复 | 增加条件：`description` 字段存有处理信息时也视为"已处理" |

---

## 2026-06-27（1个Bug）

### Bug #1 — 修改日期保存后再次点"处理"，弹窗异常日期显示旧值

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/attendance/exception/index.vue` |
| 复现步骤 | 1. 打开异常预警页面 → 2. 找一条有签到时间的迟到记录点「处理」→ 3. 修改「异常日期」→ 4. 点「提交处理」，列表刷新显示新日期 → 5. 再次点同一条记录的「处理」 |
| 现象 | 弹窗里的异常日期又回到了修改前的值 |
| 原因 | `openHandle()` 设置 `exceptionDate` 时优先读取 `check_in_at`，但 `submitHandle` 保存的是 `attendance_date`。`check_in_at` 没变，所以再次打开读到的仍是旧值 |
| 修复 | 调换读取优先级：`attendance_date` 优先，`check_in_at` 作为回退 |

---

## 2026-07-01（招聘管理模块 · 2个Bug）

### Bug #1 — headcount / probation_months 为 0 时被静默转为默认值

| 项目 | 内容 |
| --- | --- | --- | --- |
| 严重程度 | 高 |
| 涉及文件 | apps/web-ele/src/views/hr/recruitment/job-posting/index.vue`（124、158 行）<br>apps/web-ele/src/views/hr/recruitment/offer/index.vue`（127、156 行）<br>apps/web-ele/src/views/erp/HumanResources/recruitment/job-posting/index.vue`（128、156 行）<br>apps/web-ele/src/views/erp/HumanResources/recruitment/offer/index.vue`（127、156 行）<br>apps/web-ele/src/api/erp/human-resources/recruitment/job-posting.ts`（77 行）<br>apps/web-ele/src/api/erp/human-resources/recruitment/offer.ts`（95 行） |
| 复现步骤 | 1. 打开「招聘职位」页面 → 2. 新增职位 → 3. 招聘人数输入 `0` → 4. 保存 |
| 现象 | 保存后数据库里 headcount 存的是 `1` 而非 `0` |
| 原因 | 使用 ` |  | `运算符（如`form.headcount \|\| 1`），`0` 是 JavaScript 的 falsy 值，`0 \|\| 1`结果为`1`，用户输入的 `0` 被静默覆盖为默认值 |
| 修复 | ` |  | `→`??`（nullish coalescing），只对 `null`/`undefined` 取默认值，`0` 正常保留 |

---

## 2026-07-02（HR 模块批量修复）

### Bug #1 — 删除/审批确认弹窗取消时控制台报 Uncaught (in promise) cancel

| 项目 | 内容 |
| --- | --- |
| 严重程度 | 高 |
| 涉及文件 | 培训：`course/index.vue`、`evaluation/index.vue`<br>绩效：`config/indicator/index.vue`、`config/matrix/index.vue`、`config/template/index.vue`、`evaluation/interview/index.vue`、`evaluation/result/index.vue`、`evaluation/review/index.vue`、`kpi/index.vue`、`strategy/monthly/index.vue`<br>考勤：`information/index.vue`、`attendance/index.vue`、`exception/index.vue`、`leave-overtime/index.vue`、`schedule/index.vue`<br>入离职：`entry/index.vue`、`resignation/index.vue`<br>招聘：`offer/index.vue`<br>薪酬：`settings/employee/index.vue` |
| 复现步骤 | 1. 打开培训/绩效/考勤/入离职/薪酬/招聘任一管理页面<br>2. 找到任意一条记录，点击「删除」按钮<br>3. 弹出确认弹窗后，点击「取消」<br>4. 控制台出现 `Uncaught (in promise) cancel` 红字 |
| 现象 | 控制台报错，`Uncaught (in promise) cancel` |
| 原因 | `ElMessageBox.confirm()` 在用户点击「取消」时会 reject Promise，代码直接用 `await` 未加 `try/catch`，拒绝未被捕获 |
| 修复 | 将所有 `await ElMessageBox.confirm(...)` 包裹在 `try/catch` 中，取消时 `catch { return; }` 静默退出，不继续执行后续操作 |

---

## 涉及文件清单

| 文件 | 改动次数 | 涉及修复 |
| --- | --- | --- |
| apps/web-ele/src/api/erp/human-resources/organization-structure.ts` | 2 | 6/25 #1、#4 |
| apps/web-ele/src/api/erp/human-resources/job-management.ts` | 1 | 6/25 #3 |
| apps/web-ele/src/api/erp/human-resources/attendance/index.ts` | 6 | 6/25 #2、6/26 #1/#2/#3 |
| apps/web-ele/src/views/hr/attendance/exception/index.vue` | 3 | 6/26 #1、连带、6/27 #1 |
| apps/web-ele/src/views/hr/attendance/schedule/index.vue` | 1 | 6/26 #2 |
| apps/web-ele/src/views/hr/recruitment/job-posting/index.vue` | 2 | 7/01 #1 |
| apps/web-ele/src/views/erp/HumanResources/recruitment/job-posting/index.vue` | 2 | 7/01 #1 |
| apps/web-ele/src/api/erp/human-resources/recruitment/job-posting.ts` | 1 | 7/01 #1 |

## 涉及数据表

| 表名                               | 数据库        | 相关修复            |
| ---------------------------------- | ------------- | ------------------- |
| `Base_DepartInfo`                  | QYVirtualPlat | 6/25 #3、6/26 #3    |
| `Base_JobInfo`                     | QYVirtualPlat | 6/25 #1 #4、6/26 #3 |
| `view_dep_job_userDJ`              | QYVirtualPlat | 6/25 #4             |
| `Bil_HR_Attendance_Records`        | LMBill        | 6/25 #2、6/26 #1    |
| `Bil_HR_Attendance_Schedule_Rules` | LMBill        | 6/26 #2             |
| `Bil_HR_Attendance_Leave_Overtime` | LMBill        | 6/25 #2             |
| `Bil_HR_Recruitment_Job_Postings`  | LMBill        | 7/01 #1             |

## Bug 分类总结

所有修复可归为三类根因：

| 类型 | 说明 | 涉及 Bug |
| --- | --- | --- | --- | --- |
| **数据链路断裂** | UI 能填能选，但数据没进数据库，因为 API 没处理该字段或无对应存储列 | 6/26 #1、#2、6/27 #1 |
| **查询条件遗漏** | 过滤条件过窄或不完整，导致记录被漏掉 | 6/25 #1 #3 #4、6/26 #3 |
| **前后端不一致** | 搜索提示写的和实际匹配逻辑对不上 | 6/25 #2 |
| **falsy 值语义错误** | 用 ` |  | `或`!`做默认值/校验，把合法的`0` 当成空值处理 | 7/01 #1 |

## HR 模块缺陷扫描记录（2026-07-02）

### 汇总

对人力资源全部约 60+ 个页面进行了系统性代码审查，涵盖：培训管理、绩效管理、薪酬管理、考勤管理、入离职管理、组织架构、员工管理、招聘管理。共发现 **38 个功能缺陷**。

---

### 严重（共 11 项）

| # | 模块 | 缺陷描述 | 涉及文件 |
| --- | --- | --- | --- |
| 1 | 组织架构 | 点击「人员设置」报 `ReferenceError: scope is not defined` 白屏 | `organ/org-chart/index.vue:1173`、`organization/orgChart/index.vue:1173` |
| 2 | 培训 | `ElMessageBox.confirm` 取消时无 catch，unhandled rejection | `course/index.vue:274`、`evaluation/index.vue:257` |
| 3 | 绩效 | 8个页面的 `handleDelete` 中 `ElMessageBox.confirm` 取消时无 catch | `config/indicator/`、`config/matrix/`、`config/template/`、`evaluation/interview/`、`evaluation/result/`、`evaluation/review/`、`kpi/`、`strategy/monthly/` |
| 4 | 薪酬 | `ElMessageBox.confirm`/`confirm()` 取消时无 catch（5处） | `settings/employee/index.vue:107`、`salary copy/components/SalaryCrudPage.vue:148`、`settings/rankContributionRule/index.vue:355`、`wages/index.vue:202`、`settings/payroll/usePayrollPage.ts:413` |
| 5 | 考勤 | `ElMessageBox.confirm` 取消时无 catch（约 7 处） | `attendance/index.vue`、`info/index.vue`、`leave-overtime/index.vue`、`schedule/index.vue`(x2)、`exception/index.vue`(x2) |
| 6 | 入离职 | `ElMessageBox.confirm` 取消时无 catch + 审批无 try/catch | `onboarding/entry/index.vue`、`onboarding/resignation/index.vue` |
| 7 | 考勤/入离职/招聘 | submit() 只有 try/finally 无 catch，API 失败白屏无提示 | `attendance/index.vue`、`attendance/info/index.vue`、`onboarding/entry/index.vue`、`onboarding/resignation/index.vue`、`recruitment/job-posting/index.vue`、`recruitment/offer/index.vue` |
| 8 | 员工管理 | `remove()` 无确认弹窗且无 try/catch | `staff/index.vue:228`、`job/index.vue:104` |
| 9 | 考勤 | `audit()` 通过/驳回无确认弹窗且无 try/catch | `leave-overtime/index.vue:347` |
| 10 | 入离职 | `approve()` 通过无确认弹窗且无 try/catch | `onboarding/entry/index.vue:200`、`onboarding/resignation/index.vue:192` |
| 11 | 薪酬 | `addDialogBracket()` 单 bracket 时覆盖 last upperBound 为 3000，数据结构损坏 | `settings/taxRule/index.vue:124` |

### 高（共 10 项）

| # | 模块 | 缺陷描述 | 涉及文件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 培训 | 能力模型 `description` 被 `category` 覆盖 | `learning-path/competency/index.vue:212` |
| 2 | 培训 | 能力模型编辑 `id` 可能传 `-` 到 API | `learning-path/competency/index.vue:217` |
| 3 | 培训 | API 关键词搜索缺少 `planCode` 字段 | `training/index.ts:130-139` |
| 4 | 员工 | `row.Age |  | ''`/`Age: row.Age |  | ''` 将年龄 0 显示为空 | `staff/index.vue:270`、`staff/basic/index.vue:70` |
| 5 | 组织 | 用户管理年龄列 `Age > 0` 将年龄 0 显示为 `-` | `organization/usermanagement/index.vue:46`、`organ/usermanagement/index.vue:46` |
| 6 | 绩效 | 搜索关键词后员工下拉框被同步过滤 | `evaluation/interview/`、`evaluation/result/`、`evaluation/review/`、`strategy/monthly/` |
| 7 | 培训 | `gap-analysis` 编辑 ID 用 `id |  | rowid`，`id: 0` 误判为 falsy | `learning-path/gap-analysis/index.vue:202`、`learning-path/plan/index.vue:273` |
| 8 | 培训 | 计划管理 `page: 500` 硬编码，超 500 条数据无法搜索 | `learning-path/plan/index.vue:182` |
| 9 | 入离职 | 日期字段使用 `<ElInput type="date">` 而非 `<ElDatePicker>` | `onboarding/entry/index.vue:294`、`onboarding/resignation/index.vue:284-285` |
| 10 | 绩效 | `completionRate` 值 `0` 被 falsy 检查吞掉，回退到状态默认值 | `strategy/monthly/index.vue:75-86` |

### 低（共 2 项）

| # | 模块 | 缺陷描述 | 涉及文件 |
| --- | --- | --- | --- |
| 1 | 组织 | `jobKey` 被 `resetJobUserSettingsState` 重置后重复赋值 | `organ/org-chart/index.vue:1187-1189` |
| 2 | 绩效 | `pickValue` 返回 `-` 用作搜索匹配时可能误匹配 | `evaluation/index.vue:46-55` |

### 操作建议

1. **优先修复严重项**（特别是 #1 组织架构白屏、#2~#6 无 catch 导致的取消报错、#8~#10 无确认弹窗直接操作）
2. **高项中** #1~#4（培训描述覆盖、 Age 显示为 0）较为简单可顺手修
3. **数据模型权限问题**（`Bil_HR_Training_Gap_Analysis` 模型不可见）需后端配置，非代码问题
## 2026-07-03（6 项）

### 1. 招聘职位发布 - 删除取消时报 Uncaught (in promise) cancel

| 项目 | 内容 |
|---|---|
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/views/hr/recruitment/job-posting/index.vue |
| 复现步骤 | 1. 打开职位发布列表 → 2. 点击「删除」→ 3. 确认弹窗点「取消」 |
| 现象 | 控制台报 Uncaught (in promise) cancel |
| 原因 | handleDelete() 中 ElMessageBox.confirm() 没有 try/catch |
| 修复 | 用 try/catch 包裹 ElMessageBox.confirm()，catch 中 return |

### 2. 工资表 - 删除取消时报 Uncaught (in promise) cancel

| 项目 | 内容 |
|---|---|
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/views/hr/salary/wages/index.vue |
| 复现步骤 | 1. 打开工资表 → 2. 点击「删除」→ 3. 确认弹窗点「取消」 |
| 现象 | 控制台报 Uncaught (in promise) cancel |
| 原因 | handleDelete() 中 ElMessageBox.confirm() 没有 try/catch |
| 修复 | 用 try/catch 包裹 ElMessageBox.confirm()，catch 中 return |

### 3. 五险一金维护 - 停用取消时报 Uncaught (in promise) cancel

| 项目 | 内容 |
|---|---|
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/views/hr/salary/settings/rankContributionRule/index.vue |
| 复现步骤 | 1. 打开五险一金维护 → 2. 选中职级 → 3. 点击「停用」→ 4. 弹窗点「取消」 |
| 现象 | 控制台报 Uncaught (in promise) cancel |
| 原因 | handleDisableCurrentRankAssignments() 中 ElMessageBox.confirm() 在 try/catch 外面 |
| 修复 | 将 ElMessageBox.confirm() 移入 try/catch 块内 |

### 4. 弹窗确认/取消按钮显示英文而非中文

| 项目 | 内容 |
|---|---|
| 严重程度 | 低 |
| 文件 | apps/web-ele/src/bootstrap.ts |
| 复现步骤 | 1. 打开任意页面 → 2. 触发任意确认弹窗 |
| 现象 | 弹窗按钮显示英文 "OK" / "Cancel" |
| 原因 | Element Plus 未配置中文语言包 |
| 修复 | 在 bootstrap.ts 中全局配置 Element Plus 中文语言包 |

### 5. 工作台「智能人事日历」月份写死为 2026年4月

| 项目 | 内容 |
|---|---|
| 严重程度 | 低 |
| 文件 | apps/web-ele/src/views/hr/workbench/index.vue |
| 复现步骤 | 1. 打开工作台首页 → 2. 查看右侧「智能人事日历」卡片 |
| 现象 | 月份始终显示「2026年4月」 |
| 原因 | 模板中硬编码了「2026年4月」 |
| 修复 | 用 new Date() 动态生成当前年月 |

### 6. 组织架构 - 视图 view_dep_job_userDJ 为空导致人员数据不显示

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/erp/human-resources/organization-structure.ts |
| 复现步骤 | 1. 打开组织架构图 → 2. 左侧选部门 → 3. 右侧岗位列表添加人员并保存 → 4. 保存成功但页面不显示人员 |
| 现象 | 保存提示成功，但页面刷新后人员不显示；点击「人员设置」提示「当前岗位缺少人员设置所需主键信息」 |
| 原因 | 视图 view_dep_job_userDJ 在数据库中不存在或无数据，导致查询返回空。人员数据保存在 Base_User_DJ 表但无法通过视图读取 |
| 修复 | 在 getDepartmentJobList 函数中增加回退逻辑：视图为空时直接从 Base_User_DJ 表查询人员数据并合并到岗位列表；同时修复 saveJobUserAssignments 和 handleOpenJobUserSettings 中 JobId 查找逻辑，增加 ID/rowid 回退 |

---

## 2026-07-06（4项）

### 1. 人员设置弹窗报 ReferenceError / 弹窗内容空白

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/organ/org-chart/index.vue |
| 复现步骤 | 1. 打开组织架构图 → 2. 左侧选部门 → 3. 右侧岗位列表某行点「操作」列「人员设置」 |
| 现象 | 部分岗位点击后控制台报 ReferenceError: scope is not defined；部分岗位弹窗打开但表格内容空白，显示「暂无人员信息」 |
| 原因 | 两个 bug 叠加：① handleOpenJobUserSettings 函数内 canOpenJobUserSettings(scope.row) 引用了不存在的变量 scope，应为参数 ow；② 人员设置弹窗表格列模板写了 scope.scope.row.JobType 等，多了一层 scope，导致 -model 双向绑定失效 |
| 修复 | ① scope.row → ow（1处）；② scope.scope.row.* → scope.row.*（4处） |

### 2. 人员列显示工号而非姓名

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/common/staff-selector.ts、apps/web-ele/src/components/staff-selector/StaffPicker.vue、apps/web-ele/src/views/hr/components/person-selector/index.vue |
| 复现步骤 | 1. 打开组织架构图 → 2. 选部门 → 3. 给岗位添加人员并保存 → 4. 观察「人员」列 |
| 现象 | 人员列有时显示员工姓名，有时显示登录名/工号 |
| 原因 | getStaffByIds 只按 ROWID 查 Base_UserInfo 表。但 Base_User_DJ.UserID 不一定等于 Base_UserInfo.ROWID（可能是登录名/工号），查不到时返回空 → esolveJobUsers 异常 → 走 ssignFallbackJobUsers 降级，把原始 UserID 当 UserName → 人员列显示工号。同时 PersonSelector 传给 StaffPicker 时丢弃了已有的 UserName，迫使 StaffPicker 做可能失败的二次查询 |
| 修复 | ① getStaffByIds 增加二轮回退：ROWID 查不到时，通过 Base_User_DJ 关系表按 UserID 补充 UserName；② StaffPicker 新增 resolvedNames prop，接受预解析的 ID→姓名映射，优先使用跳过远程查询；③ PersonSelector 将已有的 UserId→UserName 映射通过 resolvedNames 传给 StaffPicker，过滤掉 fallback 情况（UserName === UserId） |

### 3. 添加人员后显示的姓名与实际不符

| 项目 | 内容 |
|---|---|
| 严重程度 | 中 |
| 文件 | apps/web-ele/src/components/staff-selector/StaffPicker.vue、apps/web-ele/src/views/hr/components/person-selector/index.vue |
| 复现步骤 | 1. 打开组织架构图 → 2. 给岗位添加人员「林靖」→ 3. 保存后观察人员列 |
| 现象 | 显示的不是「林靖」而是其他文字（如工号或乱码） |
| 原因 | PersonSelector 只传 UserId 数组给 StaffPicker，StaffPicker 自己调 getStaffByIds 查姓名，如果 ROWID 匹配失败就回退显示 ID。姓名在上游已有但传递链路中丢失 |
| 修复 | 同 Bug #2 的修复，通过 resolvedNames 机制保留上游已解析的姓名 |

### 4. 保存人员后提示「新增 2 条」但实际未保存

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/erp/human-resources/organization-structure.ts — saveJobUserAssignments、saveJobUserSettings |
| 复现步骤 | 1. 打开组织架构图 → 2. 给岗位添加 2 个人员 → 3. 保存 |
| 现象 | 提示「人员保存成功，新增 2 条，删除 0 条」，但有时实际数据并未持久化到数据库，刷新后人员消失 |
| 原因 | saveJobUserAssignments 调用 saveTable 后**丢弃了返回值**，直接用本地 addedRecords.length 作为 addedCount 返回。不管服务端实际处理了几条（包括 0 条），前端都按本地 diff 数量报成功。saveJobUserSettings 有同样问题 |
| 修复 | ① saveJobUserAssignments：读取 saveTable 返回值中的 addedCount/deletedCount，服务端有值时用服务端值，否则回退本地值；② saveJobUserSettings：同理读取 changedCount |

---

## 涉及文件清单（2026-07-06 新增）

| 文件 | 改动 | 涉及修复 |
|---|---|---|
| apps/web-ele/src/views/hr/organ/org-chart/index.vue | 5处 | #1 人员设置弹窗报错/空白 |
| apps/web-ele/src/api/common/staff-selector.ts | 重构 getStaffByIds | #2 #3 人员列显示工号 |
| apps/web-ele/src/components/staff-selector/StaffPicker.vue | 新增 resolvedNames prop | #2 #3 人员列显示工号 |
| apps/web-ele/src/views/hr/components/person-selector/index.vue | 传递 resolvedNames | #2 #3 人员列显示工号 |
| apps/web-ele/src/api/erp/human-resources/organization-structure.ts | 读取服务端返回值 | #4 保存提示不准确 |

## Bug 分类总结（2026-07-06 新增）

| 类型 | 说明 | 涉及 Bug |
|---|---|---|
| **变量引用错误** | 函数参数名与模板作用域变量名混淆 | #1 |
| **数据传递断裂** | 上游已有的数据在组件传递链路中被丢弃 | #2、#3 |
| **ID 体系不一致** | Base_User_DJ.UserID 与 Base_UserInfo.ROWID 不匹配时查询失败 | #2 |
| **返回值丢弃** | API 调用的返回值未读取，直接用本地计算值报成功 | #4 |
### 5. 旧版组织架构页面「人员设置」仍报缺少主键信息

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/organization/orgChart/index.vue（旧版页面，用户实际使用的页面） |
| 复现步骤 | 1. 打开组织架构图（旧版路由） → 2. 左侧选部门 → 3. 右侧岗位列表点「人员设置」 |
| 现象 | 部分岗位提示「当前岗位缺少人员设置所需主键信息」，控制台无 [DEBUG] 输出（函数被调用但回退链太短直接命中报错） |
| 原因 | 旧版 handleOpenJobUserSettings 的 ID 回退链极短：depId 仅检查 row.raw?.DepID \|\| row.DepID（无 selectedDepartmentId 回退），jobId/jobRowid 仅检查 3 个字段且取值完全相同。对于通用岗位或新创建未生成编码的岗位，所有字段均为空，直接命中报错。此前所有修复只应用到了新版 organ/org-chart/index.vue，未同步到用户实际使用的旧版 organization/orgChart/index.vue |
| 修复 | 同步全部修复到旧版：① depId 增加 selectedDepartmentId.value 回退；② jobId/jobRowid 扩展为 7 字段回退链；③ 增加兄弟行查找（同 jobKey 的其他行取 ID）；④ 增加 getJobByIdentity 数据库回查；⑤ 导入 getJobByIdentity |

---

## 涉及文件清单（2026-07-06 补充）

| 文件 | 改动 | 涉及修复 |
|---|---|---|
| apps/web-ele/src/views/hr/organization/orgChart/index.vue | 重构 handleOpenJobUserSettings + 新增 import | #5 旧版人员设置报错 |

## Bug 分类补充（2026-07-06）

| 类型 | 说明 | 涉及 Bug |
|---|---|---|
| **新旧版本未同步** | 修复只应用到新版页面，用户实际使用旧版页面 | #5 |
### 6. 添加人员后显示的姓名与弹窗选择的不一致

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/api/common/staff-selector.ts — getStaffByIds |
| 复现步骤 | 1. 打开组织架构图 → 2. 给岗位添加人员「林靖」→ 3. 保存后观察人员列 |
| 现象 | 弹窗里选择的是「林靖」，保存后人员列显示「林林大林」 |
| 原因 | 人员选择弹窗的 getStaffList 从 Base_User_DJ（关系表）取 UserName，而保存后的名称解析 getStaffByIds 从 Base_UserInfo（用户表）取 UserName。两张表对同一个人存储的姓名不一致（关系表是「林靖」，用户表是「林林大林」），导致弹窗显示和保存后显示不一致 |
| 修复 | getStaffByIds 构造 Staff 对象时，优先使用 Base_User_DJ.UserName（与弹窗一致），回退到 Base_UserInfo.UserName：UserName: String(rel?.UserName \|\| user.UserName \|\| '') |
### 7. 人员添加/删除/显示综合修复

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | organization/orgChart/index.vue、organ/org-chart/index.vue、organization-structure.ts、staff-selector.ts、PersonSelector、StaffPicker |
| 根因 | 1. staff-selector.ts 中 USER_PK 用了 'ROWID'（系统字段），但 Base_UserInfo 的主键是 ID。Base_User_DJ.UserID 关联的是 ID 不是 ROWID，导致所有涉及人员查询的环节都查错人。2. 视图行的 UserName 存的是工号而非姓名，弹窗显示工号。3. 删除时 ID 格式不匹配导致无法命中要删的记录。4. esolveJobUsers 合并逻辑导致清空操作后旧数据被恢复。5. 服务端 saveTable 批量保存时静默丢弃部分记录，前端提示与实际不一致。 |
| 修复 | 1. USER_PK 从 'ROWID' 改为 'ID'，对齐主键。2. 弹窗 UserName 优先用 dbRows.UserName（Base_User_DJ）。3. 删除时同时匹配 UserID 和 owid。4. esolveJobUsers 去掉合并逻辑，每次完全重建。5. 提示数量改为读取服务端返回的 mapListAdd.length。6. getJobUserSettings 按 UserID 去重。7. 加客户端查重防止服务端静默跳过。8. esolveUserIdsToRowIds 增加按 LoginName 和 Base_User_DJ 回查。9. 人员输入框和弹窗数据源统一。 |

---

## Bug 分类补充（2026-07-06 ~ 07-07）

| 类型 | 说明 | 涉及 Bug |
|---|---|---|
| **主键字段错误** | 代码用 ROWID（系统字段）查询，实际主键是 ID | #7 根因 |
| **数据源不一致** | 弹窗和输入框用了不同数据源，姓名取自不同表 | #7 |
| **ID 格式不匹配** | 新旧记录用不同格式的 ID 比较，diff 和删除都失效 | #7 |
| **服务端静默失败** | 批量保存丢弃部分记录，前端用本地值提示 | #7 |
| **合并逻辑副作用** | 删除后旧数据通过合并恢复 | #7 |
---

## 2026-07-07（1项）

### 1. 旧版组织架构页面中文编码损坏导致编译失败

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/organization/orgChart/index.vue |
| 复现步骤 | 1. 打开组织架构图（旧版页面）→ 2. Vite 编译报错 |
| 现象 | 编译报错 Unexpected token, expected ","，页面白屏无法加载 |
| 原因 | 该文件在之前的多次编辑过程中中文编码被损坏，所有中文字符串变为乱码（UTF-8 字节被错误截断/替换），关键位置（validation 的 message 字段）丢失闭合单引号，导致 JS 语法错误 |
| 修复 | 用编码正确的 organ/org-chart/index.vue（新版页面）覆盖旧版文件。两个文件业务逻辑完全一致，仅编码不同。覆盖后所有中文恢复正常，编译通过 |

### 2. resolveJobUsers 函数后存在孤立代码导致编译报错

| 项目 | 内容 |
|---|---|
| 严重程度 | 高 |
| 文件 | apps/web-ele/src/views/hr/organization/orgChart/index.vue、apps/web-ele/src/views/hr/organ/org-chart/index.vue |
| 复现步骤 | 1. 打开组织架构图页面 → 2. Vite 编译报错 eturn outside of function |
| 现象 | 编译报错 'return' outside of function，页面无法加载 |
| 原因 | esolveJobUsers 函数在第 1006 行已正确闭合，但第 1007-1035 行残留了一段孤立的函数体代码（旧版本逻辑副本），导致 eturn 等语句位于函数外 |
| 修复 | 删除两个文件中的孤立代码块（第 1007-1035 行，共 29 行），花括号深度恢复正常 |
