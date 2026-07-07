# 月度结算规则维护页面能力

- 入口：`src/views/finance/cashier/settings/attendanceSettlementRule/index.vue`
- 页面目标：维护“考勤扣款 / 加班工资 / 病假折算”相关的月度工资结算参数。
- 当前能力：
  - 维护工作日加班倍率
  - 维护病假、事假、年假、旷工折算比例
  - 维护迟到早退固定扣款金额
  - 维护月计薪天数、日工时
  - 维护加班工资归集工资项、考勤扣款归集工资项
- 数据位置：`LMBill / Bil_Salary_Rule`
- 规则类型：`ATTENDANCE`
- 关联页面：
  - `src/views/hr/salary/wages/index.vue`
  - `src/views/hr/salary/wages/monthly-settlement.ts`
- 使用方式：工资表页点击“汇总计算当月工资”时，会读取这里保存的月度结算规则参与本月工资计算。
