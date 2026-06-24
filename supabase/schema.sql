-- ============================================
-- MissionLink Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  photo_url TEXT,
  ton_wallet TEXT,                 -- creator's TON wallet address
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_ton NUMERIC(18, 9) NOT NULL,
  current_ton NUMERIC(18, 9) NOT NULL DEFAULT 0,
  winner_count INT NOT NULL DEFAULT 1,
  weighted BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_ton NUMERIC(18, 9) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id),
  donor_id BIGINT NOT NULL REFERENCES users(id),
  amount_ton NUMERIC(18, 9) NOT NULL,          -- total amount (creator + fee)
  creator_amount_ton NUMERIC(18, 9) NOT NULL,  -- 90% to creator
  fee_amount_ton NUMERIC(18, 9) NOT NULL,      -- 10% to platform
  tx_hash TEXT UNIQUE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id),
  donor_id BIGINT NOT NULL REFERENCES users(id),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_creator ON missions(creator_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_donations_mission ON donations(mission_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_tx_hash ON donations(tx_hash);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON users FOR ALL USING (true);
CREATE POLICY "service_role_all" ON missions FOR ALL USING (true);
CREATE POLICY "service_role_all" ON tiers FOR ALL USING (true);
CREATE POLICY "service_role_all" ON donations FOR ALL USING (true);
CREATE POLICY "service_role_all" ON winners FOR ALL USING (true);

-- Update mission total when donation confirmed
CREATE OR REPLACE FUNCTION update_mission_ton()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE missions
    SET current_ton = current_ton + NEW.amount_ton
    WHERE id = NEW.mission_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_donation_confirmed
  AFTER UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_mission_ton();
