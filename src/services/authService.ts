import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthCredentials, Employee } from '../types/employee';
import { API_CONFIG } from '../config/apiConfig';

export interface LoginResult {
  success: boolean;
  employee?: Employee;
  token?: string;
  error?: string;
}

const STORAGE_KEYS = {
  TOKEN: '@auto_comp_auth_token',
  USER: '@auto_comp_auth_user',
};

class AuthService {
  private currentEmployee: Employee | null = null;
  private token: string | null = null;

  constructor() {
    this.currentEmployee = null;
    this.token = null;
  }

  /**
   * Restore persisted session from AsyncStorage on app startup
   */
  async initSession(): Promise<{ token: string | null; employee: Employee | null }> {
    try {
      const [storedToken, storedUserJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (storedToken && storedUserJson) {
        // 1. Check if token is expired
        if (this.isTokenExpired(storedToken)) {
          console.log('[AuthService] Stored token has expired. Clearing session.');
          await this.logout();
          return { token: null, employee: null };
        }

        // 2. Restore in-memory session
        const employee = JSON.parse(storedUserJson) as Employee;
        this.token = storedToken;
        this.currentEmployee = employee;

        console.log(`[AuthService] Session restored for ${employee.id} (${employee.role}).`);
        return { token: this.token, employee: this.currentEmployee };
      }
    } catch (e) {
      console.warn('[AuthService] Failed to load persisted session from storage:', e);
    }
    return { token: null, employee: null };
  }

  /**
   * Check if a JWT token has expired by inspecting the exp claim
   */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      if (parsed.exp && typeof parsed.exp === 'number') {
        const currentTime = Math.floor(Date.now() / 1000);
        return currentTime >= parsed.exp;
      }
      return false;
    } catch {
      return false;
    }
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

        // Persist session into AsyncStorage
        try {
          if (this.token) {
            await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, this.token);
          }
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentEmployee));
        } catch (storageErr) {
          console.warn('[AuthService] Failed to persist session to storage:', storageErr);
        }

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

  /**
   * Log out employee and remove saved credentials from AsyncStorage
   */
  async logout(): Promise<void> {
    this.currentEmployee = null;
    this.token = null;
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      console.log('[AuthService] Stored session cleared.');
    } catch (e) {
      console.warn('[AuthService] Error clearing storage on logout:', e);
    }
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
    return this.currentEmployee !== null && this.token !== null;
  }

  /**
   * Update locally stored user data
   */
  async updateUser(employee: Employee): Promise<void> {
    this.currentEmployee = employee;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(employee));
    } catch (e) {
      console.warn('[AuthService] Error updating stored employee:', e);
    }
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
   * Update employee avatar image (stored as Base64 in PostgreSQL database)
   */
  async updateAvatar(
    base64Uri: string
  ): Promise<{ success: boolean; employee?: Employee; error?: string }> {
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
          avatar: base64Uri,
        }),
      });

      const res = await response.json();
      if (response.ok && (res.success || res.employee)) {
        const updated = res.employee as Employee;
        if (updated) {
          await this.updateUser(updated);
        }
        return { success: true, employee: updated };
      }
      return { success: false, error: res.error || 'Failed to update avatar photo.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating avatar.' };
    }
  }

  /**
   * Update profile details (e.g. phone) in database
   */
  async updateProfile(data: { phone?: string; avatar?: string }): Promise<{
    success: boolean;
    employee?: Employee;
    error?: string;
  }> {
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
          phone: data.phone,
          avatar: data.avatar,
        }),
      });

      const res = await response.json();
      if (response.ok && (res.success || res.employee)) {
        const updated = res.employee as Employee;
        if (updated) {
          await this.updateUser(updated);
        }
        return { success: true, employee: updated };
      }
      return { success: false, error: res.error || 'Failed to update profile details.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating profile.' };
    }
  }
}

export const authService = new AuthService();
