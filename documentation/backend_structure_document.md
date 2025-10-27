# Backend Structure Document

## Backend Architecture

We use a **unified, full-stack** approach centered on Next.js 15’s App Router. This means the same codebase serves both the frontend and backend API routes. Key design choices include:

- **Next.js API Routes**: We organize business logic under `/app/api/` with RESTful endpoints. This keeps frontend and backend in one place, simplifying deployment and sharing TypeScript types.  
- **Socket.IO Server**: A separate Node.js process handles real-time features (messaging, presence, typing indicators). It connects to Redis for scalable pub/sub.  
- **Repository/Service Pattern**: Database operations are wrapped in service or repository layers. This isolates Drizzle ORM details, making handlers easier to maintain and test.  

This setup supports:

- **Scalability**: API routes scale on-demand via serverless or container instances; Socket.IO scales horizontally with Redis as its adapter.  
- **Maintainability**: Clear separation of concerns—routing, services, data—keeps code organized and testable.  
- **Performance**: Real-time communications offload long-polling; caching (Redis) speeds up frequent reads.

## Database Management

We chose **PostgreSQL** for its reliability, ACID guarantees, and built-in full-text search. We manage the database with:

- **Drizzle ORM**: Type-safe query builder and schema definitions in TypeScript.  
- **drizzle-kit**: Migration tool that tracks schema changes and applies them in a versioned way across environments.  
- **Connection Pooling**: We use a pooled client (e.g., `pg.Pool`) to efficiently reuse database connections and prevent saturation under load.  

**Data Access Practices**:

- All queries go through the repository layer—no raw SQL in controllers.  
- Zod schema validation at the API boundary ensures only well-formed data reaches the database.  
- Transactions group related operations (e.g., creating a message and queuing a notification) to maintain consistency.

## Database Schema

Below is a human-friendly description of our main tables, followed by SQL definitions for PostgreSQL.

Tables and Relationships:

- **users**: Stores user credentials and profile info. Each user has one **role**.  
- **roles**: Defines permission levels (`ADMIN`, `USER`).  
- **divisions**: Organizational units; users can belong to one or more divisions.  
- **projects**: High-level containers with multiple tasks and members.  
- **tasks**: Belong to a project; track status, assignees, and deadlines.  
- **conversations**: Group or direct message threads; each links to multiple messages.  
- **messages**: Rich-text content tied to a conversation; may reference file attachments.  
- **attachments**: Metadata about files stored in MinIO, linked to messages.

