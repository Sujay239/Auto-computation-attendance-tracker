import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { leaveService } from '../../services/leaveService';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';

export const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { summary } = useAttendance();

  const [loggingOut, setLoggingOut] = useState(false);

  const leaveBalances = leaveService.getBalances();
  const totalLeave = leaveBalances.reduce((acc, curr) => acc + curr.available, 0);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header title="My Profile" subtitle="Employee Info & Preferences" />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Identity Card */}
        <Card className="mb-4 p-5 items-center">
          <View className="mb-3">
            <Avatar
              uri={user?.avatarUrl}
              name={user ? `${user.firstName} ${user.lastName}` : 'Sujay Verma'}
              size={80}
              showStatusDot
            />
          </View>

          <Text className="text-xl font-black text-slate-900">
            {user ? `${user.firstName} ${user.lastName}` : 'Sujay Verma'}
          </Text>
          <Text className="text-xs font-bold text-blue-600 mt-0.5">
            {user?.designation || 'Senior Full Stack Engineer'}
          </Text>
          <Text className="text-[11px] text-slate-500 mt-1">
            {user?.department || 'Engineering & Technology'} • ID: {user?.id || 'EMP-024'}
          </Text>

          <View className="flex-row gap-2 mt-3.5">
            <Badge label="Full-Time Active" variant="success" size="sm" />
            <Badge label="Salt Lake Sector V" variant="neutral" size="sm" />
          </View>
        </Card>

        {/* Quick Summary Numbers */}
        <View className="flex-row gap-2.5 mb-4">
          <Card className="flex-1 p-3 items-center">
            <Text className="text-[10px] uppercase font-bold text-slate-400">Days Present</Text>
            <Text className="text-xl font-black text-slate-900 my-0.5">
              {summary.presentDays}
            </Text>
            <Text className="text-[10px] text-slate-400">Current Month</Text>
          </Card>

          <Card className="flex-1 p-3 items-center">
            <Text className="text-[10px] uppercase font-bold text-slate-400">Leave Balance</Text>
            <Text className="text-xl font-black text-purple-600 my-0.5">
              {totalLeave}
            </Text>
            <Text className="text-[10px] text-slate-400">Days Remaining</Text>
          </Card>

          <Card className="flex-1 p-3 items-center">
            <Text className="text-[10px] uppercase font-bold text-slate-400">Late Left</Text>
            <Text className="text-xl font-black text-amber-600 my-0.5">
              {summary.lateAllowancesRemaining} / 3
            </Text>
            <Text className="text-[10px] text-slate-400">Allowances</Text>
          </Card>
        </View>

        {/* Navigation Menu Options */}
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Account & Preferences
        </Text>

        <Card className="mb-4 p-0 overflow-hidden divide-y divide-slate-100">
          <TouchableOpacity
            onPress={() => router.push('/profile/personal')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="person-outline" size={17} color="#2563EB" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800">
                  Personal & Employment Info
                </Text>
                <Text className="text-[10px] text-slate-400">
                  Contact details, manager, emergency contacts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-purple-50 items-center justify-center">
                <Ionicons name="notifications-outline" size={17} color="#7C3AED" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800">
                  Notification Center
                </Text>
                <Text className="text-[10px] text-slate-400">
                  Reminders, approvals & announcements
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/holidays')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center">
                <Ionicons name="calendar-outline" size={17} color="#059669" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800">
                  Company Holidays Calendar
                </Text>
                <Text className="text-[10px] text-slate-400">
                  13 official holidays • Automated non-working day exemption
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/profile/settings')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center">
                <Ionicons name="settings-outline" size={17} color="#64748B" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800">
                  App Policies & Settings
                </Text>
                <Text className="text-[10px] text-slate-400">
                  Configured timings, buffer rules & policy docs
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </Card>

        {/* Security & Sign Out */}
        <Button
          label={loggingOut ? 'Signing out...' : 'Sign Out of Account'}
          variant="outline"
          size="md"
          isLoading={loggingOut}
          onPress={handleLogout}
          icon={<Ionicons name="log-out-outline" size={18} color="#DC2626" />}
          className="border-rose-200"
        />

        <Text className="text-[11px] text-slate-400 text-center mt-3">
          Auto Computation • Employee Attendance & HRMS v1.0
        </Text>
      </ScrollView>
    </View>
  );
};
