import { z } from "zod";

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );

// User registration schema
export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(255, "Email is too long"),
  password: passwordSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  role: z.enum(["ADMIN", "USER"]).optional().default("USER")
});

// User login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required")
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
});

// Password reset confirmation schema
export const passwordResetConfirmSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required"),
  password: passwordSchema
});

// User update schema
export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(255, "Email is too long")
    .optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional()
});

// FCM token registration schema
export const fcmTokenSchema = z.object({
  token: z
    .string()
    .min(1, "FCM token is required"),
  platform: z
    .enum(["web", "ios", "android"])
    .default("web")
});

// Types inferred from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;