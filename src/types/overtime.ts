import { OvertimeCompensationMethod } from './settings';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReimbursementStatus = 'PENDING' | 'PROCESSED' | 'NOT_APPLICABLE';
export type EarlyLeaveStatus = 'AVAILABLE' | 'ADJUSTED' | 'NOT_APPLICABLE';

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "19:00" or "19:30"
  endTime: string; // "21:30"
  durationMinutes: number; // 120
  hoursFormatted: string; // "2h 00m"
  reason: string; // "Urgent production release hotfix"
  approver: string; // "Sayan"
  status: OvertimeStatus;
  reviewedDate?: string;
  compensationMethod: OvertimeCompensationMethod;
  reimbursementStatus: ReimbursementStatus;
  reimbursementDeadline: string; // "YYYY-MM-DD" (within 7 days)
  reimbursementAmount?: number;
  earlyLeaveStatus: EarlyLeaveStatus;
  earlyLeaveAdjustedDate?: string;
  notes?: string;
}

export interface OvertimeSummary {
  totalApprovedHours: string;
  totalPendingHours: string;
  reimbursementPendingCount: number;
  earlyLeaveHoursAvailable: string;
}

