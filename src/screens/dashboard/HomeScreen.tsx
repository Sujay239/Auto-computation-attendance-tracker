import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { leaveService } from '../../services/leaveService';
import { overtimeService } from '../../services/overtimeService';
import { notificationService } from '../../services/notificationService';
import holidaysData from '../../data/holidays.json';
import companyData from '../../data/company.json';
import { PunchOutModal } from '../../components/attendance/PunchOutModal';

export const HomeScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    todayRecord,
    isCheckedIn,
    isCheckedOut,
    punchIn,
    punchOut,
    summary,
    totalLeaveAvailable,
    overtimeSummary,
    upcomingHoliday,
    unreadNotificationsCount,
    refreshData,
  } = useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [punchFeedback, setPunchFeedback] = useState<string | null>(null);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const displayHoliday = upcomingHoliday || (holidaysData && holidaysData.length > 0 ? holidaysData[0] : null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handlePunchToggle = async () => {
    setPunchFeedback(null);
    if (!isCheckedIn) {
      const res = await punchIn();
      if (res.success && res.record) {
        setPunchFeedback(`Punched in at ${res.record.checkIn} (${res.record.statusLabel})`);
      } else {
        setPunchFeedback(res.error || 'Failed to punch in');
      }
    } else if (!isCheckedOut) {
      // Show confirmation modal before punching out
      setShowPunchOutModal(true);
    }
  };

  const handleConfirmPunchOut = async () => {
    setIsPunchingOut(true);
    const res = await punchOut();
    setIsPunchingOut(false);
    setShowPunchOutModal(false);
    if (res.success && res.record) {
      setPunchFeedback(`Punched out at ${res.record.checkOut}`);
    } else {
      setPunchFeedback(res.error || 'Failed to punch out');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Fixed Sticky Header with Status Bar Inset */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 22,
            paddingRight: 18,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Avatar
                uri={user?.avatarUrl}
                name={user ? `${user.firstName} ${user.lastName}` : 'Sujay Verma'}
                size={46}
                showStatusDot
              />
            </TouchableOpacity>

            <View>
              <Text className="text-[11px] font-semibold text-slate-500">
                {getGreeting()},
              </Text>
              <Text className="text-base font-black text-slate-900 leading-tight">
                {user ? `${user.firstName} ${user.lastName}` : 'Sujay Verma'}
              </Text>
              <Text className="text-[11px] text-blue-600 font-semibold">
                {user?.designation || 'Senior Full Stack Engineer'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#F8FAFC',
              borderColor: '#E2E8F0',
              borderWidth: 1,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#0F172A" />
            {unreadNotificationsCount > 0 && (
              <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
            )}
          </TouchableOpacity>
        </View>
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
        {/* Date & Shift Info Pill */}
        <View className="flex-row items-center justify-between bg-blue-50/80 px-3.5 py-2.5 rounded-xl mb-4 border border-blue-100">
          <View className="flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={15} color="#2563EB" />
            <Text className="text-xs font-bold text-blue-900">
              {todayDateString}
            </Text>
          </View>
          <Text className="text-[11px] font-semibold text-blue-700">
            Shift: 10:00 AM - 07:00 PM
          </Text>
        </View>

        {/* Primary Card: Today's Live Attendance Punch */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                className={`w-2.5 h-2.5 rounded-full ${
                  isCheckedIn && !isCheckedOut
                    ? 'bg-emerald-500 ring-4 ring-emerald-100'
                    : isCheckedOut
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
              />
              <Text className="text-xs uppercase font-bold tracking-wider text-slate-500">
                {isCheckedOut
                  ? 'Shift Completed'
                  : isCheckedIn
                  ? 'Currently Checked In'
                  : 'Not Checked In'}
              </Text>
            </View>

            <Badge
              label={todayRecord?.statusLabel || 'Awaiting Punch'}
              variant={
                todayRecord?.status === 'ON_TIME'
                  ? 'success'
                  : todayRecord?.status === 'WITHIN_BUFFER'
                  ? 'warning'
                  : todayRecord?.status === 'LATE'
                  ? 'warning'
                  : todayRecord?.status === 'HALF_DAY'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            />
          </View>

          {/* Time Metrics Grid */}
          <View className="flex-row items-center justify-between my-2 py-3 border-y border-slate-100">
            <View className="items-center flex-1">
              <Text className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                Check In
              </Text>
              <Text className="text-lg font-black text-slate-900">
                {todayRecord?.checkIn || '--:--'}
              </Text>
            </View>

            <View className="w-[1px] h-8 bg-slate-200" />

            <View className="items-center flex-1">
              <Text className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                Expected Out
              </Text>
              <Text className="text-lg font-black text-blue-600">
                {todayRecord?.expectedCheckOutTime
                  ? todayRecord.expectedCheckOutTime === '19:30'
                    ? '07:30 PM'
                    : '07:00 PM'
                  : '07:00 PM'}
              </Text>
            </View>

            <View className="w-[1px] h-8 bg-slate-200" />

            <View className="items-center flex-1">
              <Text className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                Check Out
              </Text>
              <Text className="text-lg font-black text-slate-900">
                {todayRecord?.checkOut || '--:--'}
              </Text>
            </View>
          </View>

          {/* Lunch & Work Duration Breakdown */}
          <View className="flex-row items-center justify-between text-xs text-slate-500 mb-4 px-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="restaurant-outline" size={13} color="#64748B" />
              <Text className="text-xs text-slate-500">Lunch Break: 1h (Standard)</Text>
            </View>
            <Text className="text-xs font-bold text-slate-700">
              {todayRecord?.workDurationMinutes
                ? `Worked: ${(todayRecord.workDurationMinutes / 60).toFixed(1)} hrs`
                : 'Buffer: 20 min permitted'}
            </Text>
          </View>

          {/* Punch Action Button */}
          {!isCheckedOut ? (
            <Button
              label={isCheckedIn ? 'Punch Out' : 'Punch In Now'}
              size="lg"
              variant={isCheckedIn ? 'destructive' : 'primary'}
              onPress={handlePunchToggle}
              icon={
                <Ionicons
                  name={isCheckedIn ? 'log-out-outline' : 'finger-print-outline'}
                  size={22}
                  color="#ffffff"
                />
              }
            />
          ) : (
            <View className="bg-emerald-50 p-3 rounded-2xl items-center flex-row justify-center gap-2 border border-emerald-200">
              <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
              <Text className="text-xs font-bold text-emerald-800">
                Daily Attendance Logged Successfully
              </Text>
            </View>
          )}

          {punchFeedback && (
            <Text className="text-xs text-blue-600 text-center mt-2 font-semibold">
              {punchFeedback}
            </Text>
          )}
        </Card>

        {/* Quick Action Shortcuts */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Quick Actions
        </Text>
        <View className="flex-row gap-2.5 mb-4">
          <TouchableOpacity
            onPress={() => router.push('/leave/apply')}
            activeOpacity={0.7}
            className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 items-center shadow-xs"
          >
            <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mb-1">
              <Ionicons name="calendar-outline" size={18} color="#7C3AED" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Apply Leave
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/attendance/history')}
            activeOpacity={0.7}
            className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 items-center shadow-xs"
          >
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mb-1">
              <Ionicons name="list-outline" size={18} color="#2563EB" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/holidays')}
            activeOpacity={0.7}
            className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 items-center shadow-xs"
          >
            <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center mb-1">
              <Ionicons name="calendar" size={18} color="#059669" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Holidays
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/overtime')}
            activeOpacity={0.7}
            className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 items-center shadow-xs"
          >
            <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center mb-1">
              <Ionicons name="time-outline" size={18} color="#D97706" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Overtime
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/salary' as any)}
            activeOpacity={0.7}
            className="flex-1 bg-white p-3 rounded-2xl border border-slate-200 items-center shadow-xs"
          >
            <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mb-1">
              <Ionicons name="calculator-outline" size={18} color="#2563EB" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Salary
            </Text>
          </TouchableOpacity>
        </View>

        {/* Salary & Deductions Protection Banner */}
        <TouchableOpacity
          onPress={() => router.push('/salary' as any)}
          activeOpacity={0.8}
          className="bg-slate-900 p-4 rounded-2xl mb-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700">
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-white">
                Salary & Leave Protection
              </Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">
                Half-days auto-adjusted with leaves before salary deductions
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>


        {/* Monthly Summary Statistics Grid */}
        <View className="flex-row items-center justify-between mb-2.5 px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Monthly Performance (Nov 2026)
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/attendance')} activeOpacity={0.7}>
            <Text className="text-xs font-bold text-blue-600">
              View Calendar
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2.5 mb-3">
          <Card className="flex-1 p-3">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-[11px] font-bold text-slate-500">Days Present</Text>
              <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
            </View>
            <Text className="text-2xl font-black text-slate-900">
              {summary.presentDays + (isCheckedIn ? 1 : 0)}
            </Text>
            <Text className="text-[10px] text-slate-400">of {summary.totalWorkingDays} working days</Text>
          </Card>

          <Card className="flex-1 p-3">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-[11px] font-bold text-slate-500">Late Allowances</Text>
              <Ionicons name="alert-circle-outline" size={15} color="#D97706" />
            </View>
            <Text className="text-2xl font-black text-amber-600">
              {summary.lateAllowancesRemaining} / 3
            </Text>
            <Text className="text-[10px] text-slate-400">allowances remaining</Text>
          </Card>
        </View>

        <View className="flex-row gap-2.5 mb-4">
          <Card className="flex-1 p-3">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-[11px] font-bold text-slate-500">Leave Balance</Text>
              <Ionicons name="briefcase-outline" size={15} color="#7C3AED" />
            </View>
            <Text className="text-2xl font-black text-purple-600">
              {totalLeaveAvailable}
            </Text>
            <Text className="text-[10px] text-slate-400">days available</Text>
          </Card>

          <Card className="flex-1 p-3">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="text-[11px] font-bold text-slate-500">Approved OT</Text>
              <Ionicons name="time-outline" size={15} color="#2563EB" />
            </View>
            <Text className="text-2xl font-black text-blue-600">
              {overtimeSummary.totalApprovedHours}
            </Text>
            <Text className="text-[10px] text-slate-400">{overtimeSummary.reimbursementPendingCount} pending payout</Text>
          </Card>
        </View>

        {/* Upcoming Holiday Card */}
        {displayHoliday && (
          <TouchableOpacity
            onPress={() => router.push('/holidays')}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#0F172A',
              borderRadius: 16,
              padding: 14,
            }}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-blue-500/20 items-center justify-center">
                <Ionicons name="sparkles" size={18} color="#60A5FA" />
              </View>
              <View>
                <Text className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                  Upcoming Holiday • Tap to View All
                </Text>
                <Text className="text-sm font-bold text-white mt-0.5">
                  {displayHoliday.name}
                </Text>
                <Text className="text-xs text-slate-400">
                  {displayHoliday.date} ({displayHoliday.day})
                </Text>
              </View>
            </View>
            <View className="items-end gap-1">
              <Badge label={displayHoliday.type} variant="info" size="sm" />
              <View className="flex-row items-center gap-0.5 mt-0.5">
                <Text className="text-[10px] text-blue-400 font-semibold">Calendar</Text>
                <Ionicons name="chevron-forward" size={12} color="#60A5FA" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Confirmation Modal to prevent accidental punch out */}
      <PunchOutModal
        visible={showPunchOutModal}
        checkInTime={todayRecord?.checkIn}
        expectedCheckOutTime={todayRecord?.expectedCheckOutTime || '19:00'}
        isLoading={isPunchingOut}
        onConfirm={handleConfirmPunchOut}
        onCancel={() => setShowPunchOutModal(false)}
      />
    </View>
  );
};
