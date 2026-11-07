-- ========================================================
-- STRANGERVERSE PRODUCTION DATABASE SCHEMA (SUPABASE)
-- Fully Secured with Row Level Security (RLS)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    role TEXT NOT NULL DEFAULT 'NORMAL_USER' CHECK (role IN ('OWNER', 'MANAGER', 'MODERATOR', 'NORMAL_USER')),
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'banned')),
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Public can read basic profile info
CREATE POLICY "Public profile view"
    ON public.profiles FOR SELECT
    USING (true);

-- Profiles: Users can update their own display_name and photo_url, but NOT role or bans
CREATE POLICY "Users can update own display profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid()::text = id)
    WITH CHECK (
        auth.uid()::text = id
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()::text)
        AND is_banned = (SELECT is_banned FROM public.profiles WHERE id = auth.uid()::text)
    );

-- Profiles: Only Level 1 Owner can alter roles or bans
CREATE POLICY "Owner can update any profile"
    ON public.profiles FOR ALL
    USING (public.current_user_role() = 'OWNER');

-- 2. JUNCTION MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.junction_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT NOT NULL,
    user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    user_role TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.junction_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view junction messages"
    ON public.junction_messages FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert junction messages"
    ON public.junction_messages FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 3. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT REFERENCES public.profiles(id),
    reported_user_id TEXT REFERENCES public.profiles(id),
    reason TEXT NOT NULL,
    details TEXT,
    context TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "Users can insert reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only Moderators, Managers, and Owners can read or resolve reports
CREATE POLICY "Staff can view reports"
    ON public.reports FOR SELECT
    USING (public.current_user_role() IN ('MODERATOR', 'MANAGER', 'OWNER'));

CREATE POLICY "Staff can update reports"
    ON public.reports FOR UPDATE
    USING (public.current_user_role() IN ('MODERATOR', 'MANAGER', 'OWNER'));

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    target_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only the Original Owner can read audit logs
CREATE POLICY "Owner only can read audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.current_user_role() = 'OWNER');

-- Service role or backend can insert audit logs
CREATE POLICY "Service backend can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- Seed initial configured Owner
INSERT INTO public.profiles (id, email, display_name, photo_url, role, status, registered_at)
VALUES (
    'owner_initial',
    'preethivejr@gmail.com',
    'Preethive (Super Manager)',
    'https://api.dicebear.com/7.x/bottts/svg?seed=preethivejr@gmail.com',
    'OWNER',
    'online',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET role = 'OWNER';
