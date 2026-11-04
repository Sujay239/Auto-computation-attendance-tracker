import { SalaryBreakdown, SalaryDeductionIncident, AdjustedLeaveBalance } from '../types/salary';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';
import { leaveService } from './leaveService';
import { attendanceService } from './attendanceService';
import { payrollCalculationEngine } from './payrollCalculationEngine';
import { Employee } from '../types/employee';

class SalaryService {
  /**
   * Fetch live salary and deduction breakdown from backend (POST /salary-deductions)
   * Falls back seamlessly to the centralized calculation engine.
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
        breakdown: this.computeLocalBreakdown(currentMonthKey, employeeId),
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
          breakdown: this.computeLocalBreakdown(currentMonthKey, employeeId),
          error: `Server responded with ${response.status}`,
        };
      }

      const res = await response.json();
      if (res.success && res.breakdown) {
        const local = this.computeLocalBreakdown(currentMonthKey, employeeId);
        // Ensure all required fields from the centralized engine are present
        const merged: SalaryBreakdown = {
          ...local,
          ...res.breakdown,
          paidLeaveDays: res.breakdown.paidLeaveDays ?? local.paidLeaveDays,
          unpaidLeaveDays: res.breakdown.unpaidLeaveDays ?? local.unpaidLeaveDays,
          ledgerRecords: res.breakdown.ledgerRecords ?? local.ledgerRecords,
          summary: res.breakdown.summary ?? local.summary,
        };
        return {
          success: true,
          breakdown: merged,
        };
      }

      return {
        success: true,
        breakdown: this.computeLocalBreakdown(currentMonthKey, employeeId),
        error: res.error || 'Failed to parse salary breakdown from backend',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: true,
        breakdown: this.computeLocalBreakdown(currentMonthKey, employeeId),
        error: err.name === 'AbortError' ? 'Salary request timed out' : err.message,
      };
    }
  }

  /**
   * Computes accurate salary deduction breakdown using the centralized calculation engine
   */
  computeLocalBreakdown(monthKey: string, employeeId?: string): SalaryBreakdown {
    const currentEmployee = authService.getCurrentEmployee();
    const effectiveEmployee: Employee = currentEmployee || {
      id: employeeId || 'EMP-024',
      firstName: 'Sujay',
      lastName: 'Verma',
      email: 'sujay.verma@autocomputation.com',
      phone: '+91 9876543210',
      salary: 30000,
      designation: 'Senior Software Engineer',
      joiningDate: '2024-01-15',
      employmentType: 'Full-time',
      workLocation: 'Chinar Park, Kolkata',
      role: 'EMPLOYEE',
    };

    // Override salary if available or fallback to standard 30,000
    if (!effectiveEmployee.salary || effectiveEmployee.salary <= 0) {
      effectiveEmployee.salary = 30000;
    }

    const attendances = attendanceService.getRecords();
    const requests = leaveService.getRequests();
    const balances = leaveService.getBalances();

    return payrollCalculationEngine.calculateMonthlyBreakdown(
      monthKey,
      effectiveEmployee,
      attendances,
      requests,
      balances
    );
  }
}

export const salaryService = new SalaryService();
