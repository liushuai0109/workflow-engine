interface DepositPromoCardProps {
  title: string;
  subtitle: string;
  amount: string;
  reward: string;
  badge?: string;
  gradient: string;
  icon: React.ReactNode;
  ctaText?: string;
  onAction: () => void;
}

export function DepositPromoCard({
  title,
  subtitle,
  amount,
  reward,
  badge,
  gradient,
  icon,
  ctaText = "立即入金",
  onAction,
}: DepositPromoCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${gradient} p-5 text-white`}>
      {badge && (
        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
          <span className="text-xs">{badge}</span>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          {icon}
        </div>
        
        <div className="flex-1">
          <h3 className="mb-0.5 text-base">{title}</h3>
          <p className="text-white/80 text-xs mb-3">{subtitle}</p>
          
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-xs text-white/70 mb-0.5">入金金额</div>
              <div className="text-lg">{amount}</div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-white/70 mb-0.5">最高奖励</div>
              <div className="text-xl text-yellow-300">{reward}</div>
            </div>
          </div>
          
          <button
            onClick={onAction}
            className="w-full bg-white text-gray-900 py-2.5 rounded-lg hover:bg-white/90 transition-colors text-sm"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}