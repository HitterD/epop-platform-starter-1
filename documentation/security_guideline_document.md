# EPOP Platform Security Guidelines

This document outlines the security best practices and controls for the Enterprise Platform for Operational Performance (EPOP). By following these guidelines, you ensure the application is designed, developed, and deployed with security at its core.

## 1. Authentication & Access Control

### 1.1 Robust Authentication
- Use **JWTs** for access and refresh tokens. Do not accept `alg: none`. Validate signatures, `exp`, `aud`, and `iss` claims.
- Store **access tokens** in memory or a secure HTTP-only cookie with `SameSite=Strict`; store **refresh tokens** in an HTTP-only, `Secure`, `SameSite=Strict` cookie.
- Enforce strong **password policies** (minimum 12 characters, complexity rules) and hash passwords with **Argon2** or **bcrypt** using unique salts.
- Implement **Multi-Factor Authentication (MFA)** for ADMIN and high-privilege users.

### 1.2 Session Management
- Rotate refresh tokens on use and maintain a revocation list.
- Enforce **idle** and **absolute** session timeouts.
- Provide a secure logout endpoint that invalidates tokens server-side.
- Defend against **session fixation** by regenerating session identifiers on privilege changes.

### 1.3 Role-Based Access Control (RBAC)
- Define roles (e.g., `ADMIN`, `USER`) and assign minimal permissions.
- Perform server-side authorization checks on every protected route and API endpoint.
- Centralize permission logic in a middleware or service layer to avoid duplication.

## 2. Input Handling & Validation

- Treat all incoming data (API, WebSocket messages, file metadata) as untrusted.
- Validate and sanitize inputs using **Zod** schemas at every API route and Socket.IO handler.
- Use **parameterized queries** or **Drizzle ORM** to prevent SQL injection.
- Encode all user-supplied output in HTML contexts using a library like **DOMPurify** to mitigate XSS.
- Reject unvalidated redirects or forwards; maintain an allow-list of safe URLs.

## 3. Real-Time Communication Security

- Serve **Socket.IO** connections only over **WSS** with TLS 1.2+.
- Authenticate WebSocket connections by validating JWTs in the connection handshake.
- Use the **Redis adapter** with ACLs to isolate pub/sub channels per tenant or conversation.
- Rate-limit message events per client to prevent flooding and DoS.

## 4. File Storage & Upload Security

- Validate file types, extensions, and sizes on the server before issuing **MinIO** presigned URLs.
- Store uploaded files **outside the webroot** and serve them via secured presigned URLs only.
- Scan uploaded content for malware (e.g., using ClamAV) before accepting references in messages.
- Enforce least-privilege on MinIO credentials (e.g., a read-only user for downloads).
- Prevent **path traversal** by normalizing and validating object keys.

## 5. Data Protection & Privacy

- Encrypt all traffic with **HTTPS** (TLS 1.2+) and enable **HSTS**.
- Encrypt sensitive data at rest in PostgreSQL (e.g., PII) using **column-level encryption** if needed.
- Never log or expose PII (emails, JWTs, refresh tokens). Mask or redact sensitive fields in logs.
- Use a secrets manager (e.g., **AWS Secrets Manager**, **Vault**) for database credentials, JWT secrets, and third-party API keys.
- Follow applicable data privacy regulations (GDPR, CCPA) for user data handling and consent.

## 6. API & Service Security

- Enforce strict **CORS** policies: allow only trusted origins for browser-based API calls.
- Apply **rate limiting** and **IP throttling** on authentication and messaging endpoints.
- Version your API (e.g., `/api/v1/...`) and maintain backward compatibility carefully.
- Use appropriate HTTP methods (GET, POST, PUT, DELETE) and status codes.
- Sanitize JSON and form-encoded payloads; reject additional unexpected properties.

## 7. Web Application Security Hygiene

- Implement anti-CSRF tokens on all state-changing HTTP endpoints (e.g., using **Double Submit Cookie** or **Synchronizer Token**).
- Configure security headers globally via middleware:
  - `Content-Security-Policy` (restrict scripts, styles)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Mark all session cookies as `HttpOnly`, `Secure`, and `SameSite=Strict`.
- Avoid storing tokens or sensitive data in `localStorage` or `sessionStorage`.
- Use **Subresource Integrity (SRI)** when loading third-party scripts.

## 8. Infrastructure & Configuration Management

- Harden servers: disable unused services, close non-essential ports, and disable directory listings.
- Regularly patch OS, database, and library dependencies.
- Disable debug and verbose error output in production; return generic error messages to clients.
- Use Infrastructure-as-Code (IaC) to enforce consistent, secure configurations across environments.
- Manage environment variables securely and provide a `.env.example` without secrets.

## 9. Dependency Management

- Maintain a lockfile (`package-lock.json`) and perform routine **SCA scans** for vulnerabilities.
- Adopt only actively maintained libraries with a strong security track record.
- Minimize third-party dependencies to reduce the attack surface.
- Apply security updates promptly; monitor CVEs for critical fixes.

## 10. Monitoring, Logging & Incident Response

- Implement **structured logging** (e.g., Pino) with correlation IDs per request and WebSocket message.
- Monitor anomalies such as repeated failed logins, high message rates, or unusual file uploads.
- Enforce alerting for critical events (e.g., token validation failures, suspicious IP access).
- Document an incident response plan, including token revocation and user notification procedures.

---

By adhering to these security guidelines, the EPOP platform will achieve a robust, defense-in-depth posture, ensuring confidentiality, integrity, and availability of user data and services.