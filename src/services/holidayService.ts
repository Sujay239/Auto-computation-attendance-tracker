import holidaysData from '../data/holidays.json';
import { HolidayItem } from '../types/company';

class HolidayService {
  private holidays: HolidayItem[] = [];

  constructor() {
    this.holidays = [...(holidaysData as HolidayItem[])];
  }

  getHolidays(): HolidayItem[] {
    return [...this.holidays].sort((a, b) => a.date.localeCompare(b.date));
  }

  getHolidayByDate(dateStr: string): HolidayItem | undefined {
    return this.holidays.find((h) => h.date === dateStr);
  }

  isHoliday(dateStr: string): boolean {
    return this.holidays.some((h) => h.date === dateStr);
  }

  getUpcomingHolidays(referenceDate?: string): HolidayItem[] {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    return this.getHolidays().filter((h) => h.date >= today);
  }

  getNextHoliday(referenceDate?: string): {
    holiday: HolidayItem | undefined;
    daysRemaining: number;
    isToday: boolean;
  } {
    const today = referenceDate || new Date().toISOString().split('T')[0];
    const upcoming = this.getUpcomingHolidays(today);
    const next = upcoming[0];

    if (!next) {
      return { holiday: undefined, daysRemaining: 0, isToday: false };
    }

    const tDate = new Date(today);
    const hDate = new Date(next.date);
    const diffTime = hDate.getTime() - tDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      holiday: next,
      daysRemaining,
      isToday: next.date === today,
    };
  }

  getMonthHolidays(monthStr: string): HolidayItem[] {
    return this.holidays.filter((h) => h.date.startsWith(monthStr));
  }

  /**
   * Determines whether a given calendar date is an official working day for office shifts.
   * Returns false if the day is an official company holiday or a weekend (Sunday).
   */
  isOfficeWorkingDay(dateStr: string): boolean {
    // 1. Check if it's an official company holiday
    if (this.isHoliday(dateStr)) {
      return false;
    }

    // 2. Check if it's Sunday (standard weekly off)
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the exact number of valid office working days in a given month (YYYY-MM),
   * rigorously excluding Sundays and all official company holidays so system metrics
   * do not penalize employees on non-working days.
   */
  getValidOfficeDaysInMonth(monthStr: string): {
    totalDays: number;
    sundaysCount: number;
    holidaysCount: number;
    validWorkingDays: number;
  } {
    const [yearStr, mStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10);

    const totalDays = new Date(year, month, 0).getDate();
    let sundaysCount = 0;
    let holidaysCount = 0;
    let validWorkingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${yearStr}-${mStr.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isSun = new Date(dateStr).getDay() === 0;
      const isHol = this.isHoliday(dateStr);

      if (isHol) {
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

