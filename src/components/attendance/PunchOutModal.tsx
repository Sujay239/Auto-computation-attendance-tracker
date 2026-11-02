import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';

interface PunchOutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  checkInTime?: string;
  expectedCheckOutTime?: string;
  isLoading?: boolean;
}

export const PunchOutModal: React.FC<PunchOutModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  checkInTime,
  expectedCheckOutTime = '19:00',
  isLoading = false,
}) => {
  // Format current time
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Check if leaving early
  const [expH, expM] = expectedCheckOutTime.split(':').map((n) => parseInt(n, 10) || 0);
  const isEarly = currentHours < expH || (currentHours === expH && currentMinutes < expM);

  // Format expected checkout for display
  const formatTime12 = (time24?: string) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map((n) => parseInt(n, 10));
    if (isNaN(h)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Top Accent Icon */}
              <View className="items-center mb-4">
                <View
                  style={{
                    backgroundColor: isEarly ? '#FEF3C7' : '#FEE2E2',
                    borderColor: isEarly ? '#FDE68A' : '#FECACA',
                    borderWidth: 1,
                  }}
                  className="w-16 h-16 rounded-full items-center justify-center shadow-xs"
                >
                  <Ionicons
                    name={isEarly ? 'time-outline' : 'log-out-outline'}
                    size={32}
                    color={isEarly ? '#D97706' : '#DC2626'}
                  />
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text className="text-xl font-bold text-slate-900 text-center mb-1.5">
                Confirm Punch Out?
              </Text>
              <Text className="text-xs text-slate-500 text-center px-2 leading-relaxed mb-4">
                Are you sure you want to end your work shift for today? This action records your official departure time.
              </Text>

              {/* Shift Snapshot Card */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  borderWidth: 1,
                }}
                className="rounded-2xl p-3.5 mb-4"
              >
                <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-slate-200">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Today's Attendance Snapshot
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] font-bold text-slate-700">In Office</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">CHECK IN</Text>
                    <Text className="text-sm font-black text-slate-800">
                      {formatTime12(checkInTime)}
                    </Text>
                  </View>

                  <View className="w-[1px] h-7 bg-slate-200" />

                  <View className="items-center flex-1">
                    <Text className="text-[10px] text-slate-400 font-semibold mb-0.5">EXPECTED</Text>
                    <Text className="text-sm font-black text-slate-800">
                      {formatTime12(expectedCheckOutTime)}
                    </Text>
                  </View>

                  <View className="w-[1px] h-7 bg-slate-200" />

                  <View className="items-center flex-1">
                    <Text className="text-[10px] text-rose-500 font-semibold mb-0.5">PUNCH OUT</Text>
                    <Text className="text-sm font-black text-rose-600">
                      {currentTimeFormatted}
                    </Text>
                  </View>
                </View>

                {/* Conditional Notice Banner */}
                {isEarly ? (
                  <View className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl mt-3 flex-row items-start gap-2">
                    <Ionicons name="alert-circle" size={16} color="#D97706" style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text className="text-[11px] font-bold text-amber-900">
                        Early Departure Notice
                      </Text>
                      <Text className="text-[10px] text-amber-800 leading-tight mt-0.5">
                        Leaving before {formatTime12(expectedCheckOutTime)} may result in less than 8 net work hours and require prior operational approval.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl mt-3 flex-row items-center gap-1.5">
                    <Ionicons name="checkmark-circle" size={15} color="#059669" />
                    <Text className="text-[11px] font-semibold text-emerald-800">
                      Standard working duration fulfilled for today.
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="gap-2.5">
                <Button
                  label={isLoading ? 'Recording Departure...' : 'Yes, Confirm Punch Out'}
                  variant="destructive"
                  size="md"
                  isLoading={isLoading}
                  onPress={onConfirm}
                  icon={<Ionicons name="log-out" size={18} color="#ffffff" />}
                />

                <TouchableOpacity
                  onPress={onCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                  }}
                  className="py-3 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">
                    Cancel & Continue Working
                  </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
});

