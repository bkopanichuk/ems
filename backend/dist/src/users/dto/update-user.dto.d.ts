import { Role } from '@prisma/client';
export declare class UpdateUserDto {
    displayName?: string;
    password?: string;
    role?: Role;
    isBlocked?: boolean;
}
