import { SalaryBreakdown, SalaryDeductionIncident, AdjustedLeaveBalance } from '../types/salary';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';
import { leaveService } from './leaveService';

class SalaryService {
  /**
   * Fetch live salary and deduction breakdown from backend (POST /salary-deductions)
   */
  async fetchSalaryBreakdown(
    monthKey?: string,
    employeeId?: string
  ): Promise<{
    success: boolean;
    breakdown?: SalaryBreakdown;
    error?: string;
  }> {
    const currentMonthKey = monthKey || new Date().toISOString().substring(0, 7);
    const token = authService.getToken();

    if (!token) {
      return {
        success: true,
        breakdown: this.computeLocalBreakdown(currentMonthKey),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SALARY_DEDUCTIONS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          month: currentMonthKey,
          employeeId: employeeId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: true,
          breakdown: this.computeLocalBreakdown(currentMonthKey),
          error: `Server responded with ${response.status}`,
        };
      }

      const res = await response.json();
      if (res.success && res.breakdown) {
        return {
          success: true,
          breakdown: res.breakdown,
        };
      }

      return {
        success: true,
        breakdown: this.computeLocalBreakdown(currentMonthKey),
        error: res.error || 'Failed to parse salary breakdown from backend',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: true,
        breakdown: this.computeLocalBreakdown(currentMonthKey),
        error: err.name === 'AbortError' ? 'Salary request timed out' : err.message,
      };
    }
  }

  /**
   * Computes clean local salary deduction breakdown adhering to the exact business rules
   * when offline or waiting for n8n server.
   */
  computeLocalBreakdown(monthKey: string): SalaryBreakdown {
    const employee = authService.getCurrentEmployee();
    const rawSalary = Number(employee?.salary);

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || new Date().getMonth() + 1;

    // Total days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Exact rules:
    // 1. Daily salary = floor(salary / daysInMonth)
    // 2. Half day salary = floor(dailySalary / 2)
    // 3. Full day deduction = 2 * halfDaySalary
    const dailySalary = Math.floor(rawSalary / daysInMonth);
    const halfDaySalary = Math.floor(dailySalary / 2);
    const fullDayDeductionRate = 2 * halfDaySalary;

    // Working days count
    let totalWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      if (dayOfWeek !== 0) {
        // Mon-Sat are office working days
        totalWorkingDays++;
      }
    }

    // Get current available leave balances
    const leaveBalances = leaveService.getBalances();
    const casualBalance = leaveBalances.find((b) => b.type === 'CASUAL');
    const sickBalance = leaveBalances.find((b) => b.type === 'SICK');

    let availableCasual = casualBalance ? casualBalance.available : 12.0;
    let availableSick = sickBalance ? Math.min(sickBalance.available, 5.0) : 5.0;

    let initialCasual = availableCasual;
    let initialSick = availableSick;

    const incidents: SalaryDeductionIncident[] = [];
    let halfDaysAdjustedCount = 0;
    let halfDaysDeductedCount = 0;
    let fullDaysAdjustedCount = 0;
    let fullDaysDeductedCount = 0;
    let totalLeaveDaysConsumed = 0;
    let totalDeductionAmount = 0;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = `${monthNames[month - 1]} ${year}`;

    const adjustedLeaveBalances: AdjustedLeaveBalance[] = [
      {
        type: 'CASUAL',
        label: 'Casual Leave',
        initialAvailable: initialCasual,
        usedForSalaryAdjustment: initialCasual - availableCasual,
        currentAvailable: availableCasual,
      },
      {
        type: 'SICK',
        label: 'Sick Leave',
        initialAvailable: initialSick,
        usedForSalaryAdjustment: 0,
        currentAvailable: availableSick,
      },
    ];

    const projectedNetSalary = Math.max(0, rawSalary - totalDeductionAmount);

    return {
      monthKey,
      monthName,
      daysInMonth,
      monthlySalary: rawSalary,
      dailySalary,
      halfDaySalary,
      fullDayDeductionRate,
      totalDeductionAmount,
      projectedNetSalary,
      totalWorkingDays,
      totalIncidents: incidents.length,
      halfDaysAdjustedCount,
      halfDaysDeductedCount,
      fullDaysAdjustedCount,
      fullDaysDeductedCount,
      totalLeaveDaysConsumed,
      incidents,
      leaveBalances: adjustedLeaveBalances,
    };
  }
}

export const salaryService = new SalaryService();

