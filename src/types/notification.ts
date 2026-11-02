export type NotificationCategory =
  | 'ATTENDANCE_REMINDER'
  | 'LATE_WARNING'
  | 'LEAVE_UPDATE'
  | 'OVERTIME_UPDATE'
  | 'COMPANY_ANNOUNCEMENT'
  | 'HOLIDAY';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string; // ISO or human readable
  read: boolean;
  actionRoute?: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
}

