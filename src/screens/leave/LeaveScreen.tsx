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
            {/* Leave Balances Grid */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Available Leave Entitlements
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

        {/* Quick Leave Rules Card */}
        <Card className="mb-4 bg-slate-100/80 p-3.5">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Leave Guidelines & Deductions
          </Text>
          <View className="space-y-1">
            <Text className="text-[11px] text-slate-600 font-medium">
              • Work From Home (WFH) is strictly not permitted.
            </Text>
            <Text className="text-[11px] text-slate-600 font-medium">
              • Annual Quota: 12 Casual Leaves & 5 Sick Leaves (Total 17 days/year).
            </Text>
            <Text className="text-[11px] text-slate-600 font-medium">
              • Half-day leave is counted as 0.5 day against Casual or Sick Leave.
            </Text>
            <Text className="text-[11px] text-slate-600 font-medium">
              • Leaves beyond entitlement are subject to salary deduction.
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
            {filteredRequests.map((req) => (
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

                  <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-1.5">
                    <Text className="text-xs text-slate-800 font-semibold">
                      Dates: {req.startDate} {req.endDate && req.endDate !== req.startDate ? `to ${req.endDate}` : ''}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                      Reason: {req.reason}
                    </Text>
                  </View>

                  {req.comments && (
                    <Text className="text-[10px] text-slate-500 font-medium italic">
                      Reviewer: {req.comments}
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            ))}
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
