import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/common/Header';
import { holidayService } from '../../services/holidayService';
import { PunchOutModal } from '../../components/attendance/PunchOutModal';

export const AttendanceScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todayRecord, isCheckedIn, isCheckedOut, punchIn, punchOut, records, summary, refreshData, isLoading } =
    useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [punchMessage, setPunchMessage] = useState<string | null>(null);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handlePunch = async () => {
    setPunchMessage(null);
    if (!isCheckedIn) {
      const res = await punchIn();
      if (res.success && res.record) {
        setPunchMessage(`Checked in at ${res.record.checkIn} - ${res.record.statusLabel}`);
      } else {
        setPunchMessage(res.error || 'Check-in failed');
      }
    } else if (!isCheckedOut) {
      // Require confirmation before punching out
      setShowPunchOutModal(true);
    }
  };

  const handleConfirmPunchOut = async () => {
    setIsPunchingOut(true);
    const res = await punchOut();
    setIsPunchingOut(false);
    setShowPunchOutModal(false);
    if (res.success && res.record) {
      setPunchMessage(`Checked out at ${res.record.checkOut}`);
    } else {
      setPunchMessage(res.error || 'Check-out failed');
    }
  };

  // Calendar days generation for current month demo (Nov 2026)
  const currentMonthDays = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-11-${dayNum.toString().padStart(2, '0')}`;
    const record = records.find((r) => r.date === dateStr);
    const holiday = holidayService.getHolidayByDate(dateStr);
    const dayOfWeek = (dayNum + 6) % 7; // demo offset (Nov 1 2026 was Sunday)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let statusType = 'UPCOMING';
    if (holiday) {
      statusType = 'HOLIDAY';
    } else if (record) {
      statusType = record.status;
    } else if (isWeekend) {
      statusType = 'WEEKEND';
    } else if (dayNum <= 2) {
      statusType = 'PRESENT';
    }

    return { dayNum, dateStr, record, isWeekend, holiday, statusType };
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Attendance Management"
          subtitle="Daily Clock-In, Monthly Shift & Policy Records"
          rightAction={
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={() => router.push('/holidays')}
                className="px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 flex-row items-center gap-1"
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={12} color="#7C3AED" />
                <Text className="text-xs font-bold text-purple-700">Holidays</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/attendance/history')}
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200"
                activeOpacity={0.7}
              >
                <Text className="text-xs font-bold text-blue-600">History</Text>
              </TouchableOpacity>
            </View>
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
        {isLoading && !todayRecord ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-xs font-bold text-slate-500 mt-3">
              Syncing live attendance data...
            </Text>
          </View>
        ) : (
          <>
            {/* Today's Live Attendance Clock Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Today's Attendance Status
              </Text>
              <Text className="text-xl font-black text-slate-900 mt-0.5">
                {isCheckedOut
                  ? 'Completed for Today'
                  : isCheckedIn
                  ? 'Active Shift'
                  : 'Ready to Punch In'}
              </Text>
            </View>

            <Badge
              label={todayRecord?.statusLabel || 'Not Punched'}
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
            />
          </View>

          {/* Key Timestamps Grid */}
          <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mb-3.5">
            <View className="flex-row justify-between mb-2.5">
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">
                  Punch In
                </Text>
                <Text className="text-base font-black text-slate-800">
                  {todayRecord?.checkIn || '--:--'}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {todayRecord?.checkIn ? 'Official entry' : 'Opening 10:00 AM'}
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">
                  Expected Out
                </Text>
                <Text className="text-base font-black text-blue-600">
                  {todayRecord?.expectedCheckOutTime
                    ? todayRecord.expectedCheckOutTime === '19:30'
                      ? '07:30 PM'
                      : '07:00 PM'
                    : '07:00 PM'}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {todayRecord?.expectedCheckOutTime === '19:30'
                    ? '30m buffer compensation'
                    : 'Standard closing'}
                </Text>
              </View>

              <View className="flex-1 items-end">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">
                  Punch Out
                </Text>
                <Text className="text-base font-black text-slate-800">
                  {todayRecord?.checkOut || '--:--'}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {todayRecord?.checkOut ? 'Recorded' : 'Pending exit'}
                </Text>
              </View>
            </View>

            {/* Shift Breakdown Row */}
            <View className="pt-2.5 border-t border-slate-200/80 flex-row justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="restaurant-outline" size={13} color="#64748B" />
                <Text className="text-xs text-slate-500 font-medium">Lunch Break: 1h</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="shield-checkmark-outline" size={13} color="#059669" />
                <Text className="text-xs font-bold text-slate-700">
                  {todayRecord?.workDurationMinutes
                    ? `Net Worked: ${(todayRecord.workDurationMinutes / 60).toFixed(1)} hrs`
                    : 'Grace Buffer: up to 10:20 AM'}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button */}
          {!isCheckedOut ? (
            <Button
              label={isCheckedIn ? 'Punch Out & End Shift' : 'Punch In (Office Gate)'}
              size="lg"
              variant={isCheckedIn ? 'destructive' : 'primary'}
              onPress={handlePunch}
              icon={
                <Ionicons
                  name={isCheckedIn ? 'log-out-outline' : 'finger-print'}
                  size={22}
                  color="#ffffff"
                />
              }
            />
          ) : (
            <View className="bg-emerald-50 p-3.5 rounded-2xl flex-row items-center justify-center gap-2 border border-emerald-200">
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text className="text-xs font-bold text-emerald-800">
                You have logged attendance for today.
              </Text>
            </View>
          )}

          {punchMessage && (
            <Text className="text-xs text-blue-600 text-center mt-2 font-semibold">
              {punchMessage}
            </Text>
          )}
        </Card>

        {/* Company Timings & Late Policy Rules Card (Section 7) */}
        <View
          style={{
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
          }}
          className="mb-4"
        >
          <View className="flex-row items-center gap-2 mb-2.5">
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Company Attendance Rules & Buffers
            </Text>
          </View>

          <View className="space-y-1.5">
            <View className="flex-row justify-between py-1 border-b border-blue-100">
              <Text className="text-xs text-slate-600 font-medium">Office Opening:</Text>
              <Text className="text-xs font-bold text-slate-900">10:00 AM</Text>
            </View>
            <View className="flex-row justify-between py-1 border-b border-blue-100">
              <Text className="text-xs text-slate-600 font-medium">Grace Buffer Limit:</Text>
              <Text className="text-xs font-bold text-amber-700">10:20 AM (Must stay until 7:30 PM)</Text>
            </View>
            <View className="flex-row justify-between py-1 border-b border-blue-100">
              <Text className="text-xs text-slate-600 font-medium">Monthly Late Allowance:</Text>
              <Text className="text-xs font-bold text-slate-900">
                {summary.lateAllowancesRemaining} of 3 remaining (Max 10:45 AM)
              </Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-xs text-slate-600 font-medium">Cutoff for Half-Day:</Text>
              <Text className="text-xs font-bold text-rose-600">Arrival after 10:45 AM</Text>
            </View>
          </View>
        </View>

        {/* Today's Punch Timeline */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Today's Punch Timeline
        </Text>
        <Card className="mb-4">
          {todayRecord?.punches && todayRecord.punches.length > 0 ? (
            <View className="divide-y divide-slate-100">
              {todayRecord.punches.map((punch, idx) => (
                <View key={punch.id || idx} className="py-2.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center ${
                        punch.type === 'IN'
                          ? 'bg-emerald-100'
                          : punch.type === 'OUT'
                          ? 'bg-rose-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      <Ionicons
                        name={
                          punch.type === 'IN'
                            ? 'enter-outline'
                            : punch.type === 'OUT'
                            ? 'exit-outline'
                            : 'restaurant-outline'
                        }
                        size={15}
                        color={punch.type === 'IN' ? '#059669' : punch.type === 'OUT' ? '#E11D48' : '#64748B'}
                      />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-slate-800">
                        {punch.type === 'IN' ? 'Punch In' : punch.type === 'OUT' ? 'Punch Out' : 'Break'}
                      </Text>
                      <Text className="text-[10px] text-slate-400 font-medium">{punch.location || 'Main Biometric'}</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-slate-800">
                    {punch.timeString}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-slate-400 text-center py-3 font-medium">
              No punch events recorded for today yet.
            </Text>
          )}
        </Card>

        {/* Monthly Attendance Calendar */}
        <View className="flex-row items-center justify-between mb-2.5 px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            November 2026 Calendar View
          </Text>
          <Text className="text-xs text-slate-400 font-medium">30 Days</Text>
        </View>

        <Card className="mb-4 p-4">
          {/* Weekday Header */}
          <View className="flex-row justify-between mb-2 pb-2 border-b border-slate-100">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text
                key={idx}
                className="w-9 text-center text-[11px] font-bold text-slate-400"
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View className="flex-row flex-wrap justify-between">
            {currentMonthDays.map((item) => {
              const getDayBg = () => {
                if (item.statusType === 'HOLIDAY')
                  return 'bg-purple-100 border-purple-300';
                if (item.statusType === 'ON_TIME' || item.statusType === 'PRESENT')
                  return 'bg-emerald-100 border-emerald-300';
                if (item.statusType === 'WITHIN_BUFFER')
                  return 'bg-blue-100 border-blue-300';
                if (item.statusType === 'LATE')
                  return 'bg-amber-100 border-amber-300';
                if (item.statusType === 'HALF_DAY')
                  return 'bg-rose-100 border-rose-300';
                if (item.isWeekend)
                  return 'bg-slate-100/70 border-transparent';
                return 'bg-white border-slate-200';
              };

              return (
                <TouchableOpacity
                  key={item.dayNum}
                  onPress={() => {
                    if (item.holiday) {
                      router.push('/holidays');
                    } else if (item.record) {
                      router.push({
                        pathname: '/attendance/details',
                        params: { id: item.record.id },
                      });
                    }
                  }}
                  activeOpacity={0.7}
                  className={`w-9 h-9 items-center justify-center rounded-xl mb-2 border ${getDayBg()}`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      item.statusType === 'HOLIDAY'
                        ? 'text-purple-800'
                        : item.isWeekend
                        ? 'text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Calendar Status Legend */}
          <View className="flex-row flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-[10px] text-slate-600 font-medium">On Time</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Within Buffer</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Late Allowance</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Half Day</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Holiday (Exempt)</Text>
            </View>
          </View>
        </Card>
          </>
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
