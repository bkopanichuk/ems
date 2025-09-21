"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    auditService;
    MAX_FAILED_ATTEMPTS = 5;
    LOCKOUT_DURATION = 15 * 60 * 1000;
    constructor(prisma, jwtService, configService, auditService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.auditService = auditService;
    }
    async validateUser(login, password, request) {
        const user = await this.prisma.user.findUnique({
            where: { login },
        });
        if (!user || user.deletedAt) {
            await this.auditService.log({
                userId: user?.id || 'unknown',
                action: audit_service_1.AuditAction.LOGIN_FAILED,
                metadata: {
                    login,
                    reason: user?.deletedAt ? 'user_deleted' : 'user_not_found',
                },
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            });
            return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await this.auditService.log({
                userId: user.id,
                action: audit_service_1.AuditAction.LOGIN_FAILED,
                metadata: { reason: 'account_locked' },
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            });
            throw new common_1.UnauthorizedException('Account is temporarily locked');
        }
        if (user.isBlocked) {
            await this.auditService.log({
                userId: user.id,
                action: audit_service_1.AuditAction.LOGIN_FAILED,
                metadata: { reason: 'user_blocked' },
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            });
            throw new common_1.UnauthorizedException('User is blocked');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            const failedAttempts = user.failedLoginAttempts + 1;
            let lockedUntil = null;
            if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
            }
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: failedAttempts,
                    lockedUntil,
                },
            });
            await this.auditService.log({
                userId: user.id,
                action: audit_service_1.AuditAction.LOGIN_FAILED,
                metadata: {
                    reason: 'invalid_password',
                    failedAttempts,
                    locked: !!lockedUntil,
                },
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            });
            if (lockedUntil) {
                throw new common_1.UnauthorizedException('Account locked due to too many failed attempts');
            }
            return null;
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
        });
        const { password: _, ...result } = user;
        return result;
    }
    async login(user, request) {
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                loginCount: { increment: 1 },
            },
        });
        const tokens = await this.generateTokens(user);
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() +
            parseInt(this.configService.get('JWT_REFRESH_EXPIRY_DAYS', '7')));
        await this.prisma.refreshToken.create({
            data: {
                token: tokens.refresh_token,
                userId: user.id,
                expiresAt: refreshTokenExpiry,
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            },
        });
        await this.auditService.log({
            userId: user.id,
            action: audit_service_1.AuditAction.LOGIN_SUCCESS,
            ipAddress: this.getIpAddress(request),
            userAgent: request?.headers['user-agent'],
        });
        return {
            ...tokens,
            user: {
                id: user.id,
                login: user.login,
                displayName: user.displayName,
                role: user.role,
            },
        };
    }
    async refreshToken(refreshToken, request) {
        const tokenRecord = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!tokenRecord) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (tokenRecord.revokedAt) {
            await this.revokeAllUserTokens(tokenRecord.userId);
            await this.auditService.log({
                userId: tokenRecord.userId,
                action: audit_service_1.AuditAction.TOKEN_REVOKED,
                metadata: { reason: 'reuse_attempt' },
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            });
            throw new common_1.ForbiddenException('Token has been revoked');
        }
        if (tokenRecord.expiresAt < new Date()) {
            await this.prisma.refreshToken.update({
                where: { id: tokenRecord.id },
                data: { revokedAt: new Date() },
            });
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        if (tokenRecord.user.isBlocked) {
            throw new common_1.UnauthorizedException('User is blocked');
        }
        await this.prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revokedAt: new Date() },
        });
        const tokens = await this.generateTokens(tokenRecord.user);
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() +
            parseInt(this.configService.get('JWT_REFRESH_EXPIRY_DAYS', '7')));
        await this.prisma.refreshToken.create({
            data: {
                token: tokens.refresh_token,
                userId: tokenRecord.userId,
                expiresAt: refreshTokenExpiry,
                ipAddress: this.getIpAddress(request),
                userAgent: request?.headers['user-agent'],
            },
        });
        await this.auditService.log({
            userId: tokenRecord.userId,
            action: audit_service_1.AuditAction.TOKEN_REFRESH,
            ipAddress: this.getIpAddress(request),
            userAgent: request?.headers['user-agent'],
        });
        return tokens;
    }
    async logout(userId, refreshToken, request) {
        if (refreshToken) {
            await this.prisma.refreshToken.updateMany({
                where: {
                    token: refreshToken,
                    userId,
                    revokedAt: null,
                },
                data: { revokedAt: new Date() },
            });
        }
        await this.auditService.log({
            userId,
            action: audit_service_1.AuditAction.LOGOUT,
            ipAddress: this.getIpAddress(request),
            userAgent: request?.headers['user-agent'],
        });
        return { message: 'Logged out successfully' };
    }
    async logoutAll(userId, request) {
        await this.revokeAllUserTokens(userId);
        await this.auditService.log({
            userId,
            action: audit_service_1.AuditAction.LOGOUT,
            metadata: { type: 'logout_all_devices' },
            ipAddress: this.getIpAddress(request),
            userAgent: request?.headers['user-agent'],
        });
        return { message: 'Logged out from all devices' };
    }
    async getActiveSessions(userId) {
        const sessions = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                createdAt: true,
                expiresAt: true,
                ipAddress: true,
                userAgent: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return sessions.map((session) => ({
            ...session,
            isCurrent: false,
        }));
    }
    async revokeSession(userId, sessionId) {
        const session = await this.prisma.refreshToken.findFirst({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
            },
        });
        if (!session) {
            throw new common_1.BadRequestException('Session not found or already revoked');
        }
        await this.prisma.refreshToken.update({
            where: { id: sessionId },
            data: { revokedAt: new Date() },
        });
        return { message: 'Session revoked successfully' };
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: userId,
                deletedAt: null,
            },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                lastLoginAt: true,
                loginCount: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            login: user.login,
            role: user.role,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
            }),
            this.generateRefreshToken(),
        ]);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 900,
        };
    }
    generateRefreshToken() {
        return (0, uuid_1.v4)() + '-' + Date.now();
    }
    async revokeAllUserTokens(userId) {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
    }
    getIpAddress(request) {
        if (!request)
            return undefined;
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection?.remoteAddress ||
            request.ip);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map