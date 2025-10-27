import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  boolean,
  integer,
  jsonb,
  pgIndex,
  uniqueIndex
} from "drizzle-orm/pg-core";

// Enums for user roles and other constants
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER"]);
export const conversationTypeEnum = pgEnum("conversation_type", ["DM", "GROUP", "PROJECT"]);
export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "DONE"]);
export const taskPriorityEnum = pgEnum("task_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const projectMemberRoleEnum = pgEnum("project_member_role", ["OWNER", "MAINTAINER", "CONTRIBUTOR"]);
export const calendarEventSourceEnum = pgEnum("calendar_event_source", ["MANUAL", "MESSAGE_EXTRACT"]);
export const notificationTypeEnum = pgEnum("notification_type", ["MESSAGE", "TASK_ASSIGNED", "PROJECT_INVITE", "REMINDER", "SYSTEM"]);

// Core user table - enhanced version of the existing better-auth user
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("USER"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  emailIdx: pgIndex("idx_users_email").on(table.email),
  nameIdx: pgIndex("idx_users_name").on(table.name),
  roleIdx: pgIndex("idx_users_role").on(table.role)
}));

// FCM tokens for push notifications
export const fcmTokens = pgTable("fcm_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(), // 'web', 'ios', 'android'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at")
}, (table) => ({
  userIdIdx: pgIndex("idx_fcm_tokens_user_id").on(table.userId)
}));

// Organizational structure
export const divisions = pgTable("divisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references(() => divisions.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  nameIdx: pgIndex("idx_divisions_name").on(table.name),
  parentIdIdx: pgIndex("idx_divisions_parent_id").on(table.parentId)
}));

export const divisionMembers = pgTable("division_members", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  divisionId: uuid("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
  roleInDivision: text("role_in_division").notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow()
}, (table) => ({
  uniqueUserDivision: uniqueIndex("idx_unique_user_division").on(table.userId, table.divisionId),
  userIdIdx: pgIndex("idx_division_members_user_id").on(table.userId),
  divisionIdIdx: pgIndex("idx_division_members_division_id").on(table.divisionId)
}));

// Conversations and messaging
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: conversationTypeEnum("type").notNull(),
  title: text("title"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  createdByIdx: pgIndex("idx_conversations_created_by").on(table.createdBy),
  projectIdIdx: pgIndex("idx_conversations_project_id").on(table.projectId),
  typeIdx: pgIndex("idx_conversations_type").on(table.type),
  lastMessageAtIdx: pgIndex("idx_conversations_last_message_at").on(table.lastMessageAt)
}));

export const conversationMembers = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastReadMessageId: uuid("last_read_message_id").references(() => messages.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  hasLeft: boolean("has_left").notNull().default(false)
}, (table) => ({
  uniqueConversationUser: uniqueIndex("idx_unique_conversation_user").on(table.conversationId, table.userId),
  conversationIdIdx: pgIndex("idx_conversation_members_conversation_id").on(table.conversationId),
  userIdIdx: pgIndex("idx_conversation_members_user_id").on(table.userId)
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  bodyRich: jsonb("body_rich").notNull(), // Rich text content (TipTap JSON)
  bodyPlain: text("body_plain").notNull(), // Plain text for search
  isEdited: boolean("is_edited").notNull().default(false),
  editedAt: timestamp("edited_at"),
  replyToId: uuid("reply_to_id").references(() => messages.id), // For threading
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  conversationIdIdx: pgIndex("idx_messages_conversation_id").on(table.conversationId),
  senderIdIdx: pgIndex("idx_messages_sender_id").on(table.senderId),
  replyToIdIdx: pgIndex("idx_messages_reply_to_id").on(table.replyToId),
  createdAtIdx: pgIndex("idx_messages_created_at").on(table.createdAt),
  // Full-text search index
  bodyPlainSearchIdx: pgIndex("idx_messages_body_plain_search").using("gin", table.bodyPlain)
}));

export const messageReactions = pgTable("message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  uniqueMessageUserEmoji: uniqueIndex("idx_unique_message_user_emoji").on(table.messageId, table.userId, table.emoji),
  messageIdIdx: pgIndex("idx_message_reactions_message_id").on(table.messageId),
  userIdIdx: pgIndex("idx_message_reactions_user_id").on(table.userId)
}));

