import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(login: string, password: string): Promise<any> {
    const user = await this.usersService.findByLogin(login);
    
    if (!user) {
      return null;
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }

    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    
    if (isPasswordValid) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      login: user.login, 
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role
      }
    };
  }
}
