import { AttendanceRecord, MonthlyAttendanceSummary, PunchRecord } from '../types/attendance';
import { holidayService } from './holidayService';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';
import { leaveService } from './leaveService';
import { overtimeService } from './overtimeService';
import { notificationService } from './notificationService';
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
  private liveSummary: MonthlyAttendanceSummary | null = null;
  private liveTodayRecord: AttendanceRecord | null = null;

  constructor() {
    this.records = [];
  }

  /**
   * Fetch real-time dashboard data from n8n backend using JWT Bearer token
   */
  async fetchRealtimeDashboard(employeeId?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: No active JWT token found.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DASHBOARD_EMPLOYEE}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ employeeId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resJson = await response.json().catch(() => null);

      if (response.ok && resJson && resJson.success) {
        // Cache live data for immediate screen rendering
        if (resJson.todayAttendance) {
          const t = resJson.todayAttendance;
          this.liveTodayRecord = {
            id: t.id || `att-${t.date}`,
            employeeId: resJson.employee?.id || employeeId || '',
            date: t.date,
            checkIn: t.checkIn || undefined,
            checkOut: t.checkOut || undefined,
            status: t.status || 'PENDING',
            statusLabel: t.statusLabel || (t.checkIn ? 'Checked In' : 'Awaiting Punch'),
            expectedCheckOutTime: t.expectedCheckOutTime,
            workDurationMinutes: t.workDurationMinutes || 0,
            totalDurationMinutes: t.totalDurationMinutes || 0,
            lunchDurationMinutes: t.lunchDurationMinutes || 60,
            lateAllowanceUsed: t.lateAllowanceUsed,
            isHalfDayCase: t.isHalfDayCase,
            punches: [],
            notes: t.notes,
          };

          const existingIdx = this.records.findIndex((r) => r.date === t.date);
          if (existingIdx >= 0) {
            this.records[existingIdx] = this.liveTodayRecord;
          } else {
            this.records.unshift(this.liveTodayRecord);
          }
        }

        if (resJson.monthlySummary) {
          const m = resJson.monthlySummary;
          this.liveSummary = {
            month: m.monthKey,
            totalWorkingDays: m.totalWorkingDays,
            presentDays: m.presentDays,
            onTimeDays: m.onTimeDays,
            withinBufferDays: m.withinBufferDays,
            lateDays: m.lateDays,
            lateAllowancesUsed: m.lateAllowancesUsed,
            lateAllowancesRemaining: m.lateAllowancesRemaining,
            halfDays: m.halfDays,
            absentDays: m.absentDays,
            leaveDays: m.leaveDays,
            holidays: m.holidays || 0,
            totalWorkHours: m.totalWorkHours,
            averageHoursPerDay: m.averageHoursPerDay,
          };
        }

        if (resJson.leaves && Array.isArray(resJson.leaves.balances)) {
          leaveService.updateBalancesFromDashboard(resJson.leaves.balances);
        }

        if (resJson.overtime) {
          overtimeService.updateSummaryFromDashboard(resJson.overtime);
        }

        if (typeof resJson.unreadNotificationsCount === 'number') {
          notificationService.setUnreadCount(resJson.unreadNotificationsCount);
        }

        return { success: true, data: resJson };
      }

      return {
        success: false,
        error: resJson?.error || `Server returned error (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Dashboard request timed out.' : 'Failed to reach n8n dashboard endpoint.',
      };
    }
  }

  /**
   * Fetch full monthly attendance data, daily records, punches, and holidays from n8n backend
   */
  async fetchFullAttendanceData(month?: string, employeeId?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: No active JWT token found.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ATTENDANCE_FULL}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ month, employeeId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resJson = await response.json().catch(() => null);

      if (response.ok && resJson && resJson.success) {
        if (Array.isArray(resJson.records)) {
          this.records = resJson.records;
        }

        if (resJson.todayRecord) {
          const t = resJson.todayRecord;
          this.liveTodayRecord = {
            id: t.id || `att-${t.date}`,
            employeeId: resJson.employee?.id || employeeId || '',
            date: t.date,
            checkIn: t.checkIn || undefined,
            checkOut: t.checkOut || undefined,
            status: t.status || 'PENDING',
            statusLabel: t.statusLabel || (t.checkIn ? 'Checked In' : 'Awaiting Punch'),
            expectedCheckOutTime: t.expectedCheckOutTime,
            workDurationMinutes: t.workDurationMinutes || 0,
            totalDurationMinutes: t.totalDurationMinutes || 0,
            lunchDurationMinutes: t.lunchDurationMinutes || 60,
            lateAllowanceUsed: t.lateAllowanceUsed,
            isHalfDayCase: t.isHalfDayCase,
            punches: Array.isArray(t.punches) ? t.punches : [],
            notes: t.notes,
          };
        }

        if (resJson.summary) {
          const m = resJson.summary;
          this.liveSummary = {
            month: m.monthKey,
            totalWorkingDays: m.totalWorkingDays,
            presentDays: m.presentDays,
            onTimeDays: m.onTimeDays,
            withinBufferDays: m.withinBufferDays,
            lateDays: m.lateDays,
            lateAllowancesUsed: m.lateAllowancesUsed,
            lateAllowancesRemaining: m.lateAllowancesRemaining,
            halfDays: m.halfDays,
            absentDays: m.absentDays,
            leaveDays: m.leaveDays,
            holidays: m.holidays || 0,
            totalWorkHours: m.totalWorkHours,
            averageHoursPerDay: m.averageHoursPerDay,
          };
        }

        return { success: true, data: resJson };
      }

      return {
        success: false,
        error: resJson?.error || `Attendance service error (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Attendance request timed out.' : 'Failed to reach attendance endpoint.',
      };
    }
  }

  /**
   * Submit real-time punch (IN or OUT) to n8n backend using JWT authentication
   */
  async punch(params: {
    type: 'IN' | 'OUT';
    customTime?: string;
    location?: string;
    notes?: string;
  }): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Authentication token required.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PUNCH}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resJson = await response.json().catch(() => null);

      if (response.ok && resJson && resJson.success && resJson.record) {
        const r = resJson.record;
        const newRecord: AttendanceRecord = {
          id: r.id,
          employeeId: r.employeeId,
          date: r.date,
          checkIn: r.checkIn || undefined,
          checkOut: r.checkOut || undefined,
          status: r.status,
          statusLabel: r.statusLabel,
          expectedCheckOutTime: r.expectedCheckOutTime,
          workDurationMinutes: r.workDurationMinutes,
          totalDurationMinutes: r.totalDurationMinutes,
          lunchDurationMinutes: r.lunchDurationMinutes,
          lateAllowanceUsed: r.lateAllowanceUsed,
          isHalfDayCase: r.isHalfDayCase,
          punches: Array.isArray(r.punches) ? r.punches : [],
          notes: r.notes,
        };

        this.liveTodayRecord = newRecord;
        const existingIdx = this.records.findIndex((rec) => rec.date === r.date);
        if (existingIdx >= 0) {
          this.records[existingIdx] = newRecord;
        } else {
          this.records.unshift(newRecord);
        }

        return { success: true, record: newRecord };
      }

      return {
        success: false,
        error: resJson?.error || `Punch failed (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Punch timed out.' : 'Failed to reach punch endpoint.',
      };
    }
  }

  getRecords(): AttendanceRecord[] {
    return [...this.records];
  }

  getTodayRecord(dateStr?: string): AttendanceRecord | undefined {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    if (this.liveTodayRecord && this.liveTodayRecord.date === targetDate) {
      return this.liveTodayRecord;
    }
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
    if (this.liveSummary && this.liveSummary.month === month) {
      return this.liveSummary;
    }

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

