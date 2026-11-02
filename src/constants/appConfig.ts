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

