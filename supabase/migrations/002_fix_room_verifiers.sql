-- ==============================================================================
-- NEXUS PRIVATE REAL-TIME CHAT // MIGRATION 002
-- Align room authorization columns and session salt
-- ==============================================================================

DO $$
BEGIN
  -- Add creator_access_verifier if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'creator_access_verifier'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN creator_access_verifier TEXT;
    UPDATE public.rooms SET creator_access_verifier = creator_code_hash WHERE creator_access_verifier IS NULL AND creator_code_hash IS NOT NULL;
  END IF;

  -- Add guest_access_verifier if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'guest_access_verifier'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN guest_access_verifier TEXT;
    UPDATE public.rooms SET guest_access_verifier = guest_join_code_hash WHERE guest_access_verifier IS NULL AND guest_join_code_hash IS NOT NULL;
  END IF;

  -- Add session_salt if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'session_salt'
  ) THEN
    ALTER TABLE public.rooms ADD COLUMN session_salt TEXT;
    UPDATE public.rooms SET session_salt = room_salt WHERE session_salt IS NULL;
  END IF;
END $$;
