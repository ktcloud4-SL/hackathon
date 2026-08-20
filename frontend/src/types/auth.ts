import type { AgencyType } from "./report";

export type UserRole = "CITIZEN" | "AGENCY" | "ADMIN";

export interface UserPublic {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  agencyType: AgencyType | null;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserPublic;
}
