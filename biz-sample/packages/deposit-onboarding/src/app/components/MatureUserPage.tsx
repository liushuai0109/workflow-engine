import { Shield, TrendingUp, Award, BarChart3, Lock, FileText } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';

export function MatureUserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  return (
    <div className="space-y-4">
      {/* Hero - 稳重专业风格 */}
      <div className="relative bg-gradient-to-br from-slate-700 via-blue-800 to-slate-900 rounded-xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500 text-white px-3 py-1 rounded-md mb-3">
            <Award className="w-4 h-4" />
            <span className="text-xs">资深用户专享</span>
          </div>
          <h2 className="text-xl mb-1">稳健投资，价值增长</h2>
          <p className="text-white/80 text-sm mb-4">专业投资工具，助您科学配置资产</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-lg mb-0.5">15年+</div>
              <div className="text-xs text-white/70">行业经验</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-lg mb-0.5">AAA级</div>
              <div className="text-xs text-white/70">信用评级</div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600 transition-colors"
          >
            开启专业投资
          </button>
        </div>
      </div>

      {/* 活动卡片 - 成熟用户关注的内容 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="大额入金专享"
          subtitle="5万起投，尊享VIP投顾服务"
          amount="≥ ¥50,000"
          reward="¥888"
          badge="VIP"
          gradient="bg-gradient-to-br from-amber-600 to-orange-700"
          icon={<Award className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="稳健理财计划"
          subtitle="低风险资产配置，年化收益可观"
          amount="≥ ¥20,000"
          reward="年化8%+"
          gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
          icon={<TrendingUp className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="专属投顾服务"
          subtitle="一对一资产配置建议"
          amount="≥ ¥100,000"
          reward="免费服务"
          badge="尊享"
          gradient="bg-gradient-to-br from-slate-600 to-slate-800"
          icon={<BarChart3 className="w-6 h-6" />}
          onAction={handleDeposit}
        />
      </div>

      {/* 专业服务 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">专业投资服务</h3>
        <div className="space-y-3">
          <ServiceItem
            icon={<Shield className="w-5 h-5 text-blue-600" />}
            title="资金安全保障"
            desc="银行级加密，第三方托管"
          />
          <ServiceItem
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
            title="专业研究报告"
            desc="每日市场分析，投资策略推荐"
          />
          <ServiceItem
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            title="税务优化建议"
            desc="合理节税，收益最大化"
          />
        </div>
      </div>

      {/* 优质资产推荐 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">优质资产配置建议</h3>
        <div className="space-y-3">
          <AssetItem name="沪深300 ETF" allocation="40%" risk="低" />
          <AssetItem name="科技龙头股" allocation="30%" risk="中" />
          <AssetItem name="债券基金" allocation="20%" risk="低" />
          <AssetItem name="现金储备" allocation="10%" risk="无" />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg text-sm"
        >
          获取完整配置方案
        </button>
      </div>

      {/* 安全保障 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-blue-600" />
          <h3 className="text-base">五重安全保障</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <p>✓ 银行级SSL加密技术</p>
          <p>✓ 第三方资金托管</p>
          <p>✓ 中国证监会监管</p>
          <p>✓ 完善的风控体系</p>
          <p>✓ 投资者保护基金</p>
        </div>
      </div>
    </div>
  );
}

function ServiceItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm mb-0.5">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
      </div>
    </div>
  );
}

function AssetItem({ name, allocation, risk }: { name: string; allocation: string; risk: string }) {
  const riskColors: Record<string, string> = {
    '低': 'text-green-600 bg-green-50',
    '中': 'text-yellow-600 bg-yellow-50',
    '高': 'text-red-600 bg-red-50',
    '无': 'text-gray-600 bg-gray-50'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="text-sm mb-1">{name}</div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-600 h-1.5 rounded-full" 
            style={{ width: allocation }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <span className="text-sm">{allocation}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${riskColors[risk]}`}>
          {risk}风险
        </span>
      </div>
    </div>
  );
}
