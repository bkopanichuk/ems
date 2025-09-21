import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    displayName: 'Test User',
    role: 'USER',
  };

  const mockRequest = {
    user: mockUser,
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            getProfile: jest.fn(),
            getActiveSessions: jest.fn(),
            revokeSession: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return login response with tokens', async () => {
      const loginResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser,
      };
      (authService.login as jest.Mock).mockResolvedValue(loginResponse);

      const loginDto = { login: 'testuser', password: 'password123' };
      const result = await authController.login(loginDto, mockRequest);

      expect(result).toEqual(loginResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser, mockRequest);
    });
  });

  describe('refresh', () => {
    it('should return new tokens', async () => {
      const refreshDto = { refresh_token: 'valid-refresh-token' };
      const tokensResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };
      (authService.refreshToken as jest.Mock).mockResolvedValue(tokensResponse);

      const result = await authController.refresh(refreshDto, mockRequest);

      expect(result).toEqual(tokensResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        mockRequest,
      );
    });

    it('should throw UnauthorizedException when refresh fails', async () => {
      const refreshDto = { refresh_token: 'invalid-refresh-token' };
      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        authController.refresh(refreshDto, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const logoutResponse = { message: 'Logged out successfully' };
      (authService.logout as jest.Mock).mockResolvedValue(logoutResponse);

      const result = await authController.logout(
        '1',
        'refresh-token',
        mockRequest,
      );

      expect(result).toEqual(logoutResponse);
      expect(authService.logout).toHaveBeenCalledWith(
        '1',
        'refresh-token',
        mockRequest,
      );
    });

    it('should logout without refresh token', async () => {
      const logoutResponse = { message: 'Logged out successfully' };
      (authService.logout as jest.Mock).mockResolvedValue(logoutResponse);

      const result = await authController.logout('1', undefined, mockRequest);

      expect(result).toEqual(logoutResponse);
      expect(authService.logout).toHaveBeenCalledWith(
        '1',
        undefined,
        mockRequest,
      );
    });
  });

  describe('logoutAll', () => {
    it('should logout from all devices', async () => {
      const logoutResponse = { message: 'Logged out from all devices' };
      (authService.logoutAll as jest.Mock).mockResolvedValue(logoutResponse);

      const result = await authController.logoutAll('1', mockRequest);

      expect(result).toEqual(logoutResponse);
      expect(authService.logoutAll).toHaveBeenCalledWith('1', mockRequest);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      (authService.getProfile as jest.Mock).mockResolvedValue(mockUser);

      const result = await authController.getProfile('1');

      expect(result).toEqual(mockUser);
      expect(authService.getProfile).toHaveBeenCalledWith('1');
    });

    it('should throw when user not found', async () => {
      (authService.getProfile as jest.Mock).mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(authController.getProfile('1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getSessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: new Date(),
          expiresAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla',
        },
      ];
      (authService.getActiveSessions as jest.Mock).mockResolvedValue(
        mockSessions,
      );

      const result = await authController.getSessions('1');

      expect(result).toEqual(mockSessions);
      expect(authService.getActiveSessions).toHaveBeenCalledWith('1');
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session', async () => {
      const revokeResponse = { message: 'Session revoked successfully' };
      (authService.revokeSession as jest.Mock).mockResolvedValue(
        revokeResponse,
      );

      const req = {
        ...mockRequest,
        params: { sessionId: 'session-1' },
      };

      const result = await authController.revokeSession('1', req);

      expect(result).toEqual(revokeResponse);
      expect(authService.revokeSession).toHaveBeenCalledWith('1', 'session-1');
    });
  });
});
