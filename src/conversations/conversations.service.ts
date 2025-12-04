import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async createOrGetDirectConversation(
    currentUserId: string,
    targetUserId: string,
  ) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        'Cannot create direct conversation with yourself',
      );
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: { userId: currentUserId },
        },
        AND: {
          participants: {
            some: { userId: targetUserId },
          },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (existing) {
      return existing;
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: currentUserId }, { userId: targetUserId }],
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    return conversation;
  }

  async createGroupConversation(
    currentUserId: string,
    title: string | undefined,
    memberIds: string[],
  ) {
    const allMemberIds = Array.from(new Set([currentUserId, ...memberIds])); // unique

    if (allMemberIds.length < 2) {
      throw new BadRequestException('Group must have at least 2 members');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        title: title ?? null,
        participants: {
          create: allMemberIds.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    return conversation;
  }

  async listUserConversations(currentUserId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: currentUserId },
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return conversations;
  }

  async getConversationById(currentUserId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.participants.some(
      (p) => p.userId === currentUserId,
    );
    if (!isMember) {
      throw new BadRequestException(
        'You are not a participant of this conversation',
      );
    }

    return conversation;
  }
}
