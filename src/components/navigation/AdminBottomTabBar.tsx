import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export interface AdminTabItem {
  key: string;
  route: string;
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export const AdminBottomTabBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs: AdminTabItem[] = [
    {
      key: 'home',
      route: '/(admin)/home',
      label: 'Dashboard',
      iconFocused: 'grid',
      iconUnfocused: 'grid-outline',
    },
    {
      key: 'employees',
      route: '/(admin)/employees',
      label: 'Staff',
      iconFocused: 'people',
      iconUnfocused: 'people-outline',
    },
    {
      key: 'approvals',
      route: '/(admin)/approvals',
      label: 'Approvals',
      iconFocused: 'checkmark-circle',
      iconUnfocused: 'checkmark-circle-outline',
    },
    {
      key: 'holidays',
      route: '/(admin)/holidays',
      label: 'Holidays',
      iconFocused: 'calendar',
      iconUnfocused: 'calendar-outline',
    },
    {
      key: 'settings',
      route: '/(admin)/settings',
      label: 'Settings',
      iconFocused: 'settings',
      iconUnfocused: 'settings-outline',
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
          const normalizedPath = pathname.replace(/^\/\(admin\)/, '');
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
                  width: 24,
                  borderRadius: 2,
                  backgroundColor: isActive ? '#4F46E5' : 'transparent',
                  marginBottom: 3,
                }}
              />

              {/* Icon Container with Pill */}
              <View
                style={{
                  backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                  borderColor: isActive ? '#C7D2FE' : 'transparent',
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isActive ? tab.iconFocused : tab.iconUnfocused}
                  size={21}
                  color={isActive ? '#4338CA' : '#64748B'}
                />
              </View>

              <Text
                style={{
                  fontSize: 10.5,
                  marginTop: 2.5,
                  fontWeight: isActive ? '800' : '500',
                  color: isActive ? '#4338CA' : '#64748B',
                  letterSpacing: -0.2,
                }}
              >
                {tab.label}
              </Text>

              {tab.badgeCount && tab.badgeCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: '18%',
                    backgroundColor: '#EF4444',
                    borderRadius: 9,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
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

