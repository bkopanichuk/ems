import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    findAll(params?: {
        skip?: number;
        take?: number;
        where?: Prisma.UserWhereInput;
        orderBy?: Prisma.UserOrderByWithRelationInput;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            login: string;
            displayName: string | null;
            role: import("@prisma/client").$Enums.Role;
            isBlocked: boolean;
            updatedAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
        updatedAt: Date;
    }>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    blockUser(id: string): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    unblockUser(id: string): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    assignRole(id: string, role: 'USER' | 'ADMIN'): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    restore(id: string): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    findDeleted(params?: {
        skip?: number;
        take?: number;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            login: string;
            displayName: string | null;
            role: import("@prisma/client").$Enums.Role;
            deletedAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    permanentlyDelete(id: string): Promise<{
        message: string;
    }>;
}
