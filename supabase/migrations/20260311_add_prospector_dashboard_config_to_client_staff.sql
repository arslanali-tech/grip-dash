-- Add prospector_dashboard_config column to client_staff table
-- This stores per-staff housekeeping visibility and prospector nav item configuration

ALTER TABLE client_staff
  ADD COLUMN IF NOT EXISTS prospector_dashboard_config JSONB DEFAULT NULL;

COMMENT ON COLUMN client_staff.prospector_dashboard_config IS
  'Stores the prospector dashboard configuration for this staff member, including housekeeping item visibility and nav item order.';
