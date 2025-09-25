import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvertersService } from './inverters.service';
import { CreateInverterDto } from './dto/create-inverter.dto';
import { UpdateInverterDto } from './dto/update-inverter.dto';
import { InverterResponseDto } from './dto/inverter-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('inverters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inverters')
export class InvertersController {
  constructor(private readonly invertersService: InvertersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый инвертор' })
  @ApiResponse({ status: 201, type: InverterResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createInverterDto: CreateInverterDto,
  ) {
    const data = await this.invertersService.create(userId, createInverterDto);
    return {
      status: 'success',
      data,
      message: 'Инвертор успешно создан',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех инверторов пользователя' })
  @ApiResponse({ status: 200, type: [InverterResponseDto] })
  async findAll(@CurrentUser('id') userId: string) {
    const data = await this.invertersService.findAll(userId);
    return {
      status: 'success',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить инвертор по ID' })
  @ApiResponse({ status: 200, type: InverterResponseDto })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const data = await this.invertersService.findOne(id, userId);
    return {
      status: 'success',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить данные инвертора' })
  @ApiResponse({ status: 200, type: InverterResponseDto })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateInverterDto: UpdateInverterDto,
  ) {
    const data = await this.invertersService.update(
      id,
      userId,
      updateInverterDto,
    );
    return {
      status: 'success',
      data,
      message: 'Инвертор успешно обновлен',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить инвертор' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.invertersService.remove(id, userId);
    return {
      status: 'success',
      message: 'Инвертор успешно удален',
    };
  }
}
