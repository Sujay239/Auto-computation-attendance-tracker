import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { HolidayItem, NewHolidayInput } from '../../types/admin';

export const AdminHolidaysScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Add Holiday Modal State
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newHoliday, setNewHoliday] = useState<NewHolidayInput>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    day: 'Monday',
    type: 'PUBLIC',
    description: '',
    isOfficeClosed: true,
  });

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    const res = await adminService.getHolidays();
    if (res.success && Array.isArray(res.holidays)) {
      // Filter out any ghost/empty objects from DB or n8n
      const validHolidays = res.holidays.filter(
        (h) => h && typeof h === 'object' && h.id && h.name && h.date
      );
      setHolidays(validHolidays);
    } else {
      setHolidays([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHolidays();
  };

  const handleOpenAddModal = () => {
    setFormError(null);
    setNewHoliday({
      name: '',
      date: new Date().toISOString().split('T')[0],
      day: 'Monday',
      type: 'PUBLIC',
      description: '',
      isOfficeClosed: true,
    });
    setIsModalVisible(true);
  };

  const handleAddSubmit = async () => {
    setFormError(null);
    if (!newHoliday.name.trim()) {
      setFormError('Please enter holiday name.');
      return;
    }
    if (!newHoliday.date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(newHoliday.date)) {
      setFormError('Please enter date in YYYY-MM-DD format.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminService.addHoliday(newHoliday);
    setIsSubmitting(false);

    if (res.success) {
      setIsModalVisible(false);
      Alert.alert('Holiday Added', `Holiday "${newHoliday.name}" added to corporate calendar.`);
      fetchHolidays();
    } else {
      setFormError(res.error || 'Failed to add holiday.');
    }
  };

  const handleDeleteHoliday = (holiday: HolidayItem) => {
    Alert.alert(
      'Delete Holiday',
      `Are you sure you want to remove "${holiday.name}" (${holiday.date}) from holidays calendar?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await adminService.deleteHoliday(holiday.id || holiday.date);
            if (res.success) {
              Alert.alert('Deleted', 'Holiday removed from calendar.');
              fetchHolidays();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete holiday.');
            }
          },
        },
      ]
    );
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'NATIONAL':
        return { bg: '#EFF6FF', text: '#1D4ED8' };
      case 'FESTIVAL':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'OPTIONAL':
        return { bg: '#F3E8FF', text: '#7E22CE' };
      default:
        return { bg: '#DCFCE7', text: '#15803D' };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Safe Area Header */}
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
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-black text-slate-900">
              Corporate Holidays
            </Text>
            <Text className="text-xs text-slate-500 font-medium">
              Official gazetted holidays & office non-working days
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 shadow-sm"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Add Holiday</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <Text className="text-xs font-semibold text-slate-500 mt-3">
              Loading holidays...
            </Text>
          </View>
        ) : holidays.length === 0 ? (
          <View className="py-16 items-center justify-center bg-white rounded-2xl border border-slate-200 p-6">
            <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
            <Text className="text-sm font-bold text-slate-700 mt-2">
              No holidays registered in calendar
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1">
              Tap "+ Add Holiday" above to declare official corporate holidays.
            </Text>
          </View>
        ) : (
          <View className="space-y-3 gap-3">
            {holidays.map((hol) => {
              const typeStyle = getTypeStyle(hol.type);
              const [y, m, d] = (hol.date || '').split('-');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthStr = monthNames[parseInt(m || '1', 10) - 1] || 'Day';

              return (
                <View
                  key={hol.id || hol.date}
                  className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    {/* Date Block */}
                    <View className="w-12 h-14 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center">
                      <Text className="text-base font-black text-emerald-800">{d || '01'}</Text>
                      <Text className="text-[10px] font-bold text-emerald-600 uppercase">
                        {monthStr}
                      </Text>
                    </View>

                    {/* Holiday Info */}
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                        {hol.name}
                      </Text>
                      <Text className="text-xs text-slate-500 font-medium mt-0.5">
                        {hol.day} • {hol.date}
                      </Text>

                      <View className="flex-row items-center gap-2 mt-1.5">
                        <View
                          style={{
                            backgroundColor: typeStyle.bg,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: typeStyle.text, fontSize: 9.5, fontWeight: '700' }}>
                            {hol.type}
                          </Text>
                        </View>

                        {hol.isOfficeClosed && (
                          <View className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200">
                            <Text className="text-[9.5px] font-bold text-rose-700">Office Closed</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Delete Action Button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteHoliday(hol)}
                    activeOpacity={0.7}
                    className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 items-center justify-center ml-2"
                  >
                    <Ionicons name="trash-outline" size={16} color="#E11D48" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* ADD HOLIDAY MODAL (Full width, roomy fields) */}
      {/* ========================================================================= */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        >
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
            <View>
              <Text className="text-lg font-black text-slate-900">Add New Holiday</Text>
              <Text className="text-xs text-slate-500 font-medium">
                Add an official non-working day to the calendar
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {formError && (
              <View className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#E11D48" />
                <Text className="text-xs font-bold text-rose-700 flex-1">{formError}</Text>
              </View>
            )}

            <View className="space-y-4 gap-4 pb-6">
              {/* Holiday Name - Full Width */}
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Holiday Name *</Text>
                <TextInput
                  placeholder="e.g. Durga Puja / Republic Day / Eid"
                  placeholderTextColor="#94A3B8"
                  value={newHoliday.name}
                  onChangeText={(t) => setNewHoliday({ ...newHoliday, name: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Date - Full Width */}
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Date (YYYY-MM-DD) *</Text>
                <TextInput
                  placeholder="2026-11-15"
                  placeholderTextColor="#94A3B8"
                  value={newHoliday.date}
                  onChangeText={(t) => setNewHoliday({ ...newHoliday, date: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Day of Week - Full Width */}
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Day of Week</Text>
                <TextInput
                  placeholder="e.g. Monday"
                  placeholderTextColor="#94A3B8"
                  value={newHoliday.day}
                  onChangeText={(t) => setNewHoliday({ ...newHoliday, day: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                />
              </View>

              {/* Classification */}
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Holiday Classification</Text>
                <View className="flex-row gap-2">
                  {(['NATIONAL', 'FESTIVAL', 'PUBLIC', 'OPTIONAL'] as const).map((cat) => {
                    const isSelected = newHoliday.type === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setNewHoliday({ ...newHoliday, type: cat })}
                        className={`flex-1 py-2.5 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            isSelected ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Office Closed Switch Card */}
              <View className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-slate-800">Office Closed</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Staff members are not required to punch in on office closed days
                  </Text>
                </View>
                <Switch
                  value={newHoliday.isOfficeClosed}
                  onValueChange={(v) => setNewHoliday({ ...newHoliday, isOfficeClosed: v })}
                  trackColor={{ false: '#CBD5E1', true: '#059669' }}
                />
              </View>

              {/* Description */}
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1.5">Description / Notice</Text>
                <TextInput
                  placeholder="Optional announcements or details for staff..."
                  placeholderTextColor="#94A3B8"
                  value={newHoliday.description}
                  onChangeText={(t) => setNewHoliday({ ...newHoliday, description: t })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-medium"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-emerald-600 items-center justify-center shadow-md mt-2 mb-6"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-sm font-bold text-white tracking-wide">
                    Save Holiday to Calendar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
