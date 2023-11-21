import {JwtService} from '../../../src/jwt/jwt.service';
import {UserPublicProfile} from '../../../src/shared/HttpEndpoints/interfaces';
import {CreateStandardUser} from '../../../src/user/interface';
import {UserService} from '../../../src/user/user.service';

export const createUserData: CreateStandardUser[] = [
  {email: 'test1@gmail.com', password: 'test1', nickname: 'test1'},
  {email: 'test2@gmail.com', password: 'test2', nickname: 'test2'},
  {email: 'test3@gmail.com', password: 'test3', nickname: 'test3'},
  {email: 'test4@gmail.com', password: 'test4', nickname: 'test4'},
];

export interface IdefaultUserData {
  userId: number;
  privateInfo: {email: string; password: string};
  publicProfile: UserPublicProfile;
  authToken: string;
}

export async function createDefaultUser(
  user: UserService,
  jwt: JwtService,
): Promise<IdefaultUserData[]> {
  const userProfiles: UserPublicProfile[] = [];
  const res: IdefaultUserData[] = [];

  await Promise.race(
    createUserData.map(async data => userProfiles.push(await user.createUser(data))),
  );
  await Promise.race(
    userProfiles.map(async (elem, index) => {
      const {email, password, nickname, avatarUrl} = createUserData[index];
      const userId = elem.userId;
      const authToken = await jwt.createAuthToken({userId, nickname});
      res.push({
        userId,
        privateInfo: {email, password},
        publicProfile: {
          userId,
          nickname,
          avatarUrl: avatarUrl || null,
        },
        authToken,
      });
    }),
  );
  return res;
}
