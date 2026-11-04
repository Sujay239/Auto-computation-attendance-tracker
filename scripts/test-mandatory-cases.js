const { PayrollCalculationEngine } = require('./services/payrollCalculationEngine.js');

const engine = new PayrollCalculationEngine();
let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('===============================================================');
console.log('RUNNING MANDATORY LEAVE, ATTENDANCE & SALARY TEST CASES');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: HALF-DAY CASES
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Half-Day Deduction Cases ---');
const dailyRate = 1000; // e.g. 30,000 / 30

// Test 1.1: Available = 5 -> Deduct 0.5 leave, 0 salary
const res1_1 = engine.computeDeductionUnits(0.5, 5, dailyRate);
assert(
  res1_1.leaveDaysDeducted === 0.5 && res1_1.salaryDeduction === 0 && res1_1.uncoveredDays === 0,
  'Case 1: Available 5d -> Deduct 0.5 leave, 0 salary'
);

// Test 1.2: Available = 0.5 -> Deduct 0.5 leave, 0 salary
const res1_2 = engine.computeDeductionUnits(0.5, 0.5, dailyRate);
assert(
  res1_2.leaveDaysDeducted === 0.5 && res1_2.salaryDeduction === 0 && res1_2.uncoveredDays === 0,
  'Case 2: Available 0.5d -> Deduct 0.5 leave, 0 salary'
);

// Test 1.3: Available = 0.25 -> Deduct 0.25 leave + 0.25-day salary
const res1_3 = engine.computeDeductionUnits(0.5, 0.25, dailyRate);
assert(
  res1_3.leaveDaysDeducted === 0.25 && res1_3.uncoveredDays === 0.25 && res1_3.salaryDeduction === 250,
  'Case 3: Available 0.25d -> Deduct 0.25 leave + 0.25-day salary (₹250)'
);

// Test 1.4: Available = 0 -> Deduct 0.5-day salary
const res1_4 = engine.computeDeductionUnits(0.5, 0, dailyRate);
assert(
  res1_4.leaveDaysDeducted === 0 && res1_4.uncoveredDays === 0.5 && res1_4.salaryDeduction === 500,
  'Case 4: Available 0d -> Deduct 0 leave + 0.5-day salary (₹500)'
);

// -----------------------------------------------------------------------------
// SECTION 2: FULL-DAY CASES
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Full-Day Deduction Cases ---');

// Test 2.1: Available = 5 -> Deduct 1 leave, 0 salary
const res2_1 = engine.computeDeductionUnits(1.0, 5, dailyRate);
assert(
  res2_1.leaveDaysDeducted === 1.0 && res2_1.salaryDeduction === 0 && res2_1.uncoveredDays === 0,
  'Case 1: Available 5d -> Deduct 1 leave, 0 salary'
);

// Test 2.2: Available = 1 -> Deduct 1 leave, 0 salary
const res2_2 = engine.computeDeductionUnits(1.0, 1.0, dailyRate);
assert(
  res2_2.leaveDaysDeducted === 1.0 && res2_2.salaryDeduction === 0 && res2_2.uncoveredDays === 0,
  'Case 2: Available 1d -> Deduct 1 leave, 0 salary'
);

// Test 2.3: Available = 0.5 -> Deduct 0.5 leave + 0.5-day salary
const res2_3 = engine.computeDeductionUnits(1.0, 0.5, dailyRate);
assert(
  res2_3.leaveDaysDeducted === 0.5 && res2_3.uncoveredDays === 0.5 && res2_3.salaryDeduction === 500,
  'Case 3: Available 0.5d -> Deduct 0.5 leave + 0.5-day salary (₹500)'
);

// Test 2.4: Available = 0 -> Deduct 1-day salary
const res2_4 = engine.computeDeductionUnits(1.0, 0, dailyRate);
assert(
  res2_4.leaveDaysDeducted === 0 && res2_4.uncoveredDays === 1.0 && res2_4.salaryDeduction === 1000,
  'Case 4: Available 0d -> Deduct 1-day salary (₹1000)'
);

// -----------------------------------------------------------------------------
// SECTION 3: CROSS-MONTH CASES
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Cross-Month Deduction & Splitting Cases ---');

