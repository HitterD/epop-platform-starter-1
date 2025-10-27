# Tech Stack Document for EPOP Platform Starter

This document explains the technology choices in plain language. It describes how each piece fits together to build a modern, feature-rich web application without assuming a technical background.

## 1. Frontend Technologies
These are the tools and libraries used to build what you see and interact with in your browser.

- **Next.js 15 (App Router)**
  - A framework that handles page routing, server-side rendering, and API endpoints all in one place.
  - Helps pages load quickly and improves search engine visibility.
- **React & TypeScript**
  - React builds the user interface with reusable components.
  - TypeScript adds checks for our code, reducing errors and improving maintainability.
- **Tailwind CSS & shadcn/ui**
  - Tailwind CSS is a utility-first styling system that speeds up design work.
  - shadcn/ui provides ready-made, accessible UI components that match the Tailwind style.
- **next-themes**
  - Manages light and dark modes automatically, giving users a choice of theme.
- **Vercel AI SDK (Frontend part)**
  - Offers tools to display AI-powered chat or recommendations right in the interface.
- **React Context API**
  - Shares data (like the user’s login status or an open chat connection) across the app without complicated prop-drilling.
- **Zod (Client-side validation)**
  - Validates form inputs and API data early, providing friendly error messages before sending data to the server.
- **Socket.IO Client**
  - Enables real-time features (chat messages, typing indicators) in the browser by keeping an open WebSocket connection.

**How this enhances user experience**  
By choosing server-side rendering and optimized React components, pages load faster. The design tools (Tailwind + shadcn/ui) deliver a polished, accessible look. Dark mode support and real-time updates keep the interface modern and engaging.

## 2. Backend Technologies
These handle data storage, business logic, and communication behind the scenes.

- **Next.js API Routes (Node.js)**
  - Lets us define backend endpoints alongside frontend code, simplifying development.
- **PostgreSQL**
  - A reliable relational database to store users, messages, file references, and more.
- **Drizzle ORM**
  - Provides a type-safe way to define database tables, run migrations, and query data in TypeScript.
- **Better Auth + JWTs**
  - Better Auth manages sign-up, login, and password reset flows.
  - JSON Web Tokens (JWTs) keep track of user sessions. Refresh tokens are stored in HTTP-only cookies for security.
- **Redis**
  - Acts as a message broker for Socket.IO, enabling real-time events to scale across many server instances.
- **Socket.IO Server**
  - Manages real-time communication (chat, presence, typing indicators).
- **MinIO**
  - An object storage service for file uploads and downloads, working like Amazon S3 but self-hosted.
- **Vercel AI SDK (Backend part)**
  - Connects to AI models, processes prompts, and streams responses back to the frontend.
- **Zod (Server-side validation)**
  - Validates incoming data on API endpoints to prevent bad data from reaching the database.

**How this supports functionality**  
This setup ensures data is stored safely, business rules run securely, and real-time features operate smoothly. Using TypeScript and Drizzle keeps code consistent, reducing bugs.

## 3. Infrastructure and Deployment
This section explains where and how the application runs, and how updates get rolled out.

- **Docker**
  - Containerizes the entire application for consistent development and production environments.
- **Version Control (Git)**
  - Tracks changes to code, enabling collaboration and easy rollback if needed.
- **CI/CD Pipelines (e.g., GitHub Actions or similar)**
  - Automatically test, build, and deploy the code when changes are merged.
  - Ensures new features and fixes reach users quickly and reliably.
- **Hosting Platform (e.g., Vercel, DigitalOcean, AWS)**
  - Runs the application containers in the cloud, making it accessible to users worldwide.
- **Environment Variables (.env files)**
  - Store sensitive credentials (database URLs, API keys) securely outside the codebase.

**Benefits**  
Using containers and automated pipelines makes deployments reproducible and error-free. Version control ensures all changes are tracked, and environment variables keep secrets out of the code.

## 4. Third-Party Integrations
These external services add extra capabilities without reinventing the wheel.

- **Better Auth**
  - Out-of-the-box user authentication flows (register, login, password reset).
- **Redis**
  - Powers real-time message distribution and presence tracking as the Socket.IO adapter.
- **MinIO**
  - Provides scalable, cost-effective object storage for user file uploads.
- **Vercel AI SDK**
  - Integrates AI features like chatbots, content generation, or smart recommendations.
- **Transactional Email Service** (e.g., SendGrid, Mailgun – configured via `lib/email`)  
  - Sends account confirmation, password reset, and notification emails.

**How they enhance functionality**  
By leveraging these services, we save development time and tap into mature, secure solutions for authentication, real-time messaging, AI logic, file storage, and email delivery.

## 5. Security and Performance Considerations
Measures taken to keep data safe and the app running smoothly.

Security:
- **JWT & HTTP-Only Cookies**: Refresh tokens are never accessible from JavaScript, reducing the risk of theft.
- **Role-Based Access Control (RBAC)**: Ensures only authorized users (e.g., admins) can access protected routes or actions.
- **Server-Side Validation (Zod)**: Prevents malformed or malicious data from entering the system.
- **Environment Variables**: Keeps secrets out of version control.
- **CSRF Protections**: Can be added for state-changing requests to prevent cross-site attacks.

Performance:
- **Server-Side Rendering (Next.js)**: Delivers fully rendered pages quickly on first load.
- **Streaming AI Responses**: Sends AI chat responses in chunks for faster perceived performance.
- **Redis Caching**: (Potential) to store frequently used data and reduce database load.
- **Code Splitting & Lazy Loading**: Ensures users download only what they need, when they need it.
- **Socket.IO Scaling**: Redis adapter lets real-time features scale across multiple servers.

## 6. Conclusion and Overall Tech Stack Summary
This starter template brings together modern, battle-tested technologies to give you:

- A fast, SEO-friendly frontend (Next.js, React, TypeScript).
- A robust backend with secure authentication and real-time capabilities (PostgreSQL, Drizzle ORM, Better Auth, Socket.IO, Redis).
- Seamless AI integration for chatbots or assistants (Vercel AI SDK).
- Scalable file storage (MinIO) and email delivery services.
- Reliable deployments powered by Docker and automated CI/CD.
- Strong security and performance practices baked in.

Together, these choices form a flexible foundation that lets you focus on building your unique features rather than reinventing core functionality. The clear separation of concerns, type-safe code, and well-documented structure make it easy for teams of all sizes to onboard, develop, and maintain a high-quality web application.