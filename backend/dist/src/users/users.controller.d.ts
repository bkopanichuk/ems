import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        id: string;
        createdAt: Date;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        isBlocked: boolean;
    }>;
    findAll(page: number, limit: number): Promise<{
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
    findDeleted(page: number, limit: number): Promise<{
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
    permanentlyDelete(id: string): Promise<{
        message: string;
    }>;
}