// Test 3.1: November 30 only
const split1 = engine.splitDatesByMonth(engine.getWorkingDatesInRange('2026-11-30', '2026-11-30'));
assert(
  Object.keys(split1).length === 1 && split1['2026-11'] && split1['2026-11'].length === 1,
  'Test 1: Nov 30 only belongs to 2026-11 (1 day)'
);

// Test 3.2: November 30 to December 1
const split2 = engine.splitDatesByMonth(engine.getWorkingDatesInRange('2026-11-30', '2026-12-01'));
assert(
  split2['2026-11']?.length === 1 && split2['2026-12']?.length === 1,
  'Test 2: Nov 30 to Dec 1 cleanly split (1 in Nov, 1 in Dec)'
);

// Test 3.3: November 30 to December 2
const split3 = engine.splitDatesByMonth(engine.getWorkingDatesInRange('2026-11-30', '2026-12-02'));
assert(
  split3['2026-11']?.length === 1 && split3['2026-12']?.length === 2,
  'Test 3: Nov 30 to Dec 2 cleanly split (1 in Nov, 2 in Dec)'
);

// Test 3.4: December 31 to January 2 (Note: 2026-12-31 to 2027-01-02)
const split4 = engine.splitDatesByMonth(engine.getWorkingDatesInRange('2026-12-31', '2027-01-02'));
assert(
  split4['2026-12']?.length === 1 && split4['2027-01']?.length === 2,
  'Test 4: Dec 31 to Jan 2 cleanly split (1 in Dec 2026, 2 in Jan 2027)'
);

// Test 3.5: Leave request with insufficient November balance
// Employee salary 30,000. Nov (30d, daily 1000). Dec (31d, daily 967).
// Request: 2026-11-30 to 2026-12-02 (3 days: 1 in Nov, 2 in Dec).
// Initial available: 0.5 day.
engine.resetLedger();
const testEmp = {
  id: 'EMP-TEST',
  firstName: 'Test',
  lastName: 'Employee',
  salary: 30000,
};
const balancesTest5 = [
  { type: 'CASUAL', label: 'Casual Leave', total: 12, used: 11.5, available: 0.5 },
];
const requestTest5 = {
  id: 'lev-cross-5',
  employeeId: 'EMP-TEST',
  leaveType: 'CASUAL',
  durationType: 'FULL_DAY',
  startDate: '2026-11-30',
  endDate: '2026-12-02',
  daysCount: 3,
  reason: 'Family event',
  status: 'APPROVED',
  appliedOn: '2026-11-20',
};

const proc5 = engine.processApprovedLeave(requestTest5, testEmp, balancesTest5);
const novLedger5 = engine.getEmployeeLedger('EMP-TEST', '2026-11');
const decLedger5 = engine.getEmployeeLedger('EMP-TEST', '2026-12');

assert(
  novLedger5.length === 1 &&
  novLedger5[0].leaveDaysDeducted === 0.5 &&
  novLedger5[0].uncoveredDays === 0.5 &&
  novLedger5[0].salaryDeduction === 500,
  'Test 5a: Nov has 1 day: consumed 0.5 leave, 0.5-day uncovered -> ₹500 salary deduction'
);

assert(
  decLedger5.length === 2 &&
  decLedger5.reduce((sum, r) => sum + r.leaveDaysDeducted, 0) === 0 &&
  decLedger5.reduce((sum, r) => sum + r.uncoveredDays, 0) === 2 &&
  decLedger5.reduce((sum, r) => sum + r.salaryDeduction, 0) === 2 * Math.floor(30000 / 31),
  'Test 5b: Dec has 2 days: 0 leave remaining -> 2 uncovered days deducted from Dec salary (2 × ₹967 = ₹1934)'
);

// Test 3.6: Leave request with insufficient December balance
engine.resetLedger();
const balancesTest6 = [
  { type: 'CASUAL', label: 'Casual Leave', total: 12, used: 10.5, available: 1.5 },
];
const requestTest6 = {
  id: 'lev-cross-6',
  employeeId: 'EMP-TEST',
  leaveType: 'CASUAL',
  durationType: 'FULL_DAY',
  startDate: '2026-11-30',
  endDate: '2026-12-02',
  daysCount: 3,
  reason: 'Trip',
  status: 'APPROVED',
  appliedOn: '2026-11-20',
};
const proc6 = engine.processApprovedLeave(requestTest6, testEmp, balancesTest6);
const novLedger6 = engine.getEmployeeLedger('EMP-TEST', '2026-11');
const decLedger6 = engine.getEmployeeLedger('EMP-TEST', '2026-12');

