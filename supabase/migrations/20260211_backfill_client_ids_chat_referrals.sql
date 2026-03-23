-- Backfill client_id for legacy chat and referral data
-- This ensures existing rows are scoped to the correct client
-- so RLS policies prevent cross-client data leakage.

BEGIN;

-- 1) Team channels: infer client from branch
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_channels'
  ) THEN
    UPDATE public.team_channels tc
    SET client_id = cb.client_id
    FROM public.client_branches cb
    WHERE tc.client_id IS NULL AND tc.branch_id IS NOT NULL AND tc.branch_id = cb.id;
  END IF;
END $$;

-- 2) Team messages: prefer channel's client, then branch
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='team_messages'
  ) THEN
    -- via channel
    UPDATE public.team_messages tm
    SET client_id = tc.client_id
    FROM public.team_channels tc
    WHERE tm.client_id IS NULL AND tm.channel_id = tc.id AND tc.client_id IS NOT NULL;

    -- via branch (fallback)
    UPDATE public.team_messages tm
    SET client_id = cb.client_id
    FROM public.client_branches cb
    WHERE tm.client_id IS NULL AND tm.branch_id IS NOT NULL AND tm.branch_id = cb.id;
  END IF;
END $$;

-- 3) Team direct messages: no reliable inference; leave NULL (owner-only per RLS)

-- 4) B2B companies: infer client from branch
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='b2b_companies'
  ) THEN
    UPDATE public.b2b_companies c
    SET client_id = cb.client_id
    FROM public.client_branches cb
    WHERE c.client_id IS NULL AND c.branch_id IS NOT NULL AND c.branch_id = cb.id;
  END IF;
END $$;

-- 5) B2B referrals: prefer company client, then branch
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='b2b_referrals'
  ) THEN
    -- via company
    UPDATE public.b2b_referrals r
    SET client_id = c.client_id
    FROM public.b2b_companies c
    WHERE r.client_id IS NULL AND r.company_id = c.id AND c.client_id IS NOT NULL;

    -- via branch (fallback)
    UPDATE public.b2b_referrals r
    SET client_id = cb.client_id
    FROM public.client_branches cb
    WHERE r.client_id IS NULL AND r.branch_id IS NOT NULL AND r.branch_id = cb.id;
  END IF;
END $$;

-- 6) Property referrals: infer client from branch
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property_referrals'
  ) THEN
    UPDATE public.property_referrals pr
    SET client_id = cb.client_id
    FROM public.client_branches cb
    WHERE pr.client_id IS NULL AND pr.branch_id IS NOT NULL AND pr.branch_id = cb.id;
  END IF;
END $$;

COMMIT;
