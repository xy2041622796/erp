# HR 表格默认插槽解构安全修复

- 影响范围：
  - `src/views/hr/**/*.vue`
  - `src/views/erp/HumanResources/**/*.vue`
- 修复目标：所有 Element Plus 表格列默认插槽中使用对象解构的写法。
- 问题表现：
  - `Cannot destructure property 'row' of 'undefined' as it is undefined`
  - `Cannot destructure property '$index' of 'undefined' as it is undefined`
- 根因：Element Plus 表格插槽在某些渲染阶段可能以 `undefined` 调用默认插槽；若模板写成 `#default="{ row }"`、`#default="{ $index }"`、`#default="{ row, $index }"`，会在解构阶段直接抛错。
- 统一修复方式：
  - `#default="{ row }"` 改为 `#default="{ row = {} } = {}"`
  - `#default="{ $index }"` 改为 `#default="{ $index } = {}"`
  - `#default="{ row, $index }"` 改为 `#default="{ row = {}, $index } = {}"`
- 验证方式：
  - `.ai-tmp/check-all-destructured-default-slots-safe.cjs`：检查 HR/HumanResources 目录下所有对象解构式 `#default` 是否都带参数默认值 `= {}`。
  - `.ai-tmp/compile-default-slot-param-changed-vue.cjs`：使用 `@vue/compiler-sfc` 解析并编译本次修改过的 Vue SFC 模板。
- 本次结果：累计修改 106 个 Vue 文件、500 处插槽；安全检查通过；106 个修改文件的 SFC 模板编译检查通过。
