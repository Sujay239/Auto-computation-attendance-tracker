import { LeaveBalance, LeaveRequest, LeaveType, LeaveDurationType } from '../types/leave';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';

export const DEFAULT_LEAVE_BALANCES: LeaveBalance[] = [
  { type: 'CASUAL', label: 'Casual Leave', total: 12, used: 0, available: 12 },
  { type: 'SICK', label: 'Sick Leave', total: 5, used: 0, available: 5 },
];

class LeaveService {
  private balances: LeaveBalance[] = [...DEFAULT_LEAVE_BALANCES];
  private requests: LeaveRequest[] = [];

  constructor() {
    this.balances = [...DEFAULT_LEAVE_BALANCES];
    this.requests = [];
  }

  getBalances(): LeaveBalance[] {
    return [...this.balances];
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
          balances: this.balances,
          requests: this.requests,
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
      // Offline fallback
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
   * Authenticated using official JWT Bearer token
   */
  async applyLeaveOnline(params: {
    employeeId: string;
    leaveType: LeaveType;
    durationType: LeaveDurationType;
    startDate: string;
    endDate: string;
    reason: string;
    whatsappNoticeAcknowledged: boolean;
  }): Promise<{ success: boolean; request?: LeaveRequest; error?: string }> {
    const token = authService.getToken();

    if (!token) {
      // Fallback to local apply if running offline / unauthenticated demo
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
          comments: res.request.comments || 'Pending management approval.',
        };

        this.requests.unshift(newReq);

        // Update balance if provided in response
        if (res.balance) {
          const idx = this.balances.findIndex((b) => b.type === res.balance.leaveType);
          if (idx !== -1) {
            this.balances[idx] = {
              ...this.balances[idx],
              total: res.balance.total,
              used: res.balance.used,
              available: res.balance.available,
            };
          }
        }

        return { success: true, request: newReq };
      }

      return {
        success: false,
        error: res.error || `Server returned error (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Network request failed, falling back to local simulation:', err);
      return this.applyLeave(params);
    }
  }

  applyLeave(params: {
    employeeId: string;
    leaveType: LeaveType;
    durationType: LeaveDurationType;
    startDate: string;
    endDate: string;
    reason: string;
    whatsappNoticeAcknowledged: boolean;
  }): { success: boolean; request?: LeaveRequest; error?: string } {
    if (!params.reason.trim()) {
      return { success: false, error: 'Please provide a reason for the leave request.' };
    }

    if (!params.startDate) {
      return { success: false, error: 'Start date is required.' };
    }

    // Calculate days count
    let daysCount = 1;
    if (params.durationType === 'FIRST_HALF' || params.durationType === 'SECOND_HALF') {
      daysCount = 0.5;
    } else if (params.startDate && params.endDate && params.startDate !== params.endDate) {
      const d1 = new Date(params.startDate);
      const d2 = new Date(params.endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Check balance
    const balance = this.balances.find((b) => b.type === params.leaveType);
    if (balance && balance.available < daysCount) {
      // Leave beyond balance is subject to salary deduction
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
}

export const leaveService = new LeaveService();
