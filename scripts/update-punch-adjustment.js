const fs = require('fs');
const path = './n8n-workflows/attendance-punch-workflow.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const codeNode = data.nodes.find(n => n.name === 'Code - Evaluate Punch Rules & Prepare SQL');
if (codeNode) {
  let code = codeNode.parameters.jsCode;
  
  if (!code.includes('leaveAdjustmentSql')) {
    const targetSnippet = 'if (punchMinutes <= 600) {';
    const replacement = `let leaveAdjustmentSql = '';
  if (punchMinutes > 645 || (punchMinutes > 620 && prevLates >= 3)) {
    const halfDayAvail = parseFloat(row.half_day_available || '0');
    const casualAvail = parseFloat(row.casual_available || '0');
    const adjLeaveId = 'lev-adj-' + attendanceId;
    const notifId = 'notif-adj-' + attendanceId;

    if (halfDayAvail >= 0.5) {
      leaveAdjustmentSql = \`
        UPDATE leave_balances
        SET used = used + 0.5
        WHERE employee_id = '\${employeeId}' AND leave_type = 'HALF_DAY' AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INT;

        INSERT INTO leave_requests (
          id, employee_id, leave_type, duration_type,
          start_date, end_date, days_count, reason,
          status, applied_on, approved_or_rejected_by,
          reviewed_on, comments, whatsapp_notice_acknowledged
        ) VALUES (
          '\${adjLeaveId}', '\${employeeId}', 'HALF_DAY', 'FIRST_HALF',
          CURRENT_DATE, CURRENT_DATE, 0.5,
          'Auto-adjustment for late arrival past cutoff to protect salary',
          'APPROVED', CURRENT_DATE, 'SYSTEM_SALARY_PROTECTION', CURRENT_DATE,
          'Auto-adjusted from Half-Day Leave balance to protect monthly salary.',
          TRUE
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO notifications (
          id, employee_id, category, title, message, action_route, priority, is_read
        ) VALUES (
          '\${notifId}', '\${employeeId}', 'LEAVE_UPDATE',
          'Salary Protected by Leave Balance',
          'Your late arrival today at ' || '\${punchTime}' || ' was automatically adjusted against 0.5 Half-Day Leave. Zero salary deducted.',
          '/salary', 'NORMAL', FALSE
        ) ON CONFLICT (id) DO NOTHING;
      \`;
    } else if (casualAvail >= 0.5) {
      leaveAdjustmentSql = \`
        UPDATE leave_balances
        SET used = used + 0.5
        WHERE employee_id = '\${employeeId}' AND leave_type = 'CASUAL' AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INT;

        INSERT INTO leave_requests (
          id, employee_id, leave_type, duration_type,
          start_date, end_date, days_count, reason,
          status, applied_on, approved_or_rejected_by,
          reviewed_on, comments, whatsapp_notice_acknowledged
        ) VALUES (
          '\${adjLeaveId}', '\${employeeId}', 'CASUAL', 'FIRST_HALF',
          CURRENT_DATE, CURRENT_DATE, 0.5,
          'Auto-adjustment for late arrival past cutoff (Casual Leave)',
          'APPROVED', CURRENT_DATE, 'SYSTEM_SALARY_PROTECTION', CURRENT_DATE,
          'Half-Day balance was 0. Auto-adjusted from Casual Leave balance to protect monthly salary.',
          TRUE
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO notifications (
          id, employee_id, category, title, message, action_route, priority, is_read
        ) VALUES (
          '\${notifId}', '\${employeeId}', 'LEAVE_UPDATE',
          'Salary Protected by Casual Leave',
          'Your late arrival today at ' || '\${punchTime}' || ' was automatically adjusted against 0.5 Casual Leave. Zero salary deducted.',
          '/salary', 'NORMAL', FALSE
        ) ON CONFLICT (id) DO NOTHING;
      \`;
    }
  }

  if (punchMinutes <= 600) {`;

    code = code.replace(targetSnippet, replacement);
    code = code.replace(
      "'${punchTime}',\n      '${location.replace(/'/g, \"''\")}', '${statusLabel.replace(/'/g, \"''\")}'\n    );",
      "'${punchTime}',\n      '${location.replace(/'/g, \"''\")}', '${statusLabel.replace(/'/g, \"''\")}'\n    );\n\n    ${leaveAdjustmentSql}"
    );

    codeNode.parameters.jsCode = code;
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
    console.log('SUCCESS: attendance-punch-workflow.json updated with leave adjustment logic!');
  } else {
    console.log('ALREADY UPDATED');
  }
}

