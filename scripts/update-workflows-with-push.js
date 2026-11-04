const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, '..', 'n8n-workflows');

// ==========================================
// 1. UPDATE leave-apply-workflow.json
// ==========================================
function updateLeaveApplyWorkflow() {
  const filePath = path.join(workflowsDir, 'leave-apply-workflow.json');
  const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Update SQL in 'Postgres - Insert Leave Request & Notify'
  const pgNode = wf.nodes.find(n => n.name === 'Postgres - Insert Leave Request & Notify');
  if (pgNode) {
    pgNode.parameters.query = `WITH 
emp AS (
  SELECT first_name, last_name FROM employees WHERE id = '{{ $json.employeeId }}' LIMIT 1
),
bal AS (
  SELECT total, used, available
  FROM leave_balances
  WHERE employee_id = '{{ $json.employeeId }}'
    AND leave_type = '{{ $json.leaveType }}'
    AND year = EXTRACT(YEAR FROM '{{ $json.startDate }}'::DATE)::INT
  LIMIT 1
),
ins AS (
  INSERT INTO leave_requests (
    id, employee_id, leave_type, duration_type,
    start_date, end_date, days_count, reason,
    status, applied_on, whatsapp_notice_acknowledged,
    comments
  ) VALUES (
    '{{ $json.leaveId }}',
    '{{ $json.employeeId }}',
    '{{ $json.leaveType }}',
    '{{ $json.durationType }}',
    '{{ $json.startDate }}'::DATE,
    '{{ $json.effectiveEndDate }}'::DATE,
    {{ $json.daysCount }},
    '{{ $json.escapedReason }}',
    'PENDING',
    CURRENT_DATE,
    {{ $json.whatsappNoticeAcknowledged ? 'TRUE' : 'FALSE' }},
    'Pending management approval and official WhatsApp group validation.'
  )
  RETURNING 
    id, employee_id, leave_type, duration_type,
    start_date::TEXT, end_date::TEXT, days_count, reason,
    status, applied_on::TEXT, whatsapp_notice_acknowledged,
    comments, created_at::TEXT
),
notif AS (
  INSERT INTO notifications (
    id, employee_id, category, title, message, action_route, priority, is_read
  ) VALUES (
    '{{ $json.notifId }}',
    '{{ $json.employeeId }}',
    'LEAVE_UPDATE',
    'Leave Request Submitted',
    'Your request for {{ $json.daysCount }} day(s) {{ $json.leaveType }} leave ({{ $json.startDate }} to {{ $json.effectiveEndDate }}) has been submitted for approval.',
    '/(tabs)/leave',
    'NORMAL',
    FALSE
  )
  RETURNING id
),
notif_admins AS (
  INSERT INTO notifications (
    id, employee_id, category, title, message, action_route, priority, is_read
  )
  SELECT 
    'notif-adm-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || a.id,
    a.id,
    'LEAVE_UPDATE',
    'New Leave Request: ' || COALESCE(e.first_name || ' ' || e.last_name, '{{ $json.employeeId }}'),
    COALESCE(e.first_name || ' ' || e.last_name, 'Employee') || ' applied for ' || '{{ $json.daysCount }}' || ' day(s) ' || '{{ $json.leaveType }}' || ' leave (' || '{{ $json.startDate }}' || ' to ' || '{{ $json.effectiveEndDate }}' || '). Reason: ' || '{{ $json.escapedReason }}',
    '/(tabs)/approvals',
    'HIGH',
    FALSE
  FROM employees a
  CROSS JOIN emp e
  WHERE (a.role = 'ADMIN' OR a.id LIKE 'ADM%')
  RETURNING id
),
admin_tokens AS (
  SELECT array_agg(DISTINCT push_token) FILTER (WHERE push_token IS NOT NULL AND push_token != '') AS tokens
  FROM employee_device_tokens
  WHERE (role = 'ADMIN' OR employee_id LIKE 'ADM%') AND is_active = TRUE
)
SELECT 
  row_to_json(ins.*) AS leave_request,
  row_to_json(bal.*) AS current_balance,
  COALESCE((SELECT first_name || ' ' || last_name FROM emp), '{{ $json.employeeId }}') AS applicant_name,
  COALESCE((SELECT tokens FROM admin_tokens), ARRAY[]::TEXT[]) AS admin_tokens
FROM ins
LEFT JOIN bal ON true;`;
  }

  // 2. Update Code node to build push payload
  const formatNode = wf.nodes.find(n => n.name === 'Code - Format Leave Application Response');
  if (formatNode) {
    formatNode.parameters.jsCode = `const items = $input.all();
const data = (items.length > 0 && items[0].json) ? items[0].json : {};
const req = data.leave_request || {};
const bal = data.current_balance || {};

if (!req.id) {
  return [{
    json: {
      success: false,
      statusCode: 500,
      error: "Failed to record leave request in database."
    }
  }];
}

const avail = parseFloat(bal.available || '0');
const requested = parseFloat(req.days_count || '0');
const applicantName = data.applicant_name || req.employee_id || 'Staff Member';

// Prepare Expo push messages for active admins
const rawTokens = Array.isArray(data.admin_tokens) ? data.admin_tokens : [];
const validTokens = rawTokens.filter(t => typeof t === 'string' && t.trim().length > 0);

const pushMessages = validTokens.map(token => ({
  to: token.trim(),
  sound: 'default',
  title: \`New Leave Request - \${applicantName}\`,
  body: \`\${applicantName} applied for \${requested} day(s) \${req.leave_type} leave (\${req.start_date} to \${req.end_date}). Reason: \${req.reason || 'No reason'}\`,
  priority: 'high',
  channelId: 'default',
  data: {
    type: 'LEAVE_APPLICATION',
    leaveId: req.id,
    employeeId: req.employee_id,
    targetScreen: '/(tabs)/approvals'
  }
}));

return [{
  json: {
    success: true,
    statusCode: 200,
    message: "Leave request submitted successfully. Pending admin review and WhatsApp notice.",
    request: {
      id: req.id,
      employeeId: req.employee_id,
      leaveType: req.leave_type,
      durationType: req.duration_type,
      startDate: req.start_date,
      endDate: req.end_date,
      daysCount: requested,
      reason: req.reason,
      status: req.status || 'PENDING',
      appliedOn: req.applied_on,
      whatsappNoticeAcknowledged: req.whatsapp_notice_acknowledged,
      comments: req.comments,
      createdAt: req.created_at
    },
    balance: {
      leaveType: req.leave_type,
      total: parseFloat(bal.total || '0'),
      used: parseFloat(bal.used || '0'),
      available: avail,
      projectedRemaining: Math.max(0, avail - requested)
    },
    hasPushMessages: pushMessages.length > 0,
    pushMessages: pushMessages
  }
}];`;
  }

  // 3. Remove existing push nodes if already present to avoid duplicates
  wf.nodes = wf.nodes.filter(n => n.name !== 'If - Has Admin Push Tokens?' && n.name !== 'HTTP Request - Push to Expo');

  // 4. Add 'If - Has Admin Push Tokens?' node
  const ifPushNode = {
    parameters: {
      conditions: {
        boolean: [
          {
            value1: "={{ $json.hasPushMessages }}",
            value2: true
          }
        ]
      }
    },
    id: "lev1a2b3-push-0001-4000-800000000001",
    name: "If - Has Admin Push Tokens?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [1920, 100]
  };

  // 5. Add 'HTTP Request - Push to Expo' node
  const httpPushNode = {
    parameters: {
      method: "POST",
      url: "https://exp.host/--/api/v2/push/send",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "Accept",
            value: "application/json"
          },
          {
            name: "Content-Type",
            value: "application/json"
          }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.pushMessages) }}",
      options: {}
    },
    id: "lev1a2b3-push-0002-4000-800000000002",
    name: "HTTP Request - Push to Expo",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2140, 20],
    onError: "continueRegularOutput"
  };

  wf.nodes.push(ifPushNode);
  wf.nodes.push(httpPushNode);

  // 6. Update position and responseBody of 'Respond 200 - Leave Applied'
  const resp200Node = wf.nodes.find(n => n.name === 'Respond 200 - Leave Applied');
  if (resp200Node) {
    resp200Node.position = [2360, 100];
    resp200Node.parameters.responseBody = "={{ JSON.stringify({\n  success: true,\n  statusCode: 200,\n  message: $('Code - Format Leave Application Response').first().json.message,\n  request: $('Code - Format Leave Application Response').first().json.request,\n  balance: $('Code - Format Leave Application Response').first().json.balance\n}) }}";
  }

  // 7. Update connections
  wf.connections['Code - Format Leave Application Response'] = {
    main: [
      [
        {
          node: "If - Has Admin Push Tokens?",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['If - Has Admin Push Tokens?'] = {
    main: [
      [
        {
          node: "HTTP Request - Push to Expo",
          type: "main",
          index: 0
        }
      ],
      [
        {
          node: "Respond 200 - Leave Applied",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['HTTP Request - Push to Expo'] = {
    main: [
      [
        {
          node: "Respond 200 - Leave Applied",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf8');
  console.log('Successfully updated leave-apply-workflow.json');
}

// ==========================================
// 2. UPDATE leave-list-workflow.json
// ==========================================
function updateLeaveListWorkflow() {
  const filePath = path.join(workflowsDir, 'leave-list-workflow.json');
  const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Update SQL in 'Postgres - Review Leave (Approve/Reject)'
  const pgNode = wf.nodes.find(n => n.name === 'Postgres - Review Leave (Approve/Reject)');
  if (pgNode) {
    pgNode.parameters.query = `={{ $json.action === 'APPROVE' ? \`
WITH target_req AS (
  SELECT lr.id, lr.employee_id, lr.leave_type, lr.days_count, lr.start_date, lr.end_date,
         e.first_name, e.last_name
  FROM leave_requests lr
  LEFT JOIN employees e ON e.id = lr.employee_id
  WHERE lr.id = '\` + $json.requestId + \`'
  LIMIT 1
),
upd_req AS (
  UPDATE leave_requests
  SET 
    status = 'APPROVED',
    approved_or_rejected_by = '\` + $json.callerName + \`',
    reviewed_on = CURRENT_DATE,
    comments = '\` + $json.escapedComment + \`'
  WHERE id = '\` + $json.requestId + \`'
  RETURNING *
),
upd_bal AS (
  UPDATE leave_balances b
  SET used = b.used + tr.days_count
  FROM target_req tr
  WHERE b.employee_id = tr.employee_id
    AND b.leave_type = tr.leave_type
    AND b.year = EXTRACT(YEAR FROM tr.start_date)::INT
  RETURNING b.*
),
ins_notif AS (
  INSERT INTO notifications (
    id, employee_id, category, title, message, action_route, priority, is_read
  )
  SELECT 
    '\` + $json.notifId + \`',
    tr.employee_id,
    'LEAVE_UPDATE',
    'Leave Request Approved 🎉',
    'Your leave application (\` + $json.requestId + \`) has been approved by HR.',
    '/(tabs)/leave',
    'HIGH',
    FALSE
  FROM target_req tr
  RETURNING id
),
emp_tokens AS (
  SELECT array_agg(DISTINCT edt.push_token) FILTER (WHERE edt.push_token IS NOT NULL AND edt.push_token != '') AS tokens
  FROM target_req tr
  JOIN employee_device_tokens edt ON edt.employee_id = tr.employee_id
  WHERE edt.is_active = TRUE
)
SELECT 
  row_to_json(r.*) AS leave_request,
  row_to_json(b.*) AS updated_balance,
  tr.employee_id AS applicant_id,
  COALESCE(tr.first_name || ' ' || tr.last_name, tr.employee_id) AS applicant_name,
  COALESCE((SELECT tokens FROM emp_tokens), ARRAY[]::TEXT[]) AS employee_tokens
FROM upd_req r
LEFT JOIN target_req tr ON true
LEFT JOIN upd_bal b ON true;
\` : ($json.action === 'RESET' || $json.action === 'PENDING') ? \`
WITH target_req AS (
  SELECT id, employee_id, leave_type, days_count, start_date, status
  FROM leave_requests
  WHERE id = '\` + $json.requestId + \`'
  LIMIT 1
),
upd_req AS (
  UPDATE leave_requests
  SET 
    status = 'PENDING',
    approved_or_rejected_by = NULL,
    reviewed_on = NULL,
    comments = 'Pending management review'
  WHERE id = '\` + $json.requestId + \`'
  RETURNING *
),
upd_bal AS (
  UPDATE leave_balances b
  SET used = GREATEST(0, b.used - tr.days_count)
  FROM target_req tr
  WHERE tr.status = 'APPROVED'
    AND b.employee_id = tr.employee_id
    AND b.leave_type = tr.leave_type
    AND b.year = EXTRACT(YEAR FROM tr.start_date)::INT
  RETURNING b.*
)
SELECT 
  row_to_json(r.*) AS leave_request,
  row_to_json(b.*) AS updated_balance,
  ARRAY[]::TEXT[] AS employee_tokens
FROM upd_req r
LEFT JOIN upd_bal b ON true;
\` : \`
WITH target_req AS (
  SELECT lr.id, lr.employee_id, lr.leave_type, lr.days_count, lr.start_date, lr.end_date,
         e.first_name, e.last_name
  FROM leave_requests lr
  LEFT JOIN employees e ON e.id = lr.employee_id
  WHERE lr.id = '\` + $json.requestId + \`'
  LIMIT 1
),
upd_req AS (
  UPDATE leave_requests
  SET 
    status = 'REJECTED',
    approved_or_rejected_by = '\` + $json.callerName + \`',
    reviewed_on = CURRENT_DATE,
    comments = '\` + $json.escapedComment + \`'
  WHERE id = '\` + $json.requestId + \`'
  RETURNING *
),
ins_notif AS (
  INSERT INTO notifications (
    id, employee_id, category, title, message, action_route, priority, is_read
  )
  SELECT 
    '\` + $json.notifId + \`',
    tr.employee_id,
    'LEAVE_UPDATE',
    'Leave Request Rejected',
    'Your leave application (\` + $json.requestId + \`) has been rejected. Note: ' || '\` + $json.escapedComment + \`',
    '/(tabs)/leave',
    'HIGH',
    FALSE
  FROM target_req tr
  RETURNING id
),
emp_tokens AS (
  SELECT array_agg(DISTINCT edt.push_token) FILTER (WHERE edt.push_token IS NOT NULL AND edt.push_token != '') AS tokens
  FROM target_req tr
  JOIN employee_device_tokens edt ON edt.employee_id = tr.employee_id
  WHERE edt.is_active = TRUE
)
SELECT 
  row_to_json(r.*) AS leave_request,
  NULL AS updated_balance,
  tr.employee_id AS applicant_id,
  COALESCE(tr.first_name || ' ' || tr.last_name, tr.employee_id) AS applicant_name,
  COALESCE((SELECT tokens FROM emp_tokens), ARRAY[]::TEXT[]) AS employee_tokens
FROM upd_req r
LEFT JOIN target_req tr ON true;
\` }}`;
  }

  // 2. Update 'Code - Format Review Response'
  const formatNode = wf.nodes.find(n => n.name === 'Code - Format Review Response');
  if (formatNode) {
    formatNode.parameters.jsCode = `const items = $input.all();
const row = (items.length > 0 && items[0].json) ? items[0].json : {};
const req = row.leave_request;

if (!req) {
  return [{
    json: {
      success: false,
      statusCode: 404,
      error: "Leave request not found or failed to update."
    }
  }];
}

const rawTokens = Array.isArray(row.employee_tokens) ? row.employee_tokens : [];
const validTokens = rawTokens.filter(t => typeof t === 'string' && t.trim().length > 0);

const isApproved = req.status === 'APPROVED';
const pushMessages = validTokens.map(token => ({
  to: token.trim(),
  sound: 'default',
  title: isApproved ? 'Leave Request Approved! 🎉' : 'Leave Request Rejected',
  body: isApproved 
    ? \`Your \${req.leave_type || ''} leave request for \${req.days_count || 1} day(s) from \${req.start_date} to \${req.end_date} has been approved by HR.\`
    : \`Your leave request for \${req.start_date} was rejected. Note: \${req.comments || 'No comment'}\`,
  priority: 'high',
  channelId: 'default',
  data: {
    type: 'LEAVE_REVIEW',
    requestId: req.id,
    status: req.status,
    targetScreen: '/(tabs)/leave'
  }
}));

return [{
  json: {
    success: true,
    statusCode: 200,
    message: \`Leave request successfully updated to \${req.status}.\`,
    request: req,
    balance: row.updated_balance || null,
    hasPushMessages: pushMessages.length > 0,
    pushMessages: pushMessages
  }
}];`;
  }

  // 3. Remove existing push nodes if already present
  wf.nodes = wf.nodes.filter(n => n.name !== 'If - Has Review Push Tokens?' && n.name !== 'HTTP Request - Push to Expo (Leave Review)');

  // 4. Add 'If - Has Review Push Tokens?'
  const ifReviewPushNode = {
    parameters: {
      conditions: {
        boolean: [
          {
            value1: "={{ $json.hasPushMessages }}",
            value2: true
          }
        ]
      }
    },
    id: "levl-push-0001-4000-800000000001",
    name: "If - Has Review Push Tokens?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [2140, 40]
  };

  // 5. Add 'HTTP Request - Push to Expo (Leave Review)'
  const httpReviewPushNode = {
    parameters: {
      method: "POST",
      url: "https://exp.host/--/api/v2/push/send",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "Accept",
            value: "application/json"
          },
          {
            name: "Content-Type",
            value: "application/json"
          }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.pushMessages) }}",
      options: {}
    },
    id: "levl-push-0002-4000-800000000002",
    name: "HTTP Request - Push to Expo (Leave Review)",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2360, 0],
    onError: "continueRegularOutput"
  };

  wf.nodes.push(ifReviewPushNode);
  wf.nodes.push(httpReviewPushNode);

  // 6. Update position and responseBody of 'Respond 200 - Success'
  const resp200Node = wf.nodes.find(n => n.name === 'Respond 200 - Success');
  if (resp200Node) {
    resp200Node.position = [2580, 140];
    resp200Node.parameters.responseBody = "={{ JSON.stringify($json.records ? $json : ($('Code - Format Review Response').first() ? {\n  success: true,\n  statusCode: 200,\n  message: $('Code - Format Review Response').first().json.message,\n  request: $('Code - Format Review Response').first().json.request,\n  balance: $('Code - Format Review Response').first().json.balance\n} : $json)) }}";
  }

  // 7. Update connections
  wf.connections['Code - Format Review Response'] = {
    main: [
      [
        {
          node: "If - Has Review Push Tokens?",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['If - Has Review Push Tokens?'] = {
    main: [
      [
        {
          node: "HTTP Request - Push to Expo (Leave Review)",
          type: "main",
          index: 0
        }
      ],
      [
        {
          node: "Respond 200 - Success",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['HTTP Request - Push to Expo (Leave Review)'] = {
    main: [
      [
        {
          node: "Respond 200 - Success",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf8');
  console.log('Successfully updated leave-list-workflow.json');
}

// ==========================================
// 3. UPDATE overtime-management-workflow.json
// ==========================================
function updateOvertimeWorkflow() {
  const filePath = path.join(workflowsDir, 'overtime-management-workflow.json');
  const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Update SQL in 'Postgres - Admin Approve or Reject Overtime'
  const pgNode = wf.nodes.find(n => n.name === 'Postgres - Admin Approve or Reject Overtime');
  if (pgNode) {
    pgNode.parameters.query = `DO $$
DECLARE
  v_target_status VARCHAR(50);
  v_early_leave_status VARCHAR(50);
  v_emp_id VARCHAR(50);
  v_date TEXT;
  v_hours TEXT;
BEGIN
  IF '{{ $json.action }}' = 'APPROVE' THEN
    v_target_status := 'APPROVED';
    v_early_leave_status := 'AVAILABLE';
  ELSE
    v_target_status := 'REJECTED';
    v_early_leave_status := 'NOT_APPLICABLE';
  END IF;

  UPDATE overtime_records SET
    status = v_target_status,
    early_leave_status = v_early_leave_status,
    reviewed_date = CURRENT_DATE,
    approver = '{{ $json.approverName }}',
    notes = '{{ $json.adminNotes }}',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = '{{ $json.overtimeId }}'
  RETURNING employee_id, date::TEXT, hours_formatted INTO v_emp_id, v_date, v_hours;

  IF v_emp_id IS NOT NULL THEN
    INSERT INTO notifications (
      id, employee_id, category, title, message, action_route, priority, is_read
    ) VALUES (
      'notif-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || v_emp_id,
      v_emp_id,
      'OVERTIME_UPDATE',
      CASE WHEN v_target_status = 'APPROVED' THEN 'Overtime Approved! 🎉' ELSE 'Overtime Request Rejected' END,
      CASE WHEN v_target_status = 'APPROVED' 
           THEN 'Your overtime of ' || v_hours || ' on ' || v_date || ' was approved. You can now use this credit to leave early this week.' 
           ELSE 'Your overtime request on ' || v_date || ' was reviewed and rejected by Admin.' END,
      '/(tabs)/overtime',
      CASE WHEN v_target_status = 'APPROVED' THEN 'HIGH' ELSE 'NORMAL' END,
      FALSE
    );
  END IF;
END $$;

WITH emp_tokens AS (
  SELECT array_agg(DISTINCT edt.push_token) FILTER (WHERE edt.push_token IS NOT NULL AND edt.push_token != '') AS tokens
  FROM overtime_records ot
  JOIN employee_device_tokens edt ON edt.employee_id = ot.employee_id
  WHERE ot.id = '{{ $json.overtimeId }}' AND edt.is_active = TRUE
)
SELECT 
  ot.id,
  ot.employee_id,
  ot.date::TEXT,
  ot.start_time,
  ot.end_time,
  ot.duration_minutes,
  ot.hours_formatted,
  ot.reason,
  ot.approver,
  ot.status,
  ot.reviewed_date::TEXT,
  ot.compensation_method,
  ot.early_leave_status,
  ot.notes,
  COALESCE(e.first_name || ' ' || e.last_name, ot.employee_id) AS employee_name,
  COALESCE((SELECT tokens FROM emp_tokens), ARRAY[]::TEXT[]) AS employee_tokens
FROM overtime_records ot
LEFT JOIN employees e ON e.id = ot.employee_id
WHERE ot.id = '{{ $json.overtimeId }}'
LIMIT 1;`;
  }

  // 2. Update 'Code - Format Admin Decision Response'
  const formatNode = wf.nodes.find(n => n.name === 'Code - Format Admin Decision Response');
  if (formatNode) {
    formatNode.parameters.jsCode = `const items = $input.all();
const data = (items.length > 0 && items[0].json) ? items[0].json : {};
const routerData = $('Code - Enforce RBAC & Resolve Overtime Action').first().json || {};

if (!data.id) {
  return [{
    json: {
      success: false,
      statusCode: 404,
      error: \`Overtime record \${routerData.overtimeId} not found.\`
    }
  }];
}

const actionVerb = routerData.action === 'APPROVE' ? 'approved' : 'rejected';
const rawTokens = Array.isArray(data.employee_tokens) ? data.employee_tokens : [];
const validTokens = rawTokens.filter(t => typeof t === 'string' && t.trim().length > 0);

const isApproved = routerData.action === 'APPROVE';
const pushMessages = validTokens.map(token => ({
  to: token.trim(),
  sound: 'default',
  title: isApproved ? 'Overtime Request Approved! 🎉' : 'Overtime Request Rejected',
  body: isApproved
    ? \`Your overtime request for \${data.hours_formatted || ''} on \${data.date} was approved. You can use it to leave early this week.\`
    : \`Your overtime request on \${data.date} was rejected by Admin.\`,
  priority: 'high',
  channelId: 'default',
  data: {
    type: 'OVERTIME_REVIEW',
    overtimeId: data.id,
    status: data.status,
    targetScreen: '/(tabs)/overtime'
  }
}));

return [{
  json: {
    success: true,
    statusCode: 200,
    message: \`Overtime record \${data.id} has been \${actionVerb} successfully.\`,
    action: routerData.action,
    record: {
      id: data.id,
      employeeId: data.employee_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      durationMinutes: data.duration_minutes,
      hoursFormatted: data.hours_formatted,
      status: data.status,
      earlyLeaveStatus: data.early_leave_status,
      approver: data.approver,
      reviewedDate: data.reviewed_date,
      notes: data.notes
    },
    hasPushMessages: pushMessages.length > 0,
    pushMessages: pushMessages
  }
}];`;
  }

  // 3. Remove existing push nodes if already present
  wf.nodes = wf.nodes.filter(n => n.name !== 'If - Has Overtime Push Tokens?' && n.name !== 'HTTP Request - Push to Expo (Overtime Review)');

  // 4. Add 'If - Has Overtime Push Tokens?'
  const ifOtPushNode = {
    parameters: {
      conditions: {
        boolean: [
          {
            value1: "={{ $json.hasPushMessages }}",
            value2: true
          }
        ]
      }
    },
    id: "ot1a2b3c-push-0001-4000-800000000001",
    name: "If - Has Overtime Push Tokens?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [2140, 240]
  };

  // 5. Add 'HTTP Request - Push to Expo (Overtime Review)'
  const httpOtPushNode = {
    parameters: {
      method: "POST",
      url: "https://exp.host/--/api/v2/push/send",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: "Accept",
            value: "application/json"
          },
          {
            name: "Content-Type",
            value: "application/json"
          }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.pushMessages) }}",
      options: {}
    },
    id: "ot1a2b3c-push-0002-4000-800000000002",
    name: "HTTP Request - Push to Expo (Overtime Review)",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2360, 200],
    onError: "continueRegularOutput"
  };

  wf.nodes.push(ifOtPushNode);
  wf.nodes.push(httpOtPushNode);

  // 6. Update position and responseBody of 'Respond 200 - Success'
  const resp200Node = wf.nodes.find(n => n.name === 'Respond 200 - Success');
  if (resp200Node) {
    resp200Node.position = [2580, 140];
    resp200Node.parameters.responseBody = "={{ JSON.stringify($json.records ? $json : ($('Code - Format Admin Decision Response').first() ? {\n  success: true,\n  statusCode: 200,\n  message: $('Code - Format Admin Decision Response').first().json.message,\n  action: $('Code - Format Admin Decision Response').first().json.action,\n  record: $('Code - Format Admin Decision Response').first().json.record\n} : $json)) }}";
  }

  // 7. Update connections
  wf.connections['Code - Format Admin Decision Response'] = {
    main: [
      [
        {
          node: "If - Has Overtime Push Tokens?",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['If - Has Overtime Push Tokens?'] = {
    main: [
      [
        {
          node: "HTTP Request - Push to Expo (Overtime Review)",
          type: "main",
          index: 0
        }
      ],
      [
        {
          node: "Respond 200 - Success",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  wf.connections['HTTP Request - Push to Expo (Overtime Review)'] = {
    main: [
      [
        {
          node: "Respond 200 - Success",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf8');
  console.log('Successfully updated overtime-management-workflow.json');
}

updateLeaveApplyWorkflow();
updateLeaveListWorkflow();
updateOvertimeWorkflow();

