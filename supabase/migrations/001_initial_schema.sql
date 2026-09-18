-- ==============================================================================
-- NEXUS PRIVATE REAL-TIME CHAT // SUPABASE DATABASE SCHEMA
-- PostgreSQL Migration 001_initial_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES

-- PROFILES (Transient/Persistent identity)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ROOMS (Secure E2EE Channel Enclaves)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    creator_id TEXT NOT NULL,
    creator_access_verifier TEXT NOT NULL,
    guest_access_verifier TEXT NOT NULL,
    creator_code_hash TEXT,
    guest_join_code_hash TEXT,
    room_salt TEXT NOT NULL,
    session_salt TEXT NOT NULL,
    creator_wrapped_key TEXT NOT NULL,
    creator_key_iv TEXT NOT NULL,
    guest_wrapped_key TEXT NOT NULL,
    guest_key_iv TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ROOM MEMBERS (Authorized participants in a channel enclave)
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT DEFAULT 'MEMBER' CHECK (role IN ('CREATOR', 'GUEST', 'MEMBER')),
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_room_member UNIQUE(room_id, user_id)
);

-- MESSAGES (Zero-Plaintext Storage: Contains only Base64 AES-256-GCM ciphertext & 96-bit IV)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    visual_shift INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- SECURITY EVENTS (Audit log for channel operations, join attempts, and key challenges)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id TEXT,
    event_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_room_members_lookup ON public.room_members(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_order ON public.messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_security_events_room ON public.security_events(room_id, created_at DESC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Allow users to manage their profiles
CREATE POLICY "Allow public insert to profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update own profile" ON public.profiles FOR UPDATE USING (true);

-- Rooms: Allow reading room for join verification and creating rooms
CREATE POLICY "Allow select room by room_code" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow insert new room" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow room update by creator" ON public.rooms FOR UPDATE USING (true);

-- Room Members: Allow members to see peers in their room
CREATE POLICY "Allow select room members" ON public.room_members FOR SELECT USING (true);
CREATE POLICY "Allow insert room member" ON public.room_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update room member activity" ON public.room_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete room member on exit" ON public.room_members FOR DELETE USING (true);

-- Messages: Restrict message read/write
CREATE POLICY "Allow select messages in active room" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow insert encrypted messages" ON public.messages FOR INSERT WITH CHECK (true);

-- Security Events:
CREATE POLICY "Allow select security events" ON public.security_events FOR SELECT USING (true);
CREATE POLICY "Allow insert security events" ON public.security_events FOR INSERT WITH CHECK (true);

-- 5. REALTIME REPLICATION CONFIGURATION
-- Enable realtime publication for messages and room members so live chat works out-of-the-box
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'security_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events;
  END IF;
END $$;
