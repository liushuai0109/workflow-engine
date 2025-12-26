import { Coins, Wallet, TrendingUp, Globe, Shield, Zap } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';

export function Web3UserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  return (
    <div className="space-y-4">
      {/* Hero - Web3风格 */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full mb-3">
            <Coins className="w-4 h-4" />
            <span className="text-xs">Web3专区</span>
          </div>
          <h2 className="text-2xl mb-1">⚡ 拥抱Web3未来</h2>
          <p className="text-white/80 text-sm mb-4">区块链概念股，链接数字资产</p>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-white/70 mb-1">BTC实时价格</div>
                <div className="text-lg">$67,234</div>
                <div className="text-xs text-green-300">+3.2%</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">ETH实时价格</div>
                <div className="text-lg">$3,456</div>
                <div className="text-xs text-green-300">+2.8%</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 py-3 rounded-lg hover:from-yellow-300 hover:to-orange-300 transition-all shadow-lg"
          >
            开启Web3投资之旅
          </button>
        </div>
      </div>

      {/* Web3相关活动 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="区块链概念股"
          subtitle="投资比特币概念上市公司"
          amount="≥ ¥3,000"
          reward="¥188"
          badge="热门"
          gradient="bg-gradient-to-br from-orange-500 to-amber-600"
          icon={<Coins className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="NFT平台股权"
          subtitle="布局数字藏品产业链"
          amount="≥ ¥5,000"
          reward="¥288"
          badge="新品"
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
          icon={<Globe className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="元宇宙基金"
          subtitle="一键配置Web3生态股票"
          amount="≥ ¥10,000"
          reward="年化12%+"
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          icon={<TrendingUp className="w-6 h-6" />}
          onAction={handleDeposit}
        />
      </div>

      {/* Web3概念股 */}
      <div className="bg-white rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base">🚀 Web3概念领涨股</h3>
          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">实时行情</span>
        </div>
        <div className="space-y-3">
          <Web3StockItem 
            name="Coinbase" 
            code="COIN" 
            change="+15.2%" 
            category="交易所"
            volume="高"
          />
          <Web3StockItem 
            name="MicroStrategy" 
            code="MSTR" 
            change="+12.8%" 
            category="BTC持有"
            volume="高"
          />
          <Web3StockItem 
            name="Riot Platforms" 
            code="RIOT" 
            change="+18.5%" 
            category="挖矿"
            volume="中"
          />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 rounded-lg text-sm"
        >
          查看完整Web3投资组合
        </button>
      </div>

      {/* 行业资讯 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">📰 Web3行业动态</h3>
        <div className="space-y-3">
          <NewsItem
            title="比特币ETF持续净流入，机构看多情绪高涨"
            tag="利好"
            time="2小时前"
          />
          <NewsItem
            title="以太坊完成升级，Gas费大幅降低"
            tag="重要"
            time="5小时前"
          />
          <NewsItem
            title="美国SEC批准多只加密货币ETF"
            tag="政策"
            time="1天前"
          />
        </div>
      </div>

      {/* Web3优势 */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base">为什么选择我们投资Web3</h3>
        </div>
        <div className="space-y-3">
          <Web3Feature
            icon={<Wallet className="w-4 h-4 text-emerald-600" />}
            title="合规通道"
            desc="通过美股投资区块链概念公司，合法合规"
          />
          <Web3Feature
            icon={<Shield className="w-4 h-4 text-emerald-600" />}
            title="风险可控"
            desc="相比直接持有加密货币，股票投资更稳健"
          />
          <Web3Feature
            icon={<Zap className="w-4 h-4 text-emerald-600" />}
            title="专业研究"
            desc="深度研报，把握Web3产业投资机会"
          />
        </div>
      </div>

      {/* 加密货币行情 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">💎 主流加密货币行情</h3>
        <div className="space-y-3">
          <CryptoItem name="Bitcoin" symbol="BTC" price="$67,234" change="+3.2%" />
          <CryptoItem name="Ethereum" symbol="ETH" price="$3,456" change="+2.8%" />
          <CryptoItem name="Solana" symbol="SOL" price="$145" change="+8.5%" />
        </div>
        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            💡 提示：目前平台支持投资区块链概念股票，暂不支持直接交易加密货币
          </p>
        </div>
      </div>
    </div>
  );
}

function Web3StockItem({ name, code, change, category, volume }: { 
  name: string; 
  code: string; 
  change: string;
  category: string;
  volume: string;
}) {
  const volumeColors: Record<string, string> = {
    '高': 'bg-red-100 text-red-700',
    '中': 'bg-yellow-100 text-yellow-700',
    '低': 'bg-green-100 text-green-700'
  };

  return (
    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm mb-0.5">{name}</div>
          <div className="text-xs text-gray-500">{code}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-red-500 mb-0.5">{change}</div>
          <div className={`text-xs px-2 py-0.5 rounded ${volumeColors[volume]}`}>
            {volume}量
          </div>
        </div>
      </div>
      <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">
        <Coins className="w-3 h-3" />
        {category}
      </div>
    </div>
  );
}

function NewsItem({ title, tag, time }: { title: string; tag: string; time: string }) {
  const tagColors: Record<string, string> = {
    '利好': 'bg-red-100 text-red-700',
    '重要': 'bg-orange-100 text-orange-700',
    '政策': 'bg-blue-100 text-blue-700'
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start gap-2 mb-1">
        <span className={`text-xs px-2 py-0.5 rounded ${tagColors[tag]} flex-shrink-0`}>
          {tag}
        </span>
        <div className="text-sm">{title}</div>
      </div>
      <div className="text-xs text-gray-500 ml-auto">{time}</div>
    </div>
  );
}

function Web3Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm mb-0.5">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
      </div>
    </div>
  );
}

function CryptoItem({ name, symbol, price, change }: { 
  name: string; 
  symbol: string; 
  price: string; 
  change: string;
}) {
  const isPositive = change.startsWith('+');
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs">
          {symbol.slice(0, 1)}
        </div>
        <div>
          <div className="text-sm">{name}</div>
          <div className="text-xs text-gray-500">{symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm mb-0.5">{price}</div>
        <div className={`text-xs ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
          {change}
        </div>
      </div>
    </div>
  );
}
