import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon from 'argon2';
import {PrismaService} from 'src/prisma/prisma.service';
import {CreateChatDto, SendMessageDto} from './dto';
import {Socket} from 'socket.io';
import {WsException} from '@nestjs/websockets';
import {
  CreateChatResponse,
  GetAllMessageResponse,
  GetChatInfoResponse,
} from 'src/shared/HttpEndpoints/chat/';
import {RoomMonitorService} from 'src/webSocket/room/roomMonitor.service';
import {OnSendMessageEvent} from 'src/shared/WsEvents/chat';
import {JoinChat, LeaveChat, UpdateChat} from './interface';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly room: RoomMonitorService,
  ) {}

  async createChatRoom(userId: number, dto: CreateChatDto): Promise<CreateChatResponse> {
    if (dto.password) dto.password = await argon.hash(dto.password);
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
    delete chat.password;
    this.room.addUserToRoom({prefix: 'Chatroom-', roomId: chat.chatId, userId});
    return {...chat, hasPassword};
  }

  async joinChatRoom(dto: JoinChat, hasInvitation: boolean = false): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: {chatId: dto.chatId},
      select: {password: true, chatId: true},
    });
    if (!chat) throw new NotFoundException(`no such room`);
    if (!hasInvitation && chat.password && !(await argon.verify(chat.password, dto.password)))
      throw new UnauthorizedException(`invalid password`);

    const participation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      select: {hasLeaved: true, blockedUntil: true},
    });
    const blockedUntil = participation?.blockedUntil?.getTime();
    if (blockedUntil && blockedUntil > Date.now())
      throw new UnauthorizedException(`This user is still blocked until ${blockedUntil}`);
    if (participation?.hasLeaved) {
      await this.prisma.chatParticipation.update({
        where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
        data: {hasLeaved: false},
      });
    } else {
      await this.prisma.chatParticipation.create({
        data: {chatId: chat.chatId, userId: dto.userId},
      });
    }
    this.room.addUserToRoom({prefix: 'Chatroom-', roomId: dto.chatId, userId: dto.userId});
  }

  async leaveChatRoom(dto: LeaveChat): Promise<void> {
    const participant = await this.prisma.chatParticipation.update({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      data: {hasLeaved: true},
    });
    if (!participant) throw new NotFoundException(`no such participant`);
    this.room.removeUserFromRoom({prefix: 'Chatroom-', roomId: dto.chatId, userId: dto.userId});
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
      if (chatInfo.password) chatInfo.password = await argon.hash(chatInfo.password);
      await this.prisma.chat.update({
        where: {chatId},
        data: {...chatInfo},
      });
    }
    const now = Date.now();
    const participantData = participants.map(elem => {
      if (elem?.blockUntil.getTime() < now)
        throw new BadRequestException('Unable to block a user until a past date');
      if (elem?.muteUntil.getTime() < now)
        throw new BadRequestException('Unable to mute a user until a past date');
      if (elem.userId === userId)
        throw new UnauthorizedException("Unable to modify user's own participation settings");
      const res = {userId: elem.userId};
      if (elem.blockUntil) {
        res['blockedUntil'] = elem.blockUntil;
        res['hasLeaved'] = true;
      }
      if (elem.muteUntil) res['mutedUntil'] = elem.muteUntil;
      if (elem.targetRole) res['role'] = elem.targetRole;
      if (elem.kick) res['hasLeaved'] = true;
      return res;
    });
    for (const participant of participantData) {
      await this.prisma.chatParticipation.update({
        where: {chatId_userId: {chatId, userId: participant.userId}},
        data: {...participant},
      });
      if (participant['hasLeaved'])
        this.room.removeUserFromRoom({
          prefix: 'Chatroom-',
          roomId: chatId,
          userId: participant.userId,
        });
    }
  }

  async sendMessage(dto: SendMessageDto): Promise<void> {
    const participation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      select: {
        hasLeaved: true,
        chatId: true,
        userId: true,
        blockedUntil: true,
        mutedUntil: true,
      },
    });
    if (!participation) throw new WsException('no such room available for this user');
    const now = Date.now();
    if (participation?.hasLeaved) throw new WsException('user has already leaved this chat');
    if (participation?.blockedUntil?.getTime() > now) throw new WsException('user still blocked');
    if (participation?.mutedUntil?.getTime() > now) throw new WsException('user still mute');
    try {
      const message = await this.prisma.message.create({
        data: {
          userId: participation.userId,
          chatId: participation.chatId,
          messageContent: dto.messageContent,
        },
        select: {messageId: true, messageContent: true},
      });
      const toSend: OnSendMessageEvent = {
        messageId: message.messageId,
        userId: participation.userId,
        chatId: participation.chatId,
        messageContent: message.messageContent,
      };
      this.room.sendMessageInRoom({
        prefix: 'Chatroom-',
        roomId: participation.chatId,
        eventName: 'newMessage',
        message: toSend,
        senderId: participation.userId,
      });
    } catch (err) {
      throw new WsException(err);
    }
  }

  async getAllMessagesFromChatId(userId: number, chatId: number): Promise<GetAllMessageResponse> {
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
        return {messages, participant: participants};
    }

    throw new UnauthorizedException('This user has no access to this chat');
  }

  async getChatInfo(chatId: number): Promise<GetChatInfoResponse> {
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
    const hasPassword = chat.password ? true : false;
    delete chat.password;
    return {...chat, hasPassword};
  }

  async getJoinedRoomIdsByUserId(userId: number): Promise<number[]> {
    const joinedRooms = await this.prisma.chatParticipation.findMany({
      where: {userId, blockedUntil: {not: {gte: new Date()}}},
      select: {chatId: true},
    });
    return joinedRooms.map(room => {
      return room.chatId;
    });
  }

  async addUserToJoinedChatroom(userId: number, client: Socket): Promise<void> {
    const joinedRoomIds = await this.getJoinedRoomIdsByUserId(userId);

    for (const roomId of joinedRoomIds) {
      client.join(`room-${roomId}`);
    }
  }

  async removeUserFromJoinedChatRoom(userId: number, client: Socket): Promise<void> {
    const joinedRoomIds = await this.getJoinedRoomIdsByUserId(userId);

    for (const roomId of joinedRoomIds) {
      client.leave(`room-${roomId}`);
    }
  }
}