# Frontend Guidelines Document

This document outlines the frontend architecture, design principles, technologies, and best practices used in the EPOP Platform Starter. It’s written in everyday language to ensure everyone—regardless of technical background—can understand how the frontend is structured and why certain choices were made.

---

## 1. Frontend Architecture

### Overview
- **Framework:** Next.js 15 with the App Router, handling both pages and API routes in one codebase.  
- **Language:** TypeScript for type safety from UI to data layer.  
- **UI Library:** shadcn/ui built on React Server Components and React Client Components.  
- **Styling:** Tailwind CSS with a utility-first approach.  
- **Theming:** `next-themes` for light/dark mode support.  
- **State Management:** React Context API for authentication and real-time data (Socket.IO).  

### Scalability & Maintainability
- **Modular Structure:** Folders split by feature (`/components`, `/contexts`, `/app/api`) keep code focused and easy to navigate.  
- **Server Components:** Faster first-load times since data fetching happens on the server, reducing client bundle size.  
- **Type-Driven Development:** TypeScript and Zod schemas ensure consistent data shapes across UI and API.  
- **Clear Separation of Concerns:** UI, business logic, data access, and services each have dedicated folders, making it straightforward to extend or refactor.

---

## 2. Design Principles

### Key Principles
1. **Usability:** Simple, predictable interfaces—users know where they are and how to navigate.  
2. **Accessibility:** Built-in support for keyboard navigation, ARIA attributes, and color contrast compliance.  
3. **Responsiveness:** Mobile-first design; layouts adapt seamlessly from phones to large desktops.  
4. **Consistency:** A shared component library (`shadcn/ui` + Tailwind) ensures uniform look-and-feel.  

### How They’re Applied
- **Semantic HTML:** Headings, landmarks, and form elements used correctly for screen readers.  
- **Focus States & Keyboard Support:** Interactive elements clearly indicate focus, and all controls are reachable via keyboard.  
- **Responsive Utility Classes:** Tailwind breakpoints (`sm`, `md`, `lg`, `xl`) deliver fine control over layouts across devices.  
- **Accessible Components:** `shadcn/ui` components come with built-in ARIA roles (e.g., modals, dropdowns).

---

## 3. Styling and Theming

### Styling Approach
- **Utility-First CSS:** Tailwind CSS powers all styles. We avoid large custom stylesheets by composing small, reusable utility classes directly in JSX.  
- **No BEM/SMACSS:** Tailwind’s design encourages component-level styling without complex naming conventions.  
- **Preprocessor:** Not needed—Tailwind’s JIT compiler handles CSS generation.

### Theming
- **Light & Dark Modes:** Managed by `next-themes`. Tailwind CSS uses CSS variables for colors that swap based on the theme.  
- **Global Styles:** A minimal `globals.css` file imports Tailwind’s base, components, and utilities, and sets up custom CSS variables.

### Visual Style
- **Modern Flat Design:** Clean edges, minimal shadows, clear typography, and deliberate use of color for emphasis.  
- **Glassmorphism Elements (Optional):** Subtle frosted-glass backgrounds for modals or overlays by combining backdrop filters and opacity utilities.

### Color Palette
| Role            | Light Mode Hex | Dark Mode Hex  | Description                 |
|-----------------|----------------|----------------|-----------------------------|
| Primary         | #2563EB        | #3B82F6        | Buttons, links             |
| Secondary       | #10B981        | #34D399        | Accents, success states    |
| Accent          | #F59E0B        | #FBBF24        | Warnings, highlights       |
| Background      | #F9FAFB        | #111827        | Page backgrounds           |
| Surface         | #FFFFFF        | #1F2937        | Cards, modals              |
| Neutral         | #6B7280        | #9CA3AF        | Text, borders              |
| Error           | #EF4444        | #F87171        | Error messages, alerts     |

### Typography
- **Font Family:** Inter (system fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)  
- **Font Sizes:** Tailwind’s scale (`text-sm` through `text-2xl`) for consistency.  
- **Line Height & Spacing:** Use Tailwind’s `leading-relaxed`, `tracking-wide`, and space utilities for whitespace around text.

---

## 4. Component Structure

