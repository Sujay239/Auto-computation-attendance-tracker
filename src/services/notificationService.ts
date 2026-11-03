import { NotificationItem } from '../types/notification';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';

class NotificationService {
  private notifications: NotificationItem[] = [];
  private unreadCountOverride: number | null = null;

  constructor() {
    this.notifications = [];
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  setUnreadCount(count: number): void {
    this.unreadCountOverride = count;
  }

  getUnreadCount(): number {
    if (this.unreadCountOverride !== null) {
      return this.unreadCountOverride;
    }
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Fetch live notifications from n8n backend using JWT Bearer token
   */
  async fetchRealtimeNotifications(): Promise<{
    success: boolean;
    notifications?: NotificationItem[];
    unreadCount?: number;
    error?: string;
  }> {
    const token = authService.getToken();
    if (!token) {
      return {
        success: true,
        notifications: this.getNotifications(),
        unreadCount: this.getUnreadCount(),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'LIST' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Server responded with ${response.status}`,
          notifications: this.getNotifications(),
          unreadCount: this.getUnreadCount(),
        };
      }

      const res = await response.json();
      if (res.success && Array.isArray(res.notifications)) {
        this.notifications = res.notifications;
        this.unreadCountOverride = res.unreadCount ?? null;
        return {
          success: true,
          notifications: this.notifications,
          unreadCount: this.getUnreadCount(),
        };
      }

      return {
        success: false,
        error: res.error || 'Failed to fetch notifications',
        notifications: this.getNotifications(),
        unreadCount: this.getUnreadCount(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: true,
        notifications: this.getNotifications(),
        unreadCount: this.getUnreadCount(),
        error: err.name === 'AbortError' ? 'Notifications fetch timed out' : err.message,
      };
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsReadOnline(id: string): Promise<void> {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
    }

    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'MARK_READ', notificationId: id }),
      });
    } catch (err) {
      console.warn('Failed to sync notification read state:', err);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsReadOnline(): Promise<void> {
    this.notifications.forEach((n) => {
      n.read = true;
    });
    this.unreadCountOverride = 0;

    const token = authService.getToken();
    if (!token) return;

    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify({ action: 'MARK_ALL_READ', markAll: true }),
      });
    } catch (err) {
      console.warn('Failed to sync mark all read state:', err);
    }
  }

  markAsRead(id: string): void {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.read = true;
    });
    this.unreadCountOverride = 0;
  }
}

export const notificationService = new NotificationService();
