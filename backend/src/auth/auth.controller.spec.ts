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
            getCurrentUser: jest.fn(),
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
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };
      (authService.login as jest.Mock).mockResolvedValue(loginResponse);

      const result = await authController.login(mockRequest);

      expect(result).toEqual(loginResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser, mockRequest);
    });
  });

  describe('refresh', () => {
    it('should return new tokens', async () => {
      const refreshDto = { refreshToken: 'valid-refresh-token' };
      const tokensResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      (authService.refreshToken as jest.Mock).mockResolvedValue(tokensResponse);

      const result = await authController.refresh(refreshDto);

      expect(result).toEqual(tokensResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw UnauthorizedException when refresh fails', async () => {
      const refreshDto = { refreshToken: 'invalid-refresh-token' };
      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(authController.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      await authController.logout(mockRequest);

      expect(authService.logout).toHaveBeenCalledWith('1');
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await authController.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
      expect(authService.getCurrentUser).toHaveBeenCalledWith('1');
    });

    it('should return null when user not found', async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await authController.getProfile(mockRequest);

      expect(result).toBeNull();
    });
  });
});