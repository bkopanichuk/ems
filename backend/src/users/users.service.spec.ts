import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
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
    refreshToken: null,
    refreshTokenExpiresAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const mockAdmin = {
    ...mockUser,
    id: '2',
    login: 'admin',
    displayName: 'Admin User',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all active users with pagination metadata', async () => {
      const mockUsers = [
        {
          id: mockUser.id,
          login: mockUser.login,
          displayName: mockUser.displayName,
          role: mockUser.role,
          isBlocked: mockUser.isBlocked,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        {
          id: mockAdmin.id,
          login: mockAdmin.login,
          displayName: mockAdmin.displayName,
          role: mockAdmin.role,
          isBlocked: mockAdmin.isBlocked,
          createdAt: mockAdmin.createdAt,
          updatedAt: mockAdmin.updatedAt,
        },
      ];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prismaService.user.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll({ skip: 0, take: 10 });

      expect(result).toEqual({
        data: mockUsers,
        meta: {
          total: 2,
          page: 1,
          lastPage: 1,
        },
      });
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return empty array when no users exist', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          lastPage: 0,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUserWithoutPassword = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUserWithoutPassword);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUserWithoutPassword);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is soft deleted', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto = {
        login: 'newuser',
        password: 'password123',
        displayName: 'New User',
        role: Role.USER,
      };
      const hashedPassword = 'hashedPassword123';
      const createdUser = {
        id: '3',
        login: 'newuser',
        displayName: 'New User',
        role: Role.USER,
        isBlocked: false,
        createdAt: new Date(),
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (prismaService.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          login: 'newuser',
          password: hashedPassword,
          displayName: 'New User',
          role: Role.USER,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException when login already exists', async () => {
      const createDto = {
        login: 'existinguser',
        password: 'password123',
        displayName: 'Existing User',
        role: Role.USER,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when login was previously used', async () => {
      const createDto = {
        login: 'deleteduser',
        password: 'password123',
        displayName: 'Deleted User',
        role: Role.USER,
      };
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(deletedUser);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user displayName', async () => {
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: 'Updated Name',
        role: mockUser.role,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
        select: expect.any(Object),
      });
    });

    it('should update user role', async () => {
      const updateDto = { role: Role.ADMIN };
      const updatedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: Role.ADMIN,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };

      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update('1', updateDto);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('999', { displayName: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not update deleted user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('1', { displayName: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      const result = await service.remove('1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          deletedAt: expect.any(Date),
          refreshTokens: {
            updateMany: {
              where: { userId: '1' },
              data: { revokedAt: expect.any(Date) },
            },
          },
        },
      });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('blockUser', () => {
    it('should block user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      const blockedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        isBlocked: true,
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue(blockedUser);

      const result = await service.blockUser('1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isBlocked: true },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
        },
      });
      expect(result).toEqual(blockedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.blockUser('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unblockUser', () => {
    it('should unblock user', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(blockedUser);
      const unblockedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: mockUser.role,
        isBlocked: false,
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue(unblockedUser);

      const result = await service.unblockUser('1');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isBlocked: false },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
        },
      });
      expect(result).toEqual(unblockedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.unblockUser('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      const updatedUser = {
        id: mockUser.id,
        login: mockUser.login,
        displayName: mockUser.displayName,
        role: Role.ADMIN,
        isBlocked: mockUser.isBlocked,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      };
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.assignRole('1', Role.ADMIN);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: Role.ADMIN },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.assignRole('999', Role.ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

});