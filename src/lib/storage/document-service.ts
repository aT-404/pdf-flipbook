import { getSupabaseClient } from '../supabase/client';
import { Document, CreateDocumentInput, UpdateDocumentInput } from '@/types';

export const BUCKET_PDFS = 'pdfs';
export const BUCKET_COVERS = 'covers';

/**
 * Fetch all published documents for public consumption
 */
export async function fetchPublishedDocuments(): Promise<Document[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching published documents:', error);
    throw new Error(error.message);
  }

  return (data as Document[]) || [];
}

/**
 * Fetch a single published document by its public URL slug
 */
export async function fetchDocumentBySlug(slug: string): Promise<Document | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Document;
}

/**
 * Fetch all documents (Drafts, Published, Archived) for Admin Dashboard
 */
export async function fetchAllDocumentsAdmin(): Promise<Document[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin documents:', error);
    throw new Error(error.message);
  }

  return (data as Document[]) || [];
}

/**
 * Fetch a single document by ID for Admin Edit page
 */
export async function fetchDocumentByIdAdmin(id: string): Promise<Document | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Document;
}

/**
 * Upload PDF File and Cover Image to Storage, and insert record into PostgreSQL
 */
export async function createDocumentWithFiles({
  pdfFile,
  coverBlob,
  input,
}: {
  pdfFile: File;
  coverBlob?: Blob | null;
  input: CreateDocumentInput;
}): Promise<Document> {
  const supabase = getSupabaseClient();

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Admin login required to upload documents.');
  }

  // 2. Generate unique document ID
  const documentId = crypto.randomUUID();
  const pdfStoragePath = `pdfs/${documentId}/${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // 3. Upload PDF file to 'pdfs' storage bucket
  const { error: pdfUploadError } = await supabase.storage
    .from(BUCKET_PDFS)
    .upload(pdfStoragePath, pdfFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (pdfUploadError) {
    console.error('PDF storage upload failed:', pdfUploadError);
    throw new Error(`PDF upload failed: ${pdfUploadError.message}`);
  }

  // 4. Upload Cover Image to 'covers' bucket if provided
  let coverStoragePath: string | null = null;

  if (coverBlob) {
    const coverPath = `covers/${documentId}/cover.webp`;
    const { error: coverUploadError } = await supabase.storage
      .from(BUCKET_COVERS)
      .upload(coverPath, coverBlob, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true,
      });

    if (!coverUploadError) {
      coverStoragePath = coverPath;
    }
  }

  // 5. Insert row into PostgreSQL 'documents' table
  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      title: input.title,
      slug: input.slug,
      description: input.description || null,
      author: input.author || null,
      category: input.category || null,
      file_path: pdfStoragePath,
      file_size: input.file_size,
      page_count: input.page_count,
      cover_image_path: coverStoragePath || input.cover_image_path || null,
      status: input.status || 'published',
      published_at: input.status === 'published' ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database insert error:', dbError);
    // Cleanup storage file on database error
    await supabase.storage.from(BUCKET_PDFS).remove([pdfStoragePath]);
    throw new Error(`Database error: ${dbError.message}`);
  }

  return data as Document;
}

/**
 * Update Document Metadata
 */
export async function updateDocumentMetadata(
  id: string,
  updates: UpdateDocumentInput
): Promise<Document> {
  const supabase = getSupabaseClient();

  const payload: Record<string, any> = { ...updates };
  if (updates.status === 'published') {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating document:', error);
    throw new Error(error.message);
  }

  return data as Document;
}

/**
 * Replace existing PDF File while preserving the exact same public URL slug
 */
export async function replaceDocumentPdf({
  id,
  pdfFile,
  pageSize,
  pageCount,
  newCoverBlob,
}: {
  id: string;
  pdfFile: File;
  pageSize: number;
  pageCount: number;
  newCoverBlob?: Blob | null;
}): Promise<Document> {
  const supabase = getSupabaseClient();

  // 1. Fetch current document details
  const currentDoc = await fetchDocumentByIdAdmin(id);
  if (!currentDoc) {
    throw new Error('Document not found');
  }

  // 2. Upload new PDF file over existing storage path or new path under id
  const pdfStoragePath = `pdfs/${id}/${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_PDFS)
    .upload(pdfStoragePath, pdfFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload replacement PDF: ${uploadError.message}`);
  }

  // 3. Upload new cover image if extracted
  let coverStoragePath = currentDoc.cover_image_path;

  if (newCoverBlob) {
    const coverPath = `covers/${id}/cover.webp`;
    const { error: coverErr } = await supabase.storage
      .from(BUCKET_COVERS)
      .upload(coverPath, newCoverBlob, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true,
      });

    if (!coverErr) {
      coverStoragePath = coverPath;
    }
  }

  // 4. Update database document record (leaving slug UNCHANGED)
  const { data, error: dbError } = await supabase
    .from('documents')
    .update({
      file_path: pdfStoragePath,
      file_size: pageSize,
      page_count: pageCount,
      cover_image_path: coverStoragePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (dbError) {
    throw new Error(`Failed to update database record: ${dbError.message}`);
  }

  return data as Document;
}

/**
 * Permanently Delete Document and its Storage Assets
 */
export async function deleteDocument(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  // 1. Fetch document to get file paths
  const doc = await fetchDocumentByIdAdmin(id);
  if (!doc) return;

  // 2. Delete database record
  const { error: dbError } = await supabase.from('documents').delete().eq('id', id);

  if (dbError) {
    throw new Error(`Failed to delete document record: ${dbError.message}`);
  }

  // 3. Delete storage files
  if (doc.file_path) {
    await supabase.storage.from(BUCKET_PDFS).remove([doc.file_path]);
  }
  if (doc.cover_image_path) {
    await supabase.storage.from(BUCKET_COVERS).remove([doc.cover_image_path]);
  }
}

/**
 * Session-Debounced View Count Increment
 */
export async function incrementDocumentViews(slug: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Session check to prevent spamming view count on page refresh / page turns
  const sessionKey = `viewed_doc_${slug}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
    return;
  }

  try {
    const { error } = await supabase.rpc('increment_document_views', { doc_slug: slug });
    if (error) {
      // Fallback: direct update if RPC function isn't created
      const doc = await fetchDocumentBySlug(slug);
      if (doc) {
        await supabase
          .from('documents')
          .update({ view_count: (doc.view_count || 0) + 1 })
          .eq('slug', slug);
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, 'true');
    }
  } catch (err) {
    console.error('Error incrementing view count:', err);
  }
}

/**
 * Get Public Download / Display URL for Storage Path
 */
export function getPublicStorageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
