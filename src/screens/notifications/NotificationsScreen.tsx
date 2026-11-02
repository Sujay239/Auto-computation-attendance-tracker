import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notificationService';
import { NotificationItem } from '../../types/notification';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';

export const NotificationsScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    notificationService.getNotifications()
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setNotifications([...notificationService.getNotifications()]);
    setTimeout(() => setRefreshing(false), 200);
  };

  const handleMarkAsRead = (id: string, actionRoute?: string) => {
    notificationService.markAsRead(id);
    setNotifications([...notificationService.getNotifications()]);
    if (actionRoute) {
      router.push(actionRoute as any);
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
    setNotifications([...notificationService.getNotifications()]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ATTENDANCE_REMINDER':
        return { name: 'time-outline' as const, color: '#2563EB', bg: 'bg-blue-50' };
      case 'LATE_WARNING':
        return { name: 'warning-outline' as const, color: '#D97706', bg: 'bg-amber-50' };
      case 'LEAVE_UPDATE':
        return { name: 'calendar-outline' as const, color: '#7C3AED', bg: 'bg-purple-50' };
      case 'OVERTIME_UPDATE':
        return { name: 'cash-outline' as const, color: '#059669', bg: 'bg-emerald-50' };
      case 'COMPANY_ANNOUNCEMENT':
        return { name: 'megaphone-outline' as const, color: '#0284C7', bg: 'bg-sky-50' };
      case 'HOLIDAY':
      default:
        return { name: 'sparkles-outline' as const, color: '#E11D48', bg: 'bg-rose-50' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Notifications"
          subtitle="Reminders, Updates & Announcements"
          showBack
          rightAction={
            <TouchableOpacity
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              className="px-2.5 py-1 rounded-lg bg-slate-100"
            >
              <Text className="text-xs font-bold text-blue-600">
                Mark all read
              </Text>
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {notifications.length > 0 ? (
          <View className="space-y-2.5">
            {notifications.map((item) => {
              const iconMeta = getCategoryIcon(item.category);

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleMarkAsRead(item.id, item.actionRoute)}
                  activeOpacity={0.75}
                >
                  <Card
                    className={`p-3.5 mb-2.5 border ${
                      item.read
                        ? 'border-slate-200 opacity-75'
                        : 'border-blue-300 bg-blue-50/30 shadow-xs'
                    }`}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className={`w-10 h-10 rounded-xl ${iconMeta.bg} items-center justify-center`}
                      >
                        <Ionicons name={iconMeta.name} size={20} color={iconMeta.color} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text
                            className={`text-xs font-bold flex-1 mr-2 ${
                              item.read ? 'text-slate-700' : 'text-slate-900'
                            }`}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>

                          {!item.read && (
                            <View className="w-2 h-2 rounded-full bg-blue-600 mr-1" />
                          )}
                        </View>

                        <Text
                          className={`text-xs leading-relaxed ${
                            item.read ? 'text-slate-500' : 'text-slate-700 font-medium'
                          }`}
                        >
                          {item.message}
                        </Text>

                        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
                          <Text className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>

                          {item.actionRoute && (
                            <View className="flex-row items-center gap-1">
                              <Text className="text-[11px] font-bold text-blue-600">
                                Open Details
                              </Text>
                              <Ionicons name="arrow-forward" size={11} color="#2563EB" />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <EmptyState
            iconName="notifications-off-outline"
            title="All Caught Up!"
            description="You have no notifications or pending alerts at this moment."
          />
        )}
      </ScrollView>
    </View>
  );
};
