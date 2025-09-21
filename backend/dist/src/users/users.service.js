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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createUserDto) {
        const { password, ...userData } = createUserDto;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                login: userData.login,
            },
        });
        if (existingUser) {
            if (existingUser.deletedAt) {
                throw new common_1.ConflictException('This login was previously used. Please choose a different login.');
            }
            throw new common_1.ConflictException('User with this login already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword,
                },
                select: {
                    id: true,
                    login: true,
                    displayName: true,
                    role: true,
                    isBlocked: true,
                    createdAt: true,
                },
            });
            return user;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new common_1.ConflictException('User with this login already exists');
                }
            }
            throw error;
        }
    }
    async findAll(params) {
        const { skip = 0, take = 10, where, orderBy } = params || {};
        const whereWithDeleted = {
            ...where,
            deletedAt: null,
        };
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take,
                where: whereWithDeleted,
                orderBy: orderBy || { createdAt: 'desc' },
                select: {
                    id: true,
                    login: true,
                    displayName: true,
                    role: true,
                    isBlocked: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.user.count({ where: whereWithDeleted }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page: Math.floor(skip / take) + 1,
                lastPage: Math.ceil(total / take),
            },
        };
    }
    async findOne(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async update(id, updateUserDto) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updateData = { ...updateUserDto };
        if (updateUserDto.password) {
            updateData.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return updatedUser;
    }
    async remove(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                refreshTokens: {
                    updateMany: {
                        where: { userId: id },
                        data: { revokedAt: new Date() },
                    },
                },
            },
        });
        return { message: 'User deleted successfully' };
    }
    async blockUser(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { isBlocked: true },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
            },
        });
        return updatedUser;
    }
    async unblockUser(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { isBlocked: false },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
            },
        });
        return updatedUser;
    }
    async assignRole(id, role) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
            },
        });
        return updatedUser;
    }
    async restore(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: { not: null },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Deleted user not found');
        }
        const restoredUser = await this.prisma.user.update({
            where: { id },
            data: {
                deletedAt: null,
                isBlocked: false,
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
            select: {
                id: true,
                login: true,
                displayName: true,
                role: true,
                isBlocked: true,
            },
        });
        return restoredUser;
    }
    async findDeleted(params) {
        const { skip = 0, take = 10 } = params || {};
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take,
                where: {
                    deletedAt: { not: null },
                },
                orderBy: { deletedAt: 'desc' },
                select: {
                    id: true,
                    login: true,
                    displayName: true,
                    role: true,
                    deletedAt: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({
                where: {
                    deletedAt: { not: null },
                },
            }),
        ]);
        return {
            data: users,
            meta: {
                total,
                page: Math.floor(skip / take) + 1,
                lastPage: Math.ceil(total / take),
            },
        };
    }
    async permanentlyDelete(id) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                deletedAt: { not: null },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Deleted user not found');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.auditLog.deleteMany({
                where: { userId: id },
            });
            await tx.refreshToken.deleteMany({
                where: { userId: id },
            });
            await tx.user.delete({
                where: { id },
            });
        });
        return { message: 'User permanently deleted' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map