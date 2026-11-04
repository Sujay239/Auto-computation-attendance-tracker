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
import { overtimeService } from '../../services/overtimeService';
import { OvertimeRecord, OvertimeSummary } from '../../types/overtime';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const OvertimeScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { overtimeSummary, refreshData: refreshAttendance } = useAttendance();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [records, setRecords] = useState<OvertimeRecord[]>(overtimeService.getRecords());
  const [summary, setSummary] = useState<OvertimeSummary>(
    overtimeSummary || overtimeService.getSummary()
  );

  const loadOvertime = async () => {
    try {
      const res = await overtimeService.fetchRealtimeOvertime();
      if (res.success && res.data) {
        if (Array.isArray(res.data.records)) {
          setRecords(res.data.records);
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOvertime();
    await refreshAttendance();
    setRefreshing(false);
  };

  useEffect(() => {
    loadOvertime();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Overtime Management"
          showBack
          subtitle="Extra Hours, Reimbursement & Early Leave"
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
        {loading && records.length === 0 ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-xs font-bold text-slate-500 mt-3">
              Loading overtime records & approvals...
            </Text>
          </View>
        ) : (
          <>
            {/* Policy Summary Card */}
        <View
          style={{
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
          }}
          className="mb-4"
        >
          <View className="flex-row items-center gap-2 mb-1.5">
            <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
            <Text className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Overtime Policy & Approval Workflow
            </Text>
          </View>
          <Text className="text-xs text-slate-700 leading-relaxed">
            All overtime hours are subject to review and verification by <Text className="font-bold text-slate-900">Sayan Roy</Text>. Valid overtime is eligible for monetary reimbursement within <Text className="font-bold text-blue-700">7 days</Text> or approved early-leave adjustment.
          </Text>
        </View>

        {/* Overtime Metric Cards Grid */}
        <View className="flex-row gap-2.5 mb-4">
          <Card className="flex-1 p-3.5">
            <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              Approved Hours
            </Text>
            <Text className="text-2xl font-black text-slate-900">
              {summary.totalApprovedHours}
            </Text>
            <Text className="text-[10px] text-emerald-600 font-bold mt-1">
              Verified by Sayan
            </Text>
          </Card>

          <Card className="flex-1 p-3.5">
            <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
              Early-Leave Carry
            </Text>
            <Text className="text-2xl font-black text-purple-600">
              {summary.earlyLeaveHoursAvailable}
            </Text>
            <Text className="text-[10px] text-purple-600 font-bold mt-1">
              Adjustable on request
            </Text>
          </Card>
        </View>

       

        {/* Overtime Records List */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Recent Overtime Logs
        </Text>

        <View className="space-y-2.5">
          {records.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/overtime/details',
                  params: { id: item.id },
                })
              }
              activeOpacity={0.75}
            >
              <Card className="p-3.5 mb-2.5">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                      <Ionicons name="time-outline" size={16} color="#2563EB" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        {item.date} ({item.hoursFormatted})
                      </Text>
                      <Text className="text-[10px] text-slate-500 font-medium">
                        {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                  </View>

                  <Badge
                    label={item.status}
                    variant={
                      item.status === 'APPROVED'
                        ? 'success'
                        : item.status === 'PENDING'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  />
                </View>

                {/* Compensation pill */}
                <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-1.5 flex-row justify-between items-center">
                  <View>
                    <Text className="text-[10px] text-slate-400 uppercase font-bold">
                      Compensation Method
                    </Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {item.compensationMethod === 'REIMBURSEMENT'
                        ? 'Monetary Reimbursement'
                        : 'Approved Early-Leave Adjustment'}
                    </Text>
                  </View>

                  {item.reimbursementStatus === 'PENDING' ? (
                    <Text className="text-[10px] font-bold text-amber-600">
                      Due: {item.reimbursementDeadline}
                    </Text>
                  ) : item.reimbursementStatus === 'PROCESSED' ? (
                    <Text className="text-[10px] font-bold text-emerald-600">Paid Out</Text>
                  ) : item.earlyLeaveStatus === 'AVAILABLE' ? (
                    <Text className="text-[10px] font-bold text-purple-600">Available</Text>
                  ) : null}
                </View>

                <Text className="text-xs text-slate-600 font-medium" numberOfLines={1}>
                  Reason: {item.reason}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
