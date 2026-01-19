-- Jeff Agent Personal/Family Extension Schema
-- Migration 002: Add personal life management capabilities
-- Run in Supabase SQL Editor after 001_create_jeff_tables.sql

-- ============================================================================
-- 1. FAMILY MEMBERS TABLE
-- ============================================================================
-- Track family members and their associated calendars for aggregation

CREATE TABLE IF NOT EXISTS jeff_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  relationship TEXT NOT NULL, -- 'self', 'spouse', 'child', 'parent', etc.
  calendar_ids TEXT[] DEFAULT '{}', -- Google Calendar IDs for this person
  birth_date DATE,
  color TEXT, -- Display color for UI
  preferences JSONB DEFAULT '{}', -- Notification prefs, dietary needs, etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. RECURRING ITEMS TABLE
-- ============================================================================
-- Birthdays, anniversaries, renewals, seasonal tasks, and anticipation patterns

CREATE TABLE IF NOT EXISTS jeff_recurring_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'birthday', 'anniversary', 'renewal', 'seasonal',
    'health', 'financial', 'household', 'school', 'custom'
  )),
  -- Recurrence pattern
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN (
    'annual', 'monthly', 'weekly', 'quarterly', 'custom'
  )),
  -- For annual: month (1-12) and day (1-31)
  recurrence_month INTEGER CHECK (recurrence_month BETWEEN 1 AND 12),
  recurrence_day INTEGER CHECK (recurrence_day BETWEEN 1 AND 31),
  -- For other patterns: day of week (0-6), week of month, etc.
  recurrence_rule JSONB DEFAULT '{}', -- Flexible rule storage
  -- Anticipation settings
  remind_days_before INTEGER[] DEFAULT '{7, 1}', -- e.g., remind 7 days and 1 day before
  -- Context
  family_member_id UUID REFERENCES jeff_family_members(id),
  description TEXT,
  context JSONB DEFAULT '{}', -- Gift ideas, renewal details, etc.
  -- Status
  last_triggered_at TIMESTAMPTZ,
  next_occurrence DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. WELLBEING LOGS TABLE (PERMA Framework)
-- ============================================================================
-- Track PERMA dimensions: Positive emotion, Engagement, Relationships,
-- Meaning, Accomplishment

CREATE TABLE IF NOT EXISTS jeff_wellbeing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type TEXT NOT NULL CHECK (log_type IN ('daily', 'weekly', 'reflection')),
  -- PERMA scores (1-10 scale)
  positive_emotion INTEGER CHECK (positive_emotion BETWEEN 1 AND 10),
  engagement INTEGER CHECK (engagement BETWEEN 1 AND 10),
  relationships INTEGER CHECK (relationships BETWEEN 1 AND 10),
  meaning INTEGER CHECK (meaning BETWEEN 1 AND 10),
  accomplishment INTEGER CHECK (accomplishment BETWEEN 1 AND 10),
  -- Additional metrics
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  -- Qualitative
  gratitude TEXT[], -- 3 things grateful for
  wins TEXT[], -- Accomplishments/wins
  challenges TEXT[], -- Current challenges
  intentions TEXT[], -- Intentions for tomorrow/week
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(log_date, log_type)
);

-- ============================================================================
-- 4. HABITS TABLE
-- ============================================================================
-- Track habits with streaks (Atomic Habits inspired)

CREATE TABLE IF NOT EXISTS jeff_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN (
    'health', 'fitness', 'mindfulness', 'learning',
    'productivity', 'relationships', 'finance', 'custom'
  )),
  -- Frequency
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'specific_days')),
  target_days INTEGER[] DEFAULT '{}', -- For specific_days: 0=Sun, 1=Mon, etc.
  -- Tracking
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  last_completed_at DATE,
  -- Identity statement (Atomic Habits: "I am the type of person who...")
  identity_statement TEXT,
  -- Cue-Routine-Reward
  cue TEXT, -- What triggers the habit
  routine TEXT, -- The habit itself
  reward TEXT, -- How you reward yourself
  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. HABIT LOGS TABLE
-- ============================================================================
-- Daily habit completion logs

CREATE TABLE IF NOT EXISTS jeff_habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES jeff_habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

-- ============================================================================
-- 6. CALENDAR EVENTS CACHE TABLE
-- ============================================================================
-- Cache calendar events for faster aggregation and conflict detection

CREATE TABLE IF NOT EXISTS jeff_calendar_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  summary TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  family_member_id UUID REFERENCES jeff_family_members(id),
  event_type TEXT, -- 'sports', 'school', 'work', 'social', 'appointment', etc.
  all_day BOOLEAN DEFAULT false,
  raw_event JSONB, -- Full event data for reference
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(calendar_id, event_id)
);

