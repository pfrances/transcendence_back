import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {EditUserDto} from './dto';
import {PrismaService} from 'src/prisma/prisma.service';
import {CreateUserTemplate, GetUserBy42Id, GetUserById, GetUserTemplate} from './interface';
import {SignInDto} from 'src/auth/dto';
import {UserPrivateProfile, UserPublicProfile} from 'src/shared/HttpEndpoints/interfaces';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime/library';
import {HashManagerService} from 'src/hashManager/hashManager.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashManager: HashManagerService,
  ) {}

  async getUserIdByNickname(nickname: string): Promise<number> {
    const user = await this.prisma.profile.findUnique({where: {nickname}, select: {userId: true}});
    if (!user) throw new Error(`user with nickname '${nickname}' not found`);
    return user.userId;
  }

  async getAllUsersPublicInfo(): Promise<UserPublicProfile[]> {
    const users = await this.prisma.profile.findMany({
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    return users;
  }

  async editUserInfo(
    userInfo: GetUserBy42Id | GetUserById,
    dto: EditUserDto,
  ): Promise<UserPrivateProfile> {
    try {
      if (dto.password) dto.password = await this.hashManager.hash(dto.password);
      const userModelInfo = {email: dto.email, password: dto.password};
      const profileModelInfo = {nickname: dto.nickname, avatarUrl: dto.avatarUrl};
      let findInfo = {...userInfo};

      const user = await this.prisma.user.update({
        where: {...findInfo},
        select: {
          email: true,
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
        data: {
          ...userModelInfo,
          profile: {update: {...profileModelInfo}},
        },
      });
      if (!user?.profile) throw new Error('unable to update the user');
      return {...user.profile, email: user.email};
    } catch (err: PrismaClientKnownRequestError | any) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002')
        throw new ConflictException(
          `unable to update the field ${err.meta?.target} because the value is not available`,
        );
      throw err;
    }
  }

  async getUserPublicInfo(userInfo: GetUserTemplate): Promise<UserPublicProfile> {
    if ('user42Id' in userInfo) {
      const user = await this.prisma.user.findUnique({
        where: {...userInfo},
        select: {profile: {select: {userId: true, nickname: true, avatarUrl: true}}},
      });
      if (!user?.profile) throw new Error('user profile not found');
      return user.profile;
    }
    const user = await this.prisma.profile.findUnique({
      where: {...userInfo},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!user) throw new Error('user profile not found');
    return user;
  }

  async getUserPrivateInfo(userInfo: GetUserTemplate): Promise<UserPrivateProfile> {
    if ('user42Id' in userInfo) {
      const user = await this.prisma.user.findUnique({
        where: {...userInfo},
        select: {email: true, profile: {select: {userId: true, nickname: true, avatarUrl: true}}},
      });
      if (!user?.profile) throw new Error('user profile not found');
      return {...user.profile, email: user.email};
    }
    const user = await this.prisma.profile.findUnique({
      where: {...userInfo},
      select: {userId: true, nickname: true, avatarUrl: true, user: {select: {email: true}}},
    });
    if (!user) throw new Error('user profile not found');
    return {...user, email: user.user.email};
  }

  async verifyUserCredential({nickname, password}: SignInDto): Promise<UserPrivateProfile> {
    const profile = await this.prisma.profile.findFirst({
      where: {nickname},
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
        user: {select: {email: true, password: true}},
      },
    });
    if (!profile) throw new UnauthorizedException('invalid credential');
    if (!profile.user) throw new InternalServerErrorException("profile don't have user");
    if (!profile.user.password) throw new UnauthorizedException('invalid credential');
    const isValidPassword = await this.hashManager.verify(profile.user.password, password);
    if (!isValidPassword) throw new UnauthorizedException('invalid credential');
    return {...profile, email: profile.user.email};
  }

  async createUser(dto: CreateUserTemplate): Promise<UserPrivateProfile> {
    try {
      if ('password' in dto) dto.password = await this.hashManager.hash(dto.password);
      const {nickname, avatarUrl, ...userInfo} = dto;
      const profile = await this.prisma.profile.create({
        data: {user: {create: {...userInfo}}, nickname, avatarUrl},
        select: {userId: true, nickname: true, avatarUrl: true, user: {select: {email: true}}},
      });
      if (!profile) throw new Error('unable to create the user');
      return {...profile, email: profile.user.email};
    } catch (err: PrismaClientKnownRequestError | any) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002')
        throw new ConflictException(
          `unable to create the user. ${err.meta?.target} is not available`,
        );
      throw err;
    }
  }

  async getOrCreateUser(
    getInfo: GetUserTemplate,
    createInfo: CreateUserTemplate,
    force: boolean = false,
  ): Promise<UserPrivateProfile> {
    try {
      return await this.getUserPrivateInfo(getInfo);
    } catch (err) {
      try {
        return await this.createUser(createInfo);
      } catch (err) {
        if (err instanceof ConflictException && force) {
          createInfo.nickname = `${createInfo.nickname}_${Date.now()}`;
          return await this.createUser(createInfo);
        }
        throw err;
      }
    }
  }
}
