import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    // Check for existing user (including soft-deleted)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        login: userData.login,
      },
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        throw new ConflictException('This login was previously used. Please choose a different login.');
      }
      throw new ConflictException('User with this login already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('User with this login already exists');
        }
      }
      throw error;
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip = 0, take = 10, where, orderBy } = params || {};

    // Exclude soft-deleted users
    const whereWithDeleted = {
      ...where,
      deletedAt: null,
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where: whereWithDeleted,
        orderBy: orderBy || { createdAt: 'desc' },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: whereWithDeleted }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        lastPage: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
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

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: set deletedAt timestamp
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        // Also revoke all refresh tokens
        refreshTokens: {
          updateMany: {
            where: { userId: id },
            data: { revokedAt: new Date() },
          },
        },
      },
    });

    return { message: 'User deleted successfully' };
  }

  async blockUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: true },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
      },
    });

    return updatedUser;
  }

  async unblockUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isBlocked: false },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
      },
    });

    return updatedUser;
  }

  async assignRole(id: string, role: 'USER' | 'ADMIN') {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
      },
    });

    return updatedUser;
  }

  async restore(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: { not: null },
      },
    });

    if (!user) {
      throw new NotFoundException('Deleted user not found');
    }

    const restoredUser = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        isBlocked: false, // Unblock on restore
        failedLoginAttempts: 0, // Reset login attempts
        lockedUntil: null, // Unlock account
      },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
      },
    });

    return restoredUser;
  }

  async findDeleted(params?: {
    skip?: number;
    take?: number;
  }) {
    const { skip = 0, take = 10 } = params || {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where: {
          deletedAt: { not: null },
        },
        orderBy: { deletedAt: 'desc' },
        select: {
          id: true,
          login: true,
          displayName: true,
          role: true,
          deletedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: { not: null },
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        lastPage: Math.ceil(total / take),
      },
    };
  }

  async permanentlyDelete(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: { not: null },
      },
    });

    if (!user) {
      throw new NotFoundException('Deleted user not found');
    }

    // Delete all related data first to avoid foreign key constraints
    await this.prisma.$transaction(async (tx) => {
      // Delete audit logs
      await tx.auditLog.deleteMany({
        where: { userId: id },
      });

      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId: id },
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    return { message: 'User permanently deleted' };
  }
}