import { v4 as uuidv4 } from 'uuid';
import { accountService } from './account';

interface Position {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
}

interface Order {
  orderId: string;
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
  amount: number;
  type: 'buy' | 'sell';
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

// 内存存储
const positions: Map<string, Position> = new Map(); // key: `${accountId}_${stockCode}`
const orders: Map<string, Order> = new Map();

interface BuyParams {
  accountId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  price: number;
}

interface SellParams {
  accountId: string;
  stockCode: string;
  quantity: number;
  price: number;
}

class TradeService {
  async buy(params: BuyParams): Promise<any> {
    const account = await accountService.getAccount(params.accountId);
    if (!account) {
      throw { code: 'ACCOUNT_NOT_FOUND', message: '账户不存在' };
    }

    const amount = params.quantity * params.price;

    // 检查余额
    if (account.balance < amount) {
      throw { code: 'INSUFFICIENT_BALANCE', message: '余额不足' };
    }

    // 更新余额
    account.balance -= amount;

    // 更新持仓
    const positionKey = `${params.accountId}_${params.stockCode}`;
    const existingPosition = positions.get(positionKey);
    if (existingPosition) {
      existingPosition.quantity += params.quantity;
    } else {
      positions.set(positionKey, {
        accountId: params.accountId,
        stockCode: params.stockCode,
        stockName: params.stockName,
        quantity: params.quantity,
      });
    }

    // 创建订单
    const order: Order = {
      orderId: `ORD${Date.now()}`,
      accountId: params.accountId,
      stockCode: params.stockCode,
      stockName: params.stockName,
      quantity: params.quantity,
      price: params.price,
      amount: amount,
      type: 'buy',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    orders.set(order.orderId, order);

    return {
      orderId: order.orderId,
      accountId: account.accountId,
      stockCode: params.stockCode,
      stockName: params.stockName,
      quantity: params.quantity,
      price: params.price,
      amount: amount,
      balance: account.balance,
      status: order.status,
      createdAt: order.createdAt,
    };
  }

  async sell(params: SellParams): Promise<any> {
    const account = await accountService.getAccount(params.accountId);
    if (!account) {
      throw { code: 'ACCOUNT_NOT_FOUND', message: '账户不存在' };
    }

    // 检查持仓
    const positionKey = `${params.accountId}_${params.stockCode}`;
    const position = positions.get(positionKey);
    if (!position || position.quantity < params.quantity) {
      throw { code: 'INSUFFICIENT_POSITION', message: '持仓不足' };
    }

    const amount = params.quantity * params.price;

    // 更新余额
    account.balance += amount;

    // 更新持仓
    position.quantity -= params.quantity;
    if (position.quantity === 0) {
      positions.delete(positionKey);
    }

    // 创建订单
    const order: Order = {
      orderId: `ORD${Date.now()}`,
      accountId: params.accountId,
      stockCode: params.stockCode,
      stockName: position.stockName,
      quantity: params.quantity,
      price: params.price,
      amount: amount,
      type: 'sell',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    orders.set(order.orderId, order);

    return {
      orderId: order.orderId,
      accountId: account.accountId,
      stockCode: params.stockCode,
      stockName: position.stockName,
      quantity: params.quantity,
      price: params.price,
      amount: amount,
      balance: account.balance,
      status: order.status,
      createdAt: order.createdAt,
    };
  }
}

export const tradeService = new TradeService();

