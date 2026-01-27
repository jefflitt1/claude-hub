-- Monitoring Dashboard Tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/donnmhbwhpjlmpnwgdqr/sql
-- Created: 2026-01-27

-- Beszel system metrics (synced from Beszel Hub API)
CREATE TABLE IF NOT EXISTS beszel_systems (
  id TEXT PRIMARY KEY,                    -- Beszel record ID (e.g. 'f76lb0zqd68qkpi')
  name TEXT NOT NULL,                     -- Display name (e.g. 'Mac Studio')
  host TEXT NOT NULL,                     -- IP or Docker hostname
  port TEXT DEFAULT '45876',
  status TEXT DEFAULT 'unknown',          -- 'up' or 'down'
  cpu_percent NUMERIC(5,2),
  memory_percent NUMERIC(5,2),
  disk_percent NUMERIC(5,2),
  cpu_threads INT,
  uptime_seconds BIGINT,
  agent_version TEXT,
  info JSONB DEFAULT '{}'::jsonb,         -- Full info blob for flexibility
  beszel_created_at TIMESTAMPTZ,
  beszel_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Uptime Kuma monitor status (synced from Kuma public API)
CREATE TABLE IF NOT EXISTS uptime_kuma_monitors (
  id INT PRIMARY KEY,                     -- Kuma monitor ID
  name TEXT NOT NULL,
  type TEXT DEFAULT 'http',
  group_name TEXT DEFAULT 'Services',
  status SMALLINT DEFAULT 0,              -- 1=up, 0=down
  ping_ms INT,                            -- Latest ping in ms
  uptime_24h NUMERIC(6,4),               -- 24h uptime ratio (0.0000-1.0000)
  last_message TEXT,                       -- Error message if down
  last_heartbeat_at TIMESTAMPTZ,
  is_paused BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_beszel_systems_status ON beszel_systems(status);
CREATE INDEX IF NOT EXISTS idx_kuma_monitors_status ON uptime_kuma_monitors(status);

-- Enable RLS
ALTER TABLE beszel_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE uptime_kuma_monitors ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access" ON beszel_systems FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON uptime_kuma_monitors FOR SELECT USING (true);

-- Allow service role full access (for n8n sync)
CREATE POLICY "Service role full access" ON beszel_systems FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON uptime_kuma_monitors FOR ALL USING (auth.role() = 'service_role');
