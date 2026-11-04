import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightAction,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // If showBack is not explicitly specified, show it on all sub-screens
  const isRootScreen =
    pathname === '/(tabs)/home' ||
    pathname === '/(admin)/home' ||
    pathname === '/login' ||
    pathname === '/index' ||
    pathname === '/';

  const shouldDisplayBack = showBack !== undefined ? showBack : !isRootScreen;

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      const isUnderAdmin = pathname?.includes('admin');
      router.replace((isUnderAdmin ? '/(admin)/home' : '/(tabs)/home') as any);
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
      }}
      className="flex-row items-center justify-between py-3 px-4 shadow-2xs"
    >
      <View className="flex-row items-center flex-1">
        {shouldDisplayBack && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3"
            accessibilityLabel="Go back to previous page"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text
            numberOfLines={1}
            style={{ color: '#0F172A' }}
            className="text-lg font-bold"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={1}
              style={{ color: '#64748B' }}
              className="text-xs mt-0.5 font-medium"
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View className="ml-3">{rightAction}</View>}
    </View>
  );
};
