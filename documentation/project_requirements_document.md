# Project Requirements Document (PRD)

## 1. Project Overview

The **Enterprise Platform for Operational Performance (EPOP)** is a unified web application designed to streamline team collaboration, real-time communication, project management, file sharing, and AI-powered assistance. It solves the common problem of juggling multiple tools by bringing messaging, task tracking, document uploads, and context-aware AI help into one cohesive platform. Teams can create projects, chat in real time, manage tasks on boards and calendars, and get AI-generated summaries or drafting suggestions without leaving the app.

We’re building EPOP on top of an existing `codeguide-starter-fullstack` boilerplate so development can start immediately on high-value features. Key objectives include:

- **Fast MVP Delivery**: Leverage Next.js, React, TypeScript, and Drizzle ORM for a production-ready codebase.
- **Core Collaboration**: Secure authentication, real-time messaging, and project/task workflows.
- **AI Integration**: In-app assistant for summarizing messages and drafting content.
- **Secure File Handling**: Direct uploads to MinIO with presigned URLs.
- **Admin Controls**: Role-based access for user and system management.

Success criteria for the first release are end-to-end user signup and authentication, one-to-one and group messaging, basic project/task CRUD operations, file upload/download flow, and a working AI chat panel.

---

## 2. In-Scope vs. Out-of-Scope

**In-Scope (First Version)**
- User sign-up, sign-in, JWT access/refresh token flow, password reset.
- Role-based access control (ADMIN, USER), protected dashboard and admin panel.
- Real-time messaging with Socket.IO and Redis adapter, including presence and typing indicators.
- File upload/download via MinIO using presigned URLs, metadata in PostgreSQL.
- Project and task management UI: create, read, update, delete projects and tasks; calendar and Kanban views.
- AI Assistant chat: message summarization and draft suggestions using Vercel’s `@ai-sdk` and `assistant-ui`.
- PostgreSQL data layer with Drizzle ORM and Zod validation; migrations via `drizzle-kit`.
- Background jobs (BullMQ) for email and push notifications.
- Basic search using Postgres full-text (`tsvector`) and trigram indexes.

**Out-of-Scope (Future Phases)**
- Mobile apps (iOS/Android) or offline-first support.
- Custom report generation, advanced analytics, or BI dashboards.
- Integration with external services beyond MinIO and FCM.
- Multi-language localization or custom theming.
- AI model fine-tuning or on-premise LLM hosting.
- Dark-mode toggle beyond the default theme (shadcn/ui covers this).

---

## 3. User Flow

When a new user arrives, they land on a sign-in/up page. After creating an account or logging in, they’re redirected to the **Dashboard**. A fixed sidebar on the left displays navigation links (Dashboard, Projects, Messages, AI Assistant, Admin if they’re an ADMIN). The main area shows a summary: recent projects, unread messages, upcoming deadlines on a mini-calendar.

From here, the user can click **Projects** to see a list or board view of their projects, click **Messages** to open conversation threads, or open the **AI Assistant** panel at the bottom-right to ask for summaries or get drafting help. Clicking a project opens its detail page with tasks in Kanban and calendar tabs. Within any conversation, they can type rich-text messages, attach files via a file picker (uploads happen through MinIO), and see live updates when others type or send messages.

---

## 4. Core Features

- **Authentication & Authorization**
  - Email/password sign-up and login.
  - JWT access/refresh tokens in secure, HTTP-only cookies.
  - Password reset via email.
  - Role-based protection for ADMIN routes.

- **Real-Time Messaging**
  - WebSocket connections via Socket.IO with Redis adapter.
  - Rich-text composer using TipTap.
  - Presence indicators and typing notifications.
  - Message history with virtualization (react-window).

- **Project & Task Management**
  - CRUD for projects and tasks (title, description, assignees, status, deadlines).
  - Kanban board, Gantt chart stub, calendar integration.
  - Member invitation and role assignments per project.

- **File Upload & Management**
  - MinIO integration with presigned URL endpoints.
  - Direct browser uploads, downloads, and metadata tracking.
  - File listing within message threads and projects.

