import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {EditUserDto} from './dto';
import {PrismaService} from 'src/prisma/prisma.service';
import {CreateUserTemplate, GetUserBy42Id, GetUserById, GetUserTemplate} from './interface';
import {SignInDto} from 'src/auth/dto';
import {
  UserPrivateProfile,
  UserPublicProfile,
  UserPublicProfileRegardingMe,
} from 'src/shared/HttpEndpoints/interfaces';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime/library';
import {HashManagerService} from 'src/hashManager/hashManager.service';
import {ImageService} from 'src/image/image.service';
import {filterDefinedProperties} from 'src/shared/sharedUtilities/utils.functions.';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {WsUserBlocking} from 'src/shared/WsEvents/user/userBlocking';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashManager: HashManagerService,
    private readonly image: ImageService,
    private readonly room: WsRoomService,
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
    return users.map(user => ({...user, isOnline: WsSocketService.isOnline(user.userId)}));
  }

  async isBlockedBy(userId: number, targetUserId: number): Promise<boolean> {
    const blockedUser = await this.prisma.blockedUser.findUnique({
      where: {userId_blockedUserId: {userId, blockedUserId: targetUserId}},
    });
    return !!blockedUser;
  }

  async editUserInfo(
    userInfo: GetUserBy42Id | GetUserById,
    dto: EditUserDto,
  ): Promise<UserPrivateProfile> {
    let avatarUrl: string | undefined;
    if (dto.avatar)
      avatarUrl = await this.image.uploadFile(dto.avatar.originalname, dto.avatar.buffer);
    try {
      if (dto.password) dto.password = await this.hashManager.hash(dto.password);
      const userModelInfo = {email: dto.email, password: dto.password, hasSet2Fa: dto.hasSet2Fa};
      const profileModelInfo = {nickname: dto.nickname, avatarUrl};

      const user = await this.prisma.user.update({
        where: {...filterDefinedProperties(userInfo)},
        select: {
          email: true,
          hasSet2Fa: true,
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
        data: {
          ...userModelInfo,
          profile: {update: {...profileModelInfo}},
        },
      });
      if (!user?.profile) throw new InternalServerErrorException('unable to update the user');
      this.room.broadcastToAll({
        eventName: 'userProfileUpdate',
        message: {
          user: {
            ...user.profile,
            isOnline: WsSocketService.isOnline(user.profile.userId),
          },
        },
      });
      return {...user.profile, email: user.email, hasSet2Fa: user.hasSet2Fa};
    } catch (err: PrismaClientKnownRequestError | any) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002')
        throw new ConflictException(
          `unable to update the field ${err.meta?.target} because the value is not available`,
        );
      throw err;
    }
  }

  async getUserPublicInfoRegardingMe(
    userId: number,
    targetUserId: number,
  ): Promise<UserPublicProfileRegardingMe> {
    const user = await this.prisma.profile.findUnique({
      where: {userId: targetUserId},
      select: {userId: true, nickname: true, avatarUrl: true, Friends: {select: {userId: true}}},
    });
    if (!user) throw new InternalServerErrorException('user profile not found');
    const isFriend = !!user.Friends.find(friend => friend.userId === userId);
    const isBlocked = await this.isBlockedBy(userId, targetUserId);
    const isOnline = WsSocketService.isOnline(user.userId);
    const status = WsSocketService.getUserStatus(targetUserId);

    const res: UserPublicProfileRegardingMe = {
      userId: user.userId,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      isOnline,
      isBlocked,
      isFriend,
      status,
    };
    return res;
  }

  async getUserPublicInfo(userInfo: GetUserTemplate): Promise<UserPublicProfile> {
    if ('user42Id' in userInfo) {
      const user = await this.prisma.user.findUnique({
        where: {...userInfo},
        select: {profile: {select: {userId: true, nickname: true, avatarUrl: true}}},
      });
      if (!user?.profile) throw new InternalServerErrorException('user profile not found');
      return {...user.profile, isOnline: WsSocketService.isOnline(user.profile.userId)};
    }
    const user = await this.prisma.profile.findUnique({
      where: {...userInfo},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!user) throw new InternalServerErrorException('user profile not found');
    return {...user, isOnline: WsSocketService.isOnline(user.userId)};
  }

  async getUserPrivateInfo(userInfo: GetUserTemplate): Promise<UserPrivateProfile> {
    if ('user42Id' in userInfo) {
      const user = await this.prisma.user.findUnique({
        where: {...userInfo},
        select: {
          email: true,
          hasSet2Fa: true,
          profile: {select: {userId: true, nickname: true, avatarUrl: true}},
        },
      });
      if (!user?.profile) throw new InternalServerErrorException('user profile not found');
      return {...user.profile, email: user.email, hasSet2Fa: user.hasSet2Fa};
    }
    const user = await this.prisma.profile.findUnique({
      where: {...userInfo},
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
        user: {select: {email: true, hasSet2Fa: true}},
      },
    });
    if (!user) throw new InternalServerErrorException('user profile not found');
    return {...user, email: user.user.email, hasSet2Fa: user.user.hasSet2Fa};
  }

  async verifyUserCredential({nickname, password}: SignInDto): Promise<UserPrivateProfile> {
    const profile = await this.prisma.profile.findFirst({
      where: {nickname},
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
        user: {select: {email: true, password: true, hasSet2Fa: true}},
      },
    });
    if (!profile) throw new UnauthorizedException('invalid credential');
    if (!profile.user) throw new InternalServerErrorException("profile don't have user");
    if (!profile.user.password) throw new UnauthorizedException('invalid credential');
    const isValidPassword = await this.hashManager.verify(profile.user.password, password);
    if (!isValidPassword) throw new UnauthorizedException('invalid credential');
    return {...profile, email: profile.user.email, hasSet2Fa: profile.user.hasSet2Fa};
  }

  async createUser(dto: CreateUserTemplate): Promise<UserPrivateProfile> {
    if ('password' in dto) dto.password = await this.hashManager.hash(dto.password);
    const {nickname, avatar, ...userInfo} = dto;

    let avatarUrl: string | undefined;
    if (avatar) avatarUrl = await this.image.uploadFile(avatar.originalname, avatar.buffer);

    try {
      const profile = await this.prisma.profile.create({
        data: {user: {create: {...userInfo}}, nickname, avatarUrl},
        select: {
          userId: true,
          nickname: true,
          avatarUrl: true,
          user: {select: {email: true, hasSet2Fa: true}},
        },
      });
      if (!profile) throw new ForbiddenException('unable to create the user');

      return {...profile, email: profile.user.email, hasSet2Fa: profile.user.hasSet2Fa};
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

  async blockUser(userId: number, targetUserId: number): Promise<void> {
    if (userId === targetUserId) throw new ConflictException('cannot block yourself');
    const profile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
      },
    });
    if (!profile) throw new ForbiddenException('user profile not found');
    try {
      await this.prisma.blockedUser.create({
        data: {userId, blockedUserId: targetUserId},
      });
    } catch (err: PrismaClientKnownRequestError | any) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002')
        throw new ConflictException('user already blocked');
      throw new ForbiddenException('unable to block the user:' + err?.message);
    }
    this.room.sendMessageToUser(
      targetUserId,
      new WsUserBlocking.Dto({
        type: 'block',
        user: {
          ...profile,
          isOnline: WsSocketService.isOnline(profile.userId),
        },
      }),
    );
  }

  async unblockUser(userId: number, targetUserId: number): Promise<void> {
    if (userId === targetUserId) throw new ConflictException('cannot unblock yourself');
    const profile = await this.prisma.profile.findUnique({
      where: {userId},
      select: {
        userId: true,
        nickname: true,
        avatarUrl: true,
      },
    });
    if (!profile) throw new ForbiddenException('user profile not found');
    try {
      await this.prisma.blockedUser.delete({
        where: {userId_blockedUserId: {userId, blockedUserId: targetUserId}},
      });
    } catch (err: PrismaClientKnownRequestError | any) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025')
        throw new ConflictException('user already unblocked');
      throw new ForbiddenException('unable to unblock the user:' + err?.message);
    }
    this.room.sendMessageToUser(
      targetUserId,
      new WsUserBlocking.Dto({
        type: 'unblock',
        user: {
          ...profile,
          isOnline: WsSocketService.isOnline(profile.userId),
        },
      }),
    );
  }
}
