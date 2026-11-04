"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
exports.timeStringToMinutes = timeStringToMinutes;
exports.minutesTo24H = minutesTo24H;
exports.minutesTo12H = minutesTo12H;
exports.calculateArrivalStatus = calculateArrivalStatus;
exports.calculateWorkingHours = calculateWorkingHours;
exports.calculateOvertime = calculateOvertime;
exports.calculateRemainingWorkingTime = calculateRemainingWorkingTime;
const appConfig_1 = require("../constants/appConfig");
exports.settings = appConfig_1.APP_SETTINGS;
/**
 * Converts a time string (e.g. "09:55 AM", "10:20", "19:30") to minutes from start of day.
 */
function timeStringToMinutes(timeStr) {
    if (!timeStr)
        return 0;
    const cleanStr = timeStr.trim();
    // Check if AM/PM format
    const isPM = /PM$/i.test(cleanStr);
    const isAM = /AM$/i.test(cleanStr);
    const rawTime = cleanStr.replace(/\s*(AM|PM)$/i, '').trim();
    const [hoursStr, minutesStr] = rawTime.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr || '0', 10);
    if (isNaN(hours) || isNaN(minutes))
        return 0;
    if (isPM && hours < 12) {
        hours += 12;
    }
    else if (isAM && hours === 12) {
        hours = 0;
    }
    return hours * 60 + minutes;
}
/**
 * Converts minutes from start of day into 24h "HH:mm" format.
 */
function minutesTo24H(totalMinutes) {
    const normalized = Math.max(0, totalMinutes % (24 * 60));
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
/**
 * Converts minutes from start of day into 12h "hh:mm AM/PM" format.
 */
function minutesTo12H(totalMinutes) {
    const normalized = Math.max(0, totalMinutes % (24 * 60));
    let h = Math.floor(normalized / 60);
    const m = normalized % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    if (h === 0)
        h = 12;
    else if (h > 12)
        h -= 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
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
function calculateArrivalStatus(checkInTimeStr, monthlyLateAllowancesUsedAlready = 0) {
    const checkInMin = timeStringToMinutes(checkInTimeStr);
    const openingMin = timeStringToMinutes(exports.settings.office.openingTime); // 10:00 -> 600
    const bufferLimitMin = openingMin + exports.settings.office.openingBufferMinutes; // 10:20 -> 620
    const maxLateMin = timeStringToMinutes(exports.settings.latePolicy.maximumLateArrivalTime); // 10:45 -> 645
    const maxAllowances = exports.settings.latePolicy.monthlyAllowance; // 3
    // Standard closing: 19:00 (1140 min). Buffer closing: 19:30 (1170 min)
    const standardClosingMin = timeStringToMinutes(exports.settings.office.closingTime); // 19:00 -> 1140
    const adjustedClosingMin = standardClosingMin + exports.settings.office.closingBufferMinutes; // 19:30 -> 1170
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
        }
        else {
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
    // 4. Arrived after 2:30 PM (870 min) -> Strictly marked ABSENT (Punch-in is closed)
    if (checkInMin > 870) {
        return {
            status: 'ABSENT',
            statusLabel: 'Absent (Punch Closed after 2:30 PM)',
            isLate: true,
            isHalfDay: false,
            halfDayReason: `Arrival at ${minutesTo12H(checkInMin)} was after 02:30 PM. Punch-in closed and marked absent.`,
            expectedCheckOutMinutes: adjustedClosingMin,
            expectedCheckOutTime12H: minutesTo12H(adjustedClosingMin),
            expectedCheckOutTime24H: minutesTo24H(adjustedClosingMin),
            minutesLate: checkInMin - maxLateMin,
        };
    }
    // 5. Arrived after 10:45 AM up to 2:30 PM -> Half-day case (First half cutoff: 2:00 PM)
    const isSecondHalfArrival = checkInMin > 840; // after 2:00 PM
    return {
        status: 'HALF_DAY',
        statusLabel: isSecondHalfArrival ? 'Half Day (Second Half Arrival)' : 'Half Day (After 10:45 AM Cutoff)',
        isLate: true,
        isHalfDay: true,
        halfDayReason: isSecondHalfArrival
            ? `Arrival at ${minutesTo12H(checkInMin)} during second half window (2:00 PM – 2:30 PM).`
            : `Arrival at ${minutesTo12H(checkInMin)} was beyond the maximum 10:45 AM cutoff.`,
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
function calculateWorkingHours(checkInTimeStr, checkOutTimeStr, lunchDurationMinutes = exports.settings.office.lunchDurationMinutes) {
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
function calculateOvertime(checkOutTimeStr, expectedCheckOutTimeStr) {
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
function calculateRemainingWorkingTime(currentTimeMinutes, expectedCheckOutMinutes) {
    const remaining = Math.max(0, expectedCheckOutMinutes - currentTimeMinutes);
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return {
        remainingMinutes: remaining,
        formattedRemaining: remaining > 0 ? `${hours}h ${minutes}m remaining` : 'Shift Completed',
        isShiftComplete: remaining === 0,
    };
}