- **AI Assistant**
  - Chat interface via `assistant-ui`.
  - Summarize conversation threads.
  - Generate drafts or suggest text based on context.
  - Streaming responses over a dedicated API route.

- **Background Jobs & Notifications**
  - Redis-backed queue (BullMQ) for async tasks.
  - Email notifications (account actions, mentions).
  - Push notifications via FCM.

- **Search**
  - Postgres full-text search for messages and files.
  - Trigram indexes for fuzzy search on names and titles.

- **Admin Panel**
  - User and role management.
  - System settings (feature toggles). 

---

## 5. Tech Stack & Tools

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript.
- **Styling & UI**: Tailwind CSS, shadcn/ui component library.
- **Backend & API**: Next.js API routes in same repo, Node.js 18+.
- **Database & ORM**: PostgreSQL, Drizzle ORM, `drizzle-kit` for migrations.
- **Validation**: Zod schemas for request payloads.
- **Real-Time**: Socket.IO with Redis adapter.
- **File Storage**: MinIO client with presigned URLs.
- **AI**: Vercel `@ai-sdk`, `assistant-ui`, GPT-4 (via API).
- **Background Processing**: BullMQ (Redis queue).
- **Logging & Observability**: Pino structured logging, request ID middleware.
- **Notifications**: Firebase Cloud Messaging (FCM) and email provider (e.g., SendGrid).

Optional IDE/plugins: Visual Studio Code, Cursor plugin for AI pair programming, Windsurf for code completion.

---

## 6. Non-Functional Requirements

- **Performance**: API endpoints respond in under 200 ms on average; TTI (Time to Interactive) under 1 s.
- **Scalability**: Handle 10,000+ concurrent WebSocket connections.
- **Security**: HTTPS only; OWASP Top 10 mitigation; rate limiting on auth and AI routes; CSP headers.
- **Data Protection**: Encryption at rest for database and MinIO; secure cookie flags (HttpOnly, Secure, SameSite).
- **Compliance**: GDPR-ready data deletion workflows; audit logs for admin actions.
- **Accessibility**: WCAG 2.1 AA standards; keyboard navigation and ARIA labels.
- **Reliability**: 99.9% uptime SLA; retry logic for transient failures in background jobs.

---

## 7. Constraints & Assumptions

- **API Rate Limits**: GPT-4 API has monthly quotas; degrade gracefully when exhausted.
- **Redis & MinIO**: Must be provisioned and highly available.
- **Node.js Version**: 18.x or higher in production.
- **Environment**: All secrets managed via environment variables (`.env`).
- **Network**: Low latency between app server, Redis, and MinIO.
- **Browser Support**: Modern evergreen browsers (Chrome, Firefox, Edge, Safari).

Assume the Vercel AI SDK supports streaming chat and that the Drizzle ORM supports all planned schema features.

---

## 8. Known Issues & Potential Pitfalls

- **Socket.IO Scaling**: Redis adapter setup complexity; ensure pub/sub channels are correctly configured to avoid missed events.
  - *Mitigation*: Write integration tests for broadcast events; monitor event backlog.

- **File Upload Size Limits**: Large files may time out or exhaust memory.
  - *Mitigation*: Enforce a max file size (e.g., 50 MB) and use multipart uploads if needed.

- **DB Migrations Race**: Running `drizzle-kit` migrations concurrently on multiple instances.
  - *Mitigation*: Use a migration lock or run migrations in a single CI/CD step.

- **Token Rotation**: Improper handling of refresh tokens could lead to replay attacks.
  - *Mitigation*: Implement one-time-use refresh tokens and rotate on each use.

- **AI API Failures**: Latency spikes or errors from GPT-4.
  - *Mitigation*: Fallback messaging (“Assistant currently unavailable”) and retry with exponential backoff.

- **Validation Drift**: Zod schemas out-of-sync with Drizzle schemas.
  - *Mitigation*: Centralize schema definitions where possible and enforce pre-commit checks.

This PRD provides a clear, unambiguous foundation for all future technical documents and guides the AI model to generate consistent, high-quality code, configurations, and documentation for the EPOP platform.