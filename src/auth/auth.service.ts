import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return {
        email: payload.email,
        name: payload.name ?? payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async validateOrCreateUser(googleProfile: {
    email: string;
    name: string;
    picture?: string;
  }) {
    let user = await this.usersService.findByEmail(googleProfile.email);
    if (!user) {
      user = await this.usersService.createUser({
        email: googleProfile.email,
        displayName: googleProfile.name,
        avatarUrl: googleProfile.picture,
      });
    } else {
      await this.usersService.updateLastLogin(user.id);
    }
    return user;
  }

  generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId: string, token: string) {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
      },
    });
  }

  async loginWithGoogle(idToken: string) {
    const googleProfile = await this.verifyGoogleIdToken(idToken);
    const user = await this.validateOrCreateUser(googleProfile);

    const { accessToken, refreshToken } = this.generateTokens(user.id);
    await this.saveRefreshToken(user.id, refreshToken);
    return { user, accessToken, refreshToken };
  }

  async refreshTokens(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const stored = await this.prisma.refreshToken.findUnique({
        where: { token: oldRefreshToken },
      });

      if (!stored || stored.revoked) {
        throw new UnauthorizedException('Refresh token revoked or not found');
      }

      const { accessToken, refreshToken } = this.generateTokens(stored.userId);

      await this.prisma.$transaction([
        this.prisma.refreshToken.update({
          where: { token: oldRefreshToken },
          data: { revoked: true },
        }),
        this.prisma.refreshToken.create({
          data: {
            userId: stored.userId,
            token: refreshToken,
          },
        }),
      ]);

      return { accessToken, refreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
