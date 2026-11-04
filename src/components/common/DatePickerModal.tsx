import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  selectedDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD (defaults to today)
  title?: string;
  subtitle?: string;
  disableSundays?: boolean; // When true, Sundays are disabled as weekly off
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  minDate,
  title = 'Select Date',
  subtitle = 'Choose a valid upcoming date',
  disableSundays = false,
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const effectiveMinDate = minDate || todayStr;

  // Helper to pick first valid non-Sunday date if disableSundays is active
  const getValidInitialDate = (candidateStr?: string) => {
    let dateStr = candidateStr && candidateStr >= effectiveMinDate ? candidateStr : effectiveMinDate;
    if (disableSundays) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      if (dObj.getDay() === 0) {
        // Shift to Monday
        dObj.setDate(dObj.getDate() + 1);
        dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
          dObj.getDate()
        ).padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const initDateStr = getValidInitialDate(selectedDate);
  const [initY, initM] = initDateStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState<number>(initY || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(
    initM !== undefined ? initM - 1 : today.getMonth()
  );
  const [tempSelectedDate, setTempSelectedDate] = useState<string>(initDateStr);

  useEffect(() => {
    if (visible) {
      const activeStr = getValidInitialDate(selectedDate);
      const [y, m] = activeStr.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
      setTempSelectedDate(activeStr);
    }
  }, [visible, selectedDate, effectiveMinDate, disableSundays]);

  // Determine if previous month navigation should be disabled
  const [minY, minM] = effectiveMinDate.split('-').map(Number);
  const isPrevDisabled =
    currentYear < minY || (currentYear === minY && currentMonth <= minM - 1);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Create array of day numbers padded with nulls at start
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  // Group into exact 7-day rows
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    const week = calendarCells.slice(i, i + 7);
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  const handleConfirm = () => {
    if (tempSelectedDate && tempSelectedDate >= effectiveMinDate) {
      if (disableSundays) {
        const [y, m, d] = tempSelectedDate.split('-').map(Number);
        if (new Date(y, m - 1, d).getDay() === 0) {
          return; // Block Sunday selection
        }
      }
      onSelectDate(tempSelectedDate);
      onClose();
    }
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Modal Header */}
              <View style={styles.header}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>
                    {disableSundays ? 'Sundays excluded (Weekly off)' : subtitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Close date picker"
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Month & Year Navigation */}
              <View style={styles.navBar}>
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  disabled={isPrevDisabled}
                  style={[styles.navBtn, isPrevDisabled && styles.navBtnDisabled]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={isPrevDisabled ? '#CBD5E1' : '#1E293B'}
                  />
                </TouchableOpacity>

                <View style={styles.monthYearDisplay}>
                  <Text style={styles.monthYearText}>
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={styles.navBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                </TouchableOpacity>
              </View>

              {/* Days of Week Header (Strict 7 Columns) */}
              <View style={styles.weekHeaderRow}>
                {DAYS_OF_WEEK.map((d, idx) => (
                  <View key={d} style={styles.colCell}>
                    <Text
                      style={[
                        styles.weekHeaderText,
                        idx === 0 && styles.weekHeaderSunday,
                      ]}
                    >
                      {d}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid (Strict 7 Columns per Row) */}
              <View style={styles.calendarBody}>
                {weeks.map((week, weekIdx) => (
                  <View key={`week-${weekIdx}`} style={styles.weekRow}>
                    {week.map((dayNum, dayIdx) => {
                      if (dayNum === null) {
                        return (
                          <View
                            key={`blank-${weekIdx}-${dayIdx}`}
                            style={styles.colCell}
                          />
                        );
                      }

                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
                        dayNum
                      ).padStart(2, '0')}`;
                      const isPast = dateStr < effectiveMinDate;
                      const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
                      const isSunday = dayOfWeek === 0;
                      const isSundayDisabled = isSunday && disableSundays;
                      const isDisabled = isPast || isSundayDisabled;
                      const isSelected = dateStr === tempSelectedDate;
                      const isToday = dateStr === todayStr;

                      return (
                        <View key={dateStr} style={styles.colCell}>
                          <TouchableOpacity
                            disabled={isDisabled}
                            onPress={() => setTempSelectedDate(dateStr)}
                            activeOpacity={0.7}
                            style={[
                              styles.dayCircle,
                              isSelected && styles.dayCircleSelected,
                              isToday && !isSelected && styles.dayCircleToday,
                              isSundayDisabled && !isSelected && styles.dayCircleSundayOff,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isSunday && styles.dayTextSunday,
                                isDisabled && (isSunday ? styles.dayTextSundayDisabled : styles.dayTextDisabled),
                                isSelected && styles.dayTextSelected,
                              ]}
                            >
                              {dayNum}
                            </Text>
                            {isToday && !isSelected && (
                              <View style={styles.todayIndicatorDot} />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Selection Summary Pill */}
              <View style={styles.summaryBar}>
                <Ionicons name="calendar" size={15} color="#2563EB" />
                <Text style={styles.summaryLabel}>Selected:</Text>
                <Text style={styles.summaryValue}>
                  {formatDisplayDate(tempSelectedDate)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirm}
                  style={styles.confirmBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>Confirm Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  monthYearDisplay: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  colCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  weekHeaderSunday: {
    color: '#EF4444',
  },
  calendarBody: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 2.5,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCircleSelected: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  dayCircleSundayOff: {
    backgroundColor: '#FEF2F2',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayTextSunday: {
    color: '#EF4444',
  },
  dayTextSundayDisabled: {
    color: '#F87171',
    opacity: 0.5,
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
