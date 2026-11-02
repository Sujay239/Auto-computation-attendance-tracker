import React, { createContext, useContext, useState, useEffect } from 'react';
import { AttendanceRecord, MonthlyAttendanceSummary } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { useAuth } from './AuthContext';

interface AttendanceContextType {
  records: AttendanceRecord[];
  todayRecord: AttendanceRecord | undefined;
  summary: MonthlyAttendanceSummary;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  punchIn: (customTimeStr?: string) => { success: boolean; record?: AttendanceRecord; error?: string };
  punchOut: (customTimeStr?: string) => { success: boolean; record?: AttendanceRecord; error?: string };
  refreshData: () => void;
}

const AttendanceContext = createContext<AttendanceContextType>({
  records: [],
  todayRecord: undefined,
  summary: attendanceService.getMonthlySummary(),
  isCheckedIn: false,
  isCheckedOut: false,
  punchIn: () => ({ success: false, record: undefined, error: undefined }),
  punchOut: () => ({ success: false, record: undefined, error: undefined }),
  refreshData: () => {},
});

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | undefined>(undefined);
  const [summary, setSummary] = useState<MonthlyAttendanceSummary>(attendanceService.getMonthlySummary());

  const refreshData = () => {
    const allRecords = attendanceService.getRecords();
    setRecords(allRecords);
    const today = attendanceService.getTodayRecord();
    setTodayRecord(today);
    setSummary(attendanceService.getMonthlySummary());
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const punchIn = (customTimeStr?: string) => {
    const empId = user?.id || 'EMP-024';
    const res = attendanceService.punchIn(empId, customTimeStr);
    refreshData();
    return res;
  };

  const punchOut = (customTimeStr?: string) => {
    const empId = user?.id || 'EMP-024';
    const res = attendanceService.punchOut(empId, customTimeStr);
    refreshData();
    return res;
  };

  const isCheckedIn = !!(todayRecord && todayRecord.checkIn);
  const isCheckedOut = !!(todayRecord && todayRecord.checkOut);

  return (
    <AttendanceContext.Provider
      value={{
        records,
        todayRecord,
        summary,
        isCheckedIn,
        isCheckedOut,
        punchIn,
        punchOut,
        refreshData,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => useContext(AttendanceContext);

