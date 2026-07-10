# Authentication Database Design

## Scope
This design covers only the Authentication module for the Internship Management System.

Tables:
- users
- profiles
- refresh_tokens
- login_histories

## ERD Text

```text
users (1) ─── (1) profiles
   |
   | 1
   ├── (N) refresh_tokens
   |
   └── (N) login_histories
```

## Table Responsibilities

### users
Stores account identity, login credentials, role, and account status.

### profiles
Stores personal profile data and uploaded asset metadata such as avatar and CV.

### refresh_tokens
Stores hashed refresh tokens used for JWT session renewal and logout revocation.

### login_histories
Stores login session history including success, failure, logout time, IP address, and user agent.

## Relationship Summary

- Each user has exactly one profile record.
- Each user can have many refresh tokens over time.
- Each user can have many login history records.
- Deleting a user should cascade to profile, refresh tokens, and login histories.

## Design Notes

- `users.role` supports `STUDENT`, `ENTERPRISE`, and `ADMIN`.
- Avatar and CV files are stored in S3; database stores only URL, S3 key, and metadata.
- Passwords are stored as hashes only, never in plain text.
- Refresh tokens are stored as hashes, not raw token values.
- Soft delete is supported on every table via `deleted_at`.
