-- Create branch_meetings table to store monthly branch meeting notes
CREATE TABLE IF NOT EXISTS branch_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  branch_premises TEXT,
  market_position TEXT,
  staff_development TEXT,
  marketing TEXT,
  results_against_targets TEXT,
  management_style TEXT,
  six_point_plan TEXT,
  six_point_plan_text TEXT,
  customer_service TEXT,
  key_focus TEXT,
  meeting_held_by TEXT,
  meeting_with TEXT,
  rightmove_analysis JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, branch_name, meeting_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_branch_meetings_client_id ON branch_meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_branch_meetings_branch_date ON branch_meetings(branch_name, meeting_date);

-- Enable RLS
ALTER TABLE branch_meetings ENABLE ROW LEVEL SECURITY;

-- Policy for owners: Can access all meetings for their clients
CREATE POLICY "owners_all_branch_meetings"
ON branch_meetings
FOR ALL
USING (
  client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN agencies a ON c.agency_id = a.id
    WHERE a.owner_user_id = auth.uid()
  )
);

-- Policy for clients: Can access their own branch meetings
CREATE POLICY "clients_own_branch_meetings"
ON branch_meetings
FOR ALL
USING (
  client_id IN (
    SELECT c.id 
    FROM clients c
    WHERE lower(c.email) = lower(auth.jwt() ->> 'email')
       OR c.id::text = auth.jwt() ->> 'client_id'
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_branch_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branch_meetings_updated_at
BEFORE UPDATE ON branch_meetings
FOR EACH ROW
EXECUTE FUNCTION update_branch_meetings_updated_at();
