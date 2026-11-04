import { LeaveBalance, LeaveRequest, LeaveType, LeaveDurationType } from '../types/leave';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';
import { payrollCalculationEngine } from './payrollCalculationEngine';
import { AttendanceRecord } from '../types/attendance';
import { Employee } from '../types/employee';

export const DEFAULT_LEAVE_BALANCES: LeaveBalance[] = [
  { type: 'CASUAL', label: 'Casual Leave', total: 12, used: 0, available: 12 },
  { type: 'SICK', label: 'Sick Leave', total: 5, used: 0, available: 5 },
];

type AttendanceUpdateListener = (records: AttendanceRecord[]) => void;
type AttendanceReversalListener = (requestId: string) => void;

class LeaveService {
  private balances: LeaveBalance[] = [...DEFAULT_LEAVE_BALANCES];
  private requests: LeaveRequest[] = [];
  private attendanceListeners: AttendanceUpdateListener[] = [];
  private reversalListeners: AttendanceReversalListener[] = [];

  constructor() {
    this.balances = [...DEFAULT_LEAVE_BALANCES];
    this.requests = [];
  }

  getBalances(): LeaveBalance[] {
    return this.balances.map((b) => ({ ...b }));
  }

  setBalances(balances: LeaveBalance[]): void {
    this.balances = balances.map((b) => ({ ...b }));
  }

  onAttendanceUpdate(listener: AttendanceUpdateListener): void {
    this.attendanceListeners.push(listener);
  }

  onAttendanceReversal(listener: AttendanceReversalListener): void {
    this.reversalListeners.push(listener);
  }

  updateBalancesFromDashboard(balances: LeaveBalance[]): void {
    if (Array.isArray(balances) && balances.length > 0) {
      const filtered = balances
        .filter((b) => b && (b.type === 'CASUAL' || b.type === 'SICK'))
        .map((b) => {
          if (b.type === 'SICK' && b.total > 5) {
            const used = Math.min(b.used || 0, 5);
            return {
              ...b,
              total: 5,
              used: used,
              available: Math.max(0, 5 - used),
            };
          }
          return b;
        });

      if (filtered.length > 0) {
        const hasCasual = filtered.some((b) => b.type === 'CASUAL');
        const hasSick = filtered.some((b) => b.type === 'SICK');
        if (!hasCasual) {
          filtered.unshift({ type: 'CASUAL', label: 'Casual Leave', total: 12, used: 0, available: 12 });
        }
        if (!hasSick) {
          filtered.push({ type: 'SICK', label: 'Sick Leave', total: 5, used: 0, available: 5 });
        }
        this.balances = filtered;
      }
    }
  }

  getRequests(): LeaveRequest[] {
    return [...this.requests];
  }

