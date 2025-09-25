import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InvertersService {
  constructor(private readonly db: PrismaService) {}

  async create(userId: string, createInverterDto: CreateInverterDto) {
    return this.db.inverter.create({
      data: {
        ...createInverterDto,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.db.inverter.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const inverter = await this.db.inverter.findUnique({
      where: {
        id,
      },
    });

    if (!inverter) {
      throw new NotFoundException(`Инвертор с ID ${id} не найден`);
    }

    if (inverter.userId !== userId) {
      throw new ForbiddenException('У вас нет доступа к этому инвертору');
    }

    return inverter;
  }

  async update(
    id: string,
    userId: string,
    updateInverterDto: UpdateInverterDto,
  ) {
    await this.findOne(id, userId);

    return this.db.inverter.update({
      where: {
        id,
      },
      data: updateInverterDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.db.inverter.delete({
      where: {
        id,
      },
    });
  }
}
