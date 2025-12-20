import api from './api';

export interface BuyRequest {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
}

export interface SellRequest {
  accountId: string;
  stockCode: string;
  quantity: number;
  price: number;
}

export interface TradeResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

export const tradeService = {
  async buy(data: BuyRequest): Promise<TradeResponse> {
    const response = await api.post<TradeResponse>('/api/trade/buy', data);
    return response.data;
  },

  async sell(data: SellRequest): Promise<TradeResponse> {
    const response = await api.post<TradeResponse>('/api/trade/sell', data);
    return response.data;
  },
};

