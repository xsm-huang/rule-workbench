import type { WorkbenchPermission } from "./permissions.js";

export const USER_ROLES = {
  VIEWER: "VIEWER",
  EDITOR: "EDITOR",
  REVIEWER: "REVIEWER",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface LogoutResult {
  loggedOut: true;
}

export interface AuthSession {
  user: AuthUser;
  permissions: WorkbenchPermission[];
}
