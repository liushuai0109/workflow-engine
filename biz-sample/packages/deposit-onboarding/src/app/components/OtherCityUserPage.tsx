import { Heart, Gift, Users, Home, Sparkles, DollarSign } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';

export function OtherCityUserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  return (
    <div className="space-y-4">
      {/* Hero - 亲民友好风格 */}
      <div className="relative bg-gradient-to-br from-rose-500 via-pink-500 to-red-600 rounded-xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-300/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full mb-3">
            <Heart className="w-4 h-4" />
            <span className="text-xs">普惠金融</span>
          </div>
          <h2 className="text-2xl mb-1">💰 人人都能投资</h2>
          <p className="text-white/80 text-sm mb-4">低门槛、高收益，让投资更简单</p>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-lg mb-0.5">¥100</div>
                <div className="text-xs text-white/70">起投金额</div>
              </div>
              <div className="text-center">
                <div className="text-lg mb-0.5">0元</div>
                <div className="text-xs text-white/70">开户费用</div>
              </div>
              <div className="text-center">
                <div className="text-lg mb-0.5">1分钟</div>
                <div className="text-xs text-white/70">快速到账</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 py-3 rounded-lg hover:from-yellow-300 hover:to-orange-300 transition-all shadow-lg"
          >
            马上开始理财
          </button>
        </div>
      </div>

      {/* 普惠活动 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="新手体验金"
          subtitle="首次入金100元，额外赠送18元"
          amount="≥ ¥100"
          reward="¥18"
          badge="新手"
          gradient="bg-gradient-to-br from-red-500 to-orange-600"
          icon={<Gift className="w-6 h-6" />}
          ctaText="领取体验金"
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="全民理财计划"
          subtitle="500元起投，享受高收益理财"
          amount="≥ ¥500"
          reward="年化6%+"
          badge="稳健"
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
          icon={<DollarSign className="w-6 h-6" />}
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="老乡推荐有礼"
          subtitle="推荐老乡入金，双方各得奖励"
          amount="推荐1人"
          reward="各得¥38"
          gradient="bg-gradient-to-br from-purple-500 to-pink-600"
          icon={<Users className="w-6 h-6" />}
          ctaText="推荐老乡"
          onAction={() => alert('跳转到邀请页面')}
        />
      </div>

      {/* 小额投资示范 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">💡 小钱也能钱生钱</h3>
        <div className="space-y-3">
          <InvestExample
            amount="¥100"
            days="30天"
            earning="¥5"
            desc="相当于存银行的5倍"
          />
          <InvestExample
            amount="¥500"
            days="30天"
            earning="¥25"
            desc="一顿饭钱变成两顿"
          />
          <InvestExample
            amount="¥1,000"
            days="30天"
            earning="¥50"
            desc="一个月多赚话费钱"
          />
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-800">
            💚 温馨提示：每天省下一杯奶茶钱，一年后就是一笔不小的收入
          </p>
        </div>
      </div>

      {/* 适合新手的产品 */}
      <div className="bg-white rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base">🌟 新手推荐产品</h3>
          <span className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded">超值</span>
        </div>
        <div className="space-y-3">
          <ProductItem
            name="稳健理财"
            yield="年化6%"
            minAmount="¥100起"
            risk="低风险"
            tag="推荐"
          />
          <ProductItem
            name="指数基金"
            yield="年化8-12%"
            minAmount="¥500起"
            risk="中低风险"
            tag="热门"
          />
          <ProductItem
            name="定期宝"
            yield="年化5%"
            minAmount="¥100起"
            risk="无风险"
            tag="安心"
          />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white py-2.5 rounded-lg text-sm"
        >
          立即开始投资
        </button>
      </div>

      {/* 理财小课堂 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">📚 理财小课堂</h3>
        <div className="space-y-3">
          <CourseItem
            title="零基础理财入门"
            duration="10分钟"
            students="12.5万人学习"
          />
          <CourseItem
            title="如何选择基金"
            duration="15分钟"
            students="8.3万人学习"
          />
          <CourseItem
            title="风险控制必修课"
            duration="12分钟"
            students="6.2万人学习"
          />
        </div>
        <button
          onClick={() => alert('开始学习')}
          className="w-full mt-4 border border-rose-600 text-rose-600 py-2.5 rounded-lg text-sm hover:bg-rose-50 transition-colors"
        >
          免费学习
        </button>
      </div>

      {/* 贴心服务 */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-100">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-rose-600" />
          <h3 className="text-base">贴心服务，用心陪伴</h3>
        </div>
        <div className="space-y-2 text-sm">
          <ServiceItem text="24小时在线客服，随时解答疑问" />
          <ServiceItem text="新手专属教学视频，看完就会操作" />
          <ServiceItem text="每日推送理财小知识，轻松学理财" />
          <ServiceItem text="社群互助，和邻居一起学投资" />
          <ServiceItem text="提现当天到账，用钱不着急" />
        </div>
      </div>

      {/* 真实用户案例 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">👥 他们都在这里理财</h3>
        <div className="space-y-3">
          <UserCase
            name="张女士"
            city="成都"
            story="全职妈妈，每月存500元，一年赚了360元"
            avatar="👩"
          />
          <UserCase
            name="李师傅"
            city="武汉"
            story="出租车司机，用闲钱理财，三个月赚了200元"
            avatar="👨"
          />
          <UserCase
            name="小王"
            city="西安"
            story="应届毕业生，每月定投300元，积累第一桶金"
            avatar="🙋‍♂️"
          />
        </div>
      </div>

      {/* 安全提示 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">🛡️ 您的资金安全有保障</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>✓ 银行级安全系统，账户信息加密保护</p>
          <p>✓ 资金由第三方银行托管，平台无法动用</p>
          <p>✓ 中国证监会严格监管，合法合规</p>
          <p>✓ 投资者保护基金，最高赔付50万元</p>
        </div>
      </div>
    </div>
  );
}

function InvestExample({ amount, days, earning, desc }: {
  amount: string;
  days: string;
  earning: string;
  desc: string;
}) {
  return (
    <div className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-base">{amount}</span>
          <span className="text-xs text-gray-500 ml-2">投资{days}</span>
        </div>
        <div className="text-base text-red-600">赚 {earning}</div>
      </div>
      <div className="text-xs text-gray-600">{desc}</div>
    </div>
  );
}

function ProductItem({ name, yield: yieldValue, minAmount, risk, tag }: {
  name: string;
  yield: string;
  minAmount: string;
  risk: string;
  tag: string;
}) {
  const tagColors: Record<string, string> = {
    '推荐': 'bg-rose-100 text-rose-700',
    '热门': 'bg-orange-100 text-orange-700',
    '安心': 'bg-green-100 text-green-700'
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${tagColors[tag]}`}>
              {tag}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>{minAmount}</span>
            <span>•</span>
            <span>{risk}</span>
          </div>
        </div>
        <div className="text-base text-red-600 ml-2">{yieldValue}</div>
      </div>
    </div>
  );
}

function CourseItem({ title, duration, students }: {
  title: string;
  duration: string;
  students: string;
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-sm mb-1">{title}</div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>⏱️ {duration}</span>
        <span>•</span>
        <span>👥 {students}</span>
      </div>
    </div>
  );
}

function ServiceItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-rose-500 mt-0.5">✓</span>
      <span className="text-gray-700 flex-1">{text}</span>
    </div>
  );
}

function UserCase({ name, city, story, avatar }: {
  name: string;
  city: string;
  story: string;
  avatar: string;
}) {
  return (
    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{avatar}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{name}</span>
            <span className="text-xs text-gray-500">来自{city}</span>
          </div>
          <p className="text-xs text-gray-600">{story}</p>
        </div>
      </div>
    </div>
  );
}
