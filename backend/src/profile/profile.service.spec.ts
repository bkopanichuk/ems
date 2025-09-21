import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: PrismaService;
  let authService: AuthService;

  const mockUser = {
    id: '1',
    login: 'testuser',
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
              update: jest.fn(),
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile('1');

      expect(result).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
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

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      await expect(service.getProfile('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user display name', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, displayName: 'New Display Name' };
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.updateProfile('1', { displayName: 'New Display Name' });

      expect(result).toEqual({
        id: updatedUser.id,
        login: updatedUser.login,
        displayName: 'New Display Name',
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
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

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProfile('999', { displayName: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      await expect(service.updateProfile('1', { displayName: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty update', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.updateProfile('1', {});

      expect(result).toEqual({
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {},
        select: expect.any(Object),
      });
    });
  });

  describe('changePassword', () => {
    it('should change password for regular user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await service.changePassword('1', {
        oldPassword: 'oldPass123',
        newPassword: 'newPass123',
      });

      expect(authService.changePassword).toHaveBeenCalledWith('1', 'oldPass123', 'newPass123');
    });

    it('should throw BadRequestException when admin tries to change password', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

      await expect(
        service.changePassword('2', {
          oldPassword: 'oldPass123',
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changePassword('999', {
          oldPassword: 'oldPass123',
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is soft deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(deletedUser);

      await expect(
        service.changePassword('1', {
          oldPassword: 'oldPass123',
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate AuthService errors', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (authService.changePassword as jest.Mock).mockRejectedValue(
        new BadRequestException('Incorrect old password'),
      );

      await expect(
        service.changePassword('1', {
          oldPassword: 'wrongPass',
          newPassword: 'newPass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});