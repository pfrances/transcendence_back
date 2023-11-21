import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreateChatDto, SendMessageDto} from 'src/chat/dto';
import {JoinChat, LeaveChat, UpdateChat} from 'src/chat/interface';
import {Role} from '@prisma/client';
import {HttpCreateChat, HttpGetAllMessage, HttpGetChatInfo} from 'src/shared/HttpEndpoints/chat';
import {WsChatJoin, WsChatLeave, WsChat_FromServer, WsNewMessage} from 'src/shared/WsEvents/chat';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {WsException} from '@nestjs/websockets';
import {HashManagerService} from 'src/hashManager/hashManager.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly room: WsRoomService,
    private readonly hashManager: HashManagerService,
  ) {}
  private readonly prefix: RoomNamePrefix = 'Chatroom-';

  async getUserJoinedChatIds(userId: number): Promise<number[]> {
    const joinedChats = await this.prisma.chatParticipation.findMany({
      where: {userId, hasLeaved: false},
      select: {chatId: true},
    });
    return joinedChats.map(chat => chat.chatId);
  }

  async createChat(userId: number, dto: CreateChatDto): Promise<HttpCreateChat.resTemplate> {
    const chat = await this.prisma.chat.create({
      data: {...dto, participants: {create: {userId, role: 'ADMIN'}}},
      select: {
        chatId: true,
        name: true,
        chatAvatarUrl: true,
        password: true,
        participants: {
          select: {
            role: true,
            userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
            mutedUntil: true,
            blockedUntil: true,
            hasLeaved: true,
          },
        },
      },
    });
    const hasPassword = chat?.password ? true : false;
    const {password, ...chatInfo} = chat;
    return {...chatInfo, hasPassword};
  }

  async updateChat(dto: UpdateChat): Promise<void> {
    const {chatId, userId, participants, ...chatInfo} = dto;
    const adminParticipation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      select: {role: true, hasLeaved: true},
    });
    if (!adminParticipation)
      throw new UnauthorizedException('This user is not present in this chat');
    if (adminParticipation.role === 'MEMBER')
      throw new UnauthorizedException('This user has no right to update chat information');
    if (adminParticipation.hasLeaved)
      throw new UnauthorizedException('This user has leaved the chat');
    if (Object.keys(chatInfo).length) {
      if (chatInfo.password) chatInfo.password = await this.hashManager.hash(chatInfo.password);
      await this.prisma.chat.update({
        where: {chatId},
        data: {...chatInfo},
      });
    }

    const now = Date.now();
    if (!participants) return;
    const participantData = participants.map(elem => {
      if (!elem) return;
      const {blockUntil, muteUntil, targetRole, kick} = elem;
      if (blockUntil && blockUntil.getTime() < now)
        throw new BadRequestException('Unable to block a user until a past date');
      if (muteUntil && muteUntil.getTime() < now)
        throw new BadRequestException('Unable to mute a user until a past date');
      if (elem.userId === userId)
        throw new UnauthorizedException("Unable to modify user's own participation settings");
      const res = {userId: elem.userId} as {
        userId: number;
        blockedUntil?: Date;
        mutedUntil?: Date;
        role?: Role;
        hasLeaved?: boolean;
      };
      if (blockUntil) {
        res['blockedUntil'] = blockUntil;
        res['hasLeaved'] = true;
      }
      if (muteUntil) res['mutedUntil'] = muteUntil;
      if (targetRole) res['role'] = targetRole;
      if (kick) res['hasLeaved'] = true;
      return res;
    });
    for (const participant of participantData) {
      if (!participant) continue;
      await this.prisma.chatParticipation.update({
        where: {chatId_userId: {chatId, userId: participant.userId}},
        data: {...participant},
      });
      if (participant['hasLeaved'])
        this.handleWsChatEvent(new WsChatLeave.Dto({chatId, userId: participant.userId}));
    }
  }

  async joinChat(dto: JoinChat, hasInvitation: boolean = false): Promise<void> {
    const {chatId, userId, password} = dto;
    const chat = await this.prisma.chat.findUnique({
      where: {chatId},
      select: {password: true, chatId: true},
    });
    if (!chat) throw new NotFoundException(`no such chat`);
    if (!hasInvitation && !(await this.hashManager.verify(password, chat?.password)))
      throw new UnauthorizedException(`invalid password`);

    const participation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId}},
      select: {hasLeaved: true, blockedUntil: true},
    });
    const blockedUntil = participation?.blockedUntil?.getTime();
    if (blockedUntil && blockedUntil > Date.now())
      throw new UnauthorizedException(`This user is still blocked until ${blockedUntil}`);
    if (participation?.hasLeaved === false) throw new BadRequestException(`user already joined`);
    if (participation?.hasLeaved) {
      await this.prisma.chatParticipation.update({
        where: {chatId_userId: {chatId, userId}},
        data: {hasLeaved: false},
      });
    } else {
      await this.prisma.chatParticipation.create({data: {chatId, userId}});
    }
    this.handleWsChatEvent(new WsChatJoin.Dto({chatId, userId}));
  }

  async getAllMessagesFromChatId(
    userId: number,
    chatId: number,
  ): Promise<HttpGetAllMessage.resTemplate> {
    const messages = await this.prisma.message.findMany({
      where: {chatParticipation: {chatId: chatId}},
      select: {messageId: true, createdAt: true, messageContent: true, userId: true},
      orderBy: {createdAt: 'asc'},
    });

    const participants = await this.prisma.chatParticipation.findMany({
      where: {chatId: chatId},
      select: {
        userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
        role: true,
        mutedUntil: true,
        blockedUntil: true,
        hasLeaved: true,
      },
    });

    for (const participation of participants) {
      if (participation.userProfile.userId === userId && !participation?.hasLeaved)
        return {messages, participants};
    }

    throw new UnauthorizedException('This user has no access to this chat');
  }

  async getChatInfo(chatId: number): Promise<HttpGetChatInfo.resTemplate> {
    const chat = await this.prisma.chat.findUnique({
      where: {chatId},
      select: {
        participants: {
          select: {
            userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
            role: true,
            mutedUntil: true,
            blockedUntil: true,
            hasLeaved: true,
          },
        },
        chatId: true,
        name: true,
        chatAvatarUrl: true,
        password: true,
      },
    });
    if (!chat) throw new NotFoundException(`no such chat`);
    const hasPassword = chat?.password ? true : false;
    const {password, ...chatInfo} = chat;
    return {...chatInfo, hasPassword};
  }
  async sendMessage(userId: number, {chatId, messageContent}: SendMessageDto): Promise<void> {
    const participation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId}},
      select: {
        hasLeaved: true,
        chatId: true,
        userId: true,
        blockedUntil: true,
        mutedUntil: true,
      },
    });
    if (!participation) throw new WsException('no such chat available for this user');
    const now = Date.now();
    const {hasLeaved, blockedUntil, mutedUntil} = participation;
    if (hasLeaved) throw new WsException('user has already leaved this chat');
    if (blockedUntil && blockedUntil.getTime() > now) throw new WsException('user still blocked');
    if (mutedUntil && mutedUntil.getTime() > now) throw new WsException('user still mute');
    try {
      const {messageId} = await this.prisma.message.create({
        data: {userId, chatId, messageContent},
        select: {messageId: true},
      });
      this.handleWsChatEvent(
        new WsNewMessage.Dto({messageId, senderId: userId, chatId, messageContent}),
      );
    } catch (err: any) {
      throw new WsException(err);
    }
  }

  async leaveChat(dto: LeaveChat): Promise<void> {
    const {chatId, userId} = dto;
    const participant = await this.prisma.chatParticipation.update({
      where: {chatId_userId: {chatId, userId}},
      data: {hasLeaved: true},
    });
    if (!participant) throw new NotFoundException(`no such participant`);
    this.handleWsChatEvent(new WsChatLeave.Dto({chatId, userId}));
  }

  async checkPermissionToUpdateChat(chatId: number, userId: number): Promise<void> | never {
    const adminParticipation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId}},
      select: {role: true, hasLeaved: true},
    });
    if (!adminParticipation)
      throw new UnauthorizedException('This user is not present in this chat');
    if (adminParticipation.role === 'MEMBER')
      throw new UnauthorizedException('This user has no right to update chat information');
    if (adminParticipation.hasLeaved)
      throw new UnauthorizedException('This user has leaved the chat');
  }

  async updateChatInfo(
    chatId: number,
    chatInfo: {name?: string; password?: string; chatAvatarUrl?: string},
  ): Promise<void> {
    if (chatInfo.password) chatInfo.password = await this.hashManager.hash(chatInfo.password);
    await this.prisma.chat.update({
      where: {chatId},
      data: {...chatInfo},
    });
  }

  async updateChatParticipants(
    userId: number,
    chatId: number,
    data: {blockedUntil?: Date; hasLeaved?: boolean; mutedUntil?: Date; role?: Role},
  ) {
    await this.prisma.chatParticipation.update({
      where: {chatId_userId: {chatId, userId: userId}},
      data: {...data},
    });
  }

  handleWsChatEvent(eventDto: WsChat_FromServer.template): void {
    const prefix = this.prefix;
    const roomId = eventDto.message.chatId;
    this.room.broadcastMessageInRoom({prefix, roomId, ...eventDto});

    if (eventDto instanceof WsChat_FromServer.chatJoin.Dto)
      this.room.addUserToRoom({prefix, roomId, userId: eventDto.message.userId});
    else if (eventDto instanceof WsChat_FromServer.chatLeave.Dto)
      this.room.removeUserFromRoom({prefix, roomId, userId: eventDto.message.userId});
  }

  async handleUserConnection(userId: number): Promise<void> {
    const joinedChatIds = await this.getUserJoinedChatIds(userId);

    for (const chatId of joinedChatIds) {
      this.room.addUserToRoom({prefix: this.prefix, roomId: chatId, userId});
    }
  }

  async handleUserDisconnection(userId: number): Promise<void> {
    const joinedChatIds = await this.getUserJoinedChatIds(userId);

    for (const chatId of joinedChatIds) {
      this.room.removeUserFromRoom({prefix: this.prefix, roomId: chatId, userId});
    }
  }
}
