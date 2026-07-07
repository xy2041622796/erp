export type AttendanceSettlementRule = {
  absentDeductRate: number;
  annualLeaveDeductRate: number;
  attendanceDeductionItemCode: string;
  code: string;
  dailySalaryDays: number;
  description: string;
  lateEarlyFixedAmount: number;
  overtimeItemCode: string;
  overtimeMultiplierWorkday: number;
  personalLeaveDeductRate: number;
  sickLeaveDeductRate: number;
  title: string;
  workHoursPerDay: number;
};

export const defaultAttendanceSettlementRules: AttendanceSettlementRule[] = [
  {
    code: 'ATTENDANCE_SETTLEMENT_DEFAULT',
    title: '默认月度考勤结算规则',
    description: '用于月度工资汇总：加班按工作日 1.5 倍折算，病假按 50% 扣减，事假与旷工全额扣减，年假不扣减，迟到早退按固定金额扣减。',
    overtimeMultiplierWorkday: 1.5,
    sickLeaveDeductRate: 0.5,
    personalLeaveDeductRate: 1,
    annualLeaveDeductRate: 0,
    absentDeductRate: 1,
    lateEarlyFixedAmount: 20,
    dailySalaryDays: 21.75,
    workHoursPerDay: 8,
    overtimeItemCode: 'overtime_pay',
    attendanceDeductionItemCode: 'other_deduction',
  },
];
