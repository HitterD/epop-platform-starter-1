flowchart TD
  Browser --> AuthPages
  AuthPages -->|Submit Credentials| AuthAPI
  AuthAPI -->|Issue JWT| Browser
  Browser --> AppPages
  AppPages --> UIComponents
  UIComponents --> APIRequests
  APIRequests --> APIHandler
  APIHandler --> AuthService
  APIHandler --> DBPostgres
  APIHandler --> AIService
  APIHandler --> StorageService
  AppPages --> SocketClient
  SocketClient --> SocketServer
  SocketServer --> DBPostgres
  SocketServer --> APIHandler