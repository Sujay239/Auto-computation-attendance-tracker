import { HolidayItem } from '../types/company';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';

const DEFAULT_HOLIDAYS: HolidayItem[] = [];

class HolidayService {
  private holidays: HolidayItem[] = [...DEFAULT_HOLIDAYS];

  constructor() {
    this.holidays = [...DEFAULT_HOLIDAYS];
  }

  getHolidays(): HolidayItem[] {
    return [...this.holidays]
      .filter((h) => h && h.name)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  getHolidayByDate(dateStr?: string): HolidayItem | undefined {
    if (!dateStr) return undefined;
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return this.holidays.find((h) => h && (h.date === cleanDate || (h.date && h.date.startsWith(cleanDate))));
  }

  isHoliday(dateStr?: string): boolean {
    if (!dateStr) return false;
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return this.holidays.some((h) => h && (h.date === cleanDate || (h.date && h.date.startsWith(cleanDate))));
  }

  getUpcomingHolidays(referenceDate?: string): HolidayItem[] {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    return this.getHolidays().filter((h) => h && h.date && h.date >= today);
  }

  getNextHoliday(referenceDate?: string): {
    holiday: HolidayItem | undefined;
    daysRemaining: number;
    isToday: boolean;
  } {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    const upcoming = this.getUpcomingHolidays(today);
    const next = upcoming[0];

    if (!next || !next.date) {
      return { holiday: undefined, daysRemaining: 0, isToday: false };
    }

    const tDate = new Date(today);
    const cleanNextDate = next.date.includes('T') ? next.date.split('T')[0] : next.date;
    const hDate = new Date(cleanNextDate);
    const diffTime = hDate.getTime() - tDate.getTime();
    const daysRemaining = isNaN(diffTime) ? 0 : Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      holiday: next,
      daysRemaining,
      isToday: cleanNextDate === today,
    };
  }

  /**
   * Fetch live company holidays from n8n backend using JWT Bearer token
   */
  async fetchRealtimeHolidays(): Promise<{
    success: boolean;
    holidays?: HolidayItem[];
    upcomingHolidays?: HolidayItem[];
    nextHoliday?: { holiday: HolidayItem | undefined; daysRemaining: number; isToday: boolean };
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return {
        success: true,
        holidays: this.getHolidays(),
        upcomingHolidays: this.getUpcomingHolidays(),
        nextHoliday: this.getNextHoliday(),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOLIDAYS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'LIST' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Server error HTTP ${response.status}`,
          holidays: this.getHolidays(),
          upcomingHolidays: this.getUpcomingHolidays(),
          nextHoliday: this.getNextHoliday(),
        };
      }

      const res = await response.json();
      if (res.success && Array.isArray(res.holidays) && res.holidays.length > 0) {
        // Normalize date format on all received holiday objects
        this.holidays = res.holidays
          .filter((h: any) => h && h.name && (h.date || h.holiday_date))
          .map((h: any) => ({
            ...h,
            date: String(h.date || h.holiday_date || '').split('T')[0],
          }));

        return {
          success: true,
          holidays: this.getHolidays(),
          upcomingHolidays: this.getUpcomingHolidays(),
          nextHoliday: this.getNextHoliday(),
        };
      }

      return {
        success: true,
        holidays: this.getHolidays(),
        upcomingHolidays: this.getUpcomingHolidays(),
        nextHoliday: this.getNextHoliday(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: true,
        holidays: this.getHolidays(),
        upcomingHolidays: this.getUpcomingHolidays(),
        nextHoliday: this.getNextHoliday(),
        error: err.name === 'AbortError' ? 'Holidays fetch timed out' : err.message,
      };
    }
  }

  getMonthHolidays(monthStr?: string): HolidayItem[] {
    if (!monthStr) return [];
    return this.holidays.filter((h) => h && h.date && h.date.startsWith(monthStr));
  }

  /**
   * Determines whether a given calendar date is an official working day for office shifts.
   * Returns false if the day is an official company holiday or a weekend (Sunday).
   */
  isOfficeWorkingDay(dateStr?: string): boolean {
    if (!dateStr) return true;
    // 1. Check if it's an official closed company holiday
    const hol = this.getHolidayByDate(dateStr);
    if (hol && hol.isOfficeClosed !== false) {
      return false;
    }

    // 2. Check if it's Sunday (weekly off) - Mon-Sat are office working days (6 days out of 7)
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [yStr, mStr, dStr] = cleanDate.split('-');
    if (!yStr || !mStr || !dStr) return true;
    const dayOfWeek = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10)).getDay();
    if (dayOfWeek === 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the exact number of valid office working days in a given month (YYYY-MM),
   * rigorously excluding Sundays and closed company holidays.
   * Mon - Sat are valid working days (6 days out of 7 of a week).
   */
  getValidOfficeDaysInMonth(monthStr?: string): {
    totalDays: number;
    sundaysCount: number;
    holidaysCount: number;
    validWorkingDays: number;
  } {
    const targetMonth = monthStr && monthStr.includes('-') ? monthStr : new Date().toISOString().substring(0, 7);
    const [yearStr, mStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10);

    const totalDays = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    let holidaysCount = 0;
    let validWorkingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${yearStr}-${mStr.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isSun = new Date(year, month - 1, day).getDay() === 0;
      const hol = this.getHolidayByDate(dateStr);
      const isClosedHol = !!(hol && hol.isOfficeClosed !== false);

      if (isClosedHol) {
        holidaysCount++;
      } else if (isSun) {
        sundaysCount++;
      } else {
        validWorkingDays++;
      }
    }

    return {
      totalDays,
      sundaysCount,
      holidaysCount,
      validWorkingDays,
    };
  }
}

export const holidayService = new HolidayService();
