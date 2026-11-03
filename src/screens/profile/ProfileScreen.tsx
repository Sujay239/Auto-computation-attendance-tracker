import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  const { user, logout, updateAvatar } = useAuth();
  const { summary, totalLeaveAvailable } = useAttendance();

  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const totalLeave = totalLeaveAvailable;

  const handlePickAvatar = async () => {
    setAvatarError(null);
    setAvatarMessage(null);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setAvatarError('Permission to access photos is required to change avatar.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || !pickerResult.assets[0]) {
        return;
      }

      const asset = pickerResult.assets[0];
      const base64Data = asset.base64;
      if (!base64Data) {
        setAvatarError('Failed to convert image to base64 format.');
        return;
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      setUploadingAvatar(true);
      const res = await updateAvatar(dataUri);
      setUploadingAvatar(false);

      if (res.success) {
        setAvatarMessage('Avatar updated successfully!');
        setTimeout(() => setAvatarMessage(null), 3500);
      } else {
        setAvatarError(res.error || 'Failed to update avatar in database.');
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      setAvatarError(err.message || 'An error occurred while uploading avatar.');
    }
  };

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
          <View className="mb-2">
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.8}
              disabled={uploadingAvatar}
              style={{ position: 'relative' }}
            >
              <Avatar
                uri={user?.avatarUrl}
                name={user ? `${user.firstName} ${user.lastName}` : 'Rahul Sharma'}
                size={84}
                showStatusDot={!uploadingAvatar}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  backgroundColor: '#2563EB',
                  borderRadius: 14,
                  width: 28,
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7} className="mb-2">
            <Text className="text-[11px] font-semibold text-blue-600">
              {uploadingAvatar ? 'Converting & Uploading Base64...' : 'Tap photo to change avatar'}
            </Text>
          </TouchableOpacity>

          {avatarMessage ? (
            <View className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg mb-2">
              <Text className="text-[11px] font-semibold text-emerald-700">{avatarMessage}</Text>
            </View>
          ) : null}

          {avatarError ? (
            <View className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg mb-2">
              <Text className="text-[11px] font-semibold text-rose-700">{avatarError}</Text>
            </View>
          ) : null}

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
            onPress={() => router.push('/salary' as any)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                <Ionicons name="calculator-outline" size={17} color="#D97706" />
              </View>
              <View>
                <Text className="text-xs font-bold text-slate-800">
                  Salary & Deductions Breakdown
                </Text>
                <Text className="text-[10px] text-slate-400">
                  Daily & half-day rates, leave adjustments & net pay
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
