import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {EditUserDto} from './dto';
import {PrismaService} from 'src/prisma/prisma.service';
import {CreateUserTemplate, GetUserBy42Id, GetUserById, GetUserTemplate} from './interface';
import {SignInDto} from 'src/auth/dto';
import {JwtTokenPayload} from 'src/auth/interface';
import {UserPublicProfile} from 'src/shared/HttpEndpoints/interfaces';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';
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
  ): Promise<HttpEditMe.resTemplate> {
    try {
      if (dto.password) dto.password = await this.hashManager.hash(dto.password);
      const userModelInfo = {email: dto.email, password: dto.password};
      const profileModelInfo = {nickname: dto.nickname, avatarUrl: dto.avatarUrl};
      let findInfo = {...userInfo};

      const user = await this.prisma.user.update({
        where: {...findInfo},
        select: {
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
        data: {
          ...userModelInfo,
          profile: {update: {...profileModelInfo}},
        },
      });
      if (!user?.profile) throw new Error('unable to update the user');
      return user.profile;
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

  async verifyUserCredential({nickname, password}: SignInDto): Promise<JwtTokenPayload> {
    const user = await this.prisma.user.findFirst({
      where: {profile: {nickname}},
      select: {userId: true, password: true},
    });
    if (!user) throw new UnauthorizedException('invalid credential');
    if (!user.password) throw new UnauthorizedException('invalid credential');
    const isValidPassword = await this.hashManager.verify(user.password, password);
    if (isValidPassword) return {userId: user.userId, nickname};
    throw new UnauthorizedException('invalid credential');
  }

  async createUser(dto: CreateUserTemplate): Promise<UserPublicProfile> {
    try {
      if ('password' in dto) dto.password = await this.hashManager.hash(dto.password);
      const {nickname, avatarUrl, ...userInfo} = dto;
      const profile = await this.prisma.profile.create({
        data: {user: {create: {...userInfo}}, nickname, avatarUrl},
        select: {userId: true, nickname: true, avatarUrl: true},
      });
      if (!profile) throw new Error('unable to create the user');
      return profile;
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
  ): Promise<UserPublicProfile> {
    let profile = await this.getUserPublicInfo(getInfo);
    if (!profile) profile = await this.createUser(createInfo);
    return profile;
  }
}
