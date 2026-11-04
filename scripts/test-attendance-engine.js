const {
  calculateArrivalStatus,
  calculateWorkingHours,
  calculateOvertime,
  timeStringToMinutes,
  minutesTo12H
} = require('./utils/attendanceCalculator');

console.log('--- Testing Attendance Engine Boundaries ---');

const tests = [
  { time: '09:55 AM', used: 0, expectedStatus: 'ON_TIME', expectedOut: '07:00 PM' },
  { time: '10:00 AM', used: 0, expectedStatus: 'ON_TIME', expectedOut: '07:00 PM' },
  { time: '10:10 AM', used: 0, expectedStatus: 'WITHIN_BUFFER', expectedOut: '07:30 PM' },
  { time: '10:20 AM', used: 0, expectedStatus: 'WITHIN_BUFFER', expectedOut: '07:30 PM' },
  { time: '10:21 AM', used: 0, expectedStatus: 'LATE', expectedOut: '07:30 PM' },
  { time: '10:25 AM', used: 0, expectedStatus: 'LATE', expectedAllowance: 1 },
  { time: '10:40 AM', used: 1, expectedStatus: 'LATE', expectedAllowance: 2 },
  { time: '10:45 AM', used: 2, expectedStatus: 'LATE', expectedAllowance: 3 },
  { time: '10:30 AM', used: 3, expectedStatus: 'HALF_DAY', isHalfDay: true },
  { time: '10:46 AM', used: 0, expectedStatus: 'HALF_DAY', isHalfDay: true },
];

let allPassed = true;
tests.forEach((t, i) => {
  const result = calculateArrivalStatus(t.time, t.used);
  const statusMatch = result.status === t.expectedStatus;
  const outMatch = t.expectedOut ? result.expectedCheckOutTime12H === t.expectedOut : true;
  const allowMatch = t.expectedAllowance !== undefined ? result.lateAllowanceUsed === t.expectedAllowance : true;
  const halfMatch = t.isHalfDay !== undefined ? result.isHalfDay === t.isHalfDay : true;

  const passed = statusMatch && outMatch && allowMatch && halfMatch;
  if (!passed) {
    allPassed = false;
    console.error(`FAIL Test #${i + 1}: CheckIn: ${t.time}, Allowances: ${t.used}`);
    console.error(`  Expected: ${JSON.stringify(t)}, Got:`, result);
  } else {
    console.log(`PASS Test #${i + 1}: ${t.time} (used=${t.used}) -> ${result.statusLabel} [Expected Out: ${result.expectedCheckOutTime12H}]`);
  }
});

// Test Lunch deduction (9h shift -> 8h net)
const work = calculateWorkingHours('10:00 AM', '07:00 PM');
if (work.netWorkDurationMinutes === 480 && work.lunchDurationMinutes === 60) {
  console.log('PASS Lunch Deduction Test: 9h gross -> 1h lunch deducted -> 8h net');
} else {
  allPassed = false;
  console.error('FAIL Lunch Deduction Test:', work);
}

// Test Overtime (out at 09:00 PM, expected 07:00 PM -> 2h overtime)
const ot = calculateOvertime('09:00 PM', '07:00 PM');
if (ot.overtimeMinutes === 120) {
  console.log('PASS Overtime Test: 2 hours verified');
} else {
  allPassed = false;
  console.error('FAIL Overtime Test:', ot);
}

if (allPassed) {
  console.log('\n>>> ALL BOUNDARY & POLICY TESTS PASSED SUCCESSFULLY! <<<');
} else {
  process.exit(1);
}

