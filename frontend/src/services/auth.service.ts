import api from './api.client';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
  };
  user: {
    id: string;
    login: string;
    name: string | null;
    role: 'USER' | 'ADMIN';
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Session {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
}

class AuthService {
  async login(credentials: LoginRequest) {
    return api.post<{ status: string; data: LoginResponse; message?: string }>(
      '/auth/login',
      credentials,
    );
  }

  async logout(refreshToken?: string) {
    return api.post('/auth/logout', { refresh_token: refreshToken });
  }

  async logoutAll() {
    return api.post('/auth/logout-all');
  }

  async refreshToken(refreshToken: string) {
    return api.post('/auth/refresh', { refresh_token: refreshToken });
  }

  async getProfile() {
    return api.get('/auth/profile');
  }

  async getSessions() {
    return api.get<{ status: string; data: Session[] }>('/auth/sessions');
  }

  async revokeSession(sessionId: string) {
    return api.post(`/auth/sessions/${sessionId}/revoke`);
  }
}

export default new AuthService();