PostgreSQL Schema (simplified):
```
-- roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- divisions
CREATE TABLE divisions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- user_divisions (many-to-many)
CREATE TABLE user_divisions (
  user_id UUID REFERENCES users(id),
  division_id INTEGER REFERENCES divisions(id),
  PRIMARY KEY (user_id, division_id)
);

-- projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- project_members
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- conversation_members
CREATE TABLE conversation_members (
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  size BIGINT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## API Design and Endpoints

We follow a **RESTful** style, grouping routes by resource under `/api`. All endpoints validate input with Zod and return consistent status codes. Key routes:

- **/api/auth/**
  - `POST /login` – Email/password login, returns access/refresh tokens.  
  - `POST /refresh` – Rotates refresh token in a secure cookie, returns new access token.  
  - `POST /logout` – Clears refresh cookie.  
  - `POST /password-reset` – Initiates email flow; `POST /password-reset/confirm` sets new password.

- **/api/projects/**
  - `GET /` – List projects for the user.  
  - `POST /` – Create a new project.  
  - `GET /:id` – Fetch project details.  
  - `PUT /:id` – Update project.  
  - `DELETE /:id` – Remove project.

- **/api/tasks/**
  - `GET /?projectId=` – List tasks in a project.  
  - `POST /` – Create a task.  
  - `PUT /:id` – Update status, assignee, etc.

- **/api/conversations/**
  - `GET /` – List user’s conversations.  
  - `POST /` – Create new conversation (direct or group).  
  - `GET /:id/messages` – Fetch messages with pagination.  
  - `POST /:id/messages` – Send a message with rich-text content.

- **/api/files/**
  - `GET /presign-upload` – Returns presigned URL for MinIO uploads.  
  - `GET /presign-download` – Returns presigned URL for safe downloads.

- **/api/ai/**
  - `POST /chat` – Streams conversational AI responses.

- **/api/admin/** (ADMIN role only)
  - `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` – Manage users and roles.

## Hosting Solutions

We recommend deploying the backend on **AWS** using managed services:

- **Next.js & API Routes**: Vercel or AWS App Runner – automatic scaling, global CDN for static assets.  
- **Socket.IO Server**: AWS ECS Fargate behind an Application Load Balancer with sticky sessions or AWS GameLift for low-latency websockets.  
- **PostgreSQL**: Amazon RDS (db.t3.medium or above) with Multi-AZ for failover.  
- **Redis**: Amazon ElastiCache (Redis) cluster for Pub/Sub and job queuing.  
- **MinIO**: Self-hosted on EC2 (distributed) or use S3 with IAM policies as an alternative.  

Benefits:

- **Reliability**: Managed failover for RDS and Redis clusters.  
- **Scalability**: Serverless or container-based horizontal scaling.  
- **Cost-effectiveness**: Pay-as-you-go billing; reserve instances for constant loads.

## Infrastructure Components

- **Load Balancer**: Distributes traffic to Next.js instances and Socket.IO servers.  
- **Redis Caching & Pub/Sub**: Speeds up frequent reads (e.g., session lookups) and powers Socket.IO’s adapter.  
- **CDN**: Vercel’s CDN or CloudFront delivers static assets and Next.js pages close to users.  
- **Job Queue**: BullMQ on top of Redis handles background tasks (emails, push notifications, reminders).  
- **Object Storage**: MinIO or S3 stores user uploads; presigned URLs let clients upload/download directly, reducing server load.

## Security Measures

- **Authentication & Authorization**:
  - JWT access tokens (short-lived) in memory or Authorization header.  
  - Refresh tokens in secure, HTTP-only cookies to mitigate XSS risks.  
  - Role-based checks in middleware for protected and admin routes.  
- **Data Encryption**:
  - TLS everywhere: API endpoints, database connections, MinIO/S3.  
  - Encrypt sensitive fields at rest if required by policy.  
- **Input Validation**: Zod schemas on every route guard against malformed data and injection attacks.  
- **Rate Limiting**: Apply IP-based limits on auth and messaging endpoints to prevent abuse.  
- **Security Headers**: CSP, HSTS, X-Frame-Options, and others via middleware.

## Monitoring and Maintenance

- **Logging**: Pino for structured logs. Forward logs to a central service (e.g., Datadog, ELK) with request IDs for traceability.  
- **Error Tracking**: Sentry or LogRocket captures exceptions in runtime and frontend.  
- **Performance Metrics**: CloudWatch or Prometheus collects CPU, memory, Redis hit rates, RPS.  
- **Health Checks**: Periodic HTTP endpoints for load balancer health checks.  
- **Database Migrations**: `drizzle-kit` runs migrations at deploy time to keep schema in sync.  
- **Dependency Updates**: Automated tooling (Dependabot) flags outdated packages; regular patch releases.

## Conclusion and Overall Backend Summary

Our backend is built around a **Next.js-centric** monorepo using TypeScript, Drizzle ORM, and PostgreSQL. We layer real-time messaging with Socket.IO and Redis, secure file transfers via MinIO, and AI assistance via Vercel’s AI SDK. Deployment on AWS (or Vercel for serverless functions) ensures global reach, high availability, and cost control. Thorough security, monitoring, and maintenance practices keep the system reliable, while the repository/service pattern and type-safe tooling guarantee long-term maintainability. This backend structure meets EPOP’s needs for performance, scalability, and an integrated developer experience.