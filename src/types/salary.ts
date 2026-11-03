export type DeductionIncidentType =
  | 'LATE_PAST_CUTOFF'
  | 'EXCESS_LATE_ALLOWANCES'
  | 'HALF_DAY_PUNCH'
  | 'UNAPPROVED_ABSENCE'
  | 'UNPAID_LEAVE';

export type DeductionIncidentStatus = 'ADJUSTED_WITH_LEAVE' | 'SALARY_DEDUCTED';

export interface SalaryDeductionIncident {
  id: string;
  date: string; // YYYY-MM-DD
  incidentType: DeductionIncidentType;
  title: string;
  type: 'HALF_DAY' | 'FULL_DAY';
  penaltyUnits: number; // 0.5 or 1.0
  status: DeductionIncidentStatus;
  adjustedLeaveType: string | null; // 'HALF_DAY', 'CASUAL', 'SICK', 'EARNED', or null
  leaveDaysDeducted: number; // 0.5 or 1.0 or 0
  deductionAmount: number; // in INR (0 if adjusted with leave)
  description: string;
  checkInTime?: string | null;
}

export interface AdjustedLeaveBalance {
  type: string;
  label: string;
  initialAvailable: number;
  usedForSalaryAdjustment: number;
  currentAvailable: number;
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
  totalLeaveDaysConsumed: number;
  incidents: SalaryDeductionIncident[];
  leaveBalances: AdjustedLeaveBalance[];
}

