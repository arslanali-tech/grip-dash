-- Create user_notes table for ThinkPad notes persistence
-- Notes can be text, drawing (canvas), or mixed type

CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Text content
  canvas_data TEXT, -- Base64 image data for drawings
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'draw', 'mixed')),
  -- Sharing configuration
  shared_with_roles TEXT[] DEFAULT '{}', -- Array of roles that can view this note
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_agency_id ON public.user_notes(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON public.user_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own notes
CREATE POLICY "Users can view own notes" ON public.user_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view notes shared with their role
CREATE POLICY "Users can view shared notes" ON public.user_notes
  FOR SELECT
  USING (
    is_shared = true 
    AND agency_id IN (
      SELECT agency_id FROM public.clients 
      WHERE id = (auth.jwt() ->> 'client_id')::uuid
    )
    AND (
      array_length(shared_with_roles, 1) IS NULL 
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = ANY(shared_with_roles)
    )
  );

-- Users can insert their own notes
CREATE POLICY "Users can create own notes" ON public.user_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes" ON public.user_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON public.user_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_user_notes_updated_at ON public.user_notes;
CREATE TRIGGER trigger_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_notes_updated_at();
