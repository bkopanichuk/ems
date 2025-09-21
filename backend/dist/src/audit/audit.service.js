"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.AuditAction = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
var AuditAction;
(function (AuditAction) {
    AuditAction["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    AuditAction["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["TOKEN_REFRESH"] = "TOKEN_REFRESH";
    AuditAction["TOKEN_REVOKED"] = "TOKEN_REVOKED";
    AuditAction["USER_CREATED"] = "USER_CREATED";
    AuditAction["USER_UPDATED"] = "USER_UPDATED";
    AuditAction["USER_DELETED"] = "USER_DELETED";
    AuditAction["USER_BLOCKED"] = "USER_BLOCKED";
    AuditAction["USER_UNBLOCKED"] = "USER_UNBLOCKED";
    AuditAction["PROFILE_UPDATED"] = "PROFILE_UPDATED";
    AuditAction["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    AuditAction["ROLE_ASSIGNED"] = "ROLE_ASSIGNED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(data) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    metadata: data.metadata || {},
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
        }
        catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }
    async getAuditLogs(params) {
        const { userId, action, skip = 0, take = 50, startDate, endDate } = params;
        const where = {};
        if (userId)
            where.userId = userId;
        if (action)
            where.action = action;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            login: true,
                            displayName: true,
                            role: true,
                        },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data: logs,
            meta: {
                total,
                page: Math.floor(skip / take) + 1,
                lastPage: Math.ceil(total / take),
            },
        };
    }
    async cleanupOldLogs(retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await this.prisma.auditLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return { deleted: result.count };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map