import { UserRole } from './employee';
import { LeaveType, LeaveDurationType, LeaveStatus } from './leave';
import { OvertimeCompensationMethod, OvertimeStatus, ReimbursementStatus, EarlyLeaveStatus } from './overtime';

export interface AdminDashboardStats {
  todayDate: string;
  totalEmployees: number;
  presentToday: number;
  onTimeToday: number;
  withinBufferToday: number;
  lateToday: number;
  halfDayToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeavesCount: number;
  pendingOvertimeCount: number;
  todayPunchesFeed: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    designation: string;
    avatarUrl?: string;
    checkIn?: string;
    checkOut?: string;
    status: string;
    statusLabel: string;
    isHalfDayCase: boolean;
    lateAllowanceUsed?: number;
  }>;
}

export interface AdminEmployeeItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone: string;
  designation: string;
  joiningDate: string;
  employmentType: 'Full-time' | 'Contract' | 'Part-time';
  workLocation: string;
  role: UserRole;
  salary: number;
  isActive: boolean;
  avatarUrl?: string;
  department?: string;
  todayAttendance?: {
    checkIn?: string;
    checkOut?: string;
    status: string;
    statusLabel: string;
  };
}

export interface AdminEmployeeFormInput {
  customId?: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone: string;
  designation: string;
  joiningDate: string;
  employmentType: 'Full-time' | 'Contract' | 'Part-time';
  workLocation: string;
  role: UserRole;
  salary: number;
  password?: string;
}

export interface AdminEmployeeUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  personalEmail?: string;
  phone: string;
  designation: string;
  employmentType: 'Full-time' | 'Contract' | 'Part-time';
  workLocation: string;
  role: UserRole;
  salary: number;
  isActive: boolean;
  newPassword?: string;
}

export interface AdminLeaveApprovalItem {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  avatarUrl?: string;
  leaveType: LeaveType;
  durationType: LeaveDurationType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approvedOrRejectedBy?: string;
  reviewedOn?: string;
  comments?: string;
  availableBalance?: number;
}

export interface AdminOvertimeApprovalItem {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  avatarUrl?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  hoursFormatted: string;
  reason: string;
  status: OvertimeStatus;
  reviewedDate?: string;
  compensationMethod: OvertimeCompensationMethod;
  reimbursementStatus: ReimbursementStatus;
  earlyLeaveStatus: EarlyLeaveStatus;
  notes?: string;
}

export interface HolidayItem {
  id: string;
  name: string;
  date: string;
  day: string;
  type: 'NATIONAL' | 'FESTIVAL' | 'PUBLIC' | 'OPTIONAL';
  description?: string;
  isOfficeClosed: boolean;
}

export interface NewHolidayInput {
  name: string;
  date: string;
  day: string;
  type: 'NATIONAL' | 'FESTIVAL' | 'PUBLIC' | 'OPTIONAL';
  description?: string;
  isOfficeClosed: boolean;
}

