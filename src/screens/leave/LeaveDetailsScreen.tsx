import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { leaveService } from '../../services/leaveService';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const LeaveDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const requests = leaveService.getRequests();
  const request = requests.find((r) => r.id === id) || requests[0];

  if (!request) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
          <Header title="Leave Details" showBack />
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-500 font-medium">Leave record not found.</Text>
        </View>
      </View>
    );
  }

  const isApproved = request.status === 'APPROVED';
  const leaveConsumed = request.leaveDaysDeducted ?? (isApproved ? request.daysCount : 0);
  const unpaidDays = request.unpaidDays ?? 0;
  const salaryDeduction = request.salaryDeduction ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Leave Request Details"
          subtitle={`Request ID: ${request.id}`}
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
        {/* Status Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[10px] uppercase font-bold text-slate-400">
              Application Status
            </Text>
            <Badge
              label={request.status}
              variant={
                request.status === 'APPROVED'
                  ? 'success'
                  : request.status === 'PENDING'
                  ? 'warning'
                  : 'danger'
              }
            />
          </View>

          <Text className="text-2xl font-black text-slate-900">
            {request.leaveType} LEAVE
          </Text>
          <Text className="text-xs text-slate-500 mt-1 font-medium">
            {request.daysCount} {request.daysCount === 1 ? 'Day' : 'Days'} • {request.durationType.replace('_', ' ')}
          </Text>
        </Card>

        {/* Section 8A: Leave Balance & Salary Deduction Impact Card */}
        {isApproved && (
          <Card className="mb-4 bg-emerald-50/50 border-emerald-200">
            <View className="flex-row items-center gap-2 mb-2.5">
              <Ionicons name="calculator-outline" size={18} color="#059669" />
              <Text className="text-xs uppercase font-bold text-emerald-900">
                Leave Consumption & Salary Impact
              </Text>
            </View>

            <View className="space-y-2">
              <View className="flex-row justify-between py-1.5 border-b border-emerald-100">
                <Text className="text-xs text-slate-600 font-medium">Leave Balance Deducted:</Text>
                <Text className="text-xs font-bold text-emerald-700">{leaveConsumed} Days</Text>
              </View>

              <View className="flex-row justify-between py-1.5 border-b border-emerald-100">
                <Text className="text-xs text-slate-600 font-medium">Unpaid Leave Days:</Text>
                <Text className="text-xs font-bold text-amber-700">{unpaidDays} Days</Text>
              </View>

              <View className="flex-row justify-between py-1.5">
                <Text className="text-xs text-slate-600 font-medium">Salary Deduction Amount:</Text>
                <Text className={`text-xs font-black ${salaryDeduction > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {salaryDeduction > 0 ? `-₹${salaryDeduction.toLocaleString()}` : '₹0.00 (Fully Covered by Leave)'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Schedule & Duration */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-3">
            Schedule & Duration
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500">From Date:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {request.startDate}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500">To Date:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {request.endDate}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500">Applied On:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {request.appliedOn}
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500">WhatsApp Notification:</Text>
              <Text className="text-xs font-bold text-emerald-600">
                {request.whatsappNoticeAcknowledged ? 'Acknowledged' : 'Pending'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Reason Card */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-1.5">
            Reason Stated
          </Text>
          <Text className="text-xs text-slate-700 leading-relaxed font-medium">
            {request.reason}
          </Text>
        </Card>

        {/* Reviewer Section */}
        {request.reviewedOn && (
          <Card className="bg-slate-50 border-slate-200">
            <Text className="text-xs uppercase font-bold text-slate-400 mb-2">
              Manager Review & Remarks
            </Text>
            <Text className="text-xs text-slate-600 mb-1">
              Reviewed by: <Text className="font-bold text-slate-900">{request.approvedOrRejectedBy || 'HR Operations'}</Text> on {request.reviewedOn}
            </Text>
            {request.comments && (
              <Text className="text-xs text-slate-500 italic">
                "{request.comments}"
              </Text>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
};
