-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvitationKind" AS ENUM ('FRIEND', 'CHAT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BallSpeed" AS ENUM ('SLOW', 'NORMAL', 'FAST', 'VERY_FAST');

-- CreateEnum
CREATE TYPE "BallSize" AS ENUM ('VERY_SMALL', 'SMALL', 'NORMAL', 'BIG', 'VERY_BIG');

-- CreateEnum
CREATE TYPE "PaddleSpeed" AS ENUM ('SLOW', 'NORMAL', 'FAST', 'VERY_FAST');

-- CreateEnum
CREATE TYPE "PaddleSize" AS ENUM ('VERY_SMALL', 'SMALL', 'NORMAL', 'BIG', 'VERY_BIG');

-- CreateEnum
CREATE TYPE "AchievementName" AS ENUM ('firstGame', 'firstWin', 'longGame', 'shortGame', 'largePaddleSmallBall', 'smallPaddleLargeBall', 'speedUp', 'speedDown', 'impossibleSpeed', 'impossible', 'quick');

-- CreateTable
CREATE TABLE "Users" (
    "userId" SERIAL NOT NULL,
    "user42Id" INTEGER,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "hasSet2Fa" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BlockedUsers" (
    "userId" INTEGER NOT NULL,
    "blockedUserId" INTEGER NOT NULL,

    CONSTRAINT "BlockedUsers_pkey" PRIMARY KEY ("userId","blockedUserId")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" INTEGER NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Friends" (
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,

    CONSTRAINT "Friends_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateTable
CREATE TABLE "Invitations" (
    "invitationId" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "kind" "InvitationKind" NOT NULL,
    "targetChatId" INTEGER,

    CONSTRAINT "Invitations_pkey" PRIMARY KEY ("invitationId")
);

-- CreateTable
CREATE TABLE "Chats" (
    "chatId" SERIAL NOT NULL,
    "chatName" TEXT NOT NULL,
    "chatAvatarUrl" TEXT,
    "password" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Chats_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "ChatBans" (
    "chatId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ChatBans_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "Messages" (
    "messageId" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "messageContent" TEXT NOT NULL,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "DirectMessages" (
    "messageId" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "messageContent" TEXT NOT NULL,

    CONSTRAINT "DirectMessages_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "ChatParticipations" (
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "mutedUntil" TIMESTAMP(3),
    "chatId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "GameParticipations" (
    "score" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "GameParticipations_pkey" PRIMARY KEY ("gameId","userId")
);

-- CreateTable
CREATE TABLE "Games" (
    "gameId" SERIAL NOT NULL,
    "gameStatus" "GameStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "scoreToWin" INTEGER NOT NULL DEFAULT 3,
    "ballSpeed" "BallSpeed" NOT NULL,
    "ballSize" "BallSize" NOT NULL,
    "paddleSpeed" "PaddleSpeed" NOT NULL,
    "paddleSize" "PaddleSize" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Games_pkey" PRIMARY KEY ("gameId")
);

-- CreateTable
CREATE TABLE "Achievements" (
    "achievementId" SERIAL NOT NULL,
    "name" "AchievementName" NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Achievements_pkey" PRIMARY KEY ("achievementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_user42Id_key" ON "Users"("user42Id");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_nickname_key" ON "Profile"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Chats_chatName_key" ON "Chats"("chatName");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipations_chatId_userId_key" ON "ChatParticipations"("chatId", "userId");

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD CONSTRAINT "BlockedUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD CONSTRAINT "BlockedUsers_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friends" ADD CONSTRAINT "Friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friends" ADD CONSTRAINT "Friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "Invitations_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "Invitations_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "Invitations_targetChatId_fkey" FOREIGN KEY ("targetChatId") REFERENCES "Chats"("chatId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBans" ADD CONSTRAINT "ChatBans_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("chatId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBans" ADD CONSTRAINT "ChatBans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("chatId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessages" ADD CONSTRAINT "DirectMessages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessages" ADD CONSTRAINT "DirectMessages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipations" ADD CONSTRAINT "ChatParticipations_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chats"("chatId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipations" ADD CONSTRAINT "ChatParticipations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipations" ADD CONSTRAINT "GameParticipations_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Games"("gameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipations" ADD CONSTRAINT "GameParticipations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievements" ADD CONSTRAINT "Achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
