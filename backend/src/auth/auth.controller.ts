import { Controller, Post, UseGuards, Request, Get, Body, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateData: { displayName?: string; password?: string }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    const allowedUpdates: any = {};
    
    if (updateData.displayName !== undefined) {
      allowedUpdates.displayName = updateData.displayName;
    }
    
    if (updateData.password && user.role === 'USER') {
      allowedUpdates.password = updateData.password;
    }
    
    return this.usersService.update(req.user.id, allowedUpdates);
  }
}
