import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { leaveService } from '../../services/leaveService';
import { LeaveType, LeaveDurationType } from '../../types/leave';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { DatePickerModal } from '../../components/common/DatePickerModal';

export const ApplyLeaveScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaveBalances } = useAttendance();
  const casualBal = leaveBalances.find((b) => b.type === 'CASUAL')?.available ?? 12;
  const sickBal = leaveBalances.find((b) => b.type === 'SICK')?.available ?? 5;

  // Helper to get initial valid non-Sunday date (Mon-Sat)
  const getInitialWorkingDate = () => {
    const dObj = new Date();
    if (dObj.getDay() === 0) {
      dObj.setDate(dObj.getDate() + 1); // Shift to Monday if today is Sunday
    }
    return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
      dObj.getDate()
    ).padStart(2, '0')}`;
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [durationType, setDurationType] = useState<LeaveDurationType>('FULL_DAY');
  const [startDate, setStartDate] = useState(getInitialWorkingDate());
  const [endDate, setEndDate] = useState(getInitialWorkingDate());
  const [reason, setReason] = useState('');
  const [ackWhatsapp, setAckWhatsapp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerField, setDatePickerField] = useState<'START' | 'END'>('START');

  const openStartDatePicker = () => {
    setDatePickerField('START');
    setShowDatePicker(true);
  };

  const openEndDatePicker = () => {
    setDatePickerField('END');
    setShowDatePicker(true);
  };

  const handleDatePicked = (selected: string) => {
    if (datePickerField === 'START') {
      setStartDate(selected);
      // If end date is earlier than start date, automatically adjust end date
      if (endDate < selected) {
        setEndDate(selected);
      }
    } else {
      if (selected >= startDate) {
        setEndDate(selected);
      } else {
        setEndDate(startDate);
      }
    }
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return 'Select Date';
    const [y, m, d] = dStr.split('-').map(Number);
    if (!y || !m || !d) return dStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate total working days in leave range (strictly excluding Sundays as regular weekly off)
  const getLeaveDaysBreakdown = () => {
    if (durationType !== 'FULL_DAY') {
      return { totalDays: 0.5, sundaysExcluded: 0 };
    }
    if (!startDate || !endDate) return { totalDays: 1, sundaysExcluded: 0 };

    const [y1, m1, d1] = startDate.split('-').map(Number);
    const [y2, m2, d2] = endDate.split('-').map(Number);
    const cur = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    let totalDays = 0;
    let sundaysExcluded = 0;

    while (cur <= end) {
      if (cur.getDay() === 0) {
        sundaysExcluded++; // Regular weekly off - zero deduction
      } else {
        totalDays++; // Monday through Saturday working days
      }
      cur.setDate(cur.getDate() + 1);
    }

    return { totalDays, sundaysExcluded };
  };

  const breakdown = getLeaveDaysBreakdown();

  const handleSubmit = async () => {
    setError(null);
    if (!reason.trim()) {
      setError('Please provide a reason for requesting this leave.');
      return;
    }
    if (!startDate) {
      setError('Please specify the start date.');
      return;
    }

    // Sunday validations
    const [sy, sm, sd] = startDate.split('-').map(Number);
    if (new Date(sy, sm - 1, sd).getDay() === 0) {
      setError('Sundays are regular weekly off days. You cannot apply for a leave on Sunday.');
      return;
    }

    if (durationType === 'FULL_DAY') {
      const [ey, em, ed] = endDate.split('-').map(Number);
      if (new Date(ey, em - 1, ed).getDay() === 0) {
        setError('Sundays are regular weekly off days. Leave end date cannot be Sunday.');
        return;
      }
      if (breakdown.totalDays === 0) {
        setError('Selected leave period falls entirely on Sundays (weekly off). No leave deduction is needed.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await leaveService.applyLeaveOnline({
        employeeId: user?.id || 'EMP-022',
        leaveType,
        durationType,
        startDate,
        endDate: durationType === 'FULL_DAY' ? endDate : startDate,
        daysCount: breakdown.totalDays,
        reason,
        whatsappNoticeAcknowledged: ackWhatsapp,
      });

      setIsLoading(false);
      if (res.success) {
        setIsSubmitted(true);
      } else {
        setError(res.error || 'Failed to submit leave request');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  if (isSubmitted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
          <Header title="Leave Application" showBack />
        </View>
        <View className="flex-1 items-center justify-center p-6 text-center">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <Ionicons name="checkmark-done" size={38} color="#059669" />
          </View>

          <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
            Leave Request Submitted
          </Text>

          <Text className="text-xs text-slate-500 text-center max-w-[280px] leading-relaxed mb-4">
            Your request for {breakdown.totalDays} working day{breakdown.totalDays > 1 ? 's' : ''} has been added to the review queue.
          </Text>

          <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 max-w-[320px]">
            <Text className="text-xs font-bold text-amber-900 mb-1">
              Next Step: Official WhatsApp Group
            </Text>
            <Text className="text-[11px] text-amber-800 leading-relaxed">
              Please also post your leave request in the official office WhatsApp group as mandated by company operations.
            </Text>
          </View>

          <Button
            label="Return to Leave Overview"
            onPress={() => router.replace('/(tabs)/leave')}
            size="md"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header title="Apply for Leave" subtitle="Submit internal leave request" showBack />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 180,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View className="bg-rose-50 border border-rose-200 p-3 rounded-xl mb-4 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text className="text-xs text-rose-700 font-medium flex-1">{error}</Text>
            </View>
          ) : null}

          {/* Leave Type Selector */}
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
            Leave Category
          </Text>

          <View className="flex-row gap-2.5 mb-4">
            {[
              { type: 'CASUAL' as LeaveType, label: 'Casual Leave', quota: '12d Annual', available: casualBal },
              { type: 'SICK' as LeaveType, label: 'Sick Leave', quota: '5d Annual', available: sickBal },
            ].map((typeItem) => {
              const type = typeItem.type;
              const isSelected = leaveType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setLeaveType(type)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                    borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                  }}
                  className="flex-1 py-3 px-2 rounded-2xl border items-center"
                >
                  <Text
                    style={{ color: isSelected ? '#FFFFFF' : '#334155' }}
                    className="text-xs font-bold"
                  >
                    {typeItem.label}
                  </Text>
                  <Text
                    style={{ color: isSelected ? '#DBEAFE' : '#64748B' }}
                    className="text-[10px] mt-0.5 font-medium"
                  >
                    {typeItem.available} Left • {typeItem.quota}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration Selector */}
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
            Duration Type
          </Text>

          <View className="flex-row gap-2 mb-4">
            {[
              { key: 'FULL_DAY', label: 'Full Day' },
              { key: 'FIRST_HALF', label: 'First Half' },
              { key: 'SECOND_HALF', label: 'Second Half' },
            ].map((d) => {
              const isSelected = durationType === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDurationType(d.key as LeaveDurationType)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: isSelected ? '#7C3AED' : '#FFFFFF',
                    borderColor: isSelected ? '#7C3AED' : '#E2E8F0',
                  }}
                  className="flex-1 py-2.5 px-1.5 rounded-xl border items-center"
                >
                  <Text
                    style={{ color: isSelected ? '#FFFFFF' : '#334155' }}
                    className="text-xs font-semibold"
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Interactive Date Pickers */}
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leave Schedule
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                <Text className="text-[10px] text-emerald-700 font-semibold">
                  Sundays Excluded (0 Deduction)
                </Text>
              </View>
            </View>

            {durationType === 'FULL_DAY' ? (
              <View>
                {/* Start Date Field */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5">
                    Start Date
                  </Text>
                  <TouchableOpacity
                    onPress={openStartDatePicker}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1">
                      <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                        <Ionicons name="calendar" size={17} color="#2563EB" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-slate-900">
                          {formatDisplayDate(startDate)}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {startDate} (Tap to change)
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* End Date Field */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5">
                    End Date
                  </Text>
                  <TouchableOpacity
                    onPress={openEndDatePicker}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1">
                      <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center">
                        <Ionicons name="calendar" size={17} color="#2563EB" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-slate-900">
                          {formatDisplayDate(endDate)}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {endDate} (Tap to change)
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Total Days Summary & Sunday Exclusion Notice */}
                <View className="bg-blue-50/80 border border-blue-200/80 p-3 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="hourglass-outline" size={14} color="#2563EB" />
                      <Text className="text-xs text-blue-900 font-semibold">Total Leave Deducted:</Text>
                    </View>
                    <Text className="text-sm font-black text-blue-700">
                      {breakdown.totalDays} Working Day{breakdown.totalDays > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {breakdown.sundaysExcluded > 0 && (
                    <Text className="text-[11px] text-emerald-700 font-semibold mt-1">
                      ✓ {breakdown.sundaysExcluded} Sunday{breakdown.sundaysExcluded > 1 ? 's' : ''} in this date range excluded from leave deduction.
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View>
                {/* Single Leave Date Field */}
                <View className="mb-3">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5">
                    Leave Date
                  </Text>
                  <TouchableOpacity
                    onPress={openStartDatePicker}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-3 rounded-xl"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1">
                      <View className="w-8 h-8 rounded-lg bg-purple-100 items-center justify-center">
                        <Ionicons name="calendar" size={17} color="#7C3AED" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-slate-900">
                          {formatDisplayDate(startDate)}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {startDate} (Tap to change)
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Shift Details */}
                <View className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex-row items-center gap-2.5">
                  <Ionicons name="time" size={18} color="#7C3AED" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-purple-900">
                      {durationType === 'FIRST_HALF'
                        ? 'First Half (Morning Shift)'
                        : 'Second Half (Afternoon Shift)'}
                    </Text>
                    <Text className="text-[11px] text-purple-700 mt-0.5">
                      {durationType === 'FIRST_HALF'
                        ? '10:00 AM – 02:00 PM (Counted as 0.5 Day Leave)'
                        : '03:00 PM – 07:00 PM (Counted as 0.5 Day Leave)'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Reason */}
          <Card className="mb-4">
            <Input
              label="Reason for Leave"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Urgent family commitments or medical appointment"
              multiline
              numberOfLines={3}
              containerClassName="mb-0"
            />
          </Card>

          {/* WhatsApp Acknowledgement Checkbox */}
          <TouchableOpacity
            onPress={() => setAckWhatsapp(!ackWhatsapp)}
            activeOpacity={0.7}
            className="flex-row items-start gap-2.5 mb-5 px-1"
          >
            <View
              className={`w-5 h-5 rounded-md border mt-0.5 items-center justify-center ${
                ackWhatsapp ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
              }`}
            >
              {ackWhatsapp ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
            </View>
            <Text className="text-xs text-slate-600 flex-1 leading-relaxed">
              I understand that in-app requests are for tracking, and I will also notify the official company WhatsApp group for approval.
            </Text>
          </TouchableOpacity>

          <Button
            label={isLoading ? 'Submitting...' : 'Submit Leave Request'}
            size="lg"
            isLoading={isLoading}
            onPress={handleSubmit}
            icon={<Ionicons name="send" size={18} color="#ffffff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal with Sunday Exclusion */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDatePicked}
        selectedDate={datePickerField === 'START' ? startDate : endDate}
        minDate={datePickerField === 'START' ? todayStr : (startDate || todayStr)}
        disableSundays={true}
        title={
          datePickerField === 'START'
            ? (durationType === 'FULL_DAY' ? 'Select Start Date' : 'Select Leave Date')
            : 'Select End Date'
        }
        subtitle="Sundays are weekly offs (Cannot be selected)"
      />
    </View>
  );
};
