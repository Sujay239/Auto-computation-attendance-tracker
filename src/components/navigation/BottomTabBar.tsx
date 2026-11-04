import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notificationService';

export interface TabItem {
  key: string;
  route: string;
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export const BottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const unreadNotifs = notificationService.getUnreadCount();

  const tabs: TabItem[] = [
    {
      key: 'home',
      route: '/(tabs)/home',
      label: 'Home',
      iconFocused: 'home',
      iconUnfocused: 'home-outline',
    },
    {
      key: 'attendance',
      route: '/(tabs)/attendance',
      label: 'Attendance',
      iconFocused: 'finger-print',
      iconUnfocused: 'finger-print-outline',
    },
    {
      key: 'leave',
      route: '/(tabs)/leave',
      label: 'Leave',
      iconFocused: 'calendar',
      iconUnfocused: 'calendar-outline',
    },
    {
      key: 'overtime',
      route: '/(tabs)/overtime',
      label: 'Overtime',
      iconFocused: 'time',
      iconUnfocused: 'time-outline',
    },
    {
      key: 'profile',
      route: '/(tabs)/profile',
      label: 'Profile',
      iconFocused: 'person',
      iconUnfocused: 'person-outline',
    },
  ];

  const handleTabPress = (route: string) => {
    if (pathname === route) return;
    router.push(route as any);
  };

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8);

  return (
    <View
      style={{
        paddingBottom: bottomPadding,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
      }}
      className="px-2 pt-2 shadow-sm"
    >
      <View className="flex-row items-center justify-around">
        {tabs.map((tab) => {
          const normalizedPath = pathname.replace(/^\/\(tabs\)/, '');
          const isHomeActive =
            tab.key === 'home' &&
            (normalizedPath === '' || normalizedPath === '/' || normalizedPath === '/home');
          const isActive =
            isHomeActive || normalizedPath === `/${tab.key}` || normalizedPath.startsWith(`/${tab.key}/`);

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabPress(tab.route)}
              activeOpacity={0.7}
              className="items-center justify-center flex-1 py-0.5 relative"
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              {/* Top Active Indicator Bar */}
              <View
                style={{
                  height: 3,
                  width: 26,
                  borderRadius: 2,
                  backgroundColor: isActive ? '#2563EB' : 'transparent',
                  marginBottom: 3,
                }}
              />

              {/* Icon Container with Prominent Active Pill */}
              <View
                style={{
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  borderColor: isActive ? '#BFDBFE' : 'transparent',
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isActive ? tab.iconFocused : tab.iconUnfocused}
                  size={22}
                  color={isActive ? '#1D4ED8' : '#64748B'}
                />
              </View>

              <Text
                style={{
                  fontSize: 11,
                  marginTop: 2.5,
                  fontWeight: isActive ? '800' : '500',
                  color: isActive ? '#1D4ED8' : '#64748B',
                  letterSpacing: -0.2,
                }}
              >
                {tab.label}
              </Text>

              {tab.badgeCount && tab.badgeCount > 0 ? (
                <View className="absolute top-1 right-3 bg-rose-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                  <Text className="text-[9px] font-bold text-white">
                    {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
