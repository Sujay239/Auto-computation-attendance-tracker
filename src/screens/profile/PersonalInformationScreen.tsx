import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';

export const PersonalInformationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Personal Information"
          subtitle="Employment & Contact Records"
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
        {/* Profile Card */}
        <Card className="mb-4 flex-row items-center gap-4">
          <Avatar
            uri={user?.avatarUrl}
            name={user ? `${user.firstName} ${user.lastName}` : 'Rahul Sharma'}
            size={64}
            showStatusDot
          />
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900">
              {user ? `${user.firstName} ${user.lastName}` : 'Rahul Sharma'}
            </Text>
            <Text className="text-xs text-blue-600 font-bold">
              {user?.id || 'EMP-022'}
            </Text>
            <Text className="text-[11px] text-slate-500 mt-0.5">
              {user?.designation || 'Frontend Developer'}
            </Text>
          </View>
        </Card>

        {/* Info Card: Employment Details */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs uppercase font-bold text-slate-400">
              Employment Details
            </Text>
            <Badge label="Verified Record" variant="success" size="sm" />
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">System Role:</Text>
              <Text className="text-xs font-bold text-blue-600">
                {user?.role || 'EMPLOYEE'}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Joining Date:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {user?.joiningDate || '2024-01-15'}
              </Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Employment Type:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {user?.employmentType || 'Full-time'}
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Work Location:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {user?.workLocation || 'Salt Lake Sector V, Kolkata (In-Office)'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Contact Information */}
        <Card className="mb-4">
          <Text className="text-xs uppercase font-bold text-slate-400 mb-3">
            Contact Records
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-slate-100">
              <Text className="text-xs text-slate-500 font-medium">Corporate Email:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {user?.email || 'sujay.verma@company.com'}
              </Text>
            </View>

            <View className="flex-row justify-between py-2">
              <Text className="text-xs text-slate-500 font-medium">Contact Phone:</Text>
              <Text className="text-xs font-bold text-slate-800">
                {user?.phone || '+91 98301 23456'}
              </Text>
            </View>
          </View>
        </Card>

        <View className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex-row gap-2">
          <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
          <Text className="text-[11px] text-slate-500 flex-1 leading-relaxed">
            Internal corporate credentials managed by Auto Computation Systems Administration.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