assert(
  novLedger6.length === 1 &&
  novLedger6[0].leaveDaysDeducted === 1.0 &&
  novLedger6[0].salaryDeduction === 0,
  'Test 6a: Nov has 1 day: 1.0 leave deducted, ₹0 salary deduction'
);

assert(
  decLedger6.length === 2 &&
  decLedger6.reduce((sum, r) => sum + r.leaveDaysDeducted, 0) === 0.5 &&
  decLedger6.reduce((sum, r) => sum + r.uncoveredDays, 0) === 1.5,
  'Test 6b: Dec has 2 days: 0.5 remaining leave consumed, 1.5 uncovered days deducted from Dec salary'
);

// Test 3.7: Different salary in different payroll months
engine.resetLedger();
const balancesTest7 = [
  { type: 'CASUAL', label: 'Casual Leave', total: 12, used: 12, available: 0 },
];
const empNov = { id: 'EMP-PROMO', salary: 30000 };
const empDec = { id: 'EMP-PROMO', salary: 62000 }; // Promoted in Dec (62,000 / 31 = 2000/day)

const reqNov = {
  id: 'lev-nov-7',
  employeeId: 'EMP-PROMO',
  leaveType: 'CASUAL',
  durationType: 'FULL_DAY',
  startDate: '2026-11-30',
  endDate: '2026-11-30',
  status: 'APPROVED',
};
const reqDec = {
  id: 'lev-dec-7',
  employeeId: 'EMP-PROMO',
  leaveType: 'CASUAL',
  durationType: 'FULL_DAY',
  startDate: '2026-12-01',
  endDate: '2026-12-01',
  status: 'APPROVED',
};

engine.processApprovedLeave(reqNov, empNov, balancesTest7);
engine.processApprovedLeave(reqDec, empDec, balancesTest7);

const ledNov7 = engine.getEmployeeLedger('EMP-PROMO', '2026-11');
const ledDec7 = engine.getEmployeeLedger('EMP-PROMO', '2026-12');

assert(
  ledNov7[0].dailySalary === 1000 && ledNov7[0].salaryDeduction === 1000,
  'Test 7a: Nov daily rate is ₹1000 based on Nov salary 30,000'
);
assert(
  ledDec7[0].dailySalary === 2000 && ledDec7[0].salaryDeduction === 2000,
  'Test 7b: Dec daily rate is ₹2000 based on Dec salary 62,000'
);

// -----------------------------------------------------------------------------
// SECTION 4: APPROVAL & IDEMPOTENCY CASES
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Approval, Reversal & Idempotency Cases ---');

engine.resetLedger();
const balTest4 = [{ type: 'CASUAL', label: 'Casual', total: 12, used: 0, available: 12 }];

// 4.1: Pending leave: No deduction
const pendingReq = {
  id: 'lev-pending',
  employeeId: 'EMP-TEST',
  leaveType: 'CASUAL',
  durationType: 'FULL_DAY',
  startDate: '2026-11-10',
  endDate: '2026-11-10',
  status: 'PENDING',
};
const pendingRes = engine.processApprovedLeave(pendingReq, testEmp, balTest4);
assert(
  pendingRes.success === false && pendingRes.totalLeaveDeducted === 0 && pendingRes.totalSalaryDeducted === 0,
  'Test 4.1: Pending leave -> Rejected by engine with zero deduction'
);

// 4.2: Rejected leave: No deduction
const rejectedReq = { ...pendingReq, id: 'lev-rejected', status: 'REJECTED' };
const rejRes = engine.processApprovedLeave(rejectedReq, testEmp, balTest4);
assert(
  rejRes.success === false && rejRes.totalLeaveDeducted === 0 && rejRes.totalSalaryDeducted === 0,
  'Test 4.2: Rejected leave -> Zero deduction'
);

