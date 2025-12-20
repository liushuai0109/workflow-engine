import api from './api';

export interface OpenAccountRequest {
  userId: string;
  realName: string;
  idCard: string;
  bankCard: string;
  bankName: string;
}

export interface DepositRequest {
  accountId: string;
  amount: number;
  bankCard: string;
}

export interface AccountResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export const accountService = {
  async openAccount(data: OpenAccountRequest): Promise<AccountResponse> {
    const response = await api.post<AccountResponse>('/api/account/open', data);
    return response.data;
  },

  async deposit(data: DepositRequest): Promise<AccountResponse> {
    const response = await api.post<AccountResponse>('/api/account/deposit', data);
    return response.data;
  },
};

