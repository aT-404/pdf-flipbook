export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface Document {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  author: string | null;
  category: string | null;
  file_path: string;
  file_size: number;
  page_count: number;
  cover_image_path: string | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  view_count: number;
  created_by: string | null;
}

export interface CreateDocumentInput {
  title: string;
  slug: string;
  description?: string;
  author?: string;
  category?: string;
  file_path: string;
  file_size: number;
  page_count: number;
  cover_image_path?: string;
  status?: DocumentStatus;
}

export interface UpdateDocumentInput {
  title?: string;
  slug?: string;
  description?: string;
  author?: string;
  category?: string;
  file_path?: string;
  file_size?: number;
  page_count?: number;
  cover_image_path?: string;
  status?: DocumentStatus;
}

export interface FlipbookState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  isFullscreen: boolean;
  isTwoPage: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  missingVars: string[];
}
