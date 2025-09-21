import { PrismaService } from '../database/prisma.service';
export declare class HealthController {
    private prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: string;
        };
    }>;
    ready(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: string;
        };
        memory: {
            heapUsedMB: number;
            heapTotalMB: number;
            percentage: number;
        };
    } | {
        status: string;
        timestamp: string;
        services: {
            database: string;
        };
        memory?: undefined;
    }>;
}
