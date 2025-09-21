import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../database/prisma.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    password: 'hashedPassword',
    displayName: 'Test User',
    role: Role.USER,
    isBlocked: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin = {
    id: '2',
    login: 'admin',
    password: 'hashedPassword',
    displayName: 'Admin User',
    role: Role.ADMIN,
    isBlocked: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userWithoutPassword = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(userWithoutPassword);

      const result = await service.getProfile('1');

      expect(result).toEqual(userWithoutPassword);
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
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('999')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is soft deleted', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('should update user display name', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      const updatedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: 'New Display Name',
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateProfile('1', { displayName: 'New Display Name' });

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { displayName: 'New Display Name' },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('999', { displayName: 'New Name' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is soft deleted', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('1', { displayName: 'New Name' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty update', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      const userResult = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue(userResult);

      const result = await service.updateProfile('1', {});

      expect(result).toEqual(userResult);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {},
        select: expect.any(Object),
      });
    });
  });

  describe('changePassword', () => {
    it('should change password for regular user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      (prismaService.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: 'newHashedPassword' });

      const result = await service.changePassword('1', {
        currentPassword: 'oldPass123',
        newPassword: 'newPass123',
      }, Role.USER);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPass123', mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPass123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'newHashedPassword' },
      });
    });

    it('should throw ForbiddenException when admin tries to change password', async () => {
      await expect(
        service.changePassword('2', {
          currentPassword: 'oldPass123',
          newPassword: 'newPass123',
        }, Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);

      // Should not even check the user
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('999', {
          currentPassword: 'oldPass123',
          newPassword: 'newPass123',
        }, Role.USER),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is soft deleted', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('1', {
          currentPassword: 'oldPass123',
          newPassword: 'newPass123',
        }, Role.USER),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPass123',
        }, Role.USER),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', mockUser.password);
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });
});