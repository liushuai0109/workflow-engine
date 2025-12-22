import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Bell, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from './ui/input';
import { User as UserType, Stock } from '../App';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface HomePageProps {
  user: UserType;
}

// 模拟股票数据
const generateMockStocks = (): Stock[] => [
  { code: '600519', name: '贵州茅台', price: 1678.50, change: 15.3, changePercent: 0.92, volume: 1234567 },
  { code: '000001', name: '平安银行', price: 12.45, change: -0.15, changePercent: -1.19, volume: 9876543 },
  { code: '600036', name: '招商银行', price: 38.76, change: 0.52, changePercent: 1.36, volume: 5432109 },
  { code: '000858', name: '五粮液', price: 156.80, change: -2.10, changePercent: -1.32, volume: 3210987 },
  { code: '601318', name: '中国平安', price: 45.23, change: 0.89, changePercent: 2.01, volume: 7654321 },
  { code: '600887', name: '伊利股份', price: 28.34, change: 0.45, changePercent: 1.61, volume: 4567890 },
];

// 生成模拟K线数据
const generateChartData = () => {
  const data = [];
  let basePrice = 100;
  for (let i = 0; i < 30; i++) {
    basePrice = basePrice + (Math.random() - 0.5) * 5;
    data.push({ time: i, price: basePrice });
  }
  return data;
};

export default function HomePage({ user }: HomePageProps) {
  const [stocks, setStocks] = useState<Stock[]>(generateMockStocks());
  const [searchQuery, setSearchQuery] = useState('');

  // 模拟实时更新股价
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => prev.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 2,
        change: stock.change + (Math.random() - 0.5) * 0.5,
        changePercent: stock.changePercent + (Math.random() - 0.5) * 0.2,
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredStocks = stocks.filter(stock =>
    stock.code.includes(searchQuery) || stock.name.includes(searchQuery)
  );

  const chartData = generateChartData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-blue-100">欢迎回来</p>
            <p className="text-lg">{user.name || user.phone}</p>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full">
            <Bell className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="搜索股票代码或名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-gray-900"
          />
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Market Overview Card */}
        <Card className="p-4 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">上证指数</h3>
            <span className="text-sm text-gray-500">12-21 15:00</span>
          </div>
          <div className="flex items-baseline space-x-3 mb-4">
            <span className="text-2xl">3,247.56</span>
            <span className="text-red-500">+12.45</span>
            <span className="text-red-500">+0.38%</span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Hot Stocks */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">热门股票</h3>
            <button className="text-sm text-blue-600">更多 →</button>
          </div>

          <div className="space-y-2">
            {filteredStocks.map((stock) => (
              <Card key={stock.code} className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
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
                      <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                      <span className="ml-1">({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* News Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">市场资讯</h3>
            <button className="text-sm text-blue-600">更多 →</button>
          </div>

          <div className="space-y-2">
            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">A股三大指数集体上涨，创业板指涨超1%</h4>
                  <p className="text-sm text-gray-500">12月21日 14:30</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">央行开展5000亿元MLF操作</h4>
                  <p className="text-sm text-gray-500">12月21日 10:00</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">科技股继续领涨，半导体板块表现强势</h4>
                  <p className="text-sm text-gray-500">12月20日 16:45</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
