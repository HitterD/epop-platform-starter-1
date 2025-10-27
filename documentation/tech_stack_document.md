# Tech Stack Document for EPOP Platform Starter

This document explains, in everyday language, the reasons behind each technology choice for your Enterprise Platform for Operational Performance (EPOP). We break down the stack into clear sections so you can see how each part contributes to a secure, scalable, and user-friendly application.

## 1. Frontend Technologies

We chose a modern, component-driven approach that keeps the user interface fast, consistent, and easy to extend.

- **Next.js 15 (App Router)**
  • Serves both pages and API routes in one project.  
  • Provides built-in support for server-side rendering (SSR), static site generation (SSG), and incremental static regeneration (ISR) for optimal performance.

- **React 19**
  • Powers a dynamic, state-driven UI with reusable components.  
  • Hooks and concurrent features let us build responsive, interactive screens.

- **TypeScript**
  • Adds static type checking to catch errors early, from your components all the way down to your database queries.  
  • Improves developer productivity and maintainability.

- **Tailwind CSS**
  • A utility-first framework that speeds up styling without leaving your HTML/JSX.  
  • Ensures a consistent look and feel across the entire application.

- **shadcn/ui**
  • A curated collection of accessible, prebuilt components (dialogs, tables, inputs, calendars).  
  • Speeds up UI creation and enforces design consistency, including built-in dark mode.

- **Rich Text & Virtualization**
  • **TipTap** for a rich-text composer in messaging.  
  • **react-window** (or **@tanstack/react-virtual**) to efficiently render long lists of messages without slowing down the browser.

## 2. Backend Technologies

Our backend is unified with the frontend codebase via Next.js API routes, ensuring end-to-end type safety and a single development environment.

- **Next.js API Routes / Node.js**
  • Host RESTful endpoints (`/api/projects`, `/api/messages`, etc.) alongside your UI code.  
  • Easy access to shared utilities, types, and environment variables.

- **PostgreSQL + Drizzle ORM**
  • **PostgreSQL** as a reliable, relational database with support for full-text search and extensions.  
  • **Drizzle ORM** for type-safe database queries and schema definitions in TypeScript.

- **Zod**
  • Validates and shapes incoming API data with clear, reusable schemas.  
  • Ensures that only well-formed data reaches your database.

- **Socket.IO + Redis Adapter**
  • Enables real-time messaging, presence indicators, and typing notifications.  
  • **Redis** handles pub/sub under the hood, so you can scale across multiple server instances.

- **BullMQ (Redis-backed Queue)**
  • Processes background jobs—email/push notifications, scheduled reminders—without blocking user requests.

## 3. Infrastructure and Deployment

We set up a robust infrastructure to automate deployments, manage code changes, and scale gracefully.

- **Version Control: Git + GitHub**
  • Manages source code, branches, and pull requests in a collaborative environment.  
  • Provides built-in code review and issue tracking.

- **Hosting: Vercel**
  • Automatically deploys your Next.js app on every push to main branches.  
  • Offers CDN distribution, serverless functions for API routes, and environment variable management.

- **Database Migrations: drizzle-kit**
  • Tracks schema changes in version-controlled files.  
  • Applies reproducible migrations in development, staging, and production.

- **CI/CD: GitHub Actions (or Vercel CI)**
  • Runs linting, type checks, and tests on every pull request.  
  • Deploys to preview environments for QA before merging to main.

- **Environment Variables**
  • `.env.example` lists all required keys (DB URL, Redis URL, MinIO credentials, JWT secret, FCM keys, email provider).  
  • Keeps sensitive data out of the repository.

## 4. Third-Party Integrations

These external services add important features without reinventing the wheel.

- **MinIO**
  • S3-compatible object storage for user uploads.  
  • We generate presigned URLs so users can upload/download files directly and securely.

- **Vercel AI SDK (`@ai-sdk`) & Assistant UI**
  • Embeds an AI assistant for message summarization, draft suggestions, and context-aware help.  
  • Communicates via a streaming API endpoint to deliver instant responses.

- **Firebase Cloud Messaging (FCM)**
  • Sends push notifications to mobile or desktop clients.  
  • Works with our Redis queue to ensure messages reach offline users when they come back online.

- **Email Provider (e.g. SendGrid, Mailgun)**
  • Sends password reset emails, notifications, and system alerts.  
  • Integrated via background jobs for reliability.

## 5. Security and Performance Considerations

We build with security and speed in mind, from the database layer up to the browser.

- **Authentication & Authorization**
  • **JWT access tokens** and **refresh tokens** stored in secure, HTTP-only cookies.  
  • Role-based access control (ADMIN vs. USER) to protect sensitive routes and admin panels.

- **Input Validation & Sanitization**
  • Zod schemas prevent malformed or malicious data at every API boundary.

- **Rate Limiting & Security Headers**
  • Middleware enforces request limits on critical endpoints.  
  • Content Security Policy (CSP) and other HTTP headers guard against XSS and clickjacking.

- **Logging & Observability**
  • **Pino** for structured, high-performance logging with request IDs for traceability.  
  • Centralized logs make debugging and auditing easier.

- **Performance Optimizations**
  • Server-side rendering and caching via Next.js.  
  • Virtualized lists for messaging, presigned URL uploads for direct object storage.

## 6. Conclusion and Overall Tech Stack Summary

We’ve combined a single, unified codebase (Next.js 15 + React 19 + TypeScript) with a type-safe backend (Drizzle ORM + PostgreSQL) to deliver a production-ready foundation for EPOP. Real-time features (Socket.IO + Redis), secure file management (MinIO), and AI-powered assistance (@ai-sdk + assistant-ui) round out a modern, scalable platform.

This stack was chosen to:

1. **Accelerate development** with prebuilt, accessible UI components and a unified code environment.  
2. **Ensure reliability** through type safety, automated migrations, and background job processing.  
3. **Support scalability** with serverless deployments, Redis pub/sub, and object storage.  
4. **Enhance user experience** via real-time updates, rich-text messaging, and AI-driven productivity tools.

By following this tech stack, your team can focus on building the unique features of EPOP—project management, messaging workflows, and administrative controls—rather than reinventing infrastructure. You’ll have a clear path to extend authentication, add new APIs, integrate advanced search, and roll out production-grade monitoring and testing.