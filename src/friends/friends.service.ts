import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QrService } from '../qr/qr.service';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
  ) {}

  private async findFriendshipBetween(userId: string, otherUserId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
    });
  }

  async sendFriendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const existing = await this.findFriendshipBetween(fromUserId, toUserId);

    if (existing) {
      // nếu đã là bạn bè
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('Already friends');
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('Cannot send request to blocked user');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('Friend request already pending');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId: fromUserId,
        addresseeId: toUserId,
        status: FriendshipStatus.PENDING,
      },
    });

    return friendship;
  }

  async sendFriendRequestFromQr(fromUserId: string, token: string) {
    const targetUserId = await this.qrService.getUserIdFromToken(token);
    if (!targetUserId) {
      throw new NotFoundException('Invalid QR token');
    }

    return this.sendFriendRequest(fromUserId, targetUserId);
  }

  async acceptFriendRequest(currentUserId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    if (friendship.addresseeId !== currentUserId) {
      throw new BadRequestException('You are not the receiver of this request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is not pending');
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }

  async rejectFriendRequest(currentUserId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    if (friendship.addresseeId !== currentUserId) {
      throw new BadRequestException('You are not the receiver of this request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is not pending');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return { success: true };
  }

  async blockUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const existing = await this.findFriendshipBetween(
      currentUserId,
      targetUserId,
    );

    if (existing) {
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: currentUserId, // hướng block
          addresseeId: targetUserId,
          status: FriendshipStatus.BLOCKED,
        },
      });
    } else {
      return this.prisma.friendship.create({
        data: {
          requesterId: currentUserId,
          addresseeId: targetUserId,
          status: FriendshipStatus.BLOCKED,
        },
      });
    }
  }

  async listFriends(currentUserId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
      },
      include: {
        requester: true,
        addressee: true,
      },
    });

    const friends = friendships.map((f) =>
      f.requesterId === currentUserId ? f.addressee : f.requester,
    );

    return friends;
  }

  async listPendingRequests(currentUserId: string) {
    const incoming = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.PENDING,
        addresseeId: currentUserId,
      },
      include: { requester: true },
    });

    const outgoing = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.PENDING,
        requesterId: currentUserId,
      },
      include: { addressee: true },
    });

    return {
      incoming,
      outgoing,
    };
  }
}
