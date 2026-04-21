-- Training sessions (the actual plan)
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  phase TEXT NOT NULL,
  session_type TEXT NOT NULL,
  distance_miles DECIMAL,
  distance_km DECIMAL,
  pace TEXT,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  actual_distance_miles DECIMAL,
  actual_distance_km DECIMAL,
  actual_pace TEXT,
  strava_activity_ids JSONB,
  edited_at TIMESTAMPTZ,
  edited_by TEXT,
  adjustment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Race targets
CREATE TABLE IF NOT EXISTS race_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  race_name TEXT NOT NULL,
  race_date DATE NOT NULL,
  distance TEXT NOT NULL,
  distance_km DECIMAL NOT NULL,
  target_time TEXT,
  target_pace TEXT,
  predicted_time TEXT,
  predicted_pace TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training adjustment log
CREATE TABLE IF NOT EXISTS training_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER,
  trigger TEXT NOT NULL,
  summary TEXT NOT NULL,
  sessions_affected JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow all access (single user app)
DROP POLICY IF EXISTS "Allow all" ON training_sessions;
DROP POLICY IF EXISTS "Allow all" ON race_targets;
DROP POLICY IF EXISTS "Allow all" ON training_adjustments;

CREATE POLICY "Allow all" ON training_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON race_targets FOR ALL USING (true);
CREATE POLICY "Allow all" ON training_adjustments FOR ALL USING (true);
