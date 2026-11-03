import { OvertimeRecord, OvertimeSummary } from '../types/overtime';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';

const DEFAULT_OVERTIME_SUMMARY: OvertimeSummary = {
  totalApprovedHours: '0.0h',
  totalPendingHours: '0.0h',
  earlyLeaveHoursAvailable: '0.0h',
  reimbursementPendingCount: 0,
};

class OvertimeService {
  private summary: OvertimeSummary;
  private records: OvertimeRecord[] = [];

  constructor() {
    this.summary = { ...DEFAULT_OVERTIME_SUMMARY };
    this.records = [];
  }

  getSummary(): OvertimeSummary {
    return { ...this.summary };
  }

  updateSummaryFromDashboard(summary: Partial<OvertimeSummary>): void {
    if (summary) {
      this.summary = {
        ...this.summary,
        ...summary,
      };
    }
  }

  getRecords(): OvertimeRecord[] {
    return [...this.records];
  }

  getRecordById(id: string): OvertimeRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  /**
   * Fetch real-time overtime records & summary from n8n backend using JWT Bearer token
   */
  async fetchRealtimeOvertime(employeeId?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Authentication token required.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OVERTIME_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'LIST', employeeId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resJson = await response.json().catch(() => null);

      if (response.ok && resJson && resJson.success) {
        if (Array.isArray(resJson.records)) {
          this.records = resJson.records;
        }
        if (resJson.summary) {
          this.summary = {
            ...this.summary,
            ...resJson.summary,
          };
        }
        return { success: true, data: resJson };
      }

      return {
        success: false,
        error: resJson?.error || `Failed to fetch overtime data (${response.status})`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Overtime request timed out.' : 'Failed to reach overtime endpoint.',
      };
    }
  }

  /**
   * Admin approve or reject overtime request
   */
  async adminReviewOvertime(params: {
    overtimeId: string;
    action: 'APPROVE' | 'REJECT';
    notes?: string;
  }): Promise<{ success: boolean; message?: string; record?: any; error?: string }> {
    const token = authService.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Admin authentication token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OVERTIME_LIST}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(params),
      });

      const resJson = await response.json().catch(() => null);
      if (response.ok && resJson && resJson.success) {
        const updated = resJson.record;
        const idx = this.records.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          this.records[idx] = {
            ...this.records[idx],
            ...updated,
          };
        }
        return { success: true, message: resJson.message, record: updated };
      }

      return {
        success: false,
        error: resJson?.error || `Action failed (${response.status})`,
      };
    } catch (err: any) {
      return { success: false, error: 'Failed to communicate with overtime service.' };
    }
  }
}

export const overtimeService = new OvertimeService();

