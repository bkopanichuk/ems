import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    displayName: 'Test User',
    role: 'USER',
    isBlocked: false,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'jwt.secret') return 'test-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validate', () => {
    it('should return user when valid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const payload = { sub: '1', login: 'testuser', role: 'USER' };
      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: '1',
        login: 'testuser',
        role: 'USER',
        displayName: 'Test User',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const payload = { sub: '999', login: 'nonexistent', role: 'USER' };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is blocked', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        blockedUser,
      );

      const payload = { sub: '1', login: 'testuser', role: 'USER' };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user even if soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        deletedUser,
      );

      const payload = { sub: '1', login: 'testuser', role: 'USER' };
      const result = await strategy.validate(payload);

      // Note: Current implementation doesn't check for soft deleted users
      // This might be intentional to allow tokens to work until expiry
      expect(result).toEqual({
        id: '1',
        login: 'testuser',
        role: 'USER',
        displayName: 'Test User',
      });
    });
  });
});
