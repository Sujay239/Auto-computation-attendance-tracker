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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { leaveService } from '../../services/leaveService';
import { LeaveBalance, LeaveRequest } from '../../types/leave';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';

export const LeaveScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { leaveBalances, refreshData: refreshAttendance } = useAttendance();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveService.getRequests());
  const [liveBalances, setLiveBalances] = useState<LeaveBalance[]>(
    leaveBalances.length > 0 ? leaveBalances : leaveService.getBalances()
  );

  const loadLeaves = async () => {
    try {
      const res = await leaveService.fetchRealtimeLeaves();
      if (res.requests) {
        setRequests(res.requests);
      }
      if (res.balances && res.balances.length > 0) {
        setLiveBalances(res.balances);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const rawBalances = liveBalances.length > 0 ? liveBalances : (leaveBalances.length > 0 ? leaveBalances : leaveService.getBalances());
  const balances = rawBalances
    .filter((b) => b && (b.type === 'CASUAL' || b.type === 'SICK'))
    .map((b) => {
      if (b.type === 'SICK' && b.total > 5) {
        const used = Math.min(b.used || 0, 5);
        return { ...b, total: 5, used, available: Math.max(0, 5 - used) };
      }
      return b;
    });

  if (!balances.some((b) => b.type === 'CASUAL')) {
    balances.unshift({ type: 'CASUAL', label: 'Casual Leave', total: 12, used: 0, available: 12 });
  }
  if (!balances.some((b) => b.type === 'SICK')) {
    balances.push({ type: 'SICK', label: 'Sick Leave', total: 5, used: 0, available: 5 });
  }

  // Section 8A Calculations
  const totalEntitlement = balances.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
  const totalUsed = balances.reduce((sum, b) => sum + (Number(b.used) || 0), 0);
  const totalRemaining = balances.reduce((sum, b) => sum + (Number(b.available) || 0), 0);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  // Paid vs Unpaid leave days across approved requests
  let paidLeaveDaysTotal = 0;
  let unpaidLeaveDaysTotal = 0;
  requests.forEach((r) => {
    if (r.status === 'APPROVED') {
      const paid = r.leaveDaysDeducted ?? (r.unpaidDays !== undefined ? r.daysCount - r.unpaidDays : r.daysCount);
      const unpaid = r.unpaidDays ?? Math.max(0, r.daysCount - paid);
      paidLeaveDaysTotal += paid;
      unpaidLeaveDaysTotal += unpaid;
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshAttendance(),
      loadLeaves(),
    ]);
    setRefreshing(false);
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Leave Management"
          showBack
          subtitle="Entitlements, Balances & Demo Submissions"
          rightAction={
            <Button
              label="Apply"
              size="sm"
              onPress={() => router.push('/leave/apply')}
              icon={<Ionicons name="add" size={16} color="#ffffff" />}
            />
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
        {loading && requests.length === 0 && balances.length === 0 ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-xs font-bold text-slate-500 mt-3">
              Loading leave balances & applications...
            </Text>
          </View>
        ) : (
          <>
            {/* Section 8A: Total Available, Used & Remaining Balances */}
            <View
              style={{
                backgroundColor: '#0F172A',
                borderRadius: 20,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Annual Leave Portfolio
                </Text>
                <View className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  <Text className="text-[11px] font-bold text-emerald-400">
                    {totalRemaining} Days Remaining
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between my-2">
                <View>
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Total Quota</Text>
                  <Text className="text-2xl font-black text-white">{totalEntitlement}d</Text>
                </View>
                <View className="items-center">
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Used Leaves</Text>
                  <Text className="text-2xl font-black text-amber-400">{totalUsed}d</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] uppercase font-bold text-slate-400">Available</Text>
                  <Text className="text-2xl font-black text-emerald-400">{totalRemaining}d</Text>
                </View>
              </View>

              {/* Paid vs Unpaid & Request Count Status Bar */}
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-800">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text className="text-[11px] text-slate-300 font-semibold">
                    Paid Leaves: <Text className="text-emerald-400 font-bold">{paidLeaveDaysTotal}d</Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="alert-circle" size={14} color="#F43F5E" />
                  <Text className="text-[11px] text-slate-300 font-semibold">
                    Unpaid: <Text className="text-rose-400 font-bold">{unpaidLeaveDaysTotal}d</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Leave Balances Grid */}
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
              Category Entitlements Breakdown
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-2.5 mb-4">
              {balances.map((b) => (
                <View key={b.type} style={{ width: '48.5%' }}>
                  <Card className="p-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                      {b.label}
                    </Text>
                    <Text className="text-2xl font-black text-slate-900">
                      {b.available}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1 pt-1 border-t border-slate-100">
                      <Text className="text-[10px] text-slate-400">Used: {b.used}</Text>
                      <Text className="text-[10px] text-slate-400">Total: {b.total}</Text>
                    </View>
                  </Card>
                </View>
              ))}
            </View>

            {/* Application Status Chips (Pending, Approved, Rejected) */}
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mr-1.5 items-center">
                <Text className="text-[10px] uppercase font-bold text-amber-700">Pending</Text>
                <Text className="text-lg font-black text-amber-900 mt-0.5">{pendingCount}</Text>
              </View>
              <View className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mx-1.5 items-center">
                <Text className="text-[10px] uppercase font-bold text-emerald-700">Approved</Text>
                <Text className="text-lg font-black text-emerald-900 mt-0.5">{approvedCount}</Text>
              </View>
              <View className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-2.5 ml-1.5 items-center">
                <Text className="text-[10px] uppercase font-bold text-rose-700">Rejected</Text>
                <Text className="text-lg font-black text-rose-900 mt-0.5">{rejectedCount}</Text>
              </View>
            </View>

            {/* Quick Leave Rules Card */}
            <Card className="mb-4 bg-slate-100/80 p-3.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Leave Guidelines & Priority Rule
              </Text>
              <View className="space-y-1">
                <Text className="text-[11px] text-slate-600 font-medium">
                  • Available leave balance is strictly consumed before deducting any salary.
                </Text>
                <Text className="text-[11px] text-slate-600 font-medium">
                  • Annual Quota: 12 Casual Leaves & 5 Sick Leaves (Total 17 days/year).
                </Text>
                <Text className="text-[11px] text-slate-600 font-medium">
                  • Half-day leave requires 0.5 day; remaining balance covers fractions (0.25, 0.5).
                </Text>
                <Text className="text-[11px] text-slate-600 font-medium">
                  • Deductions apply only to uncovered days when balance reaches zero.
                </Text>
              </View>
            </Card>

            {/* Filter Tabs */}
            <View className="flex-row items-center justify-between mb-2.5 px-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leave Requests History
              </Text>

              <View className="flex-row gap-1 bg-slate-200/80 p-1 rounded-xl">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => {
                  const isSelected = statusFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      onPress={() => setStatusFilter(filter)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                      }}
                      className="px-2 py-1 rounded-lg"
                    >
                      <Text
                        style={{ color: isSelected ? '#2563EB' : '#475569' }}
                        className="text-[10px] font-bold"
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Requests List */}
            {filteredRequests.length > 0 ? (
              <View className="space-y-2.5">
                {filteredRequests.map((req) => {
                  const isApproved = req.status === 'APPROVED';
                  const leaveConsumed = req.leaveDaysDeducted ?? (isApproved ? req.daysCount : 0);
                  const unpaidPortion = req.unpaidDays ?? 0;
                  const salaryDeducted = req.salaryDeduction ?? 0;

                  return (
                    <TouchableOpacity
                      key={req.id}
                      onPress={() =>
                        router.push({
                          pathname: '/leave/details',
                          params: { id: req.id },
                        })
                      }
                      activeOpacity={0.75}
                    >
                      <Card className="p-3.5 mb-2.5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 rounded-xl bg-purple-50 items-center justify-center">
                              <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
                            </View>
                            <View>
                              <Text className="text-xs font-bold text-slate-900">
                                {req.leaveType} LEAVE ({req.daysCount} {req.daysCount === 1 ? 'day' : 'days'})
                              </Text>
                              <Text className="text-[10px] text-slate-500 font-medium">
                                {req.durationType.replace('_', ' ')}
                              </Text>
                            </View>
                          </View>

                          <Badge
                            label={req.status}
                            variant={
                              req.status === 'APPROVED'
                                ? 'success'
                                : req.status === 'PENDING'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          />
                        </View>

                        <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2">
                          <Text className="text-xs text-slate-800 font-semibold">
                            Dates: {req.startDate} {req.endDate && req.endDate !== req.startDate ? `to ${req.endDate}` : ''}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                            Reason: {req.reason}
                          </Text>
                        </View>

                        {/* Section 8A: Approved leave deduction impact summary */}
                        {isApproved && (
                          <View className="bg-slate-100/70 p-2 rounded-xl border border-slate-200/60 mb-2 flex-row justify-between items-center">
                            <View>
                              <Text className="text-[10px] text-slate-400 font-semibold">Leave Consumed</Text>
                              <Text className="text-xs font-bold text-emerald-700">{leaveConsumed} days</Text>
                            </View>
                            <View className="items-center">
                              <Text className="text-[10px] text-slate-400 font-semibold">Unpaid Days</Text>
                              <Text className="text-xs font-bold text-amber-700">{unpaidPortion} days</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[10px] text-slate-400 font-semibold">Salary Deducted</Text>
                              <Text className={`text-xs font-bold ${salaryDeducted > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {salaryDeducted > 0 ? `-₹${salaryDeducted.toLocaleString()}` : '₹0 (Protected)'}
                              </Text>
                            </View>
                          </View>
                        )}

                        {req.comments && (
                          <Text className="text-[10px] text-slate-500 font-medium italic">
                            Reviewer: {req.comments}
                          </Text>
                        )}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                title="No Leave Records"
                description="No leave requests match the selected filter."
                actionLabel="Apply For Leave"
                onAction={() => router.push('/leave/apply')}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};
