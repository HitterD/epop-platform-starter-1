# Project Requirements Document (PRD)

## 1. Project Overview

The **EPOP Platform Starter** is a full-stack boilerplate built on Next.js 15 with its App Router. It provides a ready-made foundation for developing modern, interactive web applications. Right out of the box, you get secure user authentication, real-time communication, AI-driven chat, file storage, and an admin panel—plus a responsive UI styled with Tailwind CSS and shadcn/ui. This starter kit handles the heavy lifting so teams can focus on unique business logic instead of reinventing core features.

We’re building this bundle to accelerate development, enforce best practices, and promote consistency across projects. Key objectives include: 1) shipping a deployable platform with minimal setup, 2) ensuring strong type safety and maintainability via TypeScript and Drizzle ORM, and 3) delivering high-performance, real-time experiences. Success is measured by quick project ramp-up times, low bug counts in core features, and developer satisfaction with the starter template.

---

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0)**
- User authentication flows: registration, login, password reset (Better Auth + JWT).
- PostgreSQL storage with Drizzle ORM for migrations and typed queries.
- Responsive UI components with shadcn/ui and Tailwind CSS; dark mode via next-themes.
- Real-time messaging, presence, and typing indicators via Socket.IO + Redis adapter.
- AI chat integration using the Vercel AI SDK.
- File upload/download management with MinIO object storage.
- Admin panel with role-based access control (RBAC).
- Zod-based request/data validation and error handling.
- Docker development environment and deployment scaffolding.

**Out-of-Scope (Future Phases)**
- Mobile-native client (React Native or SwiftUI).
- Payment or billing integration.
- Advanced search indexing (Algolia/ElasticSearch).
- Internationalization/localization UI and translations.
- Built-in analytics dashboards or user behavior tracking.
- Extensive test suite (unit, integration, E2E) beyond basic examples.

---

## 3. User Flow

A brand-new user visits the landing page and clicks “Sign Up.” They complete an email/password form and receive a verification link by email. Once verified, they log in and land on a dashboard screen. The left sidebar displays navigation items: Home, Chat, Files, Admin (if they have the admin role), and Profile. The main area shows a welcome message and overview cards (e.g., recent messages, storage usage).

From the dashboard, the user can click “Chat” to open a real-time messaging view. They pick a conversation or start a new one. Messages flow instantly with typing indicators and presence dots. Under “Files,” they view an upload widget where they drag/drop or browse local files; uploaded files appear in a list with download links. If they’re an administrator, clicking “Admin” opens a protected panel to manage users and view system metrics.

---

## 4. Core Features

- **Authentication Module**: Email/password signup, login, logout, password reset; JWT access tokens + HTTP-only refresh tokens.
- **Database Module**: PostgreSQL with Drizzle ORM for migrations, schema definitions, and type-safe queries.
- **UI & Theming**: shadcn/ui components + Tailwind CSS; dark mode via next-themes; mobile-responsive layouts.
- **Real-Time Engine**: Socket.IO server/client setup; Redis adapter for horizontal scaling; events for messaging, presence, typing.
- **AI Chat Integration**: Vercel AI SDK for backend chat routes and front-end chat interface; streaming responses support.
- **File Storage Service**: MinIO client for secure file uploads, downloads, and metadata management.
- **Admin Panel**: Role-based route protection, user listing, basic metrics display.
- **Validation & Error Handling**: Zod schemas for API and form validation; standardized error responses.
- **Containerization**: Docker Compose setup for local dev (Postgres, Redis, MinIO, app).

---

## 5. Tech Stack & Tools

**Frontend**
- Next.js 15 (App Router) with React Server Components
- TypeScript for all code
- Tailwind CSS & shadcn/ui for styling and accessible components
- next-themes for dark mode

**Backend & Database**
- Next.js API Routes for server-side logic
- PostgreSQL as relational DB
- Drizzle ORM for migrations and typed queries
- Better Auth & JWT for authentication
- Socket.IO + Redis adapter for real-time
- MinIO for object storage
- Vercel AI SDK for AI endpoints
- Zod for schema validation

**Infrastructure & Dev Tools**
- Docker & Docker Compose for local environments
- Env files (.env) for configuration
- Recommended IDEs: VS Code with GitHub Copilot or Cursor plugin

---

## 6. Non-Functional Requirements

- **Performance**: Initial page loads under 1 second; API responses < 200 ms; real-time latency < 100 ms.
- **Security**: TLS everywhere (HTTPS); HTTP-only cookies for refresh tokens; CSRF tokens on state-changing requests; OWASP Top 10 mitigation; encryption at rest for files.
- **Scalability**: Support multiple Node/Socket.IO instances via Redis pub/sub.
- **Reliability**: 99.9% uptime target; health-check endpoints for each service.
- **Usability & Accessibility**: WCAG 2.1 AA compliance; responsive design on mobile, tablet, desktop.
- **Compliance**: GDPR and CCPA readiness for user data; audit logging of admin actions.

---

## 7. Constraints & Assumptions

- Requires Node.js 18+ and Next.js 15.
- PostgreSQL, Redis, and MinIO must be available either locally (via Docker) or in the target environment.
- Vercel AI SDK credentials and quota are accessible.
- Environment variables (DB URLs, JWT secrets, MinIO keys) are correctly configured before startup.
- We assume teams adopt the provided folder structure and naming conventions.

---

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: AI endpoints may hit service quotas; mitigate with local caching or usage caps.
- **Socket Scaling**: Without proper Redis setup, real-time events won’t broadcast across instances.
- **File Size Limits**: Large uploads may time out; consider chunked uploads or increasing timeouts.
- **CORS Misconfiguration**: Could block API calls; ensure frontend URLs are whitelisted.
- **DB Migrations**: Out-of-sync migrations can break deployments; run migrations automatically on startup or in CI.
- **Security Gaps**: Missing CSRF tokens or improper cookie settings can expose vulnerabilities; enforce strict headers and token checks.

Mitigation strategies include adding per-IP rate limiting, validating environment setups in CI, enforcing schema migrations on build, and adding robust logging/alerting for real-time and AI services.
