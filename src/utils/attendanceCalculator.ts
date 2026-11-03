import { APP_SETTINGS } from '../constants/appConfig';
import { AppSettings } from '../types/settings';
import { AttendanceStatus } from '../types/attendance';

export const settings: AppSettings = APP_SETTINGS as unknown as AppSettings;

/**
 * Converts a time string (e.g. "09:55 AM", "10:20", "19:30") to minutes from start of day.
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleanStr = timeStr.trim();

  // Check if AM/PM format
  const isPM = /PM$/i.test(cleanStr);
  const isAM = /AM$/i.test(cleanStr);

  const rawTime = cleanStr.replace(/\s*(AM|PM)$/i, '').trim();
  const [hoursStr, minutesStr] = rawTime.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);

  if (isNaN(hours) || isNaN(minutes)) return 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Converts minutes from start of day into 24h "HH:mm" format.
 */
export function minutesTo24H(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes % (24 * 60));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Converts minutes from start of day into 12h "hh:mm AM/PM" format.
 */
export function minutesTo12H(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes % (24 * 60));
  let h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

export interface ArrivalAnalysis {
  status: AttendanceStatus;
  statusLabel: string;
  isLate: boolean;
  isHalfDay: boolean;
  lateAllowanceUsed?: number;
  halfDayReason?: string;
  expectedCheckOutMinutes: number;
  expectedCheckOutTime12H: string;
  expectedCheckOutTime24H: string;
  minutesLate: number;
}

/**
 * Evaluates arrival status according to company attendance rules:
 * - Opening: 10:00 AM (600 mins)
 * - Buffer: up to 10:20 AM (620 mins) -> Within Buffer (must stay until 7:30 PM)
 * - Max Late Cutoff: 10:45 AM (645 mins)
 * - Arrivals between 10:21 AM and 10:45 AM:
 *     - If monthlyLateCount < 3: LATE (consumes allowance)
 *     - If monthlyLateCount >= 3: HALF_DAY (allowances exhausted)
 * - Arrivals after 10:45 AM: HALF_DAY (exceeded cutoff)
 */
export function calculateArrivalStatus(
  checkInTimeStr: string,
  monthlyLateAllowancesUsedAlready = 0
): ArrivalAnalysis {
  const checkInMin = timeStringToMinutes(checkInTimeStr);

  const openingMin = timeStringToMinutes(settings.office.openingTime); // 10:00 -> 600
  const bufferLimitMin = openingMin + settings.office.openingBufferMinutes; // 10:20 -> 620
  const maxLateMin = timeStringToMinutes(settings.latePolicy.maximumLateArrivalTime); // 10:45 -> 645
  const maxAllowances = settings.latePolicy.monthlyAllowance; // 3

  // Standard closing: 19:00 (1140 min). Buffer closing: 19:30 (1170 min)
  const standardClosingMin = timeStringToMinutes(settings.office.closingTime); // 19:00 -> 1140
  const adjustedClosingMin = standardClosingMin + settings.office.closingBufferMinutes; // 19:30 -> 1170

  // 1. Arrived on time (<= 10:00 AM)
  if (checkInMin <= openingMin) {
    return {
      status: 'ON_TIME',
      statusLabel: 'On Time',
      isLate: false,
      isHalfDay: false,
      expectedCheckOutMinutes: standardClosingMin,
      expectedCheckOutTime12H: minutesTo12H(standardClosingMin),
      expectedCheckOutTime24H: minutesTo24H(standardClosingMin),
      minutesLate: 0,
    };
  }

  // 2. Arrived within buffer (10:01 AM - 10:20 AM)
  if (checkInMin <= bufferLimitMin) {
    return {
      status: 'WITHIN_BUFFER',
      statusLabel: 'Within Buffer',
      isLate: false,
      isHalfDay: false,
      expectedCheckOutMinutes: adjustedClosingMin,
      expectedCheckOutTime12H: minutesTo12H(adjustedClosingMin),
      expectedCheckOutTime24H: minutesTo24H(adjustedClosingMin),
      minutesLate: checkInMin - openingMin,
    };
  }

  // 3. Arrived late between 10:21 AM and 10:45 AM
  if (checkInMin <= maxLateMin) {
    if (monthlyLateAllowancesUsedAlready < maxAllowances) {
      const nextAllowanceIndex = monthlyLateAllowancesUsedAlready + 1;
      return {
        status: 'LATE',
        statusLabel: `Late (Allowance ${nextAllowanceIndex} of ${maxAllowances})`,
        isLate: true,
        isHalfDay: false,
        lateAllowanceUsed: nextAllowanceIndex,
        expectedCheckOutMinutes: adjustedClosingMin,
        expectedCheckOutTime12H: minutesTo12H(adjustedClosingMin),
        expectedCheckOutTime24H: minutesTo24H(adjustedClosingMin),
        minutesLate: checkInMin - bufferLimitMin,
      };
    } else {
      // Exceeded monthly 3 allowances -> Half-day case
      return {
        status: 'HALF_DAY',
        statusLabel: 'Half Day (Exceeded 3 Late Allowances)',
        isLate: true,
        isHalfDay: true,
        halfDayReason: `Arrived after 10:20 AM and exhausted all ${maxAllowances} monthly late allowances.`,
        expectedCheckOutMinutes: adjustedClosingMin,
        expectedCheckOutTime12H: minutesTo12H(adjustedClosingMin),
        expectedCheckOutTime24H: minutesTo24H(adjustedClosingMin),
        minutesLate: checkInMin - bufferLimitMin,
      };
    }
  }

  // 4. Arrived after 10:45 AM -> Half-day case regardless of remaining allowances
  return {
    status: 'HALF_DAY',
    statusLabel: 'Half Day (After 10:45 AM Cutoff)',
    isLate: true,
    isHalfDay: true,
    halfDayReason: `Arrival at ${minutesTo12H(checkInMin)} was beyond the maximum 10:45 AM cutoff.`,
    expectedCheckOutMinutes: adjustedClosingMin,
    expectedCheckOutTime12H: minutesTo12H(adjustedClosingMin),
    expectedCheckOutTime24H: minutesTo24H(adjustedClosingMin),
    minutesLate: checkInMin - maxLateMin,
  };
}

