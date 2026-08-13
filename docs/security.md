# Security Architecture & Access Control Matrix

This document details the security policies, authentication mechanisms, authorization rules, database Row Level Security (RLS), and file upload validation.

---

## 1. Authentication vs. Authorization Definition

```text
Authentication (Who are you?)
    = Verified via Supabase Auth (JWT session tokens stored in secure cookies/localStorage)

Authorization (What are you allowed to do?)
    = Enforced via Next.js Server Route Proxy (src/proxy.ts), AuthContext roles (isUserAdmin), 
      and PostgreSQL Row Level Security (RLS) policies
```

---

## 2. Multi-Layer Security Architecture

```text
Incoming HTTP Request
      │
      ▼
Layer 1: Next.js Server Route Proxy (src/proxy.ts)
      │ Guards /admin/* routes before server rendering
      ▼
Layer 2: Client AuthContext & Admin Role Guard (isUserAdmin)
      │ Verifies user.email against NEXT_PUBLIC_ADMIN_EMAILS & app_metadata.role
      ▼
Layer 3: Supabase PostgreSQL Row Level Security (RLS)
      │ Enforces database query permissions at the database engine level
      ▼
Layer 4: Supabase Storage Bucket Access Policies
      │ Restricts PDF & Cover uploads/edits/deletions to authenticated admins
```

---

## 3. Detailed Access Control Matrix

| Action / Route | Public Visitor | Authenticated Admin | Primary Enforcement Layer |
| :--- | :--- | :--- | :--- |
| **View Published Flipbook** (`/view/[slug]`) | ✅ Allowed | ✅ Allowed | RLS (`status = 'published'`) |
| **View Draft Document** | ❌ Blocked (404) | ✅ Allowed | App Route + DB RLS |
| **Browse Public Library** (`/documents`) | ✅ Allowed | ✅ Allowed | DB RLS (`status = 'published'`) |
| **Admin Login** (`/admin/login`) | ✅ Allowed | ✅ Allowed | Supabase Auth API |
| **Access Dashboard** (`/admin`) | ❌ Redirected | ✅ Allowed | Server Proxy + AuthContext |
| **Upload PDF** (`/admin/upload`) | ❌ Blocked | ✅ Allowed | Storage Policy + DB RLS |
| **Replace PDF** (`/admin/documents/[id]`) | ❌ Blocked | ✅ Allowed | Storage Policy + DB RLS |
| **Delete Document** | ❌ Blocked | ✅ Allowed | Storage Policy + DB RLS |

---

## 4. PDF Upload Security & File Validation

1. **Magic Bytes Validation**: Uploaded files are validated in binary before network transmission by inspecting the header magic bytes (`%PDF-` / `[0x25, 0x50, 0x44, 0x46, 0x2D]`). Renamed non-PDF binaries or empty files are rejected.
2. **File Size Limit**: Strict 50MB client and storage bucket payload validation.
3. **Filename Sanitization**: Storage paths sanitize filenames (`replace(/[^a-zA-Z0-9.-]/g, '_')`) to prevent directory traversal attacks.

---

## 5. Secret Key Handling & Environment Security

1. **Service Role Keys**: The Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) is **NEVER** included in client-side bundles or `NEXT_PUBLIC_` environment variables.
2. **Anon Key Scope**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is constrained entirely by Row Level Security (RLS) policies.
3. **Draft Privacy**: Unpublished or draft documents return generic 404 responses to public visitors to prevent publication enumeration attacks.
