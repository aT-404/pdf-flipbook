# Production Deployment Guide & Checklist

This guide provides the complete step-by-step procedure for initializing Supabase and deploying the Next.js application to production (Vercel / Netlify / Self-Hosted Node.js).

---

## Step-by-Step Production Setup Procedure

### 1. Create Supabase Project
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Set a strong database password and select your preferred region.

### 2. Configure Database Schema
1. In your Supabase Dashboard, navigate to **SQL Editor** -> **New Query**.
2. Open `supabase/schema.sql` from the repository and paste the complete script into the SQL editor.
3. Click **Run** to create the `documents` table, indexes, updated_at trigger, and `increment_document_views` stored procedure.

### 3. Verify Database RLS Policies
1. In Supabase Dashboard, go to **Authentication** -> **Policies**.
2. Verify that Row Level Security (RLS) is enabled for the `public.documents` table with:
   - `Public Read Published Documents` (`status = 'published'`)
   - `Admin Select All Documents`, `Admin Insert`, `Admin Update`, `Admin Delete` (restricted to `authenticated` admins).

### 4. Configure Storage Buckets
1. In Supabase Dashboard, go to **Storage** -> **Buckets**.
2. Ensure two public buckets are created:
   - `pdfs` (Public Read, Admin Write)
   - `covers` (Public Read, Admin Write)
3. Verify storage access policies match `supabase/schema.sql`.

### 5. Create First Admin Account
1. In Supabase Dashboard, go to **Authentication** -> **Users** -> **Add User** -> **Create User**.
2. Enter your primary admin email address (e.g., `admin@example.com`) and a strong password.
3. Note down the admin email address for the environment configuration.

### 6. Configure Environment Variables
Set the following environment variables in your hosting provider settings (e.g., Vercel Project Settings -> Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com
```

### 7. Build and Deploy Next.js Application
1. Connect your repository to Vercel/Netlify.
2. Build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. Trigger production deployment.

### 8. Configure Custom Domain & SSL
1. In your hosting dashboard, add your custom domain (e.g., `flipbook.yourdomain.com`).
2. Update DNS CNAME / A records as instructed by your hosting provider.
3. Verify automated SSL certificate issuance.

### 9. Test Admin Login & Management
1. Navigate to `https://flipbook.yourdomain.com/admin/login`.
2. Sign in with your admin credentials.
3. Verify access to `/admin` dashboard.

### 10. Test PDF Upload & Storage Connectivity
1. Navigate to `/admin/upload`.
2. Upload a sample PDF document.
3. Verify client PDF.js parsing, first-page cover thumbnail extraction, and successful storage upload to Supabase `pdfs` and `covers` buckets.

### 11. Test Public Flipbook Viewer
1. Copy the generated public URL (e.g., `https://flipbook.yourdomain.com/view/document-slug`).
2. Open the URL in an unauthenticated browser window / Incognito.
3. Verify vector rendering, 3D page flip animation, navigation toolbar, zoom, fullscreen, thumbnails drawer, and share modal.

### 12. Test PDF Replacement & Unpublishing
1. In Admin Dashboard, edit document -> **Replace PDF** with an updated PDF file.
2. Verify public URL slug remains unchanged and loads the new PDF.
3. Toggle document to **Draft** -> verify public URL returns clean 404 error page.
4. Toggle back to **Published** -> verify document is accessible again.

---

## Production Deployment Checklist

- [ ] Supabase PostgreSQL database initialized via `supabase/schema.sql`
- [ ] Storage buckets `pdfs` and `covers` created with public read policies
- [ ] Row Level Security (RLS) policies verified active
- [ ] Primary admin user created in Supabase Auth
- [ ] Production environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_EMAILS`) set
- [ ] Custom domain & SSL HTTPS active
- [ ] Admin route proxy protection (`src/proxy.ts`) verified
- [ ] Public viewer loads published flipbooks without authentication
