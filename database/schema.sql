-- ==============================================================================
-- DATABASE SCHEMA: AUTO COMPUTATION - EMPLOYEE ATTENDANCE & HRMS SYSTEM
-- TARGET DATABASE: PostgreSQL 12+ (Lean Single-Company Internal Deployment)
-- NOTE: Company info & office timings are centralized in application constants.
-- ==============================================================================

-- 1. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone to Indian Standard Time (IST / UTC+5:30)
SET timezone = 'Asia/Kolkata';

-- ==============================================================================
-- 2. DROP TABLES IN SAFE CASCADE ORDER (FOR CLEAN RE-INITIALIZATION)
-- ==============================================================================
DROP VIEW IF EXISTS v_monthly_attendance_summary CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS overtime_records CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
DROP TABLE IF EXISTS attendance_punches CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop trigger function if exists
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ==============================================================================
-- 3. COMMON TRIGGER FUNCTION FOR UPDATED_AT TIMESTAMP
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. TABLE: EMPLOYEES (Lean Staff Table - Roles: 'EMPLOYEE' and 'ADMIN' only)
-- ==============================================================================
CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'EMP-001', 'EMP-024', 'ADM-001'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    personal_email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    avatar_url TEXT,
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    designation VARCHAR(150) NOT NULL,
    joining_date DATE NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-time'
        CHECK (employment_type IN ('Full-time', 'Contract', 'Part-time')),
    work_location VARCHAR(255) NOT NULL DEFAULT 'Chinar Park, Teghoria, Kolkata (In-Office)',
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (role IN ('EMPLOYEE', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role ON employees(role);

CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. TABLE: HOLIDAYS (Yearly Gazetted / Office Holidays)
-- ==============================================================================
CREATE TABLE holidays (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL UNIQUE,
    day VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'PUBLIC'
        CHECK (type IN ('NATIONAL', 'FESTIVAL', 'PUBLIC', 'OPTIONAL')),
    description TEXT,
    is_office_closed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_holidays_date ON holidays(date);

-- ==============================================================================
-- 6. TABLE: ATTENDANCES (Daily Attendance Header per Employee)
-- ==============================================================================
CREATE TABLE attendances (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'att-2026-11-02-EMP-024'
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in VARCHAR(20),  -- e.g. '09:55 AM'
    check_out VARCHAR(20), -- e.g. '07:05 PM'
    check_in_timestamp TIMESTAMPTZ,
    check_out_timestamp TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PRESENT',
            'ON_TIME',
            'WITHIN_BUFFER',
            'LATE',
            'HALF_DAY',
            'ABSENT',
            'LEAVE',
            'HOLIDAY',
            'PENDING'
        )),
    status_label VARCHAR(100) NOT NULL DEFAULT 'Pending',
    total_duration_minutes INT NOT NULL DEFAULT 0, -- Gross time in office
    work_duration_minutes INT NOT NULL DEFAULT 0,  -- Net worked (minus lunch)
    lunch_duration_minutes INT NOT NULL DEFAULT 0, -- Lunch break duration
    expected_checkout_time VARCHAR(20) NOT NULL DEFAULT '19:00',
    late_allowance_used INT CHECK (late_allowance_used IN (1, 2, 3)),
    is_half_day_case BOOLEAN NOT NULL DEFAULT FALSE,
    half_day_reason TEXT,
    overtime_minutes INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendances_employee_date ON attendances(employee_id, date);
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_status ON attendances(status);

CREATE TRIGGER trg_attendances_updated_at
BEFORE UPDATE ON attendances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. TABLE: ATTENDANCE_PUNCHES (Biometric / Gate In-Out-Break Scans)
-- ==============================================================================
CREATE TABLE attendance_punches (
    id VARCHAR(100) PRIMARY KEY,
    attendance_id VARCHAR(100) NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('IN', 'OUT', 'BREAK_START', 'BREAK_END')),
    timestamp TIMESTAMPTZ NOT NULL,
    time_string VARCHAR(20) NOT NULL, -- e.g. '09:55 AM'
    location VARCHAR(255) DEFAULT 'Main Entrance Biometric / Scanner',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_punches_attendance ON attendance_punches(attendance_id);
CREATE INDEX idx_attendance_punches_emp_ts ON attendance_punches(employee_id, timestamp);

-- ==============================================================================
-- 8. TABLE: LEAVE_BALANCES (Employee Annual Entitlements)
-- ==============================================================================
CREATE TABLE leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'EARNED', 'HALF_DAY')),
    year INT NOT NULL DEFAULT 2026,
    label VARCHAR(100) NOT NULL,
    total NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    used NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    available NUMERIC(5, 1) GENERATED ALWAYS AS (total - used) STORED,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_leave_type_year UNIQUE (employee_id, leave_type, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);

