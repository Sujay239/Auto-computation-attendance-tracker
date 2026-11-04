-- ==============================================================================
-- PUSH NOTIFICATIONS & DEVICE TOKENS MIGRATION
-- Table: employee_device_tokens
-- Stores Expo Push Tokens & native FCM tokens for targeted mobile notifications
-- ==============================================================================

CREATE TABLE IF NOT EXISTS employee_device_tokens (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'ADMIN')),
    push_token TEXT NOT NULL UNIQUE,
    fcm_token TEXT,
    platform VARCHAR(20) DEFAULT 'android',
    device_name VARCHAR(150),
    app_version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_employee_id ON employee_device_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_role ON employee_device_tokens(role);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON employee_device_tokens(is_active);

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS trg_employee_device_tokens_updated_at ON employee_device_tokens;
CREATE TRIGGER trg_employee_device_tokens_updated_at
BEFORE UPDATE ON employee_device_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

