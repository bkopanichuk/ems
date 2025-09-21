import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuditService, AuditAction } from '../audit/audit.service';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

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
  };

  const mockRequest = {
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
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
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                'jwt.secret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key];
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

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        role: mockUser.role,
        displayName: mockUser.displayName,
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: AuditAction.LOGIN_SUCCESS,
        metadata: { login: 'testuser' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should return null when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.validateUser('nonexistent', 'password', mockRequest);

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
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: deletedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { login: 'testuser', reason: 'user_deleted' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should return null when password is incorrect', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 1,
      });

      const result = await authService.validateUser('testuser', 'wrongpassword', mockRequest);

      expect(result).toBeNull();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });
    });

    it('should lock account after max failed attempts', async () => {
      const userWithFailedAttempts = { ...mockUser, failedLoginAttempts: 4 };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithFailedAttempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...userWithFailedAttempts,
        failedLoginAttempts: 5,
        lockedUntil: new Date(),
      });

      const result = await authService.validateUser('testuser', 'wrongpassword', mockRequest);

      expect(result).toBeNull();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: { increment: 1 },
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should return null when account is locked', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() + 10000) };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: lockedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { login: 'testuser', reason: 'account_locked' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should unlock account if lockout period has expired', async () => {
      const lockedUser = { ...mockUser, lockedUntil: new Date(Date.now() - 1000) };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(lockedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...lockedUser,
        lockedUntil: null,
        failedLoginAttempts: 0,
      });

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should return null when user is blocked', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(blockedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith({
        userId: blockedUser.id,
        action: AuditAction.LOGIN_FAILED,
        metadata: { login: 'testuser', reason: 'user_blocked' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should reset failed attempts on successful login', async () => {
      const userWithFailedAttempts = { ...mockUser, failedLoginAttempts: 3 };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithFailedAttempts);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...userWithFailedAttempts,
        failedLoginAttempts: 0,
      });

      const result = await authService.validateUser('testuser', 'password', mockRequest);

      expect(result).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login(mockUser, mockRequest);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          login: mockUser.login,
          displayName: mockUser.displayName,
          role: mockUser.role,
        },
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          refreshToken: 'refresh-token',
          refreshTokenExpiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const userWithRefreshToken = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 86400000),
      };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '1' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithRefreshToken);
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      (prismaService.user.update as jest.Mock).mockResolvedValue(userWithRefreshToken);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '999' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      const userWithDifferentToken = {
        ...mockUser,
        refreshToken: 'different-token',
        refreshTokenExpiresAt: new Date(Date.now() + 86400000),
      };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '1' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithDifferentToken);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() - 86400000),
      };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '1' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(userWithExpiredToken);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is blocked', async () => {
      const blockedUser = {
        ...mockUser,
        refreshToken: 'valid-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 86400000),
        isBlocked: true,
      };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: '1' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(blockedUser);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.logout('1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          refreshToken: null,
          refreshTokenExpiresAt: null,
        },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      });

      await authService.changePassword('1', 'oldPassword', 'newPassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          password: 'newHashedPassword',
          refreshToken: null,
          refreshTokenExpiresAt: null,
        },
      });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: '1',
        action: AuditAction.PASSWORD_CHANGED,
        metadata: {},
      });
    });

    it('should throw BadRequestException when old password is incorrect', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword('1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);

      expect(auditService.log).toHaveBeenCalledWith({
        userId: '1',
        action: AuditAction.PASSWORD_CHANGE_FAILED,
        metadata: { reason: 'incorrect_password' },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.changePassword('999', 'oldPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser('1');

      expect(result).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
      });
    });

    it('should return null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.getCurrentUser('999');

      expect(result).toBeNull();
    });
  });
});