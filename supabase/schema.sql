-- =========================================================
-- PDF Flipbook Publishing Platform - PostgreSQL Schema
-- =========================================================

-- 1. Enable UUID Extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Documents Table Definition
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    author TEXT,
    category TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    page_count INTEGER NOT NULL DEFAULT 0,
    cover_image_path TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Indexes for High-Performance Queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_slug ON public.documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);

-- 4. Stored Procedure for Session-Debounced View Tracking
CREATE OR REPLACE FUNCTION public.increment_document_views(doc_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.documents
    SET view_count = view_count + 1
    WHERE slug = doc_slug AND status = 'published';
END;
$$;

-- 5. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Row Level Security (RLS) Setup
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public visitors can view published documents only
CREATE POLICY "Public Read Published Documents"
ON public.documents
FOR SELECT
TO public
USING (status = 'published');

-- Policy 2: Authenticated Users (Admins) can view all documents
CREATE POLICY "Admin Select All Documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Authenticated Users (Admins) can insert documents
CREATE POLICY "Admin Insert Documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 4: Authenticated Users (Admins) can update documents
CREATE POLICY "Admin Update Documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 5: Authenticated Users (Admins) can delete documents
CREATE POLICY "Admin Delete Documents"
ON public.documents
FOR DELETE
TO authenticated
USING (true);

-- =========================================================
-- Storage Buckets Configuration & Storage RLS Policies
-- =========================================================

-- Create Storage Buckets (run through Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'pdfs' bucket
CREATE POLICY "Public Read PDFs Storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pdfs');

CREATE POLICY "Admin Insert PDFs Storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Admin Update PDFs Storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs');

CREATE POLICY "Admin Delete PDFs Storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs');

-- Storage Policies for 'covers' bucket
CREATE POLICY "Public Read Covers Storage"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');

CREATE POLICY "Admin Insert Covers Storage"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

CREATE POLICY "Admin Update Covers Storage"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'covers');

CREATE POLICY "Admin Delete Covers Storage"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers');
