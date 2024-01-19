import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreateChatDto, SendMessageDto} from 'src/chat/dto';
import {JoinChat, LeaveChat, UpdateChat, updateChatParticipant} from 'src/chat/interface';
import {
  WsChatJoin,
  WsChatLeave,
  WsChatParticipationUpdate,
  WsChatUpdate,
  WsNewDirectMessage,
  WsNewMessage,
} from 'src/shared/WsEvents/chat';
import {RoomNamePrefix} from 'src/webSocket/WsRoom/interface';
import {WsRoomService} from 'src/webSocket/WsRoom/WsRoom.service';
import {WsException} from '@nestjs/websockets';
import {HashManagerService} from 'src/hashManager/hashManager.service';
import {
  ChatInfo,
  ChatMessage,
  ChatOverview,
  DirectMessageInfo,
} from 'src/shared/HttpEndpoints/interfaces';
import {ImageService} from 'src/image/image.service';
import {filterDefinedProperties} from 'src/shared/sharedUtilities/utils.functions.';
import {WsSocketService} from 'src/webSocket/WsSocket/WsSocket.service';
import {SendDirectMessageDto} from './dto/SendDirectMessage.dto';

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

  async createChat(userId: number, dto: CreateChatDto): Promise<ChatOverview> {
    let chatAvatarUrl: string | undefined;
    const {chatAvatar, ...createChatData} = dto;
    if (chatAvatar)
      chatAvatarUrl = await this.image.uploadFile(chatAvatar.originalname, chatAvatar.buffer);
    if (createChatData.password)
      dto.password = await this.hashManager.hash(createChatData.password);
    try {
      const chat = await this.prisma.chat.create({
        data: {
          ...filterDefinedProperties({...createChatData, chatAvatarUrl}),
          participants: {create: {userId, role: 'OWNER'}},
        },
        select: {
          chatId: true,
          chatName: true,
          chatAvatarUrl: true,
          password: true,
          isPrivate: true,
          participants: {
            where: {userId},
            select: {
              role: true,
              mutedUntil: true,
              userId: true,
            },
          },
        },
      });
      if (!chat) throw new InternalServerErrorException('unable to create chat');
      const chatOverview: ChatOverview = {
        chatId: chat.chatId,
        chatName: chat.chatName,
        chatAvatarUrl: chat.chatAvatarUrl,
        hasPassword: chat.password ? true : false,
        participation: chat.participants[0] || null,
        isPrivate: chat.isPrivate,
      };
      const user = await this.prisma.profile.findUniqueOrThrow({
        where: {userId},
        select: {userId: true, nickname: true, avatarUrl: true},
      });
      this.room.broadcastToAll(
        new WsChatUpdate.Dto({chat, updater: user, action: {newChat: true}}),
      );
      this.room.addUserToRoom({prefix: this.prefix, roomId: chat.chatId, userId});
      this.room.broadcastMessageInRoom({
        prefix: this.prefix,
        roomId: chat.chatId,
        ...new WsChatJoin.Dto({
          chat: {chatId: chat.chatId, chatName: chat.chatName},
          user,
        }),
      });
      return chatOverview;
    } catch (err: any) {
      throw new ConflictException('chat name already taken');
    }
  }

  async updateChat(dto: UpdateChat): Promise<void> {
    let chatAvatarUrl: string | undefined;
    const {chatId, userId, chatAvatar, ...chatInfo} = dto;
    const adminParticipation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId: dto.chatId, userId: dto.userId}},
      select: {role: true, userProfile: {select: {userId: true, nickname: true, avatarUrl: true}}},
    });
    if (!adminParticipation) throw new ForbiddenException('This user is not present in this chat');
    if (adminParticipation.role !== 'OWNER')
      throw new ForbiddenException('This user has no right to update chat information');
    if (Object.keys(chatInfo).length) {
      if (chatInfo.password) chatInfo.password = await this.hashManager.hash(chatInfo.password);
      if (chatAvatar)
        chatAvatarUrl = await this.image.uploadFile(chatAvatar.originalname, chatAvatar.buffer);
      try {
        const chat = await this.prisma.chat.update({
          where: {chatId},
          data: {...filterDefinedProperties({...chatInfo, chatAvatarUrl})},
        });
        this.room.broadcastToAll(
          new WsChatUpdate.Dto({
            chat,
            updater: adminParticipation.userProfile,
            action: {
              updateAvatar: chatAvatarUrl ? true : false,
              updateName: chatInfo.chatName ? true : false,
              updatePassword: chatInfo.password ? true : false,
              removePassword: chatInfo.password === null ? true : false,
              updatePrivacy: chatInfo.isPrivate !== undefined ? true : false,
            },
          }),
        );
      } catch (err: any) {
        throw new ConflictException('chat name already taken');
      }
    }
  }

  async joinChat(dto: JoinChat, hasInvitation: boolean = false): Promise<void> {
    const {chatId, userId, password} = dto;
    const chat = await this.prisma.chat.findUnique({
      where: {chatId},
      select: {password: true, chatId: true, chatName: true, isPrivate: true},
    });
    if (!chat) throw new NotFoundException(`no such chat`);
    if (chat.isPrivate && !hasInvitation)
      throw new ForbiddenException(`this chat is private, you need an invitation`);
    const banList = await this.prisma.chatBan.findMany({
      where: {chatId},
      select: {userId: true},
    });
    if (banList.find(ban => ban.userId === userId)) throw new ForbiddenException(`banned`);
    if (!hasInvitation && !(await this.hashManager.verify(chat?.password, password)))
      throw new ForbiddenException(`invalid password`);

    try {
      await this.prisma.chatParticipation.create({data: {chatId, userId, role: 'MEMBER'}});
    } catch (err: any) {
      throw new ForbiddenException(`already joined this chat`);
    }

    const user = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!user) throw new NotFoundException(`no such user`);

    this.room.addUserToRoom({prefix: this.prefix, roomId: chatId, userId});
    this.room.broadcastMessageInRoom({
      prefix: this.prefix,
      roomId: chatId,
      ...new WsChatJoin.Dto({
        chat: {chatId, chatName: chat.chatName},
        user,
      }),
    });
  }

  async getAllDirectMessages(userId: number, correspondantId: number): Promise<DirectMessageInfo> {
    const correspondant = await this.prisma.profile.findUnique({
      where: {userId: correspondantId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!correspondant) throw new NotFoundException(`no such correspondant`);
    const blockedUserIds = await this.prisma.blockedUser.findMany({
      where: {userId: {in: [userId, correspondantId]}},
      select: {blockedUserId: true},
    });
    if (blockedUserIds.find(block => block.blockedUserId === correspondantId))
      throw new ForbiddenException(`user blocked`);
    if (blockedUserIds.find(block => block.blockedUserId === userId))
      throw new ForbiddenException(`you are blocked`);

    const messages = await this.prisma.directMessage.findMany({
      where: {
        senderId: {in: [userId, correspondantId]},
        receiverId: {in: [userId, correspondantId]},
      },
      select: {
        messageId: true,
        createdAt: true,
        messageContent: true,
        senderId: true,
        receiverId: true,
      },
      orderBy: {createdAt: 'asc'},
    });
    return {
      messages,
      userProfile: {...correspondant, isOnline: WsSocketService.isOnline(correspondantId)},
    };
  }

  async sendDirectMessage(
    senderId: number,
    {userId, messageContent}: SendDirectMessageDto,
  ): Promise<void> {
    const sender = await this.prisma.profile.findUnique({
      where: {userId: senderId},
      select: {userId: true, nickname: true, avatarUrl: true},
    });
    if (!sender) throw new NotFoundException(`no such sender`);

    const correspondant = await this.prisma.profile.findUnique({
      where: {userId},
      select: {userId: true},
    });
    if (!correspondant) throw new NotFoundException(`no such correspondant`);
    const blockedUserIds = await this.prisma.blockedUser.findMany({
      where: {userId: {in: [senderId, userId]}},
      select: {blockedUserId: true},
    });
    if (blockedUserIds.find(block => block.blockedUserId === userId))
      throw new ForbiddenException(`user blocked`);
    if (blockedUserIds.find(block => block.blockedUserId === senderId))
      throw new ForbiddenException(`you are blocked`);

    const {messageId} = await this.prisma.directMessage.create({
      data: {senderId, receiverId: userId, messageContent},
      select: {messageId: true},
    });
    const message = {messageId, messageContent};
    this.room.sendMessageToUser(userId, new WsNewDirectMessage.Dto({sender, message}));
    this.room.sendMessageToUser(senderId, new WsNewDirectMessage.Dto({sender, message}));
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
        isPrivate: true,
        participants: {
          select: {
            role: true,
            mutedUntil: true,
            userId: true,
          },
        },
      },
    });

    if (!chatOverview) throw new NotFoundException(`no such chat`);

    let chatMessages = await this.getAllMessagesFromChatId(chatId);
    const blockUserIds = await this.prisma.blockedUser.findMany({
      where: {userId},
      select: {blockedUserId: true},
    });
    chatMessages = chatMessages.filter(
      message => !blockUserIds.find(block => block.blockedUserId === message.senderId),
    );
    const hasPassword = chatOverview.password ? true : false;
    const participation =
      chatOverview.participants.find(participation => participation.userId === userId) || null;
    const otherParticipations = chatOverview.participants.filter(
      participation => participation.userId !== userId,
    );

    const chatInfo: ChatInfo = {
      chatOverview: {
        chatId: chatOverview.chatId,
        chatName: chatOverview.chatName,
        chatAvatarUrl: chatOverview.chatAvatarUrl,
        hasPassword,
        participation,
        isPrivate: chatOverview.isPrivate,
      },
      chatMessages,
      otherParticipations,
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
            userId: true,
          },
        },
        chatId: true,
        chatName: true,
        chatAvatarUrl: true,
        password: true,
        isPrivate: true,
      },
    });
    const chatList: ChatOverview[] = [];
    for (const chat of chats) {
      if (chat.isPrivate && !chat.participants.length) continue;
      const overview: ChatOverview = {
        chatId: chat.chatId,
        chatName: chat.chatName,
        chatAvatarUrl: chat.chatAvatarUrl,
        hasPassword: chat?.password ? true : false,
        participation: chat.participants[0] || null,
        isPrivate: chat.isPrivate,
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
        mutedUntil: true,
        userProfile: {select: {nickname: true, avatarUrl: true}},
      },
    });
    if (!participation) throw new WsException('no such chat available for this user');
    const now = Date.now();
    const {mutedUntil} = participation;
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
      this.room.broadcastMessageInRoom({
        prefix: this.prefix,
        roomId: chatId,
        ...new WsNewMessage.Dto({chat, sender, message}),
      });
    } catch (err: any) {
      throw new WsException(err);
    }
  }

  async leaveChat(dto: LeaveChat): Promise<void> {
    const {chatId, userId} = dto;
    try {
      const participant = await this.prisma.chatParticipation.delete({
        where: {chatId_userId: {chatId, userId}},
        select: {
          userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
          chat: {select: {chatName: true, chatId: true}},
        },
      });
      if (!participant) throw new NotFoundException(`no such participant`);

      const prefix = this.prefix;
      const roomId = chatId;
      this.room.broadcastMessageInRoom({
        prefix,
        roomId,
        ...new WsChatLeave.Dto({
          chat: participant.chat,
          user: participant.userProfile,
        }),
      });
      this.room.removeUserFromRoom({prefix, roomId, userId});
    } catch (err: any) {
      throw new NotFoundException(`no such participant`);
    }
  }

  async updateChatParticipant(updaterUserId: number, data: updateChatParticipant) {
    const {chatId, userId, ...updateData} = data;

    const updaterParticipation = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId: updaterUserId}},
      select: {role: true, userProfile: {select: {userId: true, nickname: true, avatarUrl: true}}},
    });
    if (!updaterParticipation) throw new NotFoundException('no such participation');
    if (updaterParticipation.role === 'MEMBER') throw new ForbiddenException('no right to update');

    const participationToUpdate = await this.prisma.chatParticipation.findUnique({
      where: {chatId_userId: {chatId, userId: data.userId}},
      select: {
        userId: true,
        role: true,
        chat: {select: {chatName: true, chatId: true}},
        userProfile: {select: {userId: true, nickname: true, avatarUrl: true}},
      },
    });
    if (!participationToUpdate) throw new NotFoundException('no such participation');
    if (participationToUpdate.role === 'OWNER')
      throw new ForbiddenException('unable to update owner');
    if ('ban' in updateData) {
      if (updateData.ban == true) {
        await this.leaveChat({chatId, userId: participationToUpdate.userId});
        this.room.broadcastToAll(
          new WsChatParticipationUpdate.Dto({
            chat: participationToUpdate.chat,
            updater: updaterParticipation.userProfile,
            updatedUser: participationToUpdate.userProfile,
            action: {ban: true},
          }),
        );
        await this.prisma.chatBan.update({
          where: {chatId_userId: {chatId, userId}},
          data: {chatId, userId},
        });
      } else if (updateData.ban == false) {
        await this.prisma.chatBan.delete({where: {chatId_userId: {chatId, userId}}});
      } else throw new BadRequestException('ban must be true or false');
      return;
    }

    if ('kick' in updateData) {
      if (updateData.kick == false) throw new BadRequestException('kick must be true or undefined');
      await this.leaveChat({chatId, userId: participationToUpdate.userId});
      this.room.broadcastToAll(
        new WsChatParticipationUpdate.Dto({
          chat: participationToUpdate.chat,
          updater: updaterParticipation.userProfile,
          updatedUser: participationToUpdate.userProfile,
          action: {kick: true},
        }),
      );
      return;
    }

    const {mutedUntil} = updateData;
    const now = Date.now();

    if (mutedUntil && mutedUntil.getTime() < now)
      throw new BadRequestException('Unable to mute a user until a past date');
    await this.prisma.chatParticipation.update({
      where: {chatId_userId: {chatId, userId}},
      data: {...updateData},
    });
    this.room.broadcastToAll(
      new WsChatParticipationUpdate.Dto({
        chat: participationToUpdate.chat,
        updater: updaterParticipation.userProfile,
        updatedUser: participationToUpdate.userProfile,
        action: {
          changeRole:
            updateData.role !== undefined && updateData.role !== participationToUpdate.role,
          mute: updateData.mutedUntil !== undefined && updateData.mutedUntil !== null,
          unmute: updateData.mutedUntil === null,
          kick: false,
        },
      }),
    );
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
