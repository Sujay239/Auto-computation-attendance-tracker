/**
 * n8n Backend Service Configuration
 * Auto Computation Employee Portal
 */

export const API_CONFIG = {
  /**
   * Base URL for n8n webhook endpoints.
   * - Local dev (web / iOS Simulator): http://localhost:5678/webhook
   * - Local dev (Android Emulator): http://10.0.2.2:5678/webhook
   * - Local dev (Physical device on same Wi-Fi): http://<YOUR_PC_LAN_IP>:5678/webhook (e.g. http://192.168.1.100:5678/webhook)
   * - Production / Cloud n8n: https://your-n8n-instance.com/webhook
   * 
   * You can override this dynamically via the EXPO_PUBLIC_N8N_URL environment variable.
   */
  BASE_URL: process.env.EXPO_PUBLIC_N8N_URL || 'http://localhost:5678/webhook',

  ENDPOINTS: {
    LOGIN: '/auth-login',
    DASHBOARD_EMPLOYEE: '/dashboard-employee',
    EMPLOYEE_CREATE: '/employee-create',
    ATTENDANCE_STATUS: '/attendance-status',
    ATTENDANCE_FULL: '/attendance-full',
    PUNCH: '/attendance-punch',
    LEAVE_APPLY: '/leave-apply',
    LEAVE_LIST: '/leave-list',
    OVERTIME_LIST: '/overtime-list',
    NOTIFICATIONS: '/notifications',
    HOLIDAYS: '/holidays',
    PROFILE: '/profile-management',
    SALARY_DEDUCTIONS: '/salary-deductions',
  },

  TIMEOUT_MS: 12000,
};

