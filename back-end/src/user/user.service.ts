import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {EditUserDto} from './dto';
import * as argon from 'argon2';
import {PrismaService} from 'src/prisma/prisma.service';
import {CreateUserTemplate, GetUserTemplate} from './interface';
import {SignInDto} from 'src/auth/dto';
import {JwtTokenPayload} from 'src/auth/interface';
import {UserPublicProfile} from 'src/shared/HttpEndpoints/interfaces';
import {HttpEditMe} from 'src/shared/HttpEndpoints/user';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async editUserInfo(userInfo: GetUserTemplate, dto: EditUserDto): Promise<HttpEditMe.resTemplate> {
    try {
      if (dto.password) dto.password = await argon.hash(dto.password);
      const userModelInfo = {email: dto.email, password: dto.password};
      const profileModelInfo = {nickname: dto.nickname, avatarUrl: dto.avatarUrl};
      const user = await this.prisma.user.update({
        where: {...userInfo},
        select: {
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
        data: {
          ...userModelInfo,
          profile: {update: {...profileModelInfo}},
        },
      });
      return user?.profile;
    } catch (err) {
      if (err.code === 'P2002')
        throw new ConflictException(
          `unable to update the field ${err.meta.target} because the value is not available`,
        );
    }
  }

  async getUserPublicInfo(userInfo: GetUserTemplate): Promise<UserPublicProfile> {
    if ('user42Id' in userInfo) {
      const user = await this.prisma.user.findUnique({
        where: {...userInfo},
        select: {profile: {select: {userId: true, nickname: true, avatarUrl: true}}},
      });
      return user?.profile;
    }
    return await this.prisma.profile.findUnique({
      where: {...userInfo},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
  }

  async verifyUserCredential({nickname, password}: SignInDto): Promise<JwtTokenPayload> {
    const user = await this.prisma.user.findFirst({
      where: {profile: {nickname}},
      select: {userId: true, password: true},
    });
    if (user && (await argon.verify(user.password, password)))
      return {userId: user.userId, nickname};
    throw new UnauthorizedException('invalid credential');
  }

  async createUser(dto: CreateUserTemplate): Promise<UserPublicProfile> {
    try {
      if ('password' in dto) dto.password = await argon.hash(dto.password);
      const {nickname, avatarUrl, ...userInfo} = dto;
      const user = await this.prisma.user.create({
        data: {
          ...userInfo,
          profile: {create: {nickname, avatarUrl}},
        },
        select: {
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
      });
      return user?.profile;
    } catch (err) {
      if (err.code === 'P2002')
        throw new ConflictException(
          `unable to create the user. ${err.meta.target} is not available`,
        );
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
