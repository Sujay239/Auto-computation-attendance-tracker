import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { salaryService } from '../../services/salaryService';
import { SalaryBreakdown } from '../../types/salary';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const SalaryDeductionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown>(
    salaryService.computeLocalBreakdown(currentMonthKey)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async (targetMonth: string) => {
    setLoading(true);
    const res = await salaryService.fetchSalaryBreakdown(targetMonth);
    setLoading(false);
    if (res.breakdown) {
      setBreakdown(res.breakdown);
    }
  };

  useEffect(() => {
    loadData(monthKey);
  }, [monthKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(monthKey);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Salary & Deductions"
          subtitle="Monthly Net Pay & Leave Adjustments"
          showBack
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Payout Projection Highlight Card */}
        <View
          style={{
            backgroundColor: '#0F172A',
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              {breakdown.monthName} Payroll
            </Text>
            <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/40">
              <Text className="text-[11px] font-bold text-emerald-400">
                {breakdown.totalDeductionAmount === 0 ? 'Zero Deductions' : `Deductions: ₹${breakdown.totalDeductionAmount.toLocaleString()}`}
              </Text>
            </View>
          </View>

          <Text className="text-3xl font-black text-white mt-1">
            ₹{breakdown.projectedNetSalary.toLocaleString()}
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Projected Net Pay after leave adjustments & penalties
          </Text>

          <View className="flex-row items-center justify-between mt-4 pt-3.5 border-t border-slate-800">
            <View>
              <Text className="text-[10px] text-slate-400 uppercase font-semibold">Gross Salary</Text>
              <Text className="text-sm font-bold text-slate-200 mt-0.5">
                ₹{breakdown.monthlySalary.toLocaleString()}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-slate-400 uppercase font-semibold">Daily Rate (floor)</Text>
              <Text className="text-sm font-bold text-slate-200 mt-0.5">
                ₹{breakdown.dailySalary}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-400 uppercase font-semibold">Half-Day Rate</Text>
              <Text className="text-sm font-bold text-amber-400 mt-0.5">
                ₹{breakdown.halfDaySalary}
              </Text>
            </View>
          </View>
        </View>

        {/* Formula & Policy Breakdown Card */}
        <Card className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="calculator-outline" size={18} color="#2563EB" />
            <Text className="text-xs uppercase font-bold text-slate-800">
              Deduction Computation Rules
            </Text>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-1.5 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Days in Month:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {breakdown.daysInMonth} Days
              </Text>
            </View>

            <View className="flex-row justify-between py-1.5 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Daily Salary Formula:</Text>
              <Text className="text-xs font-bold text-blue-600">
                floor(₹{breakdown.monthlySalary} / {breakdown.daysInMonth}) = ₹{breakdown.dailySalary}
              </Text>
            </View>

            <View className="flex-row justify-between py-1.5 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Half-Day Salary (Late/Penalty):</Text>
              <Text className="text-xs font-bold text-amber-600">
                floor(₹{breakdown.dailySalary} / 2) = ₹{breakdown.halfDaySalary}
              </Text>
            </View>

            <View className="flex-row justify-between py-1.5">
              <Text className="text-xs text-slate-500 font-medium">Full Day Absence Rate:</Text>
              <Text className="text-xs font-bold text-rose-600">
                2 × ₹{breakdown.halfDaySalary} = ₹{breakdown.fullDayDeductionRate}
              </Text>
            </View>
          </View>
        </Card>

        {/* Leave Protection Guarantee Card */}
        <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-4">
          <View className="flex-row items-start gap-2.5">
            <Ionicons name="shield-checkmark" size={22} color="#059669" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-emerald-900">
                Company Leave Protection Policy
              </Text>
              <Text className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                Before any salary deduction for half-days or late arrivals past 10:45 AM, the system first automatically adjusts them with your available leave balance (Half-Day leave, then Casual leave).
              </Text>
              <Text className="text-[11px] font-bold text-emerald-900 mt-1.5">
                Salary deductions only start if your eligible leave balances reach zero.
              </Text>
            </View>
          </View>
        </View>

        {/* Leave Protection Impact Cards */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          Leave Balances Status for Deductions
        </Text>

        <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-4">
          {breakdown.leaveBalances.map((b) => (
            <View key={b.type} style={{ width: '48.5%' }}>
              <Card className="p-3">
                <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                  {b.label}
                </Text>
                <Text className="text-xl font-black text-slate-900">
                  {b.currentAvailable} Left
                </Text>
                <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-slate-100">
                  <Text className="text-[10px] text-slate-400">Used for Adj:</Text>
                  <Text className="text-[10px] font-bold text-blue-600">
                    {b.usedForSalaryAdjustment}d
                  </Text>
                </View>
              </Card>
            </View>
          ))}
        </View>

        {/* Incidents Breakdown Header */}
        <View className="flex-row items-center justify-between mb-2.5 px-1">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Deductions & Adjustments Audit Log
          </Text>
          <Badge
            label={`${breakdown.totalIncidents} Recorded`}
            variant={breakdown.totalIncidents > 0 ? 'warning' : 'success'}
            size="sm"
          />
        </View>

        {/* Incidents List */}
        {breakdown.incidents.length === 0 ? (
          <Card className="p-6 items-center">
            <Ionicons name="checkmark-circle" size={42} color="#10B981" />
            <Text className="text-sm font-bold text-slate-800 mt-2">
              No Salary Deductions
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1">
              Perfect attendance maintained for {breakdown.monthName}. No penalties or unadjusted absences.
            </Text>
          </Card>
        ) : (
          <View className="space-y-3">
            {breakdown.incidents.map((item) => {
              const isAdjusted = item.status === 'ADJUSTED_WITH_LEAVE';

              return (
                <Card key={item.id} className="p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={isAdjusted ? 'shield-checkmark' : 'alert-circle'}
                        size={18}
                        color={isAdjusted ? '#059669' : '#DC2626'}
                      />
                      <Text className="text-xs font-bold text-slate-900">
                        {item.date}
                      </Text>
                    </View>
                    <Badge
                      label={isAdjusted ? 'Adjusted with Leave' : 'Salary Deducted'}
                      variant={isAdjusted ? 'success' : 'danger'}
                      size="sm"
                    />
                  </View>

                  <Text className="text-sm font-black text-slate-800 mb-1">
                    {item.title}
                  </Text>

                  <Text className="text-xs text-slate-600 mb-2 leading-relaxed">
                    {item.description}
                  </Text>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                    <Text className="text-[11px] text-slate-400 font-medium">
                      Net Salary Impact:
                    </Text>
                    <Text
                      className={`text-xs font-black ${
                        isAdjusted ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isAdjusted ? '₹0.00 (Protected)' : `-₹${item.deductionAmount.toLocaleString()}`}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

