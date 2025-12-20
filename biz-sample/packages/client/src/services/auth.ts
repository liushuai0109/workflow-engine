import api from './api';

export interface RegisterRequest {
  phone: string;
  password: string;
  verifyCode?: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    userId: string;
    phone: string;
    createdAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const authService = {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
  },
};

