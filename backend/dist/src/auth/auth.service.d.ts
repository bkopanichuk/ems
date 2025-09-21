import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(login: string, password: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            login: any;
            displayName: any;
            role: any;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
    }>;
}
