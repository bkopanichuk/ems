import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createUserDto: {
    login: string;
    password: string;
    displayName?: string;
    role?: Role;
  }) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: {
      displayName?: string;
      password?: string;
      role?: Role;
      isBlocked?: boolean;
    }
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Put(':id/block')
  @Roles(Role.ADMIN)
  async block(@Param('id') id: string) {
    return this.usersService.update(id, { isBlocked: true });
  }

  @Put(':id/unblock')
  @Roles(Role.ADMIN)
  async unblock(@Param('id') id: string) {
    return this.usersService.update(id, { isBlocked: false });
  }
}
