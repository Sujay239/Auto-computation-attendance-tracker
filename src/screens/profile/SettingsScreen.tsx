import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { APP_SETTINGS } from '../../constants/appConfig';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { office, latePolicy, overtimePolicy, leavePolicy, company } = APP_SETTINGS;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="App Rules & Policy Settings"
          subtitle="Configured Business Policies & Workflows"
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
        {/* Office Timings Policy */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="time" size={18} color="#2563EB" />
            <Text className="text-xs uppercase font-bold text-slate-800">
              Office Hours & Daily Timings
            </Text>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Official Opening Time:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {office.openingTime} AM
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Permitted Morning Buffer:</Text>
              <Text className="text-xs font-bold text-amber-600">
                {office.openingBufferMinutes} minutes (up to 10:20 AM)
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Standard Closing Time:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {office.closingTime} (07:00 PM)
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Buffer Closing Adjustment:</Text>
              <Text className="text-xs font-bold text-amber-600">
                +30 minutes (07:30 PM for arrivals up to 10:20 AM)
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Standard Lunch Duration:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {office.lunchDurationMinutes} minutes (Non-working)
              </Text>
            </View>
          </View>
        </Card>

        {/* Late Arrival Policy */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="alert-circle" size={18} color="#D97706" />
            <Text className="text-xs uppercase font-bold text-slate-800">
              Late Arrival & Half-Day Rules
            </Text>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Monthly Late Allowances:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {latePolicy.monthlyAllowance} per calendar month
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Maximum Permissible Cutoff:</Text>
              <Text className="text-xs font-bold text-rose-600">
                {latePolicy.maximumLateArrivalTime} AM
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Arrivals after 10:45 AM:</Text>
              <Badge label="Automatic Half-Day" variant="danger" size="sm" />
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Allowance Exceeded Treatment:</Text>
              <Text className="text-xs font-bold text-slate-700">
                Half-Day Case (Salary deduction or leave)
              </Text>
            </View>
          </View>
        </Card>

        {/* Overtime Policy */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="cash" size={18} color="#059669" />
            <Text className="text-xs uppercase font-bold text-slate-800">
              Overtime Approval & Settlement
            </Text>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Designated Approver:</Text>
              <Text className="text-xs font-bold text-blue-600">
                {overtimePolicy.approver} (Review mandatory)
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Reimbursement Payout Window:</Text>
              <Text className="text-xs font-bold text-emerald-600">
                Within {overtimePolicy.reimbursementDeadlineDays} Days
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Alternative Compensation:</Text>
              <Text className="text-xs font-bold text-purple-600">
                Approved Early-Leave Carry-Forward
              </Text>
            </View>
          </View>
        </Card>

        {/* Cooking Day & Leave Policy */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="restaurant" size={18} color="#7C3AED" />
            <Text className="text-xs uppercase font-bold text-slate-800">
              Operational Programs
            </Text>
          </View>

          <View className="space-y-1">
            <Text className="text-xs font-bold text-slate-800">
              Office Cooking Session: {company.cookingDayName}s
            </Text>
            <Text className="text-[11px] text-slate-500 leading-relaxed font-medium">
              {company.cookingDayParticipantNote}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
};
