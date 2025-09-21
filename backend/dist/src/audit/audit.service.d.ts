import { PrismaService } from '../database/prisma.service';
export declare enum AuditAction {
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILED = "LOGIN_FAILED",
    LOGOUT = "LOGOUT",
    TOKEN_REFRESH = "TOKEN_REFRESH",
    TOKEN_REVOKED = "TOKEN_REVOKED",
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    USER_DELETED = "USER_DELETED",
    USER_BLOCKED = "USER_BLOCKED",
    USER_UNBLOCKED = "USER_UNBLOCKED",
    PROFILE_UPDATED = "PROFILE_UPDATED",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
}
interface AuditLogData {
    userId: string;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(data: AuditLogData): Promise<void>;
    getAuditLogs(params: {
        userId?: string;
        action?: string;
        skip?: number;
        take?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        data: ({
            user: {
                id: string;
                login: string;
                displayName: string | null;
                role: import("@prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            action: string;
            entityType: string | null;
            entityId: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
            userId: string;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    cleanupOldLogs(retentionDays?: number): Promise<{
        deleted: number;
    }>;
}
export {};
