import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, req: any): Promise<{
        user: {
            id: any;
            login: any;
            displayName: any;
            role: any;
        };
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    }>;
    refresh(refreshTokenDto: RefreshTokenDto, req: any): Promise<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    }>;
    logout(userId: string, refreshToken?: string, req?: any): Promise<{
        message: string;
    }>;
    logoutAll(userId: string, req: any): Promise<{
        message: string;
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        login: string;
        displayName: string | null;
        role: import("@prisma/client").$Enums.Role;
        lastLoginAt: Date | null;
        loginCount: number;
        createdAt: Date;
    }>;
    getSessions(userId: string): Promise<{
        isCurrent: boolean;
        id: string;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        expiresAt: Date;
    }[]>;
    revokeSession(userId: string, req: any): Promise<{
        message: string;
    }>;
}
