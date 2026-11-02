import '../global.css';

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { AttendanceProvider } from '../context/AttendanceContext';
import { AnimatedSplashScreen } from '../components/common/AnimatedSplashScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
