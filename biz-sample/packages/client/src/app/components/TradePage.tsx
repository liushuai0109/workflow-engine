import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { User as UserType, Stock } from '../App';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

interface TradePageProps {
  user: UserType;
  setUser: (user: UserType) => void;
}

const mockStocks: Stock[] = [
  { code: '600519', name: '贵州茅台', price: 1678.50, change: 15.3, changePercent: 0.92, volume: 1234567 },
  { code: '000001', name: '平安银行', price: 12.45, change: -0.15, changePercent: -1.19, volume: 9876543 },
  { code: '600036', name: '招商银行', price: 38.76, change: 0.52, changePercent: 1.36, volume: 5432109 },
];

const generateChartData = () => {
  const data = [];
  let basePrice = 100;
  for (let i = 0; i < 50; i++) {
    basePrice = basePrice + (Math.random() - 0.5) * 3;
    data.push({ time: i, price: basePrice });
  }
  return data;
};

export default function TradePage({ user, setUser }: TradePageProps) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(mockStocks[0]);
  const [quantity, setQuantity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (!user.accountId) {
      toast.error('请先完成开户');
      return;
    }
    if (!selectedStock) {
      toast.error('请选择股票');
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty < 100 || qty % 100 !== 0) {
      toast.error('请输入正确的数量（100的倍数）');
      return;
    }
    const totalCost = selectedStock.price * qty;
    if (totalCost > user.balance) {
      toast.error('余额不足');
      return;
    }

    setLoading(true);
    try {
      const trade = await api.buy(
        user.accountId,
        selectedStock.code,
        selectedStock.name,
        qty,
        selectedStock.price
      );
      setUser({
        ...user,
        balance: trade.balance,
      });
      toast.success(`买入成功！${selectedStock.name} ${qty}股`);
      setQuantity('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '买入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user.accountId) {
      toast.error('请先完成开户');
      return;
    }
    if (!selectedStock) {
      toast.error('请选择股票');
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty < 100 || qty % 100 !== 0) {
      toast.error('请输入正确的数量（100的倍数）');
      return;
    }

    setLoading(true);
    try {
      const trade = await api.sell(
        user.accountId,
        selectedStock.code,
        selectedStock.name,
        qty,
        selectedStock.price
      );
      setUser({
        ...user,
        balance: trade.balance,
      });
      toast.success(`卖出成功！${selectedStock.name} ${qty}股`);
      setQuantity('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '卖出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = mockStocks.filter(stock =>
    stock.code.includes(searchQuery) || stock.name.includes(searchQuery)
  );

  const chartData = generateChartData();

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-semibold mb-4">股票交易</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="搜索股票代码或名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stock List */}
        <div className="space-y-2">
          {filteredStocks.map((stock) => (
            <Card
              key={stock.code}
              className={`p-4 cursor-pointer transition-all ${
                selectedStock?.code === stock.code ? 'ring-2 ring-blue-600' : ''
              }`}
              onClick={() => setSelectedStock(stock)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold">{stock.name}</span>
                    <span className="text-sm text-gray-500">{stock.code}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    成交量: {(stock.volume / 10000).toFixed(2)}万
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg mb-1">¥{stock.price.toFixed(2)}</div>
                  <div className={`flex items-center text-sm ${stock.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {stock.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    <span>{stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Selected Stock Details */}
        {selectedStock && (
          <Card className="p-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">{selectedStock.name}</h3>
                <span className="text-sm text-gray-500">{selectedStock.code}</span>
              </div>
              <div className="flex items-baseline space-x-3">
                <span className="text-2xl">¥{selectedStock.price.toFixed(2)}</span>
                <span className={selectedStock.change >= 0 ? 'text-red-500' : 'text-green-500'}>
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
                </span>
                <span className={selectedStock.change >= 0 ? 'text-red-500' : 'text-green-500'}>
                  {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-40 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={selectedStock.change >= 0 ? '#ef4444' : '#22c55e'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trading Form */}
            <Tabs defaultValue="buy" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">买入</TabsTrigger>
                <TabsTrigger value="sell">卖出</TabsTrigger>
              </TabsList>
              
              <TabsContent value="buy" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="buy-quantity">买入数量（股）</Label>
                  <Input
                    id="buy-quantity"
                    type="number"
                    placeholder="请输入数量（100的倍数）"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    step={100}
                  />
                  <p className="text-sm text-gray-500">
                    可用资金: ¥{user.balance.toFixed(2)}
                  </p>
                </div>
                
                {quantity && parseInt(quantity) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span>预计成交金额:</span>
                      <span className="font-semibold">¥{(selectedStock.price * parseInt(quantity)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBuy}
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600"
                  size="lg"
                >
                  {loading ? '处理中...' : '买入'}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="sell-quantity">卖出数量（股）</Label>
                  <Input
                    id="sell-quantity"
                    type="number"
                    placeholder="请输入数量（100的倍数）"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    step={100}
                  />
                  <p className="text-sm text-gray-500">
                    可卖数量: 0股
                  </p>
                </div>

                {quantity && parseInt(quantity) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span>预计成交金额:</span>
                      <span className="font-semibold">¥{(selectedStock.price * parseInt(quantity)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSell}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  {loading ? '处理中...' : '卖出'}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}
