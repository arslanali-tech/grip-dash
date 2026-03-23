-- Create movement_status_history table for tracking status changes
-- Provides full audit trail of movement status transitions

CREATE TABLE IF NOT EXISTS public.movement_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.movements(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  notes TEXT, -- Optional notes about the status change
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_movement_status_history_movement_id ON public.movement_status_history(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_status_history_created_at ON public.movement_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_status_history_new_status ON public.movement_status_history(new_status);

-- Enable RLS
ALTER TABLE public.movement_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view status history for movements in their agency
CREATE POLICY "Users can view movement status history" ON public.movement_status_history
  FOR SELECT
  USING (
    movement_id IN (
      SELECT id FROM public.movements 
      WHERE agency_id IN (
        SELECT agency_id FROM public.clients 
        WHERE id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
        UNION
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert status history (typically done via triggers or API)
CREATE POLICY "Users can create status history" ON public.movement_status_history
  FOR INSERT
  WITH CHECK (
    movement_id IN (
      SELECT id FROM public.movements 
      WHERE agency_id IN (
        SELECT agency_id FROM public.clients 
        WHERE id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
        UNION
        SELECT agency_id FROM public.agency_admins 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON public.movement_status_history TO authenticated;

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_movement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.movement_status_history (
      movement_id,
      previous_status,
      new_status,
      changed_by,
      changed_by_name
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      (SELECT name FROM public.client_staff WHERE email = auth.jwt() ->> 'email' LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status history logging
DROP TRIGGER IF EXISTS trigger_log_movement_status_change ON public.movements;
CREATE TRIGGER trigger_log_movement_status_change
  AFTER UPDATE ON public.movements
  FOR EACH ROW
  EXECUTE FUNCTION public.log_movement_status_change();
