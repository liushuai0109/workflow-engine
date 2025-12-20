import { v4 as uuidv4 } from 'uuid';
import { userService } from './user';

interface Account {
  accountId: string;
  userId: string;
  realName: string;
  idCard: string;
  bankCard: string;
  bankName: string;
  balance: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Transaction {
  transactionId: string;
  accountId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  createdAt: string;
}

// 内存存储
const accounts: Map<string, Account> = new Map();
const transactions: Map<string, Transaction> = new Map();

interface OpenAccountParams {
  userId: string;
  realName: string;
  idCard: string;
  bankCard: string;
  bankName: string;
}

interface DepositParams {
  accountId: string;
  amount: number;
  bankCard: string;
}

class AccountService {
  async openAccount(params: OpenAccountParams): Promise<Account> {
    // 验证用户是否存在
    const user = await userService.findById(params.userId);
    if (!user) {
      throw { code: 'USER_NOT_FOUND', message: '用户不存在' };
    }

    const account: Account = {
      accountId: `ACC${Date.now()}`,
      userId: params.userId,
      realName: params.realName,
      idCard: params.idCard,
      bankCard: params.bankCard,
      bankName: params.bankName,
      balance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    accounts.set(account.accountId, account);
    return {
      accountId: account.accountId,
      userId: account.userId,
      realName: account.realName,
      status: account.status,
      createdAt: account.createdAt,
    };
  }

  async deposit(params: DepositParams): Promise<any> {
    const account = accounts.get(params.accountId);
    if (!account) {
      throw { code: 'ACCOUNT_NOT_FOUND', message: '账户不存在' };
    }

    // 更新余额
    account.balance += params.amount;

    // 记录交易
    const transaction: Transaction = {
      transactionId: `TXN${Date.now()}`,
      accountId: params.accountId,
      amount: params.amount,
      type: 'deposit',
      createdAt: new Date().toISOString(),
    };
    transactions.set(transaction.transactionId, transaction);

    return {
      transactionId: transaction.transactionId,
      accountId: account.accountId,
      amount: params.amount,
      balance: account.balance,
      createdAt: transaction.createdAt,
    };
  }

  async getAccount(accountId: string): Promise<Account | undefined> {
    return accounts.get(accountId);
  }
}

export const accountService = new AccountService();

