import { Zap, Rocket, TrendingUp, Gift, Smartphone, Users } from 'lucide-react';
import { DepositPromoCard } from './DepositPromoCard';
import { CountdownTimer } from './CountdownTimer';

export function YoungUserPage() {
  const handleDeposit = () => {
    alert('跳转到入金页面');
  };

  const promoEndDate = new Date();
  promoEndDate.setDate(promoEndDate.getDate() + 3);

  return (
    <div className="space-y-4">
      {/* Hero - 年轻活力风格 */}
      <div className="relative bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-2xl overflow-hidden text-white p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full mb-3">
            <Zap className="w-4 h-4" />
            <span className="text-xs">限时爆款</span>
          </div>
          <h2 className="text-2xl mb-1">🔥 年轻就要敢拼</h2>
          <p className="text-white/80 text-sm mb-4">首次入金即得现金，最低100元起投</p>
          
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-4">
            <div className="text-xs text-white/70 mb-2">活动倒计时</div>
            <CountdownTimer endDate={promoEndDate} />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">100+</div>
              <div className="text-xs text-white/70">热门股票</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">0元</div>
              <div className="text-xs text-white/70">开户费用</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-lg mb-0.5">秒级</div>
              <div className="text-xs text-white/70">极速到账</div>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 py-3 rounded-lg hover:from-yellow-300 hover:to-orange-300 transition-all shadow-lg"
          >
            立即开启财富之旅 🚀
          </button>
        </div>
      </div>

      {/* 活动卡片 - 年轻人关注的内容 */}
      <div className="space-y-3">
        <DepositPromoCard
          title="新手红包雨"
          subtitle="100元起投，即送38元新手红包"
          amount="≥ ¥100"
          reward="¥38"
          badge="超值"
          gradient="bg-gradient-to-br from-red-500 to-pink-600"
          icon={<Gift className="w-6 h-6" />}
          ctaText="抢红包"
          onAction={handleDeposit}
        />

        <DepositPromoCard
          title="社交投资赛"
          subtitle="邀请3位好友，瓜分万元奖池"
          amount="邀请3人"
          reward="最高¥500"
          badge="热门"
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          icon={<Users className="w-6 h-6" />}
          ctaText="邀请好友"
          onAction={() => alert('跳转到邀请页面')}
        />

        <DepositPromoCard
          title="小额投资计划"
          subtitle="每日签到领收益，复利增长"
          amount="≥ ¥500"
          reward="日化0.5%"
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          icon={<TrendingUp className="w-6 h-6" />}
          onAction={handleDeposit}
        />
      </div>

      {/* 热门股票推荐 */}
      <div className="bg-white rounded-xl p-5">
        <h3 className="mb-3 text-base">🔥 年轻人都在买</h3>
        <div className="space-y-3">
          <StockItem name="特斯拉" code="TSLA" change="+12.5%" positive />
          <StockItem name="英伟达" code="NVDA" change="+8.3%" positive />
          <StockItem name="小鹏汽车" code="XPEV" change="+15.2%" positive />
        </div>
        <button
          onClick={handleDeposit}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg text-sm"
        >
          入金立即交易
        </button>
      </div>

      {/* 年轻人专属权益 */}
      <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl p-5 border border-orange-100">
        <h3 className="mb-3 text-base">✨ 年轻人专属权益</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-orange-500" />
            <span>APP内每日答题赚积分</span>
          </div>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-orange-500" />
            <span>加入投资社群，大佬带你飞</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-orange-500" />
            <span>生日月双倍奖励</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockItem({ name, code, change, positive }: { name: string; code: string; change: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="text-sm mb-0.5">{name}</div>
        <div className="text-xs text-gray-500">{code}</div>
      </div>
      <div className={`text-sm ${positive ? 'text-red-500' : 'text-green-500'}`}>
        {change}
      </div>
    </div>
  );
}
