import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Avatar } from '../../components/common/Avatar';
import { COMPANY_CONFIG, OFFICE_TIMINGS } from '../../constants/appConfig';

export const AdminSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateAvatar, changePassword, updateUser } = useAuth();

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);

  // Change Password Modal State
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Edit Profile (Contact) Modal State
  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 1. Pick and Upload Avatar
  const handlePickAvatar = async () => {
    setAvatarErrorMsg(null);
    setAvatarSuccessMsg(null);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Camera roll access is needed to update your profile photo.'
        );
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
        setAvatarErrorMsg('Failed to process image file. Please try another photo.');
        return;
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      setUploadingAvatar(true);
      const res = await updateAvatar(dataUri);
      setUploadingAvatar(false);

      if (res.success) {
        setAvatarSuccessMsg('Profile photo updated successfully!');
        setTimeout(() => setAvatarSuccessMsg(null), 3500);
      } else {
        setAvatarErrorMsg(res.error || 'Failed to update avatar photo in database.');
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      setAvatarErrorMsg(err.message || 'An unexpected error occurred while updating photo.');
    }
  };

  // 2. Submit Change Password
  const handleChangePasswordSubmit = async () => {
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    const res = await changePassword(currentPassword, newPassword);
    setIsSubmittingPassword(false);

    if (res.success) {
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Updated',
        'Your administrator account password has been changed successfully. Please remember this password for your next login.'
      );
    } else {
      setPasswordError(res.error || 'Incorrect current password or server error.');
    }
  };

  // 3. Open and Submit Profile Details Edit
  const handleOpenProfileModal = () => {
    setProfileError(null);
    setPhoneInput(user?.phone || '');
    setIsProfileModalVisible(true);
  };

  const handleProfileSubmit = async () => {
    setProfileError(null);
    if (!phoneInput.trim()) {
      setProfileError('Please enter a valid contact phone number.');
      return;
    }

    setIsSubmittingProfile(true);
    const res = await authService.updateProfile({ phone: phoneInput.trim() });
    setIsSubmittingProfile(false);

    if (res.success && res.employee) {
      updateUser(res.employee);
      setIsProfileModalVisible(false);
      Alert.alert('Details Saved', 'Your contact phone number has been updated successfully.');
    } else {
      setProfileError(res.error || 'Failed to update profile details.');
    }
  };

  // 4. Session Controls
  const handleLogout = () => {
    Alert.alert(
      'Sign Out of Admin Portal',
      'Are you sure you want to end your administrator session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleSwitchToEmployeeView = () => {
    router.replace('/(tabs)/home');
  };

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Administrator';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Header */}
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
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/home' as any))}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-black text-slate-900" numberOfLines={1}>
              System Administration
            </Text>
            <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
              Corporate parameters, administrator credentials, and settings
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Toast Feedback Messages */}
        {avatarSuccessMsg && (
          <View className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text className="text-xs font-bold text-emerald-800 flex-1">
              {avatarSuccessMsg}
            </Text>
          </View>
        )}

        {avatarErrorMsg && (
          <View className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex-row items-center gap-2">
            <Ionicons name="alert-circle" size={16} color="#E11D48" />
            <Text className="text-xs font-bold text-rose-800 flex-1">
              {avatarErrorMsg}
            </Text>
          </View>
        )}

        {/* 1. Administrator Profile & Avatar Card */}
        <View className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-4 mb-4">
            {/* Interactive Avatar with Camera Upload Icon */}
            <TouchableOpacity
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              <Avatar
                uri={user?.avatarUrl}
                name={fullName}
                size={70}
                showStatusDot={!uploadingAvatar}
                statusColor="#10B981"
              />

              {uploadingAvatar ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 35,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: '#4F46E5',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 3,
                  }}
                >
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                  {fullName}
                </Text>
                <View className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                  <Text className="text-[10px] font-black text-indigo-700">ADMIN</Text>
                </View>
              </View>

              <Text className="text-xs text-slate-600 font-semibold mt-0.5" numberOfLines={1}>
                {user?.email || 'admin@autocomputation.com'}
              </Text>

              <Text className="text-[11px] text-slate-400 mt-0.5">
                ID: {user?.id} • {user?.designation || 'System Administrator'}
              </Text>
            </View>
          </View>

          {/* Quick Account Information */}
          <View className="p-3 bg-slate-50 rounded-xl space-y-2 gap-2 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="call-outline" size={13} color="#64748B" />
                <Text className="text-xs text-slate-500 font-medium">Contact Phone</Text>
              </View>
              <Text className="text-xs font-bold text-slate-800">
                {user?.phone || 'Not provided'}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="shield-checkmark-outline" size={13} color="#64748B" />
                <Text className="text-xs text-slate-500 font-medium">Access Level</Text>
              </View>
              <Text className="text-xs font-bold text-indigo-700">
                Super Administrator (Full Privileges)
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="business-outline" size={13} color="#64748B" />
                <Text className="text-xs text-slate-500 font-medium">Location</Text>
              </View>
              <Text className="text-xs font-medium text-slate-700">
                {user?.workLocation || 'Chinar Park, Kolkata'}
              </Text>
            </View>
          </View>

          {/* Action Buttons: Change Password & Edit Details */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => {
                setPasswordError(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setIsPasswordModalVisible(true);
              }}
              activeOpacity={0.8}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 flex-row items-center justify-center gap-1.5"
            >
              <Ionicons name="key-outline" size={15} color="#4F46E5" />
              <Text className="text-xs font-bold text-indigo-700">
                Change Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenProfileModal}
              activeOpacity={0.8}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200 flex-row items-center justify-center gap-1.5"
            >
              <Ionicons name="create-outline" size={15} color="#334155" />
              <Text className="text-xs font-bold text-slate-700">
                Edit Contact
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Corporate Office Timings Policy */}
        <View className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="time" size={18} color="#4F46E5" />
            <Text className="text-sm font-black text-slate-900">
              Office Timings & Attendance Rules
            </Text>
          </View>

          <View className="space-y-2 gap-2">
            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Official Office Start</Text>
              <Text className="text-xs font-bold text-slate-900">
                {OFFICE_TIMINGS.openingTime} AM
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Grace Arrival Buffer</Text>
              <Text className="text-xs font-bold text-emerald-700">
                {OFFICE_TIMINGS.openingBufferMinutes} Minutes (Until 10:20 AM)
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Half-Day Cutoff Threshold</Text>
              <Text className="text-xs font-bold text-rose-700">
                {OFFICE_TIMINGS.maxLateArrivalTime} AM (Strict Half-Day)
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Expected Clock-out</Text>
              <Text className="text-xs font-bold text-slate-900">
                {OFFICE_TIMINGS.closingTime} (07:00 PM)
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Overtime Extension Threshold</Text>
              <Text className="text-xs font-bold text-amber-700">
                After 07:30 PM (30 min extension window)
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Monthly Late Allowances</Text>
              <Text className="text-xs font-bold text-indigo-700">
                {OFFICE_TIMINGS.monthlyLateAllowance} Instances / Month
              </Text>
            </View>

            <View className="p-2.5 bg-slate-50 rounded-xl flex-row items-center justify-between">
              <Text className="text-xs text-slate-600 font-medium">Work Location Mode</Text>
              <Text className="text-xs font-bold text-slate-700">
                Strict In-Office (WFH not permitted)
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Corporate Entity Details */}
        <View className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="business" size={18} color="#059669" />
            <Text className="text-sm font-black text-slate-900">
              Corporate Headquarters
            </Text>
          </View>

          <View className="space-y-1.5 gap-1.5 text-xs">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">Company</Text>
              <Text className="text-xs font-bold text-slate-900">{COMPANY_CONFIG.name}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">Address</Text>
              <Text className="text-xs font-medium text-slate-800 text-right flex-1 ml-4">
                {COMPANY_CONFIG.address}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-slate-500">Official Contact</Text>
              <Text className="text-xs font-medium text-slate-800">{COMPANY_CONFIG.contactEmail}</Text>
            </View>
          </View>
        </View>

        {/* 4. View Switcher & Session Actions */}
        <View className="space-y-2.5 gap-2.5">
          <TouchableOpacity
            onPress={handleSwitchToEmployeeView}
            activeOpacity={0.8}
            className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex-row items-center justify-center gap-2"
          >
            <Ionicons name="swap-horizontal" size={18} color="#4F46E5" />
            <Text className="text-xs font-bold text-indigo-700">
              Switch to Employee Attendance View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex-row items-center justify-center gap-2"
          >
            <Ionicons name="log-out-outline" size={18} color="#E11D48" />
            <Text className="text-xs font-bold text-rose-700">
              Sign Out of Admin Console
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: CHANGE PASSWORD                                                  */}
      {/* ========================================================================= */}
      <Modal
        visible={isPasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}
        >
          <View className="bg-white rounded-t-3xl p-5 pt-4 border-t border-slate-100 max-h-[85%]">
            {/* Modal Drag Indicator */}
            <View className="w-12 h-1.5 bg-slate-300 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <View>
                <Text className="text-base font-black text-slate-900">
                  Change Password
                </Text>
                <Text className="text-xs text-slate-500">
                  Update your administrator login credentials
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPasswordModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {passwordError && (
              <View className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-800 flex-1">
                  {passwordError}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Password */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Current Password *</Text>
                <View className="flex-row items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <TextInput
                    placeholder="Enter existing password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    className="flex-1 text-sm text-slate-900 font-medium p-0"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">New Password *</Text>
                <View className="flex-row items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <TextInput
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    className="flex-1 text-sm text-slate-900 font-medium p-0"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Confirm New Password *</Text>
                <View className="flex-row items-center px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <TextInput
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    className="flex-1 text-sm text-slate-900 font-medium p-0"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Security Policy Reminder */}
              <View className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex-row items-start gap-2">
                <Ionicons name="information-circle-outline" size={16} color="#64748B" style={{ marginTop: 1 }} />
                <Text className="text-[11px] text-slate-600 flex-1 leading-4">
                  Passwords are encrypted using bcrypt salt hashing in PostgreSQL. Changes take effect immediately.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-3 mb-6">
                <TouchableOpacity
                  onPress={() => setIsPasswordModalVisible(false)}
                  disabled={isSubmittingPassword}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleChangePasswordSubmit}
                  disabled={isSubmittingPassword}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 items-center justify-center flex-row gap-2"
                >
                  {isSubmittingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={15} color="#FFFFFF" />
                      <Text className="text-xs font-bold text-white">Update Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT CONTACT INFO                                                */}
      {/* ========================================================================= */}
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' }}
        >
          <View className="bg-white rounded-t-3xl p-5 pt-4 border-t border-slate-100 max-h-[80%]">
            <View className="w-12 h-1.5 bg-slate-300 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <View>
                <Text className="text-base font-black text-slate-900">
                  Edit Administrator Contact
                </Text>
                <Text className="text-xs text-slate-500">
                  Update your contact phone number
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsProfileModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {profileError && (
              <View className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-800 flex-1">
                  {profileError}
                </Text>
              </View>
            )}

            {/* Work Email (Read-only) */}
            <View className="mb-3.5">
              <Text className="text-xs font-bold text-slate-500 mb-1.5">Official Admin Email (Read-only)</Text>
              <TextInput
                value={user?.email || ''}
                editable={false}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-500 font-medium"
              />
            </View>

            {/* Phone Number */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-slate-700 mb-1.5">Contact Phone Number *</Text>
              <TextInput
                placeholder="+91 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phoneInput}
                onChangeText={setPhoneInput}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row items-center gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setIsProfileModalVisible(false)}
                disabled={isSubmittingProfile}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="text-xs font-bold text-slate-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleProfileSubmit}
                disabled={isSubmittingProfile}
                className="flex-1 py-3.5 rounded-xl bg-indigo-600 items-center justify-center flex-row gap-2"
              >
                {isSubmittingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                    <Text className="text-xs font-bold text-white">Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
