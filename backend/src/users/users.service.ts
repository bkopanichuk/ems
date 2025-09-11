import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByLogin(login: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { login } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        password: false
      }
    });
  }

  async create(data: {
    login: string;
    password: string;
    displayName?: string;
    role?: Role;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        password: false
      }
    });
  }

  async update(id: string, data: {
    displayName?: string;
    password?: string;
    role?: Role;
    isBlocked?: boolean;
  }): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        password: false
      }
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        password: false
      }
    });
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
