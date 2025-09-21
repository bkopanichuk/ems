import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
        },
      };
    }
  }

  @Get('ready')
  async ready() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
        },
        memory: {
          heapUsedMB,
          heapTotalMB,
          percentage: Math.round((heapUsedMB / heapTotalMB) * 100),
        },
      };
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
        },
      };
    }
  }
}
