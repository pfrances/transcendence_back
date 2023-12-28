export interface Create42User {
  user42Id: number;
  nickname: string;
  email: string;
  avatar?: Express.Multer.File;
  avatarUrl?: string;
}

export interface CreateStandardUser {
  nickname: string;
  email: string;
  password: string;
  avatar?: Express.Multer.File;
}

export type CreateUserTemplate = Create42User | CreateStandardUser;
