# Auto Computation - PostgreSQL Database Setup Guide

This directory contains the production-ready PostgreSQL database DDL schema for **Auto Computation**'s Employee Attendance & HRMS application.

### Architecture Highlights:
- **Zero initial seed data**: All tables are created completely empty.
- **Pure operational tables (8 Tables + 1 View)**: The database is strictly dedicated to storing dynamic records (attendance, biometric logs, leave requests, overtime claims, holidays, notifications, and employees).
- **Application-wide general constants**: Static company branding (Auto Computation, Chinar Park, Teghoria, Kolkata - 700157) and office timing parameters (10:00 AM opening, 20-min buffer, 7:00 PM closing, 10:45 AM late cut-off, 3 late allowances/month, etc.) are centralized in [`src/constants/appConfig.ts`](../src/constants/appConfig.ts), freeing up database storage.
- **Two roles only**: `EMPLOYEE` and `ADMIN`.

---

## 📁 Files Included

| File | Description |
| :--- | :--- |
| [`database/schema.sql`](./schema.sql) | Complete PostgreSQL DDL (Tables, Indexes, Constraints, Triggers, Views) with zero initial data |
| [`database/README.md`](./README.md) | Database documentation, execution guide, and API query cheat-sheet |
| [`src/constants/appConfig.ts`](../src/constants/appConfig.ts) | Centralized company constants & office timing parameters |

---

## 🚀 How to Execute the SQL Script

### Option A: Using `psql` (Command Line)
```bash
# Connect to your local or remote PostgreSQL instance:
psql -U <your_postgres_user> -d <your_database_name> -f database/schema.sql

# Example with host and port:
psql -h localhost -p 5432 -U postgres -d attendance_db -f database/schema.sql
```

### Option B: Using GUI Clients (pgAdmin 4 / DBeaver / TablePlus / DataGrip)
1. Connect to your database.
2. Open the **Query Tool** / **SQL Console**.
3. Open or copy the full contents of [`database/schema.sql`](./schema.sql).
4. Click **Execute / Run (F5)**.

### Option C: Cloud Hosted Database (Supabase / Neon / Render / Railway)
1. Go to your project dashboard (e.g. Supabase Studio or Neon Console).
2. Navigate to **SQL Editor**.
3. Paste the contents of [`database/schema.sql`](./schema.sql) and click **Run**.

---

## 🏛️ Empty Operational Tables Created (8 Tables + 1 View)

| Table | Purpose | Key Columns & Constraints |
| :--- | :--- | :--- |
| **`employees`** | Staff master records & auth credentials | `id`, `first_name`, `last_name`, `email` (UNIQUE), `password_hash`, `role` (`EMPLOYEE` / `ADMIN`) |
| **`holidays`** | Gazetted / company holidays | `id`, `name`, `date` (UNIQUE), `type`, `is_office_closed` |
| **`attendances`** | Daily attendance records per employee | `employee_id`, `date`, `check_in`, `check_out`, `status`, gross/net durations |
| **`attendance_punches`** | Raw biometric & gate scan events | `attendance_id`, `type` (`IN`/`OUT`/`BREAK`), `timestamp`, `location` |
| **`leave_balances`** | Annual employee leave balances | `employee_id`, `leave_type`, `total`, `used`, `available` (GENERATED) |
| **`leave_requests`** | Leave applications & approvals | `employee_id`, `duration_type` (`FULL_DAY`/`FIRST_HALF`), `status` |
| **`overtime_records`** | Overtime hours, reimbursement & early exit | `employee_id`, `duration_minutes`, `compensation_method`, `deadline` |
| **`notifications`** | In-app alerts and notifications | `employee_id`, `category`, `title`, `message`, `is_read` |
| **`v_monthly_attendance_summary`** | SQL View for real-time monthly stats | Aggregates on-time, late, buffer, half-day, and total work hours |

---

## 💡 Production API Query Examples

### 1. Registering an Employee or Admin
```sql
INSERT INTO employees (
    id, first_name, last_name, email, password_hash, phone,
    designation, joining_date, employment_type, work_location, role, is_active
) VALUES (
    'EMP-001',
    'Sujay',
    'Verma',
    'sujay.verma@company.com',
    -- bcrypt password hash
    '$2a$12$K1r6tDk9zE1c5g9v3x5k7uP1u8x3e2c0f1g4h7j9k0l1m2n3o4p5q',
    '+91 98301 23456',
    'Senior Full Stack Engineer',
    CURRENT_DATE,
    'Full-time',
    'Chinar Park, Teghoria, Kolkata (In-Office)',
    'EMPLOYEE',
    TRUE
);
```

### 2. Daily Check-in / Punch In
```sql
-- Create attendance entry on morning arrival:
INSERT INTO attendances (
    id, employee_id, date, check_in, check_in_timestamp,
    status, status_label, expected_checkout_time
) VALUES (
    'att-' || CURRENT_DATE || '-EMP-001',
    'EMP-001',
    CURRENT_DATE,
    TO_CHAR(CURRENT_TIMESTAMP, 'HH12:MI AM'),
    CURRENT_TIMESTAMP,
    'ON_TIME',
    'On Time',
    '19:00'
) ON CONFLICT (employee_id, date) DO NOTHING;

-- Log the punch scan event:
INSERT INTO attendance_punches (
    id, attendance_id, employee_id, type, timestamp, time_string, location
) VALUES (
    'p-' || uuid_generate_v4(),
    'att-' || CURRENT_DATE || '-EMP-001',
    'EMP-001',
    'IN',
    CURRENT_TIMESTAMP,
    TO_CHAR(CURRENT_TIMESTAMP, 'HH12:MI AM'),
    'Main Entrance Biometric / Mobile'
);
```

### 3. Punch Out & Calculate Net Work Duration
```sql
UPDATE attendances
SET
    check_out = TO_CHAR(CURRENT_TIMESTAMP, 'HH12:MI AM'),
    check_out_timestamp = CURRENT_TIMESTAMP,
    total_duration_minutes = ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_timestamp)) / 60),
    work_duration_minutes = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in_timestamp)) / 60) - lunch_duration_minutes)
WHERE employee_id = 'EMP-001' AND date = CURRENT_DATE;
```