### Organization
- `/components` holds reusable pieces grouped by domain:
  - `ui/`: Wrapped or extended `shadcn/ui` components (Buttons, Inputs, Modals).  
  - `ai/`: AI chat interfaces, message lists.  
  - `common/`: Shared layouts or utilities.

### Best Practices
- **Atomic Components:** Start small (Button, Card), then compose into larger patterns (Form, ChatWindow).  
- **Single Responsibility:** Each component handles one piece of UI or behavior.  
- **Configurable via Props:** Avoid hard-coded values; expose necessary props for flexibility.  
- **File Naming:** PascalCase files with same name as exported component.

### Benefits
- **Reusability:** One source of truth for shared UI elements reduces duplication.  
- **Maintainability:** Fix or update in one place; changes propagate throughout the app.

---

## 5. State Management

### Approach
- **React Context API:** Two primary contexts:
  1. **AuthContext:** Tracks user session, roles, and login/logout methods.  
  2. **SocketContext:** Manages Socket.IO connection, event listeners, and message dispatching.
- **Local State Hooks:** `useState` and `useReducer` for form inputs or transient UI states.  

### Data Flow
1. **Global data** (user info, socket instance) is stored in context providers at the top level in `/app/layout.tsx`.  
2. **Components** consume contexts via `useContext()`.  
3. **Updates** (e.g., new message arrival) trigger context state changes, which rerender relevant components.

### Why It Works
- **Avoid Prop Drilling:** Context lets deeply nested components access shared state without passing props through every level.  
- **Predictable Updates:** State lives in one place, making debugging and tracing easier.

---

## 6. Routing and Navigation

### Next.js App Router
- **File-Based Routing:** Pages and nested layouts live in `/app`. A folder named `profile/page.tsx` corresponds to `/profile`.  
- **Layouts:** Wrap groups of pages (e.g., `/app/(auth)/layout.tsx` for login/register).  
- **Dynamic Routes:** Bracket syntax (`[id]/page.tsx`) for user profiles or chat rooms.

### Navigation
- **Link Component:** Use Next.js `<Link>` for client-side transitions.  
- **Active States:** Tailwind classes combined with the `usePathname()` hook to highlight current nav item.  
- **Protected Routes:** Middleware or server component checks for authentication and redirects unauthorized users.

---

## 7. Performance Optimization

### Key Strategies
1. **Server Components:** Fetch data on the server to reduce client bundle size.  
2. **Code Splitting & Lazy Loading:** Dynamic `import()` for large components (e.g., AI chat), Tailwind JIT ensures only used CSS is shipped.  
3. **Image Optimization:** Next.js `<Image>` for automatic resizing and lazy loading.  
4. **Asset Caching:** Leveraging HTTP caching headers for static assets and `Cache-Control` on API responses.  
5. **Memoization:** `React.memo`, `useMemo`, and `useCallback` for expensive computations or frequently re-rendered components.

### Impact on UX
- Faster first-contentful paint (FCP), lower time to interactive (TTI), and smoother interactions—especially on mobile or slower networks.

---

## 8. Testing and Quality Assurance

### Unit Testing
- **Framework:** Jest with React Testing Library.  
- **Scope:** Individual functions in `/lib/utils`, small components in `/components/ui`.

### Integration Testing
- **Tools:** Jest or Vitest plus `@testing-library/react` for component + context combinations, API route handlers in `/app/api`.

### End-to-End (E2E)
- **Framework:** Cypress or Playwright.  
- **Flows:** Login, registration, chat messaging, file uploads.

### Automated Checks
- **Linting:** ESLint with TypeScript plugin, Next.js recommended rules.  
- **Formatting:** Prettier for consistent code style.  
- **Accessibility Audits:** `axe-core` or Lighthouse to catch color contrast or ARIA issues.

---

## 9. Conclusion and Overall Summary

The EPOP Platform Starter’s frontend is built for modern web applications, emphasizing:
- **Scalability:** Modular code, server components, and type-driven development.  
- **Maintainability:** Clear folder structure, shared UI library, and consistent styling.  
- **Performance:** SSR, code splitting, and optimized asset handling.  
- **User-Centric Design:** Accessibility, responsive layouts, and theming for user comfort.

This guide captures all key decisions—from architecture to testing—ensuring anyone can pick up the codebase, understand its organization, and continue building with confidence.