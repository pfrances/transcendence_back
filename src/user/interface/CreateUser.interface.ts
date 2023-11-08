export interface Create42User {
  user42Id: number;
  nickname?: string;
  email: string;
  avatarUrl?: string;
}

export interface CreateStandardUser {
  nickname?: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

export type CreateUserTemplate = Create42User | CreateStandardUser;
