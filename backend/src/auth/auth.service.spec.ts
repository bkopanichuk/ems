import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

jest.mock('bcrypt');
jest.mock('uuid');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let auditService: AuditService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    password: 'hashedPassword',
    displayName: 'Test User',
    role: 'USER',
    isBlocked: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: null,
    refreshTokenExpiresAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    loginCount: 0,
  };

  const mockRequest = {
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
    connection: {},
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
            },
            refreshToken: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn(prismaService)),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const config = {
                JWT_ACCESS_EXPIRY: '15m',
                JWT_REFRESH_EXPIRY_DAYS: '7',
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      const result = await authService.validateUser(
        'testuser',
        'password',
        mockRequest,
      );

      const { password, ...expectedUser } = mockUser;
      expect(result).toEqual(expectedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should return null when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateUser(
        'nonexistent',
        'password',
        mockRequest,
      );

      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'unknown',
        action: AuditAction.LOGIN_FAILED,
        metadata: { login: 'nonexistent', reason: 'user_not_found' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should return null when user is soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        deletedUser,
      );

      const result = await authService.validateUser(
        'testuser',
        'password',
        mockRequest,
      );

      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: deletedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { login: 'testuser', reason: 'user_deleted' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should increment failed attempts when password is incorrect', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 1,
      });

      const result = await authService.validateUser(
        'testuser',
        'wrongpassword',
        mockRequest,
      );

      expect(result).toBeNull();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 1,
          lockedUntil: null,
        },
      });
    });

    it('should lock account after max failed attempts', async () => {
      const userWithFailedAttempts = { ...mockUser, failedLoginAttempts: 4 };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        userWithFailedAttempts,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...userWithFailedAttempts,
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      await expect(
        authService.validateUser('testuser', 'wrongpassword', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 10000),
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        lockedUser,
      );

      await expect(
        authService.validateUser('testuser', 'password', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditService.log).toHaveBeenCalledWith({
        userId: lockedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'account_locked' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should process login if lockout period has expired', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() - 1000),
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        lockedUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...lockedUser,
        lockedUntil: null,
        failedLoginAttempts: 0,
      });

      const result = await authService.validateUser(
        'testuser',
        'password',
        mockRequest,
      );

      expect(result).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should throw UnauthorizedException when user is blocked', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        blockedUser,
      );

      await expect(
        authService.validateUser('testuser', 'password', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditService.log).toHaveBeenCalledWith({
        userId: blockedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { reason: 'user_blocked' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      (jwtService.signAsync as jest.Mock).mockResolvedValue('access-token');
      (authService as any).generateRefreshToken = jest
        .fn()
        .mockReturnValue('refresh-token-uuid-123456789');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login(mockUser, mockRequest);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token-uuid-123456789',
        token_type: 'Bearer',
        expires_in: 900,
        user: {
          id: mockUser.id,
          login: mockUser.login,
          displayName: mockUser.displayName,
          role: mockUser.role,
        },
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          lastLoginAt: expect.any(Date),
          loginCount: { increment: 1 },
        },
      });

      expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: 'refresh-token-uuid-123456789',
          userId: mockUser.id,
          expiresAt: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        },
      });
    });
  });

  describe('refreshToken', () => {
    const mockTokenRecord = {
      id: 'token-1',
      token: 'valid-refresh-token',
      userId: '1',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      user: mockUser,
    };

    it('should return new tokens when refresh token is valid', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        mockTokenRecord,
      );
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});
      (jwtService.signAsync as jest.Mock).mockResolvedValue('new-access-token');
      (authService as any).generateRefreshToken = jest
        .fn()
        .mockReturnValue('new-refresh-token-uuid');

      const result = await authService.refreshToken(
        'valid-refresh-token',
        mockRequest,
      );

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token-uuid',
        token_type: 'Bearer',
        expires_in: 900,
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when token is revoked', async () => {
      const revokedToken = { ...mockTokenRecord, revokedAt: new Date() };
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        revokedToken,
      );
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue(
        {},
      );

      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const expiredToken = {
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 86400000),
      };
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        expiredToken,
      );
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});

      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is blocked', async () => {
      const tokenWithBlockedUser = {
        ...mockTokenRecord,
        user: { ...mockUser, isBlocked: true },
      };
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(
        tokenWithBlockedUser,
      );

      await expect(
        authService.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      const result = await authService.logout(
        '1',
        'refresh-token',
        mockRequest,
      );

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          token: 'refresh-token',
          userId: '1',
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens', async () => {
      (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });

      const result = await authService.logoutAll('1', mockRequest);

      expect(result).toEqual({ message: 'Logged out from all devices' });
      expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const profileData = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        lastLoginAt: null,
        loginCount: 0,
        createdAt: mockUser.createdAt,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(
        profileData,
      );

      const result = await authService.getProfile('1');

      expect(result).toEqual(profileData);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: '1',
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
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(authService.getProfile('999')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla',
        },
      ];
      (prismaService.refreshToken.findMany as jest.Mock).mockResolvedValue(
        mockSessions,
      );

      const result = await authService.getActiveSessions('1');

      expect(result).toEqual(
        mockSessions.map((s) => ({ ...s, isCurrent: false })),
      );
      expect(prismaService.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          userId: '1',
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
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
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: '1',
        token: 'token',
        revokedAt: null,
      };
      (prismaService.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        mockSession,
      );
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValue({});

      const result = await authService.revokeSession('1', 'session-1');

      expect(result).toEqual({ message: 'Session revoked successfully' });
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException when session not found', async () => {
      (prismaService.refreshToken.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        authService.revokeSession('1', 'invalid-session'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
