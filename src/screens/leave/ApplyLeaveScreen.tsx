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
import { leaveService } from '../../services/leaveService';
import { LeaveType, LeaveDurationType } from '../../types/leave';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const ApplyLeaveScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [durationType, setDurationType] = useState<LeaveDurationType>('FULL_DAY');
  const [startDate, setStartDate] = useState('2026-11-15');
  const [endDate, setEndDate] = useState('2026-11-16');
  const [reason, setReason] = useState('');
  const [ackWhatsapp, setAckWhatsapp] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setError(null);
    if (!reason.trim()) {
      setError('Please provide a reason for requesting this leave.');
      return;
    }
    if (!startDate) {
      setError('Please specify the start date.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = leaveService.applyLeave({
        employeeId: user?.id || 'EMP-024',
        leaveType,
        durationType,
        startDate,
        endDate: durationType === 'FULL_DAY' ? endDate : startDate,
        reason,
        whatsappNoticeAcknowledged: ackWhatsapp,
      });

      setIsLoading(false);
      if (res.success) {
        setIsSubmitted(true);
      } else {
        setError(res.error || 'Failed to submit leave request');
      }
    }, 400);
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
            Your demo request has been added to the pending review queue.
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
          }}
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
            {(['CASUAL', 'SICK', 'EARNED'] as LeaveType[]).map((type) => {
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
                    {type}
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

          {/* Dates */}
          <Card className="mb-4">
            {durationType === 'FULL_DAY' ? (
              <View>
                <Input
                  label="Start Date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-11-15"
                  iconName="calendar-outline"
                />
                <Input
                  label="End Date (YYYY-MM-DD)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-11-16"
                  iconName="calendar-outline"
                />
              </View>
            ) : (
              <View>
                <Input
                  label="Leave Date (YYYY-MM-DD)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-11-15"
                  iconName="calendar-outline"
                />
                <View className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex-row items-center gap-2.5 mt-1">
                  <Ionicons name="time" size={18} color="#7C3AED" />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-purple-900">
                      {durationType === 'FIRST_HALF'
                        ? 'First Half (Morning Shift)'
                        : 'Second Half (Afternoon Shift)'}
                    </Text>
                    <Text className="text-[11px] text-purple-700 mt-0.5">
                      {durationType === 'FIRST_HALF'
                        ? '10:00 AM – 02:30 PM (Counted as 0.5 Day Leave)'
                        : '02:30 PM – 07:00 PM (Counted as 0.5 Day Leave)'}
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
    </View>
  );
};