// 4.3: Approved leave: Process deductions
const approvedReq = { ...pendingReq, id: 'lev-app-1', status: 'APPROVED' };
let currentBal4 = balTest4;
const appRes = engine.processApprovedLeave(approvedReq, testEmp, currentBal4);
currentBal4 = appRes.updatedBalances;
assert(
  appRes.success === true && appRes.totalLeaveDeducted === 1 && currentBal4[0].used === 1,
  'Test 4.3: Approved leave -> Deducts 1 leave, creates ledger entry and attendance'
);

// 4.4: Duplicate approval event: No duplicate deductions (Idempotency)
const dupRes = engine.processApprovedLeave(approvedReq, testEmp, currentBal4);
currentBal4 = dupRes.updatedBalances;
assert(
  dupRes.success === true &&
  currentBal4[0].used === 1 && // Still 1, NOT 2!
  engine.getEmployeeLedger('EMP-TEST').length === 1, // Still 1 ledger entry!
  'Test 4.4: Duplicate approval event -> Idempotent! Did NOT double-deduct balance'
);

// 4.5: Cancelled approved leave: Reverse deductions
const revRes = engine.reverseApprovedLeave('lev-app-1', currentBal4);
currentBal4 = revRes.updatedBalances;
assert(
  revRes.success === true &&
  revRes.restoredLeaveDays === 1 &&
  currentBal4[0].used === 0 &&
  currentBal4[0].available === 12,
  'Test 4.5: Cancelled approved leave -> Reversed deductions and restored leave balance'
);

// -----------------------------------------------------------------------------
// SECTION 5: ATTENDANCE RESTRICTION CASES
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Attendance Check-In Restrictions ---');

const activeLeaves = [
  {
    id: 'lev-full-today',
    employeeId: 'EMP-024',
    leaveType: 'CASUAL',
    durationType: 'FULL_DAY',
    startDate: '2026-11-04',
    endDate: '2026-11-04',
    status: 'APPROVED',
  },
  {
    id: 'lev-half-first',
    employeeId: 'EMP-024',
    leaveType: 'CASUAL',
    durationType: 'FIRST_HALF',
    startDate: '2026-11-05',
    endDate: '2026-11-05',
    status: 'APPROVED',
  },
  {
    id: 'lev-half-second',
    employeeId: 'EMP-024',
    leaveType: 'CASUAL',
    durationType: 'SECOND_HALF',
    startDate: '2026-11-06',
    endDate: '2026-11-06',
    status: 'APPROVED',
  },
];

// 5.1: Approved full-day leave: Check-in blocked
const check5_1 = engine.canEmployeeCheckIn('2026-11-04', '10:00 AM', activeLeaves);
assert(
  check5_1.allowed === false && check5_1.leaveType === 'FULL_DAY',
  'Test 5.1: Approved full-day leave -> Check-in blocked'
);

// 5.2: Approved first-half leave: Blocked in morning (< 2:00 PM), allowed in second half (>= 2:00 PM)
const check5_2_morning = engine.canEmployeeCheckIn('2026-11-05', '11:00 AM', activeLeaves);
const check5_2_afternoon = engine.canEmployeeCheckIn('2026-11-05', '02:05 PM', activeLeaves);
assert(
  check5_2_morning.allowed === false && check5_2_afternoon.allowed === true,
  'Test 5.2: First-half leave -> Blocked before 2:00 PM, allowed after 2:00 PM'
);

// 5.3: Approved second-half leave: Allowed in morning, blocked after 2:00 PM
const check5_3_morning = engine.canEmployeeCheckIn('2026-11-06', '09:55 AM', activeLeaves);
const check5_3_afternoon = engine.canEmployeeCheckIn('2026-11-06', '02:30 PM', activeLeaves);
assert(
  check5_3_morning.allowed === true && check5_3_afternoon.allowed === false,
  'Test 5.3: Second-half leave -> Allowed in morning, shift completed by 2:00 PM'
);

// 5.4: Normal working day (no leave): Normal check-in allowed
const check5_4 = engine.canEmployeeCheckIn('2026-11-07', '10:00 AM', activeLeaves);
assert(
  check5_4.allowed === true,
  'Test 5.4: Normal working date without leave -> Normal check-in allowed'
);

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
console.log('===============================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}
