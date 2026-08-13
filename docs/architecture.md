# Technical Architecture & Subsystems

This document describes the high-level architecture, data flows, and subsystem boundaries of the Digital PDF Flipbook Publishing Platform.

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Admin CMS Area
        A[Admin Login /admin/login] -->|Supabase Auth| B[Session Token]
        B --> C[Admin Dashboard /admin]
        C --> D[Upload PDF /admin/upload]
        D --> E[PDF.js Client Parsing]
        E -->|Page count & 1st page cover| F[Supabase Storage: pdfs/ & covers/]
        E -->|Metadata insert| G[PostgreSQL documents table]
        C --> H[Edit & Replace PDF /admin/documents/:id]
    end

    subgraph Storage & Database Layer
        F --> I[(Supabase Storage Buckets)]
        G --> J[(PostgreSQL DB + RLS)]
    end

    subgraph Public Reader Area
        K[Public Visitor /view/:slug] --> L{Fetch Metadata by Slug}
        L -->|Verify status = published| M[Download PDF from Storage]
        M --> N[PDF.js Vector Engine]
        N --> O[PageFlip 3D Engine]
        O --> P[Interactive Controls & Gestures]
        K --> Q[Track Session View]
        R[Public Library /documents] --> S[Browse Published Catalog]
    end
```

---

## 2. Core Subsystems

### Admin Publishing CMS (`/admin`)
- **Authentication**: Managed via Supabase Auth (`signInWithPassword`, persistent JWT tokens).
- **Authorization**: Server & client guard (`isUserAdmin`) checking email whitelists and RLS role policies.
- **Upload Pipeline**: Client-side parsing using `pdfjs-dist` to extract total page count and generate a first-page `.webp` cover image thumbnail prior to network transmission.
- **Document Management**: CRUD interface allowing metadata updates, publication state toggling (`published` vs `draft`), PDF replacement while keeping stable URL slugs, and safe deletion.

### Public Reader Platform (`/view/[slug]`)
- **Zero Login Requirement**: Public visitors require no account or authentication tokens.
- **Stable URL Routing**: Human-readable unique slugs (e.g., `/view/annual-report-2026`).
- **Vector PDF Rendering**: Client-side PDF page rendering using HTML5 Canvas scaled to `window.devicePixelRatio` for retina clarity.
- **3D PageFlip Engine**: Realistic page curling animations, dual-page desktop spread, single-page mobile layout, corner fold shadows, and reduced motion fallbacks.
- **Session View Tracking**: Session-debounced counter invoking PostgreSQL stored procedures (`increment_document_views`).
