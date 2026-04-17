-- Security Monitoring Tables Migration
-- ป้องกัน LFI, RFI, SSRF, DOS, XSS, Injection, SQLi, IDOR และอื่นๆ

-- Security Events Table (เก็บทุก security event ที่เกิดขึ้น)
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    threat_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    payload TEXT,
    blocked BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for security_events
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);
CREATE INDEX idx_security_events_threat_type ON security_events(threat_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_blocked ON security_events(blocked);

-- Security Alerts Table (alerts สำหรับ threats ที่ร้ายแรง)
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    resolved_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for security_alerts
CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_ip_address ON security_alerts(ip_address);
CREATE INDEX idx_security_alerts_type ON security_alerts(type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);
CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at);

-- Blocked IPs Table (blacklist IPs)
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    blocked_by VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for blocked_ips
CREATE INDEX idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_expires_at ON blocked_ips(expires_at);

-- Comments
COMMENT ON TABLE security_events IS 'บันทึกทุก security event ที่เกิดขึ้นในระบบ';
COMMENT ON TABLE security_alerts IS 'Alerts สำหรับ security threats ที่ร้ายแรง';
COMMENT ON TABLE blocked_ips IS 'รายการ IP addresses ที่ถูก block';

COMMENT ON COLUMN security_events.threat_type IS 'ประเภทของ threat: XSS, SQL_INJECTION, LFI, RFI, SSRF, DOS, IDOR, etc.';
COMMENT ON COLUMN security_events.severity IS 'ระดับความร้ายแรง: CRITICAL, HIGH, MEDIUM, LOW, INFO';
COMMENT ON COLUMN security_events.blocked IS 'ระบุว่า request ถูก block หรือไม่';

COMMENT ON COLUMN security_alerts.status IS 'สถานะของ alert: OPEN, INVESTIGATING, RESOLVED, FALSE_POSITIVE';
