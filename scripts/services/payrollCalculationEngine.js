"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollCalculationEngine = exports.PayrollCalculationEngine = void 0;
/**
 * Pure Centralized Leave, Attendance & Salary Deduction Engine
 * Implements strict business rules:
 * - Always consume available leave balance before deducting salary.
 * - Fractional leave balances (0.25, 0.5, 1.0).
 * - Exact month-wise splitting for cross-calendar month leaves.
 * - Traceable, idempotent deduction ledger.
 * - Reversal support when approved leave is cancelled.
 * - Strict check-in blocking on approved full-day leaves.
 */
class PayrollCalculationEngine {
    constructor() {
        this.ledger = [];
        this.ledger = [];
    }
    /**
     * Reset engine state (used for testing or clean reloads)
     */
    resetLedger() {
        this.ledger = [];
    }
    /**
     * Returns all deduction records from the centralized ledger.
     */
    getLedger() {
        return [...this.ledger];
    }
    /**
     * Returns records for a specific employee and optional month
     */
    getEmployeeLedger(employeeId, payrollMonth) {
        return this.ledger.filter((r) => {
            if (r.employeeId !== employeeId)
                return false;
            if (payrollMonth && r.payrollMonth !== payrollMonth)
                return false;
            return true;
        });
    }
    /**
     * Calculate calendar days in any payroll month
     */
    getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }
    /**
     * Calculate standard daily salary rate based on applicable payroll days in month
     */
    calculateDailySalary(monthlySalary, daysInMonth) {
        if (!daysInMonth || daysInMonth <= 0)
            return 0;
        return Math.floor(monthlySalary / daysInMonth);
    }
    /**
     * Calculate half day salary rate
     */
    calculateHalfDaySalary(dailySalary) {
        return Math.floor(dailySalary / 2);
    }
    /**
     * Check if a specific date is Sunday (regular weekly off)
     */
    isSunday(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.getDay() === 0;
    }
    /**
     * Break a date range into working dates (excluding Sundays)
     */
    getWorkingDatesInRange(startDate, endDate) {
        const dates = [];
        const [y1, m1, d1] = startDate.split('-').map(Number);
        const [y2, m2, d2] = endDate.split('-').map(Number);
        const cur = new Date(y1, m1 - 1, d1);
        const end = new Date(y2, m2 - 1, d2);
        while (cur <= end) {
            if (cur.getDay() !== 0) {
                // Exclude Sundays
                const y = cur.getFullYear();
                const m = String(cur.getMonth() + 1).padStart(2, '0');
                const d = String(cur.getDate()).padStart(2, '0');
                dates.push(`${y}-${m}-${d}`);
            }
            cur.setDate(cur.getDate() + 1);
        }
        return dates;
    }
    /**
     * Split working dates by calendar month (YYYY-MM)
     * Section 6: Leave spanning multiple months must be partitioned cleanly.
     */
    splitDatesByMonth(dates) {
        const map = {};
        for (const d of dates) {
            const monthKey = d.substring(0, 7);
            if (!map[monthKey]) {
                map[monthKey] = [];
            }
            map[monthKey].push(d);
        }
        return map;
    }
    /**
     * Core Deduction Calculation Function
     * Section 2, 3, 4: Always consume available leave before deducting salary.
     *
     * @param requiredDays Number of leave days required (e.g. 0.25, 0.5, 1.0, 2.0)
     * @param availableLeave Current available balance for the employee
     * @param dailySalary Daily salary rate for the relevant payroll month
     * @returns Object with leaveDaysDeducted, uncoveredDays, and salaryDeduction
     */
    computeDeductionUnits(requiredDays, availableLeave, dailySalary) {
        const safeAvailable = Math.max(0, availableLeave);
        const leaveDaysDeducted = Math.min(requiredDays, safeAvailable);
        const uncoveredDays = Math.max(0, Number((requiredDays - leaveDaysDeducted).toFixed(2)));
        // Salary deduction formula: (Monthly Salary / Applicable Payroll Days) * Uncovered Leave Days
        // If uncoveredDays is 0.5, exact half-day salary Math.floor(dailySalary / 2) is respected.
        let salaryDeduction = 0;
        if (uncoveredDays > 0) {
            if (uncoveredDays === 0.5) {
                salaryDeduction = Math.floor(dailySalary / 2);
            }
            else {
                salaryDeduction = Math.round(dailySalary * uncoveredDays);
            }
        }
        return {
            leaveDaysDeducted: Number(leaveDaysDeducted.toFixed(2)),
            uncoveredDays,
            salaryDeduction,
        };
    }
    /**
     * Check if a leave request has already been processed in the ledger (Idempotency check)
     */
    isLeaveRequestProcessed(leaveRequestId) {
        return this.ledger.some((r) => r.leaveRequestId === leaveRequestId && r.status === 'PROCESSED');
    }
    /**
     * Check if an attendance record has already been processed for deduction
     */
    isAttendanceDeductionProcessed(recordId) {
        return this.ledger.some((r) => r.id === `ded-att-${recordId}` && r.status === 'PROCESSED');
    }
    /**
     * Section 5: Process an Approved Leave Request.
     * Idempotent: If already processed, does not deduct again.
     * Cross-Month aware: Splits calculations across calendar months.
     * Updates balances, adds ledger entries, and generates attendance records.
     */
    processApprovedLeave(request, employee, balances, existingAttendances = []) {
        if (request.status !== 'APPROVED') {
            return {
                success: false,
                error: 'Only APPROVED leave requests can be processed for deductions.',
                recordsCreated: [],
                attendancesCreated: [],
                updatedBalances: balances,
                totalLeaveDeducted: 0,
                totalSalaryDeducted: 0,
                totalUncoveredDays: 0,
            };
        }
        // Idempotency safeguard: if already processed, do not double-deduct!
        if (this.isLeaveRequestProcessed(request.id)) {
            const existingLedgers = this.ledger.filter((r) => r.leaveRequestId === request.id && r.status === 'PROCESSED');
            return {
                success: true,
                recordsCreated: existingLedgers,
                attendancesCreated: [],
                updatedBalances: balances,
                totalLeaveDeducted: existingLedgers.reduce((acc, r) => acc + r.leaveDaysDeducted, 0),
                totalSalaryDeducted: existingLedgers.reduce((acc, r) => acc + r.salaryDeduction, 0),
                totalUncoveredDays: existingLedgers.reduce((acc, r) => acc + r.uncoveredDays, 0),
            };
        }
        const isHalfDay = request.durationType === 'FIRST_HALF' || request.durationType === 'SECOND_HALF';
        const rawSalary = Number(employee.salary) || 0;
        // 1. Determine affected dates
        let workingDates = [];
        if (isHalfDay) {
            workingDates = [request.startDate];
        }
        else {
            workingDates = this.getWorkingDatesInRange(request.startDate, request.endDate || request.startDate);
            if (workingDates.length === 0) {
                workingDates = [request.startDate];
            }
        }
        // 2. Split dates by calendar month (Section 6)
        const monthGroups = this.splitDatesByMonth(workingDates);
        const sortedMonthKeys = Object.keys(monthGroups).sort();
        const currentBalances = balances.map((b) => ({ ...b }));
        const createdLedgers = [];
        const createdAttendances = [];
        let totalLeaveDeducted = 0;
        let totalSalaryDeducted = 0;
        let totalUncoveredDays = 0;
        // Process month-by-month chronologically
        for (const monthKey of sortedMonthKeys) {
            const datesInMonth = monthGroups[monthKey];
            const [yStr, mStr] = monthKey.split('-');
            const year = parseInt(yStr, 10);
            const month = parseInt(mStr, 10);
            const daysInMonth = this.getDaysInMonth(year, month);
            const dailySalary = this.calculateDailySalary(rawSalary, daysInMonth);
            for (const d of datesInMonth) {
                const requiredDayPortion = isHalfDay ? 0.5 : 1.0;
                // Find primary leave balance matching request type (Casual / Sick)
                let primaryBal = currentBalances.find((b) => b.type === request.leaveType);
                if (!primaryBal) {
                    primaryBal = currentBalances.find((b) => b.available > 0);
                }
                const balanceBefore = primaryBal ? Number(primaryBal.available) || 0 : 0;
                // Consume leave first, salary only for uncovered
                const result = this.computeDeductionUnits(requiredDayPortion, balanceBefore, dailySalary);
                if (primaryBal && result.leaveDaysDeducted > 0) {
                    primaryBal.used = Number((primaryBal.used + result.leaveDaysDeducted).toFixed(2));
                    primaryBal.available = Math.max(0, Number((primaryBal.total - primaryBal.used).toFixed(2)));
                }
                totalLeaveDeducted += result.leaveDaysDeducted;
                totalSalaryDeducted += result.salaryDeduction;
                totalUncoveredDays += result.uncoveredDays;
                // Create Ledger Record
                const ledgerRecord = {
                    id: `ded-${request.id}-${d}`,
                    employeeId: request.employeeId || employee.id,
                    leaveRequestId: request.id,
                    date: d,
                    payrollMonth: monthKey,
                    leaveType: isHalfDay ? 'HALF_DAY' : 'FULL_DAY',
                    requiredLeaveDays: requiredDayPortion,
                    leaveBalanceBefore: balanceBefore,
                    leaveDaysDeducted: result.leaveDaysDeducted,
                    uncoveredDays: result.uncoveredDays,
                    monthlySalary: rawSalary,
                    applicablePayrollDays: daysInMonth,
                    dailySalary,
                    salaryDeduction: result.salaryDeduction,
                    status: 'PROCESSED',
                    createdAt: new Date().toISOString(),
                    reason: `Approved Leave: ${request.reason} (${isHalfDay ? request.durationType : 'Full Day'})`,
                };
                this.ledger.push(ledgerRecord);
                createdLedgers.push(ledgerRecord);
                // Section 5: Attendance Record Requirements
                // "For every approved leave date, create an attendance entry.
                //  - Attendance status: ON_LEAVE
                //  - Check-in: null
                //  - Check-out: null
                //  - Leave type: Full Day or Half Day
                //  - Leave deduction: Record the amount deducted from leave balance
                //  - Salary deduction: Record the uncovered salary deduction
                //  - Leave request reference: Store related request ID"
                const statusLabel = result.leaveDaysDeducted >= requiredDayPortion
                    ? `On Leave (Paid ${result.leaveDaysDeducted}d)`
                    : result.leaveDaysDeducted > 0
                        ? `On Leave (Paid ${result.leaveDaysDeducted}d, Unpaid ${result.uncoveredDays}d)`
                        : `On Leave (Unpaid ${result.uncoveredDays}d, Deducted ₹${result.salaryDeduction})`;
                const attRecord = {
                    id: `att-${d}-${employee.id}`,
                    employeeId: employee.id,
                    date: d,
                    checkIn: undefined,
                    checkOut: undefined,
                    status: 'ON_LEAVE',
                    statusLabel,
                    totalDurationMinutes: 0,
                    workDurationMinutes: 0,
                    lunchDurationMinutes: 0,
                    expectedCheckOutTime: '19:00',
                    punches: [],
                    leaveType: isHalfDay ? request.durationType : 'FULL_DAY',
                    leaveDeduction: result.leaveDaysDeducted,
                    salaryDeduction: result.salaryDeduction,
                    leaveRequestId: request.id,
                    isApprovedLeave: true,
                    isUnapprovedAbsence: false,
                    notes: `Approved ${request.leaveType} Leave (${isHalfDay ? request.durationType : 'Full Day'}). Leave deducted: ${result.leaveDaysDeducted}d, Salary deducted: ₹${result.salaryDeduction}.`,
                };
                createdAttendances.push(attRecord);
            }
        }
        // Attach deduction metadata back to the leave request
        request.leaveDaysDeducted = Number(totalLeaveDeducted.toFixed(2));
        request.unpaidDays = Number(totalUncoveredDays.toFixed(2));
        request.salaryDeduction = totalSalaryDeducted;
        request.deductionRecords = createdLedgers.map((r) => r.id);
        return {
            success: true,
            recordsCreated: createdLedgers,
            attendancesCreated: createdAttendances,
            updatedBalances: currentBalances,
            totalLeaveDeducted,
            totalSalaryDeducted,
            totalUncoveredDays,
        };
    }
    /**
     * Reverse an approved leave request when cancelled or rejected (Section 9)
     */
    reverseApprovedLeave(leaveRequestId, balances) {
        const records = this.ledger.filter((r) => r.leaveRequestId === leaveRequestId && r.status === 'PROCESSED');
        if (records.length === 0) {
            return {
                success: false,
                restoredLeaveDays: 0,
                reversedSalaryDeduction: 0,
                updatedBalances: balances,
            };
        }
        let restoredLeaveDays = 0;
        let reversedSalaryDeduction = 0;
        for (const r of records) {
            r.status = 'REVERSED';
            restoredLeaveDays += r.leaveDaysDeducted;
            reversedSalaryDeduction += r.salaryDeduction;
        }
        const currentBalances = balances.map((b) => ({ ...b }));
        // Restore leave balance
        if (restoredLeaveDays > 0) {
            // Find Casual first or first balance
            const bal = currentBalances.find((b) => b.type === 'CASUAL') || currentBalances[0];
            if (bal) {
                bal.used = Math.max(0, Number((bal.used - restoredLeaveDays).toFixed(2)));
                bal.available = Math.max(0, Number((bal.total - bal.used).toFixed(2)));
            }
        }
        return {
            success: true,
            restoredLeaveDays,
            reversedSalaryDeduction,
            updatedBalances: currentBalances,
        };
    }
    /**
     * Section 3: Process Half-Day Late Arrival or Attendance Incident
     * Evaluates employee's available leave balance.
     * If >= 0.5 available, deducts 0.5 leave.
     * If < 0.5 available, consumes remaining eligible leave and deducts salary for uncovered portion.
     */
    processHalfDayAttendance(attendanceRecord, employee, balances) {
        const rawSalary = Number(employee.salary) || 0;
        const date = attendanceRecord.date;
        const monthKey = date.substring(0, 7);
        const [yStr, mStr] = monthKey.split('-');
        const year = parseInt(yStr, 10);
        const month = parseInt(mStr, 10);
        const daysInMonth = this.getDaysInMonth(year, month);
        const dailySalary = this.calculateDailySalary(rawSalary, daysInMonth);
        // Check if already processed
        const recordId = `ded-att-${attendanceRecord.id || date}`;
        const alreadyProcessed = this.ledger.some((r) => r.id === recordId && r.status === 'PROCESSED');
        if (alreadyProcessed) {
            return {
                attendance: attendanceRecord,
                updatedBalances: balances,
            };
        }
        const currentBalances = balances.map((b) => ({ ...b }));
        const casualBal = currentBalances.find((b) => b.type === 'CASUAL');
        const availableCasual = casualBal ? Number(casualBal.available) || 0 : 0;
        const result = this.computeDeductionUnits(0.5, availableCasual, dailySalary);
        if (casualBal && result.leaveDaysDeducted > 0) {
            casualBal.used = Number((casualBal.used + result.leaveDaysDeducted).toFixed(2));
            casualBal.available = Math.max(0, Number((casualBal.total - casualBal.used).toFixed(2)));
        }
        const ledgerRecord = {
            id: recordId,
            employeeId: employee.id,
            date,
            payrollMonth: monthKey,
            leaveType: 'HALF_DAY',
            requiredLeaveDays: 0.5,
            leaveBalanceBefore: availableCasual,
            leaveDaysDeducted: result.leaveDaysDeducted,
            uncoveredDays: result.uncoveredDays,
            monthlySalary: rawSalary,
            applicablePayrollDays: daysInMonth,
            dailySalary,
            salaryDeduction: result.salaryDeduction,
            status: 'PROCESSED',
            createdAt: new Date().toISOString(),
            reason: attendanceRecord.halfDayReason || 'Late arrival past 10:45 AM / Exceeded 3 allowances',
        };
        this.ledger.push(ledgerRecord);
        const updatedAtt = {
            ...attendanceRecord,
            leaveType: 'HALF_DAY',
            leaveDeduction: result.leaveDaysDeducted,
            salaryDeduction: result.salaryDeduction,
            statusLabel: result.leaveDaysDeducted >= 0.5
                ? 'Half Day (Leave Protected)'
                : result.leaveDaysDeducted > 0
                    ? `Half Day (Partial Leave: ${result.leaveDaysDeducted}d, Unpaid: ${result.uncoveredDays}d)`
                    : `Half Day (Salary Deducted: ₹${result.salaryDeduction})`,
            notes: attendanceRecord.notes ||
                `Half Day deduction: ${result.leaveDaysDeducted}d leave, ₹${result.salaryDeduction} salary.`,
        };
        return {
            attendance: updatedAtt,
            ledgerRecord,
            updatedBalances: currentBalances,
        };
    }
    /**
     * Section 5: Check whether employee is allowed to punch in today
     * - Approved full-day leave: check-in is strictly blocked.
     * - Approved half-day leave: restricted only for the approved half.
     */
    canEmployeeCheckIn(dateStr, timeStr, requests) {
        // Find approved leaves active on this date
        const approvedLeave = requests.find((r) => {
            if (r.status !== 'APPROVED')
                return false;
            const isHalfDay = r.durationType === 'FIRST_HALF' || r.durationType === 'SECOND_HALF';
            if (isHalfDay) {
                return r.startDate === dateStr;
            }
            return dateStr >= r.startDate && dateStr <= (r.endDate || r.startDate);
        });
        if (!approvedLeave) {
            return { allowed: true };
        }
        // 1. Full-Day Leave: strictly blocked from punching in
        if (approvedLeave.durationType === 'FULL_DAY' ||
            (!approvedLeave.durationType && approvedLeave.daysCount >= 1)) {
            return {
                allowed: false,
                reason: `Attendance punch is disabled. You have an approved full-day ${approvedLeave.leaveType} leave scheduled for today (${dateStr}).`,
                isApprovedLeave: true,
                leaveType: 'FULL_DAY',
            };
        }
        // 2. Half-Day Leave: check time period
        // Clean time to minutes
        const cleanTime = (timeStr || '').trim();
        const isPM = /PM$/i.test(cleanTime);
        const rawTime = cleanTime.replace(/\s*(AM|PM)$/i, '').trim();
        const [hStr, mStr] = rawTime.split(':');
        let hours = parseInt(hStr || '0', 10);
        const minutes = parseInt(mStr || '0', 10);
        if (isPM && hours < 12)
            hours += 12;
        const currentMins = hours * 60 + minutes;
        // First half cutoff: 14:00 (2:00 PM / 840 mins)
        if (approvedLeave.durationType === 'FIRST_HALF') {
            if (currentMins < 840) {
                return {
                    allowed: false,
                    reason: `You have an approved First-Half Leave for today. Punch-in is open after 02:00 PM for the second half.`,
                    isApprovedLeave: true,
                    leaveType: 'FIRST_HALF',
                };
            }
        }
        else if (approvedLeave.durationType === 'SECOND_HALF') {
            if (currentMins >= 840) {
                return {
                    allowed: false,
                    reason: `You have an approved Second-Half Leave for today. First-half shift completed at 02:00 PM.`,
                    isApprovedLeave: true,
                    leaveType: 'SECOND_HALF',
                };
            }
        }
        return { allowed: true };
    }
    /**
     * Section 7 & 8C: Calculate Monthly Payroll Summary & Salary Breakdown
     * Provides full traceability and month-specific calculations.
     */
    calculateMonthlyBreakdown(monthKey, employee, attendances, requests, balances) {
        const rawSalary = Number(employee?.salary) || 0;
        const [yStr, mStr] = monthKey.split('-');
        const year = parseInt(yStr, 10) || new Date().getFullYear();
        const month = parseInt(mStr, 10) || new Date().getMonth() + 1;
        const daysInMonth = this.getDaysInMonth(year, month);
        const dailySalary = this.calculateDailySalary(rawSalary, daysInMonth);
        const halfDaySalary = this.calculateHalfDaySalary(dailySalary);
        const fullDayDeductionRate = 2 * halfDaySalary;
        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        const monthName = `${monthNames[month - 1]} ${year}`;
        // Filter active ledger records for this month
        const monthLedgers = this.ledger.filter((r) => r.employeeId === employee.id &&
            r.payrollMonth === monthKey &&
            r.status === 'PROCESSED');
        // Working days count
        let totalWorkingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = new Date(year, month - 1, day).getDay();
            if (dayOfWeek !== 0) {
                totalWorkingDays++;
            }
        }
        // Tally attendance statuses for this month
        const monthAtts = attendances.filter((a) => a.date.startsWith(monthKey));
        let halfDaysAdjustedCount = 0;
        let halfDaysDeductedCount = 0;
        let fullDaysAdjustedCount = 0;
        let fullDaysDeductedCount = 0;
        let totalPaidLeaveDays = 0;
        let totalUnpaidLeaveDays = 0;
        let totalSalaryDeduction = 0;
        const incidents = [];
        // 1. Process from ledger records (Traceable source of truth)
        for (const led of monthLedgers) {
            totalSalaryDeduction += led.salaryDeduction;
            totalPaidLeaveDays += led.leaveDaysDeducted;
            totalUnpaidLeaveDays += led.uncoveredDays;
            if (led.leaveType === 'HALF_DAY') {
                if (led.salaryDeduction === 0) {
                    halfDaysAdjustedCount++;
                }
                else {
                    halfDaysDeductedCount++;
                }
            }
            else {
                if (led.salaryDeduction === 0) {
                    fullDaysAdjustedCount++;
                }
                else {
                    fullDaysDeductedCount++;
                }
            }
            const isAdjusted = led.salaryDeduction === 0;
            const isPartial = led.leaveDaysDeducted > 0 && led.uncoveredDays > 0;
            incidents.push({
                id: `inc-${led.id}`,
                date: led.date,
                incidentType: led.leaveRequestId ? 'APPROVED_LEAVE' : 'LATE_PAST_CUTOFF',
                title: led.leaveRequestId
                    ? `Approved Leave (${led.leaveType === 'HALF_DAY' ? '0.5 Day' : 'Full Day'})`
                    : `Late Arrival / Half Day Penalty`,
                type: led.leaveType,
                penaltyUnits: led.requiredLeaveDays,
                status: isAdjusted
                    ? 'ADJUSTED_WITH_LEAVE'
                    : isPartial
                        ? 'PARTIALLY_ADJUSTED'
                        : 'SALARY_DEDUCTED',
                adjustedLeaveType: led.leaveDaysDeducted > 0 ? 'CASUAL' : null,
                leaveDaysDeducted: led.leaveDaysDeducted,
                uncoveredDays: led.uncoveredDays,
                deductionAmount: led.salaryDeduction,
                description: isAdjusted
                    ? `Fully covered by leave balance (${led.leaveDaysDeducted}d). Zero salary deducted.`
                    : isPartial
                        ? `Partially covered: ${led.leaveDaysDeducted}d leave consumed. Uncovered ${led.uncoveredDays}d deducted from salary.`
                        : `Leave balance was 0. Salary deducted: ₹${led.salaryDeduction.toLocaleString()}.`,
                leaveRequestId: led.leaveRequestId,
            });
        }
        // 2. Scan month attendance for unhandled ABSENT days (unapproved absences)
        for (const att of monthAtts) {
            if (att.status === 'ABSENT' && !att.isApprovedLeave) {
                // If not already in ledger
                const alreadyInLedger = monthLedgers.some((l) => l.date === att.date);
                if (!alreadyInLedger) {
                    fullDaysDeductedCount++;
                    totalUnpaidLeaveDays += 1;
                    totalSalaryDeduction += dailySalary;
                    incidents.push({
                        id: `inc-absent-${att.date}`,
                        date: att.date,
                        incidentType: 'UNAPPROVED_ABSENCE',
                        title: 'Unapproved Absence',
                        type: 'FULL_DAY',
                        penaltyUnits: 1.0,
                        status: 'SALARY_DEDUCTED',
                        adjustedLeaveType: null,
                        leaveDaysDeducted: 0,
                        uncoveredDays: 1,
                        deductionAmount: dailySalary,
                        description: 'Unapproved full-day absence. One day salary deducted.',
                    });
                }
            }
        }
        const projectedNetSalary = Math.max(0, rawSalary - totalSalaryDeduction);
        // Adjusted leave balances summary
        const adjustedBalances = balances.map((b) => ({
            type: b.type,
            label: b.label,
            initialAvailable: b.total,
            usedForSalaryAdjustment: b.used,
            currentAvailable: b.available,
        }));
        const monthlySummary = {
            employeeId: employee.id,
            payrollMonth: monthKey,
            monthlySalary: rawSalary,
            totalPresentDays: monthAtts.filter((a) => ['PRESENT', 'ON_TIME', 'WITHIN_BUFFER', 'LATE'].includes(a.status)).length,
            totalAbsentDays: monthAtts.filter((a) => a.status === 'ABSENT').length,
            totalLeaveDays: monthAtts.filter((a) => ['LEAVE', 'ON_LEAVE'].includes(a.status)).length,
            totalHalfDays: monthAtts.filter((a) => a.status === 'HALF_DAY').length,
            paidLeaveDays: Number(totalPaidLeaveDays.toFixed(2)),
            unpaidLeaveDays: Number(totalUnpaidLeaveDays.toFixed(2)),
            totalLeaveDeduction: Number(totalPaidLeaveDays.toFixed(2)),
            totalSalaryDeduction,
            netSalary: projectedNetSalary,
        };
        return {
            monthKey,
            monthName,
            daysInMonth,
            monthlySalary: rawSalary,
            dailySalary,
            halfDaySalary,
            fullDayDeductionRate,
            totalDeductionAmount: totalSalaryDeduction,
            projectedNetSalary,
            totalWorkingDays,
            totalIncidents: incidents.length,
            halfDaysAdjustedCount,
            halfDaysDeductedCount,
            fullDaysAdjustedCount,
            fullDaysDeductedCount,
            paidLeaveDays: Number(totalPaidLeaveDays.toFixed(2)),
            unpaidLeaveDays: Number(totalUnpaidLeaveDays.toFixed(2)),
            totalLeaveDaysConsumed: Number(totalPaidLeaveDays.toFixed(2)),
            incidents,
            leaveBalances: adjustedBalances,
            ledgerRecords: monthLedgers,
            summary: monthlySummary,
        };
    }
}
exports.PayrollCalculationEngine = PayrollCalculationEngine;
exports.payrollCalculationEngine = new PayrollCalculationEngine();
