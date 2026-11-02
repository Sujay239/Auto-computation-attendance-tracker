import leaveData from '../data/leaveRequests.json';
import { LeaveBalance, LeaveRequest, LeaveType, LeaveDurationType } from '../types/leave';

class LeaveService {
  private balances: LeaveBalance[] = [];
  private requests: LeaveRequest[] = [];

  constructor() {
    this.balances = [...(leaveData.balances as LeaveBalance[])];
    this.requests = [...(leaveData.requests as LeaveRequest[])];
  }

  getBalances(): LeaveBalance[] {
    return [...this.balances];
  }

  getRequests(): LeaveRequest[] {
    return [...this.requests];
  }

  getRequestById(id: string): LeaveRequest | undefined {
    return this.requests.find((r) => r.id === id);
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

