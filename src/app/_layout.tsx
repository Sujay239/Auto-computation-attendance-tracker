import '../global.css';

import React, { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as RNStatusBar, BackHandler } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { AttendanceProvider } from '../context/AttendanceContext';
import { AnimatedSplashScreen } from '../components/common/AnimatedSplashScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Global Hardware & Gesture Back Handler
 * On Android, intercepts system back press:
 * 1. Pops previous screen (-1) if history exists.
 * 2. If no history and currently in a sub-screen, returns to home.
 * 3. Only allows default app exit when on the root screen.
 */
function GlobalBackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBackPress = () => {
      // 1. If navigator has back history, go back to previous page (-1)
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // 2. Check if user is on root screens
      const isRootScreen =
        pathname === '/(tabs)/home' ||
        pathname === '/(admin)/home' ||
        pathname === '/login' ||
        pathname === '/index' ||
        pathname === '/';

      // If user is inside a secondary tab or deep subscreen without history, return to dashboard
      if (!isRootScreen) {
        const isUnderAdmin = pathname?.includes('admin');
        router.replace((isUnderAdmin ? '/(admin)/home' : '/(tabs)/home') as any);
        return true;
      }

      // 3. On root screen, let Android perform default exit/minimize
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => backSub.remove();
  }, [pathname, router]);

  return null;
}

/**
 * Global Push Notification Response Listener
 * Navigates to appropriate screen when user taps a push notification
 */
function GlobalNotificationListener() {
  const router = useRouter();

  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      const targetScreen = String(data.targetScreen || '');
      const type = String(data.type || '');

      if (type === 'LEAVE_APPLICATION' || targetScreen.includes('approval')) {
        router.push('/(admin)/approvals' as any);
      } else if (type === 'LEAVE_REVIEW' || type === 'LEAVE_STATUS' || targetScreen.includes('leave')) {
        router.push('/(tabs)/leave' as any);
      } else if (type === 'OVERTIME_REVIEW' || type === 'OVERTIME_STATUS' || targetScreen.includes('overtime')) {
        router.push('/(tabs)/overtime' as any);
      } else {
        router.push('/notifications' as any);
      }
    });

    return () => responseSub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      (RNStatusBar as any).setBackgroundColor?.('#FFFFFF', true);
      (RNStatusBar as any).setBarStyle?.('dark-content', true);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AttendanceProvider>
          <GlobalBackHandler />
          <GlobalNotificationListener />
          <StatusBar style="dark" />
          <AnimatedSplashScreen />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#F8FAFC' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="attendance/history" />
            <Stack.Screen name="attendance/details" />
            <Stack.Screen name="leave/apply" />
            <Stack.Screen name="leave/details" />
            <Stack.Screen name="overtime/details" />
            <Stack.Screen name="profile/personal" />
            <Stack.Screen name="profile/settings" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="holidays" />
          </Stack>
        </AttendanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
