export type LeaveType = 'CASUAL' | 'SICK';
export type LeaveDurationType = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveBalance {
  type: LeaveType;
  label: string;
  total: number;
  used: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  durationType: LeaveDurationType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approvedOrRejectedBy?: string;
  reviewedOn?: string;
  comments?: string;
  whatsappNoticeAcknowledged: boolean;
}

