# Frontend Guidelines Document

This document outlines the structure, design principles, and technologies for the EPOP frontend. It’s written in everyday language so everyone on the team can understand how we build, style, and maintain our application.

## 1. Frontend Architecture

**Core Frameworks and Libraries**
- **Next.js 15 (App Router)**: Powers both pages and API routes. File-based routing and nested layouts make organization easy.
- **React 19 + TypeScript**: Provides a component-driven approach with full type safety, reducing runtime errors.
- **Tailwind CSS + shadcn/ui**: A utility-first styling system plus a set of ready-made, accessible components (dialogs, tables, inputs, calendar).
- **Drizzle ORM + PostgreSQL**: On the backend side (via Next.js API routes), Drizzle gives type-safe database access and migrations.
- **Socket.IO + Redis adapter**: Enables scalable real-time messaging.
- **MinIO client**: Handles presigned URL generation for secure uploads/downloads.
- **Vercel `@ai-sdk` & `assistant-ui`**: Integrates AI features like message summarization and draft generation.
- **BullMQ (Redis queue)**: Manages background tasks (emails, push notifications, reminders).
- **Zod**: Validates API inputs at every endpoint.

**Scalability, Maintainability, Performance**
- **Modular folder structure**: Separates UI components (`/components`), API logic (`/app/api`), utilities (`/lib`), services (`/services`), and data schemas (`/db/schema`).
- **Type safety everywhere**: From React props to database queries, TypeScript together with Drizzle and Zod keeps interfaces consistent.
- **Code splitting & lazy loading**: Next.js automatically splits code per route, and we dynamically import heavy components (e.g., AI panel, rich-text editor).
- **Database migrations**: Managed by `drizzle-kit`, ensuring reproducible schema changes.

## 2. Design Principles

**Usability**
- Clear, intuitive layouts: sidebar + topbar for navigation, consistent buttons and form elements.
- Immediate feedback: loading spinners, disabled states, toast notifications.

**Accessibility**
- Semantic HTML elements (`<nav>`, `<main>`, `<button>`, etc.).
- ARIA attributes on custom components (dialogs, modals, menus).
- Keyboard navigation: focus outlines, skip links, logical tab order.

**Responsiveness**
- Mobile-first breakpoints via Tailwind (`sm`, `md`, `lg`, `xl`).
- Flexible grid and flex layouts for cards, tables, and boards.

**Consistency**
- Shared design tokens (colors, spacing, shadows) defined in `tailwind.config.js`.
- Reusable components from `shadcn/ui` ensure uniform look and behavior.

## 3. Styling and Theming

**Styling Approach**
- **Utility-first**: Tailwind CSS for almost all styling—no custom CSS files except for very specific overrides.
- **Component styles**: Minor custom styles via `className` or `styled` wrappers.

**Theming**
- Light and dark modes out of the box with shadcn/ui.
- Toggle stored in React Context and persisted in localStorage.

**Overall Style**
- **Modern flat design** with subtle glassmorphism touches on cards and panels (semi-transparent backgrounds with a light blur).

**Color Palette**
- **Primary**: #4F46E5 (indigo-600)
- **Primary-Highlight**: #6366F1 (indigo-500)
- **Secondary**: #10B981 (emerald-500)
- **Accent**: #F59E0B (amber-500)
- **Neutral Light**: #F3F4F6 (gray-100)
- **Neutral Dark**: #1F2937 (gray-800)
- **Background Light**: #FFFFFF
- **Background Dark**: #111827
- **Error**: #EF4444 (red-500)
- **Success**: #22C55E (emerald-400)

**Typography**
- **Font Family**: Inter, system-ui fallback
- **Base font size**: 16px (leading-6)
- **Headings**: 600–800 weight for contrast
- **Body text**: 400–500 weight for readability

## 4. Component Structure

**Organization**
- `/components/ai`: AI assistant panel, chat bubbles
- `/components/core`: Layout pieces (Sidebar, Header, Footer)
- `/components/messaging`: Rich-text composer, message list, typing indicator
- `/components/projects`: Task cards, Gantt chart, boards
- `/components/common`: Buttons, inputs, modals, tables

**Reusability & Naming**
- Follow PascalCase for component names (e.g., `MessageList`, `ProjectCard`).
- Each component folder contains its `index.tsx`, optional `styles.ts`, and tests.

**Benefits**
- Clear boundaries: UI logic lives close to markup.
- Encourages small, focused components that are easier to test.

## 5. State Management

**Local State**
- React's `useState` and `useReducer` for component-specific state (form inputs, toggle states).

**Global State**
- **React Context API** for:
  - **AuthContext**: user info, access tokens, login/logout functions.
  - **ThemeContext**: current theme, toggle function.

**Data Fetching**
- Next.js **server components** fetch data on the server where possible.
- **Client components** call our own API routes with `fetch`, handling loading and error states locally.
- Shared utilities in `/lib/fetcher.ts` to standardize headers and error handling.

## 6. Routing and Navigation

**Next.js App Router**
- File-based routing under `/app`:
  - `/app/layout.tsx`: root layout with header+sidebar.
  - `/app/(protected)/...`: authenticated routes group.
  - `/app/admin/...`: ADMIN-only pages.
  - `/app/sign-in`, `/app/sign-up`, `/app/forgot-password`.

**Navigating**
- Use Next.js `<Link>` for client-side transitions.
- Programmatic navigation with `useRouter`.

**Route Protection**
- Middleware checks for valid JWT and role.
- Redirect to `/sign-in` if unauthenticated, or show 403 if unauthorized.

## 7. Performance Optimization

- **Dynamic imports** (`next/dynamic`) for heavy components (TipTap editor, large charts).
- **Automatic code splitting** by route.
- **Image optimization** using Next.js `<Image>` component.
- **Tailwind JIT** ensures unused CSS is purged.
- **Cache headers and revalidation**: use `revalidate` on data-fetching functions.

## 8. Testing and Quality Assurance

**Unit Tests**
- **Vitest** (or Jest) for React components and utility functions.
- Test files colocated in `__tests__` directories or `*.test.tsx` alongside components.

**Integration Tests**
- Test API routes and service layers (`/services`) using in-memory databases or test DB.

**End-to-End Tests**
- **Playwright** (or Cypress) for critical user flows:
  - Signing up and logging in
  - Sending a message with attachment
  - Admin creating a user

**Linting and Formatting**
- **ESLint** with TypeScript rules.
- **Prettier** for consistent code style.
- **Husky** git hooks to run lint and tests on commits.

**Continuous Integration**
- GitHub Actions pipeline:
  1. Install dependencies
  2. Run lint
  3. Run type-check
  4. Run unit & integration tests
  5. Build and export static checks

## 9. Conclusion and Overall Frontend Summary

Our frontend setup uses a modern stack—Next.js 15, React 19, and TypeScript—backed by Tailwind CSS and shadcn/ui for consistent styling. We emphasize type safety from database to UI, follow component-driven development for maintainability, and integrate real-time messaging, AI assistance, and file storage out of the box. By adhering to clear design principles (usability, accessibility, responsiveness), a structured folder layout, and rigorous testing practices, we ensure our codebase can scale with the Enterprise Platform for Operational Performance’s future needs.