import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

interface TokenPayload {
  sub: string;
  login: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async validateUser(
    login: string,
    password: string,
    request?: Request,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { login },
    });

    if (!user || user.deletedAt) {
      // Log failed attempt for non-existent or deleted user (don't reveal user doesn't exist)
      await this.auditService.log({
        userId: user?.id || 'unknown',
        action: AuditAction.LOGIN_FAILED,
        metadata: {
          login,
          reason: user?.deletedAt ? 'user_deleted' : 'user_not_found',
        },
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      });
      return null;
    }

    // Check if user is locked out
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'account_locked' },
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      });
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Check if user is blocked
    if (user.isBlocked) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'user_blocked' },
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      });
      throw new UnauthorizedException('User is blocked');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockedUntil: Date | null = null;

      if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: {
          reason: 'invalid_password',
          failedAttempts,
          locked: !!lockedUntil,
        },
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      });

      if (lockedUntil) {
        throw new UnauthorizedException(
          'Account locked due to too many failed attempts',
        );
      }

      return null;
    }

    // Reset failed attempts on successful validation
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any, request?: Request) {
    // Update user login stats
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    const tokens = await this.generateTokens(user);

    // Store refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() +
        parseInt(this.configService.get('JWT_REFRESH_EXPIRY_DAYS', '7')),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refresh_token,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      },
    });

    // Log successful login
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      ipAddress: this.getIpAddress(request),
      userAgent: request?.headers['user-agent'],
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string, request?: Request) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.revokedAt) {
      // Token reuse detected - possible security issue
      await this.revokeAllUserTokens(tokenRecord.userId);
      await this.auditService.log({
        userId: tokenRecord.userId,
        action: AuditAction.TOKEN_REVOKED,
        metadata: { reason: 'reuse_attempt' },
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      });
      throw new ForbiddenException('Token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (tokenRecord.user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(tokenRecord.user);

    // Store new refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() +
        parseInt(this.configService.get('JWT_REFRESH_EXPIRY_DAYS', '7')),
    );

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refresh_token,
        userId: tokenRecord.userId,
        expiresAt: refreshTokenExpiry,
        ipAddress: this.getIpAddress(request),
        userAgent: request?.headers['user-agent'],
      },
    });

    await this.auditService.log({
      userId: tokenRecord.userId,
      action: AuditAction.TOKEN_REFRESH,
      ipAddress: this.getIpAddress(request),
      userAgent: request?.headers['user-agent'],
    });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string, request?: Request) {
    if (refreshToken) {
      // Revoke specific refresh token
      await this.prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      ipAddress: this.getIpAddress(request),
      userAgent: request?.headers['user-agent'],
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string, request?: Request) {
    // Revoke all refresh tokens for user
    await this.revokeAllUserTokens(userId);

    await this.auditService.log({
      userId,
      action: AuditAction.LOGOUT,
      metadata: { type: 'logout_all_devices' },
      ipAddress: this.getIpAddress(request),
      userAgent: request?.headers['user-agent'],
    });

    return { message: 'Logged out from all devices' };
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: false, // Will be set by controller based on current token
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Session revoked successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: any) {
    const payload: TokenPayload = {
      sub: user.id,
      login: user.login,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      }),
      this.generateRefreshToken(),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
    };
  }

  private generateRefreshToken(): string {
    return uuidv4() + '-' + Date.now();
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private getIpAddress(request?: Request): string | undefined {
    if (!request) return undefined;

    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.ip
    );
  }
}
