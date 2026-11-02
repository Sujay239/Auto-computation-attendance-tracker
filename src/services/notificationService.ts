import notificationsData from '../data/notifications.json';
import { NotificationItem } from '../types/notification';

class NotificationService {
  private notifications: NotificationItem[] = [];

  constructor() {
    this.notifications = [...(notificationsData as NotificationItem[])];
  }

  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
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
  }
}

export const notificationService = new NotificationService();

