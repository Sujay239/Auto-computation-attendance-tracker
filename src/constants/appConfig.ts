/**
 * Application-wide Configuration & Enterprise Policies
 * Auto Computation - Single-Company Internal Deployment
 */

export const COMPANY_CONFIG = {
  name: 'Auto Computation',
  tagline: 'Advanced Computing & Enterprise Intelligence',
  address: 'Chinar Park, Teghoria, Kolkata - 700157',
  contactEmail: 'contact@autocomputation.com',
  supportPhone: '+91 9477085478',
  whatsappNoticeNote:
    'Notice: In-app leave and overtime submissions are recorded for workflow tracking. Official leave approvals also require communication in the official company WhatsApp group.',
} as const;

export const OFFICE_TIMINGS = {
  openingTime: '10:00', // 10:00 AM
  openingBufferMinutes: 20, // Grace arrival window until 10:20 AM
  maxLateArrivalTime: '10:45', // Arrival after 10:45 AM strictly marks Half Day
  halfDayCutoffTime: '14:00', // 02:00 PM (First half ends at 2:00 PM; Second half begins at 2:00 PM)
  lastPunchInTime: '14:30', // 02:30 PM (Strict punch-in cutoff. Punch-in closed after 2:30 PM, directly marked ABSENT)
  closingTime: '19:00', // 07:00 PM (Standard closing)
  closingBufferMinutes: 30, // Closing extension window until 07:30 PM
  lunchDurationMinutes: 60, // 1 hour standard lunch break
  monthlyLateAllowance: 3, // 3 late arrivals allowed per calendar month
  overtimeReimbursementDays: 7, // Overtime claims processed within 7 calendar days
  workFromHomeAllowed: false, // WFH strictly not permitted
  halfDaySalaryDeductionAllowed: true, // Half day deductions apply on unapproved absences/late
} as const;

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  ADMIN: 'ADMIN',
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const APP_SETTINGS = {
  office: {
    openingTime: '10:00',
    openingBufferMinutes: 20,
    closingTime: '19:00',
    closingBufferMinutes: 30,
    lunchDurationMinutes: 60,
  },
  latePolicy: {
    maximumLateArrivalTime: '10:45',
    halfDayTime: '14:00',
    lastPunchInTime: '14:30',
    monthlyAllowance: 3,
    resetFrequency: 'monthly',
  },
  overtimePolicy: {
    reimbursementDeadlineDays: 7,
    approvalRequired: true,
    approver: 'Sayan',
    compensationMethods: [
      'REIMBURSEMENT',
      'EARLY_LEAVE_ADJUSTMENT',
    ],
  },
  leavePolicy: {
    whatsappRequestRequired: true,
    workFromHomeAllowed: false,
    halfDaySalaryDeductionAllowed: true,
    halfDayLeaveAdjustmentAllowed: true,
    saturdayHalfDaySubjectToWorkload: true,
  },
  company: {
    cookingDayEnabled: true,
    cookingDayName: 'Friday',
    cookingDayParticipantNote:
      'Weekly office cooking day for designated team members. Normal client deliverables and office operations remain active.',
  },
};


