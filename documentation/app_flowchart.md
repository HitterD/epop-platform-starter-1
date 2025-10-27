flowchart TD
  Start[Start] --> Landing[Landing Page]
  Landing --> SignIn[Sign In]
  SignIn --> Auth{Valid Credentials}
  Auth -->|Yes| Dashboard[Dashboard]
  Auth -->|No| SignIn
  Dashboard --> Projects[Projects]
  Dashboard --> Messages[Messages]
  Dashboard --> AI[AI Assistant]
  Dashboard --> Files[File Storage]
  Dashboard --> AdminAccess{Admin Role}
  AdminAccess -->|Yes| AdminPanel[Admin Panel]
  AdminAccess -->|No| Dashboard
  Projects --> ProjectDetail[Project Detail]
  ProjectDetail --> Dashboard
  Messages --> Chat[Chat Conversation]
  Chat --> Dashboard
  AI --> Chat
  Files --> Upload[Upload File]
  Upload --> Dashboard