import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { Avatar } from '../../components/common/Avatar';
import { AdminDashboardStats } from '../../types/admin';

export const AdminDashboardScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setError(null);
    const res = await adminService.getDashboardOverview();
    if (res.success && res.data) {
      setStats(res.data);
    } else {
      setError(res.error || 'Failed to load dashboard.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getStatusBadge = (status: string, isHalfDayCase: boolean) => {
    if (isHalfDayCase || status === 'HALF_DAY') {
      return { bg: '#FEF3C7', text: '#D97706', label: 'Half Day' };
    }
    switch (status) {
      case 'ON_TIME':
        return { bg: '#DCFCE7', text: '#15803D', label: 'On Time' };
      case 'WITHIN_BUFFER':
        return { bg: '#E0F2FE', text: '#0369A1', label: 'Within Buffer' };
      case 'LATE':
        return { bg: '#FEE2E2', text: '#B91C1C', label: 'Late Punch' };
      case 'LEAVE':
        return { bg: '#F3E8FF', text: '#7E22CE', label: 'On Leave' };
      case 'ABSENT':
        return { bg: '#FFE4E6', text: '#E11D48', label: 'Absent' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', label: 'Awaiting Punch' };
    }
  };

  const pendingTotal = (stats?.pendingLeavesCount || 0) + (stats?.pendingOvertimeCount || 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Safe Area Header */}
      <View
        style={{
          paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 8),
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-indigo-600" />
              <Text className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                Admin Console
              </Text>
            </View>
            <Text className="text-xl font-black text-slate-900 mt-0.5">
              {user?.firstName ? `Welcome, ${user.firstName}` : 'Admin Portal'}
            </Text>
            <Text className="text-xs text-slate-500 font-medium">
              Auto Computation • Kolkata Headquarters
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center"
          >
            <Ionicons name="refresh" size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-xs font-semibold text-slate-500 mt-3">
              Loading corporate attendance intelligence...
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Approvals Alert Banner */}
            {pendingTotal > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(admin)/approvals' as any)}
                className="mb-4 p-4 rounded-2xl bg-amber-500 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
                    <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">
                      {pendingTotal} Pending Request{pendingTotal > 1 ? 's' : ''} Need Approval
                    </Text>
                    <Text className="text-white/85 text-xs mt-0.5">
                      {stats?.pendingLeavesCount || 0} Leave Applications • {stats?.pendingOvertimeCount || 0} Overtime Claims
                    </Text>
                  </View>
                </View>
                <View className="px-3 py-1.5 rounded-xl bg-white flex-row items-center gap-1">
                  <Text className="text-xs font-bold text-amber-700">Review</Text>
                  <Ionicons name="chevron-forward" size={14} color="#B45309" />
                </View>
              </TouchableOpacity>
            )}

            {/* KPI Cards Grid (2x2) */}
            <View className="flex-row gap-3 mb-3">
              {/* Card 1: Total Employees */}
              <View className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Staff Force
                  </Text>
                  <View className="w-7 h-7 rounded-lg bg-blue-50 items-center justify-center">
                    <Ionicons name="people" size={16} color="#2563EB" />
                  </View>
                </View>
                <Text className="text-2xl font-black text-slate-900">
                  {stats?.totalEmployees || 0}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Total Active Members
                </Text>
              </View>

              {/* Card 2: Present Today */}
              <View className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Present Today
                  </Text>
                  <View className="w-7 h-7 rounded-lg bg-emerald-50 items-center justify-center">
                    <Ionicons name="finger-print" size={16} color="#059669" />
                  </View>
                </View>
                <Text className="text-2xl font-black text-emerald-600">
                  {stats?.presentToday || 0}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {stats?.totalEmployees
                    ? `${Math.round(((stats.presentToday || 0) / stats.totalEmployees) * 100)}% Workforce In`
                    : 'Recorded Today'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              {/* Card 3: Punctuality Breakdown */}
              <View className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Punctuality
                  </Text>
                  <View className="w-7 h-7 rounded-lg bg-indigo-50 items-center justify-center">
                    <Ionicons name="time" size={16} color="#4F46E5" />
                  </View>
                </View>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-lg font-black text-emerald-600">
                    {stats?.onTimeToday || 0}
                  </Text>
                  <Text className="text-xs text-slate-400 font-bold">On-time</Text>
                  <Text className="text-xs text-slate-300">•</Text>
                  <Text className="text-lg font-black text-amber-600">
                    {stats?.lateToday || 0}
                  </Text>
                  <Text className="text-xs text-slate-400 font-bold">Late</Text>
                </View>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {stats?.withinBufferToday || 0} within 20m buffer
                </Text>
              </View>

              {/* Card 4: Absences / Leaves */}
              <View className="flex-1 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Off / Half-Day
                  </Text>
                  <View className="w-7 h-7 rounded-lg bg-rose-50 items-center justify-center">
                    <Ionicons name="calendar" size={16} color="#E11D48" />
                  </View>
                </View>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-lg font-black text-amber-600">
                    {stats?.halfDayToday || 0}
                  </Text>
                  <Text className="text-xs text-slate-400 font-bold">Half-Day</Text>
                  <Text className="text-xs text-slate-300">•</Text>
                  <Text className="text-lg font-black text-rose-600">
                    {stats?.onLeaveToday || 0}
                  </Text>
                  <Text className="text-xs text-slate-400 font-bold">Leave</Text>
                </View>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {stats?.absentToday || 0} unexcused absent
                </Text>
              </View>
            </View>

            {/* Quick Actions Bar */}
            <View className="mb-5">
              <Text className="text-sm font-black text-slate-900 mb-2.5">
                Quick Administrative Operations
              </Text>
              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push('/(admin)/employees' as any)}
                  className="flex-1 p-3 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center"
                >
                  <Ionicons name="person-add" size={20} color="#4F46E5" />
                  <Text className="text-xs font-bold text-indigo-900 mt-1.5 text-center">
                    Staff Directory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push('/(admin)/approvals' as any)}
                  className="flex-1 p-3 rounded-2xl bg-amber-50 border border-amber-100 items-center justify-center"
                >
                  <Ionicons name="checkbox" size={20} color="#D97706" />
                  <Text className="text-xs font-bold text-amber-900 mt-1.5 text-center">
                    Approvals Hub
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push('/(admin)/holidays' as any)}
                  className="flex-1 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center"
                >
                  <Ionicons name="calendar" size={20} color="#059669" />
                  <Text className="text-xs font-bold text-emerald-900 mt-1.5 text-center">
                    Holidays
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Today's Attendance Feed */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-sm font-black text-slate-900">
                    Today's Attendance Feed
                  </Text>
                </View>
                <Text className="text-xs font-bold text-slate-500">
                  {stats?.todayDate || 'Today'}
                </Text>
              </View>

              {(() => {
                const employeeOnlyFeed = (stats?.todayPunchesFeed || []).filter(
                  (item: any) =>
                    item.role !== 'ADMIN' &&
                    item.role !== 'admin' &&
                    !item.employeeId?.startsWith('ADM')
                );

                if (employeeOnlyFeed.length === 0) {
                  return (
                    <View className="p-6 bg-white rounded-2xl border border-slate-200 items-center justify-center">
                      <Ionicons name="time-outline" size={32} color="#94A3B8" />
                      <Text className="text-xs font-bold text-slate-600 mt-2">
                        No staff attendance records logged for today yet.
                      </Text>
                    </View>
                  );
                }

                return (
                  <View className="space-y-2 gap-2">
                    {employeeOnlyFeed.map((item) => {
                      const badge = getStatusBadge(item.status, item.isHalfDayCase);
                      return (
                        <View
                          key={item.employeeId}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            {/* Avatar or Initials */}
                            <Avatar
                              uri={item.avatarUrl || (item as any).avatar_url}
                              name={item.employeeName || 'Staff'}
                              size={40}
                              showStatusDot={false}
                              fallbackBg="#EEF2FF"
                              fallbackTextColor="#4338CA"
                            />

                            <View className="flex-1">
                              <View className="flex-row items-center gap-2">
                                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                                  {item.employeeName}
                                </Text>
                                <View className="px-1.5 py-0.2 rounded bg-slate-100">
                                  <Text className="text-[10px] font-bold text-slate-600">
                                    {item.employeeId}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                                {item.designation}
                              </Text>
                            </View>
                          </View>

                          {/* Punch In / Out Time & Badge */}
                          <View className="items-end pl-2">
                            <View
                              style={{
                                backgroundColor: badge.bg,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ color: badge.text, fontSize: 10.5, fontWeight: '700' }}>
                                {badge.label}
                              </Text>
                            </View>
                            <Text className="text-[11px] font-bold text-slate-700 mt-1">
                              {item.checkIn ? `In: ${item.checkIn}` : 'No Punch'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

