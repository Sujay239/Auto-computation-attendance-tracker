import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const AttendanceDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { records } = useAttendance();

  const record = records.find((r) => r.id === id) || records[0];

  if (!record) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
          <Header title="Attendance Details" showBack />
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-500 font-medium">Record not found.</Text>
        </View>
      </View>
    );
  }

  const isLeaveOrAbsenceOrHalfDay =
    record.status === 'ON_LEAVE' ||
    record.status === 'LEAVE' ||
    record.status === 'ABSENT' ||
    record.status === 'HALF_DAY' ||
    record.leaveDeduction !== undefined ||
    record.salaryDeduction !== undefined;

  const isApprovedLeave = record.isApprovedLeave || record.status === 'ON_LEAVE' || record.status === 'LEAVE';
  const isUnapprovedAbsence = record.status === 'ABSENT' && !record.isApprovedLeave;
  const leaveDeductionDays = record.leaveDeduction ?? (isApprovedLeave ? 1 : 0);
  const salaryDeductionAmount = record.salaryDeduction ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title={`Audit: ${record.date}`}
          subtitle={`Employee Shift Log • ${record.statusLabel}`}
          showBack
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[10px] uppercase font-bold text-slate-400">
              Shift Evaluation
            </Text>
            <Badge
              label={record.statusLabel}
              variant={
                record.status === 'ON_TIME' || record.status === 'PRESENT'
                  ? 'success'
                  : record.status === 'WITHIN_BUFFER' || record.status === 'LATE'
                  ? 'warning'
                  : record.status === 'HALF_DAY'
                  ? 'danger'
                  : record.status === 'ON_LEAVE' || record.status === 'LEAVE'
                  ? 'neutral'
                  : record.status === 'ABSENT'
                  ? 'danger'
                  : 'neutral'
              }
            />
          </View>

          <Text className="text-2xl font-black text-slate-900">
            {record.date}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5 font-medium">
            Expected Checkout: {record.expectedCheckOutTime || '19:00'}
          </Text>

          {record.halfDayReason && (
            <View className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-200 flex-row gap-2">
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 1 }} />
              <Text className="text-xs text-rose-700 font-medium flex-1">
                {record.halfDayReason}
              </Text>
            </View>
          )}
        </Card>

        {/* Section 8B: Absence & Leave Deduction Details */}
        {isLeaveOrAbsenceOrHalfDay && (
          <Card className="mb-4 bg-slate-50/80 border-slate-200">
            <View className="flex-row items-center gap-2 mb-2.5">
              <Ionicons
                name={isApprovedLeave ? 'shield-checkmark' : 'alert-circle'}
                size={18}
                color={isApprovedLeave ? '#059669' : '#DC2626'}
              />
              <Text className="text-xs uppercase font-bold text-slate-800">
                Leave & Salary Deduction Audit
              </Text>
            </View>

            <View className="space-y-2">
              <View className="flex-row justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-xs text-slate-500 font-medium">Policy Classification:</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {isApprovedLeave
                    ? 'Approved Leave'
                    : isUnapprovedAbsence
                    ? 'Unapproved Absence'
                    : 'Late / Half-Day Penalty'}
                </Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-xs text-slate-500 font-medium">Leave Balance Utilized:</Text>
                <Text className="text-xs font-bold text-emerald-700">
                  {leaveDeductionDays > 0 ? `${leaveDeductionDays} Day(s) Consumed` : 'None (0 Days)'}
                </Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-xs text-slate-500 font-medium">Salary Deduction:</Text>
                <Text
                  className={`text-xs font-black ${
                    salaryDeductionAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {salaryDeductionAmount > 0
                    ? `Deducted: ₹${salaryDeductionAmount.toLocaleString()}`
                    : '₹0.00 (Protected by Leave)'}
                </Text>
              </View>

              {record.leaveRequestId && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-xs text-slate-500 font-medium">Leave Request Ref:</Text>
                  <Text className="text-xs font-bold text-blue-600">{record.leaveRequestId}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Duration Breakdown Card */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-3">
            Working Time & Lunch Breakdown
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Gross In-Office Time:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {record.totalDurationMinutes
                  ? `${(record.totalDurationMinutes / 60).toFixed(1)} hrs (${record.totalDurationMinutes} mins)`
                  : 'In Progress'}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="restaurant-outline" size={14} color="#64748B" />
                <Text className="text-xs text-slate-500 font-medium">Lunch Break (Non-billable):</Text>
              </View>
              <Text className="text-xs font-bold text-slate-700">
                - {record.lunchDurationMinutes || 60} mins
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs font-bold text-slate-700">
                Net Billable Work Hours:
              </Text>
              <Text className="text-sm font-extrabold text-blue-600">
                {record.workDurationMinutes
                  ? `${(record.workDurationMinutes / 60).toFixed(1)} hrs`
                  : 'Calculating...'}
              </Text>
            </View>

            {record.overtimeMinutes && record.overtimeMinutes > 0 ? (
              <View className="flex-row justify-between py-2">
                <Text className="text-xs font-bold text-purple-600">
                  Approved / Pending Overtime:
                </Text>
                <Text className="text-xs font-bold text-purple-600">
                  +{record.overtimeMinutes} mins ({Math.floor(record.overtimeMinutes / 60)}h {record.overtimeMinutes % 60}m)
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Biometric Punch Events */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-2.5">
            Biometric & App Punch Log
          </Text>

          {record.punches && record.punches.length > 0 ? (
            <View className="space-y-2.5">
              {record.punches.map((p, idx) => (
                <View key={p.id || idx} className="flex-row items-start gap-3 py-2 border-b border-slate-100 last:border-b-0">
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center mt-0.5 ${
                      p.type === 'IN'
                        ? 'bg-emerald-100'
                        : p.type === 'OUT'
                        ? 'bg-rose-100'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Ionicons
                      name={
                        p.type === 'IN'
                          ? 'log-in-outline'
                          : p.type === 'OUT'
                          ? 'log-out-outline'
                          : 'cafe-outline'
                      }
                      size={14}
                      color={p.type === 'IN' ? '#059669' : p.type === 'OUT' ? '#DC2626' : '#64748B'}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-slate-800">
                        {p.type === 'IN' ? 'Shift Check-In' : p.type === 'OUT' ? 'Shift Check-Out' : 'Break'}
                      </Text>
                      <Text className="text-xs font-black text-slate-900">
                        {p.timeString}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {p.location || 'Office Attendance Terminal'}
                    </Text>
                    {p.note && (
                      <Text className="text-[11px] text-blue-600 mt-0.5 font-medium">
                        {p.note}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-slate-400 text-center py-2 font-medium">
              No punch events logged for this day.
            </Text>
          )}
        </Card>

        {record.notes && (
          <Card className="bg-slate-100/70 border-slate-200">
            <Text className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Admin & Policy Remark
            </Text>
            <Text className="text-xs text-slate-600 font-medium">
              {record.notes}
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};
