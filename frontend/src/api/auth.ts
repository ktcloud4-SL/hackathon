import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserPublic,
} from "../types/auth";
import { requestJson } from "./http";

const USER_STORAGE_KEY = "onereport:current-user";

export function register(input: RegisterInput): Promise<UserPublic> {
  return requestJson<UserPublic>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(input: LoginInput): Promise<UserPublic> {
  const response = await requestJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.user;
}

export function getCurrentUser(): Promise<UserPublic> {
  return requestJson<UserPublic>("/api/auth/me");
}

export function logout(): Promise<void> {
  return requestJson<void>("/api/auth/logout", { method: "POST" });
}

export function saveCurrentUser(user: UserPublic) {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function loadCurrentUser(): UserPublic | null {
  const stored = sessionStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as UserPublic;
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function clearCurrentUser() {
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

export function createDemoCitizen(name: string, email: string): UserPublic {
  return {
    id: 1,
    email,
    name: name.trim() || email.split("@")[0] || "시민 사용자",
    role: "CITIZEN",
    agencyType: null,
  };
}
