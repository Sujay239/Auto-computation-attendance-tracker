import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';
import { leaveService } from './leaveService';
import {
  AdminDashboardStats,
  AdminEmployeeItem,
  AdminEmployeeFormInput,
  AdminEmployeeUpdateInput,
  AdminLeaveApprovalItem,
  AdminOvertimeApprovalItem,
  HolidayItem,
  NewHolidayInput,
} from '../types/admin';

class AdminService {
  /**
   * Fetch overview stats & live attendance stream for Admin Dashboard
   */
  async getDashboardOverview(): Promise<{ success: boolean; data?: AdminDashboardStats; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin authentication token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_DASHBOARD}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ token }),
      });

      const res = await response.json();
      if (response.ok && (res.success || res.stats)) {
        return { success: true, data: res.stats || res.data };
      }
      return { success: false, error: res.error || 'Failed to load admin dashboard.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to reach backend.' };
    }
  }

  /**
   * Fetch all employees directory
   */
  async getEmployeesList(): Promise<{ success: boolean; employees?: AdminEmployeeItem[]; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_EMPLOYEES}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          action: 'LIST',
          token,
        }),
      });

      const res = await response.json();
      if (response.ok && (res.success || Array.isArray(res.employees))) {
        return { success: true, employees: res.employees || [] };
      }
      return { success: false, error: res.error || 'Failed to load employee list.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to reach server.' };
    }
  }

  /**
   * Create a new employee with full details, initial salary, and leave entitlements
   * Uses dedicated /employee-create webhook workflow
   */
  async createEmployee(
    data: AdminEmployeeFormInput
  ): Promise<{ success: boolean; employee?: AdminEmployeeItem; rawPassword?: string; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPLOYEE_CREATE}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          personalEmail: data.personalEmail ? data.personalEmail.trim().toLowerCase() : undefined,
          phone: data.phone.trim(),
          designation: data.designation.trim(),
          salary: data.salary || 0,
          joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
          employmentType: data.employmentType || 'Full-time',
          workLocation: data.workLocation || 'Chinar Park, Teghoria, Kolkata (In-Office)',
          role: data.role || 'EMPLOYEE',
          customId: data.customId ? data.customId.trim() : undefined,
          password: data.password ? data.password.trim() : undefined,
          token,
        }),
      });

      const res = await response.json();
      if ((response.ok || response.status === 201) && res.success) {
        return {
          success: true,
          employee: res.employee,
          rawPassword: res.credentials?.temporaryPassword || res.rawPassword,
        };
      }
      return { success: false, error: res.error || res.message || 'Failed to create employee.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating employee.' };
    }
  }

  /**
   * Update an existing employee
   */
  async updateEmployee(
    id: string,
    data: AdminEmployeeUpdateInput
  ): Promise<{ success: boolean; employee?: AdminEmployeeItem; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_EMPLOYEES}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          action: 'UPDATE',
          employeeId: id,
          token,
          ...data,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        return { success: true, employee: res.employee };
      }
      return { success: false, error: res.error || 'Failed to update employee.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating employee.' };
    }
  }

  /**
   * Fetch all leave applications across the organization for Admin review
   */
  async getAllLeaveRequests(
    statusFilter: string = 'PENDING'
  ): Promise<{
    success: boolean;
    requests?: AdminLeaveApprovalItem[];
    pendingCount?: number;
    approvedCount?: number;
    rejectedCount?: number;
    totalRequests?: number;
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEAVE_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          all: true,
          targetEmployeeId: 'ALL',
          status: statusFilter || 'ALL',
          statusFilter: statusFilter || 'ALL',
        }),
      });

      const res = await response.json();
      if (response.ok && (res.success || Array.isArray(res.requests))) {
        return {
          success: true,
          requests: res.requests || [],
          pendingCount: res.pendingCount,
          approvedCount: res.approvedCount,
          rejectedCount: res.rejectedCount,
          totalRequests: res.totalRequests,
        };
      }
      return { success: false, error: res.error || 'Failed to load leave requests.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching leaves.' };
    }
  }

  /**
   * Admin approves or rejects an employee's leave request
   */
  async reviewLeaveRequest(
    requestId: string,
    action: 'APPROVE' | 'REJECT' | 'PENDING' | 'RESET',
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    const defaultComment =
      action === 'APPROVE'
        ? 'Approved by Admin'
        : action === 'REJECT'
        ? 'Rejected by Admin'
        : 'Reopened by Admin';

    const token = authService.getToken();
    if (!token) {
      // Local / Offline fallback execution
      const localRes = leaveService.reviewLeaveRequest(
        requestId,
        action === 'PENDING' ? 'RESET' : action,
        comment || defaultComment
      );
      return localRes;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEAVE_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          action,
          requestId,
          comment: comment || defaultComment,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        // Also reflect immediately in local calculation engine & state
        leaveService.reviewLeaveRequest(
          requestId,
          action === 'PENDING' ? 'RESET' : action,
          comment || defaultComment
        );
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to process leave decision.' };
    } catch (err: any) {
      // Offline fallback
      const localRes = leaveService.reviewLeaveRequest(
        requestId,
        action === 'PENDING' ? 'RESET' : action,
        comment || defaultComment
      );
      return localRes.success ? { success: true } : { success: false, error: err.message || 'Network error submitting leave decision.' };
    }
  }

  /**
   * Fetch all overtime records across organization for Admin review
   */
  async getAllOvertimeRequests(
    statusFilter: string = 'ALL'
  ): Promise<{ success: boolean; records?: AdminOvertimeApprovalItem[]; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OVERTIME_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          action: 'ADMIN_LIST',
          statusFilter,
        }),
      });

      const res = await response.json();
      if (response.ok && (res.success || Array.isArray(res.records))) {
        return { success: true, records: res.records || [] };
      }
      return { success: false, error: res.error || 'Failed to load overtime records.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching overtime.' };
    }
  }

  /**
   * Admin approves or rejects an employee's overtime record
   */
  async reviewOvertimeRequest(
    overtimeId: string,
    action: 'APPROVE' | 'REJECT',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OVERTIME_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          action,
          overtimeId,
          notes: notes || (action === 'APPROVE' ? 'Approved by Admin for early-leave compensation.' : 'Rejected by Admin.'),
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to process overtime decision.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error submitting overtime decision.' };
    }
  }

  /**
   * Fetch company holidays list
   */
  async getHolidays(): Promise<{ success: boolean; holidays?: HolidayItem[]; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOLIDAYS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ token, action: 'LIST' }),
      });

      const res = await response.json();
      if (response.ok && (res.success || Array.isArray(res.holidays))) {
        return { success: true, holidays: res.holidays || [] };
      }
      return { success: false, error: res.error || 'Failed to load holidays.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching holidays.' };
    }
  }

  /**
   * Admin adds a new holiday
   */
  async addHoliday(data: NewHolidayInput): Promise<{ success: boolean; holiday?: HolidayItem; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOLIDAYS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          action: 'ADD',
          ...data,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        return { success: true, holiday: res.holiday };
      }
      return { success: false, error: res.error || 'Failed to add holiday.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error adding holiday.' };
    }
  }

  /**
   * Admin deletes a holiday
   */
  async deleteHoliday(id: string): Promise<{ success: boolean; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HOLIDAYS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          token,
          action: 'DELETE',
          holidayId: id,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to delete holiday.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error deleting holiday.' };
    }
  }
}

export const adminService = new AdminService();

