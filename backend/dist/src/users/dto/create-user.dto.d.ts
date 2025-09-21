import { Role } from '@prisma/client';
export declare class CreateUserDto {
    login: string;
    password: string;
    displayName?: string;
    role?: Role;
}
