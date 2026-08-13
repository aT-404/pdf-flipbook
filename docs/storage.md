# Storage Bucket Architecture & RLS Security

PDF files and cover thumbnail images are stored in dedicated Supabase Storage buckets. Binary data is never stored directly inside PostgreSQL.

---

## 1. Bucket Structure

```text
storage/
├── pdfs/                       # PDF documents bucket
│   └── document-id/
│       └── original.pdf
└── covers/                     # Extracted thumbnail cover images bucket
    └── document-id/
        └── cover.webp
```

---

## 2. Storage Bucket Policies

### `pdfs` Bucket

- **Public Access**: `SELECT` enabled for all users.
- **Admin Access**: `INSERT`, `UPDATE`, `DELETE` restricted to `authenticated` admin users.

### `covers` Bucket

- **Public Access**: `SELECT` enabled for all users.
- **Admin Access**: `INSERT`, `UPDATE`, `DELETE` restricted to `authenticated` admin users.
