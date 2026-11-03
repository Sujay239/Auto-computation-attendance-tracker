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
import { holidayService } from '../../services/holidayService';
import { HolidayItem } from '../../types/company';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const HolidaysScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [filterType, setFilterType] = useState<'ALL' | 'UPCOMING' | 'NATIONAL' | 'FESTIVAL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allHolidays, setAllHolidays] = useState<HolidayItem[]>(holidayService.getHolidays());
  const [upcomingHolidays, setUpcomingHolidays] = useState<HolidayItem[]>(holidayService.getUpcomingHolidays());
  const [nextHolidayInfo, setNextHolidayInfo] = useState(holidayService.getNextHoliday());

  const loadHolidays = async () => {
    try {
      const res = await holidayService.fetchRealtimeHolidays();
      if (res.holidays && Array.isArray(res.holidays)) {
        setAllHolidays(res.holidays);
      }
      if (res.upcomingHolidays && Array.isArray(res.upcomingHolidays)) {
        setUpcomingHolidays(res.upcomingHolidays);
      }
      if (res.nextHoliday) {
        setNextHolidayInfo(res.nextHoliday);
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHolidays();
    setRefreshing(false);
  };

  const filteredHolidays = allHolidays.filter((h) => {
    if (!h) return false;
    if (filterType === 'UPCOMING') {
      return upcomingHolidays.some((u) => u && (u.id === h.id || u.date === h.date));
    }
    if (filterType === 'NATIONAL') {
      return h.type === 'NATIONAL';
    }
    if (filterType === 'FESTIVAL') {
      return h.type === 'FESTIVAL';
    }
    return true;
  });

  const getBadgeVariant = (type?: string) => {
    switch (type) {
      case 'NATIONAL':
        return 'danger';
      case 'FESTIVAL':
        return 'purple';
      case 'PUBLIC':
      default:
        return 'info';
    }
  };

  const formatMonth = (dateStr?: string) => {
    if (!dateStr) return 'DAY';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length >= 2) {
      const monthIndex = parseInt(parts[1], 10) - 1;
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      if (monthIndex >= 0 && monthIndex < 12) {
        return monthNames[monthIndex];
      }
    }
    const d = new Date(cleanDate);
    return isNaN(d.getTime()) ? 'DAY' : d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  };

  const formatDay = (dateStr?: string) => {
    if (!dateStr) return '01';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length >= 3) {
      return parts[2].substring(0, 2).padStart(2, '0');
    }
    const d = new Date(cleanDate);
    return isNaN(d.getTime()) ? '01' : d.getDate().toString().padStart(2, '0');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Top Header with Safe Area Protection */}
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFFFFF' }}>
        <Header
          title="Company Holidays"
          subtitle="Official Non-Working Days & Calendar"
          showBack
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 20) + 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && allHolidays.length === 0 ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-xs font-bold text-slate-500 mt-3">
              Loading company holiday calendar...
            </Text>
          </View>
        ) : (
          <>
            {/* Next Upcoming Holiday Banner */}
            {nextHolidayInfo && nextHolidayInfo.holiday && (
              <View
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: 20,
                  padding: 18,
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 3,
                }}
                className="mb-4"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-lg bg-blue-500/20 items-center justify-center">
                      <Ionicons name="sparkles" size={15} color="#60A5FA" />
                    </View>
                    <Text className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                      Next Official Holiday
                    </Text>
                  </View>

                  <View className="bg-blue-600/30 border border-blue-400/40 px-2.5 py-1 rounded-full">
                    <Text className="text-[10px] font-bold text-blue-200">
                      {nextHolidayInfo.isToday
                        ? 'Today!'
                        : nextHolidayInfo.daysRemaining === 1
                        ? 'Tomorrow'
                        : `In ${nextHolidayInfo.daysRemaining} days`}
                    </Text>
                  </View>
                </View>

                <Text className="text-xl font-black text-white tracking-tight">
                  {nextHolidayInfo.holiday.name}
                </Text>

                <View className="flex-row items-center gap-2 mt-1">
                  <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                  <Text className="text-xs text-slate-300 font-medium">
                    {nextHolidayInfo.holiday.date || 'Upcoming'}{' '}
                    {nextHolidayInfo.holiday.day ? `(${nextHolidayInfo.holiday.day})` : ''}
                  </Text>
                </View>

                {nextHolidayInfo.holiday.description && (
                  <Text className="text-xs text-slate-400 mt-2">
                    {nextHolidayInfo.holiday.description}
                  </Text>
                )}

                <View className="mt-3.5 pt-3 border-t border-slate-800/80 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                    <Text className="text-[11px] font-bold text-emerald-400">
                      Office Closed • Paid Holiday
                    </Text>
                  </View>

                  <Text className="text-[10px] text-slate-400 font-medium">
                    Exempt from Attendance
                  </Text>
                </View>
              </View>
            )}

            {/* System Exemption Notice Banner */}
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-4 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-600 items-center justify-center shadow-xs">
                <Ionicons name="calendar" size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-emerald-950">
                  Automated Working Day Exemption
                </Text>
                <Text className="text-[11px] text-emerald-800 leading-snug mt-0.5">
                  The biometric shift engine automatically excludes all listed holidays. System will never penalize or mark absenteeism on these dates.
                </Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View className="flex-row items-center gap-2 mb-3">
              {(
                [
                  { key: 'ALL', label: `All (${allHolidays.length})` },
                  { key: 'UPCOMING', label: `Upcoming (${upcomingHolidays.length})` },
                  { key: 'NATIONAL', label: 'National' },
                  { key: 'FESTIVAL', label: 'Festivals' },
                ] as const
              ).map((tab) => {
                const isSelected = filterType === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setFilterType(tab.key)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                      borderColor: isSelected ? '#2563EB' : '#CBD5E1',
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? '700' : '600',
                        color: isSelected ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Holidays List */}
            {filteredHolidays.length === 0 ? (
              <View className="py-16 items-center justify-center bg-white rounded-2xl border border-slate-200 p-6 my-2">
                <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
                <Text className="text-sm font-bold text-slate-700 mt-2">
                  No holidays found
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1">
                  There are no {filterType !== 'ALL' ? filterType.toLowerCase() : ''} holidays in the corporate calendar.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {filteredHolidays.map((holiday: HolidayItem, idx: number) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const cleanHolidayDate = holiday.date ? (holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date) : '';
                  const isPast = !!(cleanHolidayDate && cleanHolidayDate < todayStr);

                  return (
                    <Card
                      key={holiday.id || cleanHolidayDate || `hol-${idx}`}
                      style={{
                        opacity: isPast ? 0.75 : 1,
                        backgroundColor: '#FFFFFF',
                      }}
                      className="p-3.5"
                    >
                      <View className="flex-row items-center gap-3.5">
                        {/* Left Calendar Date Block */}
                        <View
                          style={{
                            backgroundColor: isPast ? '#F1F5F9' : '#EFF6FF',
                            borderColor: isPast ? '#E2E8F0' : '#BFDBFE',
                            borderWidth: 1,
                            width: 52,
                            height: 54,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: isPast ? '#64748B' : '#2563EB',
                              fontSize: 10,
                              fontWeight: '800',
                              letterSpacing: 0.5,
                            }}
                          >
                            {formatMonth(holiday.date)}
                          </Text>
                          <Text
                            style={{
                              color: isPast ? '#334155' : '#1E40AF',
                              fontSize: 18,
                              fontWeight: '900',
                              lineHeight: 22,
                            }}
                          >
                            {formatDay(holiday.date)}
                          </Text>
                        </View>

                        {/* Holiday Information */}
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between mb-0.5">
                            <Text
                              numberOfLines={1}
                              className="text-sm font-bold text-slate-900 flex-1 mr-2"
                            >
                              {holiday.name}
                            </Text>
                            <Badge
                              label={holiday.type || 'PUBLIC'}
                              variant={getBadgeVariant(holiday.type)}
                              size="sm"
                            />
                          </View>

                          <Text className="text-[11px] text-slate-500 font-medium">
                            {holiday.day || 'Holiday'} • {cleanHolidayDate || 'TBD'}
                          </Text>

                          {holiday.description && (
                            <Text
                              numberOfLines={1}
                              className="text-[11px] text-slate-400 mt-0.5"
                            >
                              {holiday.description}
                            </Text>
                          )}

                          <View className="flex-row items-center gap-1 mt-1.5">
                            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <Text className="text-[10px] font-bold text-emerald-700">
                              Office Closed • Excluded from Working Days
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Footer Note */}
            <Text className="text-[11px] text-slate-400 text-center mt-5">
              Auto Computation • Official HR Holiday Calendar 2026-2027
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};
