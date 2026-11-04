import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/apiConfig';
import { authService } from './authService';

const LAST_REGISTERED_TOKEN_KEY = 'attendance_last_registered_push_token';
const EAS_PROJECT_ID = 'f91809ea-8273-48eb-863d-f789d43b9fdb';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushRegistrationResult {
  success: boolean;
  token?: string;
  error?: string;
}

class PushNotificationService {
  private isConfigured = false;

  /**
   * Initialize Android high-importance notification channel
   */
  async setupNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Attendance & Approvals Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
        });
      } catch (err) {
        console.warn('Failed to configure Android notification channel:', err);
      }
    }
  }

  /**
   * Request permissions and retrieve Expo push token
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device.');
      // Still return null gracefully on simulator
      return null;
    }

    await this.setupNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to obtain push notification permission.');
      return null;
    }

    try {
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });
      return tokenResult.data;
    } catch (err: any) {
      console.warn('Error fetching Expo push token:', err?.message || err);
      return null;
    }
  }

  /**
   * Sync the device token with the n8n backend for the authenticated user
   */
  async syncDeviceTokenWithBackend(
    employeeId: string,
    role: string
  ): Promise<PushRegistrationResult> {
    try {
      const token = await this.registerForPushNotificationsAsync();
      if (!token) {
        return { success: false, error: 'Push token unavailable or permission denied' };
      }

      // Check if we already registered this token for this employee
      const cached = await AsyncStorage.getItem(`${LAST_REGISTERED_TOKEN_KEY}_${employeeId}`);
      if (cached === token) {
        return { success: true, token };
      }

      // Optional FCM native device token
      let nativeFcmToken: string | null = null;
      try {
        if (Platform.OS === 'android') {
          const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
          nativeFcmToken = deviceTokenResult.data;
        }
      } catch (e) {
        // Expo Push Token is primary and sufficient
      }

      const authToken = authService.getToken();
      const payload = {
        employeeId,
        role: role.toUpperCase(),
        pushToken: token,
        fcmToken: nativeFcmToken,
        platform: Platform.OS,
        deviceName: `${Device.brand || ''} ${Device.modelName || 'Mobile Device'}`.trim(),
        appVersion: '1.0.0',
      };

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DEVICE_TOKEN_REGISTER}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await AsyncStorage.setItem(`${LAST_REGISTERED_TOKEN_KEY}_${employeeId}`, token);
        return { success: true, token };
      }

      return {
        success: false,
        token,
        error: `Server responded with status ${response.status}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Push registration failed' };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
