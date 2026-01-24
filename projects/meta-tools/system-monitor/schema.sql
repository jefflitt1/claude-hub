-- System Monitoring Schema for Supabase
-- Run this in Supabase SQL Editor

-- Systems registry
CREATE TABLE IF NOT EXISTS system_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    system_type VARCHAR(50) NOT NULL, -- 'mac', 'windows', 'linux', 'raspberry_pi'
    ip_address VARCHAR(45),
    location VARCHAR(100),
    purpose TEXT,
    ssh_user VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics (time-series)
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cpu_percent DECIMAL(5,2),
    memory_percent DECIMAL(5,2),
    memory_used_gb DECIMAL(10,2),
    memory_total_gb DECIMAL(10,2),
    disk_percent DECIMAL(5,2),
    disk_used_gb DECIMAL(10,2),
    disk_total_gb DECIMAL(10,2),
    load_avg_1m DECIMAL(6,2),
    load_avg_5m DECIMAL(6,2),
    load_avg_15m DECIMAL(6,2),
    uptime_seconds BIGINT,
    process_count INTEGER,
    extra_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_hostname_time
ON system_metrics(hostname, timestamp DESC);

-- Service health checks
CREATE TABLE IF NOT EXISTS service_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50),
    is_running BOOLEAN,
    cpu_percent DECIMAL(5,2),
    memory_mb DECIMAL(10,2),
    port INTEGER,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    extra_data JSONB,
    UNIQUE(hostname, service_name)
);

-- Alert rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    system_filter VARCHAR(100),
    metric VARCHAR(50) NOT NULL,
    operator VARCHAR(10) NOT NULL,
    threshold DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 5,
    severity VARCHAR(20) DEFAULT 'warning',
    notify_channels TEXT[],
    is_active BOOLEAN DEFAULT true,
    cooldown_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id),
    hostname VARCHAR(100),
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    metric_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    notification_sent BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_alert_history_time ON alert_history(triggered_at DESC);

-- Backup tracking
CREATE TABLE IF NOT EXISTS backup_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(100) NOT NULL,
    backup_type VARCHAR(50),
    backup_name VARCHAR(255),
    backup_path TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT false,
    extra_data JSONB
);

-- Insert default systems
INSERT INTO system_registry (hostname, display_name, system_type, ip_address, location, purpose, ssh_user) VALUES
('Jeffs-Mac-Studio', 'Mac Studio', 'mac', '127.0.0.1', 'Office', 'Primary workstation, Docker host', 'jgl'),
('WIN-FIUHCFK9UL6', 'Windows VM1', 'windows', '192.168.64.2', 'UTM VM', 'TradeStation, Trading', 'jeff'),
('raspberrypi', 'Raspberry Pi', 'linux', NULL, 'Office', 'n8n automation server', 'pi')
ON CONFLICT (hostname) DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (name, metric, operator, threshold, severity, notify_channels) VALUES
('High CPU', 'cpu_percent', '>', 90, 'warning', ARRAY['telegram']),
('Critical CPU', 'cpu_percent', '>', 95, 'critical', ARRAY['telegram', 'email']),
('High Memory', 'memory_percent', '>', 85, 'warning', ARRAY['telegram']),
('Critical Memory', 'memory_percent', '>', 95, 'critical', ARRAY['telegram', 'email']),
('Disk Space Low', 'disk_percent', '>', 80, 'warning', ARRAY['telegram']),
('Disk Space Critical', 'disk_percent', '>', 90, 'critical', ARRAY['telegram', 'email']),
('TradeStation Down', 'service_down', '==', 1, 'critical', ARRAY['telegram', 'email']),
('n8n Down', 'service_down', '==', 1, 'critical', ARRAY['telegram'])
ON CONFLICT DO NOTHING;
