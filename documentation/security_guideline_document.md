# EPOP Platform Starter Security Guidelines

## 1. Overview and Scope
This document outlines the security best practices, controls, and configurations for the EPOP Platform Starter—a full-stack Next.js 15 boilerplate with TypeScript, Drizzle ORM, Socket.IO, Redis, MinIO, Vercel AI SDK, shadcn/ui, and Tailwind CSS. It applies to all phases of development, testing, and production deployment.

Key goals:
- Embed security by design and defense in depth.
- Enforce least privilege across users, services, and data.
- Protect confidentiality, integrity, and availability of user and system data.

## 2. Core Security Principles
1. **Security by Design**: Integrate threat modeling and secure coding from day one.
2. **Least Privilege**: Grant minimal roles/permissions (DB user, AWS/MinIO credentials, Redis ACLs).
3. **Defense in Depth**: Combine network, application, and data layer protections.
4. **Input Validation & Output Encoding**: Use Zod schemas and context-aware escaping.
5. **Fail Securely**: Default to safe failure modes, hide stack traces and internal errors.
6. **Secure Defaults**: Ship with restrictive CORS, CSP, cookie flags, and TLS only.

## 3. Authentication & Access Control
### 3.1 Strong Password Policies
- Enforce minimum length (≥ 12 characters), complexity classes, and rotation as needed.
- Hash passwords with Argon2 or bcrypt + unique salts (via Better Auth internals).

### 3.2 JWT & Session Management
- Use `HS256` or `RS256` only; disallow the `none` algorithm.
- Validate `exp`, `iat`, and `aud` claims on every request.
- Store refresh tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
- Implement idle (e.g., 15 min) and absolute session timeouts.
- On logout or password change, revoke tokens (rotate signing key or keep revocation list).

### 3.3 Multi-Factor Authentication (MFA)
- Optional MFA via TOTP or SMS for high-privilege accounts (admin panel).

### 3.4 Role-Based Access Control (RBAC)
- Define roles (e.g., `user`, `moderator`, `admin`) and map permissions in code.
- Enforce authorization server-side on every API and page route via `auth-middleware.ts`.

## 4. Input Handling & Injection Prevention
- Use Zod for all API inputs; reject or sanitize any unexpected fields.
- Access the database only through Drizzle ORM’s parameterized queries.
- Never interpolate user data into raw SQL or shell commands.
- Sanitize and encode user-supplied HTML/markdown for UI rendering.
- Validate redirect URLs against a safe-list to prevent open redirect.

## 5. Cross-Site Scripting (XSS) & Content Security Policy (CSP)
- Apply context-aware encoding for data injected into JSX.
- Enable a strict CSP header:
  ```
  Content-Security-Policy: default-src 'self';
    script-src 'self' 'nonce-{{nonce}}';
    style-src 'self' 'nonce-{{nonce}}' https://cdn.jsdelivr.net;
    img-src 'self' data: https://*.minio.example.com;
    connect-src 'self' https://api.example.com wss://socket.example.com;
  ```
- Use Subresource Integrity (SRI) for CDN scripts.

## 6. CSRF Protection
- Implement anti-CSRF tokens (synchronizer token pattern) on all state-changing forms and API routes.
- For JSON APIs using cookies, require a custom header (e.g., `X-CSRF-Token`) with each POST/PUT/DELETE.

## 7. API & Service Security
- Enforce HTTPS with TLS 1.2+; redirect HTTP → HTTPS at edge.
- Restrict CORS to trusted origins:
  ```js
  origin: ['https://app.example.com'],
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
  ```
- Rate-limit per IP and per user (e.g., 100 requests/minute) using Redis or a gateway.
- Version all public APIs (e.g., `/api/v1/...`).
- Return minimal data: avoid exposing internal IDs, stack traces, or PII.

## 8. Data Protection & Privacy
### 8.1 Encryption
- Encrypt all in-transit traffic with TLS 1.2+.
- At rest:
  - Enable PostgreSQL TDE or disk-level encryption.
  - Encrypt backups.

### 8.2 Secrets Management
- Do **not** commit `.env` or credentials.
- Use a vault (HashiCorp, AWS Secrets Manager, etc.) for DB passwords, JWT keys, MinIO creds.
- Rotate secrets periodically and on suspected compromise.

### 8.3 PII Handling
- Mask or hash PII in logs (e.g., emails, IPs).
- Purge or anonymize old user data per GDPR/CCPA.

## 9. File Uploads & MinIO
- Enforce server-side validation on file type (MIME), extension whitelist, and size limits.
- Store outside webroot; serve files via signed URLs that expire (e.g., 5 minutes).
- Scan uploads for malware at ingest.
- Use MinIO’s bucket policies to restrict public access.

## 10. Real-time Communication Security
- Authenticate socket connections using signed JWTs on handshake.
- Authorize event channels by user role and context.
- Use Redis ACLs to restrict pub/sub operations.
- Limit message size and rate to prevent flooding.

## 11. Admin Panel & Privileged Operations
- Enforce RBAC middleware on every admin API and page.
- Log all actions (user creation, role changes, configuration edits) with an audit trail.
- Out-of-band notifications for critical changes (e.g., admin account created).

## 12. Infrastructure & Deployment
- **Docker**:
  - Build images with non-root user.
  - Scan images for vulnerabilities.
- **Server Hardening**:
  - Disable unused ports/services.
  - Enforce firewall rules (DB only accessible from app servers).
- **TLS Configuration**:
  - Use strong ciphers (AES GCM, ECDHE).
  - HSTS with `max-age=31536000; includeSubDomains; preload`.
- **Logging & Monitoring**:
  - Centralize logs (ELK/Splunk).
  - Monitor failed logins, 4xx/5xx spikes, unusual socket events.
  - Alert on suspicious activity.

## 13. Dependency Management
- Maintain `package-lock.json` for deterministic installs.
- Regularly run SCA (e.g., npm audit, Snyk) on dependencies and transitive libs.
- Update critical/security patches within 24 hours of release.
- Remove unused packages to reduce attack surface.

## 14. Testing & Continuous Integration
- Unit tests for utilities, Zod schemas, and auth logic.
- Integration tests for API routes with a test database.
- E2E tests for key user flows (registration, login, file upload, chat).
- Include security tests:
  - SQL injection payloads.
  - XSS scanners.
  - CSRF token validation.
- Fail builds on high‐severity vulnerabilities.

## 15. Continuous Improvement
- Conduct periodic penetration tests and code reviews.
- Update this guideline with emerging threats and best practices.
- Engage in bug bounty or responsible disclosure programs.

---
Adhering to these guidelines will help ensure the EPOP Platform Starter remains secure, maintainable, and compliant with industry standards. Regularly revisit and update controls as the codebase and threat landscape evolve.