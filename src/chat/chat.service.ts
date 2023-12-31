import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreateChatDto, SendMessageDto} from 'src/chat/dto';
import {JoinChat, LeaveChat, UpdateChat} from 'src/chat/interface';
import {Role} from '@prisma/client';
import {WsChatJoin, WsChatLeave, WsChat_FromServer, WsNewMessage} from 'src/shared/WsEvents/chat';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {WsException} from '@nestjs/websockets';
import {HashManagerService} from 'src/hashManager/hashManager.service';
import {ChatInfo, ChatMessage, ChatOverview} from 'src/shared/HttpEndpoints/interfaces';
import {ImageService} from 'src/image/image.service';
import {filterDefinedProperties} from 'src/shared/sharedUtilities/utils.functions.';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly room: WsRoomService,
    private readonly hashManager: HashManagerService,
    private readonly image: ImageService,
  ) {}
  private readonly prefix: RoomNamePrefix = 'Chatroom-';

  async getUserJoinedChatIds(userId: number): Promise<number[]> {
    const joinedChats = await this.prisma.chatParticipation.findMany({
      where: {userId},
      select: {chatId: true},
    });
    return joinedChats.map(chat => chat.chatId);
  }

  async createChat(userId: number, dto: CreateChatDto): Promise<void> {
    let chatAvatarUrl: string | undefined;
    const {chatAvatar, ...createChatData} = dto;
    if (chatAvatar)
      chatAvatarUrl = await this.image.uploadFile(chatAvatar.originalname, chatAvatar.buffer);
    if (createChatData.password)
      dto.password = await this.hashManager.hash(createChatData.password);
    await this.prisma.chat.create({
      data: {
        ...filterDefinedProperties({...createChatData, chatAvatarUrl}),
        participants: {create: {userId, role: 'ADMIN'}},
      },
    });
  }

  async updateChat(dto: UpdateChat): Promise<void> {
    let chatAvatarUrl: string | undefined;
    const {chatId, userId, participants, chatAvatar, ...chatInfo} = dto;
    const adminParticipation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      select: {role: true},
    });
    if (!adminParticipation) throw new ForbiddenException('This user is not present in this chat');
    if (adminParticipation.role !== 'ADMIN')
      throw new ForbiddenException('This user has no right to update chat information');
    if (Object.keys(chatInfo).length) {
      if (chatInfo.password) chatInfo.password = await this.hashManager.hash(chatInfo.password);
      if (chatAvatar)
        chatAvatarUrl = await this.image.uploadFile(chatAvatar.originalname, chatAvatar.buffer);
      await this.prisma.chat.update({
        where: {chatId},
        data: {...filterDefinedProperties({...chatInfo, chatAvatarUrl})},
      });
    }

    for (const participant of participants ?? []) {
      this.updateChatParticipant(userId, chatId, participant);
    }
  }

  async joinChat(dto: JoinChat, hasInvitation: boolean = false): Promise<void> {
    const {chatId, userId, password} = dto;
    const chat = await this.prisma.chat.findUnique({
      where: {chatId},
      select: {password: true, chatId: true, chatName: true},
    });
    if (!chat) throw new NotFoundException(`no such chat`);
    if (!hasInvitation && !(await this.hashManager.verify(password, chat?.password)))
      throw new ForbiddenException(`invalid password`);

    const participation = await this.prisma.chatParticipation.count({
      where: {chatId, userId},
    });
    if (participation) throw new ForbiddenException(`already joined this chat`);
    await this.prisma.chatParticipation.create({
      data: {chatId, userId, role: 'MEMBER'},
    });

    const user = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!user) throw new NotFoundException(`no such user`);
    this.handleWsChatEvent(
      new WsChatJoin.Dto({
        chat: {chatId, chatName: chat.chatName},
        user,
      }),
    );
  }

  async getAllMessagesFromChatId(chatId: number): Promise<ChatMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: {chatId},
      select: {
        messageId: true,
        createdAt: true,
        messageContent: true,
        userId: true,
      },
      orderBy: {createdAt: 'asc'},
    });
    const chatMessages: ChatMessage[] = [];
    const users = await this.prisma.profile.findMany({
      where: {userId: {in: messages.map(message => message.userId)}},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    for (const message of messages) {
      const user = users.find(user => user.userId === message.userId);
      if (!user) continue;
      const {userId, nickname, avatarUrl} = user;
      const {messageId, createdAt, messageContent} = message;
      chatMessages.push({
        senderId: userId,
        nickname,
        avatarUrl,
        messageId,
        createdAt,
        messageContent,
      });
    }
    return chatMessages;
  }

  async getChatInfo(userId: number, chatId: number): Promise<ChatInfo> {
    const chatOverview = await this.prisma.chat.findUnique({
      where: {chatId},
      select: {
        chatId: true,
        chatName: true,
        chatAvatarUrl: true,
        password: true,
        participants: {
          where: {userId},
          select: {
            role: true,
            mutedUntil: true,
            blockedUntil: true,
            userId: true,
          },
        },
      },
    });

    if (!chatOverview) throw new NotFoundException(`no such chat`);

    const chatMessages = await this.getAllMessagesFromChatId(chatId);
    const hasPassword = chatOverview?.password ? true : false;
    const participation = chatOverview?.participants[0] || null;

    const chatInfo: ChatInfo = {
      chatOverview: {
        chatId: chatOverview.chatId,
        chatName: chatOverview.chatName,
        chatAvatarUrl: chatOverview.chatAvatarUrl,
        hasPassword,
        participation,
      },
      chatMessages,
    };
    return chatInfo;
  }

  async getOverviews(userId: number, chatId?: number): Promise<ChatOverview[]> {
    const chats = await this.prisma.chat.findMany({
      select: {
        participants: {
          where: {userId, chatId: chatId},
          select: {
            userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
            role: true,
            mutedUntil: true,
            blockedUntil: true,
            userId: true,
          },
        },
        chatId: true,
        chatName: true,
        chatAvatarUrl: true,
        password: true,
      },
    });
    const chatList: ChatOverview[] = [];
    for (const chat of chats) {
      const overview: ChatOverview = {
        chatId: chat.chatId,
        chatName: chat.chatName,
        chatAvatarUrl: chat.chatAvatarUrl,
        hasPassword: chat?.password ? true : false,
        participation: chat.participants[0] || null,
      };
      chatList.push(overview);
    }
    return chatList;
  }

  async sendMessage(userId: number, {chatId, messageContent}: SendMessageDto): Promise<void> {
    const participation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId}},
      select: {
        chatId: true,
        chat: {select: {chatName: true}},
        userId: true,
        blockedUntil: true,
        mutedUntil: true,
        userProfile: {select: {nickname: true, avatarUrl: true}},
      },
    });
    if (!participation) throw new WsException('no such chat available for this user');
    const now = Date.now();
    const {blockedUntil, mutedUntil} = participation;
    if (blockedUntil && blockedUntil.getTime() > now) throw new WsException('user still blocked');
    if (mutedUntil && mutedUntil.getTime() > now) throw new WsException('user still mute');
    try {
      const {messageId} = await this.prisma.message.create({
        data: {userId, chatId, messageContent},
        select: {messageId: true},
      });
      const {nickname, avatarUrl} = participation.userProfile;
      const chat = {chatId, chatName: participation.chat.chatName};
      const sender = {userId, nickname, avatarUrl};
      const message = {messageId, messageContent};
      this.handleWsChatEvent(new WsNewMessage.Dto({chat, sender, message}));
    } catch (err: any) {
      throw new WsException(err);
    }
  }

  async leaveChat(dto: LeaveChat): Promise<void> {
    const {chatId, userId} = dto;
    const participant = await this.prisma.chatParticipation.delete({
      where: {chatId_userId: {chatId, userId}},
      select: {
        userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
        chat: {select: {chatName: true, chatId: true}},
      },
    });
    if (!participant) throw new NotFoundException(`no such participant`);
    this.handleWsChatEvent(
      new WsChatLeave.Dto({
        chat: participant.chat,
        user: participant.userProfile,
      }),
    );
  }

  async updateChatParticipant(
    userId: number,
    chatId: number,
    data: {blockedUntil?: Date; mutedUntil?: Date; role?: Role} | {kick: boolean},
  ) {
    if (data instanceof Object && 'kick' in data) {
      if (!data.kick) throw new BadRequestException('kick must be true');
      return await this.leaveChat({chatId, userId});
    }

    const {blockedUntil, mutedUntil} = data;
    const now = Date.now();

    if (blockedUntil && blockedUntil.getTime() < now)
      throw new BadRequestException('Unable to block a user until a past date');

    if (mutedUntil && mutedUntil.getTime() < now)
      throw new BadRequestException('Unable to mute a user until a past date');

    await this.prisma.chatParticipation.update({
      where: {chatId_userId: {chatId, userId: userId}},
      data: {...data},
    });
  }

  handleWsChatEvent(eventDto: WsChat_FromServer.template): void {
    const prefix = this.prefix;
    let userId: number;
    if (eventDto instanceof WsNewMessage.Dto) userId = eventDto.message.sender.userId;
    else
      userId = (
        eventDto.message as WsChatJoin.eventMessageTemplate | WsChatLeave.eventMessageTemplate
      ).user.userId;
    const roomId = eventDto.message.chat.chatId;
    this.room.broadcastMessageInRoom({prefix, roomId, ...eventDto});

    if (eventDto instanceof WsChat_FromServer.chatJoin.Dto)
      this.room.addUserToRoom({prefix, roomId, userId});
    else if (eventDto instanceof WsChat_FromServer.chatLeave.Dto)
      this.room.removeUserFromRoom({prefix, roomId, userId});
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
