import { Brain, Cpu, Sparkles, TrendingUp, Zap, Bot } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';

export function AIUserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  return (
    <div className="space-y-4">
      {/* Hero - AI科技风格 */}
      <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-cyan-400 text-gray-900 px-3 py-1 rounded-full mb-3">
            <Brain className="w-4 h-4" />
            <span className="text-xs">AI驱动</span>
          </div>
          <h2 className="text-2xl mb-1">🤖 AI智能投资</h2>
          <p className="text-white/80 text-sm mb-4">用人工智能，把握未来机遇</p>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-xs">AI实时分析中...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">市场情绪</span>
                <span className="text-green-300">看涨 ↑</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/70">推荐操作</span>
                <span className="text-cyan-300">买入信号</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-3 rounded-lg hover:from-cyan-300 hover:to-blue-400 transition-all shadow-lg"
          >
            启动AI投资助手
          </button>
        </div>
      </div>

      {/* AI相关活动 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="AI选股策略"
          subtitle="机器学习算法，精选优质AI股"
          amount="≥ ¥2,000"
          reward="免费策略"
          badge="AI"
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          icon={<Brain className="w-6 h-6" />}
          ctaText="获取AI策略"
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="量化交易体验"
          subtitle="AI自动交易，24小时捕捉机会"
          amount="≥ ¥10,000"
          reward="¥388"
          badge="热门"
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
          icon={<Cpu className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="智能投顾服务"
          subtitle="AI个性化资产配置建议"
          amount="≥ ¥5,000"
          reward="永久免费"
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          icon={<Bot className="w-6 h-6" />}
          onAction={handleDeposit}
        />
      </div>

      {/* AI概念股推荐 */}
      <div className="bg-white rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base">🔥 AI概念热门股</h3>
          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">实时更新</span>
        </div>
        <div className="space-y-3">
          <AIStockItem 
            name="英伟达" 
            code="NVDA" 
            change="+8.3%" 
            aiScore={95}
            tag="AI芯片龙头"
          />
          <AIStockItem 
            name="微软" 
            code="MSFT" 
            change="+5.2%" 
            aiScore={92}
            tag="ChatGPT投资方"
          />
          <AIStockItem 
            name="谷歌" 
            code="GOOGL" 
            change="+6.7%" 
            aiScore={88}
            tag="Gemini开发商"
          />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg text-sm"
        >
          查看完整AI投资组合
        </button>
      </div>

      {/* AI功能介绍 */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-base">AI投资工具箱</h3>
        </div>
        <div className="space-y-3">
          <AIFeature
            icon={<Brain className="w-4 h-4 text-purple-600" />}
            title="智能选股"
            desc="AI分析10000+股票，精选优质标的"
          />
          <AIFeature
            icon={<Zap className="w-4 h-4 text-purple-600" />}
            title="实时预警"
            desc="异动监测，第一时间推送买卖信号"
          />
          <AIFeature
            icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
            title="趋势预测"
            desc="深度学习预测股价走势，准确率85%+"
          />
        </div>
      </div>

      {/* AI研报 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">📊 AI行业研报</h3>
        <div className="space-y-3">
          <ReportItem
            title="2025年AI芯片行业展望"
            date="2天前"
            views="12.5K"
          />
          <ReportItem
            title="大语言模型商业化路径分析"
            date="5天前"
            views="8.3K"
          />
          <ReportItem
            title="AI+医疗投资机会梳理"
            date="1周前"
            views="6.1K"
          />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 border border-purple-600 text-purple-600 py-2.5 rounded-lg text-sm hover:bg-purple-50 transition-colors"
        >
          入金解锁全部研报
        </button>
      </div>
    </div>
  );
}

function AIStockItem({ name, code, change, aiScore, tag }: { 
  name: string; 
  code: string; 
  change: string;
  aiScore: number;
  tag: string;
}) {
  return (
    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm mb-0.5">{name}</div>
          <div className="text-xs text-gray-500">{code}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-red-500 mb-0.5">{change}</div>
          <div className="text-xs text-purple-600">AI评分: {aiScore}</div>
        </div>
      </div>
      <div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
        <Sparkles className="w-3 h-3" />
        {tag}
      </div>
    </div>
  );
}

function AIFeature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
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

function ReportItem({ title, date, views }: { title: string; date: string; views: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-sm mb-1">{title}</div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{date}</span>
        <span>•</span>
        <span>{views} 阅读</span>
      </div>
    </div>
  );
}
