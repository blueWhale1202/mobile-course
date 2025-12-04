import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateQrToken(userId: string) {
    let qr = await this.prisma.qrToken.findUnique({
      where: { userId },
    });

    if (!qr) {
      qr = await this.prisma.qrToken.create({
        data: {
          userId,
          token: randomUUID(),
        },
      });
    }

    const base = process.env.APP_DEEP_LINK_BASE ?? 'yourapp://add-friend';
    const deepLink = `${base}?token=${qr.token}`;

    return {
      token: qr.token,
      deepLink,
    };
  }

  async getUserIdFromToken(token: string) {
    const qr = await this.prisma.qrToken.findUnique({
      where: { token },
    });
    return qr?.userId ?? null;
  }
}
