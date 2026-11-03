import { AuthCredentials, Employee } from '../types/employee';
import { API_CONFIG } from '../config/apiConfig';

export interface LoginResult {
  success: boolean;
  employee?: Employee;
  token?: string;
  error?: string;
}

class AuthService {
  private currentEmployee: Employee | null = null;
  private token: string | null = null;

  constructor() {
    // Session starts unauthenticated - real authentication required
    this.currentEmployee = null;
    this.token = null;
  }

  /**
   * Authenticate employee credentials against the n8n backend service
   */
  async login(credentials: AuthCredentials): Promise<LoginResult> {
    const identifier = credentials.employeeIdOrEmail.trim();
    const password = credentials.password.trim();

    if (!identifier || !password) {
      return {
        success: false,
        error: 'Please enter both Employee ID / Email and password.',
      };
    }

    const endpointUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (response.ok && data && (data.success || data.employee)) {
        const emp = (data.employee || data.user) as Employee;
        this.currentEmployee = emp;
        this.token = data.token || null;

        return {
          success: true,
          employee: this.currentEmployee,
          token: this.token || undefined,
        };
      }

      // Handle invalid credentials or backend errors
      const errorMessage =
        data?.error ||
        data?.message ||
        (response.status === 401
          ? 'Invalid Employee ID/Email or Password. Please check your credentials.'
          : `Server returned error (${response.status})`);

      return {
        success: false,
        error: errorMessage,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          success: false,
          error: `Authentication request timed out (${API_CONFIG.TIMEOUT_MS / 1000}s). Please check your connection to n8n.`,
        };
      }

      return {
        success: false,
        error:
          `Unable to reach n8n server (${API_CONFIG.BASE_URL}). ` +
          'Ensure your n8n workflow is active and the webhook URL is accessible.',
      };
    }
  }

  async logout(): Promise<void> {
    this.currentEmployee = null;
    this.token = null;
  }

  getCurrentEmployee(): Employee | null {
    return this.currentEmployee;
  }

  getToken(): string | null {
    return this.token;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  isAuthenticated(): boolean {
    return this.currentEmployee !== null;
  }

  /**
   * Change employee password securely via pgcrypto crypt() verification in n8n
   */
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Authentication token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'CHANGE_PASSWORD',
          oldPassword,
          newPassword,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        return { success: true, message: res.message || 'Password changed successfully.' };
      }
      return { success: false, error: res.error || 'Failed to change password.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while changing password.' };
    }
  }

  /**
   * Update employee avatar (stored as base64 in PostgreSQL avatar_url)
   */
  async updateAvatar(avatarBase64: string): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Authentication token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'UPDATE_AVATAR',
          avatar: avatarBase64,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success && res.employee) {
        if (this.currentEmployee) {
          this.currentEmployee = {
            ...this.currentEmployee,
            avatarUrl: res.employee.avatarUrl,
          };
        }
        return { success: true, employee: this.currentEmployee || res.employee };
      }
      return { success: false, error: res.error || 'Failed to update avatar image.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while updating avatar.' };
    }
  }

  /**
   * Update employee personal details (phone, avatarUrl)
   */
  async updateProfile(params: {
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; employee?: Employee; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Unauthorized: Authentication token required.' };
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          ...params,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success && res.employee) {
        if (this.currentEmployee) {
          this.currentEmployee = {
            ...this.currentEmployee,
            ...res.employee,
          };
        }
        return { success: true, employee: this.currentEmployee || res.employee };
      }
      return { success: false, error: res.error || 'Failed to update profile.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while updating profile.' };
    }
  }
}

export const authService = new AuthService();