  getRequestById(id: string): LeaveRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  /**
   * Fetch live leave balances and request history from n8n backend
   */
  async fetchRealtimeLeaves(employeeId?: string): Promise<{
    success: boolean;
    balances?: LeaveBalance[];
    requests?: LeaveRequest[];
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return {
        success: true,
        balances: this.getBalances(),
        requests: this.getRequests(),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEAVE_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'LIST', employeeId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Leave service returned HTTP ${response.status}`,
          balances: this.getBalances(),
          requests: this.getRequests(),
        };
      }

      const res = await response.json();
      if (res.success) {
        if (Array.isArray(res.balances) && res.balances.length > 0) {
          this.updateBalancesFromDashboard(res.balances);
        }
        if (Array.isArray(res.requests)) {
          this.requests = res.requests;
        }
        return {
          success: true,
          balances: this.getBalances(),
          requests: this.getRequests(),
        };
      }

      return {
        success: false,
        error: res.error || 'Failed to fetch leave records',
        balances: this.getBalances(),
        requests: this.getRequests(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: true,
        balances: this.getBalances(),
        requests: this.getRequests(),
        error: err.name === 'AbortError' ? 'Leave fetch timed out' : err.message,
      };
    }
  }

  /**
   * Apply for leave online via n8n backend workflow (POST /leave-apply)
   */
  async applyLeaveOnline(params: {
    employeeId: string;
    leaveType: LeaveType;
    durationType: LeaveDurationType;
    startDate: string;
    endDate: string;
    daysCount?: number;
    reason: string;
    whatsappNoticeAcknowledged: boolean;
  }): Promise<{ success: boolean; request?: LeaveRequest; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return this.applyLeave(params);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEAVE_APPLY}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({
          leaveType: params.leaveType,
          durationType: params.durationType,
          startDate: params.startDate,
          endDate: params.endDate || params.startDate,
          daysCount: params.daysCount,
          reason: params.reason,
          whatsappNoticeAcknowledged: params.whatsappNoticeAcknowledged,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const res = await response.json();
      if (response.ok && res.success && res.request) {
        const newReq: LeaveRequest = {
          id: res.request.id,
          employeeId: res.request.employeeId || params.employeeId,
          leaveType: res.request.leaveType || params.leaveType,
          durationType: res.request.durationType || params.durationType,
          startDate: res.request.startDate || params.startDate,
          endDate: res.request.endDate || params.endDate,
          daysCount: res.request.daysCount || 1,
          reason: res.request.reason || params.reason,
          status: res.request.status || 'PENDING',
          appliedOn: res.request.appliedOn || new Date().toISOString().split('T')[0],
          whatsappNoticeAcknowledged: res.request.whatsappNoticeAcknowledged ?? params.whatsappNoticeAcknowledged,
          comments: res.request.comments || 'Pending operational review & WhatsApp notice.',
        };

        this.requests.unshift(newReq);
        return { success: true, request: newReq };
      }

      return {
        success: false,
        error: res.error || `Server returned error (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return this.applyLeave(params);
    }
  }

  /**
   * Local leave application (Creates PENDING leave request)
   * Section 5: Pending leave requests must NEVER affect balance, salary, or attendance.
   */
  applyLeave(params: {
    employeeId: string;
    leaveType: LeaveType;
    durationType: LeaveDurationType;
    startDate: string;
    endDate: string;
    daysCount?: number;
    reason: string;
    whatsappNoticeAcknowledged: boolean;
  }): { success: boolean; request?: LeaveRequest; error?: string } {
    if (!params.reason.trim()) {
      return { success: false, error: 'Please provide a reason for the leave request.' };
    }

    if (!params.startDate) {
      return { success: false, error: 'Start date is required.' };
    }

    let daysCount = params.daysCount !== undefined ? params.daysCount : 1;
    if (params.durationType === 'FIRST_HALF' || params.durationType === 'SECOND_HALF') {
      daysCount = 0.5;
    } else if (params.startDate && params.endDate) {
      let count = 0;
      const [y1, m1, d1] = params.startDate.split('-').map(Number);
      const [y2, m2, d2] = params.endDate.split('-').map(Number);
      const cur = new Date(y1, m1 - 1, d1);
      const end = new Date(y2, m2 - 1, d2);
      while (cur <= end) {
        if (cur.getDay() !== 0) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      daysCount = Math.max(1, count);
    }

    const newRequest: LeaveRequest = {
      id: `lev-${Date.now()}`,
      employeeId: params.employeeId,
      leaveType: params.leaveType,
      durationType: params.durationType,
      startDate: params.startDate,
      endDate: params.endDate || params.startDate,
      daysCount,
      reason: params.reason,
      status: 'PENDING',
      appliedOn: new Date().toISOString().split('T')[0],
      whatsappNoticeAcknowledged: params.whatsappNoticeAcknowledged,
      comments: 'Pending operational review & WhatsApp group validation.',
    };

    this.requests.unshift(newRequest);
    return { success: true, request: newRequest };
  }

  /**
   * Section 5 & 9: Process Leave Approval, Rejection, or Cancellation
   * Idempotent & traceable through payrollCalculationEngine.
   */
  reviewLeaveRequest(
    requestId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET' | 'CANCEL',
    comment?: string,
    reviewerName = 'Admin'
  ): { success: boolean; error?: string; request?: LeaveRequest } {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: `Leave request ${requestId} not found.` };
    }

    const previousStatus = req.status;

    if (action === 'APPROVE') {
      // Idempotency: if already approved, do nothing!
      if (previousStatus === 'APPROVED') {
        return { success: true, request: req };
      }

      req.status = 'APPROVED';
      req.approvedOrRejectedBy = reviewerName;
      req.reviewedOn = new Date().toISOString().split('T')[0];
      req.comments = comment || 'Approved by HR Operations';

      const currentEmp = authService.getCurrentEmployee();
      const employee: Employee = currentEmp || {
        id: req.employeeId,
        firstName: 'Sujay',
        lastName: 'Verma',
        email: 'sujay.verma@autocomputation.com',
        phone: '+91 9876543210',
        salary: 30000,
        designation: 'Senior Developer',
        joiningDate: '2024-01-15',
        employmentType: 'Full-time',
        workLocation: 'Chinar Park, Kolkata',
        role: 'EMPLOYEE',
      };

      // Process deduction through centralized calculation engine
      const processResult = payrollCalculationEngine.processApprovedLeave(
        req,
        employee,
        this.balances
      );

      this.balances = processResult.updatedBalances;

      // Broadcast attendance creation to attendanceService
      if (processResult.attendancesCreated.length > 0) {
        for (const listener of this.attendanceListeners) {
          listener(processResult.attendancesCreated);
        }
      }

      return { success: true, request: req };
    } else if (action === 'REJECT' || action === 'CANCEL' || action === 'RESET') {
      // If was previously APPROVED, reverse deductions and restore balances (Section 9)
      if (previousStatus === 'APPROVED') {
        const reversalResult = payrollCalculationEngine.reverseApprovedLeave(
          requestId,
          this.balances
        );
        this.balances = reversalResult.updatedBalances;

        // Clear deduction attributes on request
        req.leaveDaysDeducted = 0;
        req.unpaidDays = 0;
        req.salaryDeduction = 0;
        req.deductionRecords = [];

        // Notify attendance service to remove/reset attendance records for this request
        for (const listener of this.reversalListeners) {
          listener(requestId);
        }
      }

      req.status = action === 'REJECT' ? 'REJECTED' : 'PENDING';
      req.approvedOrRejectedBy = action === 'REJECT' ? reviewerName : undefined;
      req.reviewedOn = new Date().toISOString().split('T')[0];
      req.comments = comment || (action === 'REJECT' ? 'Rejected as per policy.' : 'Reopened for review.');

      return { success: true, request: req };
    }

    return { success: false, error: `Invalid action: ${action}` };
  }
}

export const leaveService = new LeaveService();
