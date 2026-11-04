export type AttendanceStatus =
  | 'PRESENT'
  | 'ON_TIME'
  | 'WITHIN_BUFFER'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'LEAVE'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'PENDING';

export interface PunchRecord {
  id: string;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: string; // ISO 8601 string or "YYYY-MM-DDTHH:mm:ss"
  timeString: string; // e.g. "09:55 AM"
  location?: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  checkIn?: string; // "09:55 AM"
  checkOut?: string; // "07:05 PM"
  checkInISO?: string;
  checkOutISO?: string;
  status: AttendanceStatus;
  statusLabel: string; // e.g. "On Time", "Within Buffer", "Late (Allowance 1 of 3)", "Half Day", "Approved Leave"
  totalDurationMinutes: number; // gross
  workDurationMinutes: number; // net of lunch
  lunchDurationMinutes: number;
  expectedCheckOutTime: string; // e.g. "19:00" or "19:30"
  lateAllowanceUsed?: number; // 1, 2, 3 or undefined
  isHalfDayCase?: boolean;
  halfDayReason?: string;
  overtimeMinutes?: number;
  punches: PunchRecord[];
  notes?: string;

  // Integrated Leave & Salary Deduction Fields (Section 5)
  leaveType?: 'FULL_DAY' | 'HALF_DAY' | 'FIRST_HALF' | 'SECOND_HALF' | string;
  leaveDeduction?: number; // amount deducted from leave balance (e.g. 0.25, 0.5, 1.0)
  salaryDeduction?: number; // uncovered salary deduction in INR
  leaveRequestId?: string; // related approved leave request ID
  isApprovedLeave?: boolean;
  isUnapprovedAbsence?: boolean;
}

export interface MonthlyAttendanceSummary {
  month: string; // "2026-11"
  totalWorkingDays: number;
  presentDays: number;
  onTimeDays: number;
  withinBufferDays: number;
  lateDays: number;
  lateAllowancesUsed: number;
  lateAllowancesRemaining: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  holidays: number;
  totalWorkHours: number;
  averageHoursPerDay: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  totalSalaryDeduction?: number;
}
