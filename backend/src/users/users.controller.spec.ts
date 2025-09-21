import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    displayName: 'Test User',
    role: Role.USER,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin = {
    id: '2',
    login: 'admin',
    displayName: 'Admin User',
    role: Role.ADMIN,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findDeleted: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            blockUser: jest.fn(),
            unblockUser: jest.fn(),
            assignRole: jest.fn(),
            restore: jest.fn(),
            permanentlyDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of users with pagination', async () => {
      const users = [mockUser, mockAdmin];
      (service.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.findAll(1, 10);

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledWith({ skip: 0, take: 10 });
    });

    it('should calculate skip correctly for page 2', async () => {
      (service.findAll as jest.Mock).mockResolvedValue([]);

      await controller.findAll(2, 10);

      expect(service.findAll).toHaveBeenCalledWith({ skip: 10, take: 10 });
    });
  });

  describe('findDeleted', () => {
    it('should return array of deleted users with pagination', async () => {
      const deletedUsers = [{ ...mockUser, deletedAt: new Date() }];
      (service.findDeleted as jest.Mock).mockResolvedValue(deletedUsers);

      const result = await controller.findDeleted(1, 10);

      expect(result).toEqual(deletedUsers);
      expect(service.findDeleted).toHaveBeenCalledWith({ skip: 0, take: 10 });
    });
  });

  describe('findOne', () => {
    it('should return single user', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      (service.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create new user', async () => {
      const createDto = {
        login: 'newuser',
        password: 'password123',
        displayName: 'New User',
        role: Role.USER,
      };
      const createdUser = { ...mockUser, ...createDto };
      (service.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdUser);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create admin user', async () => {
      const createDto = {
        login: 'newadmin',
        password: 'password123',
        displayName: 'New Admin',
        role: Role.ADMIN,
      };
      const createdAdmin = { ...mockAdmin, ...createDto };
      (service.create as jest.Mock).mockResolvedValue(createdAdmin);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdAdmin);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      (service.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should update user role', async () => {
      const updateDto = { role: Role.ADMIN };
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      (service.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });

    it('should handle deletion errors', async () => {
      (service.remove as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('blockUser', () => {
    it('should block user', async () => {
      await controller.blockUser('1');

      expect(service.blockUser).toHaveBeenCalledWith('1');
    });

    it('should handle blocking errors', async () => {
      (service.blockUser as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.blockUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unblockUser', () => {
    it('should unblock user', async () => {
      await controller.unblockUser('1');

      expect(service.unblockUser).toHaveBeenCalledWith('1');
    });

    it('should handle unblocking errors', async () => {
      (service.unblockUser as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.unblockUser('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      await controller.assignRole('1', Role.ADMIN);

      expect(service.assignRole).toHaveBeenCalledWith('1', Role.ADMIN);
    });

    it('should handle role assignment errors', async () => {
      (service.assignRole as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.assignRole('999', Role.USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('should restore deleted user', async () => {
      await controller.restore('1');

      expect(service.restore).toHaveBeenCalledWith('1');
    });

    it('should handle restore errors', async () => {
      (service.restore as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.restore('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
