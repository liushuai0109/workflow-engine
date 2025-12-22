// API 客户端服务

// 配置后端服务地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://server.biz.com'
    : 'http://localhost:4000');

// API 响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 用户类型
export interface User {
  userId: string;
  phone: string;
  createdAt: string;
}

// 账户类型
export interface Account {
  accountId: string;
  userId: string;
  realName: string;
  status: string;
  balance: number;
  createdAt: string;
}

// 交易类型
export interface Trade {
  orderId: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
  amount: number;
  balance: number;
  status: string;
  createdAt: string;
}

// 入金类型
export interface Deposit {
  transactionId: string;
  accountId: string;
  amount: number;
  balance: number;
  createdAt: string;
}

// HTTP 请求封装
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

// API 方法
export const api = {
  // 用户注册
  register: async (phone: string, password: string, verifyCode?: string): Promise<User> => {
    return request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, verifyCode }),
    });
  },

  // 开户
  openAccount: async (
    userId: string,
    realName: string,
    idCard: string,
    bankCard: string,
    bankName: string
  ): Promise<Account> => {
    return request<Account>('/api/account/open', {
      method: 'POST',
      body: JSON.stringify({ userId, realName, idCard, bankCard, bankName }),
    });
  },

  // 入金
  deposit: async (accountId: string, amount: number, bankCard: string): Promise<Deposit> => {
    return request<Deposit>('/api/account/deposit', {
      method: 'POST',
      body: JSON.stringify({ accountId, amount, bankCard }),
    });
  },

  // 买入
  buy: async (
    accountId: string,
    stockCode: string,
    stockName: string,
    quantity: number,
    price: number
  ): Promise<Trade> => {
    return request<Trade>('/api/trade/buy', {
      method: 'POST',
      body: JSON.stringify({ accountId, stockCode, stockName, quantity, price }),
    });
  },

  // 卖出
  sell: async (
    accountId: string,
    stockCode: string,
    stockName: string,
    quantity: number,
    price: number
  ): Promise<Trade> => {
    return request<Trade>('/api/trade/sell', {
      method: 'POST',
      body: JSON.stringify({ accountId, stockCode, stockName, quantity, price }),
    });
  },

  // 健康检查
  health: async (): Promise<{ status: string; timestamp: string }> => {
    return request('/api/health');
  },
};

export default api;