/**
 * Calculates net working duration, subtracting standard 1-hour lunch break
 * when the shift duration qualifies (> 4 hours).
 */
export function calculateWorkingHours(
  checkInTimeStr: string,
  checkOutTimeStr: string,
  lunchDurationMinutes = settings.office.lunchDurationMinutes
) {
  const checkInMin = timeStringToMinutes(checkInTimeStr);
  const checkOutMin = timeStringToMinutes(checkOutTimeStr);

  const grossDurationMinutes = Math.max(0, checkOutMin - checkInMin);
  // Subtract 1-hour lunch if worked for 4 or more hours
  const appliedLunchMinutes = grossDurationMinutes >= 240 ? lunchDurationMinutes : 0;
  const netWorkDurationMinutes = Math.max(0, grossDurationMinutes - appliedLunchMinutes);

  const hours = Math.floor(netWorkDurationMinutes / 60);
  const minutes = netWorkDurationMinutes % 60;

  return {
    grossDurationMinutes,
    lunchDurationMinutes: appliedLunchMinutes,
    netWorkDurationMinutes,
    formattedDuration: `${hours}h ${minutes.toString().padStart(2, '0')}m`,
    hoursDecimal: Number((netWorkDurationMinutes / 60).toFixed(2)),
  };
}

/**
 * Calculates overtime minutes worked beyond expected closing time.
 */
export function calculateOvertime(
  checkOutTimeStr: string,
  expectedCheckOutTimeStr: string
): { overtimeMinutes: number; formattedOvertime: string } {
  const checkOutMin = timeStringToMinutes(checkOutTimeStr);
  const expectedMin = timeStringToMinutes(expectedCheckOutTimeStr);

  const overtimeMinutes = Math.max(0, checkOutMin - expectedMin);
  const hours = Math.floor(overtimeMinutes / 60);
  const minutes = overtimeMinutes % 60;

  return {
    overtimeMinutes,
    formattedOvertime: `${hours}h ${minutes.toString().padStart(2, '0')}m`,
  };
}

/**
 * Calculates remaining working minutes until expected checkout time.
 */
export function calculateRemainingWorkingTime(
  currentTimeMinutes: number,
  expectedCheckOutMinutes: number
): { remainingMinutes: number; formattedRemaining: string; isShiftComplete: boolean } {
  const remaining = Math.max(0, expectedCheckOutMinutes - currentTimeMinutes);
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;

  return {
    remainingMinutes: remaining,
    formattedRemaining: remaining > 0 ? `${hours}h ${minutes}m remaining` : 'Shift Completed',
    isShiftComplete: remaining === 0,
  };
}

