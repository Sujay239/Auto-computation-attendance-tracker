import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const AttendanceHistoryScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records, refreshData } = useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const filteredRecords = records.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'LATE') return r.status === 'LATE';
    if (statusFilter === 'BUFFER') return r.status === 'WITHIN_BUFFER';
    if (statusFilter === 'ON_TIME') return r.status === 'ON_TIME' || r.status === 'PRESENT';
    if (statusFilter === 'HALF_DAY') return r.status === 'HALF_DAY';
    if (statusFilter === 'LEAVE') return r.status === 'LEAVE';
    return true;
  });

  const filterTabs = [
    { key: 'ALL', label: 'All Records' },
    { key: 'ON_TIME', label: 'On Time' },
    { key: 'BUFFER', label: 'Within Buffer' },
    { key: 'LATE', label: 'Late Allowances' },
    { key: 'HALF_DAY', label: 'Half Day' },
    { key: 'LEAVE', label: 'Leaves' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header title="Attendance History" subtitle="Full audit logs & punch details" showBack />
      </View>

      {/* Filter Chips Bar */}
      <View className="py-2.5 px-4 bg-white border-b border-slate-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {filterTabs.map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setStatusFilter(tab.key)}
                activeOpacity={0.7}
                className={`px-3 py-1.5 rounded-full border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        {filteredRecords.length > 0 ? (
          <View className="space-y-2.5">
            {filteredRecords.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/attendance/details',
                    params: { id: item.id },
                  })
                }
                activeOpacity={0.75}
              >
                <Card className="p-3.5 mb-2.5">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={15} color="#2563EB" />
                      <Text className="text-sm font-bold text-slate-900">
                        {item.date}
                      </Text>
                    </View>
                    <Badge
                      label={item.statusLabel}
                      variant={
                        item.status === 'ON_TIME' || item.status === 'PRESENT'
                          ? 'success'
                          : item.status === 'WITHIN_BUFFER' || item.status === 'LATE'
                          ? 'warning'
                          : item.status === 'HALF_DAY'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    />
                  </View>

                  <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <View>
                      <Text className="text-[10px] text-slate-400 uppercase font-bold">
                        Check In
                      </Text>
                      <Text className="text-xs font-bold text-slate-800">
                        {item.checkIn || 'N/A'}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-[10px] text-slate-400 uppercase font-bold">
                        Check Out
                      </Text>
                      <Text className="text-xs font-bold text-slate-800">
                        {item.checkOut || 'In Progress'}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-slate-400 uppercase font-bold">
                        Net Worked
                      </Text>
                      <Text className="text-xs font-bold text-blue-600">
                        {item.workDurationMinutes
                          ? `${(item.workDurationMinutes / 60).toFixed(1)} hrs`
                          : '-'}
                      </Text>
                    </View>
                  </View>

                  {item.notes && (
                    <Text className="text-[11px] text-slate-500 mt-2 italic font-medium" numberOfLines={1}>
                      Note: {item.notes}
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No records found"
            description="No attendance records match the selected filter criteria."
            actionLabel="Reset Filter"
            onAction={() => setStatusFilter('ALL')}
          />
        )}
      </ScrollView>
    </View>
  );
};
