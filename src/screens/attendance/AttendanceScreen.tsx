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
import { useAttendance } from '../../context/AttendanceContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Header } from '../../components/common/Header';
import { holidayService } from '../../services/holidayService';
import { leaveService } from '../../services/leaveService';
import { payrollCalculationEngine } from '../../services/payrollCalculationEngine';
import { PunchOutModal } from '../../components/attendance/PunchOutModal';

export const AttendanceScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { todayRecord, isCheckedIn, isCheckedOut, punchIn, punchOut, records, summary, refreshData } =
    useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [punchMessage, setPunchMessage] = useState<string | null>(null);
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);
  const [isPunchingIn, setIsPunchingIn] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isPast230PM = currentMinutes >= 870;

  // Section 5: Check-in restriction on approved leave
  const leaveCheck = payrollCalculationEngine.canEmployeeCheckIn(
    todayStr,
    currentTimeStr,
    leaveService.getRequests()
  );
  const isFullDayLeave = !leaveCheck.allowed && leaveCheck.leaveType === 'FULL_DAY';
  const isHalfDayLeaveBlocked =
    !leaveCheck.allowed &&
    (leaveCheck.leaveType === 'FIRST_HALF' || leaveCheck.leaveType === 'SECOND_HALF');

  const isAbsentCase = todayRecord?.status === 'ABSENT' || (!isCheckedIn && !isCheckedOut && isPast230PM);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handlePunch = async () => {
    setPunchMessage(null);
    if (!isCheckedIn) {
      if (isFullDayLeave) {
        setPunchMessage(leaveCheck.reason || 'Check-in is disabled because you have approved full-day leave today.');
        return;
      }
      if (isHalfDayLeaveBlocked) {
        setPunchMessage(leaveCheck.reason || 'Punch-in is restricted during approved half-day window.');
        return;
      }
      if (isPast230PM) {
        setPunchMessage('Punch-in closed after 2:30 PM. You have been directly marked as Absent for today.');
        return;
      }
      setIsPunchingIn(true);
      try {
        const res = await punchIn();
        if (res.success && res.record) {
          setPunchMessage(`Checked in at ${res.record.checkIn} - ${res.record.statusLabel}`);
        } else {
          setPunchMessage(res.error || 'Check-in failed');
        }
      } catch (err: any) {
        setPunchMessage(err.message || 'Check-in failed');
      } finally {
        setIsPunchingIn(false);
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

  // Calendar days generation for current month (Nov 2026) - Structured in strict 7-day rows
  const currentYear = 2026;
  const currentMonthIdx = 10; // November (0-indexed)
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    const record = records.find((r) => r.date === dateStr);
    const holiday = holidayService.getHolidayByDate(dateStr);
    const dayOfWeek = new Date(currentYear, currentMonthIdx, dayNum).getDay();
    const isWeekend = dayOfWeek === 0;

    let statusType = 'UPCOMING';
    if (holiday && holiday.isOfficeClosed !== false) {
      statusType = 'HOLIDAY';
    } else if (record) {
      statusType = record.status;
    } else if (isWeekend) {
      statusType = 'WEEKEND';
    }

    calendarCells.push({ dayNum, dateStr, record, isWeekend, holiday, statusType });
  }

  // Chunk into exact 7-day rows for perfect grid alignment
  const calendarWeeks = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    const week = calendarCells.slice(i, i + 7);
    while (week.length < 7) {
      week.push(null);
    }
    calendarWeeks.push(week);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Attendance Management"
          showBack
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
                <Text className="text-xs font-bold text-blue-700">Audit</Text>
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
        {/* Today's Live Clock-In Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-[10px] uppercase font-bold text-slate-400">
                Shift Status Today
              </Text>
              <Text className="text-xs font-bold text-slate-700 mt-0.5">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Badge
              label={
                isFullDayLeave
                  ? 'On Approved Leave'
                  : todayRecord?.statusLabel || (isAbsentCase ? 'Absent (Closed)' : 'Awaiting Punch')
              }
              variant={
                isFullDayLeave
                  ? 'neutral'
                  : todayRecord?.status === 'ON_TIME' || todayRecord?.status === 'PRESENT'
                  ? 'success'
                  : todayRecord?.status === 'WITHIN_BUFFER'
                  ? 'warning'
                  : todayRecord?.status === 'LATE'
                  ? 'warning'
                  : todayRecord?.status === 'HALF_DAY'
                  ? 'danger'
                  : isAbsentCase
                  ? 'danger'
                  : 'neutral'
              }
            />
          </View>

          {/* Time & Shift Details Box */}
          <View className="bg-slate-50 p-3.5 rounded-2xl mb-4 border border-slate-100">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">
                  Punch In
                </Text>
                <Text className="text-base font-black text-slate-800">
                  {todayRecord?.checkIn || '--:--'}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {todayRecord?.checkIn ? 'Official recorded' : 'Standard 10:00 AM'}
                </Text>
              </View>

              <View className="flex-1 items-center">
                <Text className="text-[10px] text-slate-400 uppercase font-bold">
                  Expected Out
                </Text>
                <Text className="text-base font-black text-blue-600">
                  {todayRecord?.expectedCheckOutTime || '19:00'}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  {todayRecord?.status === 'WITHIN_BUFFER' || todayRecord?.status === 'LATE'
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

          {/* Section 5: Action Button & Punch Restriction Enforcement */}
          {isFullDayLeave ? (
            <View className="bg-indigo-50 p-3.5 rounded-2xl flex-row items-center justify-between border border-indigo-200">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <Ionicons name="calendar" size={22} color="#4F46E5" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-indigo-950">
                    On Approved Full-Day Leave
                  </Text>
                  <Text className="text-[11px] text-indigo-700 mt-0.5 leading-tight">
                    Attendance check-in is disabled. Today is scheduled as approved leave.
                  </Text>
                </View>
              </View>
              <Badge label="ON LEAVE" variant="neutral" size="sm" />
            </View>
          ) : isHalfDayLeaveBlocked ? (
            <View className="bg-indigo-50 p-3.5 rounded-2xl flex-row items-center justify-between border border-indigo-200">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <Ionicons name="time" size={22} color="#4F46E5" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-indigo-950">
                    Half-Day Leave Active
                  </Text>
                  <Text className="text-[11px] text-indigo-700 mt-0.5 leading-tight">
                    {leaveCheck.reason || 'Check-in is permitted after 02:00 PM for the second half.'}
                  </Text>
                </View>
              </View>
              <Badge label="HALF DAY" variant="warning" size="sm" />
            </View>
          ) : isAbsentCase && !isCheckedIn ? (
            <View className="bg-rose-50 p-3.5 rounded-2xl flex-row items-center justify-between border border-rose-200">
              <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                <Ionicons name="close-circle" size={22} color="#DC2626" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-rose-900">
                    Punch-in Closed (Marked Absent)
                  </Text>
                  <Text className="text-[11px] text-rose-700 mt-0.5 leading-tight">
                    Cutoff was 02:30 PM. No check-ins permitted after cutoff.
                  </Text>
                </View>
              </View>
              <Badge label="ABSENT" variant="danger" size="sm" />
            </View>
          ) : !isCheckedOut ? (
            <Button
              label={isCheckedIn ? 'Punch Out & End Shift' : (isPunchingIn ? 'Punching In...' : 'Punch In (Office Gate)')}
              size="lg"
              variant={isCheckedIn ? 'destructive' : 'primary'}
              onPress={handlePunch}
              disabled={isPunchingIn}
              isLoading={isPunchingIn}
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

        {/* Company Timings & Late Policy Rules Card */}
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

        {/* Monthly Attendance Calendar */}
        <View className="flex-row items-center justify-between mb-2.5 px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            November 2026 Calendar View
          </Text>
          <Text className="text-xs text-slate-400 font-medium">30 Days</Text>
        </View>

        <Card className="mb-4 p-4">
          {/* Weekday Header (Strict 7 Columns) */}
          <View className="flex-row w-full mb-2 pb-2 border-b border-slate-100">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <View key={idx} className="flex-1 items-center justify-center">
                <Text
                  className={`text-[11px] font-bold ${
                    idx === 0 ? 'text-rose-500' : 'text-slate-400'
                  }`}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid (Strict 7 Days Per Row) */}
          <View className="w-full">
            {calendarWeeks.map((week, weekIdx) => (
              <View key={`week-${weekIdx}`} className="flex-row w-full my-1">
                {week.map((item, dayIdx) => {
                  if (!item) {
                    return (
                      <View
                        key={`blank-${weekIdx}-${dayIdx}`}
                        className="flex-1 items-center justify-center"
                      />
                    );
                  }

                  // Section 8B: Accurate Color Representation of All Statuses
                  const getDayBg = () => {
                    if (item.statusType === 'HOLIDAY')
                      return 'bg-purple-100 border-purple-300';
                    if (item.statusType === 'ON_LEAVE' || item.statusType === 'LEAVE')
                      return 'bg-indigo-100 border-indigo-400';
                    if (item.statusType === 'ON_TIME' || item.statusType === 'PRESENT')
                      return 'bg-emerald-100 border-emerald-300';
                    if (item.statusType === 'WITHIN_BUFFER')
                      return 'bg-blue-100 border-blue-300';
                    if (item.statusType === 'LATE')
                      return 'bg-amber-100 border-amber-300';
                    if (item.statusType === 'HALF_DAY')
                      return 'bg-orange-100 border-orange-300';
                    if (item.statusType === 'ABSENT')
                      return 'bg-rose-100 border-rose-300';
                    if (item.isWeekend)
                      return 'bg-slate-100/70 border-transparent';
                    return 'bg-white border-slate-200';
                  };

                  return (
                    <View
                      key={item.dateStr}
                      className="flex-1 items-center justify-center"
                    >
                      <TouchableOpacity
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
                        className={`w-9 h-9 items-center justify-center rounded-xl border ${getDayBg()}`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            item.statusType === 'HOLIDAY'
                              ? 'text-purple-800'
                              : item.statusType === 'ON_LEAVE' || item.statusType === 'LEAVE'
                              ? 'text-indigo-800'
                              : item.statusType === 'ABSENT'
                              ? 'text-rose-700'
                              : item.isWeekend
                              ? 'text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {item.dayNum}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Calendar Status Legend (Section 8B) */}
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
              <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Half Day</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <Text className="text-[10px] text-slate-600 font-medium">On Leave</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Absent</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <Text className="text-[10px] text-slate-600 font-medium">Holiday</Text>
            </View>
          </View>
        </Card>
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
