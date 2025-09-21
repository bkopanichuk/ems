import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { Role } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: ProfileService;

  const mockUser = {
    id: '1',
    login: 'testuser',
    displayName: 'Test User',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    service = module.get<ProfileService>(ProfileService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      (service.getProfile as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.getProfile('1');

      expect(result).toEqual(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      (service.getProfile as jest.Mock).mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getProfile('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update display name', async () => {
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      (service.updateProfile as jest.Mock).mockResolvedValue(updatedUser);

      const result = await controller.updateProfile('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.updateProfile).toHaveBeenCalledWith('1', updateDto);
    });

    it('should handle empty update', async () => {
      const updateDto = {};
      (service.updateProfile as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.updateProfile('1', updateDto);

      expect(result).toEqual(mockUser);
      expect(service.updateProfile).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      const updateDto = { displayName: 'New Name' };
      (service.updateProfile as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.updateProfile('999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        oldPassword: 'oldPass123',
        newPassword: 'newPass123',
      };

      await controller.changePassword('1', Role.USER, changePasswordDto);

      expect(service.changePassword).toHaveBeenCalledWith('1', changePasswordDto, Role.USER);
    });

    it('should throw BadRequestException when old password is incorrect', async () => {
      const changePasswordDto = {
        oldPassword: 'wrongPass',
        newPassword: 'newPass123',
      };
      (service.changePassword as jest.Mock).mockRejectedValue(
        new BadRequestException('Incorrect old password'),
      );

      await expect(
        controller.changePassword('1', Role.USER, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when admin tries to change password', async () => {
      const changePasswordDto = {
        oldPassword: 'oldPass123',
        newPassword: 'newPass123',
      };
      (service.changePassword as jest.Mock).mockRejectedValue(
        new BadRequestException('Admins cannot change password'),
      );

      await expect(
        controller.changePassword('2', Role.ADMIN, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const changePasswordDto = {
        oldPassword: 'oldPass123',
        newPassword: 'newPass123',
      };
      (service.changePassword as jest.Mock).mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.changePassword('999', Role.USER, changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});