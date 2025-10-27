# Backend Structure Document

This document outlines the backend architecture, database setup, APIs, hosting, infrastructure, security, and maintenance strategies for the EPOP Platform Starter. It’s written in everyday language so anyone can understand how the backend works.

## 1. Backend Architecture

We chose a modern, modular monolith approach using Next.js 15’s App Router. This means frontend pages, server-side logic, and APIs live in one codebase but remain clearly separated by folders and responsibilities.

- **Framework & Paradigm**
  - Next.js 15 (App Router) for server rendering, routing, and API routes in one project.
  - TypeScript everywhere to catch errors early and maintain a consistent, self-documenting code style.
- **Design Patterns**
  - **Modular Monolith**: Each feature (authentication, chat, file storage) has its own directory and services.
  - **Context API** for sharing global state (e.g., user session, Socket.IO connection) across components without prop-drilling.
  - **Service Layer** (`/lib`) to encapsulate business logic (auth, email, storage, real-time messaging).
- **Scalability & Performance**
  - Real-time events powered by Socket.IO and Redis adapter, allowing horizontal scaling of WebSocket servers.
  - Database interactions via Drizzle ORM with connection pooling, optimized queries, and type-safe migrations.
  - Server Components for data fetching where possible, reducing client-side JavaScript and improving initial load.

## 2. Database Management

The project uses a relational database with strict typing and migration support.

- **Type**: SQL (Relational)
- **System**: PostgreSQL
- **ORM**: Drizzle ORM
- **Data Practices**
  - Schemas defined in TypeScript (in `/db/schema`), ensuring the database structure matches code types.
  - Migrations managed by Drizzle to keep production and development schemas in sync.
  - Zod validation at the API layer to verify incoming data before touching the database.
  - Connection pooling for efficient, scalable database access.

## 3. Database Schema

Below is a human-friendly overview followed by SQL definitions for the main tables.

### 3.1 Overview (Human-Readable)

- **Users**: Stores user accounts and credentials.
- **Roles**: Defines roles like `user` or `admin`.
- **User_Roles**: Links users to their roles (many-to-many).
- **Sessions**: Holds refresh tokens and expiration for JWT-based sessions.
- **Chat_Rooms**: Tracks chat rooms or channels.
- **Messages**: Records individual chat messages with sender and room info.
- **Files**: Metadata for uploaded files (owner, name, URL, size, timestamps).

### 3.2 SQL Schema (PostgreSQL)

```sql
-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- 3. User_Roles join table
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 4. Sessions table (for refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 5. Chat_Rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```  

## 4. API Design and Endpoints

The backend offers RESTful API routes under `/app/api`. Here are the key endpoints and their roles:

### 4.1 Authentication
- **POST /api/auth/register**: Create a new user with email and password.
- **POST /api/auth/login**: Verify credentials, issue access token and refresh token cookie.
- **POST /api/auth/refresh**: Rotate refresh token, return a new access token.
- **POST /api/auth/logout**: Clear the refresh token, end session.
- **POST /api/auth/password-reset**: Send reset link and update password.

### 4.2 Users & Admin
- **GET /api/users/me**: Fetch details of the logged-in user.
- **GET /api/users/:id**: (Admin) View any user’s profile.
- **GET /api/admin/users**: (Admin) List all users with roles.
- **PATCH /api/admin/users/:id**: (Admin) Update roles or deactivate accounts.

### 4.3 Real-Time Chat (Socket.IO)
- **WebSocket /api/socket**:  
  - `join-room`: Subscribe to a chat room.
  - `leave-room`: Unsubscribe when exiting.
  - `send-message`: Broadcast message to room, persist in DB.
  - `typing` / `stop-typing`: Notify others.

### 4.4 AI Integration
- **POST /api/ai/chat**: Forward user prompt to the Vercel AI SDK, stream AI responses back.

### 4.5 File Storage
- **POST /api/files/upload**: Handle multipart/form-data upload, store in MinIO, record metadata in `files` table.
- **GET /api/files/:id/download**: Generate a signed URL or stream file from MinIO.

### 4.6 Miscellaneous
- **GET /api/health**: Simple health check for uptime monitoring.

## 5. Hosting Solutions

The backend runs in a containerized environment, and we recommend a hybrid of managed and self-hosted services:

- **Next.js App**
  - Host on Vercel for auto-scaling, global CDN, and zero-config deployments.
  - Alternatively, containerize with Docker and deploy on AWS ECS, Google Cloud Run, or Kubernetes.
- **PostgreSQL**
  - Managed service like AWS RDS or Google Cloud SQL for automated backups, scaling, and maintenance.
- **Redis**
  - Managed Redis (e.g., AWS ElastiCache) for the Socket.IO adapter and caching layers.
- **MinIO**
  - Self-host on Kubernetes or Docker, or use a managed S3-compatible service.

## 6. Infrastructure Components

- **Load Balancer**
  - Built into Vercel or via AWS Application Load Balancer when self-hosting.
- **Caching**
  - Redis for real-time event coordination, session caching, and potential API response caching.
- **Content Delivery Network (CDN)**
  - Vercel’s global CDN or Cloudflare in front of the Next.js app and static assets.
- **Object Storage**
  - MinIO or S3 for file uploads, behind proper access controls.
- **CI/CD**
  - GitHub Actions or Vercel’s Git integration to run linting, tests, and deploy on merge to main.

## 7. Security Measures

- **Authentication & Authorization**
  - Better Auth with JWT access tokens and HTTP-only cookies for refresh tokens.
  - Role-Based Access Control (RBAC) to guard admin routes.
- **Data Encryption**
  - TLS/HTTPS for all client-server traffic.
  - Encryption at rest provided by managed DB and S3 services.
- **Input Validation**
  - Zod schemas on every API route to reject invalid or malicious payloads.
- **CSRF Protection**
  - Double-submit cookie pattern or CSRF tokens for all state-changing requests.
- **Rate Limiting**
  - Per-user or per-IP limits via Redis to prevent abuse.
- **Environment Isolation**
  - Secrets and keys stored in environment variables or secret managers (e.g., AWS Secrets Manager).

## 8. Monitoring and Maintenance

- **Logging & Error Tracking**
  - Centralized logs via a service like Datadog, Logflare, or AWS CloudWatch.
  - Error monitoring with Sentry to capture exceptions and performance issues.
- **Health Checks**
  - `/api/health` endpoint monitored by uptime services (e.g., Pingdom, UptimeRobot).
- **Metrics & Alerts**
  - Prometheus + Grafana for custom metrics (DB connections, Redis usage, request latencies).
  - Alerts on high error rates, slow responses, or resource exhaustion.
- **Scheduled Maintenance**
  - Regular dependency updates via automated tooling (Dependabot).
  - Database vacuuming and index maintenance on a weekly basis.
  - Review and rotate keys and certificates every 90 days.

## 9. Conclusion and Overall Backend Summary

The EPOP Platform Starter backend is a scalable, maintainable, and performance-oriented foundation built with Next.js 15, PostgreSQL, Drizzle ORM, Socket.IO, and more. Its modular monolith structure keeps code clear, while TypeScript and Zod enforce type safety and data validity. Real-time features, AI integration, and secure file handling are seamlessly woven together, all deployable via containers or Vercel. Together, these components deliver a robust backend that aligns with modern web app needs and ensures a great developer and user experience.