CREATE TRIGGER trg_leave_balances_updated_at
BEFORE UPDATE ON leave_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. TABLE: LEAVE_REQUESTS (Leave Applications & Approvals)
-- ==============================================================================
CREATE TABLE leave_requests (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'lev-101'
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'EARNED', 'HALF_DAY')),
    duration_type VARCHAR(50) NOT NULL CHECK (duration_type IN ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(4, 1) NOT NULL CHECK (days_count > 0),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
    approved_or_rejected_by VARCHAR(100),
    reviewed_on DATE,
    comments TEXT,
    whatsapp_notice_acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

CREATE TRIGGER trg_leave_requests_updated_at
BEFORE UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. TABLE: OVERTIME_RECORDS (Overtime Tracking & Policy Adherence)
-- ==============================================================================
CREATE TABLE overtime_records (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'ot-201'
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL, -- '19:00'
    end_time VARCHAR(20) NOT NULL,   -- '21:00'
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    hours_formatted VARCHAR(50) NOT NULL, -- '2h 00m'
    reason TEXT NOT NULL,
    approver VARCHAR(100) NOT NULL DEFAULT 'Admin',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_date DATE,
    compensation_method VARCHAR(50) NOT NULL
        CHECK (compensation_method IN ('REIMBURSEMENT', 'EARLY_LEAVE_ADJUSTMENT')),
    reimbursement_status VARCHAR(50) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (reimbursement_status IN ('PENDING', 'PROCESSED', 'NOT_APPLICABLE')),
    reimbursement_deadline DATE,
    reimbursement_amount NUMERIC(10, 2),
    early_leave_status VARCHAR(50) NOT NULL DEFAULT 'NOT_APPLICABLE'
        CHECK (early_leave_status IN ('AVAILABLE', 'ADJUSTED', 'NOT_APPLICABLE')),
    early_leave_adjusted_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_overtime_employee ON overtime_records(employee_id);
CREATE INDEX idx_overtime_status ON overtime_records(status);
CREATE INDEX idx_overtime_date ON overtime_records(date);

CREATE TRIGGER trg_overtime_updated_at
BEFORE UPDATE ON overtime_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 11. TABLE: NOTIFICATIONS (In-App Push & Activity Feed)
-- ==============================================================================
CREATE TABLE notifications (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'notif-01'
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL
        CHECK (category IN (
            'ATTENDANCE_REMINDER',
            'LATE_WARNING',
            'LEAVE_UPDATE',
            'OVERTIME_UPDATE',
            'COMPANY_ANNOUNCEMENT',
            'HOLIDAY'
        )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_route VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('HIGH', 'NORMAL', 'LOW')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_employee_read ON notifications(employee_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ==============================================================================
-- 12. VIEW: MONTHLY ATTENDANCE SUMMARY (Real-time Analytics View)
-- ==============================================================================
CREATE OR REPLACE VIEW v_monthly_attendance_summary AS
SELECT
    a.employee_id,
    TO_CHAR(a.date, 'YYYY-MM') AS month_key,
    COUNT(*) AS total_recorded_days,
    COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'ON_TIME', 'WITHIN_BUFFER', 'LATE', 'HALF_DAY')) AS present_days,
    COUNT(*) FILTER (WHERE a.status = 'ON_TIME') AS on_time_days,
    COUNT(*) FILTER (WHERE a.status = 'WITHIN_BUFFER') AS within_buffer_days,
    COUNT(*) FILTER (WHERE a.status = 'LATE') AS late_days,
    COALESCE(MAX(a.late_allowance_used), 0) AS late_allowances_used,
    GREATEST(0, 3 - COALESCE(MAX(a.late_allowance_used), 0)) AS late_allowances_remaining,
    COUNT(*) FILTER (WHERE a.status = 'HALF_DAY' OR a.is_half_day_case = TRUE) AS half_days,
    COUNT(*) FILTER (WHERE a.status = 'ABSENT') AS absent_days,
    COUNT(*) FILTER (WHERE a.status = 'LEAVE') AS leave_days,
    COUNT(*) FILTER (WHERE a.status = 'HOLIDAY') AS holidays,
    ROUND(COALESCE(SUM(a.work_duration_minutes) / 60.0, 0), 1) AS total_work_hours,
    ROUND(
        CASE
            WHEN COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'ON_TIME', 'WITHIN_BUFFER', 'LATE', 'HALF_DAY')) > 0
            THEN (COALESCE(SUM(a.work_duration_minutes) / 60.0, 0) /
                  COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'ON_TIME', 'WITHIN_BUFFER', 'LATE', 'HALF_DAY')))
            ELSE 0.0
        END, 1
    ) AS average_hours_per_day
FROM attendances a
GROUP BY a.employee_id, TO_CHAR(a.date, 'YYYY-MM');

-- ==============================================================================
-- END OF SCHEMA DDL SCRIPT (ALL TABLES CREATED EMPTY FOR PRODUCTION USE)
-- ==============================================================================
