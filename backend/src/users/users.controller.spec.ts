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

  const mockRequest = {
    user: { id: '2', role: Role.ADMIN },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            block: jest.fn(),
            unblock: jest.fn(),
            assignRole: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [mockUser, mockAdmin];
      (service.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      (service.findAll as jest.Mock).mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
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
      (service.findOne as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
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

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(createdUser);
      expect(service.create).toHaveBeenCalledWith(createDto, '2');
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

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(createdAdmin);
      expect(service.create).toHaveBeenCalledWith(createDto, '2');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      (service.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateDto, mockRequest);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, '2');
    });

    it('should update user role', async () => {
      const updateDto = { role: Role.ADMIN };
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      (service.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.update('1', updateDto, mockRequest);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, '2');
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      await controller.remove('1', mockRequest);

      expect(service.remove).toHaveBeenCalledWith('1', '2');
    });

    it('should handle deletion errors', async () => {
      (service.remove as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.remove('999', mockRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('block', () => {
    it('should block user', async () => {
      await controller.block('1', mockRequest);

      expect(service.block).toHaveBeenCalledWith('1', '2');
    });

    it('should handle blocking errors', async () => {
      (service.block as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.block('999', mockRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unblock', () => {
    it('should unblock user', async () => {
      await controller.unblock('1', mockRequest);

      expect(service.unblock).toHaveBeenCalledWith('1', '2');
    });

    it('should handle unblocking errors', async () => {
      (service.unblock as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.unblock('999', mockRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const assignRoleDto = { role: Role.ADMIN };

      await controller.assignRole('1', assignRoleDto, mockRequest);

      expect(service.assignRole).toHaveBeenCalledWith('1', Role.ADMIN, '2');
    });

    it('should handle role assignment errors', async () => {
      const assignRoleDto = { role: Role.USER };
      (service.assignRole as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.assignRole('999', assignRoleDto, mockRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});