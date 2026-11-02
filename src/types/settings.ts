export interface OfficeSettings {
  openingTime: string; // "10:00"
  openingBufferMinutes: number; // 20
  closingTime: string; // "19:00"
  closingBufferMinutes: number; // 30
  lunchDurationMinutes: number; // 60
}

export interface LatePolicySettings {
  maximumLateArrivalTime: string; // "10:45"
  monthlyAllowance: number; // 3
  resetFrequency: 'monthly';
}

export type OvertimeCompensationMethod = 'REIMBURSEMENT' | 'EARLY_LEAVE_ADJUSTMENT';

export interface OvertimePolicySettings {
  reimbursementDeadlineDays: number; // 7
  approvalRequired: boolean; // true
  approver: string; // "Sayan"
  compensationMethods: OvertimeCompensationMethod[];
}

export interface LeavePolicySettings {
  whatsappRequestRequired: boolean; // true
  workFromHomeAllowed: boolean; // false
  halfDaySalaryDeductionAllowed: boolean; // true
  halfDayLeaveAdjustmentAllowed: boolean; // true
  saturdayHalfDaySubjectToWorkload: boolean; // true
}

export interface CompanySettings {
  cookingDayEnabled: boolean;
  cookingDayName: string;
  cookingDayParticipantNote: string;
}

export interface AppSettings {
  office: OfficeSettings;
  latePolicy: LatePolicySettings;
  overtimePolicy: OvertimePolicySettings;
  leavePolicy: LeavePolicySettings;
  company: CompanySettings;
}

