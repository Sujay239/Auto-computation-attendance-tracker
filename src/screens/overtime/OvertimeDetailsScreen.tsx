import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { overtimeService } from '../../services/overtimeService';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const OvertimeDetailsScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const records = overtimeService.getRecords();
  const record = records.find((r) => r.id === id) || records[0];

  if (!record) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
          <Header title="Overtime Record" showBack />
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-slate-500 font-medium">Overtime record not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Overtime Audit Details"
          subtitle={`Audit ID: ${record.id}`}
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
              Review Status
            </Text>
            <Badge
              label={record.status}
              variant={
                record.status === 'APPROVED'
                  ? 'success'
                  : record.status === 'PENDING'
                  ? 'warning'
                  : 'danger'
              }
            />
          </View>

          <Text className="text-2xl font-black text-slate-900">
            {record.hoursFormatted} Overtime
          </Text>
          <Text className="text-xs text-slate-500 mt-1 font-medium">
            Date: {record.date} • {record.startTime} to {record.endTime}
          </Text>
        </Card>

        {/* Compensation Analysis */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-3">
            Compensation & Settlement
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Compensation Method:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {record.compensationMethod === 'REIMBURSEMENT'
                  ? 'Monetary Payout'
                  : 'Early-Leave Adjustment'}
              </Text>
            </View>

            {record.compensationMethod === 'REIMBURSEMENT' ? (
              <>
                <View className="flex-row justify-between py-2 border-b border-slate-100">
                  <Text className="text-xs text-slate-500 font-medium">Payout Status:</Text>
                  <Text className="text-xs font-bold text-amber-600">
                    {record.reimbursementStatus}
                  </Text>
                </View>

                <View className="flex-row justify-between py-2 border-b border-slate-100">
                  <Text className="text-xs text-slate-500 font-medium">7-Day Payout Deadline:</Text>
                  <Text className="text-xs font-bold text-blue-600">
                    {record.reimbursementDeadline}
                  </Text>
                </View>

                {record.reimbursementAmount && (
                  <View className="flex-row justify-between py-2 border-b border-slate-100">
                    <Text className="text-xs text-slate-500 font-medium">Calculated Payout Amount:</Text>
                    <Text className="text-xs font-bold text-emerald-600">
                      ₹{record.reimbursementAmount}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="flex-row justify-between py-2 border-b border-slate-100">
                <Text className="text-xs text-slate-500 font-medium">Early-Leave Carry Status:</Text>
                <Text className="text-xs font-bold text-purple-600">
                  {record.earlyLeaveStatus}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Designated Approver:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {record.approver} (Subject to review)
              </Text>
            </View>
          </View>
        </Card>

        {/* Reason */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-1.5">
            Work Justification & Deliverables
          </Text>
          <Text className="text-xs text-slate-700 leading-relaxed font-medium">
            {record.reason}
          </Text>
        </Card>

        {/* Reviewer Note */}
        {record.notes && (
          <Card className="bg-slate-50 border-slate-200">
            <Text className="text-xs uppercase font-bold text-slate-400 mb-1">
              Admin & Approver Note
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