-- ============================================================================
-- 7. EXTEND JEFF_TASKS FOR PERSONAL CATEGORIES
-- ============================================================================
-- Add personal-specific columns to existing tasks table

ALTER TABLE jeff_tasks
ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES jeff_family_members(id),
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'work', 'personal', 'family', 'health', 'finance',
  'household', 'school', 'social', 'errands', 'other'
));

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Family members
CREATE INDEX IF NOT EXISTS idx_jeff_family_active ON jeff_family_members(active);

-- Recurring items
CREATE INDEX IF NOT EXISTS idx_jeff_recurring_next ON jeff_recurring_items(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_jeff_recurring_category ON jeff_recurring_items(category);
CREATE INDEX IF NOT EXISTS idx_jeff_recurring_active ON jeff_recurring_items(active);

-- Wellbeing logs
CREATE INDEX IF NOT EXISTS idx_jeff_wellbeing_date ON jeff_wellbeing_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_jeff_wellbeing_type ON jeff_wellbeing_logs(log_type);

-- Habits
CREATE INDEX IF NOT EXISTS idx_jeff_habits_active ON jeff_habits(active);
CREATE INDEX IF NOT EXISTS idx_jeff_habits_category ON jeff_habits(category);

-- Habit logs
CREATE INDEX IF NOT EXISTS idx_jeff_habit_logs_date ON jeff_habit_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_jeff_habit_logs_habit ON jeff_habit_logs(habit_id);

-- Calendar cache
CREATE INDEX IF NOT EXISTS idx_jeff_calendar_cache_time ON jeff_calendar_cache(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_jeff_calendar_cache_calendar ON jeff_calendar_cache(calendar_id);
CREATE INDEX IF NOT EXISTS idx_jeff_calendar_cache_family ON jeff_calendar_cache(family_member_id);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate next occurrence for recurring items
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_recurrence_type TEXT,
  p_month INTEGER,
  p_day INTEGER,
  p_from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  v_next DATE;
BEGIN
  IF p_recurrence_type = 'annual' AND p_month IS NOT NULL AND p_day IS NOT NULL THEN
    -- Calculate next annual occurrence
    v_next := make_date(EXTRACT(YEAR FROM p_from_date)::INTEGER, p_month, p_day);
    IF v_next <= p_from_date THEN
      v_next := make_date(EXTRACT(YEAR FROM p_from_date)::INTEGER + 1, p_month, p_day);
    END IF;
  END IF;
  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Function to update habit streaks
CREATE OR REPLACE FUNCTION update_habit_streak() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true THEN
    -- Check if this continues a streak
    IF EXISTS (
      SELECT 1 FROM jeff_habit_logs
      WHERE habit_id = NEW.habit_id
      AND log_date = NEW.log_date - 1
      AND completed = true
    ) THEN
      UPDATE jeff_habits
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          total_completions = total_completions + 1,
          last_completed_at = NEW.log_date
      WHERE id = NEW.habit_id;
    ELSE
      -- Start new streak
      UPDATE jeff_habits
      SET current_streak = 1,
          total_completions = total_completions + 1,
          last_completed_at = NEW.log_date
      WHERE id = NEW.habit_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for habit streak updates
DROP TRIGGER IF EXISTS habit_streak_trigger ON jeff_habit_logs;
CREATE TRIGGER habit_streak_trigger
AFTER INSERT OR UPDATE ON jeff_habit_logs
FOR EACH ROW EXECUTE FUNCTION update_habit_streak();

-- ============================================================================
-- 10. SEED DATA: ADD PERSONAL PROJECT
-- ============================================================================

-- This would be added to the application configuration, not the database
-- But we can add some initial family structure if desired

-- Example: Add self as family member
-- INSERT INTO jeff_family_members (name, relationship, calendar_ids, color)
-- VALUES ('Jeff', 'self', ARRAY['jglittell@gmail.com', 'a4a6ea9f6da7d04f4dfd78cf1640959127b062ad3b8e010de045445c7bc7a9d8@group.calendar.google.com'], '#4285f4');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'jeff_family_members' as table_name, count(*) as row_count FROM jeff_family_members
UNION ALL
SELECT 'jeff_recurring_items', count(*) FROM jeff_recurring_items
UNION ALL
SELECT 'jeff_wellbeing_logs', count(*) FROM jeff_wellbeing_logs
UNION ALL
SELECT 'jeff_habits', count(*) FROM jeff_habits
UNION ALL
SELECT 'jeff_habit_logs', count(*) FROM jeff_habit_logs
UNION ALL
SELECT 'jeff_calendar_cache', count(*) FROM jeff_calendar_cache;
