# Authentication & Authorization Architecture

This document outlines the security model, session persistence, and role authorization.

---

## 1. Authentication Strategy

- **Admin Portal (`/admin/login`)**: Built on Supabase Auth. Admins authenticate via email and password (`signInWithPassword`).
- **Session Persistence**: Sessions use secure JWT tokens stored in localStorage / cookies and auto-refreshed via Supabase Auth listener (`onAuthStateChange`).
- **Unauthenticated Visitors**: Public document pages (`/view/[slug]`, `/documents`) do not require authentication or user accounts.

---

## 2. Server & Client Authorization Guards

Logged-in status alone does not grant administrative authorization. The system checks:

1. **Email Whitelist**: If `NEXT_PUBLIC_ADMIN_EMAILS` is set, user email must match an authorized admin email address.
2. **Metadata Roles**: Checks `user.app_metadata.role === 'admin'` or `user.user_metadata.is_admin === true`.
3. **Database RLS Policies**: Row Level Security enforces database permission bounds at the PostgreSQL layer.

---

## 3. Row Level Security Policies

| Policy Name | Action | Target Role | Expression / Condition |
| :--- | :--- | :--- | :--- |
| `Public Read Published Documents` | `SELECT` | `public` | `status = 'published'` |
| `Admin Select All Documents` | `SELECT` | `authenticated` | `true` |
| `Admin Insert Documents` | `INSERT` | `authenticated` | `true` |
| `Admin Update Documents` | `UPDATE` | `authenticated` | `true` |
| `Admin Delete Documents` | `DELETE` | `authenticated` | `true` |