// File attachments
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  uploaderId: uuid("uploader_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull().unique(), // MinIO key
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  messageIdIdx: pgIndex("idx_attachments_message_id").on(table.messageId),
  projectIdIdx: pgIndex("idx_attachments_project_id").on(table.projectId),
  uploaderIdIdx: pgIndex("idx_attachments_uploader_id").on(table.uploaderId),
  filenameIdx: pgIndex("idx_attachments_filename").using("gin", table.filename)
}));

// Projects and tasks
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  divisionId: uuid("division_id").references(() => divisions.id),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, ARCHIVED, CANCELLED
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  nameIdx: pgIndex("idx_projects_name").using("gin", table.name),
  createdByIdx: pgIndex("idx_projects_created_by").on(table.createdBy),
  divisionIdIdx: pgIndex("idx_projects_division_id").on(table.divisionId),
  statusIdx: pgIndex("idx_projects_status").on(table.status)
}));

export const projectMembers = pgTable("project_members", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: projectMemberRoleEnum("role").notNull().default("CONTRIBUTOR"),
  joinedAt: timestamp("joined_at").notNull().defaultNow()
}, (table) => ({
  uniqueProjectUser: uniqueIndex("idx_unique_project_user").on(table.projectId, table.userId),
  projectIdIdx: pgIndex("idx_project_members_project_id").on(table.projectId),
  userIdIdx: pgIndex("idx_project_members_user_id").on(table.userId)
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  status: taskStatusEnum("status").notNull().default("TODO"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  projectIdIdx: pgIndex("idx_tasks_project_id").on(table.projectId),
  assigneeIdIdx: pgIndex("idx_tasks_assignee_id").on(table.assigneeId),
  reporterIdIdx: pgIndex("idx_tasks_reporter_id").on(table.reporterId),
  statusIdx: pgIndex("idx_tasks_status").on(table.status),
  priorityIdx: pgIndex("idx_tasks_priority").on(table.priority),
  dueDateIdx: pgIndex("idx_tasks_due_date").on(table.dueDate),
  titleIdx: pgIndex("idx_tasks_title").using("gin", table.title)
}));

// Calendar and events
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  isAllDay: boolean("is_all_day").notNull().default(false),
  source: calendarEventSourceEnum("source").notNull().default("MANUAL"),
  reminderMinutes: integer("reminder_minutes"), // Minutes before event to remind
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: pgIndex("idx_calendar_events_user_id").on(table.userId),
  projectIdIdx: pgIndex("idx_calendar_events_project_id").on(table.projectId),
  startsAtIdx: pgIndex("idx_calendar_events_starts_at").on(table.startsAt),
  titleIdx: pgIndex("idx_calendar_events_title").using("gin", table.title)
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"), // Additional data in JSON format
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: pgIndex("idx_notifications_user_id").on(table.userId),
  typeIdx: pgIndex("idx_notifications_type").on(table.type),
  isReadIdx: pgIndex("idx_notifications_is_read").on(table.isRead),
  createdAtIdx: pgIndex("idx_notifications_created_at").on(table.createdAt)
}));

// System settings
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false), // Whether clients can access this
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  keyIdx: pgIndex("idx_settings_key").on(table.key)
}));

// Audit logging
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., "user.created", "project.updated"
  target: text("target").notNull(), // e.g., "user:123", "project:456"
  metadata: jsonb("metadata"), // Additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  actorIdIdx: pgIndex("idx_audit_logs_actor_id").on(table.actorId),
  actionIdx: pgIndex("idx_audit_logs_action").on(table.action),
  targetIdx: pgIndex("idx_audit_logs_target").on(table.target),
  createdAtIdx: pgIndex("idx_audit_logs_created_at").on(table.createdAt)
}));

// Password reset tokens (more secure than generic verification)
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdIdx: pgIndex("idx_password_reset_tokens_user_id").on(table.userId),
  tokenIdx: pgIndex("idx_password_reset_tokens_token").on(table.token),
  expiresAtIdx: pgIndex("idx_password_reset_tokens_expires_at").on(table.expiresAt)
}));