import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private auditService;
    private readonly MAX_FAILED_ATTEMPTS;
    private readonly LOCKOUT_DURATION;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, auditService: AuditService);
    validateUser(login: string, password: string, request?: Request): Promise<any>;
    login(user: any, request?: Request): Promise<{
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
    refreshToken(refreshToken: string, request?: Request): Promise<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
    }>;
    logout(userId: string, refreshToken?: string, request?: Request): Promise<{
        message: string;
    }>;
    logoutAll(userId: string, request?: Request): Promise<{
        message: string;
    }>;
    getActiveSessions(userId: string): Promise<{
        isCurrent: boolean;
        id: string;
        createdAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        expiresAt: Date;
    }[]>;
    revokeSession(userId: string, sessionId: string): Promise<{
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
    private generateTokens;
    private generateRefreshToken;
    private revokeAllUserTokens;
    private getIpAddress;
}
