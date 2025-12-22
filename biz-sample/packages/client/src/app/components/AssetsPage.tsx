import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType, Position, Transaction } from '../App';
import api from '../../services/api';

interface AssetsPageProps {
  user: UserType;
  setUser: (user: UserType) => void;
}

const mockPositions: Position[] = [
  { stockCode: '600519', stockName: '贵州茅台', quantity: 100, avgPrice: 1650.00, currentPrice: 1678.50 },
  { stockCode: '600036', stockName: '招商银行', quantity: 500, avgPrice: 38.20, currentPrice: 38.76 },
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    stockCode: '600519',
    stockName: '贵州茅台',
    quantity: 100,
    price: 1650.00,
    amount: 165000,
    time: new Date('2024-12-20T10:30:00'),
    status: 'completed',
  },
  {
    id: '2',
    type: 'deposit',
    amount: 50000,
    time: new Date('2024-12-19T14:20:00'),
    status: 'completed',
  },
  {
    id: '3',
    type: 'buy',
    stockCode: '600036',
    stockName: '招商银行',
    quantity: 500,
    price: 38.20,
    amount: 19100,
    time: new Date('2024-12-18T11:15:00'),
    status: 'completed',
  },
];

export default function AssetsPage({ user, setUser }: AssetsPageProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankCard, setBankCard] = useState('');
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalMarketValue = mockPositions.reduce(
    (sum, pos) => sum + pos.currentPrice * pos.quantity,
    0
  );

  const totalProfit = mockPositions.reduce(
    (sum, pos) => sum + (pos.currentPrice - pos.avgPrice) * pos.quantity,
    0
  );

  const totalAssets = user.balance + totalMarketValue;

  const handleDeposit = async () => {
    if (!user.accountId) {
      toast.error('请先完成开户');
      return;
    }
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('请输入正确的金额');
      return;
    }
    if (amount < 100) {
      toast.error('最低入金金额为100元');
      return;
    }
    if (!bankCard || bankCard.length < 16) {
      toast.error('请输入正确的银行卡号');
      return;
    }

    setLoading(true);
    try {
      const deposit = await api.deposit(user.accountId, amount, bankCard);
      setUser({
        ...user,
        balance: deposit.balance,
      });
      toast.success(`入金成功！已到账¥${amount.toFixed(2)}`);
      setDepositAmount('');
      setBankCard('');
      setDepositDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '入金失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('请输入正确的金额');
      return;
    }
    if (amount > user.balance) {
      toast.error('可用余额不足');
      return;
    }

    setUser({
      ...user,
      balance: user.balance - amount,
    });
    toast.success(`提现成功！预计1-3个工作日到账`);
    setWithdrawAmount('');
    setWithdrawDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-8">
        <h1 className="text-xl mb-6">我的资产</h1>
        
        <div className="space-y-2 mb-6">
          <p className="text-sm text-blue-100">总资产（元）</p>
          <p className="text-3xl">{totalAssets.toFixed(2)}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-blue-100 mb-1">可用资金</p>
            <p className="font-semibold">{user.balance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100 mb-1">持仓市值</p>
            <p className="font-semibold">{totalMarketValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-blue-100 mb-1">总盈亏</p>
            <p className={`font-semibold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Quick Actions */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  入金
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>资金转入</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-card">银行卡号</Label>
                    <Input
                      id="bank-card"
                      placeholder="请输入银行卡号"
                      value={bankCard}
                      onChange={(e) => setBankCard(e.target.value.replace(/\D/g, '').slice(0, 19))}
                      maxLength={19}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">转入金额（元）</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="请输入金额"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">单笔最低100元，实时到账</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount('1000')}
                    >
                      1000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount('5000')}
                    >
                      5000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount('10000')}
                    >
                      10000
                    </Button>
                  </div>

                  <Button onClick={handleDeposit} disabled={loading} className="w-full" size="lg">
                    {loading ? '处理中...' : '确认转入'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ArrowUpFromLine className="w-4 h-4 mr-2" />
                  取款
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>资金转出</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">转出金额（元）</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="请输入金额"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      可用余额: ¥{user.balance.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      提现将在1-3个工作日内到账，请注意查收
                    </p>
                  </div>

                  <Button onClick={handleWithdraw} className="w-full" size="lg">
                    确认转出
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Holdings */}
        <div>
          <h3 className="font-semibold mb-3">持仓</h3>
          {mockPositions.length > 0 ? (
            <div className="space-y-2">
              {mockPositions.map((position) => {
                const profit = (position.currentPrice - position.avgPrice) * position.quantity;
                const profitPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
                
                return (
                  <Card key={position.stockCode} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold">{position.stockName}</span>
                          <span className="text-sm text-gray-500">{position.stockCode}</span>
                        </div>
                        <p className="text-sm text-gray-500">持仓: {position.quantity}股</p>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center ${profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {profit >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingUp className="w-4 h-4 mr-1 rotate-180" />}
                          <span>{profit >= 0 ? '+' : ''}{profit.toFixed(2)}</span>
                        </div>
                        <p className={`text-sm ${profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">成本价</p>
                        <p>¥{position.avgPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">现价</p>
                        <p>¥{position.currentPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">市值</p>
                        <p>¥{(position.currentPrice * position.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center text-gray-500">
              <p>暂无持仓</p>
            </Card>
          )}
        </div>

        {/* Transaction History */}
        <div>
          <h3 className="font-semibold mb-3">交易记录</h3>
          <div className="space-y-2">
            {mockTransactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'buy' ? 'bg-red-100' :
                      transaction.type === 'sell' ? 'bg-green-100' :
                      'bg-blue-100'
                    }`}>
                      <Clock className={`w-4 h-4 ${
                        transaction.type === 'buy' ? 'text-red-600' :
                        transaction.type === 'sell' ? 'text-green-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium mb-1">
                        {transaction.type === 'buy' && '买入'}
                        {transaction.type === 'sell' && '卖出'}
                        {transaction.type === 'deposit' && '入金'}
                        {transaction.type === 'withdraw' && '取款'}
                        {transaction.stockName && ` - ${transaction.stockName}`}
                      </p>
                      {transaction.stockCode && (
                        <p className="text-sm text-gray-500 mb-1">
                          {transaction.stockCode} · {transaction.quantity}股 · ¥{transaction.price?.toFixed(2)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {transaction.time.toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'buy' || transaction.type === 'withdraw' ? 'text-gray-900' : 'text-red-500'
                    }`}>
                      {transaction.type === 'buy' || transaction.type === 'withdraw' ? '-' : '+'}
                      ¥{transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">已完成</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
