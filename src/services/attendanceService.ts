import attendanceData from '../data/attendance.json';
import { AttendanceRecord, MonthlyAttendanceSummary, PunchRecord } from '../types/attendance';
import { holidayService } from './holidayService';
import {
  calculateArrivalStatus,
  calculateWorkingHours,
  calculateOvertime,
  minutesTo12H,
  timeStringToMinutes,
  settings,
} from '../utils/attendanceCalculator';

class AttendanceService {
  private records: AttendanceRecord[] = [];

  constructor() {
    this.records = [...(attendanceData.records as AttendanceRecord[])];
  }

  getRecords(): AttendanceRecord[] {
    return [...this.records];
  }

  getTodayRecord(dateStr?: string): AttendanceRecord | undefined {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    return this.records.find((r) => r.date === targetDate);
  }

  getMonthlyLateCount(monthStr: string): number {
    return this.records.filter((r) => {
      if (!r.date.startsWith(monthStr)) return false;
      return r.status === 'LATE' || (r.status === 'HALF_DAY' && r.lateAllowanceUsed);
    }).length;
  }

  punchIn(employeeId: string, customTimeStr?: string): { success: boolean; record?: AttendanceRecord; error?: string } {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const existing = this.getTodayRecord(todayStr);

    if (existing && existing.checkIn) {
      return { success: false, error: 'You have already checked in today.' };
    }

    const timeStr = customTimeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentMonth = todayStr.substring(0, 7);
    const monthlyLateUsed = this.getMonthlyLateCount(currentMonth);

    const arrival = calculateArrivalStatus(timeStr, monthlyLateUsed);

    const punch: PunchRecord = {
      id: `p-${Date.now()}`,
      type: 'IN',
      timestamp: now.toISOString(),
      timeString: timeStr,
      location: 'Office Biometric / Mobile App',
      note: arrival.statusLabel,
    };

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `att-${todayStr}`,
      employeeId,
      date: todayStr,
      checkIn: timeStr,
      checkOut: undefined,
      checkInISO: now.toISOString(),
      status: arrival.status,
      statusLabel: arrival.statusLabel,
      totalDurationMinutes: 0,
      workDurationMinutes: 0,
      lunchDurationMinutes: 0,
      expectedCheckOutTime: arrival.expectedCheckOutTime24H,
      lateAllowanceUsed: arrival.lateAllowanceUsed,
      isHalfDayCase: arrival.isHalfDay,
      halfDayReason: arrival.halfDayReason,
      punches: existing ? [...existing.punches, punch] : [punch],
      notes: arrival.isLate ? `Late arrival: ${arrival.statusLabel}` : 'Shift started',
    };

    if (existing) {
      const idx = this.records.findIndex((r) => r.id === existing.id);
      this.records[idx] = newRecord;
    } else {
      this.records.unshift(newRecord);
    }

    return { success: true, record: newRecord };
  }

  punchOut(employeeId: string, customTimeStr?: string): { success: boolean; record?: AttendanceRecord; error?: string } {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const existing = this.getTodayRecord(todayStr);

    if (!existing || !existing.checkIn) {
      return { success: false, error: 'Cannot check out without checking in first.' };
    }

    if (existing.checkOut) {
      return { success: false, error: 'You have already checked out for today.' };
    }

    const timeStr = customTimeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const punch: PunchRecord = {
      id: `p-${Date.now()}`,
      type: 'OUT',
      timestamp: now.toISOString(),
      timeString: timeStr,
      location: 'Office Exit / Mobile App',
      note: 'Shift ended',
    };

    const work = calculateWorkingHours(existing.checkIn, timeStr);
    const overtime = calculateOvertime(timeStr, existing.expectedCheckOutTime);

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOut: timeStr,
      checkOutISO: now.toISOString(),
      totalDurationMinutes: work.grossDurationMinutes,
      workDurationMinutes: work.netWorkDurationMinutes,
      lunchDurationMinutes: work.lunchDurationMinutes,
      overtimeMinutes: overtime.overtimeMinutes > 0 ? overtime.overtimeMinutes : undefined,
      punches: [...existing.punches, punch],
    };

    const idx = this.records.findIndex((r) => r.id === existing.id);
    this.records[idx] = updatedRecord;

    return { success: true, record: updatedRecord };
  }

  getMonthlySummary(monthPrefix?: string): MonthlyAttendanceSummary {
    const month = monthPrefix || new Date().toISOString().substring(0, 7);
    const monthlyRecords = this.records.filter((r) => r.date.startsWith(month));

    // Calculate actual valid working days strictly excluding holidays and weekly offs
    const validDaysInfo = holidayService.getValidOfficeDaysInMonth(month);
    const totalWorkingDays = validDaysInfo.validWorkingDays;

    let presentDays = 0;
    let onTimeDays = 0;
    let withinBufferDays = 0;
    let lateDays = 0;
    let lateAllowancesUsed = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let holidays = validDaysInfo.holidaysCount;
    let totalWorkMinutes = 0;

    monthlyRecords.forEach((r) => {
      totalWorkMinutes += r.workDurationMinutes || 0;
      switch (r.status) {
        case 'ON_TIME':
        case 'PRESENT':
          presentDays++;
          onTimeDays++;
          break;
        case 'WITHIN_BUFFER':
          presentDays++;
          withinBufferDays++;
          break;
        case 'LATE':
          presentDays++;
          lateDays++;
          lateAllowancesUsed++;
          break;
        case 'HALF_DAY':
          halfDays++;
          if (r.lateAllowanceUsed) lateAllowancesUsed++;
          break;
        case 'ABSENT':
          absentDays++;
          break;
        case 'LEAVE':
          leaveDays++;
          break;
        case 'HOLIDAY':
          holidays++;
          break;
      }
    });

    const maxAllowances = settings.latePolicy.monthlyAllowance;
    const lateAllowancesRemaining = Math.max(0, maxAllowances - lateAllowancesUsed);
    const totalWorkHours = Number((totalWorkMinutes / 60).toFixed(1));
    const averageHoursPerDay =
      presentDays + halfDays > 0
        ? Number((totalWorkHours / (presentDays + halfDays)).toFixed(1))
        : 0;

    return {
      month,
      totalWorkingDays,
      presentDays,
      onTimeDays,
      withinBufferDays,
      lateDays,
      lateAllowancesUsed,
      lateAllowancesRemaining,
      halfDays,
      absentDays,
      leaveDays,
      holidays,
      totalWorkHours,
      averageHoursPerDay,
    };
  }
}

export const attendanceService = new AttendanceService();

