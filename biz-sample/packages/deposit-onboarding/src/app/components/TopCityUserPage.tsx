import { Building2, TrendingUp, Award, Home, Briefcase, Car } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';

export function TopCityUserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  return (
    <div className="space-y-4">
      {/* Hero - 一线城市精英风格 */}
      <div className="relative bg-gradient-to-br from-slate-800 via-gray-800 to-zinc-900 rounded-xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500 text-white px-3 py-1 rounded-md mb-3">
            <Building2 className="w-4 h-4" />
            <span className="text-xs">一线城市专享</span>
          </div>
          <h2 className="text-2xl mb-1">🏙️ 都市精英投资计划</h2>
          <p className="text-white/80 text-sm mb-4">北上广深专属，高端理财服务</p>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">VIP</div>
              <div className="text-xs text-white/70">专属通道</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">1对1</div>
              <div className="text-xs text-white/70">投顾服务</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">优先</div>
              <div className="text-xs text-white/70">新股申购</div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600 transition-colors"
          >
            开启专属服务
          </button>
        </div>
      </div>

      {/* 一线城市专属活动 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="置业投资专项"
          subtitle="房地产信托产品，年化收益稳健"
          amount="≥ ¥100,000"
          reward="年化9%"
          badge="稳健"
          gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
          icon={<Home className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="高端私募基金"
          subtitle="对接顶级私募，门槛低至10万"
          amount="≥ ¥100,000"
          reward="¥2,888"
          badge="尊享"
          gradient="bg-gradient-to-br from-amber-600 to-orange-700"
          icon={<Award className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="新经济产业基金"
          subtitle="投资一线城市科技创新企业"
          amount="≥ ¥50,000"
          reward="¥888"
          badge="热门"
          gradient="bg-gradient-to-br from-purple-600 to-pink-700"
          icon={<Briefcase className="w-6 h-6" />}
          onAction={handleDeposit}
        />
      </div>

      {/* 一线城市投资场景 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">💼 都市生活投资场景</h3>
        <div className="space-y-3">
          <ScenarioItem
            icon={<Home className="w-5 h-5 text-blue-600" />}
            title="购房首付理财"
            desc="积累购房资金，平均年化8-12%"
            amount="目标: ¥500,000"
          />
          <ScenarioItem
            icon={<Car className="w-5 h-5 text-blue-600" />}
            title="教育基金储备"
            desc="为子女教育提前规划"
            amount="目标: ¥300,000"
          />
          <ScenarioItem
            icon={<Briefcase className="w-5 h-5 text-blue-600" />}
            title="创业启动资金"
            desc="稳健增值，为创业蓄力"
            amount="目标: ¥200,000"
          />
        </div>
      </div>

      {/* 一线城市优质资产 */}
      <div className="bg-white rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base">🏢 一线城市优质资产</h3>
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">专属</span>
        </div>
        <div className="space-y-3">
          <CityAssetItem
            name="北京核心区商业地产"
            type="房地产信托"
            yield="年化8.5%"
            risk="低"
            city="北京"
          />
          <CityAssetItem
            name="上海科技园区股权"
            type="私募股权"
            yield="预期15%+"
            risk="中"
            city="上海"
          />
          <CityAssetItem
            name="深圳新能源产业基金"
            type="产业基金"
            yield="年化12%"
            risk="中"
            city="深圳"
          />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg text-sm"
        >
          预约投资顾问
        </button>
      </div>

      {/* 线下服务网点 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-amber-600" />
          <h3 className="text-base">线下VIP服务中心</h3>
        </div>
        <div className="space-y-2">
          <OfficeItem city="北京" address="朝阳区国贸CBD写字楼A座" />
          <OfficeItem city="上海" address="浦东新区陆家嘴金融中心" />
          <OfficeItem city="广州" address="天河区珠江新城金融大厦" />
          <OfficeItem city="深圳" address="福田区深圳湾科技园" />
        </div>
        <button
          onClick={() => alert('预约线下咨询')}
          className="w-full mt-4 border border-amber-600 text-amber-600 py-2.5 rounded-lg text-sm hover:bg-amber-50 transition-colors"
        >
          预约线下咨询
        </button>
      </div>

      {/* 高端权益 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">✨ 一线城市用户专属权益</h3>
        <div className="space-y-2 text-sm">
          <BenefitItem text="优先参与新股申购，中签率提升30%" />
          <BenefitItem text="季度线下投资沙龙，对接高净值人脉" />
          <BenefitItem text="私募基金优先认购权，门槛降低50%" />
          <BenefitItem text="一对一资产配置服务，年费¥20,000现免费" />
          <BenefitItem text="机场贵宾厅、高端体检等增值服务" />
        </div>
      </div>
    </div>
  );
}

function ScenarioItem({ icon, title, desc, amount }: { 
  icon: React.ReactNode; 
  title: string; 
  desc: string;
  amount: string;
}) {
  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <div className="text-sm mb-0.5">{title}</div>
          <div className="text-xs text-gray-600">{desc}</div>
        </div>
      </div>
      <div className="text-xs text-blue-600 ml-8">{amount}</div>
    </div>
  );
}

function CityAssetItem({ name, type, yield: yieldValue, risk, city }: { 
  name: string; 
  type: string;
  yield: string;
  risk: string;
  city: string;
}) {
  const riskColors: Record<string, string> = {
    '低': 'text-green-600 bg-green-50',
    '中': 'text-yellow-600 bg-yellow-50',
    '高': 'text-red-600 bg-red-50'
  };

  const cityColors: Record<string, string> = {
    '北京': 'bg-red-50 text-red-700',
    '上海': 'bg-blue-50 text-blue-700',
    '广州': 'bg-green-50 text-green-700',
    '深圳': 'bg-purple-50 text-purple-700'
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm mb-1">{name}</div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded ${cityColors[city]}`}>
              {city}
            </span>
            <span className="text-xs text-gray-500">{type}</span>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-sm text-blue-600 mb-1">{yieldValue}</div>
          <span className={`text-xs px-2 py-0.5 rounded ${riskColors[risk]}`}>
            {risk}风险
          </span>
        </div>
      </div>
    </div>
  );
}

function OfficeItem({ city, address }: { city: string; address: string }) {
  return (
    <div className="p-2 bg-white rounded-lg">
      <div className="text-sm mb-0.5">{city}</div>
      <div className="text-xs text-gray-600">{address}</div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-amber-500 mt-0.5">✓</span>
      <span className="text-gray-700 flex-1">{text}</span>
    </div>
  );
}
