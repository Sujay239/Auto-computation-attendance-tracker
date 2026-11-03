import React, { createContext, useContext, useState, useEffect } from 'react';
import { AttendanceRecord, MonthlyAttendanceSummary } from '../types/attendance';
import { LeaveBalance } from '../types/leave';
import { OvertimeSummary } from '../types/overtime';
import { attendanceService } from '../services/attendanceService';
import { leaveService } from '../services/leaveService';
import { overtimeService } from '../services/overtimeService';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface AttendanceContextType {
  records: AttendanceRecord[];
  todayRecord: AttendanceRecord | undefined;
  summary: MonthlyAttendanceSummary;
  leaveBalances: LeaveBalance[];
  totalLeaveAvailable: number;
  overtimeSummary: OvertimeSummary;
  upcomingHoliday: any | null;
  unreadNotificationsCount: number;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isLoading: boolean;
  punchIn: (customTimeStr?: string) => Promise<{ success: boolean; record?: AttendanceRecord; error?: string }>;
  punchOut: (customTimeStr?: string) => Promise<{ success: boolean; record?: AttendanceRecord; error?: string }>;
  refreshData: () => Promise<void>;
  fetchMonthRecords: (month?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}

const defaultSummary = attendanceService.getMonthlySummary();
const defaultOtSummary = overtimeService.getSummary();
const defaultLeaveBalances = leaveService.getBalances();

const AttendanceContext = createContext<AttendanceContextType>({
  records: [],
  todayRecord: undefined,
  summary: defaultSummary,
  leaveBalances: defaultLeaveBalances,
  totalLeaveAvailable: defaultLeaveBalances.reduce((acc, curr) => acc + curr.available, 0),
  overtimeSummary: defaultOtSummary,
  upcomingHoliday: null,
  unreadNotificationsCount: 0,
  isCheckedIn: false,
  isCheckedOut: false,
  isLoading: true,
  punchIn: async () => ({ success: false }),
  punchOut: async () => ({ success: false }),
  refreshData: async () => {},
  fetchMonthRecords: async () => ({ success: false }),
});

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | undefined>(undefined);
  const [summary, setSummary] = useState<MonthlyAttendanceSummary>(attendanceService.getMonthlySummary());
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(leaveService.getBalances());
  const [overtimeSummary, setOvertimeSummary] = useState<OvertimeSummary>(overtimeService.getSummary());
  const [upcomingHoliday, setUpcomingHoliday] = useState<any | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(notificationService.getUnreadCount());

  const refreshData = async () => {
    if (user?.id) {
      try {
        const res = await attendanceService.fetchRealtimeDashboard(user.id);
        if (res.success && res.data) {
          if (res.data.leaves && Array.isArray(res.data.leaves.balances)) {
            const filtered = res.data.leaves.balances
              .filter((b: any) => b && (b.type === 'CASUAL' || b.type === 'SICK'))
              .map((b: any) => {
                if (b.type === 'SICK' && b.total > 5) {
                  const used = Math.min(b.used || 0, 5);
                  return { ...b, total: 5, used, available: Math.max(0, 5 - used) };
                }
                return b;
              });
            if (filtered.length > 0) {
              setLeaveBalances(filtered);
            }
          }
          if (res.data.overtime) {
            setOvertimeSummary(res.data.overtime);
          }
          if (res.data.upcomingHoliday !== undefined) {
            setUpcomingHoliday(res.data.upcomingHoliday);
          }
          if (typeof res.data.unreadNotificationsCount === 'number') {
            setUnreadNotificationsCount(res.data.unreadNotificationsCount);
          }
        }
      } catch (e) {
        // Fallback to local cache if network/backend is unreachable
      }

      // Also fetch full monthly records for calendar and audit history
      try {
        const fullRes = await attendanceService.fetchFullAttendanceData(undefined, user.id);
        if (fullRes.success && Array.isArray(fullRes.data?.records)) {
          setRecords(fullRes.data.records);
        }
      } catch (e) {
        // Fallback
      }
    }
    const allRecords = attendanceService.getRecords();
    setRecords(allRecords);
    const today = attendanceService.getTodayRecord();
    setTodayRecord(today);
    setSummary(attendanceService.getMonthlySummary());
    setIsLoading(false);
  };

  useEffect(() => {
    setIsLoading(true);
    refreshData();
  }, [user?.id]);

  const punchIn = async (customTimeStr?: string) => {
    const res = await attendanceService.punch({ type: 'IN', customTime: customTimeStr });
    await refreshData();
    return res;
  };

  const punchOut = async (customTimeStr?: string) => {
    const res = await attendanceService.punch({ type: 'OUT', customTime: customTimeStr });
    await refreshData();
    return res;
  };

  const fetchMonthRecords = async (month?: string) => {
    const res = await attendanceService.fetchFullAttendanceData(month, user?.id);
    if (res.success && Array.isArray(res.data?.records)) {
      setRecords(res.data.records);
    }
    return res;
  };

  const isCheckedIn = !!(todayRecord && todayRecord.checkIn);
  const isCheckedOut = !!(todayRecord && todayRecord.checkOut);
  const totalLeaveAvailable = leaveBalances.reduce((acc, curr) => acc + (Number(curr.available) || 0), 0);

  return (
    <AttendanceContext.Provider
      value={{
        records,
        todayRecord,
        summary,
        leaveBalances,
        totalLeaveAvailable,
        overtimeSummary,
        upcomingHoliday,
        unreadNotificationsCount,
        isCheckedIn,
        isCheckedOut,
        isLoading,
        punchIn,
        punchOut,
        refreshData,
        fetchMonthRecords,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => useContext(AttendanceContext);
