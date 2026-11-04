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

export const SalaryDeductionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async (targetMonth: string) => {
    setLoading(true);
    try {
      const res = await salaryService.fetchSalaryBreakdown(targetMonth);
      if (res.breakdown) {
        setBreakdown(res.breakdown);
      } else {
        setBreakdown(salaryService.computeLocalBreakdown(targetMonth));
      }
    } catch {
      setBreakdown(salaryService.computeLocalBreakdown(targetMonth));
    } finally {
      setLoading(false);
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

  const handlePrevMonth = () => {
    const [y, m] = monthKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthKey(newKey);
  };

  const handleNextMonth = () => {
    const [y, m] = monthKey.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setMonthKey(newKey);
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
        {/* Section 8C: Interactive Month Selector */}
        <View className="flex-row items-center justify-between bg-white px-4 py-3 rounded-2xl mb-4 border border-slate-200/80 shadow-xs">
          <TouchableOpacity
            onPress={handlePrevMonth}
            className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#1E293B" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-sm font-black text-slate-800 tracking-wide">
              {breakdown ? breakdown.monthName : monthKey}
            </Text>
            <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Payroll Period: {monthKey}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {loading && !breakdown ? (
          <View className="py-28 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-sm font-bold text-slate-700 mt-3">
              Calculating salary & deductions breakdown...
            </Text>
            <Text className="text-xs text-slate-400 mt-1">
              Evaluating month-wise leave balances and attendance records
            </Text>
          </View>
        ) : breakdown ? (
          <>
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
                    {breakdown.totalDeductionAmount === 0
                      ? 'Zero Deductions'
                      : `Deductions: ₹${breakdown.totalDeductionAmount.toLocaleString()}`}
                  </Text>
                </View>
              </View>

              <Text className="text-3xl font-black text-white mt-1">
                ₹{breakdown.projectedNetSalary.toLocaleString()}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                Estimated Net Pay after leave adjustments & salary deductions
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

            {/* Section 8C: Month Leave Days vs Salary Deductions Metrics */}
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
              Leave vs Salary Impact Summary
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-4">
              {/* Paid Leave Days */}
              <View style={{ width: '48.5%' }}>
                <Card className="p-3 bg-emerald-50/60 border-emerald-200">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Ionicons name="shield-checkmark" size={14} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-900 uppercase">
                      Paid Leave Days
                    </Text>
                  </View>
                  <Text className="text-xl font-black text-emerald-800">
                    {breakdown.paidLeaveDays} Days
                  </Text>
                  <Text className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                    Protected by balance (₹0 deducted)
                  </Text>
                </Card>
              </View>

              {/* Unpaid Leave Days */}
              <View style={{ width: '48.5%' }}>
                <Card className="p-3 bg-rose-50/60 border-rose-200">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Ionicons name="cash-outline" size={14} color="#DC2626" />
                    <Text className="text-[10px] font-bold text-rose-900 uppercase">
                      Unpaid Leave Days
                    </Text>
                  </View>
                  <Text className="text-xl font-black text-rose-800">
                    {breakdown.unpaidLeaveDays} Days
                  </Text>
                  <Text className="text-[10px] text-rose-700 mt-0.5 font-medium">
                    Uncovered leave days
                  </Text>
                </Card>
              </View>

              {/* Leave Consumed */}
              <View style={{ width: '48.5%' }}>
                <Card className="p-3">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Leave Consumed
                  </Text>
                  <Text className="text-xl font-black text-slate-800">
                    {breakdown.totalLeaveDaysConsumed} Days
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    Deducted from balance
                  </Text>
                </Card>
              </View>

              {/* Total Salary Deduction */}
              <View style={{ width: '48.5%' }}>
                <Card className="p-3">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                    Salary Deduction
                  </Text>
                  <Text className={`text-xl font-black ${breakdown.totalDeductionAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{breakdown.totalDeductionAmount.toLocaleString()}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    {breakdown.totalDeductionAmount === 0 ? 'Zero deduction' : 'Deducted from pay'}
                  </Text>
                </Card>
              </View>
            </View>

            {/* Section 8C: Half-Day & Full-Day Incident Breakdown */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="pie-chart-outline" size={18} color="#2563EB" />
                <Text className="text-xs uppercase font-bold text-slate-800">
                  Deductions by Incident Type
                </Text>
              </View>

              <View className="space-y-2.5">
                <View className="flex-row justify-between py-1.5 border-b border-slate-100 items-center">
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Half-Day Cases (Late / 0.5d)</Text>
                    <Text className="text-[10px] text-slate-400">
                      Protected: {breakdown.halfDaysAdjustedCount} | Salary Deducted: {breakdown.halfDaysDeductedCount}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-amber-600">
                    {breakdown.halfDaysDeductedCount > 0
                      ? `-₹${(breakdown.halfDaysDeductedCount * breakdown.halfDaySalary).toLocaleString()}`
                      : '₹0 (All Covered)'}
                  </Text>
                </View>

                <View className="flex-row justify-between py-1.5 items-center">
                  <View>
                    <Text className="text-xs font-bold text-slate-800">Full-Day Cases (Leaves / Absences)</Text>
                    <Text className="text-[10px] text-slate-400">
                      Protected: {breakdown.fullDaysAdjustedCount} | Salary Deducted: {breakdown.fullDaysDeductedCount}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-rose-600">
                    {breakdown.fullDaysDeductedCount > 0
                      ? `-₹${(breakdown.fullDaysDeductedCount * breakdown.dailySalary).toLocaleString()}`
                      : '₹0 (All Covered)'}
                  </Text>
                </View>
              </View>
            </Card>

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
                  <Text className="text-xs text-slate-500 font-medium">Days in Month ({breakdown.monthKey}):</Text>
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
                    Core Leave Consumption Rule
                  </Text>
                  <Text className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                    Available leave balance is always checked and consumed first. Salary deduction only occurs for uncovered leave days if available leave balance is exhausted.
                  </Text>
                  <Text className="text-[11px] font-bold text-emerald-900 mt-1.5">
                    Zero salary is deducted for any day covered by available leaves.
                  </Text>
                </View>
              </View>
            </View>

            {/* Leave Balances Status */}
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Leave Balances Status for Deductions
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-4">
              {(breakdown.leaveBalances || [])
                .filter((b) => b && (b.type === 'CASUAL' || b.type === 'SICK'))
                .map((b) => (
                <View key={b.type} style={{ width: '48.5%' }}>
                  <Card className="p-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                      {b.label}
                    </Text>
                    <Text className="text-xl font-black text-slate-900">
                      {b.currentAvailable} Left
                    </Text>
                    <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-slate-100">
                      <Text className="text-[10px] text-slate-400">Used:</Text>
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
                {breakdown.monthName} Audit Ledger
              </Text>
              <Badge
                label={`${breakdown.totalIncidents || 0} Recorded`}
                variant={(breakdown.totalIncidents || 0) > 0 ? 'warning' : 'success'}
                size="sm"
              />
            </View>

            {/* Incidents List */}
            {(!breakdown.incidents || breakdown.incidents.length === 0) ? (
              <Card className="p-6 items-center">
                <Ionicons name="checkmark-circle" size={42} color="#10B981" />
                <Text className="text-sm font-bold text-slate-800 mt-2">
                  No Salary Deductions for {breakdown.monthName}
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1">
                  All shifts in {breakdown.monthName} were on time or fully protected with available leave balances.
                </Text>
              </Card>
            ) : (
              <View className="space-y-3">
                {breakdown.incidents.map((item) => {
                  const isAdjusted = item.status === 'ADJUSTED_WITH_LEAVE';
                  const isPartial = item.status === 'PARTIALLY_ADJUSTED';

                  return (
                    <Card key={item.id} className="p-4">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <Ionicons
                            name={isAdjusted ? 'shield-checkmark' : isPartial ? 'time' : 'alert-circle'}
                            size={18}
                            color={isAdjusted ? '#059669' : isPartial ? '#D97706' : '#DC2626'}
                          />
                          <Text className="text-xs font-bold text-slate-900">
                            {item.date}
                          </Text>
                        </View>
                        <Badge
                          label={
                            isAdjusted
                              ? 'Adjusted with Leave'
                              : isPartial
                              ? 'Partial Leave Adjustment'
                              : 'Salary Deducted'
                          }
                          variant={isAdjusted ? 'success' : isPartial ? 'warning' : 'danger'}
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
                        <View>
                          <Text className="text-[10px] text-slate-400 font-semibold">
                            Leave Consumed: <Text className="text-emerald-700 font-bold">{item.leaveDaysDeducted}d</Text>
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] text-slate-400 font-semibold">Salary Impact:</Text>
                          <Text
                            className={`text-xs font-black ${
                              isAdjusted ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isAdjusted ? '₹0.00 (Protected)' : `-₹${item.deductionAmount.toLocaleString()}`}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};
