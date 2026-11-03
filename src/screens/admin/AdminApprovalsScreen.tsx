import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { AdminLeaveApprovalItem, AdminOvertimeApprovalItem } from '../../types/admin';

export const AdminApprovalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'LEAVE' | 'OVERTIME'>('LEAVE');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  const [leaves, setLeaves] = useState<AdminLeaveApprovalItem[]>([]);
  const [overtimes, setOvertimes] = useState<AdminOvertimeApprovalItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Review Decision Modal State
  const [decisionModalVisible, setDecisionModalVisible] = useState<boolean>(false);
  const [targetType, setTargetType] = useState<'LEAVE' | 'OVERTIME'>('LEAVE');
  const [targetId, setTargetId] = useState<string>('');
  const [targetAction, setTargetAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [targetEmployeeName, setTargetEmployeeName] = useState<string>('');
  const [adminComment, setAdminComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    const [leaveRes, otRes] = await Promise.all([
      adminService.getAllLeaveRequests(statusFilter === 'ALL' ? 'ALL' : statusFilter),
      adminService.getAllOvertimeRequests(statusFilter === 'ALL' ? 'ALL' : statusFilter),
    ]);

    if (leaveRes.success && leaveRes.requests) {
      setLeaves(leaveRes.requests);
    }
    if (otRes.success && otRes.records) {
      setOvertimes(otRes.records);
    }
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovals();
  };

  // Open Decision Modal
  const handleOpenDecision = (
    type: 'LEAVE' | 'OVERTIME',
    id: string,
    action: 'APPROVE' | 'REJECT',
    empName: string
  ) => {
    setTargetType(type);
    setTargetId(id);
    setTargetAction(action);
    setTargetEmployeeName(empName);
    setAdminComment(action === 'APPROVE' ? 'Approved by Admin' : 'Rejected by Admin');
    setDecisionModalVisible(true);
  };

  // Submit Review Decision
  const handleSubmitDecision = async () => {
    setIsSubmitting(true);
    if (targetType === 'LEAVE') {
      const res = await adminService.reviewLeaveRequest(targetId, targetAction, adminComment);
      setIsSubmitting(false);
      if (res.success) {
        setDecisionModalVisible(false);
        Alert.alert('Decision Recorded', `Leave request ${targetAction === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
        fetchApprovals();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit leave decision.');
      }
    } else {
      const res = await adminService.reviewOvertimeRequest(targetId, targetAction, adminComment);
      setIsSubmitting(false);
      if (res.success) {
        setDecisionModalVisible(false);
        Alert.alert('Decision Recorded', `Overtime claim ${targetAction === 'APPROVE' ? 'approved and credited' : 'rejected'}.`);
        fetchApprovals();
      } else {
        Alert.alert('Error', res.error || 'Failed to submit overtime decision.');
      }
    }
  };

  const pendingLeavesCount = leaves.filter((l) => l.status === 'PENDING').length;
  const pendingOvertimesCount = overtimes.filter((o) => o.status === 'PENDING').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Safe Area Header */}
      <View
        style={{
          paddingTop: insets.top + (Platform.OS === 'ios' ? 4 : 8),
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}
      >
        <Text className="text-xl font-black text-slate-900">
          Approvals Management Hub
        </Text>
        <Text className="text-xs text-slate-500 font-medium">
          Review employee leave applications & overtime compensation claims
        </Text>

        {/* Top Tab Switch (Leave vs Overtime) */}
        <View className="flex-row rounded-2xl bg-slate-100 p-1 mt-3 border border-slate-200">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('LEAVE')}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeTab === 'LEAVE' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={activeTab === 'LEAVE' ? '#4F46E5' : '#64748B'}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'LEAVE' ? 'text-indigo-900' : 'text-slate-500'
              }`}
            >
              Leaves
            </Text>
            {pendingLeavesCount > 0 && (
              <View className="px-1.5 py-0.2 rounded-full bg-amber-500">
                <Text className="text-[10px] font-black text-white">{pendingLeavesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('OVERTIME')}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeTab === 'OVERTIME' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Ionicons
              name="time"
              size={16}
              color={activeTab === 'OVERTIME' ? '#4F46E5' : '#64748B'}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'OVERTIME' ? 'text-indigo-900' : 'text-slate-500'
              }`}
            >
              Overtime
            </Text>
            {pendingOvertimesCount > 0 && (
              <View className="px-1.5 py-0.2 rounded-full bg-amber-500">
                <Text className="text-[10px] font-black text-white">{pendingOvertimesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Filter Chips */}
        <View className="flex-row gap-2 mt-3">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => {
            const isSelected = statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: isSelected ? '#4F46E5' : '#F1F5F9',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? '#FFFFFF' : '#64748B',
                    fontSize: 11,
                    fontWeight: isSelected ? '700' : '600',
                  }}
                >
                  {status === 'ALL' ? 'All' : status[0] + status.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-xs font-semibold text-slate-500 mt-3">
              Loading requests...
            </Text>
          </View>
        ) : activeTab === 'LEAVE' ? (
          /* ========================================================================= */
          /* TAB 1: LEAVE REQUESTS */
          /* ========================================================================= */
          leaves.length === 0 ? (
            <View className="py-16 items-center justify-center bg-white rounded-2xl border border-slate-200 p-6">
              <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
              <Text className="text-sm font-bold text-slate-700 mt-2">
                No leave applications matching '{statusFilter.toLowerCase()}'
              </Text>
            </View>
          ) : (
            <View className="space-y-3 gap-3">
              {leaves.map((req) => {
                const isPending = req.status === 'PENDING';
                return (
                  <View
                    key={req.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
                  >
                    {/* Header: Employee & Status */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2.5 flex-1">
                        <View className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 items-center justify-center">
                          <Text className="text-xs font-black text-indigo-700">
                            {req.employeeName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                            {req.employeeName}
                          </Text>
                          <Text className="text-[11px] text-slate-500 font-medium">
                            {req.employeeId}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={{
                          backgroundColor:
                            req.status === 'APPROVED'
                              ? '#DCFCE7'
                              : req.status === 'REJECTED'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color:
                              req.status === 'APPROVED'
                                ? '#15803D'
                                : req.status === 'REJECTED'
                                ? '#B91C1C'
                                : '#D97706',
                          }}
                        >
                          {req.status}
                        </Text>
                      </View>
                    </View>

                    {/* Leave Details Box */}
                    <View className="p-3 bg-slate-50 rounded-xl space-y-1.5 gap-1.5 mb-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5">
                          <Ionicons name="pricetag-outline" size={13} color="#4F46E5" />
                          <Text className="text-xs text-slate-600 font-medium">Type & Duration</Text>
                        </View>
                        <Text className="text-xs font-bold text-slate-900">
                          {req.leaveType} • {req.durationType.replace('_', ' ')} ({req.daysCount} Day{req.daysCount > 1 ? 's' : ''})
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5">
                          <Ionicons name="time-outline" size={13} color="#64748B" />
                          <Text className="text-xs text-slate-600 font-medium">Period</Text>
                        </View>
                        <Text className="text-xs font-semibold text-slate-800">
                          {req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`}
                        </Text>
                      </View>

                      {req.reason && (
                        <View className="pt-1 border-t border-slate-200/60">
                          <Text className="text-[11px] text-slate-500 font-medium italic">
                            "{req.reason}"
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons for Pending */}
                    {isPending ? (
                      <View className="flex-row items-center gap-2 pt-1">
                        <TouchableOpacity
                          onPress={() => handleOpenDecision('LEAVE', req.id, 'REJECT', req.employeeName)}
                          activeOpacity={0.8}
                          className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center flex-row gap-1"
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                          <Text className="text-xs font-bold text-rose-700">Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenDecision('LEAVE', req.id, 'APPROVE', req.employeeName)}
                          activeOpacity={0.8}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1 shadow-xs"
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text className="text-xs font-bold text-white">Approve Leave</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="flex-row items-center justify-between pt-1">
                        <Text className="text-[10px] text-slate-400 font-medium">
                          Reviewed by {req.approvedOrRejectedBy || 'Admin'} on {req.reviewedOn || 'today'}
                        </Text>
                        {req.comments && (
                          <Text className="text-[10px] text-slate-500 italic">
                            Note: {req.comments}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* ========================================================================= */
          /* TAB 2: OVERTIME REQUESTS */
          /* ========================================================================= */
          overtimes.length === 0 ? (
            <View className="py-16 items-center justify-center bg-white rounded-2xl border border-slate-200 p-6">
              <Ionicons name="time-outline" size={40} color="#94A3B8" />
              <Text className="text-sm font-bold text-slate-700 mt-2">
                No overtime records matching '{statusFilter.toLowerCase()}'
              </Text>
            </View>
          ) : (
            <View className="space-y-3 gap-3">
              {overtimes.map((ot) => {
                const isPending = ot.status === 'PENDING';
                return (
                  <View
                    key={ot.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm"
                  >
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2.5 flex-1">
                        <View className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 items-center justify-center">
                          <Ionicons name="time" size={18} color="#D97706" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                            {ot.employeeName || ot.employeeId}
                          </Text>
                          <Text className="text-[11px] text-slate-500 font-medium">
                            {ot.date} • {ot.hoursFormatted} extra
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          backgroundColor:
                            ot.status === 'APPROVED'
                              ? '#DCFCE7'
                              : ot.status === 'REJECTED'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color:
                              ot.status === 'APPROVED'
                                ? '#15803D'
                                : ot.status === 'REJECTED'
                                ? '#B91C1C'
                                : '#D97706',
                          }}
                        >
                          {ot.status}
                        </Text>
                      </View>
                    </View>

                    {/* Details Box */}
                    <View className="p-3 bg-slate-50 rounded-xl space-y-1.5 gap-1.5 mb-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-slate-600 font-medium">Clock-out Timing</Text>
                        <Text className="text-xs font-bold text-slate-900">
                          {ot.startTime} → {ot.endTime} ({ot.hoursFormatted})
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-slate-600 font-medium">Compensation Type</Text>
                        <Text className="text-xs font-semibold text-indigo-700">
                          {ot.compensationMethod === 'EARLY_LEAVE_ADJUSTMENT'
                            ? 'Weekly Early-Leave Credit'
                            : 'Reimbursement Claim'}
                        </Text>
                      </View>

                      <View className="pt-1 border-t border-slate-200/60">
                        <Text className="text-[11px] text-slate-500 font-medium italic">
                          "{ot.reason}"
                        </Text>
                      </View>
                    </View>

                    {/* Action Row */}
                    {isPending ? (
                      <View className="flex-row items-center gap-2 pt-1">
                        <TouchableOpacity
                          onPress={() =>
                            handleOpenDecision('OVERTIME', ot.id, 'REJECT', ot.employeeName || ot.employeeId)
                          }
                          activeOpacity={0.8}
                          className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center flex-row gap-1"
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                          <Text className="text-xs font-bold text-rose-700">Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            handleOpenDecision('OVERTIME', ot.id, 'APPROVE', ot.employeeName || ot.employeeId)
                          }
                          activeOpacity={0.8}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 items-center justify-center flex-row gap-1 shadow-xs"
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text className="text-xs font-bold text-white">Approve Credit</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="pt-1">
                        <Text className="text-[10px] text-slate-400 font-medium">
                          Reviewed by {ot.status === 'APPROVED' ? 'Admin (Credit Active)' : 'Admin (Rejected)'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* REVIEW DECISION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        visible={decisionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDecisionModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl">
            <View className="flex-row items-center gap-2 mb-2">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: targetAction === 'APPROVE' ? '#DCFCE7' : '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={targetAction === 'APPROVE' ? 'checkmark' : 'close'}
                  size={18}
                  color={targetAction === 'APPROVE' ? '#15803D' : '#B91C1C'}
                />
              </View>
              <Text className="text-base font-black text-slate-900">
                Confirm {targetAction === 'APPROVE' ? 'Approval' : 'Rejection'}
              </Text>
            </View>

            <Text className="text-xs text-slate-600 mb-3">
              You are about to {targetAction.toLowerCase()} this {targetType.toLowerCase()} request for{' '}
              <Text className="font-bold text-slate-900">{targetEmployeeName}</Text>.
            </Text>

            <Text className="text-xs font-bold text-slate-700 mb-1">
              Admin Review Comments / Notes
            </Text>
            <TextInput
              value={adminComment}
              onChangeText={setAdminComment}
              placeholder="Add optional notes for the employee..."
              className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium mb-4"
              multiline
              numberOfLines={2}
            />

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setDecisionModalVisible(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitDecision}
                disabled={isSubmitting}
                style={{
                  backgroundColor: targetAction === 'APPROVE' ? '#059669' : '#DC2626',
                }}
                className="flex-1 py-2.5 rounded-xl items-center justify-center shadow-xs"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-xs font-bold text-white">
                    Confirm {targetAction === 'APPROVE' ? 'Approve' : 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

