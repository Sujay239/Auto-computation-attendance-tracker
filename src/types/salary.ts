export type DeductionIncidentType =
  | 'LATE_PAST_CUTOFF'
  | 'EXCESS_LATE_ALLOWANCES'
  | 'HALF_DAY_PUNCH'
  | 'HALF_DAY_LEAVE'
  | 'APPROVED_LEAVE'
  | 'UNAPPROVED_ABSENCE'
  | 'UNPAID_LEAVE';

export type DeductionIncidentStatus =
  | 'ADJUSTED_WITH_LEAVE'
  | 'PARTIALLY_ADJUSTED'
  | 'SALARY_DEDUCTED';

export interface SalaryDeductionIncident {
  id: string;
  date: string; // YYYY-MM-DD
  incidentType: DeductionIncidentType;
  title: string;
  type: 'HALF_DAY' | 'FULL_DAY';
  penaltyUnits: number; // 0.25, 0.5, or 1.0
  status: DeductionIncidentStatus;
  adjustedLeaveType: string | null; // 'HALF_DAY', 'CASUAL', 'SICK', 'EARNED', or null
  leaveDaysDeducted: number; // e.g. 0.25, 0.5, 1.0 or 0
  uncoveredDays?: number; // unpaid portion
  deductionAmount: number; // in INR (0 if adjusted with leave)
  description: string;
  checkInTime?: string | null;
  leaveRequestId?: string;
}

export interface AdjustedLeaveBalance {
  type: string;
  label: string;
  initialAvailable: number;
  usedForSalaryAdjustment: number;
  currentAvailable: number;
}

/**
 * Section 7: Month-Wise Payroll Ledger Record
 * Every deduction must be traceable.
 */
export interface LeaveDeductionRecord {
  id: string;
  employeeId: string;
  leaveRequestId?: string;

  date: string; // "YYYY-MM-DD"
  payrollMonth: string; // "YYYY-MM"

  leaveType: 'FULL_DAY' | 'HALF_DAY';

  requiredLeaveDays: number;
  leaveBalanceBefore: number;
  leaveDaysDeducted: number;

  uncoveredDays: number;
  monthlySalary: number;
  applicablePayrollDays: number;
  dailySalary: number;
  salaryDeduction: number;

  status: 'PROCESSED' | 'REVERSED';
  createdAt: string;
  reason?: string;
}

/**
 * Section 7: Monthly Payroll Summary
 */
export interface MonthlyPayrollSummary {
  employeeId: string;
  payrollMonth: string; // "YYYY-MM"

  monthlySalary: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalHalfDays: number;

  paidLeaveDays: number;
  unpaidLeaveDays: number;

  totalLeaveDeduction: number; // total days deducted from leave balance
  totalSalaryDeduction: number; // total monetary salary deduction in INR

  netSalary: number;
}

export interface SalaryBreakdown {
  monthKey: string; // 'YYYY-MM'
  monthName: string; // 'November 2026'
  daysInMonth: number;
  monthlySalary: number;
  dailySalary: number; // floor(monthlySalary / daysInMonth)
  halfDaySalary: number; // floor(dailySalary / 2)
  fullDayDeductionRate: number; // 2 * halfDaySalary
  totalDeductionAmount: number;
  projectedNetSalary: number;
  totalWorkingDays: number;
  totalIncidents: number;
  halfDaysAdjustedCount: number;
  halfDaysDeductedCount: number;
  fullDaysAdjustedCount: number;
  fullDaysDeductedCount: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  totalLeaveDaysConsumed: number;
  incidents: SalaryDeductionIncident[];
  leaveBalances: AdjustedLeaveBalance[];
  ledgerRecords?: LeaveDeductionRecord[];
  summary?: MonthlyPayrollSummary;
}
