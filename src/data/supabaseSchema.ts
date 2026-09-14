// Supabase SQL Schema for Obsidian Vault
import { SUPABASE_URL, STORAGE_BUCKET, ADMIN_EMAIL } from '../utils/supabase';

const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

export const POSTGRES_SCHEMA_SQL = `-- =========================================================
-- OBSIDIAN VAULT - SUPABASE DATABASE SCHEMA & POLICIES
-- Project: Obsidian Vault (${projectRef})
-- Storage Bucket: ${STORAGE_BUCKET}
-- Admin Email: ${ADMIN_EMAIL}
-- =========================================================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.vault_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Folder',
  parent_id TEXT DEFAULT NULL,
  color TEXT DEFAULT '#38bdf8',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Tags Table
CREATE TABLE IF NOT EXISTS public.vault_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#38bdf8',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Media Items Table
CREATE TABLE IF NOT EXISTS public.vault_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'web',
  thumbnail_url TEXT DEFAULT '',
  media_url TEXT DEFAULT '',
  embed_type TEXT DEFAULT 'none',
  embed_id TEXT DEFAULT '',
  category_id TEXT DEFAULT 'tech',
  tags TEXT[] DEFAULT '{}',
  site_name TEXT DEFAULT '',
  favicon TEXT DEFAULT '',
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'url',
  file_name TEXT DEFAULT '',
  file_size TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT ''
);

-- 4. Create Comments Table
CREATE TABLE IF NOT EXISTS public.vault_comments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  author_email TEXT DEFAULT '',
  is_google_user BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  likes INT DEFAULT 0
);

-- 5. Create System & Visual Config Table
CREATE TABLE IF NOT EXISTS public.vault_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  vault_name TEXT DEFAULT 'Obsidian Vault',
  vault_tagline TEXT DEFAULT 'Ultra-fast, luxury cyber-dark link and media repository',
  allow_guest_comments BOOLEAN DEFAULT true,
  logo_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  banner_bg_url TEXT DEFAULT '',
  banner_title TEXT DEFAULT 'OBSIDIAN VAULT',
  banner_subtitle TEXT DEFAULT 'Ultra-fast, luxury cyber-dark link and media repository',
  banner_badge TEXT DEFAULT 'คลังไซเบอร์ความเร็วสูง',
  banner_overlay_opacity NUMERIC DEFAULT 0.75,
  show_banner BOOLEAN DEFAULT true,
  banner_slides JSONB DEFAULT '[]'::jsonb,
  banner_auto_slide BOOLEAN DEFAULT true,
  banner_slide_interval INT DEFAULT 5,
  banner_transition TEXT DEFAULT 'slide',
  banner_height TEXT DEFAULT 'standard',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure extended columns exist if table was previously created
ALTER TABLE public.vault_config ADD COLUMN IF NOT EXISTS banner_slides JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vault_config ADD COLUMN IF NOT EXISTS banner_auto_slide BOOLEAN DEFAULT true;
ALTER TABLE public.vault_config ADD COLUMN IF NOT EXISTS banner_slide_interval INT DEFAULT 5;
ALTER TABLE public.vault_config ADD COLUMN IF NOT EXISTS banner_transition TEXT DEFAULT 'slide';
ALTER TABLE public.vault_config ADD COLUMN IF NOT EXISTS banner_height TEXT DEFAULT 'standard';

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.vault_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_config ENABLE ROW LEVEL SECURITY;

-- 7. Setup RLS Policies (Allow Read for everyone; Write restricted to verified Admin)
CREATE OR REPLACE FUNCTION public.is_vault_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (lower(coalesce(auth.jwt() ->> 'email', '')) = lower('${ADMIN_EMAIL}'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Public Read Categories" ON public.vault_categories;
CREATE POLICY "Public Read Categories" ON public.vault_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Categories" ON public.vault_categories;
DROP POLICY IF EXISTS "Public Write Categories" ON public.vault_categories;
CREATE POLICY "Admin Write Categories" ON public.vault_categories FOR ALL 
  USING (public.is_vault_admin()) WITH CHECK (public.is_vault_admin());

DROP POLICY IF EXISTS "Public Read Tags" ON public.vault_tags;
CREATE POLICY "Public Read Tags" ON public.vault_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Tags" ON public.vault_tags;
DROP POLICY IF EXISTS "Public Write Tags" ON public.vault_tags;
CREATE POLICY "Admin Write Tags" ON public.vault_tags FOR ALL 
  USING (public.is_vault_admin()) WITH CHECK (public.is_vault_admin());

DROP POLICY IF EXISTS "Public Read Config" ON public.vault_config;
CREATE POLICY "Public Read Config" ON public.vault_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Config" ON public.vault_config;
DROP POLICY IF EXISTS "Allow Write Config" ON public.vault_config;
CREATE POLICY "Allow Write Config" ON public.vault_config FOR ALL 
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Items" ON public.vault_items;
CREATE POLICY "Public Read Items" ON public.vault_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Items" ON public.vault_items;
DROP POLICY IF EXISTS "Public Write Items" ON public.vault_items;
CREATE POLICY "Admin Write Items" ON public.vault_items FOR ALL 
  USING (public.is_vault_admin()) WITH CHECK (public.is_vault_admin());

DROP POLICY IF EXISTS "Public Read Comments" ON public.vault_comments;
CREATE POLICY "Public Read Comments" ON public.vault_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Comments" ON public.vault_comments;
DROP POLICY IF EXISTS "Public Write Comments" ON public.vault_comments;
CREATE POLICY "Public Insert Comments" ON public.vault_comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Delete Comments" ON public.vault_comments;
CREATE POLICY "Admin Delete Comments" ON public.vault_comments FOR DELETE 
  USING (public.is_vault_admin() OR lower(coalesce(auth.jwt() ->> 'email', '')) = lower(author_email));

-- Storage Bucket Setup for 'vault-media'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('${STORAGE_BUCKET}', '${STORAGE_BUCKET}', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for 'vault-media' (Allow public read & verified uploads)
DROP POLICY IF EXISTS "Public Access vault-media" ON storage.objects;
CREATE POLICY "Public Access vault-media" ON storage.objects
FOR SELECT USING (bucket_id = '${STORAGE_BUCKET}');

DROP POLICY IF EXISTS "Admin Upload vault-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload vault-media" ON storage.objects;
CREATE POLICY "Public Upload vault-media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = '${STORAGE_BUCKET}');

DROP POLICY IF EXISTS "Admin Update vault-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Update vault-media" ON storage.objects;
CREATE POLICY "Public Update vault-media" ON storage.objects
FOR UPDATE USING (bucket_id = '${STORAGE_BUCKET}');

DROP POLICY IF EXISTS "Admin Delete vault-media" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete vault-media" ON storage.objects;
CREATE POLICY "Admin Delete vault-media" ON storage.objects
FOR DELETE USING (bucket_id = '${STORAGE_BUCKET}');

-- 8. Seed Initial Default Categories
INSERT INTO public.vault_categories (id, name, slug, description, icon, color)
VALUES 
  ('ai-machine-learning', 'AI & Machine Learning', 'ai-machine-learning', 'LLMs, Neural Networks, Agents & Prompts', 'Sparkles', '#06b6d4'),
  ('dev-engineering', 'Dev & Engineering', 'dev-engineering', 'Frontend, Backend, Rust, Go & Architecture', 'Code2', '#3b82f6'),
  ('design-uiux', 'Design & UI/UX', 'design-uiux', 'Typography, Design Systems, Shaders & Cyber Aesthetics', 'Palette', '#a855f7'),
  ('media-audio-video', 'Media & Soundscapes', 'media-audio-video', 'Synthesizers, Ambient Video, Film & Audio Archives', 'Film', '#ec4899'),
  ('cybersec-crypto', 'Cybersec & Web3', 'cybersec-crypto', 'Cryptography, Privacy Protocols & Zero Knowledge', 'ShieldCheck', '#10b981'),
  ('reading-vault', 'Curated Archive', 'reading-vault', 'Deep Reads, Whitepapers & Technical Essays', 'BookMarked', '#f59e0b')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Initial Default Tags
INSERT INTO public.vault_tags (id, name, color)
VALUES
  ('tag-1', 'AI', '#06b6d4'),
  ('tag-2', 'Vite', '#8b5cf6'),
  ('tag-3', 'React', '#38bdf8'),
  ('tag-4', 'Cyberpunk', '#ec4899'),
  ('tag-5', 'Audio', '#10b981'),
  ('tag-6', 'Video', '#f97316'),
  ('tag-7', 'Design', '#eab308'),
  ('tag-8', 'Security', '#64748b')
ON CONFLICT (id) DO NOTHING;
`;
