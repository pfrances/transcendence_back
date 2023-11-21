export interface GetUserBy42Id {
  user42Id: number;
}

export interface GetUserById {
  userId: number;
}

export interface GetUserByNickname {
  nickname: string;
}

export type GetUserTemplate = GetUserBy42Id | GetUserById | GetUserByNickname;
